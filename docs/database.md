# Database

## PostgreSQL Schema

### Tables

#### `leagues`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | League identifier |
| `name` | TEXT | NOT NULL | League name |
| `join_code` | TEXT | NOT NULL UNIQUE | Auto-generated 8-char code (e.g., `X7K2-MN9P`) |
| `created_by` | UUID | NOT NULL | Admin user ID (creator) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

#### `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | User identifier |
| `username` | TEXT | NOT NULL UNIQUE | Username |
| `email` | TEXT | NOT NULL UNIQUE | Email (for login) |
| `password_hash` | TEXT | NOT NULL | Bcrypt hash |
| `player_team_name` | TEXT | NOT NULL | User's team name (display name) |
| `display_name` | TEXT | NULL | Optional display name override |
| `league_id` | UUID | FK → leagues(id) | NULL until user joins league |
| `is_admin` | BOOLEAN | DEFAULT FALSE | Admin flag |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Registration timestamp |

#### `matches`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Match identifier |
| `match_number` | INT | UNIQUE NOT NULL | Sequential match number (1-72) |
| `stage` | TEXT | NOT NULL | Match stage (e.g., "group") |
| `group_name` | TEXT | NULL | Group letter (A-L) |
| `kickoff_utc` | TIMESTAMPTZ | NOT NULL | Kickoff time in UTC |
| `home_team` | TEXT | NOT NULL | Home team name |
| `away_team` | TEXT | NOT NULL | Away team name |
| `home_score` | INT | NULL | Final home score (NULL until finished) |
| `away_score` | INT | NULL | Final away score (NULL until finished) |
| `status` | TEXT | DEFAULT 'upcoming' | `upcoming` \| `locked` \| `finished` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update |

#### `predictions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Prediction identifier |
| `user_id` | UUID | FK → users(id) NOT NULL | User who made prediction |
| `match_id` | UUID | FK → matches(id) NOT NULL | Match being predicted |
| `home_score_pred` | INT | NOT NULL | Predicted home score |
| `away_score_pred` | INT | NOT NULL | Predicted away score |
| `submitted_at` | TIMESTAMPTZ | DEFAULT NOW() | Submission timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last edit timestamp |
| `points_earned` | INT | NULL | Match points (NULL until scored) |
| `goal_pts_earned` | INT | NULL | Goal points tiebreaker (NULL until scored) |
| **UNIQUE** | `(user_id, match_id)` | | One prediction per user per match |

#### `refresh_tokens`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Token identifier |
| `user_id` | UUID | FK → users(id) | Token owner |
| `token_hash` | TEXT | NOT NULL | Hashed token value |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Expiration (7 days) |
| `revoked_at` | TIMESTAMPTZ | NULL | Revocation timestamp (NULL = active) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

## Indexes

```sql
-- Predictions
CREATE INDEX idx_predictions_user    ON predictions(user_id);
CREATE INDEX idx_predictions_match   ON predictions(match_id);

-- Matches
CREATE INDEX idx_matches_kickoff     ON matches(kickoff_utc);

-- Users
CREATE INDEX idx_users_league        ON users(league_id);

-- Leagues
CREATE UNIQUE INDEX idx_leagues_code ON leagues(join_code);
```

---

## Migrations

### `001_create_tables.sql`

Creates all tables, indexes, and enables `uuid-ossp` extension.

### `002_fix_schema.sql`

Schema corrections (if any).

---

## Seed Data

### `matches.sql` - 72 Group Stage Fixtures

All matches from June 11-28, 2026. Times stored in UTC.

Example:
```sql
INSERT INTO matches (match_number, stage, group_name, kickoff_utc, home_team, away_team)
VALUES
  (1, 'group', 'A', '2026-06-12 01:00:00+00', 'México', 'Sudáfrica'),
  (2, 'group', 'A', '2026-06-12 08:00:00+00', 'Corea del Sur', 'Chequia'),
  ...
```

### Test Users

