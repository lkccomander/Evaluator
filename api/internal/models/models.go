package models

import (
	"time"

	"github.com/google/uuid"
)

type League struct {
	ID        uuid.UUID  `json:"id"`
	Name      string     `json:"name"`
	JoinCode  string     `json:"join_code"`
	CreatedBy *uuid.UUID `json:"created_by"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

type User struct {
	ID             uuid.UUID  `json:"id"`
	Username       string     `json:"username"`
	Email          string     `json:"email"`
	PasswordHash   string     `json:"-"`
	PlayerTeamName string     `json:"player_team_name"`
	DisplayName    *string    `json:"display_name"`
	LeagueID       *uuid.UUID `json:"league_id"`
	IsAdmin        bool       `json:"is_admin"`
	IsVerified     bool       `json:"is_verified"`
	IsDisabled     bool       `json:"is_disabled"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type Match struct {
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
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Prediction struct {
	ID            uuid.UUID `json:"id"`
	UserID        uuid.UUID `json:"user_id"`
	MatchID       uuid.UUID `json:"match_id"`
	HomeScorePred int       `json:"home_score_pred"`
	AwayScorePred int       `json:"away_score_pred"`
	SubmittedAt   time.Time `json:"submitted_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	PointsEarned  *int      `json:"points_earned"`
	GoalPtsEarned *int      `json:"goal_pts_earned"`
}

type RefreshToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	TokenHash string     `json:"-"`
	ExpiresAt time.Time  `json:"expires_at"`
	RevokedAt *time.Time `json:"revoked_at"`
	CreatedAt time.Time  `json:"created_at"`
}

type LeaderboardEntry struct {
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

type DeadlineInfo struct {
	MatchID  uuid.UUID `json:"match_id"`
	Deadline time.Time `json:"deadline"`
	Locked   bool      `json:"locked"`
}
