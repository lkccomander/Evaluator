package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/middleware"
)

type LeaderboardHandler struct {
	DB *pgxpool.Pool
}

func (h *LeaderboardHandler) Global(w http.ResponseWriter, r *http.Request) {
	type entry struct {
		UserID       uuid.UUID `json:"user_id"`
		DisplayName  *string   `json:"display_name"`
		PlayerTeam   string    `json:"player_team_name"`
		IsVerified   bool      `json:"is_verified"`
		IsDisabled   bool      `json:"is_disabled"`
		RoundOf16    bool      `json:"round_of_16"`
		LeagueName   *string   `json:"league_name"`
		TotalPoints  int       `json:"total_points"`
		TotalGoalPts int       `json:"total_goal_pts"`
		ScoredCount  int       `json:"scored_matches"`
		ExactHits    int       `json:"exact_hits"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT
				u.id,
				u.display_name,
					u.player_team_name,
					u.is_verified,
					u.is_disabled,
					u.round_of_16,
					l.name AS league_name,
				COALESCE(SUM(p.points_earned), 0) AS total_points,
				COALESCE(SUM(p.goal_pts_earned), 0) AS total_goal_pts,
				COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL) AS scored_matches,
				COUNT(p.id) FILTER (WHERE p.points_earned = 5) AS exact_hits
				FROM users u
				LEFT JOIN leagues l ON l.id = u.league_id
				LEFT JOIN predictions p ON p.user_id = u.id
				WHERE u.is_disabled = FALSE
				GROUP BY u.id, u.display_name, u.player_team_name, u.is_verified, u.is_disabled, l.name
			ORDER BY total_points DESC, total_goal_pts DESC`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var entries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.PlayerTeam, &e.IsVerified, &e.IsDisabled, &e.RoundOf16, &e.LeagueName,
			&e.TotalPoints, &e.TotalGoalPts, &e.ScoredCount, &e.ExactHits); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []entry{}
	}

	respondJSON(w, http.StatusOK, entries)
}

func (h *LeaderboardHandler) ByLeague(w http.ResponseWriter, r *http.Request) {
	leagueIDStr := chi.URLParam(r, "id")
	leagueID, err := uuid.Parse(leagueIDStr)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid league id")
		return
	}

	type entry struct {
		UserID       uuid.UUID `json:"user_id"`
		DisplayName  *string   `json:"display_name"`
		PlayerTeam   string    `json:"player_team_name"`
		IsVerified   bool      `json:"is_verified"`
		IsDisabled   bool      `json:"is_disabled"`
		RoundOf16    bool      `json:"round_of_16"`
		TotalPoints  int       `json:"total_points"`
		TotalGoalPts int       `json:"total_goal_pts"`
		ScoredCount  int       `json:"scored_matches"`
		ExactHits    int       `json:"exact_hits"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT
				u.id,
				u.display_name,
					u.player_team_name,
					u.is_verified,
					u.is_disabled,
					u.round_of_16,
					COALESCE(SUM(p.points_earned), 0) AS total_points,
			COALESCE(SUM(p.goal_pts_earned), 0) AS total_goal_pts,
			COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL) AS scored_matches,
			COUNT(p.id) FILTER (WHERE p.points_earned = 5) AS exact_hits
			FROM users u
			LEFT JOIN predictions p ON p.user_id = u.id
			WHERE u.league_id = $1 AND u.is_disabled = FALSE
			GROUP BY u.id, u.display_name, u.player_team_name, u.is_verified, u.is_disabled, u.round_of_16
			ORDER BY total_points DESC, total_goal_pts DESC`,
		leagueID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var entries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.PlayerTeam, &e.IsVerified, &e.IsDisabled, &e.RoundOf16,
			&e.TotalPoints, &e.TotalGoalPts, &e.ScoredCount, &e.ExactHits); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []entry{}
	}

	respondJSON(w, http.StatusOK, entries)
}

