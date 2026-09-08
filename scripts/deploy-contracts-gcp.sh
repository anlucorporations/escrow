#!/usr/bin/env bash
#
# deploy-contracts-gcp.sh — Despliegue de contratos en el nodo Foundry/Anvil
# remoto de GCP, con manejo seguro de claves (condiciones GCP).
#
# SEGURIDAD:
#  - NINGUNA clave privada está hardcodeada. Se leen de:
#      1. Variable de entorno (OWNER_PRIVATE_KEY, ACCOUNT_PRIVATE_KEYS)
#      2. GCP Secret Manager (gcloud secrets versions access ...)
#  - Se ABORTA si se detectan claves por defecto de Anvil, salvo que se pase
#    --allow-anvil-keys (solo entorno de PREVIEW/desarrollo remoto).
#  - Las direcciones resultantes se escriben en deployment-info-gcp.txt y
#    web/.env.gcp (SOLO direcciones públicas, nunca claves).
#
# Requisitos: forge + cast (Foundry), gcloud autenticado, RPC_URL accesible.
#
# Uso:
#   RPC_URL=http://IP-NODO:8545 \
#   OWNER_PRIVATE_KEY=0x... \
#   ./scripts/deploy-contracts-gcp.sh [--allow-anvil-keys] [--full-matrix] [--fund-relayer]
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ALLOW_ANVIL_KEYS=0
FULL_MATRIX=0
FUND_RELAYER=0
for arg in "$@"; do
  case "$arg" in
    --allow-anvil-keys) ALLOW_ANVIL_KEYS=1 ;;
    --full-matrix) FULL_MATRIX=1 ;;
    --fund-relayer) FUND_RELAYER=1 ;;
    *) echo "⚠️  Argumento desconocido: $arg" ;;
  esac
done

# ---------------------------------------------------------------- herramientas
find_tool() {
  local name="$1"
  for cand in "$name.exe" "$name"; do
    if command -v "$cand" >/dev/null 2>&1; then
      printf '%s' "$cand"; return 0
    fi
  done
  return 1
}
FORGE="$(find_tool forge)" || { echo "❌ forge no encontrado (instala Foundry)."; exit 1; }
CAST="$(find_tool cast)" || { echo "❌ cast no encontrado (instala Foundry)."; exit 1; }
CURL="$(find_tool curl)" || { echo "❌ curl no encontrado."; exit 1; }

# ---------------------------------------------------------------- configuración
RPC_URL="${RPC_URL:-}"
if [ -z "$RPC_URL" ]; then
  echo "❌ RPC_URL es obligatorio (nodo Foundry/Anvil remoto de GCP)."
  exit 1
fi
[ "${RPC_URL#http}" != "$RPC_URL" ] || { echo "❌ RPC_URL debe ser http(s)://..."; exit 1; }

echo "================================================================="
echo "  ☁️  DESPLIEGUE DE CONTRATOS EN NODO REMOTO GCP (Foundry)"
echo "================================================================="

if ! "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  echo "❌ No se puede alcanzar el nodo en $RPC_URL (¿firewall/VPC?)."
  exit 1
fi
CHAIN_ID="$(cd "$ROOT/sc" && "$CAST" chain-id --rpc-url "$RPC_URL")"
echo "✓ Nodo alcanzable en $RPC_URL (Chain ID: $CHAIN_ID)"

# ---------------------------------------------------------------- claves (Secret Manager / env)
get_secret() {
  local name="$1"
  local v="${!name:-}"
  if [ -n "$v" ]; then printf '%s' "$v"; return 0; fi
  if command -v gcloud >/dev/null 2>&1 && gcloud secrets describe "$name" >/dev/null 2>&1; then
    gcloud secrets versions access latest --secret="$name" 2>/dev/null | tr -d '\n'
    return 0
  fi
  return 1
}

