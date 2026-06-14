INSERT INTO settings (key, value)
VALUES ('show_prediction_names', 'false')
ON CONFLICT (key) DO NOTHING;
