package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/quiniela2026/api/internal/auth"
	"github.com/quiniela2026/api/internal/config"
	"github.com/quiniela2026/api/internal/db"
	"github.com/quiniela2026/api/internal/handlers"
	"github.com/quiniela2026/api/internal/middleware"
	"github.com/quiniela2026/api/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()
	log.Println("connected to database")

	authSvc := auth.NewService(cfg.JWTSecret, cfg.JWTExpiry, cfg.RefreshExpiry)
	worldCup26Client := services.NewWorldCup26Client(cfg.WorldCup26BaseURL, cfg.WorldCup26Email, cfg.WorldCup26Password)

	authH := &handlers.AuthHandler{DB: pool, AuthSvc: authSvc}
	leagueH := &handlers.LeagueHandler{DB: pool}
	matchH := &handlers.MatchHandler{DB: pool}
	predH := &handlers.PredictionHandler{DB: pool}
	leaderH := &handlers.LeaderboardHandler{DB: pool}
	userH := &handlers.UserHandler{DB: pool}
	tickerH := &handlers.TickerHandler{Provider: worldCup26Client, TZ: cfg.CostaRicaTZ, DB: pool}
	bannerH := &handlers.BannerHandler{DB: pool}
	settingsH := &handlers.SettingsHandler{DB: pool, UploadDir: cfg.UploadDir}

	r := chi.NewRouter()

	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(chimw.RealIP)
	r.Use(chimw.Timeout(30 * time.Second))
	r.Use(middleware.CORS(cfg.CORSAllowedOrigins))

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/ticker/today", tickerH.Today)
		r.Get("/public/settings", settingsH.ListPublic)

		r.Get("/banner", bannerH.ListMessages)

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(authSvc))
			r.Post("/banner", bannerH.PostMessage)
		})

		r.Route("/auth", func(r chi.Router) {
			r.Post("/register", authH.Register)
			r.Post("/login", authH.Login)
			r.Post("/refresh", authH.Refresh)
		})

		r.Route("/leagues", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(middleware.Auth(authSvc))
				r.Use(middleware.Admin)
				r.Post("/", leagueH.Create)
				r.Get("/", leagueH.List)
				r.Get("/{id}/members", leagueH.GetMembers)
			})

			r.Group(func(r chi.Router) {
				r.Use(middleware.Auth(authSvc))
				r.Post("/join", leagueH.Join)
				r.Get("/mine", leagueH.GetMyLeague)
			})
		})

		r.Route("/matches", func(r chi.Router) {
			r.Get("/", matchH.List)
			r.Get("/{id}", matchH.Get)
			r.Get("/{id}/prediction-stats", matchH.PredictionStats)
			r.Get("/{id}/predictions-list", matchH.PredictionsList)

			r.Group(func(r chi.Router) {
				r.Use(middleware.Auth(authSvc))
				r.Use(middleware.Admin)
				r.Put("/{id}/score", matchH.UpdateLiveScore)
				r.Put("/{id}/result", matchH.EnterResult)
			})
		})

		r.Route("/admin", func(r chi.Router) {
			r.Use(middleware.Auth(authSvc))
			r.Use(middleware.Admin)
			r.Get("/banner-debug", tickerH.BannerDebug)
			r.Get("/settings", settingsH.List)
			r.Put("/settings", settingsH.Update)
			r.Get("/carousel-images", settingsH.ListCarouselImages)
			r.Post("/carousel-images/upload", settingsH.UploadCarouselImage)
			r.Delete("/carousel-images/{filename}", settingsH.DeleteCarouselImage)
			r.Post("/predictions", predH.AdminSetPrediction)
			r.Get("/predictions/{matchId}", predH.AdminListMatchPredictions)
		})

		r.Get("/uploads/*", func(w http.ResponseWriter, r *http.Request) {
			fs := http.StripPrefix("/api/v1/uploads/", http.FileServer(http.Dir(cfg.UploadDir+"/carousel")))
			fs.ServeHTTP(w, r)
		})

		r.Route("/users", func(r chi.Router) {
			r.Use(middleware.Auth(authSvc))
			r.Use(middleware.Admin)
			r.Get("/", userH.List)
			r.Post("/", userH.Create)
			r.Put("/{id}", userH.Update)
			r.Delete("/{id}", userH.Delete)
		})

		r.Route("/predictions", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(middleware.Auth(authSvc))
				r.Get("/my", predH.GetMy)
				r.Post("/", predH.Submit)
				r.Put("/{id}", predH.Update)
			})
		})

		r.Route("/leaderboard", func(r chi.Router) {
			r.Get("/league/{id}", leaderH.ByLeague)
			r.Get("/history", leaderH.History)

			r.Group(func(r chi.Router) {
				r.Use(middleware.Auth(authSvc))
				r.Use(middleware.Admin)
				r.Get("/global", leaderH.Global)
			})

			r.Group(func(r chi.Router) {
				r.Use(middleware.Auth(authSvc))
				r.Get("/mine", leaderH.MyLeague)
				r.Get("/me", leaderH.MyGlobalPosition)
			})
		})

		r.Group(func(r chi.Router) {
			r.Use(middleware.Auth(authSvc))
			r.Get("/me", authH.Me)
			r.Put("/me", authH.UpdateProfile)
		})
	})

	srv := &http.Server{
		Addr:         cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		log.Printf("server starting on %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	<-quit
	log.Println("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("server forced to shutdown: %v", err)
	}

	log.Println("server stopped")
}