OWNER_KEY="$(get_secret OWNER_PRIVATE_KEY || true)"
if [ -z "$OWNER_KEY" ]; then
  echo "❌ OWNER_PRIVATE_KEY requerida (env o Secret Manager)."
  exit 1
fi
OWNER_ADDR="$("$CAST" wallet address --private-key "$OWNER_KEY")"

# Bloqueo de claves por defecto de Anvil (nunca en producción)
ANVIL_KEYS=(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
)
for k in "${ANVIL_KEYS[@]}"; do
  if [ "${OWNER_KEY,,}" = "$k" ] && [ "$ALLOW_ANVIL_KEYS" = "0" ]; then
    echo "❌ La clave del owner es una clave por defecto de Anvil."
    echo "   Esto está PROHIBIDO en GCP salvo preview de desarrollo remoto."
    echo "   Si es un entorno de preview, repite con: --allow-anvil-keys"
    exit 1
  fi
done
echo "✓ Owner: $OWNER_ADDR (clave vía env/Secret Manager)"

# ---------------------------------------------------------------- build
echo ""
echo "📦 [1/6] Compilando contratos con Foundry..."
(cd "$ROOT/sc" && "$FORGE" build >/dev/null 2>&1)
echo "✓ Contratos compilados"

deploy() {
  local contract="$1"; shift
  local -a cmd=("$FORGE" create --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" --broadcast "src/$contract.sol:$contract")
  if [ "$#" -gt 0 ]; then cmd+=(--constructor-args "$@"); fi
  "${cmd[@]}" 2>/dev/null | grep "Deployed to:" | awk '{print $3}'
}

echo ""
echo "🔐 [2/6] Desplegando contratos (Owner: $OWNER_ADDR)..."
ESCROW="$(cd "$ROOT/sc" && deploy Escrow)"
REGISTRY="$(cd "$ROOT/sc" && deploy UserRegistry)"
EXCHANGE="$(cd "$ROOT/sc" && deploy Exchange "$REGISTRY")"
TKA="$(cd "$ROOT/sc" && deploy MockERC20 TokenA TKA 18)"
TKB="$(cd "$ROOT/sc" && deploy MockERC20 TokenB TKB 18)"
USDT="$(cd "$ROOT/sc" && deploy MockERC20 USDT USDT 6)"
DELIVERY="$(cd "$ROOT/sc" && deploy MockERC20 DELIVERY DELIVERY 18)"
BRLT="$(cd "$ROOT/sc" && deploy BRLT)"
SUBSCRIPTION="$(cd "$ROOT/sc" && deploy Subscription "$BRLT" 100000000000000000000)"
GOVERNANCE="$(cd "$ROOT/sc" && deploy Governance)"
TRUEKE_SBT="$(cd "$ROOT/sc" && deploy TruekeSBT)"
SBT_REGISTRY="$(cd "$ROOT/sc" && deploy SBTRegistry)"
TRUEKE_RWA="$(cd "$ROOT/sc" && deploy TruekeRWA "$SBT_REGISTRY")"
TRUEKE_SERVICE="$(cd "$ROOT/sc" && deploy TruekeService "$SBT_REGISTRY")"

"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "setMinter(address)" "$SBT_REGISTRY" >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$SBT_REGISTRY" "setNativeSBT(address)" "$TRUEKE_SBT" >/dev/null 2>&1 || true

for name in ESCROW REGISTRY EXCHANGE TKA TKB USDT DELIVERY BRLT SUBSCRIPTION GOVERNANCE TRUEKE_SBT SBT_REGISTRY TRUEKE_RWA TRUEKE_SERVICE; do
  echo "  ✓ $name = ${!name}"
done

# ---------------------------------------------------------------- wiring del owner
echo ""
echo "👑 [3/6] Configurando Owner (árbitro, tesorería, tokens, superadmin)..."
for t in "$TKA" "$TKB" "$USDT" "$DELIVERY"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$ESCROW" "addToken(address)" "$t" >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$EXCHANGE" "addToken(address)" "$t" >/dev/null 2>&1 || true
done
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$ESCROW" "setArbiter(address)" "$OWNER_ADDR" >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$ESCROW" "setUserRegistry(address)" "$REGISTRY" >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setTreasury(address)" "$OWNER_ADDR" >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setSocio(address,bool)" "$OWNER_ADDR" true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "superadmin" "superadmin@truekeate.com" "+584120000000" "Sede Central TrueKeate, Barlovento, Miranda" 729000 1159000 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "$OWNER_ADDR" 2 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "mint(address,string)" "$OWNER_ADDR" "Certificacion Fundador & Socio TrueKeate" >/dev/null 2>&1 || true

# ---------------------------------------------------------------- relayer (financiar si preview anvil)
RELAYER_KEY="$(get_secret RELAYER_PRIVATE_KEY || true)"
if [ -n "$RELAYER_KEY" ]; then
  RELAYER_ADDR="$("$CAST" wallet address --private-key "$RELAYER_KEY")"
  echo "✓ Relayer detectado: $RELAYER_ADDR"
  if [ "$FUND_RELAYER" = "1" ]; then
    if [ "$CHAIN_ID" = "31337" ]; then
      "$CAST" rpc --rpc-url "$RPC_URL" anvil_setBalance "$RELAYER_ADDR" 0x21E19E0C9BAB2400000 >/dev/null 2>&1 || true
      echo "  ✓ Relayer financiado (preview Anvil): 10000 ETH"
    else
      echo "⚠️  --fund-relayer solo aplica a Anvil (chain 31337). Financia el relayer manualmente en la red $CHAIN_ID."
    fi
  fi
fi

# ---------------------------------------------------------------- matriz de roles (opcional)
if [ "$FULL_MATRIX" = "1" ]; then
  echo ""
  echo "⚖️ [4/6] Matriz de roles (--full-matrix)..."
  ACCOUNT_KEYS_CSV="${ACCOUNT_PRIVATE_KEYS:-}"
  if [ -z "$ACCOUNT_KEYS_CSV" ]; then
    echo "⚠️  --full-matrix requiere ACCOUNT_PRIVATE_KEYS (CSV de claves cuentas 1..6, env o Secret Manager)."
  else
    IFS=',' read -r -a AKEYS <<< "$ACCOUNT_KEYS_CSV"
    register_account() {
      local idx="$1" user="$2" email="$3" phone="$4" addr="$5" level="$6" socio="$7" sbt_note="$8"
      local key="${AKEYS[$((idx-1))]}"
      [ -n "${key:-}" ] || { echo "  ⚠️  Falta clave para cuenta $idx"; return; }
      "$CAST" send --rpc-url "$RPC_URL" --private-key "$key" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "$user" "$email" "$phone" "Barlovento, Miranda, VE" 729000 1159000 19 true >/dev/null 2>&1 || true
      "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "$addr" "$level" >/dev/null 2>&1 || true
      if [ "$socio" = "1" ]; then
        "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setSocio(address,bool)" "$addr" true >/dev/null 2>&1 || true
      fi
      if [ -n "$sbt_note" ]; then
        "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "mint(address,string)" "$addr" "$sbt_note" >/dev/null 2>&1 || true
      fi
      echo "  ✓ Cuenta $idx -> @$user"
    }
    declare -a MADDRS=()
    for k in "${AKEYS[@]}"; do MADDRS+=("$("$CAST" wallet address --private-key "$k")"); done
    register_account 1 socio_juez_alpha  juez.alpha@truekeate.com  "+584126667788" "${MADDRS[0]}" 2 1 "Certificacion Socio Comunitario"
    register_account 2 socio_juez_beta   juez.beta@truekeate.com   "+584127778899" "${MADDRS[1]}" 2 1 "Certificacion Socio Comunitario"
    register_account 3 empresa_tech      tech@barloventas.com      "+584124445566" "${MADDRS[2]}" 2 0 "Certificacion Empresa Verificada"
    register_account 4 empresa_agro      agro@barloventas.com      "+584125556677" "${MADDRS[3]}" 2 0 "Certificacion Empresa Verificada"
    register_account 5 particular_carlos carlos@truekeate.com      "+584121112233" "${MADDRS[4]}" 1 0 ""
    register_account 6 particular_diana  diana@truekeate.com       "+584122223344" "${MADDRS[5]}" 1 0 ""
  fi
fi

# ---------------------------------------------------------------- tokens de prueba
echo ""
echo "💰 [5/6] Minteando tokens de prueba al Owner..."
for tok in "$TKA" "$TKB" "$BRLT"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$tok" "mint(address,uint256)" "$OWNER_ADDR" 10000000000000000000000 >/dev/null 2>&1 || true
done
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$USDT" "mint(address,uint256)" "$OWNER_ADDR" 5000000000 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$DELIVERY" "mint(address,uint256)" "$OWNER_ADDR" 5 >/dev/null 2>&1 || true

# ---------------------------------------------------------------- salidas (solo direcciones públicas)
echo ""
echo "📝 [6/6] Guardando direcciones (sin claves)..."
cat > "$ROOT/web/.env.gcp" <<EOF
# GENERADO por scripts/deploy-contracts-gcp.sh — SOLO direcciones públicas.
# NO contiene claves. Cargado por deploy-gcp.sh para el build de Cloud Run.
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=$REGISTRY
NEXT_PUBLIC_EXCHANGE_ADDRESS=$EXCHANGE
NEXT_PUBLIC_GOVERNANCE_ADDRESS=$GOVERNANCE
NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=$SUBSCRIPTION
NEXT_PUBLIC_TOKEN_A_ADDRESS=$TKA
NEXT_PUBLIC_TOKEN_B_ADDRESS=$TKB
NEXT_PUBLIC_USDT_ADDRESS=$USDT
NEXT_PUBLIC_DELIVERY_ADDRESS=$DELIVERY
NEXT_PUBLIC_BRLT_ADDRESS=$BRLT
NEXT_PUBLIC_SBT_REGISTRY_ADDRESS=$SBT_REGISTRY
NEXT_PUBLIC_TRUEKE_SBT_ADDRESS=$TRUEKE_SBT
NEXT_PUBLIC_TRUEKE_RWA_ADDRESS=$TRUEKE_RWA
NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS=$TRUEKE_SERVICE
NEXT_PUBLIC_CHAIN_ID=$CHAIN_ID
EOF

cat > "$ROOT/deployment-info-gcp.txt" <<EOF
=================================================================
  DESPLIEGUE GCP — CONTRATOS EN NODO REMOTO (Chain ID: $CHAIN_ID)
  RPC: $RPC_URL
  Owner: $OWNER_ADDR
=================================================================
  Escrow:        $ESCROW
  UserRegistry:  $REGISTRY
  Exchange:      $EXCHANGE
  Governance:    $GOVERNANCE
  Subscription:  $SUBSCRIPTION
  TokenA:        $TKA
  TokenB:        $TKB
  USDT:          $USDT
  DELIVERY:      $DELIVERY
  BRLT:          $BRLT
  TruekeSBT:     $TRUEKE_SBT
  SBTRegistry:   $SBT_REGISTRY
  TruekeRWA:     $TRUEKE_RWA
  TruekeService: $TRUEKE_SERVICE
=================================================================
  Direcciones también en: web/.env.gcp (para Cloud Run)
EOF

echo ""
echo "================================================================="
echo "  ✓ CONTRATOS DESPLEGADOS EN GCP (Chain ID: $CHAIN_ID)"
echo "    Direcciones -> deployment-info-gcp.txt y web/.env.gcp"
echo "================================================================="
