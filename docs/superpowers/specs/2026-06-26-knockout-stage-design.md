# Knockout Stage — Design Spec
**Version:** 1.0  
**Date:** June 26, 2026  
**Stack:** Go · PostgreSQL · React · Railway

---

## 1. Overview

Add knockout stage support (Round of 32 → Final) to the existing quiniela. Extends the current `matches` and `predictions` tables with stage tracking and penalty prediction. Separate leaderboard for knockout points only.

---

## 2. Schema Changes

### matches table

```sql
ALTER TABLE matches ADD COLUMN stage TEXT NOT NULL DEFAULT 'group';
  -- Values: 'group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third', 'final'

ALTER TABLE matches ADD COLUMN bracket_position INT;
  -- 1-32 for bracket seeding, NULL for group matches

ALTER TABLE matches ADD COLUMN penalty_home_score INT;
  -- Penalty shootout goals (NULL if no penalties or result decided in 120 min)

ALTER TABLE matches ADD COLUMN penalty_away_score INT;

CREATE INDEX idx_matches_stage ON matches(stage);
```

### predictions table

```sql
ALTER TABLE predictions ADD COLUMN pen_home_pred INT;
ALTER TABLE predictions ADD COLUMN pen_away_pred INT;
  -- Both NULL if user predicts winner in 120 min
  -- Both required (non-NULL) if home_score_pred == away_score_pred (draw prediction)
```

---

## 3. Knockout Scoring

```
outcome_120  = sign(match.home_score - match.away_score)
outcome_pred = sign(pred.home_score_pred - pred.away_score_pred)

CASE 1 — Exact 120-min scoreline (both scores match):
  points_earned   = 5
  goal_pts_earned = match.home_score + match.away_score
  Add penalty bonus if applicable

CASE 2 — Same outcome, but scores differ:
  points_earned   = 3
  goal_pts_earned = matching_score_value OR 0 (same rules as group stage)
  Add penalty bonus if applicable

CASE 3 — Wrong outcome:
  points_earned   = 0
  goal_pts_earned = 0
  No penalty bonus

Penalty bonus (+1):
  Applied when ALL of:
    - User predicted draw at 120 min (home_score_pred == away_score_pred)
    - Match actually went to penalties (penalty_home_score IS NOT NULL)
    - pen_home_pred == penalty_home_score
    - pen_away_pred == penalty_away_score
```

---

## 4. Frontend: Penalty Input Logic

- Penalty inputs (`pen_home_pred`, `pen_away_pred`) render ONLY when `home_score_pred === away_score_pred`
- When user changes scores to a non-draw, penalty inputs hide and values clear
- When user changes scores to a draw, penalty inputs appear
- Frontend validation: if draw predicted, penalty inputs are required
- Backend validation: if draw predicted and penalty fields are NULL → 422

---

## 5. API Changes

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/matches?stage=knockout` | New query param — returns matches where `stage != 'group'` |
| `GET` | `/api/v1/knockout/bracket` | **New** — returns all knockout matches ordered by bracket_position |
| `POST` | `/predictions` | Extended — accepts `pen_home_pred`, `pen_away_pred` |
| `PUT` | `/predictions/:id` | Extended — same new fields |
| `PUT` | `/matches/:id/result` | Extended — admin enters penalty scores |
| `GET` | `/leaderboard/knockout` | **New** — separate knockout-only ranking |

### Knockout Leaderboard Query

```sql
SELECT
    u.id,
    u.display_name,
    l.name AS league_name,
    COALESCE(SUM(p.points_earned), 0) AS total_points,
    COALESCE(SUM(p.goal_pts_earned), 0) AS total_goal_pts,
    COUNT(p.id) FILTER (WHERE p.points_earned IS NOT NULL) AS scored_matches,
    COUNT(p.id) FILTER (WHERE p.points_earned = 5) AS exact_hits
FROM users u
LEFT JOIN leagues l ON l.id = u.league_id
LEFT JOIN predictions p ON p.user_id = u.id
LEFT JOIN matches m ON m.id = p.match_id AND m.stage != 'group'
GROUP BY u.id, u.display_name, l.name
ORDER BY total_points DESC, total_goal_pts DESC;
```

---

## 6. Bracket Seeding (Admin Flow)

1. Group stage ends → 32 teams advance
2. Admin navigates to `/admin/knockout` new page
3. Shows 32 bracket slots (positions 1-32) with dropdown select for team name
4. Admin assigns teams to each slot based on real-world advancement
5. Saves → `UPDATE matches SET home_team = $1, away_team = $2 WHERE bracket_position = $3 AND stage = 'round_of_32'`
6. Teams visible to users → predictions unlock 15 min before first knockout kickoff

---

## 7. Frontend Routes

| Route | Page | Auth |
|-------|------|------|
| `/knockout` | Bracket view — Round of 32 → Final | Public |
| `/knockout/leaderboard` | Knockout-only ranking | Public |
| `/admin/knockout` | Assign teams to bracket slots | Admin |
| `/matches?tab=knockout` | Flat list of all knockout matches | User |

### Navbar Changes

- Add "Eliminatorias" link → `/knockout`
- Add "KO Tabla" link → `/knockout/leaderboard`
- Admin nav: add "Armar Bracket" → `/admin/knockout`

---

## 8. Bracket Visualization

- Tree layout using CSS flexbox/grid (no SVG dependency)
- Round of 32 (left) → Round of 16 → Quarters → Semis → Final (right)
- Each slot shows: team name, score (once entered), match time
- Clicking a slot opens prediction modal or links to match detail
- Current round highlighted with gold accent

---

## 9. Implementation Order

1. DB migration (add columns, index)
2. Backend: extend scoring.go for knockout rules + penalty bonus
3. Backend: new handlers — `GET /knockout/bracket`, `GET /leaderboard/knockout`, `POST /admin/knockout/seed`
4. Backend: extend prediction validation for penalty fields
5. Frontend: bracket page (`/knockout`)
6. Frontend: knockout leaderboard page
7. Frontend: admin bracket seeding page
8. Frontend: penalty inputs on MatchCard
9. Integration testing
10. Seed knockout match schedule with real 2026 WC dates/times
