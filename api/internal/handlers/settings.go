package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type SettingsHandler struct {
	DB        *pgxpool.Pool
	UploadDir string
}

type CarouselImageInfo struct {
	Filename string `json:"filename"`
	URL      string `json:"url"`
}

var knownCarouselImages = []CarouselImageInfo{
	{Filename: "08df4a44ebe754bf87a83d726eb61e07.webp", URL: "/images/08df4a44ebe754bf87a83d726eb61e07.webp"},
	{Filename: "17814956293738.avif", URL: "/images/17814956293738.avif"},
	{Filename: "C67VEP5MSBKFRJ6WTIUPOOJVCU.avif", URL: "/images/C67VEP5MSBKFRJ6WTIUPOOJVCU.avif"},
	{Filename: "Cote-D-Ivoire-v-Ecuador-Group-E-FIFA-World-Cup-2026.avif", URL: "/images/Cote-D-Ivoire-v-Ecuador-Group-E-FIFA-World-Cup-2026.avif"},
	{Filename: "Netherlands-v-Japan-Group-F-FIFA-World-Cup-2026.avif", URL: "/images/Netherlands-v-Japan-Group-F-FIFA-World-Cup-2026.avif"},
	{Filename: "Sin-titulo-1.avif", URL: "/images/Sin-titulo-1.avif"},
	{Filename: "Sweden-v-Tunisia-Group-F-FIFA-World-Cup-2026.avif", URL: "/images/Sweden-v-Tunisia-Group-F-FIFA-World-Cup-2026.avif"},
	{Filename: "top-fifa-world-cup-2026-players-profile.jpg.webp", URL: "/images/top-fifa-world-cup-2026-players-profile.jpg.webp"},
}

func (h *SettingsHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), "SELECT key, value FROM settings")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		settings[k] = v
	}

	respondJSON(w, http.StatusOK, settings)
}

var publicSettingsKeys = map[string]bool{
	"prediction_chart_visibility": true,
	"show_prediction_names":       true,
	"login_carousel_images":       true,
	"ticker_speed":                true,
}

func (h *SettingsHandler) ListPublic(w http.ResponseWriter, r *http.Request) {
	rows, err := h.DB.Query(r.Context(), "SELECT key, value FROM settings")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}
	defer rows.Close()

	settings := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		if publicSettingsKeys[k] {
			settings[k] = v
		}
	}

	respondJSON(w, http.StatusOK, settings)
}

type updateSettingsRequest struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func (h *SettingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req updateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Key == "" {
		respondError(w, http.StatusBadRequest, "key is required")
		return
	}

	_, err := h.DB.Exec(r.Context(),
		`INSERT INTO settings (key, value) VALUES ($1, $2)
		 ON CONFLICT (key) DO UPDATE SET value = $2`,
		req.Key, req.Value,
	)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "database error")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{"key": req.Key, "value": req.Value})
}

func (h *SettingsHandler) ListCarouselImages(w http.ResponseWriter, r *http.Request) {
	var activeJSON string
	err := h.DB.QueryRow(r.Context(), "SELECT value FROM settings WHERE key = 'login_carousel_images'").Scan(&activeJSON)
	if err != nil {
		activeJSON = "[]"
	}

	var rawActive []string
	json.Unmarshal([]byte(activeJSON), &rawActive)

	active := make([]string, 0, len(rawActive))
	for _, v := range rawActive {
		if strings.HasPrefix(v, "/") {
			active = append(active, v)
		} else {
			active = append(active, "/images/"+v)
		}
	}

	available := make([]CarouselImageInfo, len(knownCarouselImages))
	copy(available, knownCarouselImages)

	entries, err := os.ReadDir(h.UploadDir + "/carousel")
	if err == nil {
		for _, e := range entries {
			if !e.IsDir() {
				available = append(available, CarouselImageInfo{
					Filename: e.Name(),
					URL:      "/api/v1/uploads/" + e.Name(),
				})
			}
		}
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"available": available,
		"active":    active,
	})
}

func (h *SettingsHandler) UploadCarouselImage(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 20<<20)

	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "file too large or invalid form")
		return
	}

	file, header, err := r.FormFile("image")
	if err != nil {
		respondError(w, http.StatusBadRequest, "missing image file")
		return
	}
	defer file.Close()

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".avif" && ext != ".webp" {
		respondError(w, http.StatusBadRequest, "unsupported format (jpg, png, avif, webp)")
		return
	}

	uploadPath := h.UploadDir + "/carousel"
	os.MkdirAll(uploadPath, 0755)

	filename := header.Filename
	dst, err := os.Create(filepath.Join(uploadPath, filename))
	if err != nil {
		respondError(w, http.StatusInternalServerError, "failed to save file")
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		respondError(w, http.StatusInternalServerError, "failed to write file")
		return
	}

	img := CarouselImageInfo{
		Filename: filename,
		URL:      "/api/v1/uploads/" + filename,
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"message": "uploaded",
		"image":   img,
	})
}

func (h *SettingsHandler) DeleteCarouselImage(w http.ResponseWriter, r *http.Request) {
	filename := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/carousel-images/")
	if filename == "" || strings.Contains(filename, "/") || strings.Contains(filename, "..") {
		respondError(w, http.StatusBadRequest, "invalid filename")
		return
	}

	path := filepath.Join(h.UploadDir+"/carousel", filename)
	if err := os.Remove(path); err != nil {
		if os.IsNotExist(err) {
			respondError(w, http.StatusNotFound, "file not found")
			return
		}
		respondError(w, http.StatusInternalServerError, "failed to delete")
		return
	}

	var activeJSON string
	err := h.DB.QueryRow(r.Context(), "SELECT value FROM settings WHERE key = 'login_carousel_images'").Scan(&activeJSON)
	if err == nil {
		var active []string
		json.Unmarshal([]byte(activeJSON), &active)
		urlToRemove := "/api/v1/uploads/" + filename
		filtered := make([]string, 0, len(active))
		for _, v := range active {
			if v != urlToRemove && v != filename {
				filtered = append(filtered, v)
			}
		}
		if len(filtered) != len(active) {
			updated, _ := json.Marshal(filtered)
			h.DB.Exec(r.Context(),
				`INSERT INTO settings (key, value) VALUES ('login_carousel_images', $1)
				 ON CONFLICT (key) DO UPDATE SET value = $1`,
				string(updated),
			)
		}
	}

	respondJSON(w, http.StatusOK, map[string]string{"message": fmt.Sprintf("deleted %s", filename)})
}
