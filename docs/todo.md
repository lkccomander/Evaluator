# TODO

## Current Sprint

### High Priority

- [ ] **Fix uncommitted changes**
  - `spec_quiniela_wc2026.md` - Review and commit changes
  - `web/src/components/TeamFlag.tsx` - Review and commit changes

---

## Open Tasks

### Features

- [ ] **Registration lockout** - Prevent new registrations after tournament starts (Jun 11)
- [ ] **Prediction stats page** - Show most predicted scorelines, % per outcome
- [ ] **Admin: revert match result** - Endpoint to reset match and re-score predictions
- [ ] **Push notifications** - Match reminders via web push
- [ ] **Email notifications** - Weekly digest, last chance reminders
- [ ] **WhatsApp bot** - Submit predictions via WhatsApp

### UX Improvements

- [ ] **Onboarding tour** - First-time user guidance
- [ ] **Prediction history view** - Filter by date/match/status
- [ ] **Head-to-head comparison** - Compare predictions with other users
- [ ] **Export predictions** - Download as CSV/PDF
- [ ] **Dark/light theme toggle** - User preference setting
- [ ] **Loading skeletons** - Replace spinners with skeleton screens

### Admin Features

- [ ] **Bulk result entry** - Enter multiple match results at once
- [ ] **User management** - Ban/suspend users, reset passwords
- [ ] **League management** - Delete/rename leagues, transfer ownership
- [ ] **Audit log** - Track admin actions

### Analytics

- [ ] **Admin dashboard** - Active users, predictions submitted, popular scorelines
- [ ] **Engagement metrics** - DAU/MAU, retention tracking
- [ ] **Leaderboard history** - Track rank changes over time

---

## Technical Debt

### Backend

- [ ] **Structured logging** - Replace `fmt.Println` with zerolog/logrus
- [ ] **Input validation** - Centralized validation with go-playground/validator
- [ ] **API rate limiting** - Prevent abuse (golang.org/x/time/rate)
- [ ] **Integration tests** - End-to-end API tests with test database
- [ ] **Error tracking** - Sentry integration
- [ ] **Health check improvements** - Database connectivity check
- [ ] **Graceful shutdown** - Handle SIGINT/SIGTERM properly

### Frontend

- [ ] **Component tests** - React Testing Library for critical components
- [ ] **E2E tests** - Playwright/Cypress for critical user flows
- [ ] **Error boundaries** - Catch and display React errors gracefully
- [ ] **Performance monitoring** - Web Vitals tracking
- [ ] **Accessibility audit** - WCAG 2.1 AA compliance
- [ ] **PWA support** - Offline mode, install prompt

### DevOps

- [ ] **CI/CD pipeline** - GitHub Actions for automated testing
- [ ] **Database connection pooling** - Tune pgx pool config
- [ ] **Caching layer** - Redis for leaderboard queries
- [ ] **API documentation** - OpenAPI/Swagger spec
- [ ] **Monitoring** - Uptime monitoring (UptimeRobot)
- [ ] **Log aggregation** - Centralized logging (Logtail/DataDog)

---

## Bug Backlog

| Bug | Severity | Status |
|-----|----------|--------|
| None reported | - | - |

---

## Known Issues

### Production

None currently known.

### Development

- [ ] Graph knowledge graph needs update after code changes
  - Run: `graphify update .`

---

## Future Enhancements (v2)

### Knockout Stage Support

- [ ] **Schema extension** - Add knockout_round table
- [ ] **Updated scoring** - Separate config for knockout matches
- [ ] **Bracket view** - Visual tournament bracket
- [ ] **Overtime/penalties** - Support for extra time predictions

### Social Features

- [ ] **Share predictions** - Social media sharing buttons
- [ ] **Comment threads** - Match discussion
- [ ] **Friends system** - Follow specific users
- [ ] **Achievements** - Badges for milestones
- [ ] **Private leagues** - Custom rules, invite-only

### Monetization

- [ ] **Premium leagues** - Paid private leagues
- [ ] **Ads** - Non-intrusive banner ads
- [ ] **Sponsorships** - Branded leaderboards

### Internationalization

- [ ] **Multi-language** - Spanish, English, Portuguese
- [ ] **Timezone auto-detection** - Detect user timezone
- [ ] **Currency support** - If monetized

---

## Maintenance Tasks

### Weekly

- [ ] Check Railway logs for errors
- [ ] Review database size and growth
- [ ] Monitor API response times
- [ ] Check for dependency updates

### Monthly

- [ ] Security audit (dependencies, JWT secret rotation)
- [ ] Performance review (slow queries, bundle size)
- [ ] User feedback review
- [ ] Update documentation

### Quarterly

- [ ] Major version updates (Go, Node, React)
- [ ] Feature roadmap review
- [ ] Cost optimization (Railway services)
- [ ] Backup/restore test

---

## Documentation TODO

- [ ] **API changelog** - Track API changes over time
- [ ] **User guide** - How to play, scoring rules explained
- [ ] **Admin guide** - How to manage leagues and enter results
- [ ] **Contributing guide** - How to contribute code
- [ ] **Architecture decision records (ADRs)** - Document key decisions

---

## Testing TODO

### Unit Tests

- [ ] `services/scoring.go` - Test all scoring cases
- [ ] `services/deadline.go` - Test deadline calculations
- [ ] `services/leagues.go` - Test join code generation
- [ ] `handlers/*.go` - Test HTTP handlers

### Integration Tests

- [ ] Auth flow (register → login → refresh)
- [ ] Prediction submission flow
- [ ] League join flow
- [ ] Admin result entry + scoring

### E2E Tests

- [ ] User registration and first prediction
- [ ] Admin creates league and enters result
- [ ] Leaderboard updates after match
- [ ] Token refresh on 401

---

## Performance Goals

| Metric | Target | Current |
|--------|--------|---------|
| API p95 latency | < 200ms | TBD |
| Frontend LCP | < 2.5s | TBD |
| Frontend FID | < 100ms | TBD |
| Database query time | < 50ms | TBD |
| Bundle size | < 500KB | ~400KB |

---

## Dependencies to Update

### Backend (Go)

```bash
cd api
go get -u ./...
go mod tidy
```

### Frontend (Node)

```bash
cd web
npm outdated
npm update
```

---

## Questions to Resolve

| Question | Priority | Decision By |
|----------|----------|-------------|
| Can users register after Jun 11? | High | Before tournament |
| Allow league switching before tournament? | Medium | Before Jun 11 |
| Support knockout stage in v1.2? | Medium | After group stage |
| Add rate limiting in v1.1? | Low | After user growth |

---

## Notes

- Latest commit: `f850da0` ("new update")
- Branch: `main` (up to date with origin)
- Uncommitted changes: `spec_quiniela_wc2026.md`, `web/src/components/TeamFlag.tsx`
- Next milestone: Tournament start (Jun 11, 2026)