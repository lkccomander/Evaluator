package services

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ScoringResult struct {
	PredictionsUpdated int
}

func ScoreMatch(ctx context.Context, db *pgxpool.Pool, matchID string) (*ScoringResult, error) {
	tx, err := db.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var homeScore, awayScore int
	var penaltyHome, penaltyAway *int
	err = tx.QueryRow(ctx,
		`SELECT home_score, away_score, penalty_home_score, penalty_away_score
		 FROM matches WHERE id = $1 AND home_score IS NOT NULL AND away_score IS NOT NULL`,
		matchID,
	).Scan(&homeScore, &awayScore, &penaltyHome, &penaltyAway)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("match not found or score not yet entered")
		}
		return nil, fmt.Errorf("query match: %w", err)
	}

	actualOutcome := sign(homeScore - awayScore)

	rows, err := tx.Query(ctx,
		"SELECT id, home_score_pred, away_score_pred, pen_home_pred, pen_away_pred FROM predictions WHERE match_id = $1",
		matchID,
	)
	if err != nil {
		return nil, fmt.Errorf("query predictions: %w", err)
	}
	defer rows.Close()

	type pred struct {
		ID                     string
		HomePred, AwayPred     int
		PenHome, PenAway       *int
	}

	var preds []pred
	for rows.Next() {
		var p pred
		if err := rows.Scan(&p.ID, &p.HomePred, &p.AwayPred, &p.PenHome, &p.PenAway); err != nil {
			return nil, fmt.Errorf("scan prediction: %w", err)
		}
		preds = append(preds, p)
	}

	count := 0
	for _, p := range preds {
		var points, goalPts int

		if p.HomePred == homeScore && p.AwayPred == awayScore {
			points = 5
			goalPts = max(1, homeScore) + max(1, awayScore)
		} else if sign(p.HomePred-p.AwayPred) == actualOutcome {
			points = 3
			switch {
			case p.HomePred == homeScore:
				goalPts = max(1, homeScore)
			case p.AwayPred == awayScore:
				goalPts = max(1, awayScore)
			default:
				goalPts = 0
			}
		} else {
			points = 0
			goalPts = 0
		}

		penaltyBonus := 0
		if penaltyHome != nil && penaltyAway != nil && p.PenHome != nil && p.PenAway != nil && p.HomePred == p.AwayPred {
			if *p.PenHome == *penaltyHome && *p.PenAway == *penaltyAway {
				penaltyBonus = 1
			}
		}

		_, err := tx.Exec(ctx,
			"UPDATE predictions SET points_earned = $1, goal_pts_earned = $2, updated_at = NOW() WHERE id = $3",
			points+penaltyBonus, goalPts, p.ID,
		)
		if err != nil {
			return nil, fmt.Errorf("update prediction %s: %w", p.ID, err)
		}
		count++
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return &ScoringResult{PredictionsUpdated: count}, nil
}

func sign(x int) int {
	if x > 0 {
		return 1
	}
	if x < 0 {
		return -1
	}
	return 0
}
