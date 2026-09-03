#!/usr/bin/env bash
# =============================================================================
# TrueKeate — Bootstrap del Owner (cuenta 0) para entorno de producción
# =============================================================================
# PROPÓSITO
#   Cierra el hueco detectado en la verificación: el Owner (cuenta 0 del anvil)
#   despliega los contratos, pero nada lo dejaba registrado en la plataforma
#   como CERTIFICADO + tipo/nivel SOCIO. Este script:
#     1. Verifica que la clave del Owner corresponde a la cuenta esperada.
#     2. (BD off-chain) Registra/actualiza al Owner: estado CERTIFICADO (D28),
#        tipo SOCIO, nivel SOCIO, consentimiento GDPR.
#     3. (On-chain) Lo admite como Socio en SociosRegistry (admitirSocioDirecto,
#        onlyOwner → lo firma el propio Owner).
#     4. (On-chain, opcional --smart-account) Despliega su SmartAccount si aún
#        no existe (identidad ERC-4337 inspirada, D35).
#     5. Verifica la cuenta del relayer (cuenta 1): deriva su dirección desde
#        RELAYER_PRIVATE_KEY y la muestra (en pruebas debe ser 0x7099…79C8).
#
# LO QUE NO HACE
#   - NO reinicia anvil ni redeploya contratos.
#   - NO toca Secret Manager (lee claves ya exportadas en el entorno).
#
# CUÁNDO SE EJECUTA
#   SOLO cuando el director lo solicite (normalmente tras un reinicio limpio).
#
# USO
#   source /home/dsh/workspace/gcp-env.sh   # exporta RPC_URL, DATABASE_URL, claves
#   bash backend/scripts/bootstrap-owner.sh [--confirmar] [--smart-account]
#
# ENTORNO
#   RPC_URL, DATABASE_URL (BD opcional: si falta, solo hace la parte on-chain)
#   OWNER_PRIVATE_KEY o ADMIN_PRIVATE_KEY (clave del Owner = cuenta 0)
#   RELAYER_PRIVATE_KEY (para verificar la cuenta del relayer)
#   FACTORY_ADDRESS y REGISTRY_ADDRESS (opcionales; si faltan usa las de pruebas)
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIRMAR=0
SMART_ACCOUNT=0

for arg in "$@"; do
  case "$arg" in
    --confirmar)     CONFIRMAR=1 ;;
    --smart-account) SMART_ACCOUNT=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "❌ Argumento desconocido: $arg (usa --help)" >&2; exit 1 ;;
  esac
done

RPC_URL="${RPC_URL:-http://127.0.0.1:8545}"
export RPC_URL
echo "⛓  RPC: $RPC_URL"

if [ -z "${OWNER_PRIVATE_KEY:-}" ] && [ -z "${ADMIN_PRIVATE_KEY:-}" ]; then
  echo "❌ Falta OWNER_PRIVATE_KEY o ADMIN_PRIVATE_KEY (clave del Owner)." >&2
  echo "   En anvil de pruebas la cuenta 0 es 0xf39F…2266 (usa su clave privada)." >&2
  exit 1
fi
export OWNER_PRIVATE_KEY="${OWNER_PRIVATE_KEY:-$ADMIN_PRIVATE_KEY}"

# ---- Confirmación explícita --------------------------------------------------
if [ "$CONFIRMAR" != "1" ]; then
  echo ""
  echo "⚠️  Este script REGISTRA al Owner (cuenta 0) como CERTIFICADO + SOCIO y," 
  echo "    si aplica, lo admite como Socio on-chain. No borra nada."
  echo ""
  echo "Para ejecutarlo de verdad usa:  bash $0 --confirmar [--smart-account]"
  echo "(Nada se ha modificado.)"
  exit 1
fi

# ---- Ejecutar el motor --------------------------------------------------------
NODE_ARGS=""
if [ "$SMART_ACCOUNT" = "1" ]; then NODE_ARGS="--smart-account"; fi
node "$SCRIPT_DIR/bootstrap-owner.mjs" $NODE_ARGS
