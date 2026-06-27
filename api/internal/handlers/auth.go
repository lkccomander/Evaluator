package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/auth"
	"github.com/quiniela2026/api/internal/middleware"
)

type AuthHandler struct {
	DB      *pgxpool.Pool
	AuthSvc *auth.Service
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
	respondError(w, http.StatusForbidden, "el registro de nuevos usuarios está cerrado")
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
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var user struct {
		ID           uuid.UUID
		PasswordHash string
		IsAdmin      bool
		IsDisabled   bool
	}
	err := h.DB.QueryRow(r.Context(),
		"SELECT id, password_hash, is_admin, is_disabled FROM users WHERE email = $1",
		req.Email,
	).Scan(&user.ID, &user.PasswordHash, &user.IsAdmin, &user.IsDisabled)
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
	if user.IsDisabled {
		respondError(w, http.StatusForbidden, "user is disabled")
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
	var isDisabled bool
	err = h.DB.QueryRow(r.Context(), "SELECT is_admin, is_disabled FROM users WHERE id = $1", userID).Scan(&isAdmin, &isDisabled)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	if isDisabled {
		respondError(w, http.StatusForbidden, "user is disabled")
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
		IsVerified     bool       `json:"is_verified"`
		IsDisabled     bool       `json:"is_disabled"`
		RoundOf16      bool       `json:"round_of_16"`
		CreatedAt      time.Time  `json:"created_at"`
	}
	err := h.DB.QueryRow(r.Context(),
		`SELECT id, username, email, player_team_name, display_name, league_id, is_admin, is_verified, is_disabled, round_of_16, created_at
		 FROM users WHERE id = $1`, userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PlayerTeamName, &user.DisplayName, &user.LeagueID, &user.IsAdmin, &user.IsVerified, &user.IsDisabled, &user.RoundOf16, &user.CreatedAt)
	if err != nil {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}
	if user.IsDisabled {
		respondError(w, http.StatusForbidden, "user is disabled")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserID(r)
	if !ok {
		respondError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req struct {
		DisplayName    *string `json:"display_name"`
		PlayerTeamName *string `json:"player_team_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}

	_, err := h.DB.Exec(r.Context(),
		`UPDATE users SET
			display_name    = COALESCE($2, display_name),
			player_team_name = COALESCE($3, player_team_name),
			updated_at      = NOW()
		 WHERE id = $1`,
		userID, req.DisplayName, req.PlayerTeamName,
	)
	if err != nil {
		if isPGUniqueViolation(err) {
			respondError(w, http.StatusConflict, "ese nombre de equipo ya está en uso")
			return
		}
		respondError(w, http.StatusInternalServerError, "database error")
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
		IsVerified     bool       `json:"is_verified"`
		IsDisabled     bool       `json:"is_disabled"`
		RoundOf16      bool       `json:"round_of_16"`
		CreatedAt      time.Time  `json:"created_at"`
	}
	err = h.DB.QueryRow(r.Context(),
		`SELECT id, username, email, player_team_name, display_name, league_id, is_admin, is_verified, is_disabled, round_of_16, created_at
		 FROM users WHERE id = $1`, userID,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PlayerTeamName, &user.DisplayName, &user.LeagueID, &user.IsAdmin, &user.IsVerified, &user.IsDisabled, &user.RoundOf16, &user.CreatedAt)
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
