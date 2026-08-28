#!/usr/bin/env bash
#
# deploy-local.sh — Despliegue local con matriz de roles completa:
#   - Cuenta 0: SuperUsuario Owner (Deployer, Árbitro, Socio Fundador, Certificado N3 SBT, @superadmin)
#   - Cuentas 1, 2: Usuarios Socios Certificados (Gobernanza + Nivel 3 Certificado + TruekeSBT)
#   - Cuentas 3, 4: Usuarios Empresa Certificados (Nivel 3 Certificado + TruekeSBT + Suscripción 12 meses BRLT)
#   - Cuentas 5, 6: Usuarios Particulares Verificados (Nivel 2 Verificado, cuota 3 truekes simultáneos)
#   - Cuentas 7, 8, 9: Cuentas Libres / No registradas (para pruebas de bienvenida e inscripción en /register)
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
echo "  🚀 DESPLIEGUE LOCAL ESCROW / TRUEKEATE — MATRIZ DE ROLES"
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

declare -a ADDRS=(
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" # 0: Owner / SuperUsuario Socio
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" # 1: Usuario Socio 1 (Juez Alpha)
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" # 2: Usuario Socio 2 (Juez Beta)
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906" # 3: Usuario Empresa 1 (Tech Store)
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" # 4: Usuario Empresa 2 (Agro Market)
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc" # 5: Usuario Particular Verificado 1 (Carlos)
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9" # 6: Usuario Particular Verificado 2 (Diana)
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955" # 7: Cuenta Libre 1 (Sin registrar)
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f" # 8: Cuenta Libre 2 (Sin registrar)
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

# Vincular minter de SBT nativo
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "setMinter(address)" "$SBT_REGISTRY" >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$SBT_REGISTRY" "setNativeSBT(address)" "$TRUEKE_SBT" >/dev/null 2>&1 || true

echo "  ✓ Escrow:        $ESCROW"
echo "  ✓ UserRegistry:  $REGISTRY"
echo "  ✓ Exchange:      $EXCHANGE"
echo "  ✓ Governance:    $GOVERNANCE"
echo "  ✓ Subscription:  $SUBSCRIPTION"
echo "  ✓ Token A:       $TKA"
echo "  ✓ Token B:       $TKB"
echo "  ✓ USDT Mock:     $USDT"
echo "  ✓ DELIVERY:      $DELIVERY"
echo "  ✓ BRLT Token:    $BRLT"
echo "  ✓ TruekeSBT:     $TRUEKE_SBT"
echo "  ✓ SBTRegistry:   $SBT_REGISTRY"
echo "  ✓ TruekeRWA:     $TRUEKE_RWA"
echo "  ✓ TruekeService: $TRUEKE_SERVICE"

# 4) Configurar SuperUsuario (Cuenta 0)
echo ""
echo "👑 [Paso 3/7] Configurando SuperUsuario (Cuenta 0: Owner + Socio Certificado + SBT)..."
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
echo "  ✓ Cuenta 0 ($OWNER_ADDR) -> @superadmin (Owner + Socio Certificado N3 SBT)"

# 5) Minteo de tokens para todas las 10 cuentas
echo ""
echo "💰 [Paso 4/7] Minteando tokens de prueba a las 10 cuentas de Anvil..."
for addr in "${ADDRS[@]}"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TKA" "mint(address,uint256)" "$addr" 1000000000000000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TKB" "mint(address,uint256)" "$addr" 1000000000000000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$USDT" "mint(address,uint256)" "$addr" 5000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$DELIVERY" "mint(address,uint256)" "$addr" 5 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$BRLT" "mint(address,uint256)" "$addr" 10000000000000000000000 >/dev/null 2>&1 || true
done
echo "  ✓ 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY + 10000 BRLT asignados por cuenta"

# 6) Configurar Cuentas 1 y 2: Usuarios Socios Certificados
echo ""
echo "⚖️ [Paso 5/7] Configurando 2 Usuarios Socios Certificados (Cuentas 1 y 2)..."
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[1]}" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "socio_juez_alpha" "juez.alpha@truekeate.com" "+584126667788" "Tribunal Comunitario Alpha, Barlovento" 729800 1160100 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setSocio(address,bool)" "${ADDRS[1]}" true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "${ADDRS[1]}" 2 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "mint(address,string)" "${ADDRS[1]}" "Certificacion Socio Comunitario" >/dev/null 2>&1 || true
echo "  ✓ Cuenta 1 (${ADDRS[1]}) -> @socio_juez_alpha (Socio Certificado N3 SBT)"

"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[2]}" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "socio_juez_beta" "juez.beta@truekeate.com" "+584127778899" "Tribunal Comunitario Beta, Caucagua" 725100 1152000 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$GOVERNANCE" "setSocio(address,bool)" "${ADDRS[2]}" true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "${ADDRS[2]}" 2 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "mint(address,string)" "${ADDRS[2]}" "Certificacion Socio Comunitario" >/dev/null 2>&1 || true
echo "  ✓ Cuenta 2 (${ADDRS[2]}) -> @socio_juez_beta (Socio Certificado N3 SBT)"

