#!/usr/bin/env bash
#
# deploy-local.sh — Despliegue local completo sobre Anvil (chain 31337).
#
# Reescrito para la arquitectura vigente del proyecto. La versión anterior
# pertenecía a una generación de contratos ya eliminada: invocaba UserRegistry,
# Exchange, MockERC20, Subscription, Governance, TruekeSBT, SBTRegistry,
# TruekeRWA y TruekeService (9 contratos que ya no existen) y llamaba a
# funciones inexistentes (addToken, setArbiter, setUserRegistry), por lo que
# abortaba en el segundo despliegue.
#
# Diseño actual:
#   - El despliegue de los 9 contratos base y su cableado es responsabilidad de
#     sc/script/Deploy.s.sol (única fuente de verdad). Este script lo invoca y
#     luego lee las direcciones del broadcast de Foundry.
#   - El rol y la identidad de los usuarios YA NO viven on-chain: los gestiona el
#     backend sobre PostgreSQL (escalera D28 + SmartAccount + SBT). Para poblar
#     usuarios y datos operativos usa: node scripts/inyectar_datos_operativos.mjs
#
# Uso:
#   anvil                       # en otra terminal
#   ./deploy-local.sh           # RPC_URL por defecto http://localhost:8545
#   RPC_URL=http://127.0.0.1:8546 ./deploy-local.sh
#
set -euo pipefail

RPC_URL="${RPC_URL:-http://localhost:8545}"
CHAIN_ID="${CHAIN_ID:-31337}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Foundry suele instalarse en ~/.foundry/bin, que no siempre está en el PATH.
export PATH="$HOME/.foundry/bin:$PATH"

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

FORGE="$(find_tool forge)" || { echo "❌ forge no encontrado. Instala Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup"; exit 1; }
CAST="$(find_tool cast)"   || { echo "❌ cast no encontrado (viene con Foundry)."; exit 1; }
CURL="$(find_tool curl)"   || { echo "❌ curl no encontrado."; exit 1; }
JQ="$(find_tool jq)"       || { echo "❌ jq no encontrado (necesario para leer el broadcast de Foundry)."; exit 1; }

echo "================================================================="
echo "  🚀 DESPLIEGUE LOCAL TRUEKEATE (Anvil, chain $CHAIN_ID)"
echo "================================================================="

# --- Cuentas de Anvil -------------------------------------------------------
declare -a ADDRS=(
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" # 0: Owner de la plataforma
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # 1: Relayer / minter (RF-15.2)
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" # 2: Usuario de pruebas
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906" # 3
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" # 4
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" # 5
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9" # 6
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" # 7
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" # 8
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" # 9
)

# Claves por defecto de Anvil (públicas, solo para desarrollo local; la lista
# completa está documentada en accounts.sh).
declare -a KEYS=(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" # 0
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" # 1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" # 2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" # 3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a" # 4
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba" # 5
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e" # 6
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356" # 7
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97" # 8
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6" # 9
)

OWNER_ADDR="${ADDRS[0]}"
OWNER_KEY="${KEYS[0]}"
RELAYER_ADDR="${ADDRS[1]}"
RELAYER_KEY="${KEYS[1]}"

# --- 1/6 Verificar Anvil ----------------------------------------------------
if ! "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  echo "❌ Anvil no responde en $RPC_URL"
  echo "   Inícialo primero:  anvil"
  exit 1
fi
echo "✓ [1/6] Anvil detectado en $RPC_URL"

# --- 2/6 Compilar -----------------------------------------------------------
echo ""
echo "📦 [2/6] Compilando contratos con Foundry..."
(cd "$ROOT/sc" && "$FORGE" build >/dev/null)
echo "✓ Compilación correcta"

# --- 3/6 Desplegar los contratos base + cableado (Deploy.s.sol) -------------
echo ""
echo "🔐 [3/6] Desplegando contratos base (Owner = cuenta 0: $OWNER_ADDR)..."
(cd "$ROOT/sc" && PRIVATE_KEY="$OWNER_KEY" "$FORGE" script script/Deploy.s.sol \
  --rpc-url "$RPC_URL" --broadcast >/dev/null)

BROADCAST="$ROOT/sc/broadcast/Deploy.s.sol/$CHAIN_ID/run-latest.json"
[ -f "$BROADCAST" ] || { echo "❌ No se encontró el broadcast: $BROADCAST"; exit 1; }

