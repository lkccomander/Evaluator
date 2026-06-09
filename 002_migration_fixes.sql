-- 002_migration_fixes.sql
-- Corrige desfases entre el schema original (001_create_tables.sql) y el código Go
-- +goose Up

-- 1. Agregar columnas faltantes a users
ALTER TABLE users ADD COLUMN IF NOT EXISTS player_team_name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Agregar columnas faltantes a leagues
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Agregar columnas faltantes a matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'group';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Crear tabla refresh_tokens (no existía)
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id),
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- 5. Quitar default vacío de player_team_name (opcional, solo para limpieza)
-- Si quieres que sea obligatorio en INSERT, deja el default; si no, puedes quitarlo:
ALTER TABLE users ALTER COLUMN player_team_name DROP DEFAULT;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS player_team_name;
ALTER TABLE users DROP COLUMN IF EXISTS updated_at;
ALTER TABLE leagues DROP COLUMN IF EXISTS updated_at;
ALTER TABLE matches DROP COLUMN IF EXISTS stage;
ALTER TABLE matches DROP COLUMN IF EXISTS created_at;
ALTER TABLE matches DROP COLUMN IF EXISTS updated_at;
DROP TABLE IF EXISTS refresh_tokens;
