package handlers

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type VisualizationHandler struct {
	DB *pgxpool.Pool
}

type GraphNode struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type GraphLink struct {
	Source   string `json:"source"`
	Target   string `json:"target"`
	Local    int    `json:"local"`
	Empate   int    `json:"empate"`
	Visita   int    `json:"visita"`
	Total    int    `json:"total"`
	MatchNum int    `json:"match_number"`
	Stage    string `json:"stage"`
}

type PredictionGraph struct {
	Nodes []GraphNode `json:"nodes"`
	Links []GraphLink `json:"links"`
}

func (h *VisualizationHandler) PredictionGraph(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(),
		`SELECT
			m.match_number, m.stage, m.home_team, m.away_team,
			COALESCE(l.cnt, 0) AS local_preds,
			COALESCE(e.cnt, 0) AS empate_preds,
			COALESCE(v.cnt, 0) AS visita_preds
		FROM matches m
		LEFT JOIN (
			SELECT match_id, COUNT(*) AS cnt FROM predictions WHERE home_score_pred > away_score_pred GROUP BY match_id
		) l ON l.match_id = m.id
		LEFT JOIN (
			SELECT match_id, COUNT(*) AS cnt FROM predictions WHERE home_score_pred = away_score_pred GROUP BY match_id
		) e ON e.match_id = m.id
		LEFT JOIN (
			SELECT match_id, COUNT(*) AS cnt FROM predictions WHERE home_score_pred < away_score_pred GROUP BY match_id
		) v ON v.match_id = m.id
		ORDER BY m.match_number`,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	teamSet := make(map[string]bool)
	var links []GraphLink

	for rows.Next() {
		var mn int
		var stage, home, away string
		var l, e, v int
		if err := rows.Scan(&mn, &stage, &home, &away, &l, &e, &v); err != nil {
			respondError(w, http.StatusInternalServerError, "scan error")
			return
		}
		teamSet[home] = true
		teamSet[away] = true
		links = append(links, GraphLink{
			Source:   home,
			Target:   away,
			Local:    l,
			Empate:   e,
			Visita:   v,
			Total:    l + e + v,
			MatchNum: mn,
			Stage:    stage,
		})
	}

	nodes := make([]GraphNode, 0, len(teamSet))
	for name := range teamSet {
		nodes = append(nodes, GraphNode{ID: name, Name: name})
	}

	respondJSON(w, http.StatusOK, PredictionGraph{Nodes: nodes, Links: links})
}
