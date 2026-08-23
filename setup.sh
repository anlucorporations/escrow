#!/usr/bin/env bash
#
# setup.sh — Despliega el contrato Escrow + 4 tokens mock, los autoriza,
# designa al árbitro, mintea tokens de prueba y configura web/.env.local.
#
# Idempotente: puede ejecutarse varias veces; cada ejecución despliega un
# conjunto nuevo y consistente de contratos y sobrescribe la configuración.
#
# Requisitos: Anvil corriendo en http://localhost:8545
#
set -euo pipefail

RPC_URL="${RPC_URL:-http://localhost:8545}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
DEPLOYER="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
ARBITER="${ARBITER:-0x90F79bf6EB2c4f870365E785982E1f101E93b906}"
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
FORGE="$(find_tool forge)" || { echo "❌ forge no encontrado. Instala Foundry: https://getfoundry.sh"; exit 1; }
CAST="$(find_tool cast)" || { echo "❌ cast no encontrado. Instala Foundry: https://getfoundry.sh"; exit 1; }
CURL="$(find_tool curl)" || { echo "❌ curl no encontrado."; exit 1; }

echo "================================================"
echo "  Escrow DApp — setup.sh"
echo "================================================"

# 1) Verificar Anvil
if ! "$CURL" -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  "$RPC_URL" >/dev/null 2>&1; then
  echo "❌ Anvil no está corriendo en $RPC_URL"
  echo "   Inicia Anvil en otra terminal: anvil"
  exit 1
fi
echo "✓ Anvil detectado en $RPC_URL"

# 1b) Dependencias de Foundry (forge-std, openzeppelin-contracts)
#     El repo declara los submódulos en .gitmodules pero, si no están
#     registrados en el índice, los clonamos en las versiones de foundry.lock.
if [ ! -d "$ROOT/sc/lib/forge-std/src" ] || [ ! -d "$ROOT/sc/lib/openzeppelin-contracts/contracts" ]; then
  echo "Instalando dependencias de Foundry (forge-std, OpenZeppelin)..."
  if [ ! -d "$ROOT/sc/lib/forge-std" ]; then
    git clone --depth 1 --branch v1.11.0 https://github.com/foundry-rs/forge-std "$ROOT/sc/lib/forge-std" >/dev/null 2>&1
  fi
  if [ ! -d "$ROOT/sc/lib/openzeppelin-contracts" ]; then
    git clone --depth 1 --branch v5.4.0 https://github.com/OpenZeppelin/openzeppelin-contracts "$ROOT/sc/lib/openzeppelin-contracts" >/dev/null 2>&1
  fi
  echo "✓ Dependencias instaladas"
fi

# 2) Compilar contratos
echo "Compilando contratos..."
(cd "$ROOT/sc" && "$FORGE" build >/dev/null 2>&1)
echo "✓ Contratos compilados"

# 3) Desplegar Escrow + tokens mock
deploy() {
  # $1 = contrato, resto = constructor args (nombres de una sola palabra)
  local contract="$1"; shift
  local -a cmd=("$FORGE" create --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" --broadcast "src/$contract.sol:$contract")
  if [ "$#" -gt 0 ]; then
    cmd+=(--constructor-args "$@")
  fi
  "${cmd[@]}" 2>/dev/null | grep "Deployed to:" | awk '{print $3}'
}

echo "Desplegando contratos..."
ESCROW="$(cd "$ROOT/sc" && deploy Escrow)"
TKA="$(cd "$ROOT/sc" && deploy MockERC20 TokenA TKA 18)"
TKB="$(cd "$ROOT/sc" && deploy MockERC20 TokenB TKB 18)"
USDT="$(cd "$ROOT/sc" && deploy MockERC20 USDT USDT 6)"
DELIVERY="$(cd "$ROOT/sc" && deploy MockERC20 DELIVERY DELIVERY 18)"

[ -n "$ESCROW" ] && [ -n "$TKA" ] && [ -n "$TKB" ] && [ -n "$USDT" ] && [ -n "$DELIVERY" ] \
  || { echo "❌ Falló el despliegue"; exit 1; }

echo "✓ Escrow:   $ESCROW"
echo "✓ TKA:      $TKA"
echo "✓ TKB:      $TKB"
echo "✓ USDT:     $USDT (6 decimals)"
echo "✓ DELIVERY: $DELIVERY"

# 4) Autorizar tokens y árbitro
echo "Autorizando tokens y árbitro en el contrato..."
for T in "$TKA" "$TKB" "$USDT" "$DELIVERY"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" "$ESCROW" \
    "addToken(address)" "$T" >/dev/null 2>&1
done
"$CAST" send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" "$ESCROW" \
  "setArbiter(address)" "$ARBITER" >/dev/null 2>&1
echo "✓ 4 tokens autorizados + árbitro $ARBITER"

# 5) Mint tokens de prueba (a las 10 cuentas de Anvil)
echo "Minteando tokens de prueba..."
ACCOUNTS=(
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906"
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"
  "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc"
  "0x976EA74026E726554dB657fA54763abd0C3a0aa9"
  "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955"
  "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f"
  "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720"
)
for ADDR in "${ACCOUNTS[@]}"; do
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" "$TKA" "mint(address,uint256)" "$ADDR" 1000000000000000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" "$TKB" "mint(address,uint256)" "$ADDR" 1000000000000000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" "$USDT" "mint(address,uint256)" "$ADDR" 5000000000 >/dev/null 2>&1 || true
  "$CAST" send --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" "$DELIVERY" "mint(address,uint256)" "$ADDR" 5 >/dev/null 2>&1 || true
done
echo "✓ Tokens minteados: 1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY por cuenta"

# 6) Configurar web/.env.local
echo "Configurando web/.env.local..."
cat > "$ROOT/web/.env.local" <<EOF
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW
RPC_URL=$RPC_URL
EOF
echo "✓ web/.env.local actualizado"

# 7) Guardar información de deployment
cat > "$ROOT/deployment-info.txt" <<EOF
Escrow:   $ESCROW
Arbiter:  $ARBITER

Tokens autorizados:
  Token A:    $TKA (TKA, 18 decimals)
  Token B:    $TKB (TKB, 18 decimals)
  USDT mock:  $USDT (USDT, 6 decimals)
  DELIVERY:   $DELIVERY (DELIVERY, 18 decimals)

Cuentas (1000 TKA + 1000 TKB + 5000 USDT + 5 DELIVERY cada una):
  0 - Owner/Admin: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  1 - User1:        0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  2 - User2:        0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  3 - Arbiter:      0x90F79bf6EB2c4f870365E785982E1f101E93b906
  4 - 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
  5 - 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc
  6 - 0x976EA74026E726554dB657fA54763abd0C3a0aa9
  7 - 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
  8 - 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
  9 - 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720

Todas las cuentas usan la mnemónica por defecto de Anvil.
Ver claves privadas en: ./accounts.sh
EOF
echo "✓ deployment-info.txt guardado"

echo ""
echo "✅ Setup completado"
echo "   Escrow:   $ESCROW"
echo "   Web env:  web/.env.local"
echo ""
echo "Siguiente paso: cd web && npm run dev"
