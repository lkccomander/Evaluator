package services

import (
	"context"
	"fmt"
	"math/rand"

	"github.com/jackc/pgx/v5/pgxpool"
)

const joinCodeChars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

func GenerateJoinCode() string {
	b := make([]byte, 9)
	for i := range b {
		if i == 4 {
			b[i] = '-'
			continue
		}
		b[i] = joinCodeChars[rand.Intn(len(joinCodeChars))]
	}
	return string(b)
}

func GenerateUniqueJoinCode(ctx context.Context, db *pgxpool.Pool) (string, error) {
	for range 10 {
		code := GenerateJoinCode()
		var exists bool
		err := db.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM leagues WHERE join_code = $1)", code).Scan(&exists)
		if err != nil {
			return "", err
		}
		if !exists {
			return code, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique join code after 10 attempts")
}
