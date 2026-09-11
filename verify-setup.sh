#!/usr/bin/env bash
#
# verify-setup.sh — Comprueba que el entorno local está listo para usar:
#   1. Anvil corriendo
#   2. web/.env.local presente y con las direcciones que espera el frontend
#   3. Los contratos desplegados responden y están cableados entre sí
#   4. Dependencias del frontend instaladas
#
set -euo pipefail

RPC_URL="${RPC_URL:-http://localhost:8545}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT/web/.env.local"

# Foundry suele instalarse en ~/.foundry/bin, que no siempre está en el PATH.
export PATH="$HOME/.foundry/bin:$PATH"

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

FALLOS=0
ok()   { echo "✓ $1"; }
mal()  { echo "✗ $1"; FALLOS=$((FALLOS + 1)); }

leer_env() { # $1 = nombre de la variable en web/.env.local
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true
}

# Lee una dirección del .env.local aceptando el nombre nuevo y el antiguo.
leer_dir() { # $1 = nombre nuevo; $2 = nombre antiguo opcional
  local v
  v="$(leer_env "$1")"
  if [ -z "$v" ] && [ -n "${2:-}" ]; then v="$(leer_env "$2")"; fi
  printf '%s' "$v"
}

echo "================================================"
echo "  TrueKeate — verify-setup.sh"
echo "================================================"

# --- 1) Anvil ---------------------------------------------------------------
if "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  BLOQUE="$("$CURL" -s -X POST -H 'Content-Type: application/json' \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' "$RPC_URL" \
    | grep -oE '"result":"0x[0-9a-fA-F]+"' | cut -d'"' -f4)"
  ok "Anvil corriendo en $RPC_URL (bloque ${BLOQUE:-?})"
else
  mal "Anvil NO responde en $RPC_URL — ejecuta: anvil  (o ./start.sh)"
  exit 1
fi

# --- 2) Configuración del frontend -----------------------------------------
if [ ! -f "$ENV_FILE" ]; then
  mal "web/.env.local no existe — ejecuta: ./deploy-local.sh"
  exit 1
fi

ESCROW="$(leer_dir NEXT_PUBLIC_ESCROW NEXT_PUBLIC_ESCROW_ADDRESS)"
NFT="$(leer_dir NEXT_PUBLIC_TRUEKE_NFT)"
SBT="$(leer_dir NEXT_PUBLIC_TRUEKE_SBT)"
REGISTRY="$(leer_dir NEXT_PUBLIC_REGISTRY NEXT_PUBLIC_USER_REGISTRY_ADDRESS)"
TKA="$(leer_dir NEXT_PUBLIC_TOKEN_A)"

if [ -z "$ESCROW" ]; then
  mal "Falta NEXT_PUBLIC_ESCROW en web/.env.local (¿ejecutaste ./deploy-local.sh?)"
  exit 1
fi
ok "web/.env.local presente — Escrow: $ESCROW"

# --- 3) Los contratos responden --------------------------------------------
echo "Consultando contratos en la cadena..."

consulta() { # $1 = dirección; $2 = firma; resto = argumentos de la llamada
  local dir="$1" firma="$2"
  shift 2
  "$CAST" call --rpc-url "$RPC_URL" "$dir" "$firma" "$@" 2>/dev/null || true
}

OWNER="$(consulta "$ESCROW" "owner()(address)")"
if [ -z "$OWNER" ]; then
  mal "El Escrow no responde en $ESCROW (¿cadena reiniciada? vuelve a desplegar)"
  exit 1
fi
ok "Escrow responde — owner: $OWNER"

NFT_EN_ESCROW="$(consulta "$ESCROW" "trueKeateNft()(address)")"
REG_EN_ESCROW="$(consulta "$ESCROW" "sociosRegistry()(address)")"
SIGUIENTE_ID="$(consulta "$ESCROW" "siguienteId()(uint256)")"

printf "  %-22s %s\n" "NFT en el Escrow:" "${NFT_EN_ESCROW:-no configurado}"
printf "  %-22s %s\n" "Registry en Escrow:" "${REG_EN_ESCROW:-no configurado}"
printf "  %-22s %s\n" "Truekes creados:" "${SIGUIENTE_ID:-0}"

# El cableado mínimo para poder operar: NFT oficial y padrón de socios.
case "$(printf '%s' "$NFT_EN_ESCROW" | tr 'A-F' 'a-f')" in
  ""|"0x0000000000000000000000000000000000000000") mal "El Escrow no tiene vinculado el NFT oficial (vincularTrueKeateNft)" ;;
  *) ok "El Escrow acepta el NFT oficial" ;;
esac
case "$(printf '%s' "$REG_EN_ESCROW" | tr 'A-F' 'a-f')" in
  ""|"0x0000000000000000000000000000000000000000") mal "El Escrow no tiene vinculado el padrón de socios (vincularSociosRegistry)" ;;
  *) ok "El Escrow consulta el padrón de socios" ;;
esac

# Minters del backend (minteo de inventario y certificaciones).
if [ -n "$NFT" ]; then
  MINTER_NFT="$(consulta "$NFT" "minter()(address)")"
  [ -n "$MINTER_NFT" ] && printf "  %-22s %s\n" "Minter del NFT:" "$MINTER_NFT"
fi
if [ -n "$SBT" ]; then
  MINTER_SBT="$(consulta "$SBT" "minter()(address)")"
  [ -n "$MINTER_SBT" ] && printf "  %-22s %s\n" "Minter del SBT:" "$MINTER_SBT"
fi

# Saldo de un token de prueba del owner, como comprobación de minteo.
if [ -n "$TKA" ] && [ -n "$OWNER" ]; then
  SALDO="$(consulta "$TKA" "balanceOf(address)(uint256)" "$OWNER")"
  if [ -n "$SALDO" ]; then
    printf "  %-22s %s\n" "Saldo TKA (owner):" "$SALDO"
  fi
fi

# --- 4) Dependencias del frontend ------------------------------------------
if [ ! -d "$ROOT/web/node_modules" ]; then
  mal "web/node_modules no existe — ejecuta: (cd web && npm install)"
else
  ok "web/node_modules presente"
fi

# --- Resumen ----------------------------------------------------------------
echo ""
if [ "$FALLOS" -eq 0 ]; then
  echo "✅ Entorno verificado. Siguiente paso: cd web && npm run dev"
else
  echo "⚠️  Entorno con $FALLOS problema(s). Revisa los ✗ de arriba."
  exit 1
fi
