# ============================================================================
# TrueKeate — Despliegue integral en Google Cloud (Cloud Run + Cloud SQL +
# nodo Foundry remoto), con manejo seguro de claves vía Secret Manager.
#
# Flujo:
#   1. Preflight (gcloud, proyecto, región, cuenta de servicio)
#   2. Secretos en Secret Manager (DATABASE_URL, RPC_URL, KYC_SECRET,
#      RELAYER_PRIVATE_KEY) — creados si faltan, NUNCA en git
#   3. Cloud SQL (instancia + base + usuario + PostGIS) — opcional (--skip-db)
#   4. Contratos en el nodo Foundry remoto (scripts/deploy-contracts-gcp.sh)
#   5. Build de la imagen web con las direcciones (Cloud Build)
#   6. Cloud Run deploy (secretos inyectados con --set-secrets)
#   7. Indexador como Cloud Run Job — opcional (--with-indexer)
#   8. Verificación post-despliegue
#
# Configuración (ver web/.env.gcp.example):
#   GCP_PROJECT_ID, GCP_REGION, CLOUDSQL_INSTANCE, GCP_SERVICE_ACCOUNT, GCP_IMAGE
#   RPC_URL, OWNER_PRIVATE_KEY, DB_APP_PASSWORD (para aprovisionar Cloud SQL)
#
# Uso:
#   ./deploy-gcp.sh [--skip-db] [--skip-contracts] [--with-indexer] [--preview]
# ============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

SKIP_DB=0; SKIP_CONTRACTS=0; WITH_INDEXER=0; PREVIEW=0; FORCE_CONTRACTS=0
for arg in "$@"; do
  case "$arg" in
    --skip-db) SKIP_DB=1 ;;
    --skip-contracts) SKIP_CONTRACTS=1 ;;
    --with-indexer) WITH_INDEXER=1 ;;
    --preview) PREVIEW=1 ;;
    --force-contracts) FORCE_CONTRACTS=1 ;;
    *) echo "⚠️  Argumento desconocido: $arg" ;;
  esac
done

# ---------------------------------------------------------------- configuración
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="${GCP_REGION:-us-central1}"
CLOUDSQL_INSTANCE="${CLOUDSQL_INSTANCE:-}"
SERVICE_ACCOUNT="${GCP_SERVICE_ACCOUNT:-}"
# Q8/H-13: referencias de imagen UNIFICADAS en Artifact Registry regional
# (mismo repositorio que usan los cloudbuilds; evita el footgun gcr.io vs AR).
IMAGE="${GCP_IMAGE:-southamerica-east1-docker.pkg.dev/$PROJECT_ID/truekeate-repo/truekeate-web:latest}"
INDEXER_IMAGE="${GCP_INDEXER_IMAGE:-southamerica-east1-docker.pkg.dev/$PROJECT_ID/truekeate-repo/truekeate-indexer:latest}"
RPC_URL="${RPC_URL:-}"

command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud no instalado."; exit 1; }

echo "================================================================="
echo "  ☁️  TRUEKEATE — DESPLIEGUE EN GOOGLE CLOUD"
echo "================================================================="

# ---------------------------------------------------------------- preflight
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null | tr -d '\n' || true)"
fi
if [ -z "$PROJECT_ID" ]; then
  echo "❌ Define GCP_PROJECT_ID o ejecuta: gcloud config set project <ID>"
  exit 1
fi
echo "✓ Proyecto: $PROJECT_ID | Región: $REGION"
gcloud config set project "$PROJECT_ID" >/dev/null 2>&1 || true

# ---------------------------------------------------------------- 2. secretos
echo ""
echo "🔐 [1/7] Garantizando secretos en Secret Manager..."
ensure_secret() {
  local name="$1" value="$2"
  if gcloud secrets describe "$name" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  ✓ $name ya existe (no se sobrescribe)."
    return 0
  fi
  if [ -z "$value" ]; then
    echo "  ⚠️  No se pudo determinar el valor de $name (env o SM)."
    return 1
  fi
  # Los secretos no llevan whitespace: se elimina cualquier \r\n residual
  # (evita URLs/claves rotas por valores creados con echo/heredoc).
  value="$(printf '%s' "$value" | tr -d '\r\n')"
  printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --project="$PROJECT_ID" >/dev/null
  echo "  ✓ $name creado en Secret Manager."
}

