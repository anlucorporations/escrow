# Guía de Despliegue en Google Cloud (M14) — v2 (Secret Manager + Cloud Run)

> Entorno remoto de TrueKeate: preview de desarrollo usando los servicios
> globales de la cuenta GCP (**Foundry** como nodo RPC + **PostgreSQL Cloud SQL**).
> Acceso público restringido solo a los servicios necesarios.

## Arquitectura objetivo en GCP

| Servicio | Uso |
|---|---|
| **Cloud Run** | API + Web (Next.js standalone) — `truekeate-web` |
| **Cloud SQL (PostgreSQL 15 + PostGIS)** | Capa de datos (indexador + catálogo + reputación) |
| **Secret Manager** | `DATABASE_URL`, `RPC_URL`, `KYC_SECRET`, `RELAYER_PRIVATE_KEY` |
| **Nodo Foundry/Anvil remoto** | Blockchain de referencia (única fuente de verdad) |
| **Cloud Run Jobs** | Indexador de eventos (opcional, `--with-indexer`) |
| **Cloud Build / Artifact Registry** | Imágenes del contenedor |

## 🚀 Despliegue automatizado (nuevo flujo)

```bash
# 1) Configurar el entorno (ver web/.env.gcp.example)
export GCP_PROJECT_ID=truekeate-main
export GCP_REGION=us-central1
export CLOUDSQL_INSTANCE=truekeate-main:us-central1:truekeate-db-prod
export GCP_SERVICE_ACCOUNT=truekeate-app-sa@truekeate-main.iam.gserviceaccount.com
export RPC_URL=http://<IP-DEL-NODO-FOUNDRY>:8545          # nodo remoto GCP
export OWNER_PRIVATE_KEY=0x...                            # clave del deployer
export DB_APP_PASSWORD='<CLAVE_SEGURA_64_CHARS>'          # usuario app de Cloud SQL

# 2) Desplegar todo (secretos + Cloud SQL + contratos + Cloud Run)
./deploy-gcp.sh --with-indexer

# 3) Solo contratos al nodo remoto (si ya tienes la infra)
RPC_URL=... OWNER_PRIVATE_KEY=... ./scripts/deploy-contracts-gcp.sh

# 4) Solo infra de BD (PostGIS + esquema) — ver sección 2
```

### Flags de `deploy-gcp.sh`
| Flag | Efecto |
|---|---|
| `--skip-db` | No aprovisiona Cloud SQL (espera instancia existente) |
| `--skip-contracts` | Usa `web/.env.gcp` existente (contratos ya desplegados) |
| `--with-indexer` | Además crea el job del indexador en Cloud Run Jobs |
| `--preview` | Entorno de preview remoto: permite claves por defecto de Anvil |

## 🔐 Manejo de claves e información sensible (condiciones GCP)

> **Política (implementada en `web/server/secrets.js`):**
> - Ninguna clave privada está hardcodeada en el código. Se eliminan todos los
>   fallbacks inseguros: `KYC_SECRET` y `RELAYER_PRIVATE_KEY` **fallan al
>   arrancar** si faltan en producción (fail-fast).
> - Los secretos se inyectan en runtime vía **Secret Manager**
>   (`--set-secrets` en Cloud Run). La imagen Docker NO contiene claves.
> - En entornos GCP sin inyección (jobs/VM), `secrets.js` consulta Secret
>   Manager por la metadata server; en desarrollo local se usa `gcloud` si
>   `USE_GCLOUD_SECRETS=true`.
> - Las claves por defecto de Anvil están **bloqueadas** en
>   `scripts/deploy-contracts-gcp.sh` (aborta salvo `--allow-anvil-keys`, solo
>   preview de desarrollo remoto).
> - Los scripts locales de BD (`init-pg.js`, `create-truekeate-db.mjs`,
>   `test-local-db.mjs`) ya no contienen credenciales: leen `ADMIN_DATABASE_URL`
>   y `DATABASE_URL` del entorno.

### Secretos gestionados
| Secreto | Generación |
|---|---|
| `KYC_SECRET` | `openssl rand -hex 32` (auto-generado por `deploy-gcp.sh`) |
| `RELAYER_PRIVATE_KEY` | Clave ECDSA del relayer (debe estar financiada) |
| `DATABASE_URL` | `postgres://app:<CLAVE>@/truekeate?host=/cloudsql/<INSTANCIA>` |
| `RPC_URL` | Endpoint del nodo Foundry remoto |

```bash
# Manual (si prefieres no usar deploy-gcp.sh)
printf 'postgres://app:...' | gcloud secrets create DATABASE_URL --data-file=-
printf '0x<CLAVE_RELAYER>'   | gcloud secrets create RELAYER_PRIVATE_KEY --data-file=-
printf '<KYC_SECRET_LARGO>'  | gcloud secrets create KYC_SECRET --data-file=-
printf 'http://<NODO>:8545'  | gcloud secrets create RPC_URL --data-file=-
```

> ⚠️ NUNCA uses las claves por defecto de Anvil en producción.

## 1. Requisitos

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>
gcloud services enable run.googleapis.com sqladmin.googleapis.com \
  secretmanager.googleapis.com artifactregistry.googleapis.com \
  cloudbuild.googleapis.com vpcaccess.googleapis.com compute.googleapis.com
```

## 2. Cloud SQL (PostgreSQL + PostGIS)

`deploy-gcp.sh` crea la instancia (SSL obligatorio), la base `truekeate` y el
usuario `app`. Para habilitar PostGIS y el esquema:

```bash
# Opción A — desde tu máquina con IP pública autorizada:
DATABASE_URL="postgres://app:<CLAVE>@<IP>:5432/truekeate?sslmode=require" \
  node web/scripts/setup-gcp-db.mjs