# 7) Configurar Cuentas 3 y 4: Usuarios Empresa Certificados
echo ""
echo "🏬 [Paso 6/7] Configurando 2 Usuarios Empresa Certificados (Cuentas 3 y 4)..."
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[3]}" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "empresa_tech" "tech@barloventas.com" "+584124445566" "Centro Comercial Barlovento Local 14" 728900 1158500 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$SUBSCRIPTION" "setBusiness(address,bool)" "${ADDRS[3]}" true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[3]}" "$BRLT" "approve(address,uint256)" "$SUBSCRIPTION" 1200000000000000000000 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[3]}" "$SUBSCRIPTION" "subscribe(uint256)" 12 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "${ADDRS[3]}" 2 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "mint(address,string)" "${ADDRS[3]}" "Certificacion Empresa Verificada" >/dev/null 2>&1 || true
echo "  ✓ Cuenta 3 (${ADDRS[3]}) -> @empresa_tech (Empresa N3 + Suscripción 12 meses)"

"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[4]}" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "empresa_agro" "agro@barloventas.com" "+584125556677" "Av. Comercio Local 3, Tacarigua" 727500 1156200 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$SUBSCRIPTION" "setBusiness(address,bool)" "${ADDRS[4]}" true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[4]}" "$BRLT" "approve(address,uint256)" "$SUBSCRIPTION" 1200000000000000000000 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[4]}" "$SUBSCRIPTION" "subscribe(uint256)" 12 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "${ADDRS[4]}" 2 >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$TRUEKE_SBT" "mint(address,string)" "${ADDRS[4]}" "Certificacion Empresa Verificada" >/dev/null 2>&1 || true
echo "  ✓ Cuenta 4 (${ADDRS[4]}) -> @empresa_agro (Empresa N3 + Suscripción 12 meses)"

# 8) Configurar Cuentas 5 y 6: Usuarios Particulares Verificados
echo ""
echo "👤 [Paso 7/7] Configurando 2 Usuarios Particulares Verificados (Cuentas 5 y 6)..."
"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[5]}" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "particular_carlos" "carlos@truekeate.com" "+584121112233" "Av. Principal 1, Higuerote" 729450 1159800 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "${ADDRS[5]}" 1 >/dev/null 2>&1 || true
echo "  ✓ Cuenta 5 (${ADDRS[5]}) -> @particular_carlos (Particular Verificado N2 - Cuota: 3 truekes)"

"$CAST" send --rpc-url "$RPC_URL" --private-key "${KEYS[6]}" "$REGISTRY" "register(string,string,string,string,int32,int32,uint8,bool)" "particular_diana" "diana@truekeate.com" "+584122223344" "Calle Marina 12, Carenero" 731200 1162400 19 true >/dev/null 2>&1 || true
"$CAST" send --rpc-url "$RPC_URL" --private-key "$OWNER_KEY" "$REGISTRY" "setUserIdentificationLevel(address,uint8)" "${ADDRS[6]}" 1 >/dev/null 2>&1 || true
echo "  ✓ Cuenta 6 (${ADDRS[6]}) -> @particular_diana (Particular Verificado N2 - Cuota: 3 truekes)"

echo ""
echo "  ✓ Cuentas 7, 8 y 9 permanecen LIBRES (Sin registrar) para pruebas de bienvenida e inscripción."

# 9) Guardar configuración
cat > "$ROOT/web/.env.local" <<EOF
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
NEXT_PUBLIC_RPC_URL=$RPC_URL
NEXT_PUBLIC_CHAIN_ID=31337
RELAYER_PRIVATE_KEY=$OWNER_KEY
DATABASE_URL=postgresql://anlucorporations:KeLuDa.2324@127.0.0.1:5432/TrueKeate
KYC_SECRET=truekeate-local-dev-secret-0123456789abcdef0123456789abcdef
EOF

echo "✓ web/.env.local actualizado con direcciones de contratos y PostgreSQL"

echo ""
echo "================================================================="
echo "  ✓ DESPLIEGUE LOCAL Y ASIGNACIÓN DE ROLES COMPLETADA CON ÉXITO"
echo "================================================================="
echo "  - Cuenta 0: SuperUsuario Owner + Socio Certificado N3 (@superadmin)"
echo "  - Cuentas 1, 2: Socios Certificados N3 (@socio_juez_alpha, @socio_juez_beta)"
echo "  - Cuentas 3, 4: Empresas Certificadas N3 + BRLT (@empresa_tech, @empresa_agro)"
echo "  - Cuentas 5, 6: Particulares Verificados N2 (@particular_carlos, @particular_diana)"
echo "  - Cuentas 7, 8, 9: Cuentas LIBRES para pruebas de inscripción (/register)"
echo "================================================================="
