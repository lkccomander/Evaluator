package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/middleware"
	"github.com/quiniela2026/api/internal/services"
)

type LeagueHandler struct {
	DB *pgxpool.Pool
}

type createLeagueRequest struct {
	Name string `json:"name"`
}

func (h *LeagueHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createLeagueRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		respondError(w, http.StatusBadRequest, "name is required")
		return
	}

	userID, _ := middleware.GetUserID(r)

	joinCode, err := services.GenerateUniqueJoinCode(r.Context(), h.DB)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate join code")
		return
	}

	var league struct {
		ID        uuid.UUID `json:"id"`
		Name      string    `json:"name"`
		JoinCode  string    `json:"join_code"`
		CreatedAt time.Time `json:"created_at"`
	}
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO leagues (name, join_code, created_by)
		 VALUES ($1, $2, $3) RETURNING id, name, join_code, created_at`,
		req.Name, joinCode, userID,
	).Scan(&league.ID, &league.Name, &league.JoinCode, &league.CreatedAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to create league")
		return
	}

	respondJSON(w, http.StatusCreated, league)
}

func (h *LeagueHandler) List(w http.ResponseWriter, r *http.Request) {
	type leagueRow struct {
		ID           uuid.UUID `json:"id"`
		Name         string    `json:"name"`
		JoinCode     string    `json:"join_code"`
		MemberCount  int       `json:"member_count"`
		CreatedAt    time.Time `json:"created_at"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT l.id, l.name, l.join_code, COUNT(u.id) AS member_count, l.created_at
		 FROM leagues l
		 LEFT JOIN users u ON u.league_id = l.id
		 GROUP BY l.id, l.name, l.join_code, l.created_at
		 ORDER BY l.created_at DESC`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var leagues []leagueRow
	for rows.Next() {
		var l leagueRow
		if err := rows.Scan(&l.ID, &l.Name, &l.JoinCode, &l.MemberCount, &l.CreatedAt); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		leagues = append(leagues, l)
	}
	if leagues == nil {
		leagues = []leagueRow{}
	}

	respondJSON(w, http.StatusOK, leagues)
}

func (h *LeagueHandler) GetMembers(w http.ResponseWriter, r *http.Request) {
	leagueIDStr := chi.URLParam(r, "id")
	if leagueIDStr == "" {
		respondError(w, http.StatusBadRequest, "league id is required")
		return
	}

	leagueID, err := uuid.Parse(leagueIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid league id")
		return
	}

	type memberRow struct {
		ID        uuid.UUID  `json:"id"`
		Username  string     `json:"username"`
		CreatedAt time.Time  `json:"created_at"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT id, username, created_at FROM users WHERE league_id = $1 ORDER BY created_at`,
		leagueID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var members []memberRow
	for rows.Next() {
		var m memberRow
		if err := rows.Scan(&m.ID, &m.Username, &m.CreatedAt); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		members = append(members, m)
	}
	if members == nil {
		members = []memberRow{}
	}

	respondJSON(w, http.StatusOK, members)
}

func (h *LeagueHandler) Join(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Code == "" {
		respondError(w, http.StatusBadRequest, "code is required")
		return
	}

	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var currentLeagueID *uuid.UUID
	err := h.DB.QueryRow(r.Context(), "SELECT league_id FROM users WHERE id = $1", userID).Scan(&currentLeagueID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	if currentLeagueID != nil {
		respondError(w, http.StatusConflict, "already in a league")
		return
	}

	var leagueID uuid.UUID
	err = h.DB.QueryRow(r.Context(), "SELECT id FROM leagues WHERE join_code = $1", req.Code).Scan(&leagueID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid league code")
		return
	}

	_, err = h.DB.Exec(r.Context(), "UPDATE users SET league_id = $1 WHERE id = $2", leagueID, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to join league")
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":   "successfully joined league",
		"league_id": leagueID,
	})
}

func (h *LeagueHandler) GetMyLeague(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var league struct {
		ID        uuid.UUID `json:"id"`
		Name      string    `json:"name"`
		JoinCode  string    `json:"join_code"`
	}

	err := h.DB.QueryRow(r.Context(),
		`SELECT l.id, l.name, l.join_code
		 FROM leagues l
		 JOIN users u ON u.league_id = l.id
		 WHERE u.id = $1`,
		userID,
	).Scan(&league.ID, &league.Name, &league.JoinCode)
	if err != nil {
		respondError(w, http.StatusNotFound, "you are not in a league")
		return
	}

	respondJSON(w, http.StatusOK, league)
}
