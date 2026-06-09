package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DatabaseURL     string
	JWTSecret       string
	JWTExpiry       time.Duration
	RefreshExpiry   time.Duration
	CostaRicaTZ    *time.Location
}

func Load() (*Config, error) {
	godotenv.Load("../.env")

	port := getEnv("PORT", "8080")
	dbURL := getEnv("DATABASE_URL", "")
	if dbURL == "" {
		dbURL = getEnv("localdb", "")
	}

	crTZ, err := time.LoadLocation("America/Costa_Rica")
	if err != nil {
		return nil, err
	}

	return &Config{
		Port:          ":" + port,
		DatabaseURL:   dbURL,
		JWTSecret:     getEnv("JWT_SECRET", "quiniela-dev-secret-change-in-prod"),
		JWTExpiry:     15 * time.Minute,
		RefreshExpiry: 7 * 24 * time.Hour,
		CostaRicaTZ:   crTZ,
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
