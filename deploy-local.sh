#!/usr/bin/env bash
#
# deploy-local.sh — Despliegue local con roles preconfigurados:
#   1. Cuenta 0: SuperUsuario (Owner, Deployer, Relayer, Árbitro, Socio, Admin)
#   2. Cuentas 1, 2, 3: Usuarios Particulares (inscritos en UserRegistry)
#   3. Cuentas 4, 5: Usuarios Comerciantes (inscritos, flag business + suscripción 12 meses BRLT)
#   4. Cuentas 6, 7, 8: Usuarios Socios (inscritos en UserRegistry + rol Socio en Governance)
#
set -euo pipefail

RPC_URL="${RPC_URL:-http://localhost:8545}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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

FORGE="$(find_tool forge)" || { echo "❌ forge no encontrado."; exit 1; }
CAST="$(find_tool cast)" || { echo "❌ cast no encontrado."; exit 1; }
CURL="$(find_tool curl)" || { echo "❌ curl no encontrado."; exit 1; }

echo "================================================================="
echo "  🚀 DESPLIEGUE LOCAL ESCROW / TRUEKEATE — ROLES PRECONFIGURADOS"
echo "================================================================="

# 1) Verificar Anvil
if ! "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  echo "❌ Anvil no está corriendo en $RPC_URL"
  echo "   Inicia Anvil primero: anvil"
  exit 1
fi
echo "✓ Anvil detectado en $RPC_URL"

# Claves y direcciones oficiales de Anvil (10 cuentas)
declare -a ADDRS=(
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" # 0: SuperUsuario
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # 1: Particular 1 (Alice)
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" # 2: Particular 2 (Bob)
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906" # 3: Particular 3 (Carol)
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" # 4: Comerciante 1 (Tienda Tech)
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" # 5: Comerciante 2 (Super Market)
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9" # 6: Socio 1 (Juez Alpha)
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" # 7: Socio 2 (Juez Beta)
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" # 8: Socio 3 (Juez Gamma)
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720" # 9: Usuario Reserva
)

declare -a KEYS=(
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6"
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a"
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba"
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e"
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356"
  "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97"
  "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6"
)

OWNER_ADDR="${ADDRS[0]}"
OWNER_KEY="${KEYS[0]}"

# 2) Compilar contratos
echo ""
echo "📦 [Paso 1/7] Compilando contratos inteligentes con Foundry..."
(cd "$ROOT/sc" && "$FORGE" build >/dev/null 2>&1)
echo "✓ Contratos compilados correctamente"

