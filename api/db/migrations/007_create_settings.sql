CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

INSERT INTO settings (key, value)
VALUES ('prediction_chart_visibility', 'locked_only')
ON CONFLICT (key) DO NOTHING;