| Email | Password | Role | League |
|-------|----------|------|--------|
| admin@quiniela.test | admin123 | Admin | Liga de Prueba |
| jugador1@quiniela.test | player123 | Player | Liga de Prueba |

**Test League:** `Liga de Prueba` with code `TEST-ABCD`

---

## ER Diagram

```
┌─────────────┐
│   leagues   │
├─────────────┤
│ id          │◄──────┐
│ name        │       │
│ join_code   │       │
│ created_by  │       │
│ created_at  │       │
└──────┬──────┘       │
       │              │
       │ 1:N          │ N:1
       ▼              │
┌─────────────┐       │
│    users    │       │
├─────────────┤       │
│ id          │───────┘
│ username    │
│ email       │
│ password    │
│ league_id   │───┐
│ is_admin    │   │
└──────┬──────┘   │
       │          │
       │ 1:N      │ 1:N
       ▼          ▼
┌─────────────────────────┐
│      predictions        │
├─────────────────────────┤
│ id                      │
│ user_id (FK → users)    │
│ match_id (FK → matches) │
│ home_score_pred         │
│ away_score_pred         │
│ points_earned           │
│ goal_pts_earned         │
└─────────────────────────┘
       ▲
       │
       │ 1:N
       │
┌─────────────┐
│   matches   │
├─────────────┤
│ id          │
│ match_number│
│ kickoff_utc │
│ home_team   │
│ away_team   │
│ home_score  │
│ away_score  │
│ status      │
└─────────────┘
```

---

## Key Queries

### Global Leaderboard

```sql
SELECT
    u.id,
    u.display_name,
    u.player_team_name,
    l.name AS league_name,
    COALESCE(SUM(p.points_earned), 0) AS total_points,
    COALESCE(SUM(p.goal_pts_earned), 0) AS total_goal_pts,
    COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL) AS scored_matches,
    COUNT(p.id) FILTER (WHERE p.points_earned = 5) AS exact_hits
FROM users u
LEFT JOIN leagues l ON l.id = u.league_id
LEFT JOIN predictions p ON p.user_id = u.id
GROUP BY u.id, u.display_name, u.player_team_name, l.name
ORDER BY total_points DESC, total_goal_pts DESC;
```

### League Leaderboard (Scoped)

```sql
-- Same as above with WHERE u.league_id = $1
```

### User's Predictions

```sql
SELECT
    p.id, m.id, m.match_number, m.home_team, m.away_team, m.kickoff_utc,
    p.home_score_pred, p.away_score_pred, p.points_earned, p.goal_pts_earned
FROM predictions p
JOIN matches m ON m.id = p.match_id
WHERE p.user_id = $1
ORDER BY m.kickoff_utc ASC;
```

### League Join Code Lookup

```sql
SELECT id FROM leagues WHERE join_code = $1;
```

---

## Constraints & Validations

| Constraint | Purpose |
|------------|---------|
| `UNIQUE(user_id, match_id)` on predictions | One prediction per user per match |
| `UNIQUE(join_code)` on leagues | Unique league codes |
| `UNIQUE(username, email)` on users | No duplicate accounts |
| `FOREIGN KEY(user_id)` | Predictions require valid user |
| `FOREIGN KEY(match_id)` | Predictions require valid match |
| `FOREIGN KEY(league_id)` | Users reference valid league |
| `NOT NULL` on required fields | Data integrity |

---

## Time Handling

- **Storage:** All timestamps in `TIMESTAMPTZ` (UTC)
- **Display:** Frontend converts to GMT-6 (Costa Rica time)
- **Deadline:** `kickoff_utc - 15 minutes` (computed server-side)
- **Timezone:** `America/Costa_Rica` (GMT-6, no DST)

---

## Database on Railway

- **Service:** `postgres-ssl:18` (ghcr.io/railwayapp-templates)
- **Volume:** `postgres-volume` (50GB, ~1.1GB used)
- **SSL:** Required for production connections
- **Connection String:** `DATABASE_URL` environment variable
- **Backups:** Automatic (Railway managed)