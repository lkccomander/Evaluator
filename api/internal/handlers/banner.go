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
	CreatedAt time.Time `json:"created_at"`
}

func (h *BannerHandler) GetMessage(w http.ResponseWriter, r *http.Request) {
	var res bannerResponse
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, message, created_at
		   FROM banner_messages
		  ORDER BY created_at DESC
		  LIMIT 1`,
	).Scan(&res.ID, &res.Message, &res.CreatedAt)
	if err != nil {
		respondJSON(w, http.StatusOK, bannerResponse{})
		return
	}
	respondJSON(w, http.StatusOK, res)
}

func (h *BannerHandler) SetMessage(w http.ResponseWriter, r *http.Request) {
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

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer tx.Rollback(r.Context())

	if _, err := tx.Exec(r.Context(), "DELETE FROM banner_messages"); err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	var res bannerResponse
	err = tx.QueryRow(r.Context(),
		`INSERT INTO banner_messages (message, created_by)
		 VALUES ($1, $2)
		 RETURNING id, message, created_at`,
		req.Message, userID,
	).Scan(&res.ID, &res.Message, &res.CreatedAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save message")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save message")
		return
	}

	respondJSON(w, http.StatusOK, res)
}
