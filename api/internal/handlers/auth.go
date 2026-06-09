package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/auth"
	"github.com/quiniela2026/api/internal/middleware"
)

type AuthHandler struct {
	DB       *pgxpool.Pool
	AuthSvc  *auth.Service
}

type registerRequest struct {
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Password       string  `json:"password"`
	PlayerTeamName string  `json:"player_team_name"`
	LeagueCode     *string `json:"league_code"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	UserID       string `json:"user_id"`
	IsAdmin      bool   `json:"is_admin"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Username == "" || req.Email == "" || req.Password == "" || req.PlayerTeamName == "" {
		respondError(w, http.StatusBadRequest, "username, email, password, and player_team_name are required")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	var leagueID *uuid.UUID
	if req.LeagueCode != nil && *req.LeagueCode != "" {
		err := h.DB.QueryRow(r.Context(), "SELECT id FROM leagues WHERE join_code = $1", *req.LeagueCode).Scan(&leagueID)
		if err != nil {
			if err == pgx.ErrNoRows {
				respondError(w, http.StatusBadRequest, "invalid league code")
				return
			}
			respondError(w, http.StatusInternalServerError, "database error")
			return
		}
	}

	var userID uuid.UUID
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO users (username, email, password_hash, player_team_name, league_id)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, is_admin`,
		req.Username, req.Email, hash, req.PlayerTeamName, leagueID,
	).Scan(&userID, new(bool))
	if err != nil {
		if isPGUniqueViolation(err) {
			respondError(w, http.StatusConflict, "username, email, or player team name already taken")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	accessToken, err := h.AuthSvc.GenerateAccessToken(userID, false)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	refreshToken, err := h.storeRefreshToken(r, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	respondJSON(w, http.StatusCreated, tokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       userID.String(),
		IsAdmin:      false,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" {
		respondError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	var user struct {
		ID           uuid.UUID
		PasswordHash string
		IsAdmin      bool
	}
	err := h.DB.QueryRow(r.Context(),
		"SELECT id, password_hash, is_admin FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.PasswordHash, &user.IsAdmin)
	if err != nil {
		if err == pgx.ErrNoRows {
			respondError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		respondError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	accessToken, err := h.AuthSvc.GenerateAccessToken(user.ID, user.IsAdmin)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate token")
		return
	}

	refreshToken, err := h.storeRefreshToken(r, user.ID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate refresh token")
		return
	}

	respondJSON(w, http.StatusOK, tokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		UserID:       user.ID.String(),
		IsAdmin:      user.IsAdmin,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.RefreshToken == "" {
		respondError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	claims, err := h.AuthSvc.ValidateToken(req.RefreshToken)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "invalid token subject")
		return
	}

	var storedHash string
	err = h.DB.QueryRow(r.Context(),
		`SELECT token_hash FROM refresh_tokens
		 WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
		 ORDER BY created_at DESC LIMIT 1`,
		userID,
	).Scan(&storedHash)
	if err != nil {
		respondError(w, http.StatusUnauthorized, "refresh token not found or expired")
		return
	}

	var isAdmin bool
	err = h.DB.QueryRow(r.Context(), "SELECT is_admin FROM users WHERE id = $1", userID).Scan(&isAdmin)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	accessToken, err := h.AuthSvc.GenerateAccessToken(userID, isAdmin)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to generate access token")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"access_token": accessToken,
	})
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var user struct {
		ID             uuid.UUID  `json:"id"`
		Username       string     `json:"username"`
		Email          string     `json:"email"`
		PlayerTeamName string     `json:"player_team_name"`
		DisplayName    *string    `json:"display_name"`
		LeagueID       *uuid.UUID `json:"league_id"`
		IsAdmin        bool       `json:"is_admin"`
		CreatedAt      time.Time  `json:"created_at"`
	}
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, username, email, player_team_name, display_name, league_id, is_admin, created_at
		 FROM users WHERE id = $1`, userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PlayerTeamName, &user.DisplayName, &user.LeagueID, &user.IsAdmin, &user.CreatedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) storeRefreshToken(r *http.Request, userID uuid.UUID) (string, error) {
	tokenID := uuid.New()
	refreshToken, err := h.AuthSvc.GenerateRefreshToken(userID, tokenID)
	if err != nil {
		return "", err
	}

	_, err = h.DB.Exec(r.Context(),
		`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3, $4)`,
		tokenID, userID, tokenID.String(), time.Now().Add(7*24*time.Hour),
	)
	if err != nil {
		return "", err
	}

	return refreshToken, nil
}

func isPGUniqueViolation(err error) bool {
	return err != nil && pgxUniqueConstraint(err)
}

func pgxUniqueConstraint(err error) bool {
	s := err.Error()
	return len(s) >= 20 && containsPG(s, "violates unique constraint")
}

func containsPG(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
