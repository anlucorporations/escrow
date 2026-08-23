#!/usr/bin/env bash
#
# stop.sh — Detiene el servidor web (puerto 3000) y Anvil (puerto 8545).
# Seguro de ejecutar varias veces. Funciona en Linux/macOS/WSL y en Git Bash
# (fallback a PowerShell en Windows cuando lsof no lista los sockets).
#
set -u

is_windows() {
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
    *) return 1 ;;
  esac
}

kill_port() {
  local port="$1"
  local pids

  # Intento 1: lsof
  pids="$(lsof -ti:"$port" 2>/dev/null || true)"

  # Intento 2 (Windows/Git Bash): PowerShell
  if [ -z "$pids" ] && is_windows && command -v powershell.exe >/dev/null 2>&1; then
    pids="$(powershell.exe -NoProfile -Command \
      "Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique" \
      2>/dev/null | tr -d '\r' || true)"
  fi

  if [ -z "$pids" ]; then
    echo "  Puerto $port: sin procesos"
    return
  fi

  # En Windows (Git Bash), kill de msys no puede terminar procesos nativos:
  # usamos Stop-Process de PowerShell.
  if is_windows && command -v powershell.exe >/dev/null 2>&1; then
    for pid in $pids; do
      powershell.exe -NoProfile -Command "Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue" >/dev/null 2>&1 || true
    done
  else
    for pid in $pids; do
      kill "$pid" 2>/dev/null || true
    done
    sleep 1
    # Forzar si sigue vivo
    for pid in $pids; do
      if kill -0 "$pid" 2>/dev/null; then
        kill -9 "$pid" 2>/dev/null || true
      fi
    done
  fi
  echo "  Puerto $port: detenido"
}

echo "Deteniendo servicios..."

echo "1) Servidor web (3000)..."
kill_port 3000

echo "2) Anvil (8545)..."
kill_port 8545

echo "✅ Todo detenido. Para volver a arrancar: ./start.sh"
