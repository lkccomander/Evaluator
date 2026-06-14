# Prediction Distribution Charts

## Goal

Show a bar chart per match with the distribution of user predictions
(Local win / Draw / Away win) using Recharts. Visible according to an
admin-controlled setting.

## Design

### DB — settings table

New table for key–value settings:

```sql
CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO settings (key, value)
VALUES ('prediction_chart_visibility', 'locked_only');
```

Values for `prediction_chart_visibility`:

| Value         | Behaviour                                         |
|---------------|---------------------------------------------------|
| `always`      | Chart visible on every match                      |
| `locked_only` | Chart visible only if match is locked or finished |

All settings are returned by `GET /admin/settings` and written via
`PUT /admin/settings` (admin-only, full replace of the JSON body).

### Backend — prediction stats endpoint

`GET /api/v1/matches/{id}/prediction-stats`

```sql
SELECT
  COUNT(*) FILTER (WHERE home_score_pred > away_score_pred) AS local,
  COUNT(*) FILTER (WHERE home_score_pred = away_score_pred) AS empate,
  COUNT(*) FILTER (WHERE home_score_pred < away_score_pred) AS visita
FROM predictions
WHERE match_id = $1
```

**Response** `200 OK`:

```json
{
  "local": 42,
  "empate": 15,
  "visita": 28,
  "total": 85
}
```

No auth required — the data is aggregate and non-sensitive.

The frontend checks the setting + match status before calling this
endpoint. If the match doesn't qualify, the chart is simply not
rendered.

### Frontend — PredictionChart component

Uses `recharts` (`BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`,
`ResponsiveContainer`).

**Props**:

```ts
interface PredictionChartProps {
  local: number
  empate: number
  visita: number
  total: number
  compact?: boolean   // small version for MatchCard
}
```

**Compact variant** (inside MatchCard):
- Smaller bars, no grid lines, minimal axis labels
- Colours: local `#22c55e`, empate `#f59e0b`, visita `#ef4444`

**Full variant** (inside modal):
- Larger bars with grid, tooltips, axis labels
- Same colours

### Frontend — PredictionChartModal

Opened when clicking on the chart area (or an info button) inside a
MatchCard.

- Dark overlay with the full-size chart
- Match details at the top (home team, away team, score, time)
- Close button or click-outside to dismiss

### Frontend — MatchCard integration

Inside `MatchCard.tsx`, show the `PredictionChart` (compact) **below**
the score inputs / result row when the visibility condition is met:

```
if setting == 'always' → always show chart
if setting == 'locked_only' → show chart only when match.locked == true
                              or match.status is 'live' / 'finished'
```

Clicking the chart opens the modal.

### Frontend — Admin setting page

New admin page `/admin/settings` with a toggle switch:

```
Prediction Chart Visibility

  ○ Always visible
  ● Only after lock / during match
```

A `useEffect` reads the current value from `GET /admin/settings`
and writes it back with `PUT /admin/settings` on toggle.

### Data flow

```
Admin toggles setting
  → PUT /admin/settings → DB settings table updated

User visits Matches page
  → GET /matches → list of matches with locked & status fields
  → (if visibility condition met) GET /matches/{id}/prediction-stats
  → renders PredictionChart with response data

User clicks chart
  → PredictionChartModal opens with full-size chart
```

## Files to create / modify

| File | Action |
|---|---|
| `api/db/migrations/007_create_settings.sql` | Create |
| `api/internal/models/models.go` | Add Settings map type |
| `api/internal/handlers/settings.go` | Create (GET/PUT handlers) |
| `api/cmd/server/main.go` | Register routes |
| `api/internal/handlers/matches.go` | Add PredictionStats handler |
| `web/src/components/PredictionChart.tsx` | Create |
| `web/src/components/PredictionChartModal.tsx` | Create |
| `web/src/components/MatchCard.tsx` | Integrate chart |
| `web/src/pages/AdminSettings.tsx` | Create |
| `web/src/App.tsx` | Add route |
| `web/src/api/settings.ts` | Create client |

## Non-goals

- No real-time WebSocket updates; chart data is fetched once on mount
- No rollup / materialised stats table — the query runs against raw
  predictions (small dataset, <100 rows per match)
- No per-user breakdown — only aggregate counts
