#!/usr/bin/env bash
#
# verify-setup.sh — Comprueba que el entorno está listo:
#   - Anvil corriendo
#   - web/.env.local presente
#   - Contrato Escrow desplegado y respondiendo (owner, tokens, árbitro)
#
set -euo pipefail

RPC_URL="${RPC_URL:-http://localhost:8545}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT/web/.env.local"

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
CAST="$(find_tool cast)" || { echo "❌ cast no encontrado. Instala Foundry: https://getfoundry.sh"; exit 1; }
CURL="$(find_tool curl)" || { echo "❌ curl no encontrado."; exit 1; }

echo "================================================"
echo "  Escrow DApp — verify-setup.sh"
echo "================================================"

# 1) Anvil
if "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  echo "✓ Anvil corriendo en $RPC_URL"
else
  echo "✗ Anvil NO está corriendo en $RPC_URL"
  echo "  Ejecuta: anvil  (o ./start.sh)"
  exit 1
fi

# 2) Configuración web
if [ ! -f "$ENV_FILE" ]; then
  echo "✗ web/.env.local no existe. Ejecuta: ./setup.sh"
  exit 1
fi
ESCROW="$(grep -E '^NEXT_PUBLIC_ESCROW_ADDRESS=' "$ENV_FILE" | cut -d= -f2)"
if [ -z "$ESCROW" ]; then
  echo "✗ NEXT_PUBLIC_ESCROW_ADDRESS vacío en web/.env.local"
  exit 1
fi
echo "✓ web/.env.local con Escrow: $ESCROW"

# 3) Contrato responde
echo "Consultando contrato..."
OWNER="$("$CAST" call --rpc-url "$RPC_URL" "$ESCROW" "owner()(address)" 2>/dev/null || echo 'ERROR')"
if [ "$OWNER" = "ERROR" ] || [ -z "$OWNER" ]; then
  echo "✗ El contrato no responde en $ESCROW"
  exit 1
fi
echo "  Owner:  $OWNER"

TOKENS="$("$CAST" call --rpc-url "$RPC_URL" "$ESCROW" "getAllowedTokensCount()(uint256)" 2>/dev/null || echo '0')"
ARBITER="$("$CAST" call --rpc-url "$RPC_URL" "$ESCROW" "arbiter()(address)" 2>/dev/null || echo '0x0000000000000000000000000000000000000000')"
echo "  Tokens autorizados: $TOKENS"
echo "  Árbitro:            $ARBITER"

# 4) Dependencias web
if [ ! -d "$ROOT/web/node_modules" ]; then
  echo "✗ web/node_modules no existe. Ejecuta: (cd web && npm install)"
  exit 1
fi
echo "✓ web/node_modules presente"

echo ""
echo "✅ Entorno verificado. Siguiente paso: cd web && npm run dev"