# Función de despliegue con cuenta 0 (SuperUsuario)
deploy() {
  local contract="$1"; shift
  local -a cmd=("$FORGE" create --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" --broadcast "src/$contract.sol:$contract")
  if [ "$#" -gt 0 ]; then
    cmd+=(--constructor-args "$@")
  fi
  "${cmd[@]}" 2>/dev/null | grep "Deployed to:" | awk '{print $3}'
}

# 3) Despliegue con Cuenta 0 como Owner
echo ""
echo "🔐 [Paso 2/7] Desplegando contratos (Owner = Cuenta 0: $OWNER_ADDR)..."
ESCROW="$(cd "$ROOT/sc" && deploy Escrow)"
REGISTRY="$(cd "$ROOT/sc" && deploy UserRegistry)"
TKA="$(cd "$ROOT/sc" && deploy MockERC20 TokenA TKA 18)"
TKB="$(cd "$ROOT/sc" && deploy MockERC20 TokenB TKB 18)"
USDT="$(cd "$ROOT/sc" && deploy MockERC20 USDT USDT 6)"
DELIVERY="$(cd "$ROOT/sc" && deploy MockERC20 DELIVERY DELIVERY 18)"
BRLT="$(cd "$ROOT/sc" && deploy BRLT)"
SUBSCRIPTION="$(cd "$ROOT/sc" && deploy Subscription "$BRLT" 100000000000000000000)"
GOVERNANCE="$(cd "$ROOT/sc" && deploy Governance)"

echo "✓ Escrow:       $ESCROW"
echo "✓ UserRegistry: $REGISTRY"
echo "✓ Governance:   $GOVERNANCE"
echo "✓ Subscription: $SUBSCRIPTION"
echo "✓ Token A:      $TKA"
echo "✓ Token B:      $TKB"
echo "✓ USDT Mock:    $USDT"
echo "✓ DELIVERY:     $DELIVERY"
echo "✓ BRLT Token:   $BRLT"

# 4) Configurar SuperUsuario (Cuenta 0)
echo ""
echo "👑 [Paso 3/7] Configurando SuperUsuario (Cuenta 0)..."
# Autorizar tokens en Escrow
for T in "$TKA" "$TKB" "$USDT" "$DELIVERY"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$ESCROW" "addToken(address)" "$T" >/dev/null 2>&1
done
# Designar Árbitro a Cuenta 0 (SuperUsuario total)
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$ESCROW" "setArbiter(address)" "$OWNER_ADDR" >/dev/null 2>&1
# Designar Socio a Cuenta 0
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setSocio(address,bool)" "$OWNER_ADDR" true >/dev/null 2>&1
# Registrar Cuenta 0 en UserRegistry
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "register(string)" "superadmin" >/dev/null 2>&1 || true
echo "✓ Cuenta 0 configurada como: Owner + Árbitro + Socio + superadmin on-chain"

# 5) Minteo de tokens para todas las cuentas
echo ""
echo "💰 [Paso 4/7] Minteando tokens de prueba a las 10 cuentas de Anvil..."
for ADDR in "${ADDRS[@]}"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TKA" "mint(address,uint256)" "$ADDR" 1000000000000000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TKB" "mint(address,uint256)" "$ADDR" 1000000000000000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$USDT" "mint(address,uint256)" "$ADDR" 5000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$DELIVERY" "mint(address,uint256)" "$ADDR" 5 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$BRLT" "mint(address,uint256)" "$ADDR" 10000000000000000000000 >/dev/null 2>&1 || true
done
echo "✓ 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY + 10000 BRLT asignados por cuenta"

# 6) Inscribir Usuarios Particulares (Cuentas 1, 2, 3)
echo ""
echo "👤 [Paso 5/7] Inscribiendo 3 Usuarios Particulares en UserRegistry..."
PARTICULAR_NAMES=("particular_alice" "particular_bob" "particular_carol")
for i in 1 2 3; do
  ADDR="${ADDRS[$i]}"
  KEY="${KEYS[$i]}"
  UNAME="${PARTICULAR_NAMES[$((i-1))]}"
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$KEY" "$REGISTRY" "register(string)" "$UNAME" >/dev/null 2>&1 || true
  echo "  ✓ Cuenta $i ($ADDR) -> @$UNAME"
done

# 7) Inscribir y Configurar Comerciantes (Cuentas 4, 5)
echo ""
echo "🏬 [Paso 6/7] Inscribiendo 2 Comerciantes y activando suscripción BRLT..."
COMERCIO_NAMES=("tienda_tech" "mercado_central")
for i in 4 5; do
  ADDR="${ADDRS[$i]}"
  KEY="${KEYS[$i]}"
  UNAME="${COMERCIO_NAMES[$((i-4))]}"
  # Registro on-chain
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$KEY" "$REGISTRY" "register(string)" "$UNAME" >/dev/null 2>&1 || true
  # Owner marca flag business
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$SUBSCRIPTION" "setBusiness(address,bool)" "$ADDR" true >/dev/null 2>&1
  # Comerciante aprueba BRLT (1200 BRLT para 12 meses)
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$KEY" "$BRLT" "approve(address,uint256)" "$SUBSCRIPTION" 1200000000000000000000 >/dev/null 2>&1
  # Comerciante paga 12 meses de suscripción por adelantado
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$KEY" "$SUBSCRIPTION" "subscribe(uint256)" 12 >/dev/null 2>&1
  echo "  ✓ Cuenta $i ($ADDR) -> @$UNAME (Business: TRUE, Suscripción: 12 meses activa)"
done

# 8) Inscribir y Configurar Socios (Cuentas 6, 7, 8)
echo ""
echo "⚖️  [Paso 7/7] Inscribiendo 3 Socios y otorgando rol en Governance..."
SOCIO_NAMES=("socio_juez_alpha" "socio_juez_beta" "socio_juez_gamma")
for i in 6 7 8; do
  ADDR="${ADDRS[$i]}"
  KEY="${KEYS[$i]}"
  UNAME="${SOCIO_NAMES[$((i-6))]}"
  # Registro on-chain
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$KEY" "$REGISTRY" "register(string)" "$UNAME" >/dev/null 2>&1 || true
  # Owner otorga rol Socio en Governance
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setSocio(address,bool)" "$ADDR" true >/dev/null 2>&1
  echo "  ✓ Cuenta $i ($ADDR) -> @$UNAME (Socio en Governance: TRUE)"
done

# 9) Actualizar variables de entorno de frontend
cat > "$ROOT/web/.env.local" <<EOF
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=$REGISTRY
NEXT_PUBLIC_GOVERNANCE_ADDRESS=$GOVERNANCE
NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=$SUBSCRIPTION
NEXT_PUBLIC_TOKEN_A_ADDRESS=$TKA
NEXT_PUBLIC_TOKEN_B_ADDRESS=$TKB
NEXT_PUBLIC_USDT_ADDRESS=$USDT
NEXT_PUBLIC_DELIVERY_ADDRESS=$DELIVERY
NEXT_PUBLIC_BRLT_ADDRESS=$BRLT
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=$OWNER_KEY
DATABASE_URL=postgresql://postgres:KeLuDa.2324@127.0.0.1:5432/truekeate
KYC_SECRET=truekeate-local-dev-secret-0123456789abcdef0123456789abcdef
EOF

# 10) Guardar deployment-info.txt
cat > "$ROOT/deployment-info.txt" <<EOF
=================================================================
  DESPLIEGUE LOCAL ESCROW & TRUEKEATE — INFORME DE ROLES
=================================================================

CONTRATOS DESPLEGADOS:
  Escrow:        $ESCROW
  UserRegistry:  $REGISTRY
  Governance:    $GOVERNANCE
  Subscription:  $SUBSCRIPTION
  Token A:       $TKA (TKA, 18 dec)
  Token B:       $TKB (TKB, 18 dec)
  USDT Mock:     $USDT (USDT, 6 dec)
  DELIVERY:      $DELIVERY (DELIVERY, 18 dec)
  BRLT:          $BRLT (BRLT Stablecoin, 18 dec)

CUENTAS Y ASIGNACIÓN DE ROLES:
-----------------------------------------------------------------
[0] SUPERUSUARIO (Owner, Árbitro, Socio, Relayer Gas, Admin):
    Dirección: $OWNER_ADDR
    Username:  @superadmin
    PrivKey:   $OWNER_KEY

[1] USUARIO PARTICULAR 1:
    Dirección: ${ADDRS[1]}
    Username:  @particular_alice
    PrivKey:   ${KEYS[1]}

[2] USUARIO PARTICULAR 2:
    Dirección: ${ADDRS[2]}
    Username:  @particular_bob
    PrivKey:   ${KEYS[2]}

[3] USUARIO PARTICULAR 3:
    Dirección: ${ADDRS[3]}
    Username:  @particular_carol
    PrivKey:   ${KEYS[3]}

[4] USUARIO COMERCIANTE 1 (Suscripción BRLT 12 Meses):
    Dirección: ${ADDRS[4]}
    Username:  @tienda_tech
    PrivKey:   ${KEYS[4]}

[5] USUARIO COMERCIANTE 2 (Suscripción BRLT 12 Meses):
    Dirección: ${ADDRS[5]}
    Username:  @mercado_central
    PrivKey:   ${KEYS[5]}

[6] USUARIO SOCIO 1 (Gobernanza / Mediador):
    Dirección: ${ADDRS[6]}
    Username:  @socio_juez_alpha
    PrivKey:   ${KEYS[6]}

[7] USUARIO SOCIO 2 (Gobernanza / Mediador):
    Dirección: ${ADDRS[7]}
    Username:  @socio_juez_beta
    PrivKey:   ${KEYS[7]}

[8] USUARIO SOCIO 3 (Gobernanza / Mediador):
    Dirección: ${ADDRS[8]}
    Username:  @socio_juez_gamma
    PrivKey:   ${KEYS[8]}

[9] CUENTA RESERVA:
    Dirección: ${ADDRS[9]}
    PrivKey:   ${KEYS[9]}
=================================================================
EOF

echo ""
echo "================================================================="
echo "  ✅ DESPLIEGUE LOCAL Y ASIGNACIÓN DE ROLES COMPLETADA CON ÉXITO"
echo "================================================================="
echo "  • SuperUsuario: Cuenta 0 (@superadmin)"
echo "  • Particulares: Cuentas 1, 2, 3 (@particular_alice, @particular_bob, @particular_carol)"
echo "  • Comerciantes: Cuentas 4, 5 (@tienda_tech, @mercado_central con 12 meses activos)"
echo "  • Socios:       Cuentas 6, 7, 8 (@socio_juez_alpha, @socio_juez_beta, @socio_juez_gamma)"
echo ""
echo "  Configuración guardada en: web/.env.local y deployment-info.txt"
echo "================================================================="
