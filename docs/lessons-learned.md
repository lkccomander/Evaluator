# Lessons Learned

## Technical Insights

### Backend (Go)

#### 0. Never use `time.Truncate(24h)` for timezone-aware date boundaries
**Lesson:** `time.Time.Truncate(d)` operates on the **absolute UTC time**, not on the timezone-adjusted time. Using `.In(tz).Truncate(24h)` truncates to midnight UTC, which causes off-by-one errors around midnight in other timezones. Match 2 (`kickoff_utc 02:00 UTC` = 20:00 CR previous day) fell inside the range and match 4 (`01:00 UTC` = 19:00 CR same day) fell outside.

**Fix:** use `time.Date()` to construct midnight boundaries explicitly in the target timezone.

```go
// ❌ Bug: truncates to midnight UTC, not CR
todayStart := time.Now().In(h.TZ).Truncate(24 * time.Hour)

// ✅ Correct: midnight-to-midnight in CR timezone
now := time.Now().In(h.TZ)
todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, h.TZ)
todayEnd := todayStart.AddDate(0, 0, 1)
// Query using .UTC() for DB comparison
rows, err := db.Query(ctx, "SELECT ... WHERE kickoff_utc >= $1 AND kickoff_utc < $2",
    todayStart.UTC(), todayEnd.UTC())
```

---

#### 1. Use `pgx` over `database/sql`
**Lesson:** Native PostgreSQL driver provides better UUID/JSONB support and performance.

```go
// pgx example
err := db.QueryRow(ctx, "SELECT id FROM users WHERE email = $1", email).Scan(&id)
```

**Why:**
- Better performance (fewer allocations)
- Native UUID support
- Rich error types
- Connection pooling built-in

---

#### 2. Seed all 72 fixtures at migration time
**Lesson:** Never manually enter kickoff times. One wrong UTC offset breaks deadlines.

**Implementation:**
```sql
-- api/db/seeds/matches.sql
INSERT INTO matches (match_number, stage, group_name, kickoff_utc, home_team, away_team)
VALUES
  (1, 'group', 'A', '2026-06-12 01:00:00+00', 'México', 'Sudáfrica'),
  ...
```

**Why:**
- Consistency across environments
- No manual data entry errors
- Easy to recreate database

---

#### 3. Store all times in UTC; convert on frontend
**Lesson:** Use `TIMESTAMPTZ` everywhere in the DB.

```go
// Go backend always works in UTC
kickoffUTC := match.KickoffUTC // time.Time in UTC

// Frontend converts to local timezone
const kickoff = new Date(match.kickoff_utc);
const crTime = new Date(kickoff.getTime() - (6 * 60 * 60 * 1000)); // GMT-6
```

**Why:**
- No DST confusion
- Consistent across timezones
- PostgreSQL handles timezone conversion

---

#### 4. Admin auth via `is_admin` boolean + middleware
**Lesson:** Simple and sufficient for v1, no separate roles table needed.

