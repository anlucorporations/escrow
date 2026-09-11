# start-services.ps1 — Arranca todos los servicios de TrueKeate en VENTANAS SEPARADAS.
#
#   Ventana 1: ANVIL        -> blockchain local (log en vivo)
#   Ventana 2: DESPLIEGUE   -> deploy de contratos + matriz de roles (solo si aplica)
#   Ventana 3: INDEXADOR    -> sincronización on-chain -> PostgreSQL
#   Ventana 4: WEB          -> servidor Next.js (http://localhost:3000)
#
# Uso:
#   .\start-services.ps1               # arranque normal (despliega si Anvil estaba apagado)
#   .\start-services.ps1 -ForceDeploy  # redesplegar contratos aunque Anvil ya corra
#   .\start-services.ps1 -SkipDeploy   # solo levantar servicios, sin tocar contratos
#
param(
    [string]$RpcUrl = "http://127.0.0.1:8545",
    [switch]$SkipDeploy,
    [switch]$ForceDeploy
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$ProbeBody = '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

function Invoke-AnvilRpc {
    # PowerShell no conserva las comillas al pasar args a curl.exe: usamos --data @archivo.
    $tmp = Join-Path $env:TEMP "tk-anvil-probe.json"
    try {
        Set-Content -Path $tmp -Value $ProbeBody -NoNewline -Encoding ascii
        return (& curl.exe -s -m 3 -X POST -H "Content-Type: application/json" --data "@$tmp" $RpcUrl 2>$null)
    } finally {
        Remove-Item $tmp -ErrorAction SilentlyContinue
    }
}

function Get-AnvilBlock {
    try {
        $out = Invoke-AnvilRpc
        $json = $out | Out-String | ConvertFrom-Json
        return $json.result
    } catch { return $null }
}

function Test-Anvil {
    $block = Get-AnvilBlock
    return ($null -ne $block -and $block -ne "")
}

function Find-Tool {
    param([string]$Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

# Abre una ventana nueva de PowerShell con un título y un comando (sin problemas de comillas).
# Con -KeepOpen:$false la ventana se cierra al terminar (útil para tareas one-shot como el deploy).
function Start-ServiceWindow {
    param(
        [string]$Title,
        [string]$Command,
        [string]$WorkingDir,
        [switch]$Wait,
        [switch]$KeepOpen = $true
    )
    $full = "`$Host.UI.RawUI.WindowTitle = '$Title'; Set-Location '$WorkingDir'; $Command"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($full))
    $shell = if (Get-Command pwsh -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
    $launchArgs = @()
    if ($KeepOpen) { $launchArgs += "-NoExit" }
    $launchArgs += @("-NoLogo", "-EncodedCommand", $encoded)
    if ($Wait) {
        return Start-Process -FilePath $shell -ArgumentList $launchArgs -WorkingDirectory $WorkingDir -Wait -PassThru
    }
    return Start-Process -FilePath $shell -ArgumentList $launchArgs -WorkingDirectory $WorkingDir
}

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🚀 TrueKeate — Arranque de servicios en ventanas separadas" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# ------------------------------------------------------------------
# 1) ANVIL (ventana propia)
# ------------------------------------------------------------------
$anvilAlreadyRunning = Test-Anvil
if ($anvilAlreadyRunning) {
    Write-Host "✓ Anvil ya está corriendo en $RpcUrl (bloque $((Get-AnvilBlock)))" -ForegroundColor Green
} else {
    $anvilExe = Find-Tool "anvil"
    if (-not $anvilExe) {
        Write-Host "❌ anvil no encontrado. Instala Foundry: https://getfoundry.sh" -ForegroundColor Red
        exit 1
    }
    Write-Host "▶ Abriendo ventana [TrueKeate - ANVIL]..." -ForegroundColor Yellow
    Start-ServiceWindow -Title "TrueKeate - ANVIL" -Command "& '$anvilExe'" -WorkingDir $Root | Out-Null

    # Esperar a que el RPC responda (máx. 20 s)
    $ready = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Anvil) { $ready = $true; break }
    }
    if (-not $ready) {
        Write-Host "❌ Anvil no respondió en $RpcUrl. Revisa la ventana [TrueKeate - ANVIL]." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Anvil listo (bloque actual: $((Get-AnvilBlock)))" -ForegroundColor Green
}

# ------------------------------------------------------------------
# 2) DESPLIEGUE (ventana propia, solo si hace falta)
# ------------------------------------------------------------------
$shouldDeploy = $false
if (-not $SkipDeploy) {
    if ($ForceDeploy) {
        $shouldDeploy = $true
    } elseif (-not $anvilAlreadyRunning) {
        # Anvil recién arrancado (cadena nueva): los contratos anteriores ya no existen.
        $shouldDeploy = $true
    }
}

if ($shouldDeploy) {
    Write-Host "▶ Abriendo ventana [TrueKeate - DESPLIEGUE] (contratos + matriz de roles)..." -ForegroundColor Yellow
    $deployScript = Join-Path $Root "deploy-local.ps1"
    $proc = Start-ServiceWindow -Title "TrueKeate - DESPLIEGUE" -Command "& '$deployScript'" -WorkingDir $Root -Wait -KeepOpen:$false
    if ($proc.ExitCode -ne 0) {
        Write-Host "❌ El despliegue falló (código $($proc.ExitCode)). Revisa la salida en la ventana de despliegue." -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Contratos desplegados y web/.env.local actualizado" -ForegroundColor Green
} else {
    Write-Host "○ Despliegue omitido (Anvil ya corría y web/.env.local existe). Usa -ForceDeploy para redesplegar." -ForegroundColor DarkGray
}

# ------------------------------------------------------------------
# 3) INDEXADOR (ventana propia)
# ------------------------------------------------------------------
Write-Host "▶ Abriendo ventana [TrueKeate - INDEXADOR]..." -ForegroundColor Yellow
Start-ServiceWindow -Title "TrueKeate - INDEXADOR" -Command "node scripts/indexer.mjs" -WorkingDir (Join-Path $Root "web") | Out-Null

# ------------------------------------------------------------------
# 4) WEB (ventana propia)
# ------------------------------------------------------------------
Write-Host "▶ Abriendo ventana [TrueKeate - WEB]..." -ForegroundColor Yellow
Start-ServiceWindow -Title "TrueKeate - WEB" -Command "npm run dev" -WorkingDir (Join-Path $Root "web") | Out-Null

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  ✅ SERVICIOS ARRANCADOS EN VENTANAS SEPARADAS" -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  🟦 [TrueKeate - ANVIL]       blockchain local ($RpcUrl)"
Write-Host "  🟪 [TrueKeate - INDEXADOR]   eventos on-chain -> PostgreSQL"
Write-Host "  🟩 [TrueKeate - WEB]         http://localhost:3000"
if ($shouldDeploy) { Write-Host "  🟨 [TrueKeate - DESPLIEGUE]  salida del deploy (cerrada al terminar)" }
Write-Host ""
Write-Host "  Para detener todo: .\stop-services.ps1" -ForegroundColor DarkGray
Write-Host "=================================================================" -ForegroundColor Cyan
