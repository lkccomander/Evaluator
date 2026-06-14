# Next Session — Context & Lessons Learned

## Project
- **Production**: main → auto-deploy (Railway `humorous-passion`)
- **Stage**: stage → auto-deploy (Railway `humorous-passion`, env `STAGE`)
- Workflow: commit → push. Both branches usually merged together.
- Stage env ID: `54e25353-926b-45d1-9f96-78fb6cf4f868`
- Prod env ID: `92420b1e-4cec-4fb3-a01f-27620e5d8635`
- Railway connect: `railway connect postgres` (after switching env with `railway environment <ENV_ID>`)

## Current Features Built
### Prediction Charts (📊Estadisticas)
- Recharts `BarChart` with 3 bars: Local (green `#22c55e`), Empate (yellow `#eab308`), Visita (red `#ef4444`)
- Modal opens from `/matches` or `/results` via "📊Estadisticas" link
- Tooltip: only in full modal (not compact), text color yellow `#eab308`
- Data filtered by `league_id` query param (JOIN users → predictions by league)
- Admin setting `prediction_chart_visibility`: `always` | `locked_only` (default)

### Predictions List (📋Pronosticos)
- Separate modal listing all predictions for a match (filtered by league)
- Only visible when match is `locked` or `status === 'finished'`
- Shows scores only by default. Admin toggle `show_prediction_names` (checkbox, default `false`)
- Backend uses `COALESCE(u.display_name, u.username)` so names always resolve
- Endpoint: `GET /api/v1/matches/{id}/predictions-list?league_id=&show_names=true`

### MatchCard Changes
- Accepts: `leagueId`, `chartVisibility`, `showPredictionNames` props
- Shows 📊Estadisticas link (when chart visible per config) + 📋Pronosticos link (when locked/finished)
- Matches page: only `status !== 'finished'`
- Results page (`/results`): only `status === 'finished'`

### Admin Settings (`/admin/settings`)
- Radio: prediction_chart_visibility (always / locked_only)
- Checkbox: show_prediction_names
- Persisted in `settings` DB table
- Public endpoint (no auth) `/api/v1/public/settings` returns whitelisted keys

### DB Migrations
- `001_create_tables.sql` through `008_show_prediction_names.sql`
- Manually run via `"<SQL>" | railway connect postgres`
- **Settings table** (`007`): `key TEXT PRIMARY KEY, value TEXT`
- Current settings keys: `prediction_chart_visibility` (`locked_only`), `show_prediction_names` (`false`)

## Lessons Learned
1. **Timezone handling**: API `local_date` is MM/DD/YYYY HH:mm in stadium local time. Parse with `time.ParseInLocation(stadiumTZ)` then convert to UTC. Don't use `time.Parse` (assumes UTC).
2. **Ticker date filtering**: `matchInWindow` uses CR timezone (`America/Costa_Rica`). `time.Truncate(24h)` operates in UTC — use `time.Date()` with CR zone instead.
3. **Team names**: DB stores Spanish names, frontend `teamColors` map uses English. Ticker sends English names to frontend.
4. **Recharts Tooltip**: requires `unknown` type params for formatter to avoid TS errors. Tooltip appears even without `<Tooltip/>` component in Recharts — conditionally render it with `{!compact && <Tooltip/>}` to fully disable.
5. **Railway connect**: Use `railway environment <ENV_ID>` to switch, then pipe SQL: `"<SQL>" | railway connect postgres`.
6. **Railway run**: `railway run --service <NAME> <CMD>` starts a new container and can time out (>2min). Prefer `railway connect` for DB tasks.
7. **PowerShell**: `&&` is not supported. Use `; if ($?) { next }` for chaining commands. `2>&1` must go inside the command string, not after PowerShell redirection.
8. **COALESCE for display names**: Always use `COALESCE(u.display_name, u.username)` since `display_name` can be NULL.
9. **MatchCard integration**: MatchCard is reused for both Matches and Results pages. Props control what features are shown.
10. **LF/CRLF warnings**: Git on Windows shows LF→CRLF warnings for new files. These are cosmetic and don't affect functionality.

## Known Issues / TODOs
- **Ticker marquee speed** is done via localStorage + custom events. Works but could be more elegant.
- **Chunk size warning** from recharts (720KB bundle). Could split with dynamic `import()` if needed.
- **Prediction charts endpoint** (`/matches/{id}/prediction-stats`) is public — aggregate data considered non-sensitive.
- **No auth** on stats or predictions-list endpoints — data is filtered by `league_id` but the endpoint itself has no rate limiting.
