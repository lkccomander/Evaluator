# Deployment

## Railway Architecture

```
Railway Project: humorous-passion (ce130017-cc3b-421f-aaf6-421ea50daf3b)
├── Service: API
│   ├── URL: https://api-production-e252.up.railway.app
│   ├── Port: 8080
│   ├── Source: /api directory
│   └── Env: DATABASE_URL, JWT_SECRET
├── Service: WEB
│   ├── URL: https://web-production-7f56f.up.railway.app
│   ├── Port: 80
│   ├── Source: /web directory
│   └── Env: VITE_API_URL
└── Service: PostgreSQL
    ├── Image: ghcr.io/railwayapp-templates/postgres-ssl:18
    └── Volume: postgres-volume (50GB)
```

---

## Environment Variables

### API Service

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@host:5432/quiniela2026?sslmode=require` |
| `JWT_SECRET` | Secret key for JWT signing | `quiniela-dev-secret-change-in-prod` |
| `PORT` | Server port | `8080` |

### WEB Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | API base URL | `https://api-production-e252.up.railway.app` |
| `VITE_API_URL` (build arg) | Injected at build time for API prefix handling | Same as above |
| `PORT` | Nginx port (via envsubst) | `80` |

### Local Development (.env in project root)

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/quiniela2026?sslmode=disable
JWT_SECRET=quiniela-dev-secret-change-in-prod
PORT=8080
```

---

## Docker Configurations

### API Dockerfile (Multi-stage)

```dockerfile
# syntax=docker/dockerfile:1
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /api ./cmd/server

FROM alpine:3.21
RUN apk --no-cache add ca-certificates tzdata
COPY --from=builder /api /api

EXPOSE 8080
CMD ["/api"]
```

**Notes:**
- CGO disabled for static binary
- Alpine base for minimal image size
- CA certificates for HTTPS requests
- Timezone data for proper time handling

### WEB Dockerfile (Build + Nginx)

```dockerfile
# syntax=docker/dockerfile:1
FROM node:22-alpine AS builder
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD envsubst '${PORT}' < /etc/nginx/conf.d/default.conf > /tmp/default.conf && \
    mv /tmp/default.conf /etc/nginx/conf.d/default.conf && \
    nginx -g "daemon off;"
