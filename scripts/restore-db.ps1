# ============================================================================
# ASHA HOSPITAL HMS — TESTED POSTGRESQL RESTORATION PROCEDURE (Windows 11)
# Usage: .\scripts\restore-db.ps1 -BackupFile .\backups\asha_hms_YYYYMMDD_HHMMSS.backup
# ============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$TargetDbName = "asha_hospital_hms_restore_test"
)

$ErrorActionPreference = "Stop"
$DbUser = if ($env:PGUSER) { $env:PGUSER } else { "postgres" }
$DbHost = if ($env:PGHOST) { $env:PGHOST } else { "localhost" }
$DbPort = if ($env:PGPORT) { $env:PGPORT } else { "5432" }

if (!(Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
}

Write-Host "[1/3] Inspecting backup manifest..." -ForegroundColor Cyan
pg_restore --list $BackupFile | Select-Object -First 15

Write-Host "[2/3] Ensuring target database '$TargetDbName' exists..." -ForegroundColor Cyan
psql -h $DbHost -p $DbPort -U $DbUser -tc "SELECT 1 FROM pg_database WHERE datname = '$TargetDbName'" | Select-String -Pattern "1" -Quiet | Out-Null
if ($LASTEXITCODE -ne 0) {
    createdb -h $DbHost -p $DbPort -U $DbUser $TargetDbName
}

Write-Host "[3/3] Restoring database with --clean --if-exists..." -ForegroundColor Cyan
pg_restore -h $DbHost -p $DbPort -U $DbUser -d $TargetDbName --clean --if-exists --no-owner $BackupFile

Write-Host "Restoration completed cleanly into '$TargetDbName'." -ForegroundColor Green
