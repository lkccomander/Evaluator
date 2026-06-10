# IMPORTANTE: no usar $host
$dbHost = "acela.proxy.rlwy.net"
$dbUser = "postgres"
$dbPort = "52958"
$dbName = "railway"

# (opcional) password automático
# $env:PGPASSWORD = "TU_PASSWORD"

Write-Host "➡️ Ejecutando 001_create_tables.sql..." -ForegroundColor Cyan
psql -h $dbHost -U $dbUser -p $dbPort -d $dbName -f "001_create_tables.sql"

Write-Host "➡️ Ejecutando 002_migration_fixes.sql..." -ForegroundColor Cyan
psql -h $dbHost -U $dbUser -p $dbPort -d $dbName -f "002_migration_fixes.sql"

Write-Host "➡️ Ejecutando seed_matches.sql..." -ForegroundColor Cyan
psql -h $dbHost -U $dbUser -p $dbPort -d $dbName -f "seed_matches.sql"

Write-Host "➡️ Ejecutando seed_users.sql..." -ForegroundColor Cyan
psql -h $dbHost -U $dbUser -p $dbPort -d $dbName -f "seed_users.sql"

Write-Host "✅ Base de datos inicializada correctamente" -ForegroundColor Green