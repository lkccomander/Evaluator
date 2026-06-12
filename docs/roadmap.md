# Roadmap

## Implementation Phases

| Phase | Scope | Deliverable | Status |
|-------|-------|-------------|--------|
| **0** | DB schema + seed fixtures | Migrations + `matches.sql` running | ✅ Complete |
| **1** | Auth (register/login/JWT) | `/auth/*` endpoints, `is_admin` flag | ✅ Complete |
| **2** | Leagues CRUD + join code | `/leagues` create, `/leagues/join`, league gate middleware | ✅ Complete |
| **3** | Match list API + deadline logic | `/matches` endpoint, lockout enforced | ✅ Complete |
| **4** | Predictions CRUD + league gate | Submit/edit with deadline + league guards | ✅ Complete |
| **5** | Scoring job | Admin result entry triggers scoring | ✅ Complete |
| **6** | Leaderboard queries | Global + per-league ranked output | ✅ Complete |
| **7** | React: Auth + Join League flow | Login, register, league banner, join screen | ✅ Complete |
| **8** | React: Match list + predictions | Match cards, inputs, countdown, locked state | ✅ Complete |
| **9** | React: Leaderboard (global + league) | Live table, toggle, auto-refresh | ✅ Complete |
| **10** | React: Admin screens | League management + result entry | ✅ Complete |
| **11** | Railway deployment | Both services live, env vars configured | ✅ Complete |
| **12** | QA + mobile + flags | Token refresh on 401, loading/error/empty states, hamburger menu, 44px touch targets, sticky nav, safe areas, country flags on match cards | ✅ Complete |

---

## v2 Backlog

### Notifications

- [ ] **Push notifications** - "Last chance: Mexico vs Czech Republic starts in 1 hour"
- [ ] **Email notifications** - Weekly digest, match reminders
- [ ] **WhatsApp bot** - Submit predictions via WhatsApp message

### Enhanced Features

- [ ] **Prediction stats page** - Most predicted scorelines per match, % picking each outcome
- [ ] **Knockout stage** - Additional rounds with separate scoring config
- [ ] **Admin: revert match result** - `PUT /api/v1/matches/{id}/revert` resets scores → `NULL`, status → `'upcoming'`, clears `points_earned`/`goal_pts_earned` on all predictions
- [ ] **Multi-league support** - Allow users to join multiple leagues (requires schema change)
- [ ] **League switching** - Allow users to leave/join new league before tournament starts

### UX Improvements

- [ ] **Onboarding tour** - First-time user guidance
- [ ] **Prediction history** - View past predictions by match/date
- [ ] **Head-to-head** - Compare predictions with specific users
- [ ] **Export predictions** - Download as CSV/PDF
- [ ] **Dark/light theme toggle** - User preference

### Admin Features

- [ ] **Bulk result entry** - Enter multiple match results at once
- [ ] **User management** - Ban/suspend users, reset passwords
- [ ] **League management** - Delete/rename leagues, transfer ownership
- [ ] **Audit log** - Track admin actions (result changes, user bans)

### Analytics

- [ ] **Dashboard** - Active users, predictions submitted, popular scorelines
- [ ] **Engagement metrics** - DAU/MAU, retention, churn
- [ ] **Leaderboard history** - Track rank changes over time

### Technical Debt

- [ ] **Structured logging** - Replace `fmt.Println` with JSON logger (zerolog/logrus)
- [ ] **Error tracking** - Integrate Sentry
- [ ] **API rate limiting** - Prevent abuse
- [ ] **Input validation** - Centralized validation layer (go-playground/validator)
- [ ] **Integration tests** - End-to-end API tests
- [ ] **Frontend tests** - React Testing Library component tests
- [ ] **CI/CD pipeline** - GitHub Actions for automated testing/deployment
- [ ] **Database connection pooling** - Tune pgx pool config for production
- [ ] **Caching layer** - Redis for leaderboard caching
- [ ] **API documentation** - OpenAPI/Swagger spec

### Performance

- [ ] **Bundle optimization** - Code splitting, tree shaking
- [ ] **Image optimization** - Compress SVG flags, lazy load
- [ ] **Database indexing review** - Analyze slow queries
- [ ] **CDN for static assets** - Cloudflare or Railway Edge

---

## Open Questions (from Spec)

| # | Question | Impact | Decision Needed |
|---|----------|--------|-----------------|
| 1 | Can users register after the tournament starts (Jun 11)? | Registration lockout logic | Before Jun 11 |
| 2 | Can users edit predictions multiple times before deadline, or only once? | PUT vs. upsert | Current: Multiple edits allowed |
| 3 | Can a user predict match 72 on day 1, or is there a submission window? | Submission window | Current: All matches open from start |
| 4 | Should admin be able to delete or rename a league? | Admin panel scope | Future enhancement |
| 5 | Will there be phases beyond group stage (knockouts)? | Schema extensibility | v2 feature |

---

## Known Issues

| Issue | Severity | Workaround | Status |
|-------|----------|------------|--------|
| None reported | - | - | - |

---

## Future Considerations

### Scalability

- **Horizontal scaling:** API is stateless, can scale horizontally behind load balancer
- **Database read replicas:** For leaderboard queries under heavy load
- **Connection pooling:** PgBouncer for connection management

### Monetization

- **Premium leagues** - Private leagues with custom rules
- **Ads** - Non-intrusive banner ads
- **Sponsorships** - Branded leaderboards

### Internationalization

- **Multi-language support** - Spanish, English, Portuguese
- **Timezone detection** - Auto-detect user timezone
- **Currency** - If monetized, support multiple currencies

### Social Features

- **Share predictions** - Social media sharing
- **Comment threads** - Match discussion
- **Friends system** - Follow specific users
- **Achievements** - Badges for milestones (first prediction, exact hit, etc.)

---

## Release Schedule

### v1.0 (Current) - Group Stage Only
- ✅ All core features implemented
- ✅ Deployed to Railway
- ✅ Mobile-responsive

### v1.1 (TBD) - Bug Fixes
- [ ] User-reported issues
- [ ] Performance optimizations

### v1.2 (TBD) - Knockout Stage
- [ ] Schema extension for knockout rounds
- [ ] Updated scoring rules (if needed)
- [ ] UI for bracket view

### v2.0 (Future) - Major Enhancements
- [ ] Notifications
- [ ] Stats page
- [ ] Admin improvements
- [ ] Analytics dashboard

---

## Success Metrics

### Technical

- API uptime > 99%
- Page load time < 2s
- Zero data loss

### User Engagement

- Registered users: Target 100+
- Daily active users: 30% of registered
- Predictions per user: > 50 (out of 72 matches)

### Business

- League creation: 5+ leagues
- User retention: 70% return after first prediction