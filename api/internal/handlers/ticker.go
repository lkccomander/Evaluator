package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/quiniela2026/api/internal/services"
)

type TickerHandler struct {
	Provider *services.WorldCup26Client
	TZ       *time.Location
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

func (h *TickerHandler) Today(w http.ResponseWriter, r *http.Request) {
	if h.Provider == nil || !h.Provider.Enabled() {
		respondJSON(w, http.StatusOK, []tickerEntry{})
		return
	}

	games, err := h.Provider.GetGames(r.Context())
	if err != nil {
		respondError(w, http.StatusBadGateway, "failed to fetch provider games")
		return
	}

	today := time.Now().In(h.TZ).Format("01/02/2006")
	entries := make([]tickerEntry, 0)
	for _, game := range games {
		if len(game.LocalDate) < 10 || game.LocalDate[:10] != today {
			continue
		}

		kickoff, err := time.ParseInLocation("01/02/2006 15:04", game.LocalDate, h.TZ)
		if err != nil {
			continue
		}

		entries = append(entries, tickerEntry{
			ID:          game.ID,
			HomeTeam:    teamDisplayName(game.HomeTeamNameEN, game.HomeTeamLabel),
			AwayTeam:    teamDisplayName(game.AwayTeamNameEN, game.AwayTeamLabel),
			Group:       game.Group,
			Kickoff:     kickoff.Format(time.RFC3339),
			Status:      tickerStatus(game.Finished, game.TimeElapsed),
			TimeElapsed: strings.TrimSpace(game.TimeElapsed),
			HomeScore:   game.HomeScore,
			AwayScore:   game.AwayScore,
		})
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Kickoff < entries[j].Kickoff
	})

	respondJSON(w, http.StatusOK, entries)
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
