package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/middleware"
)

type ChatHandler struct {
	DB *pgxpool.Pool
}

type chatMessageResponse struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Username    string    `json:"username"`
	DisplayName *string   `json:"display_name"`
	Message     string    `json:"message"`
	CreatedAt   time.Time `json:"created_at"`
}

func (h *ChatHandler) ListMessages(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT cm.id, cm.user_id, u.username, u.display_name, cm.message, cm.created_at
		   FROM chat_messages cm
		   JOIN users u ON u.id = cm.user_id
		  ORDER BY cm.created_at DESC
		  LIMIT 50`,
	)
	if err != nil {
		respondJSON(w, http.StatusOK, []chatMessageResponse{})
		return
	}
	defer rows.Close()

	messages := make([]chatMessageResponse, 0, 50)
	for rows.Next() {
		var m chatMessageResponse
		if err := rows.Scan(&m.ID, &m.UserID, &m.Username, &m.DisplayName, &m.Message, &m.CreatedAt); err != nil {
			continue
		}
		messages = append(messages, m)
	}

	// Reverse so oldest first (frontend displays top-to-bottom chronologically)
	for i, j := 0, len(messages)-1; i < j; i, j = i+1, j-1 {
		messages[i], messages[j] = messages[j], messages[i]
	}

	respondJSON(w, http.StatusOK, messages)
}

func (h *ChatHandler) PostMessage(w http.ResponseWriter, r *http.Request) {
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

	if len(req.Message) > 500 {
		respondError(w, http.StatusBadRequest, "message too long (max 500 characters)")
		return
	}

	var insertedID uuid.UUID
	var createdAt time.Time
	err := h.DB.QueryRow(r.Context(),
		`INSERT INTO chat_messages (user_id, message)
		 VALUES ($1, $2)
		 RETURNING id, created_at`,
		userID, req.Message,
	).Scan(&insertedID, &createdAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save message")
		return
	}

	var res chatMessageResponse
	err = h.DB.QueryRow(r.Context(),
		`SELECT cm.id, cm.user_id, u.username, u.display_name, cm.message, cm.created_at
		   FROM chat_messages cm
		   JOIN users u ON u.id = cm.user_id
		  WHERE cm.id = $1`,
		insertedID,
	).Scan(&res.ID, &res.UserID, &res.Username, &res.DisplayName, &res.Message, &res.CreatedAt)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to read saved message")
		return
	}

	respondJSON(w, http.StatusCreated, res)
}
