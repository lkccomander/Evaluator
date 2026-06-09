package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/middleware"
	"github.com/quiniela2026/api/internal/services"
)

type PredictionHandler struct {
	DB *pgxpool.Pool
}

type submitPredictionRequest struct {
	MatchID       string `json:"match_id"`
	HomeScorePred int    `json:"home_score_pred"`
	AwayScorePred int    `json:"away_score_pred"`
}

func (h *PredictionHandler) Submit(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var leagueID *uuid.UUID
	err := h.DB.QueryRow(r.Context(), "SELECT league_id FROM users WHERE id = $1", userID).Scan(&leagueID)
	if err != nil || leagueID == nil {
		respondError(w, http.StatusForbidden, "you must join a league before submitting predictions")
		return
	}

	var req submitPredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.HomeScorePred < 0 || req.AwayScorePred < 0 {
		respondError(w, http.StatusBadRequest, "scores must be non-negative")
		return
	}

	matchID, err := uuid.Parse(req.MatchID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid match id")
		return
	}

	var kickoffUTC time.Time
	err = h.DB.QueryRow(r.Context(),
		"SELECT kickoff_utc FROM matches WHERE id = $1", matchID,
	).Scan(&kickoffUTC)
	if err != nil {
		if err == pgx.ErrNoRows {
			respondError(w, http.StatusNotFound, "match not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	if services.IsPastDeadline(kickoffUTC) {
		respondError(w, http.StatusForbidden, "predictions locked for this match")
		return
	}

	_, err = h.DB.Exec(r.Context(),
		`INSERT INTO predictions (user_id, match_id, home_score_pred, away_score_pred)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (user_id, match_id)
		 DO UPDATE SET home_score_pred = $3, away_score_pred = $4, updated_at = NOW()`,
		userID, matchID, req.HomeScorePred, req.AwayScorePred,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save prediction")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{"message": "prediction saved"})
}

func (h *PredictionHandler) Update(w http.ResponseWriter, r *http.Request) {
	predictionIDStr := chi.URLParam(r, "id")
	predictionID, err := uuid.Parse(predictionIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid prediction id")
		return
	}

	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req submitPredictionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	var matchKickoff time.Time
	err = h.DB.QueryRow(r.Context(),
		`SELECT m.kickoff_utc
		 FROM predictions p
		 JOIN matches m ON m.id = p.match_id
		 WHERE p.id = $1 AND p.user_id = $2`,
		predictionID, userID,
	).Scan(&matchKickoff)
	if err != nil {
		if err == pgx.ErrNoRows {
			respondError(w, http.StatusNotFound, "prediction not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	if services.IsPastDeadline(matchKickoff) {
		respondError(w, http.StatusForbidden, "cannot edit prediction after deadline")
		return
	}

	_, err = h.DB.Exec(r.Context(),
		`UPDATE predictions SET home_score_pred = $1, away_score_pred = $2, updated_at = NOW()
		 WHERE id = $3 AND user_id = $4`,
		req.HomeScorePred, req.AwayScorePred, predictionID, userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update prediction")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "prediction updated"})
}

func (h *PredictionHandler) GetMy(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	type predictionRow struct {
		ID            uuid.UUID  `json:"id"`
		MatchID       uuid.UUID  `json:"match_id"`
		MatchNumber   int        `json:"match_number"`
		HomeTeam      string     `json:"home_team"`
		AwayTeam      string     `json:"away_team"`
		KickoffUTC    time.Time  `json:"kickoff_utc"`
		HomeScorePred int        `json:"home_score_pred"`
		AwayScorePred int        `json:"away_score_pred"`
		PointsEarned  *int       `json:"points_earned"`
		GoalPtsEarned *int       `json:"goal_pts_earned"`
		Locked        bool       `json:"locked"`
		SubmittedAt   time.Time  `json:"submitted_at"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT p.id, m.id, m.match_number, m.home_team, m.away_team, m.kickoff_utc,
		        p.home_score_pred, p.away_score_pred, p.points_earned, p.goal_pts_earned, p.submitted_at
		 FROM predictions p
		 JOIN matches m ON m.id = p.match_id
		 WHERE p.user_id = $1
		 ORDER BY m.kickoff_utc ASC`,
		userID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var predictions []predictionRow
	for rows.Next() {
		var p predictionRow
		if err := rows.Scan(&p.ID, &p.MatchID, &p.MatchNumber, &p.HomeTeam, &p.AwayTeam,
			&p.KickoffUTC, &p.HomeScorePred, &p.AwayScorePred, &p.PointsEarned, &p.GoalPtsEarned, &p.SubmittedAt); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		p.Locked = services.IsPastDeadline(p.KickoffUTC)
		predictions = append(predictions, p)
	}
	if predictions == nil {
		predictions = []predictionRow{}
	}

	respondJSON(w, http.StatusOK, predictions)
}
