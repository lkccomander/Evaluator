# Quiniela WC 2026 - Documentation Index

**Project:** World Cup 2026 Prediction Pool  
**Version:** 1.3  
**Last Updated:** June 10, 2026  
**Stack:** Go 1.25+ · PostgreSQL 16+ · React (Vite + TailwindCSS) · Railway

---

## Overview

A web-based World Cup 2026 prediction game where registered users submit scoreline predictions for all 72 group-stage matches. Players belong to leagues and compete against other players, earning points based on prediction accuracy.

### Key Features

- ✅ User registration/login with JWT authentication
- ✅ League creation and join with unique codes
- ✅ Match predictions with deadline enforcement (15 min before kickoff)
- ✅ Scoring system: 5 pts (exact) / 3 pts (correct outcome) + goal points tiebreaker
- ✅ Global and league-specific leaderboards
- ✅ Admin panel for league management and result entry
- ✅ Mobile-responsive design with dark theme

---

## Documentation Structure

| Document | Description |
|----------|-------------|
| [Architecture](architecture.md) | System design, folder structure, component relationships |
| [Database](database.md) | Schema, migrations, indexes, ER diagram |
| [API](./api.md.md) | REST endpoints, request/response formats, authentication |
| [Deployment](deployment.md) | Railway setup, Docker configs, environment variables |
| [Roadmap](roadmap.md) | Implementation phases, v2 backlog |
| [Lessons Learned](lessons-learned.md) | Technical insights and recommendations |
| [TODO](todo.md) | Open tasks and known issues |

---

## Quick Links

- **Main Spec:** [`/spec_quiniela_wc2026.md`](../spec_quiniela_wc2026.md)
- **Setup Guide:** [`/SETUP.md`](../SETUP.md)
- **Knowledge Graph:** [`/graphify-out/GRAPH_REPORT.md`](../graphify-out/GRAPH_REPORT.md)

---

## Project Status

**Current State:** Functional development version with admin and player roles working.

- **Backend:** Go REST API with Chi router, pgx PostgreSQL driver, JWT auth
- **Frontend:** React + TypeScript + Vite + TailwindCSS + React Query
- **Deployment:** Railway (API + Web services + PostgreSQL)
- **Git:** Main branch, latest commit `f850da0`

---

## Test Credentials (Development)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@quiniela.test | admin123 |
| Player | jugador1@quiniela.test | player123 |

**Test League Code:** `TEST-ABCD`

---

## Repository Structure

```
quiniela2026/
├── api/                    # Go backend
│   ├── cmd/server/
│   ├── internal/
│   │   ├── auth/
│   │   ├── handlers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── services/
│   ├── db/migrations/
│   └── Dockerfile
├── web/                    # React frontend
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── pages/
│   └── Dockerfile
├── docs/                   # Documentation
├── graphify-out/           # Knowledge graph
├── spec_quiniela_wc2026.md # Full specification
└── SETUP.md                # Local dev setup
```