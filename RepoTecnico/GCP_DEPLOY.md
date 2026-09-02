# Guía de Despliegue en Google Cloud (M14)

> Entorno remoto de TrueKeate: preview de desarrollo usando los servicios
> globales de la cuenta GCP (Foundry + PostgreSQL). Acceso público restringido
> solo a los servicios necesarios.

## Arquitectura objetivo en GCP

| Servicio | Uso |
|---|---|
| **Cloud Run** | API + Web (Next.js standalone) |
| **Cloud SQL (PostgreSQL + PostGIS)** | Capa de datos (indexador + catálogo + reputación) |
| **Secret Manager** | Claves privadas, `KYC_SECRET`, `RELAYER_PRIVATE_KEY`, `DATABASE_URL` |
| **Cloud Scheduler** | (Opcional) tareas periódicas: refresco de niveles, suscripciones |
| **Artifact Registry** | Imágenes del contenedor de la app |

La blockchain de referencia (Anvil remoto o red L2) es la única fuente de
verdad; PostgreSQL es la capa de lectura impulsada por eventos (indexador).

## 1. Requisitos

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com sqladmin.googleapis.com secretmanager.googleapis.com artifactregistry.googleapis.com
```

## 2. Cloud SQL (PostgreSQL + PostGIS)

```bash
gcloud sql instances create truekeate-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create truekeate --instance=truekeate-db
gcloud sql users create app --instance=truekeate-db --password='<GENERA_UNA_CLAVE>'

# Extensión PostGIS (regla de <= 10 km en SQL)
gcloud sql connect truekeate-db --user=postgres --quiet \
  --command="CREATE EXTENSION IF NOT EXISTS postgis;"
```

Genera la cadena de conexión (usa Cloud SQL Auth Proxy en desarrollo):

```
DATABASE_URL=postgres://app:<CLAVE>@<IP_O_PROXY>:5432/truekeate
```

## 3. Secret Manager

```bash
printf 'postgres://app:...' | gcloud secrets create DATABASE_URL --data-file=-
printf '0x<CLAVE_RELAYER>'   | gcloud secrets create RELAYER_PRIVATE_KEY --data-file=-
printf '<KYC_SECRET_LARGO>'  | gcloud secrets create KYC_SECRET --data-file=-
printf 'http://<ANVIL_REMOTO>:8545' | gcloud secrets create RPC_URL --data-file=-
```

> ⚠️ NUNCA uses las claves por defecto de Anvil en producción.

## 4. Variables de entorno de la app

```
NEXT_PUBLIC_ESCROW_ADDRESS=0x...
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0x...
RPC_URL=...                    # desde Secret Manager
DATABASE_URL=...               # desde Secret Manager
KYC_SECRET=...                 # desde Secret Manager
RELAYER_PRIVATE_KEY=...        # desde Secret Manager
```

## 5. Build y despliegue en Cloud Run

```bash
# Build del frontend (Next.js standalone)
cd web
npm ci
npm run build

# Dockerfile (ejemplo mínimo)
cat > Dockerfile <<'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY web/package*.json ./web/
RUN cd web && npm ci
COPY web ./web
RUN cd web && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./web/.next/static
COPY --from=builder /app/web/public ./web/public
ENV PORT=8080 HOSTNAME=0.0.0.0
EXPOSE 8080
CMD ["node", "web/server.js"]
EOF

gcloud builds submit --tag gcr.io/<PROJECT_ID>/truekeate
gcloud run deploy truekeate \
  --image gcr.io/<PROJECT_ID>/truekeate \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_ESCROW_ADDRESS=...,NEXT_PUBLIC_USER_REGISTRY_ADDRESS=...,NEXT_PUBLIC_GOVERNANCE_ADDRESS=..." \
  --set-secrets="RPC_URL=DATABASE_URL:1,RELAYER_PRIVATE_KEY:1,KYC_SECRET:1" \
  --min-instances=0 --max-instances=2
```

## 6. Indexador y Relayer

Se pueden ejecutar como un segundo servicio (Cloud Run con tarea) o una VM:

```bash
# Tarea manual (o Cloud Run Jobs)
cd web
node scripts/indexer.mjs        # DATABASE_URL + RPC_URL configurados
```

El relayer es parte de la API (`POST /api/relay`) usando `RELAYER_PRIVATE_KEY`.

## 7. Restricción de acceso

- El servicio de Cloud Run se expone como **público de solo lectura** (landing
  y catálogo). Las escrituras van firmadas por los usuarios (EIP-712) o
  protegidas por la lógica del relayer.
- Cloud SQL: **sin IP pública** (solo conexión privada o Auth Proxy).
- Secret Manager: acceso solo a las cuentas de servicio de Cloud Run.
- El RPC de Anvil remoto: restringido por firewall a las IPs de GCP.

## 8. Verificación post-despliegue

```bash
curl https://<SERVICE_URL>/api/stats
curl https://<SERVICE_URL>/            # landing pública
# Probar /api/relay con una intención firmada (ver README_CASO_PRACTICO)
```

> Todos los cambios de infraestructura GCP requieren autorización previa
> (según escrow-TrueKeate.md: "se solicitara autorizacion para la creacion o
> despliege de servicios globales").