KYC_SECRET="${KYC_SECRET:-$(openssl rand -hex 32 2>/dev/null || true)}"
ensure_secret KYC_SECRET "$KYC_SECRET" || true

RELAYER_KEY="${RELAYER_PRIVATE_KEY:-}"
ensure_secret RELAYER_PRIVATE_KEY "$RELAYER_KEY" || true
ensure_secret RPC_URL "$RPC_URL" || true

# DATABASE_URL (socket Unix de Cloud SQL para Cloud Run)
if [ -n "$CLOUDSQL_INSTANCE" ]; then
  DB_APP_PASSWORD="${DB_APP_PASSWORD:-}"
  if [ -n "$DB_APP_PASSWORD" ]; then
    ensure_secret DATABASE_URL "postgres://app:${DB_APP_PASSWORD}@/truekeate?host=/cloudsql/${CLOUDSQL_INSTANCE}" || true
  else
    echo "  ⚠️  DB_APP_PASSWORD vacío: DATABASE_URL no se crea automáticamente."
  fi
else
  echo "  ⚠️  CLOUDSQL_INSTANCE vacío: crea DATABASE_URL manualmente en Secret Manager."
fi

# ---------------------------------------------------------------- 3. Cloud SQL
if [ "$SKIP_DB" = "0" ] && [ -n "$CLOUDSQL_INSTANCE" ]; then
  echo ""
  echo "🐘 [2/7] Aprovisionando Cloud SQL (PostgreSQL 15 + PostGIS)..."
  INSTANCE_NAME="$(basename "$CLOUDSQL_INSTANCE")"
  if ! gcloud sql instances describe "$INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1; then
    echo "  Creando instancia $INSTANCE_NAME (SSL obligatorio)..."
    gcloud sql instances create "$INSTANCE_NAME" \
      --database-version=POSTGRES_15 \
      --tier="${DB_TIER:-db-f1-micro}" \
      --region="$REGION" \
      --require-ssl \
      --backup-start-time=02:00 >/dev/null
  fi
  gcloud sql databases create truekeate --instance="$INSTANCE_NAME" --project="$PROJECT_ID" >/dev/null 2>&1 || \
    echo "  (base truekeate ya existe)"
  if [ -n "$DB_APP_PASSWORD" ]; then
    gcloud sql users create app --instance="$INSTANCE_NAME" --password="$DB_APP_PASSWORD" --project="$PROJECT_ID" >/dev/null 2>&1 || \
      echo "  (usuario app ya existe)"
  fi
  echo "  ✓ Instancia Cloud SQL lista: $CLOUDSQL_INSTANCE"
  echo "  ℹ️  Habilita PostGIS/esquema con: DATABASE_URL=... node web/scripts/setup-gcp-db.mjs"
  echo "     (o gcloud sql connect $INSTANCE_NAME --user=postgres --command='CREATE EXTENSION IF NOT EXISTS postgis;')"
fi

# ------------------------------------------------- coherencia BD global (no-destrucción)
# Verifica que el DATABASE_URL de Secret Manager apunte a la instancia Cloud SQL
# esperada. Si apunta a otra, se advierte: NO se crea ni se toca la otra BD.
if [ -n "$CLOUDSQL_INSTANCE" ] && gcloud secrets describe DATABASE_URL --project="$PROJECT_ID" >/dev/null 2>&1; then
  DB_URL_SECRET="$(gcloud secrets versions access latest --secret=DATABASE_URL --project="$PROJECT_ID" 2>/dev/null | tr -d '\r\n' || true)"
  if [ -n "$DB_URL_SECRET" ] && [ "${DB_URL_SECRET#*host=/cloudsql/$CLOUDSQL_INSTANCE}" = "$DB_URL_SECRET" ]; then
    echo ""
    echo "⚠️  AVISO: el DATABASE_URL en Secret Manager NO apunta a $CLOUDSQL_INSTANCE."
    echo "    El despliegue NO creará ni modificará otras bases de datos."
    echo "    Revisa el secreto antes de continuar (el indexador y la web usan ese DATABASE_URL)."
  fi
fi

