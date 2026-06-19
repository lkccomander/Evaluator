package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

func isMissingTable(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "42P01"
}

type HealthCheckConfig struct {
	ServiceName string `json:"service_name"`
	DisplayName string `json:"display_name"`
	CheckURL    string `json:"check_url"`
}

type ServiceStatus struct {
	ServiceName    string `json:"service_name"`
	DisplayName    string `json:"display_name"`
	Status         string `json:"status"`
	ResponseTimeMs int    `json:"response_time_ms"`
	ErrorMessage   string `json:"error_message,omitempty"`
	CheckedAt      string `json:"checked_at"`
	Uptime         string `json:"uptime"`
}

type CheckHistory struct {
	Status         string `json:"status"`
	ResponseTimeMs int    `json:"response_time_ms"`
	CheckedAt      string `json:"checked_at"`
}

type StatusHandler struct {
	DB *pgxpool.Pool
}

func (h *StatusHandler) Services(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT cc.service_name, cc.display_name,
		        COALESCE(lh.status, 'operational') AS status,
		        COALESCE(lh.response_time_ms, 0) AS response_time_ms,
		        COALESCE(lh.error_message, '') AS error_message,
		        lh.checked_at
		 FROM health_check_config cc
		 LEFT JOIN LATERAL (
		   SELECT status, response_time_ms, error_message, checked_at
		   FROM health_checks
		   WHERE service_name = cc.service_name
		   ORDER BY checked_at DESC
		   LIMIT 1
		 ) lh ON TRUE
		 WHERE cc.enabled = TRUE
		 ORDER BY cc.service_name`,
	)
	if err != nil {
		if isMissingTable(err) {
			respondJSON(w, http.StatusOK, []ServiceStatus{})
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	services := make([]ServiceStatus, 0)
	for rows.Next() {
		var s ServiceStatus
		var checkedAt *time.Time
		if err := rows.Scan(&s.ServiceName, &s.DisplayName,
			&s.Status, &s.ResponseTimeMs, &s.ErrorMessage, &checkedAt); err != nil {
			continue
		}
		if checkedAt != nil {
			s.CheckedAt = checkedAt.UTC().Format(time.RFC3339)
		}

		var total, ok int
		h.DB.QueryRow(r.Context(),
			`SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'operational')
			 FROM health_checks
			 WHERE service_name = $1 AND checked_at > NOW() - INTERVAL '24 hours'`,
			s.ServiceName).Scan(&total, &ok)
		if total > 0 {
			s.Uptime = strconv.Itoa(ok*100/total) + "%"
		} else {
			s.Uptime = "100%"
		}

		services = append(services, s)
	}

	respondJSON(w, http.StatusOK, services)
}

func (h *StatusHandler) History(w http.ResponseWriter, r *http.Request) {
	service := r.URL.Query().Get("service")
	if service == "" {
		respondError(w, http.StatusBadRequest, "service query param required")
		return
	}

	limitStr := r.URL.Query().Get("limit")
	limit := 72
	if limitStr != "" {
		if v, err := strconv.Atoi(limitStr); err == nil && v > 0 && v <= 500 {
			limit = v
		}
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT status, response_time_ms, checked_at
		 FROM health_checks
		 WHERE service_name = $1
		 ORDER BY checked_at DESC
		 LIMIT $2`,
		service, limit,
	)
	if err != nil {
		if isMissingTable(err) {
			respondJSON(w, http.StatusOK, []CheckHistory{})
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	history := make([]CheckHistory, 0, limit)
	for rows.Next() {
		var ch CheckHistory
		var checkedAt time.Time
		if err := rows.Scan(&ch.Status, &ch.ResponseTimeMs, &checkedAt); err != nil {
			continue
		}
		ch.CheckedAt = checkedAt.UTC().Format(time.RFC3339)
		history = append(history, ch)
	}

	for i, j := 0, len(history)-1; i < j; i, j = i+1, j-1 {
		history[i], history[j] = history[j], history[i]
	}

	respondJSON(w, http.StatusOK, history)
}