func (h *LeaderboardHandler) MyLeague(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var leagueID *uuid.UUID
	err := h.DB.QueryRow(r.Context(), "SELECT league_id FROM users WHERE id = $1", userID).Scan(&leagueID)
	if err != nil || leagueID == nil {
		respondError(w, http.StatusNotFound, "you are not in a league")
		return
	}

	type entry struct {
		UserID       uuid.UUID `json:"user_id"`
		DisplayName  *string   `json:"display_name"`
		PlayerTeam   string    `json:"player_team_name"`
		IsVerified   bool      `json:"is_verified"`
		IsDisabled   bool      `json:"is_disabled"`
		RoundOf16    bool      `json:"round_of_16"`
		TotalPoints  int       `json:"total_points"`
		TotalGoalPts int       `json:"total_goal_pts"`
		ScoredCount  int       `json:"scored_matches"`
		ExactHits    int       `json:"exact_hits"`
		Rank         int       `json:"rank"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT
				u.id,
				u.display_name,
					u.player_team_name,
					u.is_verified,
					u.is_disabled,
					u.round_of_16,
					COALESCE(SUM(p.points_earned), 0) AS total_points,
			COALESCE(SUM(p.goal_pts_earned), 0) AS total_goal_pts,
			COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL) AS scored_matches,
			COUNT(p.id) FILTER (WHERE p.points_earned = 5) AS exact_hits,
			ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points_earned), 0) DESC, COALESCE(SUM(p.goal_pts_earned), 0) DESC) AS rank
			FROM users u
			LEFT JOIN predictions p ON p.user_id = u.id
			WHERE u.league_id = $1 AND u.is_disabled = FALSE
			GROUP BY u.id, u.display_name, u.player_team_name, u.is_verified, u.is_disabled, u.round_of_16
			ORDER BY rank`,
		*leagueID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var entries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.PlayerTeam, &e.IsVerified, &e.IsDisabled, &e.RoundOf16,
			&e.TotalPoints, &e.TotalGoalPts, &e.ScoredCount, &e.ExactHits, &e.Rank); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []entry{}
	}

	respondJSON(w, http.StatusOK, entries)
}