# ---------------------------------------------------------------- 4. contratos
if [ "$SKIP_CONTRACTS" = "0" ]; then
  echo ""
  echo "⛓️ [3/7] Desplegando contratos en el nodo Foundry remoto..."
  if [ -z "$RPC_URL" ]; then
    echo "❌ RPC_URL requerida para desplegar contratos (usa --skip-contracts si ya están desplegados)."
    exit 1
  fi
  # Salvaguarda: si ya hay contratos desplegados (web/.env.gcp), NO re-desplegar
  # por accidente: `forge create` duplicaría contratos en el nodo compartido
  # (otros proyectos usan los servicios globales). Requiere --force-contracts.
  if [ -f "$ROOT/web/.env.gcp" ] && [ "$FORCE_CONTRACTS" = "0" ]; then
    echo "⚠️  web/.env.gcp ya existe (contratos ya desplegados en el nodo global)."
    echo "    Re-desplegar contratos crearía DUPLICADOS en el servicio compartido."
    if [ -t 0 ]; then
      read -r -p "    ¿Re-desplegar contratos de todos modos? [s/N] " ans
      case "$ans" in
        s|S|y|Y) ;;
        *) echo "    Omitiendo contratos. Usa --force-contracts para forzar."; SKIP_CONTRACTS=1 ;;
      esac
    else
      echo "    Omitiendo contratos (modo no interactivo). Usa --force-contracts para forzar."
      SKIP_CONTRACTS=1
    fi
  fi
  if [ "$SKIP_CONTRACTS" = "1" ]; then
    [ -f "$ROOT/web/.env.gcp" ] || { echo "❌ web/.env.gcp no existe (despliega contratos antes)."; exit 1; }
  else
    CONTRACTS_ARGS=""
    [ "$PREVIEW" = "1" ] && CONTRACTS_ARGS="--allow-anvil-keys"
    RPC_URL="$RPC_URL" OWNER_PRIVATE_KEY="${OWNER_PRIVATE_KEY:-}" \
      bash "$ROOT/scripts/deploy-contracts-gcp.sh" $CONTRACTS_ARGS
  fi
else
  echo ""
  echo "⛓️ [3/7] Omitiendo despliegue de contratos (--skip-contracts)."
  [ -f "$ROOT/web/.env.gcp" ] || { echo "❌ web/.env.gcp no existe (despliega contratos antes)."; exit 1; }
fi

# Cargar direcciones públicas (web/.env.gcp)
set -a; . "$ROOT/web/.env.gcp"; set +a

# ---------------------------------------------------------------- 5. build imagen web
echo ""
echo "📦 [4/7] Build de la imagen web (Cloud Build) con direcciones de contratos..."
SUBSTS="_ESCROW=${NEXT_PUBLIC_ESCROW_ADDRESS},_REGISTRY=${NEXT_PUBLIC_USER_REGISTRY_ADDRESS},_EXCHANGE=${NEXT_PUBLIC_EXCHANGE_ADDRESS},_GOVERNANCE=${NEXT_PUBLIC_GOVERNANCE_ADDRESS},_SUBSCRIPTION=${NEXT_PUBLIC_SUBSCRIPTION_ADDRESS},_TKA=${NEXT_PUBLIC_TOKEN_A_ADDRESS},_TKB=${NEXT_PUBLIC_TOKEN_B_ADDRESS},_USDT=${NEXT_PUBLIC_USDT_ADDRESS},_DELIVERY=${NEXT_PUBLIC_DELIVERY_ADDRESS},_BRLT=${NEXT_PUBLIC_BRLT_ADDRESS},_SBT_REGISTRY=${NEXT_PUBLIC_SBT_REGISTRY_ADDRESS},_TRUEKE_SBT=${NEXT_PUBLIC_TRUEKE_SBT_ADDRESS},_TRUEKE_RWA=${NEXT_PUBLIC_TRUEKE_RWA_ADDRESS},_TRUEKE_SERVICE=${NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS},_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-31337},_RPC_URL=${NEXT_PUBLIC_RPC_URL:-$RPC_URL}"
gcloud builds submit --config "$ROOT/scripts/cloudbuild.yaml" \
  --substitutions="$SUBSTS" \
  --project="$PROJECT_ID" "$ROOT/web"
echo "✓ Imagen publicada: $IMAGE"

# ---------------------------------------------------------------- 6. Cloud Run
echo ""
echo "🚀 [5/7] Desplegando Cloud Run (truekeate-web)..."
RUN_ARGS=(
  deploy truekeate-web
  --image "$IMAGE"
  --region "$REGION"
  --project "$PROJECT_ID"
  --allow-unauthenticated
  --min-instances=0
  --max-instances=2
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,RPC_URL=RPC_URL:latest,KYC_SECRET=KYC_SECRET:latest,RELAYER_PRIVATE_KEY=RELAYER_PRIVATE_KEY:latest"
)
if [ -n "$SERVICE_ACCOUNT" ]; then
  RUN_ARGS+=(--service-account "$SERVICE_ACCOUNT")
