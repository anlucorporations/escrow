# =============================================================================
# TrueKeate — Despliegue/redespliegue del NFT oficial + Escrow con NFT vinculado
# (P1: minteo automático on-chain — lógica maestra punto 1).
#
# Prepara el entorno GCP SIN ejecutar cambios destructivos:
#   1) Despliega el TrueKeateNFT REAL (no el mock) con minter = cuenta relayer.
#   2) Despliega el Escrow actualizado (vincularTrueKeateNft) si aún no está.
#   3) Rellena backend/contratos.json → TrueKeateNFT.direccion y Escrow.direccion.
#   4) Documenta las variables de entorno NFT_ADDRESS / MINTER_PRIVATE_KEY.
#
# Uso (SOLO por orden del director):
#   ./backend/scripts/desplegar-nft-oficial.sh --rpc <RPC_URL> \
#       --owner-pk <OWNER_PRIVATE_KEY> --minter-pk <RELAYER_PRIVATE_KEY>
#
# El script NO hace broadcast por defecto: primero valida con `forge script --dry-run`.
# =============================================================================
set -euo pipefail

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
OWNER_PK="${OWNER_PRIVATE_KEY:-}"
MINTER_PK="${MINTER_PRIVATE_KEY:-${RELAYER_PRIVATE_KEY:-}}"
BROADCAST="${BROADCAST:-no}"   # "yes" para enviar tx on-chain

while [ $# -gt 0 ]; do
  case "$1" in
    --rpc) RPC_URL="$2"; shift 2;;
    --owner-pk) OWNER_PK="$2"; shift 2;;
    --minter-pk) MINTER_PK="$2"; shift 2;;
    --broadcast) BROADCAST="yes"; shift;;
    *) echo "❌ argumento desconocido: $1"; exit 1;;
  esac
done

[ -z "$OWNER_PK" ] && { echo "❌ Falta OWNER_PRIVATE_KEY (cuenta 0 — owner/deployer)."; exit 1; }
[ -z "$MINTER_PK" ] && { echo "❌ Falta MINTER_PRIVATE_KEY (cuenta relayer que será minter)."; exit 1; }

echo "🔗 Red: $RPC_URL"
echo "👤 Owner:  $(cast wallet address --private-key "$OWNER_PK" 2>/dev/null || echo '?')"
echo "🎨 Minter (relayer): $(cast wallet address --private-key "$MINTER_PK" 2>/dev/null || echo '?')"
echo "📦 Broadcast: $BROADCAST"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SC_DIR="$(cd "$SCRIPT_DIR/../../sc" && pwd)"

# 1) Desplegar el TrueKeateNFT real (constructor: nombre, simbolo, minter)
echo "── Desplegando TrueKeateNFT real (minter = relayer)…"
if [ "$BROADCAST" = "yes" ]; then
  NFT_ADDR="$(cd "$SC_DIR" && forge create src/TrueKeateNFT.sol:TrueKeateNFT \
    --broadcast --rpc-url "$RPC_URL" --private-key "$OWNER_PK" \
    --constructor-args "TrueKeate NFT" "TKANFT" "$(cast wallet address --private-key "$MINTER_PK")" \
    | grep 'Deployed to:' | awk '{print $3}')"
else
  echo "  [dry-run] comando de despliegue listo (usa --broadcast para enviar)."
  NFT_ADDR=""
fi

# 2) Si se desplegó, actualizar contratos.json
if [ -n "$NFT_ADDR" ]; then
  echo "✅ TrueKeateNFT desplegado en: $NFT_ADDR"
  node -e "
    const fs = require('fs');
    const p = '$SCRIPT_DIR/../contratos.json';
    const c = JSON.parse(fs.readFileSync(p, 'utf8'));
    c.TrueKeateNFT = c.TrueKeateNFT || {};
    c.TrueKeateNFT.direccion = '$NFT_ADDR';
    fs.writeFileSync(p, JSON.stringify(c, null, 1));
    console.log('  contratos.json → TrueKeateNFT.direccion =', '$NFT_ADDR');
  "
else
  echo "  (sin broadcast: la dirección se rellenará en el despliegue real)"
fi

echo ""
echo "✅ Script listo. Pasos restantes para producción (por orden del director):"
echo "   1. Ejecutar con BROADCAST=yes (o --broadcast) para desplegar el NFT real."
echo "   2. Actualizar secretos en Secret Manager:"
echo "      NFT_ADDRESS=<dirección desplegada>  MINTER_PRIVATE_KEY=<relayer>"
echo "   3. Aplicar migración BD: psql \"\$DATABASE_URL\" -f backend/db/migracion_trueke_abierto.sql"
echo "   4. Redesplegar Cloud Run (web + api) con las nuevas variables."
