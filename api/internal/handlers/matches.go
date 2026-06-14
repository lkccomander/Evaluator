package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/services"
)

type MatchHandler struct {
	DB *pgxpool.Pool
}

func (h *MatchHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, match_number, stage, group_name, kickoff_utc, home_team, away_team,
		        home_score, away_score, status, created_at, updated_at
		 FROM matches
		 ORDER BY kickoff_utc ASC`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type matchResponse struct {
		ID          uuid.UUID `json:"id"`
		MatchNumber int       `json:"match_number"`
		Stage       string    `json:"stage"`
		GroupName   *string   `json:"group_name"`
		KickoffUTC  time.Time `json:"kickoff_utc"`
		HomeTeam    string    `json:"home_team"`
		AwayTeam    string    `json:"away_team"`
		HomeScore   *int      `json:"home_score"`
		AwayScore   *int      `json:"away_score"`
		Status      string    `json:"status"`
		Deadline    time.Time `json:"deadline"`
		Locked      bool      `json:"locked"`
	}

	var matches []matchResponse
	for rows.Next() {
		var m matchResponse
		if err := rows.Scan(&m.ID, &m.MatchNumber, &m.Stage, &m.GroupName, &m.KickoffUTC,
			&m.HomeTeam, &m.AwayTeam, &m.HomeScore, &m.AwayScore, &m.Status,
			new(time.Time), new(time.Time)); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		m.Deadline = services.GetDeadline(m.KickoffUTC)
		m.Locked = services.IsPastDeadline(m.KickoffUTC)
		matches = append(matches, m)
	}
	if matches == nil {
		matches = []matchResponse{}
	}

	respondJSON(w, http.StatusOK, matches)
}

func (h *MatchHandler) Get(w http.ResponseWriter, r *http.Request) {
	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid match id")
		return
	}

	var m struct {
		ID          uuid.UUID `json:"id"`
		MatchNumber int       `json:"match_number"`
		Stage       string    `json:"stage"`
		GroupName   *string   `json:"group_name"`
		KickoffUTC  time.Time `json:"kickoff_utc"`
		HomeTeam    string    `json:"home_team"`
		AwayTeam    string    `json:"away_team"`
		HomeScore   *int      `json:"home_score"`
		AwayScore   *int      `json:"away_score"`
		Status      string    `json:"status"`
		Deadline    time.Time `json:"deadline"`
		Locked      bool      `json:"locked"`
	}
	err = h.DB.QueryRow(r.Context(),
		`SELECT id, match_number, stage, group_name, kickoff_utc, home_team, away_team,
		        home_score, away_score, status
		 FROM matches WHERE id = $1`, matchID,
	).Scan(&m.ID, &m.MatchNumber, &m.Stage, &m.GroupName, &m.KickoffUTC,
		&m.HomeTeam, &m.AwayTeam, &m.HomeScore, &m.AwayScore, &m.Status)
	if err != nil {
		if err == pgx.ErrNoRows {
			respondError(w, http.StatusNotFound, "match not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	m.Deadline = services.GetDeadline(m.KickoffUTC)
	m.Locked = services.IsPastDeadline(m.KickoffUTC)

	respondJSON(w, http.StatusOK, m)
}

type enterResultRequest struct {
	HomeScore int `json:"home_score"`
	AwayScore int `json:"away_score"`
}

func (h *MatchHandler) UpdateLiveScore(w http.ResponseWriter, r *http.Request) {
	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid match id")
		return
	}

	var req enterResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.HomeScore < 0 || req.AwayScore < 0 {
		respondError(w, http.StatusBadRequest, "scores must be non-negative")
		return
	}

	tag, err := h.DB.Exec(r.Context(),
		`UPDATE matches
		 SET home_score = $1, away_score = $2, updated_at = NOW()
		 WHERE id = $3 AND status != 'finished'`,
		req.HomeScore, req.AwayScore, matchID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update live score")
		return
	}
	if tag.RowsAffected() == 0 {
		respondError(w, http.StatusConflict, "match already finished or not found")
		return
	}

	result, err := services.ScoreMatch(r.Context(), h.DB, matchID.String())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "live scoring job failed: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":             "live score saved and predictions scored",
		"predictions_updated": result.PredictionsUpdated,
	})
}

func (h *MatchHandler) EnterResult(w http.ResponseWriter, r *http.Request) {
	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid match id")
		return
	}

	var req enterResultRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.HomeScore < 0 || req.AwayScore < 0 {
		respondError(w, http.StatusBadRequest, "scores must be non-negative")
		return
	}

	var currentStatus string
	if err := h.DB.QueryRow(r.Context(), "SELECT status FROM matches WHERE id = $1", matchID).Scan(&currentStatus); err != nil {
		if err == pgx.ErrNoRows {
			respondError(w, http.StatusNotFound, "match not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	if currentStatus == "finished" {
		respondError(w, http.StatusConflict, "match already has a result")
		return
	}

	tag, err := h.DB.Exec(r.Context(),
		`UPDATE matches SET home_score = $1, away_score = $2, status = 'finished', updated_at = NOW()
		 WHERE id = $3`,
		req.HomeScore, req.AwayScore, matchID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update match")
		return
	}
	if tag.RowsAffected() == 0 {
		respondError(w, http.StatusConflict, "match not found")
		return
	}

	result, err := services.ScoreMatch(r.Context(), h.DB, matchID.String())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "scoring job failed: "+err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":             "result entered and predictions scored",
		"predictions_updated": result.PredictionsUpdated,
	})
}

func (h *MatchHandler) PredictionStats(w http.ResponseWriter, r *http.Request) {
	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid match id")
		return
	}

	leagueIDStr := r.URL.Query().Get("league_id")

	var local, empate, visita int

	if leagueIDStr != "" {
		leagueID, err := uuid.Parse(leagueIDStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "invalid league_id")
			return
		}
		err = h.DB.QueryRow(r.Context(),
			`SELECT
			   COUNT(*) FILTER (WHERE p.home_score_pred > p.away_score_pred),
			   COUNT(*) FILTER (WHERE p.home_score_pred = p.away_score_pred),
			   COUNT(*) FILTER (WHERE p.home_score_pred < p.away_score_pred)
			 FROM predictions p
			 JOIN users u ON p.user_id = u.id
			 WHERE p.match_id = $1 AND u.league_id = $2`, matchID, leagueID,
		).Scan(&local, &empate, &visita)
	} else {
		err = h.DB.QueryRow(r.Context(),
			`SELECT
			   COUNT(*) FILTER (WHERE home_score_pred > away_score_pred),
			   COUNT(*) FILTER (WHERE home_score_pred = away_score_pred),
			   COUNT(*) FILTER (WHERE home_score_pred < away_score_pred)
			 FROM predictions WHERE match_id = $1`, matchID,
		).Scan(&local, &empate, &visita)
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]int{
		"local":  local,
		"empate": empate,
		"visita": visita,
		"total":  local + empate + visita,
	})
}

type predictionEntry struct {
	DisplayName    *string `json:"display_name,omitempty"`
	HomeScorePred  int     `json:"home_score_pred"`
	AwayScorePred  int     `json:"away_score_pred"`
}

func (h *MatchHandler) PredictionsList(w http.ResponseWriter, r *http.Request) {
	matchIDStr := chi.URLParam(r, "id")
	matchID, err := uuid.Parse(matchIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid match id")
		return
	}

	leagueIDStr := r.URL.Query().Get("league_id")
	showNames := r.URL.Query().Get("show_names") == "true"

	var rows pgx.Rows

	if leagueIDStr != "" {
		leagueID, err := uuid.Parse(leagueIDStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "invalid league_id")
			return
		}
		if showNames {
			rows, err = h.DB.Query(r.Context(),
				`SELECT u.display_name, p.home_score_pred, p.away_score_pred
				 FROM predictions p
				 JOIN users u ON p.user_id = u.id
				 WHERE p.match_id = $1 AND u.league_id = $2
				 ORDER BY u.display_name ASC NULLS LAST, u.username ASC`, matchID, leagueID)
		} else {
			rows, err = h.DB.Query(r.Context(),
				`SELECT p.home_score_pred, p.away_score_pred
				 FROM predictions p
				 JOIN users u ON p.user_id = u.id
				 WHERE p.match_id = $1 AND u.league_id = $2
				 ORDER BY u.display_name ASC NULLS LAST, u.username ASC`, matchID, leagueID)
		}
	} else {
		if showNames {
			rows, err = h.DB.Query(r.Context(),
				`SELECT u.display_name, p.home_score_pred, p.away_score_pred
				 FROM predictions p
				 JOIN users u ON p.user_id = u.id
				 WHERE p.match_id = $1
				 ORDER BY u.display_name ASC NULLS LAST, u.username ASC`, matchID)
		} else {
			rows, err = h.DB.Query(r.Context(),
				`SELECT p.home_score_pred, p.away_score_pred
				 FROM predictions p
				 WHERE p.match_id = $1
				 ORDER BY p.created_at ASC`, matchID)
		}
	}
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var predictions []predictionEntry
	for rows.Next() {
		var e predictionEntry
		if showNames {
			if err := rows.Scan(&e.DisplayName, &e.HomeScorePred, &e.AwayScorePred); err != nil {
				continue
			}
		} else {
			if err := rows.Scan(&e.HomeScorePred, &e.AwayScorePred); err != nil {
				continue
			}
		}
		predictions = append(predictions, e)
	}
	if predictions == nil {
		predictions = []predictionEntry{}
	}

	respondJSON(w, http.StatusOK, predictions)
}
