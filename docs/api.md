# API Reference

**Base URL:** `/api/v1`  
**Authentication:** JWT Bearer token in `Authorization` header  
**Content-Type:** `application/json`

---

## Authentication

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "player_team_name": "string (required)",
  "league_code": "string (optional)"
}
```

**Response (201 Created):**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "user_id": "uuid",
  "is_admin": false
}
```

**Errors:**
- `400 Bad Request` - Missing required fields
- `409 Conflict` - Username, email, or player team name already taken

---

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "jwt_token",
  "user_id": "uuid",
  "is_admin": false
}
```

**Errors:**
- `401 Unauthorized` - Invalid email or password

---

### Refresh Token

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

**Request Body:**
```json
{
  "refresh_token": "jwt_token"
}
```

**Response (200 OK):**
```json
{
  "access_token": "jwt_token"
}
```

**Errors:**
- `401 Unauthorized` - Invalid or expired refresh token

---

### Get Current User

```http
GET /api/v1/me
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "player_team_name": "string",
  "display_name": "string | null",
  "league_id": "uuid | null",
  "is_admin": boolean,
  "created_at": "timestamp"
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `404 Not Found` - User not found

---

## Leagues

### Create League (Admin Only)

```http
POST /api/v1/leagues
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "string"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "name": "string",
  "join_code": "X7K2-MN9P",
  "created_at": "timestamp"
}
```

**Errors:**
- `403 Forbidden` - Not admin
- `400 Bad Request` - Name is required

---

### List All Leagues (Admin Only)

```http
GET /api/v1/leagues
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "string",
    "join_code": "string",
    "member_count": 5,
    "created_at": "timestamp"
  }
]
```

---

### Get League Members (Admin Only)

```http
GET /api/v1/leagues/:id/members
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "username": "string",
    "created_at": "timestamp"
  }
]
```

---

### Join League

```http
POST /api/v1/leagues/join
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "X7K2-MN9P"
}
```

**Response (200 OK):**
```json
{
  "message": "successfully joined league",
  "league_id": "uuid"
}
```

**Errors:**
- `400 Bad Request` - Invalid league code
- `409 Conflict` - Already in a league
- `403 Forbidden` - Not authenticated

---

### Get My League

```http
GET /api/v1/leagues/mine
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "string",
  "join_code": "string"
}
```

**Errors:**
- `404 Not Found` - User not in a league

---

## Matches

### List All Matches

```http
GET /api/v1/matches
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "match_number": 1,
    "stage": "group",
    "group_name": "A",
    "kickoff_utc": "2026-06-12T01:00:00Z",
    "home_team": "México",
    "away_team": "Sudáfrica",
    "home_score": null,
    "away_score": null,
    "status": "upcoming",
    "deadline": "2026-06-12T00:45:00Z",
    "locked": false
  }
]
```

---

### Get Single Match

```http
GET /api/v1/matches/:id
```

**Response (200 OK):**
```json
{
  "id": "uuid",
  "match_number": 1,
  "stage": "group",
  "group_name": "A",
  "kickoff_utc": "2026-06-12T01:00:00Z",
  "home_team": "México",
  "away_team": "Sudáfrica",
  "home_score": null,
  "away_score": null,
  "status": "upcoming",
  "deadline": "2026-06-12T00:45:00Z",
  "locked": false
}
```

**Errors:**
- `404 Not Found` - Match not found

---

### Enter Result (Admin Only)

```http
PUT /api/v1/matches/:id/result
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "home_score": 2,
  "away_score": 1
}
```

**Response (200 OK):**
```json
{
  "message": "result entered and predictions scored",
  "predictions_updated": 15
}
```

**Errors:**
- `400 Bad Request` - Invalid match ID or negative scores
- `403 Forbidden` - Not admin
- `409 Conflict` - Match already has result

---

### Save Live Score (Admin Only)

```http
PUT /api/v1/matches/:id/score
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "home_score": 2,
  "away_score": 1
}
```

**Response (200 OK):**
```json
{
  "message": "live score saved and predictions scored",
  "predictions_updated": 24
}
```

This updates the visible score without finishing the match and recalculates predictions with the provisional score.

---

## Predictions

### Get My Predictions

```http
GET /api/v1/predictions/my
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "match_id": "uuid",
    "match_number": 1,
    "home_team": "México",
    "away_team": "Sudáfrica",
    "kickoff_utc": "2026-06-12T01:00:00Z",
    "home_score_pred": 2,
    "away_score_pred": 1,
    "points_earned": null,
    "goal_pts_earned": null,
    "locked": false,
    "submitted_at": "timestamp"
  }
]
```

