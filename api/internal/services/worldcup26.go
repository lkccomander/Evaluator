package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

type WorldCup26Client struct {
	baseURL    string
	email      string
	password   string
	httpClient *http.Client

	mu          sync.Mutex
	token       string
	tokenExpiry time.Time

	cacheMu    sync.Mutex
	cacheGames []WorldCup26Game
	cacheAt    time.Time
	cacheTTL   time.Duration
}

type WorldCup26Game struct {
	ID             string `json:"id"`
	HomeScore      string `json:"home_score"`
	AwayScore      string `json:"away_score"`
	Group          string `json:"group"`
	LocalDate      string `json:"local_date"`
	Date           string `json:"date"`
	Kickoff        string `json:"kickoff"`
	Finished       string `json:"finished"`
	TimeElapsed    string `json:"time_elapsed"`
	Type           string `json:"type"`
	HomeTeamNameEN string `json:"home_team_name_en"`
	AwayTeamNameEN string `json:"away_team_name_en"`
	HomeTeamLabel  string `json:"home_team_label"`
	AwayTeamLabel  string `json:"away_team_label"`
	HomeTeam       string `json:"home_team"`
	AwayTeam       string `json:"away_team"`
	MatchDateField string `json:"match_date"`
}

func (g *WorldCup26Game) HomeTeamName() string {
	if g.HomeTeam != "" {
		return g.HomeTeam
	}
	if g.HomeTeamNameEN != "" {
		return g.HomeTeamNameEN
	}
	return g.HomeTeamLabel
}

func (g *WorldCup26Game) AwayTeamName() string {
	if g.AwayTeam != "" {
		return g.AwayTeam
	}
	if g.AwayTeamNameEN != "" {
		return g.AwayTeamNameEN
	}
	return g.AwayTeamLabel
}

func (g *WorldCup26Game) MatchDate() string {
	if g.LocalDate != "" {
		return g.LocalDate
	}
	if g.Date != "" {
		return g.Date
	}
	if g.MatchDateField != "" {
		return g.MatchDateField
	}
	if g.Kickoff != "" {
		return g.Kickoff
	}
	return ""
}

func NewWorldCup26Client(baseURL, email, password string) *WorldCup26Client {
	return &WorldCup26Client{
		baseURL:  strings.TrimRight(baseURL, "/"),
		email:    email,
		password: password,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
		cacheTTL: 60 * time.Second,
	}
}

func (c *WorldCup26Client) Enabled() bool {
	return c.baseURL != "" && c.email != "" && c.password != ""
}

func (c *WorldCup26Client) GetGames(ctx context.Context) ([]WorldCup26Game, error) {
	if !c.Enabled() {
		return []WorldCup26Game{}, nil
	}

	c.cacheMu.Lock()
	if c.cacheGames != nil && time.Since(c.cacheAt) < c.cacheTTL {
		games := c.cacheGames
		c.cacheMu.Unlock()
		return games, nil
	}
	c.cacheMu.Unlock()

	games, err := c.fetchGames(ctx)
	if err != nil {
		return nil, err
	}

	c.cacheMu.Lock()
	c.cacheGames = games
	c.cacheAt = time.Now()
	c.cacheMu.Unlock()

	return games, nil
}

func (c *WorldCup26Client) GetGamesFresh(ctx context.Context) ([]WorldCup26Game, error) {
	if !c.Enabled() {
		return []WorldCup26Game{}, nil
	}
	return c.fetchGames(ctx)
}

func (c *WorldCup26Client) fetchGames(ctx context.Context) ([]WorldCup26Game, error) {
	if !c.Enabled() {
		return []WorldCup26Game{}, nil
	}

	token, err := c.getToken(ctx)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/get/games", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("provider request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		c.invalidateToken()
		token, err = c.getToken(ctx)
		if err != nil {
			return nil, err
		}
		req, err = http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/get/games", nil)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+token)
		resp, err = c.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("provider retry failed: %w", err)
		}
		defer resp.Body.Close()
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("provider returned %d", resp.StatusCode)
	}

	var payload struct {
		Games []WorldCup26Game `json:"games"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode provider games: %w", err)
	}

	return payload.Games, nil
}

func (c *WorldCup26Client) getToken(ctx context.Context) (string, error) {
	c.mu.Lock()
	if c.token != "" && time.Now().Before(c.tokenExpiry) {
		token := c.token
		c.mu.Unlock()
		return token, nil
	}
	c.mu.Unlock()

	body, err := json.Marshal(map[string]string{
		"email":    c.email,
		"password": c.password,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/auth/authenticate", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("provider auth failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("provider auth returned %d", resp.StatusCode)
	}

	var payload struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", fmt.Errorf("decode provider auth: %w", err)
	}
	if payload.Token == "" {
		return "", fmt.Errorf("provider auth returned empty token")
	}

	c.mu.Lock()
	c.token = payload.Token
	c.tokenExpiry = time.Now().Add(80 * 24 * time.Hour)
	c.mu.Unlock()

	return payload.Token, nil
}

func (c *WorldCup26Client) invalidateToken() {
	c.mu.Lock()
	c.token = ""
	c.tokenExpiry = time.Time{}
	c.mu.Unlock()

	c.cacheMu.Lock()
	c.cacheGames = nil
	c.cacheAt = time.Time{}
	c.cacheMu.Unlock()
}
