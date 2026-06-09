-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Leagues
CREATE TABLE leagues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  join_code   TEXT NOT NULL UNIQUE,   -- auto-generated, e.g. 'X7K2-MN9P'
  created_by  UUID NOT NULL,          -- admin user id
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Users
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name  TEXT,
  league_id     UUID REFERENCES leagues(id),   -- NULL until joined
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Matches (seeded from fixtures)
CREATE TABLE matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_number  INT UNIQUE NOT NULL,
  kickoff_utc   TIMESTAMPTZ NOT NULL,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  group_name    TEXT,           -- e.g. 'A', 'B'
  home_score    INT,            -- NULL until result entered
  away_score    INT,            -- NULL until result entered
  status        TEXT NOT NULL DEFAULT 'upcoming'  -- upcoming | locked | finished
);

-- Predictions
CREATE TABLE predictions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  match_id        UUID NOT NULL REFERENCES matches(id),
  home_score_pred INT NOT NULL,
  away_score_pred INT NOT NULL,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  points_earned   INT,          -- NULL until match is finished and scored
  goal_pts_earned INT,          -- NULL until match is finished and scored
  UNIQUE(user_id, match_id)
);

-- Indexes
CREATE INDEX idx_predictions_user    ON predictions(user_id);
CREATE INDEX idx_predictions_match   ON predictions(match_id);
CREATE INDEX idx_matches_kickoff     ON matches(kickoff_utc);
CREATE INDEX idx_users_league        ON users(league_id);
CREATE UNIQUE INDEX idx_leagues_code ON leagues(join_code);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS predictions;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS leagues;
DROP EXTENSION IF EXISTS "uuid-ossp";
-- +goose StatementEnd