package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsHandler struct {
	DB *pgxpool.Pool
}

func (h *SettingsHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), "SELECT key, value FROM settings")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		settings[k] = v
	}

	respondJSON(w, http.StatusOK, settings)
}

var publicSettingsKeys = map[string]bool{
	"prediction_chart_visibility": true,
	"show_prediction_names":       true,
}

func (h *SettingsHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), "SELECT key, value FROM settings")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		if publicSettingsKeys[k] {
			settings[k] = v
		}
	}

	respondJSON(w, http.StatusOK, settings)
}

type updateSettingsRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req updateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Key == "" {
		respondError(w, http.StatusBadRequest, "key is required")
		return
	}

	_, err := h.DB.Exec(r.Context(),
		`INSERT INTO settings (key, value) VALUES ($1, $2)
		 ON CONFLICT (key) DO UPDATE SET value = $2`,
		req.Key, req.Value,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"key": req.Key, "value": req.Value})
}
