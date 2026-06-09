# 🏆 Quiniela Mundial 2026 — Progreso

## Stack
**Backend:** Go + Chi + pgx  
**Frontend:** React + Vite + Tailwind v4 + TanStack Query  
**DB:** PostgreSQL  
**Deploy:** Railway (pendiente)

---

## Estado por Fase

| Fase | Descripción | Estado |
|---|---|---|
| 0 | DB schema + seed fixtures | ✅ |
| 1 | Auth (register/login/JWT) | ✅ |
| 2 | Leagues CRUD + join code | ✅ |
| 3 | Match list API + deadline logic | ✅ |
| 4 | Predictions CRUD + league gate | ✅ |
| 5 | Scoring job | ✅ |
| 6 | Leaderboard queries | ✅ |
| 7 | React: Auth + Join League | ✅ |
| 8 | React: Match list + predictions | ✅ |
| 9 | React: Leaderboard | ✅ |
| 10 | React: Admin screens | ✅ |
| 11 | Railway deploy | ⏳ Pendiente |
| 12 | QA + edge cases | ⏳ Pendiente |

---

## Backend (`api/`)

- Servidor Go con Chi router, `:8080`
- JWT access + refresh tokens
- Endpoints REST bajo `/api/v1`
- Scoring automático al ingresar resultado
- Join code: formato `X7K2-MN9P` (sin chars ambiguos)

## Frontend (`web/`)

- Build con Vite (TypeScript)
- 9 páginas: Login, Register, JoinLeague, Matches, MyPredictions, Leaderboard (global/mi liga), AdminLeagues, AdminResults
- Componentes: Layout, MatchCard, LeaderboardTable, Countdown, LeagueBanner
- Auth context con protección de rutas
- TanStack Query con auto-refresh (30-60s)
- Dark theme (#0a0a0a) con acento gold (#F59E0B)
- Proxy Vite → backend en `:8080`

## Scripts SQL

| Archivo | Propósito |
|---|---|
| `001_create_tables.sql` | Schema inicial (leagues, users, matches, predictions) |
| `002_migration_fixes.sql` | Columnas faltantes + refresh_tokens |
| `seed_matches.sql` | Los 72 partidos de grupo |
| `seed_users.sql` | Usuarios de prueba (admin / jugador1) |

## DB Local

- Usuario: `postgres`
- DB: `quiniela2026`
- Puerto: `5432`

## Credenciales de Prueba

| Usuario | Email | Password | Rol |
|---|---|---|---|
| `admin` | admin@quiniela.test | admin123 | Admin |
| `jugador1` | jugador1@quiniela.test | player123 | Player |

Código de liga: `TEST-ABCD`

## Cómo Correr

```bash
# Backend
cd api && .\bin\server.exe

# Frontend (otra terminal)
cd web && npm run dev
```

Frontend en http://localhost:5173, API en http://localhost:8080.

## Próximos Pasos

1. Crear repo git + push
2. Deploy a Railway (Dockerfiles + railway.toml)
3. QA: edge cases, mobile, deadlines