# Opción B — consola de gcloud:
gcloud sql connect <INSTANCIA> --user=postgres --quiet \
  --command="CREATE EXTENSION IF NOT EXISTS postgis;"
```

La app se conecta por **socket Unix** (privado, sin TLS necesario):
```
DATABASE_URL=postgres://app:<CLAVE>@/truekeate?host=/cloudsql/PROYECTO:REGION:INSTANCIA
```
Soporta también IP pública con `?sslmode=require` (ver `pgSslFromUrl` en
`web/server/db.js`).

## 3. Despliegue de contratos al nodo Foundry remoto

```bash
RPC_URL=http://<IP-NODO>:8545 OWNER_PRIVATE_KEY=0x... \
  ./scripts/deploy-contracts-gcp.sh [--full-matrix] [--fund-relayer]
```

- Compila con Foundry, despliega los 14 contratos, cablea el owner
  (árbitro, tesorería, tokens, SBT) y escribe las direcciones en
  `web/.env.gcp` (públicas) y `deployment-info-gcp.txt`.
- `--full-matrix` registra la matriz de roles (requiere
  `ACCOUNT_PRIVATE_KEYS` CSV con las claves 1..6).
- `--fund-relayer` financia el relayer con `anvil_setBalance` (solo chain 31337).

## 4. Variables de entorno de la app

| Variable | Origen |
|---|---|
| `DATABASE_URL`, `RPC_URL`, `KYC_SECRET`, `RELAYER_PRIVATE_KEY` | Secret Manager (`--set-secrets`) |
| `NEXT_PUBLIC_*_ADDRESS`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL` | Build-time (ARG del Dockerfile) + runtime (`--set-env-vars`) |

## 5. Build y despliegue en Cloud Run

`deploy-gcp.sh` orquesta:
1. `gcloud builds submit --config scripts/cloudbuild.yaml web/` con las
   direcciones como substitutions (se hornean en el bundle del cliente).
2. `gcloud run deploy truekeate-web` con `--set-secrets`,
   `--add-cloudsql-instances` y `--service-account`.

Dockerfiles: `web/Dockerfile` (web standalone, incluye `pg` vía
`outputFileTracingIncludes`) y `web/Dockerfile.indexer` (indexador).

## 6. Indexador y Relayer

```bash
# Job del indexador (creado con --with-indexer):
gcloud run jobs execute truekeate-indexer --region=<REGION> --project=<PROJECT_ID> --wait

# Relayer: parte de la API (POST /api/relay) con RELAYER_PRIVATE_KEY
# desde Secret Manager. Fail-fast si falta en producción.
```

## 7. Restricción de acceso

- Cloud Run expone la landing y el catálogo (público de solo lectura).
  Las escrituras van firmadas (EIP-712) o protegidas por el relayer.
- Cloud SQL: SSL obligatorio, sin IP pública por defecto (socket Unix/VPC).
- Secret Manager: acceso solo a `truekeate-app-sa`
  (`roles/secretmanager.secretAccessor`).
- Nodo RPC Foundry: restringido por firewall a las IPs de GCP
  (y a tu IP de administración para desplegar contratos).

## 8. Verificación post-despliegue

```bash
curl https://<SERVICE_URL>/            # landing pública
curl https://<SERVICE_URL>/api/stats   # API + BD (PostgreSQL vía socket)
# Probar /api/relay con una intención firmada (ver README_CASO_PRACTICO)
```

## 9. Idempotencia y no-destrucción de servicios globales

> El nodo Foundry y Cloud SQL son **servicios globales compartidos** (otros
> proyectos se conectan a ellos). `deploy-gcp.sh` está diseñado para **no
> reiniciarlos ni modificarlos** al desplegar o re-desplegar:

| Recurso | Comportamiento del despliegue |
|---|---|
| **Cloud SQL (instancia/BD/usuario)** | Solo se crea si NO existe (`gcloud sql instances describe` / `create` guardado). Las tablas usan `CREATE TABLE/INDEX IF NOT EXISTS` y `ALTER TABLE` solo si la columna falta. Nunca se borra ni se recrea. |
| **Nodo Foundry remoto** | No se reinicia ni se apaga. Solo recibe transacciones de despliegue de contratos. |
| **Secret Manager** | `ensure_secret` **no sobrescribe** secretos existentes (solo crea los que faltan). |
| **Contratos en el nodo** | Si `web/.env.gcp` ya existe, `deploy-gcp.sh` **omite el re-despliegue** (evita duplicados en el nodo compartido) salvo confirmación explícita o `--force-contracts`. |
| **Job indexador** | `jobs create ... || jobs update` — idempotente. El backfill usa upserts (`ON CONFLICT DO UPDATE`), no duplica datos. |

### Garantía de uso del servicio global de BD (fail-fast)

En producción (`NODE_ENV=production`) el proyecto **solo** acepta PostgreSQL
global (Cloud SQL): si `DATABASE_URL` no es `postgres://...` (o falta), la app
y el indexador **fallan al arrancar** en lugar de caer silenciosamente a una
SQLite local efímera. Guard: `assertProdDatabase()` en `web/server/db.js`,
invocado por `initSchema()` y por `scripts/indexer.mjs`. SQLite queda
exclusivamente para desarrollo local.

> Todos los cambios de infraestructura GCP requieren autorización previa
> (según escrow-TrueKeate.md: "se solicitara autorizacion para la creacion o
> despliege de servicios globales").