```go
// middleware.go
func AdminOnly(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID, ok := GetUserID(r)
        if !ok {
            respondError(w, http.StatusUnauthorized, "unauthorized")
            return
        }
        
        var isAdmin bool
        err := h.DB.QueryRow(r.Context(), "SELECT is_admin FROM users WHERE id = $1", userID).Scan(&isAdmin)
        if err != nil || !isAdmin {
            respondError(w, http.StatusForbidden, "admin access required")
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

---

#### 5. Exclude ambiguous characters from join codes
**Lesson:** Users typing codes on mobile will thank you.

```go
func generateJoinCode() string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // No 0/O, 1/I, L
    b := make([]byte, 9)
    for i := range b {
        if i == 4 { b[i] = '-'; continue }
        b[i] = chars[rand.Intn(len(chars))]
    }
    return string(b)
}
```

**Result:** Codes like `X7K2-MN9P` instead of `B810-OIL1`

---

#### 6. League gate as middleware
**Lesson:** Wire it once and apply to all prediction routes, rather than checking in each handler.

```go
// predictions.go
func (h *PredictionHandler) Submit(w http.ResponseWriter, r *http.Request) {
    userID, ok := middleware.GetUserID(r)
    if !ok {
        respondError(w, http.StatusUnauthorized, "unauthorized")
        return
    }

    var leagueID *uuid.UUID
    err := h.DB.QueryRow(r.Context(), "SELECT league_id FROM users WHERE id = $1", userID).Scan(&leagueID)
    if err != nil || leagueID == nil {
        respondError(w, http.StatusForbidden, "you must join a league before submitting predictions")
        return
    }
    
    // ... continue with prediction logic
}
```

---

#### 7. Server-side deadline enforcement is critical
**Lesson:** Client countdown is for UX only. Always validate on server.

```go
// services/deadline.go
func IsPastDeadline(kickoffUTC time.Time) bool {
    deadline := kickoffUTC.Add(-15 * time.Minute)
    return time.Now().UTC().After(deadline)
}
```

**Why:**
- Client time can be manipulated
- Clock skew between devices
- Single source of truth

---

#### 8. Upsert for prediction edits
**Lesson:** Use `ON CONFLICT DO UPDATE` for seamless edit flow.

```go
_, err = h.DB.Exec(r.Context(),
    `INSERT INTO predictions (user_id, match_id, home_score_pred, away_score_pred)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, match_id)
     DO UPDATE SET home_score_pred = $3, away_score_pred = $4, updated_at = NOW()`,
    userID, matchID, req.HomeScorePred, req.AwayScorePred,
)
```

**Why:**
- Single query for create/update
- Atomic operation
- No race conditions

---

### Frontend (React)

#### 9. React Query for data fetching
**Lesson:** Handles caching, auto-refresh, and loading states cleanly.

```tsx
// web/src/pages/Leaderboard.tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['leaderboard', 'global'],
  queryFn: () => getGlobalLeaderboard(),
  refetchInterval: 60000, // Auto-refresh every 60s
});
```

**Benefits:**
- Built-in caching
- Background refetch
- Loading/error states
- Deduped requests

---

#### 10. Non-dismissable league banner is critical UX
**Lesson:** Users will be confused if inputs are simply disabled with no explanation.

**Implementation:**
- Show prominent banner when `user.league_id === null`
- Inline input field + submit button
- Banner disappears only after successful league join
- All prediction inputs disabled until league joined

---

#### 11. Token refresh on 401
**Lesson:** Handle auth token expiration gracefully.

```ts
// web/src/api/client.ts
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      const { data } = await axios.post('/api/v1/auth/refresh', { refresh_token: refreshToken });
      localStorage.setItem('access_token', data.access_token);
      error.config.headers.Authorization = `Bearer ${data.access_token}`;
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

#### 12. Country flags from local SVG assets
**Lesson:** No external CDN dependency, better performance.

**Implementation:**
- `web/src/lib/teamFlags.ts` - Team name → ISO code mapping (48 teams)
- `web/src/components/TeamFlag.tsx` - Renders flag SVG via `country-flag-icons` package
- Bundle impact: ~40KB (48 SVG flags)

```tsx
import { getFlagUrl } from 'country-flag-icons';

<TeamName team="México" /> // Renders 🇲🇽 + "México"
```

---

#### 13. Mobile-first responsive design
**Lesson:** Design for mobile first, then desktop.

**Key implementations:**
- Hamburger menu: `md:hidden` button toggles slide-down drawer
- Sticky header: `sticky top-0 z-50 bg-surface/95 backdrop-blur`
- Safe areas: `env(safe-area-inset-top/bottom)` for notched devices
- Touch targets: Minimum 44px × 44px (Apple HIG)
- Table scroll: `overflow-x-auto` on wide tables
- Score inputs: Bumped from 40px to 48px for easier tapping

---

### Deployment (Railway)

#### 14. Separate Dockerfiles per service
**Lesson:** API and Web have different build requirements.

**API:**
- Multi-stage Go build
- Alpine runtime for minimal size
- Static binary (CGO disabled)

**Web:**
- Node build stage
- Nginx runtime for static serving
- envsubst for runtime config

---

#### 15. Environment variable handling
**Lesson:** Frontend needs API URL at build time.

**Solution:**
- Build arg `VITE_API_URL` passed to Docker build
- Client automatically appends `/api/v1` if missing
- Supports both bare URL and full path

```ts
// web/src/api/client.ts
const base = import.meta.env.VITE_API_URL || '';
const apiBase = base.endsWith('/api/v1') ? base : `${base}/api/v1`;
```

---

#### 16. PostgreSQL SSL in production
**Lesson:** Railway requires SSL for database connections.

**Connection strings:**
- Production: `sslmode=require`
- Local dev: `sslmode=disable`

---

#### 17. All secrets in Railway environment variables
**Lesson:** Never commit secrets to repo.

