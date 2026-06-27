package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/quiniela2026/api/internal/auth"
	"github.com/quiniela2026/api/internal/middleware"
)

type UserHandler struct {
	DB *pgxpool.Pool
}

type adminUserPayload struct {
	Username       string  `json:"username"`
	Email          string  `json:"email"`
	Password       string  `json:"password"`
	PlayerTeamName string  `json:"player_team_name"`
	DisplayName    *string `json:"display_name"`
	LeagueID       *string `json:"league_id"`
	IsAdmin        bool    `json:"is_admin"`
	IsVerified     bool    `json:"is_verified"`
	IsDisabled     bool    `json:"is_disabled"`
	RoundOf16      bool    `json:"round_of_16"`
}

func normalizeOptionalString(v *string) *string {
	if v == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*v)
	if trimmed == "" {
		return nil
	}
	return &trimmed
}

func parseOptionalUUID(raw *string) (*uuid.UUID, error) {
	if raw == nil {
		return nil, nil
	}
	trimmed := strings.TrimSpace(*raw)
	if trimmed == "" {
		return nil, nil
	}
	id, err := uuid.Parse(trimmed)
	if err != nil {
		return nil, err
	}
	return &id, nil
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT u.id, u.username, u.email, u.player_team_name, u.display_name, u.league_id,
		        u.is_admin, u.is_verified, u.is_disabled, u.round_of_16, u.created_at, l.name
		   FROM users u
		   LEFT JOIN leagues l ON l.id = u.league_id
		  ORDER BY u.created_at DESC, u.username ASC`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	type userRow struct {
		ID             uuid.UUID  `json:"id"`
		Username       string     `json:"username"`
		Email          string     `json:"email"`
		PlayerTeamName string     `json:"player_team_name"`
		DisplayName    *string    `json:"display_name"`
		LeagueID       *uuid.UUID `json:"league_id"`
		LeagueName     *string    `json:"league_name"`
		IsAdmin        bool       `json:"is_admin"`
		IsVerified     bool       `json:"is_verified"`
		IsDisabled     bool       `json:"is_disabled"`
		RoundOf16      bool       `json:"round_of_16"`
		CreatedAt      time.Time  `json:"created_at"`
	}

	users := make([]userRow, 0)
	for rows.Next() {
		var u userRow
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.PlayerTeamName, &u.DisplayName, &u.LeagueID,
			&u.IsAdmin, &u.IsVerified, &u.IsDisabled, &u.RoundOf16, &u.CreatedAt, &u.LeagueName); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		users = append(users, u)
	}

	respondJSON(w, http.StatusOK, users)
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req adminUserPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.PlayerTeamName = strings.TrimSpace(req.PlayerTeamName)
	req.DisplayName = normalizeOptionalString(req.DisplayName)

	if req.Username == "" || req.Email == "" || req.Password == "" || req.PlayerTeamName == "" {
		respondError(w, http.StatusBadRequest, "username, email, password, and player_team_name are required")
		return
	}

	leagueID, err := parseOptionalUUID(req.LeagueID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid league id")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	type createdUser struct {
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

	var user createdUser
	err = h.DB.QueryRow(r.Context(),
		`INSERT INTO users (username, email, password_hash, player_team_name, display_name, league_id, is_admin, is_verified, is_disabled, round_of_16)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, username, email, player_team_name, display_name, league_id, is_admin, is_verified, is_disabled, round_of_16, created_at`,
		req.Username, req.Email, hash, req.PlayerTeamName, req.DisplayName, leagueID, req.IsAdmin, req.IsVerified, req.IsDisabled, req.RoundOf16,
	).Scan(&user.ID, &user.Username, &user.Email, &user.PlayerTeamName, &user.DisplayName, &user.LeagueID,
		&user.IsAdmin, &user.IsVerified, &user.IsDisabled, &user.RoundOf16, &user.CreatedAt)
	if err != nil {
		if isPGUniqueViolation(err) {
			respondError(w, http.StatusConflict, "username, email, or player team name already taken")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	respondJSON(w, http.StatusCreated, user)
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	var req adminUserPayload
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.PlayerTeamName = strings.TrimSpace(req.PlayerTeamName)
	req.DisplayName = normalizeOptionalString(req.DisplayName)

	if req.Username == "" || req.Email == "" || req.PlayerTeamName == "" {
		respondError(w, http.StatusBadRequest, "username, email, and player_team_name are required")
		return
	}

	leagueID, err := parseOptionalUUID(req.LeagueID)
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid league id")
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer tx.Rollback(r.Context())

	if strings.TrimSpace(req.Password) != "" {
		hash, err := auth.HashPassword(req.Password)
		if err != nil {
			respondError(w, http.StatusInternalServerError, "failed to hash password")
			return
		}
		result, err := tx.Exec(r.Context(),
			`UPDATE users
			    SET username = $1, email = $2, password_hash = $3, player_team_name = $4,
			        display_name = $5, league_id = $6, is_admin = $7, is_verified = $8, is_disabled = $9, round_of_16 = $10, updated_at = NOW()
			  WHERE id = $11`,
			req.Username, req.Email, hash, req.PlayerTeamName, req.DisplayName, leagueID, req.IsAdmin, req.IsVerified, req.IsDisabled, req.RoundOf16, userID,
		)
		if err != nil {
			if isPGUniqueViolation(err) {
				respondError(w, http.StatusConflict, "username, email, or player team name already taken")
				return
			}
			respondError(w, http.StatusInternalServerError, "failed to update user")
			return
		}
		if result.RowsAffected() == 0 {
			respondError(w, http.StatusNotFound, "user not found")
			return
		}
	} else {
		result, err := tx.Exec(r.Context(),
			`UPDATE users
			    SET username = $1, email = $2, player_team_name = $3, display_name = $4,
			        league_id = $5, is_admin = $6, is_verified = $7, is_disabled = $8, round_of_16 = $9, updated_at = NOW()
			  WHERE id = $10`,
			req.Username, req.Email, req.PlayerTeamName, req.DisplayName, leagueID, req.IsAdmin, req.IsVerified, req.IsDisabled, req.RoundOf16, userID,
		)
		if err != nil {
			if isPGUniqueViolation(err) {
				respondError(w, http.StatusConflict, "username, email, or player team name already taken")
				return
			}
			respondError(w, http.StatusInternalServerError, "failed to update user")
			return
		}
		if result.RowsAffected() == 0 {
			respondError(w, http.StatusNotFound, "user not found")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to update user")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "user updated"})
}

func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	targetUserID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		respondError(w, http.StatusBadRequest, "invalid user id")
		return
	}

	currentUserID, ok := middleware.GetUserID(r)
	if ok && currentUserID == targetUserID {
		respondError(w, http.StatusBadRequest, "cannot delete the current admin user")
		return
	}

	tx, err := h.DB.Begin(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer tx.Rollback(r.Context())

	if _, err := tx.Exec(r.Context(), "DELETE FROM refresh_tokens WHERE user_id = $1", targetUserID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete user tokens")
		return
	}
	if _, err := tx.Exec(r.Context(), "DELETE FROM predictions WHERE user_id = $1", targetUserID); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete user predictions")
		return
	}

	result, err := tx.Exec(r.Context(), "DELETE FROM users WHERE id = $1", targetUserID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete user")
		return
	}
	if result.RowsAffected() == 0 {
		respondError(w, http.StatusNotFound, "user not found")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to delete user")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": "user deleted"})
}
