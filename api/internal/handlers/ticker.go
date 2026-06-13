package handlers

import (
	"context"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/quiniela2026/api/internal/services"
)

type TickerHandler struct {
	Provider *services.WorldCup26Client
	TZ       *time.Location
	DB       *pgxpool.Pool
}

type tickerEntry struct {
	ID          string `json:"id"`
	HomeTeam    string `json:"home_team"`
	AwayTeam    string `json:"away_team"`
	Group       string `json:"group"`
	Kickoff     string `json:"kickoff"`
	Status      string `json:"status"`
	TimeElapsed string `json:"time_elapsed"`
	HomeScore   string `json:"home_score"`
	AwayScore   string `json:"away_score"`
}

type dbMatch struct {
	ID          uuid.UUID
	HomeTeam    string
	AwayTeam    string
	GroupName   string
	KickoffUTC  time.Time
	HomeScore   *int
	AwayScore   *int
	Status      string
}

var enToEs = map[string]string{
	"Mexico":                      "México",
	"South Africa":                "Sudáfrica",
	"South Korea":                 "Corea del Sur",
	"Czech Republic":              "Chequia",
	"Canada":                      "Canadá",
	"Bosnia and Herzegovina":      "Bosnia y Herzegovina",
	"United States":               "Estados Unidos",
	"Paraguay":                    "Paraguay",
	"Haiti":                       "Haití",
	"Scotland":                    "Escocia",
	"Brazil":                      "Brasil",
	"Morocco":                     "Marruecos",
	"Qatar":                       "Catar",
	"Switzerland":                 "Suiza",
	"Australia":                   "Australia",
	"Turkey":                      "Turquía",
	"Ivory Coast":                 "Costa de Marfil",
	"Ecuador":                     "Ecuador",
	"Germany":                     "Alemania",
	"Curaçao":                     "Curazao",
	"Netherlands":                 "Países Bajos",
	"Japan":                       "Japón",
	"Sweden":                      "Suecia",
	"Tunisia":                     "Túnez",
	"Iran":                        "Irán",
	"New Zealand":                 "Nueva Zelanda",
	"Spain":                       "España",
	"Cape Verde":                  "Cabo Verde",
	"Belgium":                     "Bélgica",
	"Egypt":                       "Egipto",
	"Saudi Arabia":                "Arabia Saudita",
	"Uruguay":                     "Uruguay",
	"France":                      "Francia",
	"Senegal":                     "Senegal",
	"Iraq":                        "Irak",
	"Norway":                      "Noruega",
	"Argentina":                   "Argentina",
	"Algeria":                     "Argelia",
	"Austria":                     "Austria",
	"Jordan":                      "Jordania",
	"Portugal":                    "Portugal",
	"Democratic Republic of the Congo": "RD Congo",
	"England":                     "Inglaterra",
	"Croatia":                     "Croacia",
	"Uzbekistan":                  "Uzbekistán",
	"Colombia":                    "Colombia",
	"Ghana":                       "Ghana",
	"Panama":                      "Panamá",
}

var esToEn map[string]string

func init() {
	esToEn = make(map[string]string, len(enToEs))
	for en, es := range enToEs {
		esToEn[es] = en
	}
}

func tickerStatus(finished, elapsed string) string {
	if strings.EqualFold(strings.TrimSpace(finished), "TRUE") {
		return "Finalizado"
	}
	if strings.EqualFold(strings.TrimSpace(elapsed), "notstarted") || strings.TrimSpace(elapsed) == "" {
		return "Programado"
	}
	return "En juego"
}

func (h *TickerHandler) Today(w http.ResponseWriter, r *http.Request) {
	now := time.Now().In(h.TZ)
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, h.TZ)
	todayEnd := todayStart.AddDate(0, 0, 1)

	dbMatches, err := h.queryTodayMatches(r.Context(), todayStart, todayEnd)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	h.mergeAPIScores(r.Context(), dbMatches)

	entries := h.buildTickerEntries(dbMatches)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Kickoff < entries[j].Kickoff
	})

	respondJSON(w, http.StatusOK, entries)
}

