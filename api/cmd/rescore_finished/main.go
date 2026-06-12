package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/services"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("connect db: %v", err)
	}
	defer db.Close()

	rows, err := db.Query(ctx, `
		SELECT id, match_number, home_team, away_team
		FROM matches
		WHERE status = 'finished'
		  AND home_score IS NOT NULL
		  AND away_score IS NOT NULL
		ORDER BY match_number
	`)
	if err != nil {
		log.Fatalf("query finished matches: %v", err)
	}
	defer rows.Close()

	type matchRow struct {
		ID          string
		MatchNumber int
		HomeTeam    string
		AwayTeam    string
	}

	var matches []matchRow
	for rows.Next() {
		var m matchRow
		if err := rows.Scan(&m.ID, &m.MatchNumber, &m.HomeTeam, &m.AwayTeam); err != nil {
			log.Fatalf("scan finished match: %v", err)
		}
		matches = append(matches, m)
	}
	if err := rows.Err(); err != nil {
		log.Fatalf("iterate finished matches: %v", err)
	}

	totalPredictions := 0
	for _, m := range matches {
		result, err := services.ScoreMatch(ctx, db, m.ID)
		if err != nil {
			log.Fatalf("rescore match %d (%s vs %s): %v", m.MatchNumber, m.HomeTeam, m.AwayTeam, err)
		}
		totalPredictions += result.PredictionsUpdated
		fmt.Printf("rescored match %d: %s vs %s (%d predictions)\n", m.MatchNumber, m.HomeTeam, m.AwayTeam, result.PredictionsUpdated)
	}

	fmt.Printf("done: rescored %d finished matches, %d predictions updated\n", len(matches), totalPredictions)
}