```

**Notes:**
- Build arg `VITE_API_URL` injected at build time
- Nginx serves static files from Vite build
- Port configurable via environment variable

### Nginx Configuration

```nginx
server {
    listen ${PORT};
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Important:** The deployed web container does not proxy `/api` to the backend. The frontend uses `VITE_API_URL`, and the client auto-appends `/api/v1` when the value does not already include it.

---

## Deployment Commands

### Railway CLI (Explicit IDs)

**Web Service:**
```powershell
railway up "C:\Projects\quiniela2026\web" `
  -p ce130017-cc3b-421f-aaf6-421ea50daf3b `
  -e 92420b1e-4cec-4fb3-a01f-27620e5d8635 `
  -s 5f3286d9-223f-4c86-b623-d27041bdc178 `
  -y
```

**API Service:**
```powershell
railway up "C:\Projects\quiniela2026\api" `
  -p ce130017-cc3b-421f-aaf6-421ea50daf3b `
  -e 92420b1e-4cec-4fb3-a01f-27620e5d8635 `
  -s 0120dd20-150d-4f7d-a9af-51b32022953a `
  -y
```

**Verified live Railway state (2026-06-11):**
- Project: `humorous-passion`
- Project ID: `ce130017-cc3b-421f-aaf6-421ea50daf3b`
- Environment: `production`
- Environment ID: `92420b1e-4cec-4fb3-a01f-27620e5d8635`
- WEB service ID: `5f3286d9-223f-4c86-b623-d27041bdc178`
- API service ID: `0120dd20-150d-4f7d-a9af-51b32022953a`

### Alternative: Railway Dashboard

1. Push code to GitHub
2. Connect Railway to GitHub repo
3. Set root directory (`/api` or `/web`)
4. Configure environment variables
5. Deploy

---

## Database Migrations

Migrations run automatically on API startup via `golang-migrate`.

**Migration Files:**
- `api/db/migrations/001_create_tables.sql` - Initial schema
- `api/db/migrations/002_fix_schema.sql` - Schema corrections

**Manual Migration (Local Dev):**
```bash
psql -U postgres -d quiniela2026 -f api/db/migrations/001_create_tables.sql
psql -U postgres -d quiniela2026 -f api/db/migrations/002_fix_schema.sql
```

**Seed Data:**
```bash
psql -U postgres -d quiniela2026 -f api/db/seeds/matches.sql
```

---

## Production URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Web App** | https://web-production-7f56f.up.railway.app | User interface |
| **API** | https://api-production-e252.up.railway.app | REST backend |
| **Database** | Railway-managed (internal) | PostgreSQL |

---

## Health Check

```http
GET https://api-production-e252.up.railway.app/health
```

**Response:**
```json
{"status": "ok"}
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All migrations tested locally
- [ ] Seed data loaded (72 matches)
- [ ] Environment variables set in Railway
- [ ] `JWT_SECRET` is strong and unique
- [ ] Frontend `VITE_API_URL` points to production API
- [ ] Database SSL mode set to `require`

### Post-Deployment

- [ ] API health check passes
- [ ] Web app loads without errors
- [ ] Login/register works
- [ ] Predictions can be submitted
- [ ] Admin can enter results
- [ ] Leaderboards display correctly
- [ ] Token refresh works (401 → refresh → retry)

---

## Troubleshooting

### API Won't Start

**Symptom:** Container crashes on startup  
**Check:**
1. Railway logs for panic messages
2. `DATABASE_URL` format and SSL mode
3. PostgreSQL service is running
4. Migrations have run successfully

### Web App Shows 404 on Refresh

**Cause:** SPA routing issue  
**Fix:** Ensure Nginx config has `try_files $uri $uri/ /index.html;`

### API 404 Errors from Frontend

**Cause:** Missing `/api/v1` prefix  
**Fix:** Set `VITE_API_URL` to either the bare API URL (`https://api-production-e252.up.railway.app`) or the full prefixed URL (`https://api-production-e252.up.railway.app/api/v1`). The client auto-appends `/api/v1` if it is missing.

### Database Connection Refused

**Cause:** SSL mode incorrect or wrong credentials  
**Fix:**
- Production: `sslmode=require`
- Local: `sslmode=disable`
- Verify `DATABASE_URL` in Railway dashboard

### Token Refresh Fails

**Symptom:** Infinite login loop  
**Check:**
1. Refresh token stored in localStorage
2. `/api/v1/auth/refresh` endpoint accessible
3. Refresh token not expired (7 days)
4. Refresh token not revoked

---

## Cost Estimate (Railway)

| Service | Plan | Estimated Cost |
|---------|------|----------------|
| API | Hobby | ~$5/month |
| Web | Hobby | ~$5/month |
| PostgreSQL | Hobby (2GB included) | ~$5/month |
| **Total** | | **~$15/month** |

Actual cost depends on usage and Railway pricing updates.

---

## Backup & Recovery

### Database Backups

- **Automatic:** Railway daily backups (Hobby plan)
- **Manual:** `pg_dump` via Railway CLI
  ```bash
  railway run --service API -- sh -lc 'pg_dump "$DATABASE_URL"' > backup.sql
  ```

### Restore from Backup

```bash
psql -U postgres -d quiniela2026 -f backup.sql
```

---

## Monitoring

Not implemented in v1. Future enhancements:
- Application logging (structured JSON logs)
- Error tracking (Sentry)
- Uptime monitoring (UptimeRobot)
- Performance metrics (Railway dashboard)
