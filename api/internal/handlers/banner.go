package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/middleware"
)

type BannerHandler struct {
	DB *pgxpool.Pool
}

type bannerResponse struct {
	ID        uuid.UUID `json:"id"`
	Message   string    `json:"message"`
	CreatedBy uuid.UUID `json:"created_by"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

func (h *BannerHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, message, created_by, created_at, expires_at
		   FROM banner_messages
		  WHERE expires_at IS NULL OR expires_at > NOW()
		  ORDER BY created_at DESC`,
	)
	if err != nil {
		respondJSON(w, http.StatusOK, []bannerResponse{})
		return
	}
	defer rows.Close()

	messages := make([]bannerResponse, 0)
	for rows.Next() {
		var m bannerResponse
		if err := rows.Scan(&m.ID, &m.Message, &m.CreatedBy, &m.CreatedAt, &m.ExpiresAt); err != nil {
			continue
		}
		messages = append(messages, m)
	}
	respondJSON(w, http.StatusOK, messages)
}

func (h *BannerHandler) PostMessage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	if req.Message == "" {
		respondError(w, http.StatusBadRequest, "message is required")
		return
	}

	var activeCount int
	if err := h.DB.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM banner_messages
		  WHERE expires_at IS NULL OR expires_at > NOW()`,
	).Scan(&activeCount); err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	if activeCount > 0 {
		respondError(w, http.StatusConflict, "Ya hay un mensaje activo en el banner. Espera a que expire (3h) para publicar otro.")
		return
	}

	var res bannerResponse
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO banner_messages (message, created_by, expires_at)
		 VALUES ($1, $2, NOW() + INTERVAL '3 hours')
		 RETURNING id, message, created_by, created_at, expires_at`,
		req.Message, userID,
	).Scan(&res.ID, &res.Message, &res.CreatedBy, &res.CreatedAt, &res.ExpiresAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save message")
		return
	}

	respondJSON(w, http.StatusCreated, res)
}
