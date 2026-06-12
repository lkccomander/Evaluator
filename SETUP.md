# Local Development Setup — Quiniela WC 2026

## Prerequisites

- **Go** 1.25+
- **Node.js** 22+
- **PostgreSQL** 16+
- **npm** or **bun**

---

## 1. Clone & Install Dependencies

```bash
git clone <repo-url> quiniela2026
cd quiniela2026

# Backend
cd api
go mod download
cd ..

# Frontend
cd web
npm install
cd ..
```

---

## 2. Database Setup

### 2.1 Create the database

```bash
psql -U postgres -c "CREATE DATABASE quiniela2026;"
```

### 2.2 Run migrations

```bash
psql -U postgres -d quiniela2026 -f api/db/migrations/001_create_tables.sql
psql -U postgres -d quiniela2026 -f api/db/migrations/002_fix_schema.sql
```

### 2.3 Seed data

```bash
psql -U postgres -d quiniela2026 -f api/db/seeds/matches.sql
psql -U postgres -d quiniela2026 -f seed_users.sql
```

The seed creates:

| User | Email | Password | Role |
|------|-------|----------|------|
| admin | admin@quiniela.test | admin123 | Admin |
| jugador1 | jugador1@quiniela.test | player123 | Player |

- A league named **"Liga de Prueba"** with code **`TEST-ABCD`**.
- 72 group-stage matches (all `upcoming`).

---

## 3. Environment Variables

Create a `.env` file in the **project root** (`quiniela2026/.env`):

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/quiniela2026?sslmode=disable
JWT_SECRET=quiniela-dev-secret-change-in-prod
PORT=8080
```

The backend reads `../.env` relative to its working directory.

---

## 4. Run the Backend

```bash
cd api
go run ./cmd/server
```

The API starts on `http://localhost:8080`.

Health check: `GET http://localhost:8080/health` → `{"status":"ok"}`

All API routes are under `/api/v1`:

| Method | Path | Auth |
|--------|------|------|
| POST | /api/v1/auth/register | No |
| POST | /api/v1/auth/login | No |
| POST | /api/v1/auth/refresh | No |
| GET | /api/v1/leagues | Admin |
| POST | /api/v1/leagues | Admin |
| POST | /api/v1/leagues/join | User |
| GET | /api/v1/leagues/mine | User |
| GET | /api/v1/matches | No |
| GET | /api/v1/matches/:id | No |
| PUT | /api/v1/matches/:id/result | Admin |
| POST | /api/v1/predictions | User |
| PUT | /api/v1/predictions/:id | User |
| GET | /api/v1/predictions/my | User |
| GET | /api/v1/leaderboard/global | No |
| GET | /api/v1/leaderboard/league/:id | No |
| GET | /api/v1/leaderboard/mine | User |
| GET | /api/v1/leaderboard/me | User |
| GET | /api/v1/me | User |

---

## 5. Run the Frontend

The Vite dev server is configured to proxy `/api` → `http://localhost:8080`, so no `VITE_API_URL` is needed for local dev.

```bash
cd web
npm run dev
```

Open `http://localhost:5173`.

### Pointing to the deployed API (optional)

```powershell
# PowerShell
$env:VITE_API_URL="https://api-production-e252.up.railway.app/api/v1"
npm run dev
```

```bash
# bash
VITE_API_URL=https://api-production-e252.up.railway.app/api/v1 npm run dev
```

---

## 6. Verification

1. Open `http://localhost:5173`
2. Log in as `admin@quiniela.test` / `admin123`
3. You should see the admin panel with matches, leagues, and results management
4. Log out and log in as `jugador1@quiniela.test` / `player123`
5. Join league with code `TEST-ABCD`
6. Submit predictions for matches

---

## 7. Useful Commands

```bash
# Type-check frontend
cd web && npx tsc --noEmit

# Build frontend for production
cd web && npm run build

# Run backend (with hot-reload via air, if installed)
cd api && air
```

---

## 8. Troubleshooting

**Database connection refused**
- Ensure PostgreSQL is running
- Check credentials in `.env`

**Missing `uuid-ossp` extension**
- Run as a superuser: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

**Frontend can't reach API**
- Ensure the backend is running on port 8080
- The Vite proxy handles `/api/*` automatically in dev mode
- For deployed API, set `VITE_API_URL`

**Time zone issues**
- DB stores all times in UTC (TIMESTAMPTZ)
- Displayed in Costa Rica time (America/Costa_Rica, GMT-6)
- Prediction deadline is 15 minutes before kickoff (server-enforced)