fi
if [ -n "$CLOUDSQL_INSTANCE" ]; then
  RUN_ARGS+=(--add-cloudsql-instances "$CLOUDSQL_INSTANCE")
fi
# Direcciones públicas también en runtime (las lee el bundle del servidor)
PUBLIC_ENV="NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID:-31337}"
for v in ESCROW USER_REGISTRY EXCHANGE GOVERNANCE SUBSCRIPTION TOKEN_A TOKEN_B USDT DELIVERY BRLT SBT_REGISTRY TRUEKE_SBT TRUEKE_RWA TRUEKE_SERVICE; do
  val="$(eval echo "\${NEXT_PUBLIC_${v}_ADDRESS:-}")"
  [ -n "$val" ] && PUBLIC_ENV="$PUBLIC_ENV,NEXT_PUBLIC_${v}_ADDRESS=$val"
done
[ -n "${NEXT_PUBLIC_RPC_URL:-}" ] && PUBLIC_ENV="$PUBLIC_ENV,NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL}"
RUN_ARGS+=(--set-env-vars "$PUBLIC_ENV")
gcloud run "${RUN_ARGS[@]}"

SERVICE_URL="$(gcloud run services describe truekeate-web --region="$REGION" --project="$PROJECT_ID" --format='value(status.url)')"
echo "✓ Web desplegada: $SERVICE_URL"

# ---------------------------------------------------------------- 7. indexador
if [ "$WITH_INDEXER" = "1" ]; then
  echo ""
  echo "⚙️ [6/7] Build e indexador (Cloud Run Job)..."
  gcloud builds submit --config "$ROOT/scripts/cloudbuild-indexer.yaml" \
    --project="$PROJECT_ID" "$ROOT"
  JOB_ARGS=(
    jobs create truekeate-indexer
    --image "$INDEXER_IMAGE"
    --region "$REGION"
    --project "$PROJECT_ID"
    --task-timeout=30m
    --max-retries=0
    --set-secrets="DATABASE_URL=DATABASE_URL:latest,RPC_URL=RPC_URL:latest,KYC_SECRET=KYC_SECRET:latest"
  )
  [ -n "$SERVICE_ACCOUNT" ] && JOB_ARGS+=(--service-account "$SERVICE_ACCOUNT")
  [ -n "$CLOUDSQL_INSTANCE" ] && JOB_ARGS+=(--add-cloudsql-instances "$CLOUDSQL_INSTANCE")
  gcloud run "${JOB_ARGS[@]}" >/dev/null 2>&1 || \
    gcloud run jobs update truekeate-indexer --region="$REGION" --project="$PROJECT_ID" --image "$INDEXER_IMAGE" >/dev/null
  echo "  ✓ Job del indexador listo. Ejecutar: gcloud run jobs execute truekeate-indexer --region=$REGION --project=$PROJECT_ID --wait"
fi

# ---------------------------------------------------------------- 8. verificación
echo ""
echo "✅ [7/7] Verificación post-despliegue..."
sleep 5
if command -v curl >/dev/null 2>&1 && [ -n "${SERVICE_URL:-}" ]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$SERVICE_URL" || echo '000')"
  echo "  Landing: HTTP $code ($SERVICE_URL)"
  code2="$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$SERVICE_URL/api/stats" || echo '000')"
  echo "  /api/stats: HTTP $code2"
fi

echo ""
echo "================================================================="
echo "  🎉 TRUEKEATE DESPLEGADO EN GCP"
echo "  Web:       ${SERVICE_URL:-<ver gcloud run services describe truekeate-web>}"
echo "  Contratos: deployment-info-gcp.txt"
echo "  Secretos:  Secret Manager (proyecto $PROJECT_ID)"
echo "-----------------------------------------------------------------"
echo "  🔒 SERVICIOS GLOBALES INTACTOS (no-destrucción):"
echo "     - Cloud SQL: NO se recrea/borra (solo CREATE TABLE IF NOT EXISTS)."
echo "     - Nodo Foundry: NO se reinicia (solo transacciones de contratos)."
echo "     - Secret Manager: NO se sobrescribe (los existentes se conservan)."
echo "     - El proyecto usa SIEMPRE PostgreSQL global (fail-fast si no)."
echo "================================================================="
