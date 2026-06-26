-- +goose Up
-- +goose StatementBegin

ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'group';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS bracket_position INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_home_score INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_away_score INT;

ALTER TABLE predictions ADD COLUMN IF NOT EXISTS pen_home_pred INT;
ALTER TABLE predictions ADD COLUMN IF NOT EXISTS pen_away_pred INT;

CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_matches_stage;

ALTER TABLE predictions DROP COLUMN IF EXISTS pen_away_pred;
ALTER TABLE predictions DROP COLUMN IF EXISTS pen_home_pred;

ALTER TABLE matches DROP COLUMN IF EXISTS penalty_away_score;
ALTER TABLE matches DROP COLUMN IF EXISTS penalty_home_score;
ALTER TABLE matches DROP COLUMN IF EXISTS bracket_position;

-- NOTE: stage column is shared with earlier migrations; do NOT drop it here
-- ALTER TABLE matches DROP COLUMN IF EXISTS stage;

-- +goose StatementEnd
