package config

import (
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	DatabaseURL        string
	JWTSecret          string
	JWTExpiry          time.Duration
	RefreshExpiry      time.Duration
	CostaRicaTZ        *time.Location
	CORSAllowedOrigins []string
	WorldCup26BaseURL  string
	WorldCup26Email    string
	WorldCup26Password string
	UploadDir          string
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

	allowedOrigins := parseOrigins(getEnv("CORS_ALLOWED_ORIGINS",
		"http://localhost:5173,http://127.0.0.1:5173,https://web-production-7f56f.up.railway.app"))

	return &Config{
		Port:               ":" + port,
		DatabaseURL:        dbURL,
		JWTSecret:          getEnv("JWT_SECRET", "quiniela-dev-secret-change-in-prod"),
		JWTExpiry:          15 * time.Minute,
		RefreshExpiry:      7 * 24 * time.Hour,
		CostaRicaTZ:        crTZ,
		CORSAllowedOrigins: allowedOrigins,
		WorldCup26BaseURL:  getEnv("WORLDCUP26_API_BASE_URL", "https://worldcup26.ir"),
		WorldCup26Email:    getEnv("WORLDCUP26_API_EMAIL", ""),
		WorldCup26Password: getEnv("WORLDCUP26_API_PASSWORD", ""),
		UploadDir:          getEnv("UPLOAD_DIR", "./uploads"),
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}