addr_of() { # $1 = nombre del contrato; devuelve la última dirección desplegada
  "$JQ" -r --arg n "$1" \
    '[.transactions[] | select(.contractName == $n and .contractAddress != null) | .contractAddress] | last // empty' \
    "$BROADCAST"
}

ESCROW="$(addr_of Escrow)"
FACTORY="$(addr_of SmartAccountFactory)"
NFT="$(addr_of TrueKeateNFT)"
BRLT="$(addr_of BRLT)"
FONDO="$(addr_of FondoDeValor)"
REGISTRY="$(addr_of SociosRegistry)"
SUSCRIPCION="$(addr_of SuscripcionEmpresa)"

# Los dos TrueKeateToken se despliegan en orden: primero TKA, luego TKB.
mapfile -t _tokens < <("$JQ" -r '[.transactions[] | select(.contractName == "TrueKeateToken" and .contractAddress != null) | .contractAddress] | .[]' "$BROADCAST")
TKA="${_tokens[0]:-}"
TKB="${_tokens[1]:-}"

for par in "Escrow:$ESCROW" "SmartAccountFactory:$FACTORY" "TrueKeateNFT:$NFT" \
           "BRLT:$BRLT" "FondoDeValor:$FONDO" "SociosRegistry:$REGISTRY" \
           "SuscripcionEmpresa:$SUSCRIPCION" "TokenA(TKA):$TKA" "TokenB(TKB):$TKB"; do
  nombre="${par%%:*}"; dir="${par#*:}"
  if [ -z "$dir" ] || [ "$dir" = "null" ]; then
    echo "❌ No se pudo obtener la dirección de $nombre desde el broadcast."
    exit 1
  fi
  printf "  ✓ %-20s %s\n" "$nombre" "$dir"
done

# --- 4/6 SBT de certificación + permisos de minter --------------------------
echo ""
echo "🪪 [4/6] Desplegando el SBT de certificación y ajustando minters..."
SBT_OUT="$(cd "$ROOT/sc" && "$FORGE" create --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" --broadcast \
  "src/TrueKeateSBT.sol:TrueKeateSBT" --constructor-args "$RELAYER_ADDR" 2>&1)" || true
SBT="$(printf '%s' "$SBT_OUT" | grep -oE 'Deployed to: 0x[0-9a-fA-F]{40}' | awk '{print $3}' | head -1 || true)"
if [ -z "$SBT" ]; then
  echo "❌ No se pudo desplegar TrueKeateSBT:"
  printf '%s\n' "$SBT_OUT" | tail -5
  exit 1
fi
echo "  ✓ TrueKeateSBT        $SBT (minter: cuenta 1 $RELAYER_ADDR)"

# El backend mintea inventario (NFT) y certificaciones (SBT) con la cuenta del
# relayer: se le concede el rol de minter en ambos contratos.
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$NFT" "setMinter(address)" "$RELAYER_ADDR" >/dev/null
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$SBT" "setMinter(address)" "$RELAYER_ADDR" >/dev/null
# El Escrow acepta truekes con el NFT oficial y consulta el padrón de socios.
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$ESCROW" "vincularSociosRegistry(address)" "$REGISTRY" >/dev/null
echo "  ✓ minters y vínculos del Escrow configurados"

# --- 5/6 Mintear tokens de prueba ------------------------------------------
echo ""
echo "💰 [5/6] Minteando 1000 TKA y 1000 TKB a las 10 cuentas de Anvil..."
for addr in "${ADDRS[@]}"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TKA" "mint(address,uint256)" "$addr" 1000000000000000000000 >/dev/null
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TKB" "mint(address,uint256)" "$addr" 1000000000000000000000 >/dev/null
done
echo "  ✓ 1000 TKA + 1000 TKB por cuenta (10 cuentas)"

# --- 6/6 Guardar configuración y registro del despliegue --------------------
echo ""
echo "💾 [6/6] Escribiendo web/.env.local y deployment-info.txt..."

