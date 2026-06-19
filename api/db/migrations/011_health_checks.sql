-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS health_checks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name     TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'operational',
  response_time_ms INTEGER,
  error_message    TEXT,
  checked_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_svc_checked
  ON health_checks(service_name, checked_at DESC);

CREATE TABLE IF NOT EXISTS health_check_config (
  service_name     TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  check_url        TEXT NOT NULL,
  method           TEXT NOT NULL DEFAULT 'GET',
  expected_status  INTEGER NOT NULL DEFAULT 200,
  interval_sec     INTEGER NOT NULL DEFAULT 60,
  timeout_ms       INTEGER NOT NULL DEFAULT 5000,
  enabled          BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO health_check_config (service_name, display_name, check_url, method, expected_status, interval_sec, timeout_ms)
VALUES
  ('api', 'API', '/api/v1/public/settings', 'GET', 200, 60, 5000),
  ('db',  'Database', '/api/v1/matches', 'GET', 200, 60, 5000)
ON CONFLICT (service_name) DO NOTHING;

-- +goose StatementEnd
