# stop-services.ps1 — Detiene todos los servicios de TrueKeate:
#   - Servidor web (puerto 3000)
#   - Anvil (puerto 8545)
#   - Indexador (node scripts/indexer.mjs)
#   - PostgreSQL (opcional: -IncludePostgres; requiere PowerShell como Administrador)
#
# Uso:
#   .\stop-services.ps1                  # web + anvil + indexador
#   .\stop-services.ps1 -IncludePostgres # además detiene el servicio postgresql-x64-18
#
param(
    [switch]$IncludePostgres
)

$ErrorActionPreference = "SilentlyContinue"

function Stop-PortProcess {
    param([int]$Port, [string]$Label)
    $pids = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
    if (-not $pids) {
        Write-Host "  ○ $Label (puerto $Port): sin procesos" -ForegroundColor DarkGray
        return
    }
    foreach ($pid_ in $pids) {
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✓ $Label (puerto $Port): detenido" -ForegroundColor Green
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🛑 TrueKeate — Deteniendo servicios locales" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

Write-Host "1) Servidor web (3000)..."
Stop-PortProcess -Port 3000 -Label "Web"

Write-Host "2) Anvil (8545)..."
Stop-PortProcess -Port 8545 -Label "Anvil"

Write-Host "3) Indexador (node scripts/indexer.mjs)..."
$indexerPids = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like "*indexer.mjs*" } |
    Select-Object -ExpandProperty ProcessId
if ($indexerPids) {
    foreach ($pid_ in $indexerPids) {
        Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  ✓ Indexador: detenido" -ForegroundColor Green
} else {
    Write-Host "  ○ Indexador: sin procesos" -ForegroundColor DarkGray
}

if ($IncludePostgres) {
    Write-Host "4) PostgreSQL (5432)..."
    $svc = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
    if ($svc -and $svc.Status -eq "Running") {
        try {
            Stop-Service -Name "postgresql-x64-18" -Force -ErrorAction Stop
            Write-Host "  ✓ PostgreSQL: detenido" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠ PostgreSQL: requiere permisos de administrador." -ForegroundColor Yellow
            Write-Host "    Ejecuta en PowerShell como Administrador: Stop-Service postgresql-x64-18" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ○ PostgreSQL: ya detenido o no instalado" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "✅ Listo. Para volver a arrancar todo en ventanas separadas: .\start-services.ps1" -ForegroundColor Green