**Stored in Railway:**
- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_API_URL`

**Not in repo:**
- `.env` files
- Hardcoded credentials
- API keys

---

## Design Recommendations

### 18. Dark, minimal, data-forward aesthetic
**Reference:** isaiprofitable.com

**Implementation:**
- Dark background: `#0a0a0a`
- Accent color: Gold/Amber `#F59E0B` for ranks
- Monospace font for scores/numbers
- Card-based layout with subtle borders
- No gradients, flat design

---

### 19. Leaderboard design
**Key features:**
- Top 3 highlighted with gold/silver/bronze
- League badge visible on each row
- Auto-refresh every 60 seconds
- Toggle between Global and My League views
- Mobile: horizontal scroll for wide tables

---

### 20. Match card design
**Elements:**
- Teams with country flags
- Group badge
- Countdown timer
- Score inputs (48px × 48px)
- "LOCKED" badge if past deadline
- Result + points earned (after match finishes)

---

## Common Pitfalls to Avoid

| Pitfall | Solution |
|---------|----------|
| Client-side deadline enforcement | Always validate on server |
| Storing times in local timezone | Use UTC everywhere, convert on display |
| Session-based auth | Use JWT for stateless auth |
| Manual fixture entry | Seed all 72 matches at migration |
| No league gate | Check league_id on every prediction submit |
| Hardcoded API URLs | Use environment variables |
| Committing secrets | Use Railway env vars, never commit .env |
|Ignoring mobile UX | 44px touch targets, hamburger nav, safe areas |

---

## Performance Tips

### Backend
- Use pgx connection pooling
- Index frequently queried columns (user_id, match_id, kickoff_utc)
- Batch insert for bulk operations
- Avoid N+1 queries with JOINs

### Frontend
- React Query caching reduces API calls
- Lazy load non-critical components
- Compress SVG flags (~40KB total)
- Use Tailwind's utility classes (no custom CSS)

### Database
- Use COALESCE for NULL handling in aggregations
- FILTER clause for conditional counts
- Window functions for rankings (ROW_NUMBER)
- Proper indexes on foreign keys

---

## Security Best Practices

- ✅ Passwords hashed with bcrypt
- ✅ JWT with short expiration (15 min access, 7 days refresh)
- ✅ CORS configured for production domain
- ✅ Parameterized queries (no SQL injection)
- ✅ HTTPS-only in production
- ✅ No secrets in repo
- ⚠️ Rate limiting not implemented (future)
- ⚠️ Input validation could be more robust (future)

---

## What Went Well

1. **Clean architecture** - Separation of concerns (handlers, services, models)
2. **Type safety** - TypeScript on frontend, Go on backend
3. **Knowledge graph** - Graphify provides excellent codebase overview
4. **Railway deployment** - Zero-config Docker deployments
5. **React Query** - Simplified data fetching significantly
6. **TailwindCSS** - Rapid UI development, consistent design
7. **Mobile-first** - Responsive from the start, not an afterthought

---

## What Could Be Improved

1. **Logging** - Replace fmt.Println with structured logging (zerolog)
2. **Testing** - Add integration tests for API, component tests for frontend
3. **Error tracking** - Integrate Sentry for production error monitoring
4. **CI/CD** - GitHub Actions for automated testing before deployment
5. **Documentation** - OpenAPI spec for API endpoints
6. **Monitoring** - Uptime monitoring, performance metrics
7. **Rate limiting** - Prevent API abuse
8. **Caching** - Redis for leaderboard queries under load

---

## Final Recommendations

1. **Use `pgx` over `database/sql`** — native PostgreSQL driver, better UUID/JSONB support and performance.

2. **Seed all 72 fixtures at migration time** — never manually enter kickoff times. One wrong UTC offset breaks a deadline.

3. **Store all times in UTC; convert to GMT-6 only on the frontend** — use `TIMESTAMPTZ` everywhere in the DB.

4. **Admin auth via `is_admin` boolean on users + middleware check** — simple and sufficient for v1, no separate roles table needed.

5. **Exclude ambiguous characters from join codes** (0/O, 1/I, L) — already done in the `generateJoinCode()` snippet. Users typing codes on mobile will thank you.

6. **League gate as a Go middleware** — wire it once and apply to all prediction routes, rather than checking in each handler.

7. **Non-dismissable league banner is critical UX** — users will be confused if inputs are simply disabled with no explanation.

8. **React Query (TanStack Query)** for data fetching — handles caching, auto-refresh, and loading states cleanly across leaderboard and match list.

9. **Server-side deadline enforcement is non-negotiable** — client countdown is for UX only.

10. **Mobile-first responsive design from day one** — hamburger menu, 44px touch targets, sticky nav, safe areas.