func (h *TickerHandler) queryTodayMatches(ctx context.Context, todayStart, todayEnd time.Time) ([]dbMatch, error) {
	rows, err := h.DB.Query(ctx,
		`SELECT id, home_team, away_team, group_name, kickoff_utc, home_score, away_score, status
		 FROM matches
		 WHERE kickoff_utc >= $1 AND kickoff_utc < $2
		 ORDER BY kickoff_utc ASC`,
		todayStart.UTC(), todayEnd.UTC(),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var dbMatches []dbMatch
	for rows.Next() {
		var m dbMatch
		if err := rows.Scan(&m.ID, &m.HomeTeam, &m.AwayTeam, &m.GroupName, &m.KickoffUTC,
			&m.HomeScore, &m.AwayScore, &m.Status); err != nil {
			continue
		}
		dbMatches = append(dbMatches, m)
	}
	return dbMatches, nil
}

func (h *TickerHandler) mergeAPIScores(ctx context.Context, dbMatches []dbMatch) {
	if h.Provider == nil || !h.Provider.Enabled() {
		return
	}
	apiGames, err := h.Provider.GetGames(ctx)
	if err != nil {
		return
	}

	apiByEN := make(map[string]services.WorldCup26Game)
	for _, g := range apiGames {
		apiByEN[g.HomeTeamName()] = g
	}

	for i, m := range dbMatches {
		if g, ok := apiByEN[m.HomeTeam]; ok {
			dbMatches[i].HomeScore = scorePtr(g.HomeScore)
			dbMatches[i].AwayScore = scorePtr(g.AwayScore)
			dbMatches[i].Status = tickerStatus(g.Finished, g.TimeElapsed)
		}
	}
}

func (h *TickerHandler) buildTickerEntries(dbMatches []dbMatch) []tickerEntry {
	entries := make([]tickerEntry, 0, len(dbMatches))
	for _, m := range dbMatches {
		var homeScore, awayScore string
		if m.HomeScore != nil {
			homeScore = formatScore(*m.HomeScore)
		}
		if m.AwayScore != nil {
			awayScore = formatScore(*m.AwayScore)
		}

		homeName := m.HomeTeam
		awayName := m.AwayTeam
		if en, ok := esToEn[homeName]; ok {
			homeName = en
		}
		if en, ok := esToEn[awayName]; ok {
			awayName = en
		}

		entries = append(entries, tickerEntry{
			ID:          m.ID.String(),
			HomeTeam:    homeName,
			AwayTeam:    awayName,
			Group:       m.GroupName,
			Kickoff:     m.KickoffUTC.Format(time.RFC3339),
			Status:      m.Status,
			TimeElapsed: "",
			HomeScore:   homeScore,
			AwayScore:   awayScore,
		})
	}
	return entries
}

func (h *TickerHandler) BannerDebug(w http.ResponseWriter, r *http.Request) {
	now := time.Now().In(h.TZ)
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, h.TZ)
	todayEnd := todayStart.AddDate(0, 0, 1)

	type apiGameEntry struct {
		ID          string `json:"id"`
		HomeTeam    string `json:"home_team"`
		AwayTeam    string `json:"away_team"`
		HomeScore   string `json:"home_score"`
		AwayScore   string `json:"away_score"`
		Finished    string `json:"finished"`
		TimeElapsed string `json:"time_elapsed"`
	}

	var apiRaw []apiGameEntry
	var apiCached []apiGameEntry
	var apiOK bool
	var errMsg string

	if h.Provider != nil && h.Provider.Enabled() {
		games, err := h.Provider.GetGamesFresh(r.Context())
		if err != nil {
			errMsg = err.Error()
		} else {
			apiOK = true
			for _, g := range games {
				home := g.HomeTeamName()
				away := g.AwayTeamName()
				apiRaw = append(apiRaw, apiGameEntry{
					ID:          g.ID,
					HomeTeam:    home,
					AwayTeam:    away,
					HomeScore:   g.HomeScore,
					AwayScore:   g.AwayScore,
					Finished:    g.Finished,
					TimeElapsed: g.TimeElapsed,
				})
			}
		}

		cachedGames, err := h.Provider.GetGames(r.Context())
		if err == nil {
			for _, g := range cachedGames {
				home := g.HomeTeamName()
				away := g.AwayTeamName()
				apiCached = append(apiCached, apiGameEntry{
					ID:          g.ID,
					HomeTeam:    home,
					AwayTeam:    away,
					HomeScore:   g.HomeScore,
					AwayScore:   g.AwayScore,
					Finished:    g.Finished,
					TimeElapsed: g.TimeElapsed,
				})
			}
		}
	}

	dbMatches, err := h.queryTodayMatches(r.Context(), todayStart, todayEnd)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	rawMatches := make([]dbMatch, len(dbMatches))
	copy(rawMatches, dbMatches)

	h.mergeAPIScores(r.Context(), dbMatches)

	type mergeDebugEntry struct {
		ID         string `json:"id"`
		HomeTeamDB string `json:"home_team_db"`
		DBScore    string `json:"db_score"`
		APIFound   bool   `json:"api_found"`
		APIScore   string `json:"api_score"`
		APIStatus  string `json:"api_status"`
	}

	var mergeDebug []mergeDebugEntry
	if h.Provider != nil && h.Provider.Enabled() {
		apiGames, err := h.Provider.GetGames(r.Context())
		if err == nil {
			apiByEN := make(map[string]services.WorldCup26Game)
			for _, g := range apiGames {
				apiByEN[g.HomeTeamName()] = g
			}
			for _, m := range rawMatches {
				entry := mergeDebugEntry{
					ID:         m.ID.String(),
					HomeTeamDB: m.HomeTeam,
					DBScore:    fmt.Sprintf("%d-%d", ptrOrZero(m.HomeScore), ptrOrZero(m.AwayScore)),
				}
				if g, ok := apiByEN[m.HomeTeam]; ok {
					entry.APIFound = true
					entry.APIScore = g.HomeScore + "-" + g.AwayScore
					entry.APIStatus = tickerStatus(g.Finished, g.TimeElapsed)
				}
				mergeDebug = append(mergeDebug, entry)
			}
		}
	}

	tickerEntries := h.buildTickerEntries(dbMatches)
	sort.Slice(tickerEntries, func(i, j int) bool {
		return tickerEntries[i].Kickoff < tickerEntries[j].Kickoff
	})

	respondJSON(w, http.StatusOK, map[string]any{
		"api_raw":        apiRaw,
		"api_cached":     apiCached,
		"api_ok":         apiOK,
		"api_error":      errMsg,
		"merge_debug":    mergeDebug,
		"ticker_entries": tickerEntries,
		"today_cr":       todayStart.Format("2006-01-02"),
	})
}

func ptrOrZero(p *int) int {
	if p == nil {
		return 0
	}
	return *p
}

func scorePtr(s string) *int {
	s = strings.TrimSpace(s)
	if s == "" || s == "null" {
		return nil
	}
	var v int
	if _, err := fmt.Sscanf(s, "%d", &v); err == nil {
		return &v
	}
	return nil
}

func formatScore(v int) string {
	return fmt.Sprintf("%d", v)
}
