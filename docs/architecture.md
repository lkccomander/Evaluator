# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Users                                │
│                    (Browser / Mobile)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│                   Railway Platform                          │
│  ┌─────────────────┐              ┌─────────────────────┐  │
│  │   Web Service   │              │     API Service     │  │
│  │  (Nginx + SPA)  │◄─/api/v1────►│   (Go + Chi)        │  │
│  │  Port 80        │              │   Port 8080         │  │
│  └─────────────────┘              └──────┬──────────────┘  │
└───────────────────────────────────────────┼─────────────────┘
                                            │
                                   ┌────────▼────────┐
                                   │   PostgreSQL    │
                                   │   (Railway)     │
                                   └─────────────────┘
```

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Backend** | Go 1.25+ | REST API, business logic, JWT auth |
| **Router** | Chi v5 | Lightweight HTTP router |
| **Database** | PostgreSQL 16+ | Primary data store |
| **DB Driver** | pgx/v5 | Native PostgreSQL driver |
| **Frontend** | React 18 + TypeScript | UI components |
| **Build** | Vite 6 | Fast bundling and dev server |
| **Styling** | TailwindCSS 4 | Utility-first CSS |
| **Data Fetching** | TanStack Query | Caching, auto-refresh |
| **Routing** | React Router DOM 7 | Client-side routing |
| **Hosting** | Railway | Container orchestration |
| **Auth** | JWT (golang-jwt) | Stateless authentication |

---

## Folder Structure

```
quiniela2026/
├── api/                          # Go backend
│   ├── cmd/
│   │   └── server/
│   │       └── main.go           # Entry point, router setup
│   ├── internal/
│   │   ├── auth/
│   │   │   ├── jwt.go            # JWT generation/validation
│   │   │   └── password.go       # Password hashing (bcrypt)
│   │   ├── handlers/
│   │   │   ├── auth.go           # /auth/* endpoints
│   │   │   ├── leagues.go        # /leagues/* endpoints
│   │   │   ├── matches.go        # /matches/* endpoints
│   │   │   ├── predictions.go    # /predictions/* endpoints
│   │   │   ├── leaderboard.go    # /leaderboard/* endpoints
│   │   │   └── helpers.go        # respondJSON, respondError
│   │   ├── middleware/
│   │   │   └── middleware.go     # Auth middleware, admin check
│   │   ├── models/
│   │   │   └── models.go         # DB structs (User, Match, Prediction, etc.)
│   │   ├── services/
│   │   │   ├── scoring.go        # Match scoring logic
│   │   │   ├── leagues.go        # Join code generation
│   │   │   └── deadline.go       # Deadline enforcement (15 min)
│   │   ├── config/
│   │   │   └── config.go         # Environment loading
│   │   └── db/
│   │       └── db.go             # Connection pooling
│   ├── db/
│   │   ├── migrations/
│   │   │   ├── 001_create_tables.sql
│   │   │   └── 002_fix_schema.sql
│   │   └── seeds/
│   │       └── matches.sql       # 72 group-stage fixtures
│   ├── Dockerfile                # Multi-stage build (Go → Alpine)
│   └── go.mod                    # Dependencies
│
├── web/                          # React frontend
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts         # Axios instance, token refresh
│   │   │   ├── auth.ts           # login, register, refresh
│   │   │   ├── leagues.ts        # league CRUD, join
│   │   │   ├── matches.ts        # match list, results
│   │   │   ├── predictions.ts    # submit/edit predictions
│   │   │   └── leaderboard.ts    # global/league rankings
│   │   ├── components/
│   │   │   ├── Layout.tsx        # Nav, hamburger, sticky header
│   │   │   ├── MatchCard.tsx     # Match display + prediction inputs
│   │   │   ├── TeamFlag.tsx      # Country flag SVG rendering
│   │   │   ├── LeagueBanner.tsx  # Join league prompt
│   │   │   ├── LeaderboardTable.tsx
│   │   │   └── Countdown.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx       # Auth context provider
│   │   │   └── useCountdown.ts   # Countdown timer hook
│   │   ├── lib/
│   │   │   └── teamFlags.ts      # Team name → ISO code mapping
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── JoinLeague.tsx
│   │   │   ├── Matches.tsx
│   │   │   ├── MyPredictions.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── AdminLeagues.tsx
│   │   │   └── AdminResults.tsx
│   │   ├── App.tsx               # Route definitions
│   │   ├── main.tsx              # Entry point
│   │   └── index.css             # Tailwind v4 theme
│   ├── vite.config.ts            # Dev proxy, build config
│   ├── Dockerfile                # Node build → Nginx
│   └── nginx.conf                # Production server config
│
├── docs/                         # Documentation
├── graphify-out/                 # Knowledge graph (AST analysis)
├── spec_quiniela_wc2026.md       # Full specification
├── SETUP.md                      # Local development setup
├── AGENTS.md                     # Agent configuration
└── railway.toml                  # Railway deployment config
```

---

## Component Relationships (from Knowledge Graph)

### Backend Communities

**Community 0 - Core HTTP Layer** (27 nodes, cohesion: 0.10)
- `Pool`, `Request`, `ResponseWriter`, `Service`
- Main API infrastructure

**Community 1 - Authentication** (24 nodes, cohesion: 0.09)
- `authToken()`, `useAuth()`, `BASE`, `request()`
- JWT token handling

**Community 4 - Match Handling** (13 nodes, cohesion: 0.17)
- `MatchHandler`, `enterResultRequest`
- Match result entry

**Community 8 - Auth Service** (8 nodes, cohesion: 0.23)
- `Claims`, `CheckPassword()`, `HashPassword()`, `NewService()`
- JWT and password utilities

**Community 9 - Domain Models** (9 nodes, cohesion: 0.44)
- `User`, `League`, `Match`, `Prediction`, `LeaderboardEntry`
- Core data structures

### Frontend Communities

**Community 2 - Dependencies** (30 nodes, cohesion: 0.06)
- `react`, `react-dom`, `react-router-dom`, `tailwindcss`, `@tanstack/react-query`

**Community 3 - Auth Context** (16 nodes, cohesion: 0.11)
- `AuthProvider()`, `AuthState`, `navItems`
- React auth context

**Community 11 - Leaderboard** (4 nodes, cohesion: 0.39)
- `getGlobalLeaderboard()`, `getLeagueLeaderboard()`, `Leaderboard()`

### God Nodes (Most Connected)

1. `respondJSON()` - 21 edges (helper function for JSON responses)
2. `respondError()` - 21 edges (helper function for error responses)
3. `useAuth()` - 18 edges (React hook for auth state)
4. `authToken()` - 16 edges (JWT token retrieval)
5. `GetUserID()` - 11 edges (middleware user extraction)

---

## Data Flow

### Authentication Flow

```
1. User submits credentials → POST /api/v1/auth/login
2. Backend validates → generates JWT access + refresh tokens
3. Frontend stores tokens (localStorage)
4. Subsequent requests include Authorization: Bearer <token>
5. Middleware validates token → extracts user ID
6. On 401, client auto-refreshes using refresh token
```

### Prediction Submission Flow

```
1. User fills prediction form → POST /api/v1/predictions
2. Middleware checks:
   - Valid JWT token
   - User has league_id (league gate)
   - Match not past deadline (kickoff - 15 min)
