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
	err = tx.QueryRow(ctx,
		"SELECT home_score, away_score FROM matches WHERE id = $1 AND status = 'finished'",
		matchID,
	).Scan(&homeScore, &awayScore)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("match not found or not yet finished")
		}
		return nil, fmt.Errorf("query match: %w", err)
	}

	actualOutcome := sign(homeScore - awayScore)

	rows, err := tx.Query(ctx,
		"SELECT id, home_score_pred, away_score_pred FROM predictions WHERE match_id = $1 AND points_earned IS NULL",
		matchID,
	)
	if err != nil {
		return nil, fmt.Errorf("query predictions: %w", err)
	}
	defer rows.Close()

	type pred struct {
		ID            string
		HomePred, AwayPred int
	}

	var preds []pred
	for rows.Next() {
		var p pred
		if err := rows.Scan(&p.ID, &p.HomePred, &p.AwayPred); err != nil {
			return nil, fmt.Errorf("scan prediction: %w", err)
		}
		preds = append(preds, p)
	}

	count := 0
	for _, p := range preds {
		var points, goalPts int

		if p.HomePred == homeScore && p.AwayPred == awayScore {
			points = 5
			goalPts = homeScore + awayScore
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

		_, err := tx.Exec(ctx,
			"UPDATE predictions SET points_earned = $1, goal_pts_earned = $2, updated_at = NOW() WHERE id = $3",
			points, goalPts, p.ID,
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
