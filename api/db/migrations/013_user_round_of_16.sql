-- +goose Up
-- +goose StatementBegin

ALTER TABLE users ADD COLUMN IF NOT EXISTS round_of_16 BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

ALTER TABLE users DROP COLUMN IF EXISTS round_of_16;

-- +goose StatementEnd
