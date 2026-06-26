package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

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
		if err := rows.Scan(&e.UserID, &e.DisplayName, &e.PlayerTeam, &e.IsVerified, &e.IsDisabled, &e.LeagueName,
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