---

### Submit Prediction

```http
POST /api/v1/predictions
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "match_id": "uuid",
  "home_score_pred": 2,
  "away_score_pred": 1
}
```

**Response (201 Created):**
```json
{
  "message": "prediction saved"
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - User not in league OR match past deadline
- `400 Bad Request` - Invalid match ID or negative scores
- `404 Not Found` - Match not found

---

### Update Prediction

```http
PUT /api/v1/predictions/:id
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "home_score_pred": 3,
  "away_score_pred": 2
}
```

**Response (200 OK):**
```json
{
  "message": "prediction updated"
}
```

**Errors:**
- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Match past deadline
- `404 Not Found` - Prediction not found or doesn't belong to user

---

## Leaderboard

### Global Leaderboard (Public)

```http
GET /api/v1/leaderboard/global
```

**Response (200 OK):**
```json
[
  {
    "user_id": "uuid",
    "display_name": "string",
    "player_team_name": "string",
    "league_name": "string",
    "total_points": 45,
    "total_goal_pts": 12,
    "scored_matches": 15,
    "exact_hits": 3
  }
]
```

---

### League Leaderboard (Public)

```http
GET /api/v1/leaderboard/league/:id
```

**Response (200 OK):**
```json
[
  {
    "user_id": "uuid",
    "display_name": "string",
    "player_team_name": "string",
    "total_points": 45,
    "total_goal_pts": 12,
    "scored_matches": 15,
    "exact_hits": 3
  }
]
```

---

### My League Leaderboard

```http
GET /api/v1/leaderboard/mine
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
[
  {
    "user_id": "uuid",
    "display_name": "string",
    "player_team_name": "string",
    "total_points": 45,
    "total_goal_pts": 12,
    "scored_matches": 15,
    "exact_hits": 3,
    "rank": 1
  }
]
```

**Errors:**
- `404 Not Found` - User not in a league

---

### My Global Position

```http
GET /api/v1/leaderboard/me
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "me": {
    "user_id": "uuid",
    "display_name": "string",
    "player_team_name": "string",
    "total_points": 45,
    "total_goal_pts": 12,
    "scored_matches": 15,
    "exact_hits": 3,
    "rank": 5
  },
  "neighbor": [
    { /* rank 0 */ },
    { /* rank 1 */ },
    ...
    { /* rank 10 */ }
  ]
}
```

**Description:** Returns user's entry plus ±5 neighbors for context.

---

## Error Response Format

All errors follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST (register, submit prediction) |
| 400 | Bad Request | Invalid request body, missing fields |
| 401 | Unauthorized | Invalid/missing JWT, wrong credentials |
| 403 | Forbidden | No league, past deadline, not admin |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Already in league, duplicate username, result exists |
| 500 | Internal Server Error | Database error, scoring failure |

---

## Authentication Details

### JWT Token Structure

**Access Token:**
- Expiration: 15 minutes
- Claims: `sub` (user ID), `is_admin`, `exp`
- Used for: All authenticated requests

**Refresh Token:**
- Expiration: 7 days
- Stored in: `refresh_tokens` table (hashed)
- Used for: Obtaining new access tokens

### Token Refresh Flow

1. Client receives `401 Unauthorized`
2. Client sends `POST /api/v1/auth/refresh` with refresh token
3. Backend validates refresh token (not revoked, not expired)
4. Backend issues new access token
5. Client retries original request with new token

---

## Rate Limiting

Not implemented in v1. Future enhancement.

---

## Ticker

### Today's Ticker (Public)

```http
GET /api/v1/ticker/today
```

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "home_team": "Canada",
    "away_team": "Bosnia and Herzegovina",
    "group": "B",
    "kickoff": "2026-06-12T19:00:00Z",
    "status": "Programado",
    "time_elapsed": "",
    "home_score": "",
    "away_score": ""
  }
]
```

**Description:**
- Returns today's matches in Costa Rica timezone (midnight-to-midnight CR)
- Kickoff times come from the DB (`kickoff_utc`), not from the external API
- Live scores/status are merged from worldcup26.ir API by matching team names
- Team names are sent in English (matching `teamColors` in the frontend)
- Status values: `Programado`, `En juego`, `Finalizado`
- Falls back to DB data (no live scores) if external API is unavailable

---

## CORS

Configured for production domain only. Local dev uses Vite proxy.
