$ErrorActionPreference = "Stop"

$DATABASE_URL = "postgresql://postgres:FeBQsONHTCMCIYaSSRjncxCkrvkXFGAR@acela.proxy.rlwy.net:17569/railway"

psql $DATABASE_URL -f 001_create_tables.sql
psql $DATABASE_URL -f 002_migration_fixes.sql
psql $DATABASE_URL -f matches.sql
psql $DATABASE_URL -f seed_users.sql