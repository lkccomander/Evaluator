INSERT INTO settings (key, value)
VALUES ('ticker_speed', '640')
ON CONFLICT (key) DO NOTHING;