# Los nombres NEXT_PUBLIC_* deben coincidir EXACTAMENTE con los que lee
# web/lib/contracts.ts (DIRECCIONES) y con los ARG del Dockerfile.
cat > "$ROOT/web/.env.local" <<EOF
# Generado por deploy-local.sh — no editar a mano.
NEXT_PUBLIC_ESCROW=$ESCROW
NEXT_PUBLIC_FACTORY=$FACTORY
NEXT_PUBLIC_BRLT=$BRLT
NEXT_PUBLIC_REGISTRY=$REGISTRY
NEXT_PUBLIC_SUSCRIPCION=$SUSCRIPCION

# Contratos adicionales (no consumidos aún por web/lib/contracts.ts)
NEXT_PUBLIC_TRUEKE_NFT=$NFT
NEXT_PUBLIC_TRUEKE_SBT=$SBT
NEXT_PUBLIC_FONDO_VALOR=$FONDO
NEXT_PUBLIC_TOKEN_A=$TKA
NEXT_PUBLIC_TOKEN_B=$TKB

# Red
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID

# Backend
FACTORY_ADDRESS=$FACTORY
RELAYER_PRIVATE_KEY=$RELAYER_KEY
MINTER_PRIVATE_KEY=$RELAYER_KEY
DATABASE_URL=${DATABASE_URL:-postgresql://localhost:5432/TrueKeate}
KYC_SECRET=${KYC_SECRET:-truekeate-local-dev-secret-0123456789abcdef0123456789abcdef}
EOF
echo "  ✓ web/.env.local"

{
  echo "================================================================="
  echo "  DESPLIEGUE LOCAL TRUEKEATE — REGISTRO DE DIRECCIONES"
  echo "  Generado por deploy-local.sh el $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo "  Red: $RPC_URL (chain $CHAIN_ID)"
  echo "================================================================="
  echo ""
  echo "CONTRATOS DESPLEGADOS:"
  printf "  %-22s %s\n" "Escrow:" "$ESCROW"
  printf "  %-22s %s\n" "SmartAccountFactory:" "$FACTORY"
  printf "  %-22s %s\n" "TrueKeateNFT:" "$NFT"
  printf "  %-22s %s\n" "TrueKeateSBT:" "$SBT"
  printf "  %-22s %s\n" "BRLT:" "$BRLT"
  printf "  %-22s %s\n" "FondoDeValor:" "$FONDO"
  printf "  %-22s %s\n" "SociosRegistry:" "$REGISTRY"
  printf "  %-22s %s\n" "SuscripcionEmpresa:" "$SUSCRIPCION"
  printf "  %-22s %s\n" "Token A (TKA):" "$TKA"
  printf "  %-22s %s\n" "Token B (TKB):" "$TKB"
  echo ""
  echo "CUENTAS Y ROLES:"
  printf "  %-4s %-44s %s\n" "#" "DIRECCION" "ROL"
  printf "  %-4s %-44s %s\n" "0" "${ADDRS[0]}" "Owner de la plataforma (deployer)"
  printf "  %-4s %-44s %s\n" "1" "${ADDRS[1]}" "Relayer EIP-712 y minter (NFT + SBT)"
  for i in 2 3 4 5 6 7 8 9; do
    printf "  %-4s %-44s %s\n" "$i" "${ADDRS[$i]}" "Cuenta libre para pruebas"
  done
  echo ""
  echo "  Las claves privadas de estas cuentas son las por defecto de Anvil"
  echo "  (uso exclusivo en desarrollo, chain $CHAIN_ID) y están en accounts.sh."
  echo ""
  echo "SIGUIENTE PASO:"
  echo "  1) Poblar usuarios y datos operativos (los roles viven en el backend):"
  echo "       node scripts/inyectar_datos_operativos.mjs"
  echo "  2) Arrancar el frontend:"
  echo "       cd web && npm run dev"
  echo "  3) Verificar el entorno:"
  echo "       ./verify-setup.sh"
  echo "================================================================="
} > "$ROOT/deployment-info.txt"
echo "  ✓ deployment-info.txt"

echo ""
echo "================================================================="
echo "  ✓ DESPLIEGUE LOCAL COMPLETADO"
echo "================================================================="
echo "  Contratos: 10 desplegados y cableados"
echo "  Tokens:    1000 TKA + 1000 TKB por cuenta de Anvil"
echo "  Registro:  deployment-info.txt · Config: web/.env.local"
echo "================================================================="
