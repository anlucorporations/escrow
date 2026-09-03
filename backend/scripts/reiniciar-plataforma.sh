#!/usr/bin/env bash
# =============================================================================
# TrueKeate — Reinicio completo de la plataforma (solo BD off-chain PostgreSQL)
# =============================================================================
# PROPÓSITO
#   Deja la plataforma en estado limpio para entorno de producción: borra TODOS
#   los registros de operaciones y de identidad de la base de datos off-chain
#   (las 14 tablas del esquema), reiniciando las secuencias.
#
# LO QUE NO HACE (por diseño)
#   - NO reinicia ni detiene los servicios de anvil (el nodo y los contratos
#     desplegados quedan intactos: la cadena es la única fuente de verdad).
#   - NO redeploya contratos ni toca Secret Manager, Cloud Run, relayer o API.
#   - NO borra el esquema ni las extensiones (postgis/pgcrypto): solo los datos.
#
# CUÁNDO SE EJECUTA
#   SOLO cuando el director lo solicite explícitamente. Este script exige
#   --confirmar para hacer algo; sin él solo muestra qué haría.
#
# USO
#   bash backend/scripts/reiniciar-plataforma.sh [--confirmar] [--respaldo] [--check]
#
# ENTORNO
#   DATABASE_URL  (postgresql://usuario:clave@host:puerto/bd)
#   o bien: PG_HOST PG_PORT PG_USER PG_PASSWORD PG_DATABASE
#
# EJEMPLOS
#   source /home/dsh/workspace/gcp-env.sh
#   bash backend/scripts/reiniciar-plataforma.sh --check            # diagnóstico
#   bash backend/scripts/reiniciar-plataforma.sh --confirmar --respaldo  # ejecuta
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIRMAR=0
HACER_RESPALDO=0
SOLO_CHECK=0

for arg in "$@"; do
  case "$arg" in
    --confirmar) CONFIRMAR=1 ;;
    --respaldo)  HACER_RESPALDO=1 ;;
    --check)     SOLO_CHECK=1 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "❌ Argumento desconocido: $arg (usa --help)" >&2; exit 1 ;;
  esac
done

# ---- 1. Resolver DSN ---------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -n "${PG_HOST:-}" ] && [ -n "${PG_USER:-}" ]; then
    PG_PORT="${PG_PORT:-5432}"
    PG_DATABASE="${PG_DATABASE:-postgres}"
    export DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD:-}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}"
  else
    echo "❌ Sin conexión: define DATABASE_URL o PG_HOST/PG_USER/PG_PASSWORD/PG_DATABASE." >&2
    echo "   Sugerencia: source /home/dsh/workspace/gcp-env.sh" >&2
    exit 1
  fi
fi

echo "🛢  BD objetivo: ${DATABASE_URL//:*@/:***@}"

# ---- 2. Modo --check (diagnóstico, no borra nada) ----------------------------
if [ "$SOLO_CHECK" = "1" ]; then
  echo "🔍 Modo diagnóstico: consulta tablas y conteos (sin borrar)."
  node "$SCRIPT_DIR/reiniciar-plataforma.mjs" --check
  exit $?
fi

# ---- 3. Confirmación explícita (seguridad) -----------------------------------
if [ "$CONFIRMAR" != "1" ]; then
  echo ""
  echo "⚠️  Este script BORRA TODOS los datos de la BD off-chain (14 tablas)."
  echo "    No reinicia anvil ni redeploya contratos."
  echo ""
  echo "Para ejecutarlo de verdad usa:  bash $0 --confirmar [--respaldo]"
  echo "(Nada se ha modificado.)"
  exit 1
fi

echo ""
echo "🚨 VAS A BORRAR TODOS LOS REGISTROS DE LA BD OFF-CHAIN (reset total)."
echo "    Anvil y los contratos NO se tocan."
read -r -p "¿Escribir 'BORRAR' para confirmar? " respuesta
if [ "$respuesta" != "BORRAR" ]; then
  echo "Cancelado. Nada se modificó."
  exit 1
fi

# ---- 4. Respaldo opcional (mejor práctica) -----------------------------------
if [ "$HACER_RESPALDO" = "1" ]; then
  if command -v pg_dump >/dev/null 2>&1; then
    FECHA="$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$SCRIPT_DIR/backups"
    echo "📦 Creando respaldo previo: backups/truekeate-$FECHA.sql"
    pg_dump "$DATABASE_URL" > "$SCRIPT_DIR/backups/truekeate-$FECHA.sql"
  else
    echo "⚠️  pg_dump no está instalado: se omite el respaldo (usa --check antes si dudas)."
  fi
fi

# ---- 5. Ejecutar el motor de limpieza ----------------------------------------
echo "🧹 Ejecutando limpieza (TRUNCATE CASCADE de las 14 tablas + secuencias)…"
node "$SCRIPT_DIR/reiniciar-plataforma.mjs"
echo "✅ Plataforma limpia. Los servicios de anvil siguen intactos."
