#!/usr/bin/env bash
#
# start.sh — Inicio completo: Anvil + deploy + web.
#   - Arranca Anvil si no está corriendo (log en anvil.log)
#   - Ejecuta setup.sh si web/.env.local no existe
#   - Instala dependencias web si hace falta
#   - Lanza el servidor web (foreground)
#
set -euo pipefail

RPC_URL="${RPC_URL:-http://localhost:8545}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolución portable de herramientas (Windows: usa el sufijo .exe)
find_tool() {
  local name="$1"
  for cand in "$name.exe" "$name"; do
    if command -v "$cand" >/dev/null 2>&1; then
      printf '%s' "$cand"
      return 0
    fi
  done
  return 1
}
ANVIL="$(find_tool anvil)" || { echo "❌ anvil no encontrado. Instala Foundry: https://getfoundry.sh"; exit 1; }
CURL="$(find_tool curl)" || { echo "❌ curl no encontrado."; exit 1; }

echo "================================================"
echo "  Escrow DApp — start.sh"
echo "================================================"

# 1) Anvil
if "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  echo "✓ Anvil ya está corriendo en $RPC_URL"
else
  echo "Anvil no está corriendo. Arrancándolo en segundo plano..."
  "$ANVIL" > "$ROOT/anvil.log" 2>&1 &
  ANVIL_PID=$!
  echo "  Anvil PID: $ANVIL_PID (log: anvil.log)"
  # Esperar a que el RPC responda (máx. 15 s)
  for _ in $(seq 1 30); do
    if "$CURL" -s -X POST -H 'Content-Type: application/json' \
      --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      "$RPC_URL" >/dev/null 2>&1; then
      echo "✓ Anvil listo"
      break
    fi
    sleep 0.5
  done
fi

# 2) Deploy (solo si no hay configuración previa)
if [ ! -f "$ROOT/web/.env.local" ]; then
  echo "Configuración no encontrada. Ejecutando setup.sh..."
  "$ROOT/setup.sh"
else
  echo "✓ Configuración previa detectada (web/.env.local). Usa ./setup.sh para redesplegar."
fi

# 3) Dependencias web
if [ ! -d "$ROOT/web/node_modules" ]; then
  echo "Instalando dependencias web..."
  (cd "$ROOT/web" && npm install)
else
  echo "✓ Dependencias web presentes"
fi

# 4) Servidor web
echo ""
echo "================================================"
echo "  Escrow DApp is Ready! 🚀"
echo "================================================"
echo ""
echo "  Web App:   http://localhost:3000"
echo "  Anvil RPC: $RPC_URL"
echo "  Presiona Ctrl+C para detener"
echo ""
cd "$ROOT/web"
npm run dev
