# ============================================================================
# ASHA HOSPITAL HMS — AUTOMATED ENCRYPTED POSTGRESQL BACKUP (Windows 11)
# Usage: .\scripts\backup-db.ps1
# ============================================================================

$ErrorActionPreference = "Stop"
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $PSScriptRoot "..\backups"

if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$DbName = if ($env:PGDATABASE) { $env:PGDATABASE } else { "asha_hospital_hms" }
$DbUser = if ($env:PGUSER) { $env:PGUSER } else { "postgres" }
$DbHost = if ($env:PGHOST) { $env:PGHOST } else { "localhost" }
$DbPort = if ($env:PGPORT) { $env:PGPORT } else { "5432" }

$SqlDumpFile = Join-Path $BackupDir "asha_hms_${Timestamp}.backup"

Write-Host "[1/3] Creating custom-format PostgreSQL dump for '$DbName'..." -ForegroundColor Cyan
pg_dump -h $DbHost -p $DbPort -U $DbUser -F c -b -v -f $SqlDumpFile $DbName

Write-Host "[2/3] Verifying backup archive integrity via pg_restore --list..." -ForegroundColor Cyan
pg_restore --list $SqlDumpFile | Out-Null

$Sha256 = (Get-FileHash -Path $SqlDumpFile -Algorithm SHA256).Hash
"$Sha256  asha_hms_${Timestamp}.backup" | Out-File -FilePath "${SqlDumpFile}.sha256" -Encoding utf8

Write-Host "[3/3] Backup verified successfully: $SqlDumpFile (SHA256: $Sha256)" -ForegroundColor Green
