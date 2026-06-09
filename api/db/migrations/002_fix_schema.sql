-- +goose Up
-- +goose StatementBegin

-- Add missing columns to leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS player_team_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add missing columns to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'group';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP INDEX IF EXISTS idx_refresh_tokens_user;
DROP TABLE IF EXISTS refresh_tokens;

ALTER TABLE matches DROP COLUMN IF EXISTS stage;
ALTER TABLE matches DROP COLUMN IF EXISTS created_at;
ALTER TABLE matches DROP COLUMN IF EXISTS updated_at;

ALTER TABLE users DROP COLUMN IF EXISTS player_team_name;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;

ALTER TABLE leagues DROP COLUMN IF EXISTS updated_at;

-- +goose StatementEnd
