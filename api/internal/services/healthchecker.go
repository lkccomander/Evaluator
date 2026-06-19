package services

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthCheckConfig struct {
	ServiceName    string `db:"service_name"`
	DisplayName    string `db:"display_name"`
	CheckURL       string `db:"check_url"`
	Method         string `db:"method"`
	ExpectedStatus int    `db:"expected_status"`
	IntervalSec    int    `db:"interval_sec"`
	TimeoutMs      int    `db:"timeout_ms"`
	Enabled        bool   `db:"enabled"`
}

type HealthCheckResult struct {
	ServiceName    string `json:"service_name"`
	Status         string `json:"status"`
	ResponseTimeMs int    `json:"response_time_ms"`
	ErrorMessage   string `json:"error_message,omitempty"`
	CheckedAt      string `json:"checked_at"`
}

type HealthChecker struct {
	DB        *pgxpool.Pool
	BaseURL   string
	client    *http.Client
	mu        sync.RWMutex
	stopCh    chan struct{}
	running   bool
	lastRun   map[string]time.Time
}

func NewHealthChecker(db *pgxpool.Pool, baseURL string) *HealthChecker {
	return &HealthChecker{
		DB:      db,
		BaseURL: baseURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
		lastRun: make(map[string]time.Time),
		stopCh:  make(chan struct{}),
	}
}

func (hc *HealthChecker) Start(ctx context.Context) {
	hc.mu.Lock()
	if hc.running {
		hc.mu.Unlock()
		return
	}
	hc.running = true
	hc.mu.Unlock()

	go hc.loop(ctx)
	log.Println("health checker started")
}

func (hc *HealthChecker) Stop() {
	hc.mu.Lock()
	defer hc.mu.Unlock()
	if hc.running {
		close(hc.stopCh)
		hc.running = false
	}
}

func (hc *HealthChecker) loop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	hc.runAllChecks(ctx)

	for {
		select {
		case <-ticker.C:
			hc.runAllChecks(ctx)
		case <-hc.stopCh:
			return
		case <-ctx.Done():
			return
		}
	}
}

func (hc *HealthChecker) runAllChecks(ctx context.Context) {
	configs, err := hc.loadConfigs(ctx)
	if err != nil {
		log.Printf("health checker: failed to load configs: %v", err)
		return
	}

	var wg sync.WaitGroup
	for i := range configs {
		cfg := configs[i]
		if !cfg.Enabled {
			continue
		}

		hc.mu.RLock()
		lastRun, hasRun := hc.lastRun[cfg.ServiceName]
		hc.mu.RUnlock()

		if hasRun && time.Since(lastRun) < time.Duration(cfg.IntervalSec)*time.Second {
			continue
		}

		wg.Add(1)
		go func(c HealthCheckConfig) {
			defer wg.Done()
			hc.checkService(ctx, c)
		}(cfg)
	}

	wg.Wait()
}

func (hc *HealthChecker) loadConfigs(ctx context.Context) ([]HealthCheckConfig, error) {
	rows, err := hc.DB.Query(ctx,
		`SELECT service_name, display_name, check_url, method,
		        expected_status, interval_sec, timeout_ms, enabled
		 FROM health_check_config WHERE enabled = TRUE`)
	if err != nil {
		return nil, fmt.Errorf("query configs: %w", err)
	}
	defer rows.Close()

	var configs []HealthCheckConfig
	for rows.Next() {
		var c HealthCheckConfig
		if err := rows.Scan(&c.ServiceName, &c.DisplayName, &c.CheckURL,
			&c.Method, &c.ExpectedStatus, &c.IntervalSec, &c.TimeoutMs, &c.Enabled); err != nil {
			log.Printf("health checker: scan config row: %v", err)
			continue
		}
		configs = append(configs, c)
	}
	return configs, nil
}

func (hc *HealthChecker) checkService(ctx context.Context, cfg HealthCheckConfig) {
	start := time.Now()
	url := cfg.CheckURL

	if url[0] == '/' {
		url = hc.BaseURL + url
	}

	req, err := http.NewRequestWithContext(ctx, cfg.Method, url, nil)
	if err != nil {
		hc.recordResult(cfg.ServiceName, "down", int(time.Since(start).Milliseconds()), err.Error())
		return
	}

	resp, err := hc.client.Do(req)
	elapsed := int(time.Since(start).Milliseconds())

	if err != nil {
		hc.recordResult(cfg.ServiceName, "down", elapsed, err.Error())
		return
	}
	defer resp.Body.Close()

	status := "operational"
	if resp.StatusCode != cfg.ExpectedStatus {
		status = "degraded"
	}

	var errMsg string
	if status != "operational" {
		errMsg = fmt.Sprintf("expected %d, got %d", cfg.ExpectedStatus, resp.StatusCode)
	}

	if elapsed > cfg.TimeoutMs {
		if status == "operational" {
			status = "degraded"
		}
		if errMsg == "" {
			errMsg = fmt.Sprintf("slow response: %dms", elapsed)
		}
	}

	hc.recordResult(cfg.ServiceName, status, elapsed, errMsg)
	hc.markLastRun(cfg.ServiceName)
}

func (hc *HealthChecker) recordResult(serviceName, status string, ms int, errMsg string) {
	_, err := hc.DB.Exec(context.Background(),
		`INSERT INTO health_checks (service_name, status, response_time_ms, error_message, checked_at)
		 VALUES ($1, $2, $3, $4, NOW())`,
		serviceName, status, ms, errMsg,
	)
	if err != nil {
		log.Printf("health checker: insert result for %s: %v", serviceName, err)
	}
}

func (hc *HealthChecker) markLastRun(serviceName string) {
	hc.mu.Lock()
	defer hc.mu.Unlock()
	hc.lastRun[serviceName] = time.Now()
}
