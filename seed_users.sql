-- Seed: usuarios de prueba + liga
-- Contraseñas: admin123 / player123
-- Correr DESPUÉS de 001_create_tables.sql y 002_migration_fixes.sql

BEGIN;

-- 1. Admin user
INSERT INTO users (username, email, password_hash, player_team_name, is_admin)
VALUES ('admin', 'admin@quiniela.test',
        '$2a$10$bA68N/gM.e1rLTn7hu7R1O/XYoCcm2Forx6.nHzb/HcapPuDeXC0y',
        'Admin FC', TRUE);

-- 2. Player user
INSERT INTO users (username, email, password_hash, player_team_name, is_admin)
VALUES ('jugador1', 'jugador1@quiniela.test',
        '$2a$10$NTFk/L78wcvnkcnjZ0YN..9M2/Bx.05.43trt7Zt/xq4vLkIJ7yG6',
        'Los Ticos FC', FALSE);

-- 3. League creada por admin
INSERT INTO leagues (name, join_code, created_by)
VALUES ('Liga de Prueba', 'TEST-ABCD', (SELECT id FROM users WHERE username = 'admin'));

-- 4. Jugador se une a la liga
UPDATE users
SET league_id = (SELECT id FROM leagues WHERE join_code = 'TEST-ABCD')
WHERE username = 'jugador1';

COMMIT;
