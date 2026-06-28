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

type KnockoutHandler struct {
	DB *pgxpool.Pool
}

func (h *KnockoutHandler) Bracket(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT id, match_number, stage, group_name, kickoff_utc, home_team, away_team,
		        home_score, away_score, penalty_home_score, penalty_away_score, bracket_position, status
		 FROM matches
		 WHERE stage != 'group'
		 ORDER BY bracket_position ASC NULLS LAST, kickoff_utc ASC`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type bracketEntry struct {
		ID               uuid.UUID  `json:"id"`
		MatchNumber      int        `json:"match_number"`
		Stage            string     `json:"stage"`
		GroupName        *string    `json:"group_name"`
		KickoffUTC       time.Time  `json:"kickoff_utc"`
		HomeTeam         string     `json:"home_team"`
		AwayTeam         string     `json:"away_team"`
		HomeScore        *int       `json:"home_score"`
		AwayScore        *int       `json:"away_score"`
		PenaltyHomeScore *int       `json:"penalty_home_score"`
		PenaltyAwayScore *int       `json:"penalty_away_score"`
		BracketPosition  *int       `json:"bracket_position"`
		Status           string     `json:"status"`
		Deadline         time.Time  `json:"deadline"`
		Locked           bool       `json:"locked"`
	}

	var entries []bracketEntry
	for rows.Next() {
		var e bracketEntry
		if err := rows.Scan(&e.ID, &e.MatchNumber, &e.Stage, &e.GroupName, &e.KickoffUTC,
			&e.HomeTeam, &e.AwayTeam, &e.HomeScore, &e.AwayScore,
			&e.PenaltyHomeScore, &e.PenaltyAwayScore, &e.BracketPosition, &e.Status); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		e.Deadline = services.GetDeadline(e.KickoffUTC)
		e.Locked = services.IsPastDeadline(e.KickoffUTC)
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []bracketEntry{}
	}

	respondJSON(w, http.StatusOK, entries)
}

func (h *KnockoutHandler) Leaderboard(w http.ResponseWriter, r *http.Request) {
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
				LEFT JOIN matches m ON m.id = p.match_id AND m.stage != 'group'
				WHERE u.is_disabled = FALSE AND m.id IS NOT NULL
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

func (h *KnockoutHandler) MyKnockoutLeague(w http.ResponseWriter, r *http.Request) {
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
		LEFT JOIN matches m ON m.id = p.match_id AND m.stage != 'group'
		WHERE u.league_id = $1 AND u.is_disabled = FALSE AND m.id IS NOT NULL
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

func (h *KnockoutHandler) KnockoutByLeague(w http.ResponseWriter, r *http.Request) {
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
		LEFT JOIN matches m ON m.id = p.match_id AND m.stage != 'group'
		WHERE u.league_id = $1 AND u.is_disabled = FALSE AND m.id IS NOT NULL
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

func (h *KnockoutHandler) History(w http.ResponseWriter, r *http.Request) {
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
		   WHERE status = 'finished' AND stage != 'group'
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
		   LEFT JOIN matches m ON m.kickoff_utc::date = md.match_date AND m.status = 'finished' AND m.stage != 'group'
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

type seedBracketRequest struct {
	BracketPosition int    `json:"bracket_position"`
	HomeTeam        string `json:"home_team"`
	AwayTeam        string `json:"away_team"`
}

func (h *KnockoutHandler) Seed(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Matches []seedBracketRequest `json:"matches"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for _, m := range req.Matches {
		if m.HomeTeam == "" || m.AwayTeam == "" {
			respondError(w, http.StatusBadRequest, "home_team and away_team are required")
			return
		}
		_, err := h.DB.Exec(r.Context(),
			`UPDATE matches SET home_team = $1, away_team = $2, updated_at = NOW()
			 WHERE bracket_position = $3 AND stage != 'group'`,
			m.HomeTeam, m.AwayTeam, m.BracketPosition,
		)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "failed to seed bracket")
			return
		}
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "bracket seeded"})
}

func (h *KnockoutHandler) UnseededSlots(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT bracket_position, home_team, away_team
		 FROM matches
		 WHERE stage != 'group' AND (home_team = '' OR away_team = '' OR home_team IS NULL OR away_team IS NULL)
		 ORDER BY bracket_position ASC`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type slot struct {
		BracketPosition int     `json:"bracket_position"`
		HomeTeam        *string `json:"home_team"`
		AwayTeam        *string `json:"away_team"`
	}

	var slots []slot
	for rows.Next() {
		var s slot
		if err := rows.Scan(&s.BracketPosition, &s.HomeTeam, &s.AwayTeam); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		slots = append(slots, s)
	}
	if slots == nil {
		slots = []slot{}
	}

	respondJSON(w, http.StatusOK, slots)
}