3. Insert/upsert prediction in DB
4. Return confirmation
```

### Scoring Flow (Admin Result Entry)

```
1. Admin enters result → PUT /api/v1/matches/:id/result
2. Backend updates match.status = 'finished'
3. Scoring job runs:
   - Fetches all predictions for match
   - Compares predicted vs actual outcome
   - Awards points (5/3/0) + goal points
4. Updates prediction.points_earned, goal_pts_earned
5. Leaderboards auto-update
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Go + Chi** | Lightweight, fast, minimal dependencies |
| **pgx over database/sql** | Native PostgreSQL, better UUID/JSONB support |
| **JWT stateless auth** | No session storage, horizontal scalability |
| **Dual token system** | Short-lived access token + long-lived refresh token |
| **League gate middleware** | Single check applies to all prediction routes |
| **Server-side deadline enforcement** | Client time untrusted, always validate on server |
| **Upser (ON CONFLICT)** | Users can edit predictions before deadline |
| **Railway managed PostgreSQL** | Zero ops, automatic backups, SSL |
| **React Query** | Built-in caching, background refresh, loading states |
| **TailwindCSS v4** | Utility-first, responsive by default |
| **Nginx for static** | Production-grade static file serving |

---

## Import Cycles

✅ **None detected** - Clean dependency graph

---

## Cross-Cutting Concerns

### Error Handling
- All handlers use `respondError()` and `respondJSON()` helpers
- Consistent error response format: `{ error: string }`
- PostgreSQL unique violations detected via string matching

### Logging
- Minimal logging in development (fmt.Println)
- Production logging not yet implemented

### Security
- Passwords hashed with bcrypt
- JWT with expiration (access: 15 min, refresh: 7 days)
- CORS configured for production domain
- SQL injection prevented via pgx parameterized queries

### Time Handling
- All times stored in UTC (TIMESTAMPTZ)
- Deadline = kickoff - 15 minutes (computed server-side)
- Frontend displays in GMT-6 (Costa Rica time)