func (h *LeaderboardHandler) History(w http.ResponseWriter, r *http.Request) {
	leagueIDStr := r.URL.Query().Get("league_id")

	var leagueID *uuid.UUID
	if leagueIDStr != "" {
		parsed, err := uuid.Parse(leagueIDStr)
		if err != nil {
			respondError(w, http.StatusBadRequest, "invalid league_id")
			return
		}
		leagueID = &parsed
	}

	type playerPoint struct {
		UserID      uuid.UUID `json:"user_id"`
		Username    string    `json:"username"`
		PlayerTeam  string    `json:"player_team_name"`
		TotalPoints int       `json:"total_points"`
	}

	type dayEntry struct {
		Date    string        `json:"date"`
		Players []playerPoint `json:"players"`
	}

	rows, err := h.DB.Query(r.Context(),
		`WITH match_dates AS (
		   SELECT DISTINCT kickoff_utc::date AS match_date
		   FROM matches
		   WHERE status = 'finished'
		   ORDER BY match_date
		 ),
		 user_scope AS (
		   SELECT u.id, u.username, u.player_team_name
		   FROM users u
		   WHERE u.is_disabled = FALSE
		     AND ($1::uuid IS NULL OR u.league_id = $1)
		 ),
		 user_match_points AS (
		   SELECT
		     us.id AS user_id,
		     us.username,
		     us.player_team_name,
		     md.match_date,
		     COALESCE(SUM(p.points_earned), 0) AS points
		   FROM user_scope us
		   CROSS JOIN match_dates md
		   LEFT JOIN matches m ON m.kickoff_utc::date = md.match_date AND m.status = 'finished'
		   LEFT JOIN predictions p ON p.match_id = m.id AND p.user_id = us.id
		   GROUP BY us.id, us.username, us.player_team_name, md.match_date
		 )
		 SELECT user_id, username, player_team_name,
		        match_date::text AS date,
		        SUM(points) OVER (
		          PARTITION BY user_id
		          ORDER BY match_date
		          ROWS UNBOUNDED PRECEDING
		        ) AS total_points
		 FROM user_match_points
		 ORDER BY match_date, total_points DESC`,
		leagueID,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type flatRow struct {
		UserID      uuid.UUID
		Username    string
		PlayerTeam  string
		Date        string
		TotalPoints int
	}

	var flat []flatRow
	for rows.Next() {
		var r flatRow
		if err := rows.Scan(&r.UserID, &r.Username, &r.PlayerTeam, &r.Date, &r.TotalPoints); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		flat = append(flat, r)
	}

	var result []dayEntry
	var current *dayEntry
	for _, r := range flat {
		if current == nil || r.Date != current.Date {
			if current != nil {
				result = append(result, *current)
			}
			current = &dayEntry{Date: r.Date, Players: nil}
		}
		current.Players = append(current.Players, playerPoint{
			UserID:      r.UserID,
			Username:    r.Username,
			PlayerTeam:  r.PlayerTeam,
			TotalPoints: r.TotalPoints,
		})
	}
	if current != nil {
		result = append(result, *current)
	}
	if result == nil {
		result = []dayEntry{}
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *LeaderboardHandler) MyGlobalPosition(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	type entry struct {
		UserID       uuid.UUID `json:"user_id"`
		DisplayName  *string   `json:"display_name"`
		PlayerTeam   string    `json:"player_team_name"`
		IsVerified   bool      `json:"is_verified"`
		IsDisabled   bool      `json:"is_disabled"`
		RoundOf16    bool      `json:"round_of_16"`
		TotalPoints  int       `json:"total_points"`
		TotalGoalPts int       `json:"total_goal_pts"`
		ScoredCount  int       `json:"scored_matches"`
		ExactHits    int       `json:"exact_hits"`
		Rank         int       `json:"rank"`
	}

	rows, err := h.DB.Query(r.Context(),
		`SELECT
				u.id,
				u.display_name,
					u.player_team_name,
					u.is_verified,
					u.is_disabled,
					u.round_of_16,
					COALESCE(SUM(p.points_earned), 0) AS total_points,
			COALESCE(SUM(p.goal_pts_earned), 0) AS total_goal_pts,
			COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL) AS scored_matches,
			COUNT(p.id) FILTER (WHERE p.points_earned = 5) AS exact_hits,
			ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(p.points_earned), 0) DESC, COALESCE(SUM(p.goal_pts_earned), 0) DESC) AS rank
			FROM users u
			LEFT JOIN predictions p ON p.user_id = u.id
			WHERE u.is_disabled = FALSE
			GROUP BY u.id, u.display_name, u.player_team_name, u.is_verified, u.is_disabled, u.round_of_16
			ORDER BY rank`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	var allEntries []entry
	for rows.Next() {
		var e entry
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.PlayerTeam, &e.IsVerified, &e.IsDisabled, &e.RoundOf16,
			&e.TotalPoints, &e.TotalGoalPts, &e.ScoredCount, &e.ExactHits, &e.Rank); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		allEntries = append(allEntries, e)
	}

	var myEntry *entry
	var myIndex int = -1
	for i, e := range allEntries {
		if e.UserID == userID {
			myEntry = &e
			myIndex = i
			break
		}
	}

	if myEntry == nil {
		respondError(w, http.StatusNotFound, "user not found on leaderboard")
		return
	}

	start := myIndex - 5
	if start < 0 {
		start = 0
	}
	end := myIndex + 6
	if end > len(allEntries) {
		end = len(allEntries)
	}

	respondJSON(w, http.StatusOK, map[string]interface{}{
		"me":       myEntry,
		"neighbor": allEntries[start:end],
	})
}
