# 🏆 Spec: Quiniela Mundial 2026
**Version:** 1.3  
**Last Updated:** June 9, 2026  
**Stack:** Go · PostgreSQL · React · Railway  

---

## 1. Overview

A web-based World Cup 2026 prediction game (quiniela) where registered users submit scoreline predictions for all 72 group-stage matches. Players belong to a **league** and compete against other players in their league, with a secondary **global leaderboard** across all leagues. Players earn points based on prediction accuracy and are ranked by points + goal points as tiebreaker. The site design follows a dark, minimal, data-forward aesthetic (reference: isaiprofitable.com).

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | **Go** (net/http + Chi router) | REST API, JSON responses |
| Database | **PostgreSQL** | Hosted on Railway |
| Frontend | **React** (Vite + TailwindCSS) | Responsive, mobile-first |
| Auth | **JWT** (access + refresh tokens) | Stateless |
| Hosting | **Railway** | Two services: Go API + React static / Nginx |
| Timezone | **GMT-6 (Costa Rica)** | All deadlines computed server-side in UTC, displayed in CR time |

---

## 3. Scoring Rules

### 3.1 Points per Match

| Result | Points Earned |
|---|---|
| Exact scoreline (e.g., 2-1 predicted and 2-1 final) | **5 pts** |
| Correct outcome only (Win/Draw/Loss direction correct, wrong scores) | **3 pts** |
| Wrong outcome | **0 pts** |

> **Outcome** is defined as: Home Win / Draw / Away Win.  
> Example: User predicts 3-0, final is 2-0 → both are Home Win → **3 pts**.

### 3.2 Goal Points (Tiebreaker Stat)

Goal points are a secondary stat used to break ties on the leaderboard. They are awarded as follows:

**Case 1 — Exact scoreline (5pt play):**
Goal points = total goals scored (home + away).

