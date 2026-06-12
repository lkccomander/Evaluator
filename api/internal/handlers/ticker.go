package handlers

import (
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

func teamDisplayName(name, fallback string) string {
	if strings.TrimSpace(name) != "" {
		return name
	}
	return fallback
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
	todayStart := time.Now().In(h.TZ).Truncate(24 * time.Hour)
	todayEnd := todayStart.Add(24 * time.Hour)

	rows, err := h.DB.Query(r.Context(),
		`SELECT id, home_team, away_team, group_name, kickoff_utc, home_score, away_score, status
		 FROM matches
		 WHERE kickoff_utc >= $1 AND kickoff_utc < $2
		 ORDER BY kickoff_utc ASC`,
		todayStart.UTC(), todayEnd.UTC(),
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
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

	if h.Provider != nil && h.Provider.Enabled() {
		apiGames, err := h.Provider.GetGames(r.Context())
		if err == nil {
			apiByES := make(map[string]services.WorldCup26Game)
			for _, g := range apiGames {
				en := teamDisplayName(g.HomeTeamNameEN, g.HomeTeamLabel)
				apiByES[en] = g
			}

			for i, m := range dbMatches {
				for en, es := range enToEs {
					if es == m.HomeTeam {
						if g, ok := apiByES[en]; ok {
							dbMatches[i].HomeScore = scorePtr(g.HomeScore)
							dbMatches[i].AwayScore = scorePtr(g.AwayScore)
							status := tickerStatus(g.Finished, g.TimeElapsed)
							dbMatches[i].Status = status
						}
						break
					}
				}
			}
		}
	}

	entries := make([]tickerEntry, 0, len(dbMatches))
	for _, m := range dbMatches {
		var homeScore, awayScore string
		if m.HomeScore != nil {
			homeScore = formatScore(*m.HomeScore)
		}
		if m.AwayScore != nil {
			awayScore = formatScore(*m.AwayScore)
		}
		entries = append(entries, tickerEntry{
			ID:          m.ID.String(),
			HomeTeam:    m.HomeTeam,
			AwayTeam:    m.AwayTeam,
			Group:       m.GroupName,
			Kickoff:     m.KickoffUTC.Format(time.RFC3339),
			Status:      m.Status,
			TimeElapsed: "",
			HomeScore:   homeScore,
			AwayScore:   awayScore,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Kickoff < entries[j].Kickoff
	})

	respondJSON(w, http.StatusOK, entries)
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