**Case 2 — One score matches (3pt play, one team's score is correct):**
Goal points = the value of the matching score, minimum 1.
The minimum-1 rule exists to reward a player who correctly predicted a team would score 0.

**Case 3 — Correct outcome but no score matches (3pt play, neither score correct):**
Goal points = 0. No score was correct, no goal points awarded.

**Case 4 — Wrong outcome (0pt play):**
Goal points = 0.

> If two users are tied on total match points, the one with more **goal points** ranks higher.

### 3.3 Full Examples Table

| Final | Prediction | Match Pts | Which score matches | Goal Pts | Reasoning |
|---|---|---|---|---|---|
| 2-1 | 2-1 | **5** | Both (exact) | **3** | Exact: 2+1=3 total goals |
| 4-2 | 4-1 | **3** | Home (4=4) | **4** | Matching score value = 4 |
| 3-0 | 1-0 | **3** | Away (0=0) | **1** | Matching score = 0 → min 1 |
| 4-0 | 2-0 | **3** | Away (0=0) | **1** | Matching score = 0 → min 1 |
| 0-0 | 1-1 | **3** | Neither (draw→draw) | **0** | No score matches |
| 3-3 | 2-2 | **3** | Neither (draw→draw) | **0** | No score matches |
| 2-2 | 2-2 | **5** | Both (exact) | **4** | Exact: 2+2=4 total goals |
| 3-1 | 0-2 | **0** | None | **0** | Wrong outcome |

---

## 4. Leagues

### 4.1 Rules
- Every user must belong to **exactly one league** to submit predictions.
- A user who has registered but not yet joined a league **cannot submit any predictions**.
- Leagues are created exclusively by the **admin**.
- Each league has an **auto-generated join code** (e.g. `X7K2-MN9P`).
- A user can join a league at registration time **or** later from their profile/dashboard.
- Once in a league, a user **cannot switch leagues**.
- All predictions count toward both the **league leaderboard** and the **global leaderboard**.

### 4.2 League Join Flow
```
Option A — At registration:
  User fills: username, email, password, league_code (optional)
  If league_code provided and valid → user.league_id = league.id

Option B — After registration (from profile/dashboard):
  User enters league_code → POST /leagues/join { code }
  If valid and user has no league → user.league_id = league.id
  If user already has a league → 409 "Already in a league"

Prediction gate (server-side, checked on every prediction submission):
  if user.league_id IS NULL → 403 "Join a league before submitting predictions"
```

---

## 5. Submission Rules

- Users may submit or edit predictions **until 15 minutes before kickoff** of each match (server-enforced, not client-enforced).
- After the deadline, the prediction for that match is **locked**.
- A user may still submit predictions for future matches at any time before their respective deadlines.
- If a user has not submitted a prediction for a match by its deadline, no points are awarded for that match.
- **A user must belong to a league to submit any prediction.**

---

## 6. Database Schema

```sql
-- Leagues
CREATE TABLE leagues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  join_code   TEXT NOT NULL UNIQUE,   -- auto-generated, e.g. 'X7K2-MN9P'
  created_by  UUID NOT NULL,          -- admin user id
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  league_id     UUID REFERENCES leagues(id),   -- NULL until joined
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Matches (seeded from fixtures)
CREATE TABLE matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number  INT UNIQUE NOT NULL,
  kickoff_utc   TIMESTAMPTZ NOT NULL,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  group_name    TEXT,           -- e.g. 'A', 'B'
  home_score    INT,            -- NULL until result entered
  away_score    INT,            -- NULL until result entered
  status        TEXT NOT NULL DEFAULT 'upcoming'  -- upcoming | locked | finished
);

-- Predictions
CREATE TABLE predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  match_id        UUID NOT NULL REFERENCES matches(id),
  home_score_pred INT NOT NULL,
  away_score_pred INT NOT NULL,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  points_earned   INT,          -- NULL until match is finished and scored
  goal_pts_earned INT,          -- NULL until match is finished and scored
  UNIQUE(user_id, match_id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_predictions_user    ON predictions(user_id);
CREATE INDEX idx_predictions_match   ON predictions(match_id);
CREATE INDEX idx_matches_kickoff     ON matches(kickoff_utc);
CREATE INDEX idx_users_league        ON users(league_id);
CREATE UNIQUE INDEX idx_leagues_code ON leagues(join_code);
```

**Join code generation (Go):**
```go
// Generates a random 8-char code like "X7K2-MN9P"
// Excludes ambiguous characters: 0, O, 1, I, L
func generateJoinCode() string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    b := make([]byte, 9)
    for i := range b {
        if i == 4 { b[i] = '-'; continue }
        b[i] = chars[rand.Intn(len(chars))]
    }
    return string(b)
}
```

---

## 7. API Endpoints

Base path: `/api/v1`

### Client-Side Prefix Handling
The frontend API client (`web/src/api/client.ts`) automatically appends `/api/v1` to the `VITE_API_URL` base URL at runtime if it is not already present. This means `VITE_API_URL` can be set to either:
- `https://api-production-e252.up.railway.app` (bare) → client adds `/api/v1`
- `https://api-production-e252.up.railway.app/api/v1` (full) → client uses as-is

This was added to fix 404 errors when `VITE_API_URL` was set to the bare service URL without the prefix.

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register. Body: `{username, email, password, league_code?}` |
| POST | `/auth/login` | Public | Login, returns JWT pair |
| POST | `/auth/refresh` | Public | Refresh access token |

### Leagues
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/leagues` | **Admin** | Create league `{name}` → returns `{id, name, join_code}` |
| GET | `/leagues` | **Admin** | List all leagues with member counts |
| GET | `/leagues/:id/members` | **Admin** | List members of a specific league |
| POST | `/leagues/join` | User | Join a league `{code}` — only if not already in one |
| GET | `/leagues/mine` | User | My league info + my rank within it |

### Matches
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/matches` | Public | List all 72 matches with status and result |
| GET | `/matches/:id` | Public | Single match detail |
| PUT | `/matches/:id/result` | **Admin** | Enter final score, triggers scoring job |

### Predictions
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/predictions/my` | User | All my predictions |
| POST | `/predictions` | User | Submit prediction `{match_id, home_score, away_score}` — requires league |
| PUT | `/predictions/:id` | User | Edit prediction (only if before deadline) |

### Leaderboard
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/leaderboard/global` | Public | Global ranking across all leagues |
| GET | `/leaderboard/league/:id` | Public | Ranking scoped to a specific league |
| GET | `/leaderboard/mine` | User | My league leaderboard + my position |
| GET | `/leaderboard/me` | User | My global position + neighbors (±5) |

---

## 8. Business Logic (Go Service Layer)

### 8.1 Deadline Enforcement
```
deadline = match.kickoff_utc - 15 minutes
if now() >= deadline:
    return 403 "Predictions locked for this match"
```
Always computed server-side. Client shows a countdown for UX but is never trusted for enforcement.

### 8.2 League Gate
```
// Applied on every POST /predictions
if user.league_id == NULL:
    return 403 "You must join a league before submitting predictions"
```

### 8.3 Scoring Job
Triggered when admin submits a result via `PUT /matches/:id/result`:

```
for each prediction p where p.match_id = match_id:
    outcome_predicted = sign(p.home_score_pred - p.away_score_pred)
    outcome_actual    = sign(match.home_score - match.away_score)

    if p.home_score_pred == match.home_score AND p.away_score_pred == match.away_score:
        // Case 1: Exact scoreline
        p.points_earned   = 5
        p.goal_pts_earned = match.home_score + match.away_score

    elif outcome_predicted == outcome_actual:
        // Case 2 or 3: Correct outcome — check if any score matches
        p.points_earned = 3
        home_matches = (p.home_score_pred == match.home_score)
        away_matches = (p.away_score_pred == match.away_score)

        if home_matches:
            p.goal_pts_earned = max(1, match.home_score)
        elif away_matches:
            p.goal_pts_earned = max(1, match.away_score)
        else:
            // Correct outcome but neither score matches
            p.goal_pts_earned = 0

    else:
        // Case 4: Wrong outcome
        p.points_earned   = 0
        p.goal_pts_earned = 0

UPDATE match.status → 'finished'
```

### 8.4 Leaderboard Queries

**Global leaderboard:**
```sql
SELECT
    u.id,
    u.display_name,
    l.name                                                        AS league_name,
    COALESCE(SUM(p.points_earned), 0)                            AS total_points,
    COALESCE(SUM(p.goal_pts_earned), 0)                          AS total_goal_pts,
    COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL)       AS scored_matches,
    COUNT(p.id) FILTER (WHERE p.points_earned = 5)               AS exact_hits
FROM users u
LEFT JOIN leagues l      ON l.id = u.league_id
LEFT JOIN predictions p  ON p.user_id = u.id
GROUP BY u.id, u.display_name, l.name
ORDER BY total_points DESC, total_goal_pts DESC;
```

**League leaderboard (scoped):**
```sql
-- Same query with added WHERE:
WHERE u.league_id = $1
```

---

## 9. Frontend Screens

### 9.1 Design Language
- Dark background (`#0a0a0a` or similar)
- Accent color: **Gold / Amber** (`#F59E0B`) for ranks and highlights
- Monospace font for scores/numbers, sans-serif for body
- Card-based layout, subtle borders, no gradients
- Mobile-first, responsive grid

### 9.2 Screen Inventory

| Screen | Route | Auth Required |
|---|---|---|
| Landing / Login | `/` | No |
| Register | `/register` | No |
| Join League | `/join-league` | User (no league yet) |
| Global Leaderboard | `/leaderboard` | No (public) |
| My League Leaderboard | `/leaderboard/my-league` | User |
| My Predictions | `/my-predictions` | User + league |
| Match List (submit/view) | `/matches` | User + league |
| Admin – Manage Leagues | `/admin/leagues` | Admin |
| Admin – Enter Results | `/admin/results` | Admin |

### 9.3 Registration Flow
```
Step 1: username, email, password
Step 2: "Do you have a league code?" (optional field)
        → Provided and valid: user joins league immediately
        → Skipped: user registered, shown banner after login:
          "Enter your league code to start predicting → [Enter Code]"
```

### 9.4 Join League Banner
- Shown on dashboard/matches page whenever `user.league_id == null`
- Prominent, **non-dismissable** — user cannot ignore it
- Inline input field + submit button
- On success: banner disappears, predictions unlock

### 9.5 Global Leaderboard (`/leaderboard`)
- Full-width table: **Rank · Player · League · Pts · Goal Pts · Exact Hits**
- Top 3 highlighted with gold/silver/bronze styling
- League badge/tag visible on each row
- Live auto-refresh every 60 seconds
- Toggle between **Global** and **My League** views

### 9.6 Match List / Predictions (`/matches`)
- Grouped by date, kickoff shown in CR time (GMT-6)
- Each match card shows: teams, group badge, countdown, score inputs, result + points earned
- **"LOCKED"** badge if past deadline
- If user has no league → all inputs disabled, join league banner shown instead

### 9.7 Admin – Manage Leagues (`/admin/leagues`)
- Create league form: name → system generates join code
- Table of all leagues: name, join code, member count, created date
- Click any league → member list with username, points, goal pts

### 9.8 Admin – Enter Results (`/admin/results`)
- Lists all matches past kickoff with no result yet
- Score input per match + "Submit Result" button
- Triggers scoring job immediately on submit

### 9.9 Country Flags
Flags are rendered from local SVG assets (`country-flag-icons` package), no external CDN.

**Implementation:**
- `web/src/lib/teamFlags.ts` — maps each team name (incl. accents) to an ISO 3166-1 alpha-2 code (e.g. `"México" → "MX"`)
- `web/src/components/TeamFlag.tsx` — exports `TeamName` component that renders flag SVG (20px × 20px) + team name in an inline-flex row
- Flags render left of team name by default, right when `align="right"` is passed
- Falls back to text-only gracefully if a team has no flag mapping
- Supports `GB-ENG` (Inglaterra) and `GB-SCT` (Escocia) via the package's sub-region flags

**Coverage:** 48 teams mapped. Bundle impact: ~40KB (SVG flags from the 48 imported country codes).

### 9.10 Mobile GUI (Phase 12)
All mobile improvements are applied globally via Tailwind responsive utilities and CSS:

| Feature | Implementation |
|---|---|
| **Hamburger nav** | `md:hidden` hamburger button toggles a slide-down drawer; desktop links are `hidden md:flex` |
| **Sticky header** | `sticky top-0 z-50 bg-surface/95 backdrop-blur` on nav bar |
| **Safe areas** | `env(safe-area-inset-top)` on nav, `env(safe-area-inset-bottom)` on main |
| **Touch targets** | All interactive elements respect `min-h-[44px]` / `min-w-[44px]` (Apple HIG minimum) |
| **Tap highlight** | `-webkit-tap-highlight-color: transparent` globally |
| **Overscroll** | `overscroll-behavior: none` to prevent pull-to-refresh on non-scrollable areas |
| **Table scroll** | `overflow-x-auto` on LeaderboardTable and AdminLeagues table |
| **AdminResults** | Team names use `truncate` + `flex-1` + `min-w-0` instead of fixed `w-28`, responsive gap |
| **Selection color** | `::selection { background-color: #f59e0b40 }` for gold-tinted text selection |
| **Score inputs** | Bumped from `w-10 h-10` (40px) to `w-12 h-12` (48px) on both MatchCard and AdminResults |

---

## 10. Match Fixtures Seed Data

All 72 group-stage matches. Times stored as UTC (CR GMT-6 → add 6 hours for UTC, e.g. CR 12:00 PM = 18:00 UTC).

> Full seed SQL: `db/seeds/matches.sql` — generated in Phase 0. All 72 matches from the fixture list included with correct UTC kickoff timestamps.

---

## 11. Railway Deployment Architecture

```
Railway Project: humorous-passion (auto-generated, project ID ce130017-cc3b-421f-aaf6-421ea50daf3b)
├── Service: API          (Go binary, PORT=8080, source: lkccomander/Evaluator repo)
│   ├── URL: https://api-production-e252.up.railway.app
│   └── Env: DATABASE_URL, JWT_SECRET
├── Service: WEB          (Vite build via Nginx, source: railway up from local)
│   ├── URL: https://web-production-7f56f.up.railway.app
│   └── Env: VITE_API_URL=https://api-production-e252.up.railway.app
└── Service: Postgres     (Railway managed PostgreSQL, ghcr.io/railwayapp-templates/postgres-ssl:18)
    └── Volume: postgres-volume (50GB, ~1.1GB used)
```

### Quick Deploy Commands (CLI)

The project is not linked by default in the local checkout. Use explicit IDs:

```powershell
# Web
railway up "C:\Projects\quiniela2026\web" -p ce130017-cc3b-421f-aaf6-421ea50daf3b -e 92420b1e-4cec-4fb3-a01f-27620e5d8635 -s 5f3286d9-223f-4c86-b623-d27041bdc178 -y

# API
railway up "C:\Projects\quiniela2026\api" -p ce130017... -e 92420b1e... -s 0120dd20... -y
```

### Deployment Notes
- Separate `Dockerfile` per service
- Go: multi-stage Docker build (builder → alpine)
- React: `npm run build` → `dist/` served via Nginx
- DB migrations run on startup via `golang-migrate`
- All secrets in Railway environment variables (never in repo)
- The original project was mistakenly accessed as `quiniela-wc2026` in early dev notes; the actual Railway project name is `humorous-passion` (auto-assigned at creation by Railway)

---

## 12. Project Folder Structure

```
quiniela-wc2026/
├── api/                        # Go backend
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── auth/               # JWT logic
│   │   ├── handlers/           # HTTP handlers
│   │   │   ├── leagues.go
│   │   │   ├── matches.go
│   │   │   ├── predictions.go
│   │   │   └── leaderboard.go
│   │   ├── models/             # DB structs
│   │   ├── services/
│   │   │   ├── scoring.go      # Scoring job
│   │   │   ├── leagues.go      # Join code generation
│   │   │   └── deadline.go     # Deadline enforcement
│   │   └── db/                 # DB connection + queries
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/matches.sql
│   ├── Dockerfile
│   └── go.mod
│
├── web/                        # React frontend
│   ├── src/
│   │   ├── lib/
│   │   │   └── teamFlags.ts     # Team name → ISO country code mapping (48 teams)
│   │   ├── pages/
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── Matches.tsx
│   │   │   ├── MyPredictions.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── JoinLeague.tsx
│   │   │   ├── AdminLeagues.tsx
│   │   │   └── AdminResults.tsx
│   │   ├── components/
│   │   │   ├── Layout.tsx       # Nav + hamburger menu + sticky header + safe areas
│   │   │   ├── MatchCard.tsx
│   │   │   ├── TeamFlag.tsx     # TeamName component with SVG flags via country-flag-icons
│   │   │   ├── LeaderboardTable.tsx
│   │   │   ├── LeagueBanner.tsx
│   │   │   └── Countdown.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.tsx
│   │   ├── api/                # Typed API client
│   │   │   ├── client.ts       # Axios-based, auto-appends /api/v1, token refresh on 401
│   │   │   ├── auth.ts
│   │   │   ├── leagues.ts
│   │   │   ├── matches.ts
│   │   │   ├── predictions.ts
│   │   │   └── leaderboard.ts
│   │   └── index.css           # Tailwind v4 theme, safe areas, tap highlight, overscroll
│   ├── Dockerfile
│   └── vite.config.ts          # Dev proxy: /api → localhost:8080
│
└── railway.toml
```

---

## 13. Implementation Phases

| Phase | Scope | Deliverable |
|---|---|---|
| 0 | DB schema + seed fixtures | Migrations + `matches.sql` running |
| 1 | Auth (register/login/JWT) | `/auth/*` endpoints, `is_admin` flag |
| 2 | Leagues CRUD + join code | `/leagues` create, `/leagues/join`, league gate middleware |
| 3 | Match list API + deadline logic | `/matches` endpoint, lockout enforced |
| 4 | Predictions CRUD + league gate | Submit/edit with deadline + league guards |
| 5 | Scoring job | Admin result entry triggers scoring |
| 6 | Leaderboard queries | Global + per-league ranked output |
| 7 | React: Auth + Join League flow | Login, register, league banner, join screen |
| 8 | React: Match list + predictions | Match cards, inputs, countdown, locked state |
| 9 | React: Leaderboard (global + league) | Live table, toggle, auto-refresh |
| 10 | React: Admin screens | League management + result entry |
| 11 | Railway deployment | Both services live, env vars configured |
| 12 | QA + mobile + flags | Token refresh on 401, loading/error/empty states, hamburger menu, 44px touch targets, sticky nav, safe areas, country flags on match cards |

---

## 14. Recommendations

1. **Use `pgx` over `database/sql` in Go** — native PostgreSQL driver, better UUID/JSONB support and performance.

2. **Seed all 72 fixtures at migration time** — never manually enter kickoff times. One wrong UTC offset breaks a deadline.

3. **Store all times in UTC; convert to GMT-6 only on the frontend** — use `TIMESTAMPTZ` everywhere in the DB.

4. **Admin auth via `is_admin` boolean on users + middleware check** — simple and sufficient for v1, no separate roles table needed.

5. **Exclude ambiguous characters from join codes** (0/O, 1/I/L) — already done in the `generateJoinCode()` snippet. Users typing codes on mobile will thank you.

6. **League gate as a Go middleware** — wire it once and apply to all prediction routes, rather than checking in each handler.

7. **Non-dismissable league banner is critical UX** — users will be confused if inputs are simply disabled with no explanation.

8. **React Query (TanStack Query)** for data fetching — handles caching, auto-refresh, and loading states cleanly across leaderboard and match list.

---

## 15. Open Questions

| # | Question | Impact |
|---|---|---|
| 1 | Can users register after the tournament starts (Jun 11)? | Registration lockout logic |
| 2 | Can users edit predictions multiple times before deadline, or only once? | PUT vs. upsert |
| 3 | Can a user predict match 72 on day 1, or is there a submission window? | Submission window |
| 4 | Should admin be able to delete or rename a league? | Admin panel scope |
| 5 | Will there be phases beyond group stage (knockouts)? | Schema extensibility |

---

## 16. v2 Backlog

- **Push / email notifications** — "Last chance: Mexico vs Czech Republic starts in 1 hour"
- **Prediction stats page** — most predicted scorelines per match, % picking each outcome
- **Knockout stage** — additional rounds with separate scoring config
- **WhatsApp bot** — submit predictions via WhatsApp message
- **Admin: revert match result** — `PUT /api/v1/matches/{id}/revert` resets scores → `NULL`, status → `'upcoming'`, and clears `points_earned`/`goal_pts_earned` on all predictions for that match. Admin can then re-enter correct result. Idempotent scoring already handles re-processing.

---

*End of Spec v1.2*

### 17. Calendar

> **Note:** All kickoff times below are shown in GMT-6 (Costa Rica time) as displayed in the app. The database stores all times in `TIMESTAMPTZ` (UTC).

# 🏆 Mundial 2026 — Fase de Grupos
🕒 Horario: GMT-6 (Costa Rica)  
📅 Fechas: 11 al 28 de junio 2026  
📌 Total: 72 partidos de fase de grupos

---

## 📅 Jueves 11 de junio
- 07:00 p.m. — México vs. Sudáfrica (Grupo A — Ciudad de México)

---

## 📅 Viernes 12 de junio
- 02:00 a.m. — Corea del Sur vs. Chequia (Grupo A — Guadalajara)
- 07:00 p.m. — Canadá vs. Bosnia y Herzegovina (Grupo B — Toronto)

---

## 📅 Sábado 13 de junio
- 01:00 a.m. — Estados Unidos vs. Paraguay (Grupo D — Los Ángeles)
- 04:00 a.m. — Australia vs. Türkiye (Grupo D — Vancouver)
- 07:00 p.m. — Catar vs. Suiza (Grupo B — San Francisco Bay Area)
- 10:00 p.m. — Brasil vs. Marruecos (Grupo C — Filadelfia)

---

## 📅 Domingo 14 de junio
- 01:00 a.m. — Haití vs. Escocia (Grupo C — Boston)
- 05:00 p.m. — Alemania vs. Curazao (Grupo E — Houston)
- 08:00 p.m. — Países Bajos vs. Japón (Grupo F — Dallas)
- 11:00 p.m. — Costa de Marfil vs. Ecuador (Grupo E — Filadelfia)

---

## 📅 Lunes 15 de junio
- 02:00 a.m. — Suecia vs. Túnez (Grupo F — Monterrey)
- 04:00 p.m. — España vs. Cabo Verde (Grupo H — Atlanta)
- 07:00 p.m. — Bélgica vs. Egipto (Grupo G — Seattle)
- 10:00 p.m. — Arabia Saudita vs. Uruguay (Grupo H — Miami)

---

## 📅 Martes 16 de junio
- 01:00 a.m. — Irán vs. Nueva Zelanda (Grupo G — Los Ángeles)
- 04:00 a.m. — Austria vs. Jordania (Grupo J — San Francisco Bay Area)
- 07:00 p.m. — Francia vs. Senegal (Grupo I — Nueva York/Nueva Jersey)
- 10:00 p.m. — Irak vs. Noruega (Grupo I — Boston)

---

## 📅 Miércoles 17 de junio
- 01:00 a.m. — Argentina vs. Argelia (Grupo J — Kansas City)
- 05:00 p.m. — Portugal vs. RD Congo (Grupo K — Houston)
- 08:00 p.m. — Inglaterra vs. Croacia (Grupo L — Dallas)
- 11:00 p.m. — Ghana vs. Panamá (Grupo L — Toronto)

---

## 📅 Jueves 18 de junio
- 02:00 a.m. — Uzbekistán vs. Colombia (Grupo K — Ciudad de México)
- 04:00 p.m. — Chequia vs. Sudáfrica (Grupo A — Atlanta)
- 07:00 p.m. — Suiza vs. Bosnia y Herzegovina (Grupo B — Los Ángeles)
- 10:00 p.m. — Canadá vs. Catar (Grupo B — Vancouver)

---

## 📅 Viernes 19 de junio
- 01:00 a.m. — México vs. Corea del Sur (Grupo A — Guadalajara)
- 07:00 p.m. — Estados Unidos vs. Australia (Grupo D — Seattle)
- 10:00 p.m. — Escocia vs. Marruecos (Grupo C — Boston)

---

## 📅 Sábado 20 de junio
- 12:30 a.m. — Brasil vs. Haití (Grupo C — Filadelfia)
- 03:00 a.m. — Türkiye vs. Paraguay (Grupo D — San Francisco Bay Area)
- 05:00 p.m. — Países Bajos vs. Suecia (Grupo F — Houston)
- 08:00 p.m. — Alemania vs. Costa de Marfil (Grupo E — Toronto)

---

## 📅 Domingo 21 de junio
- 12:00 a.m. — Ecuador vs. Curazao (Grupo E — Kansas City)
- 04:00 a.m. — Túnez vs. Japón (Grupo F — Monterrey)
- 04:00 p.m. — España vs. Arabia Saudita (Grupo H — Atlanta)
- 07:00 p.m. — Bélgica vs. Irán (Grupo G — Los Ángeles)
- 10:00 p.m. — Uruguay vs. Cabo Verde (Grupo H — Miami)

---

## 📅 Lunes 22 de junio
- 01:00 a.m. — Nueva Zelanda vs. Egipto (Grupo G — Vancouver)
- 05:00 p.m. — Argentina vs. Austria (Grupo J — Dallas)
- 09:00 p.m. — Francia vs. Irak (Grupo I — Filadelfia)

---

## 📅 Martes 23 de junio
- 12:00 a.m. — Noruega vs. Senegal (Grupo I — Nueva York/Nueva Jersey)
- 03:00 a.m. — Jordania vs. Argelia (Grupo J — San Francisco Bay Area)
- 05:00 p.m. — Portugal vs. Uzbekistán (Grupo K — Houston)
- 08:00 p.m. — Inglaterra vs. Ghana (Grupo L — Boston)
- 11:00 p.m. — Panamá vs. Croacia (Grupo L — Toronto)

---

## 📅 Miércoles 24 de junio
- 02:00 a.m. — Colombia vs. RD Congo (Grupo K — Guadalajara)
- 07:00 p.m. — Suiza vs. Canadá (Grupo B — Vancouver)
- 07:00 p.m. — Bosnia y Herzegovina vs. Catar (Grupo B — Seattle)
- 10:00 p.m. — Marruecos vs. Haití (Grupo C — Atlanta)
- 10:00 p.m. — Escocia vs. Brasil (Grupo C — Filadelfia)

---

## 📅 Jueves 25 de junio
- 01:00 a.m. — Chequia vs. México (Grupo A — Ciudad de México)
- 01:00 a.m. — Sudáfrica vs. Corea del Sur (Grupo A — Monterrey)
- 08:00 p.m. — Curazao vs. Costa de Marfil (Grupo E — Filadelfia)
- 08:00 p.m. — Ecuador vs. Alemania (Grupo E — Nueva York/Nueva Jersey)
- 11:00 p.m. — Japón vs. Suecia (Grupo F — Dallas)
- 11:00 p.m. — Túnez vs. Países Bajos (Grupo F — Kansas City)

---

## 📅 Viernes 26 de junio
- 02:00 a.m. — Türkiye vs. Estados Unidos (Grupo D — Los Ángeles)
- 02:00 a.m. — Paraguay vs. Australia (Grupo D — San Francisco Bay Area)
- 07:00 p.m. — Noruega vs. Francia (Grupo I — Boston)
- 07:00 p.m. — Senegal vs. Irak (Grupo I — Toronto)

---

## 📅 Sábado 27 de junio
- 12:00 a.m. — Cabo Verde vs. Arabia Saudita (Grupo H — Houston)
- 12:00 a.m. — Uruguay vs. España (Grupo H — Guadalajara)
- 03:00 a.m. — Egipto vs. Irán (Grupo G — Seattle)
- 03:00 a.m. — Nueva Zelanda vs. Bélgica (Grupo G — Vancouver)
- 09:00 p.m. — Panamá vs. Inglaterra (Grupo L — Nueva York/Nueva Jersey)
- 09:00 p.m. — Croacia vs. Ghana (Grupo L — Filadelfia)
- 11:30 p.m. — Colombia vs. Portugal (Grupo K — Miami)
- 11:30 p.m. — RD Congo vs. Uzbekistán (Grupo K — Atlanta)

---

## 📅 Domingo 28 de junio
- 02:00 a.m. — Argelia vs. Austria (Grupo J — Kansas City)
- 02:00 a.m. — Jordania vs. Argentina (Grupo J — Dallas)