# Registro Maestro — Repositorios, Despliegue (Local y GCP) y Manejo de Claves Sensibles

> **Plataforma:** TrueKeate Escrow & Web3 RWA / SBT Marketplace  
> **Fecha de Actualización:** 27 de Agosto de 2026  
> **Estado de la Plataforma:** Producción / Staging Ready  

---

## 🌐 1. Repositorios de Código y Ramas de Trabajo

### 📌 Repositorios Oficiales Activos

| Plataforma | URL del Repositorio | Rama de Trabajo Oficial | Propósito |
| :--- | :--- | :---: | :--- |
| 🦊 **GitLab** | `https://gitlab.com/anlucorporations/escrow` | `escrow-Antigravity` | Repositorio principal de desarrollo y CI/CD. |
| 🐙 **GitHub** | `https://github.com/anlucorporations/escrow` | `escrow-Antigravity` | Espejo sincronizado (Mirror) y distribución pública. |

> [!CAUTION]
> **REPOSITORIO EXCLUIDO / RESTRINGIDO:**  
> `https://gitlab.codecrypto.academy/anlucorporations` está **estrictamente excluido**. No se debe realizar ningún `git push` a este destino.

### 🔄 Configuración de Remotos en Git

```bash
# Verificación de remotos
git remote -v

# origin (GitLab + GitHub sincronizados):
# fetch: https://gitlab.com/anlucorporations/escrow.git
# push:  https://gitlab.com/anlucorporations/escrow.git
# push:  https://github.com/anlucorporations/escrow.git

# Comando de subida sincronizada a la rama oficial:
git checkout escrow-Antigravity
git push origin escrow-Antigravity
```

---

## 💻 2. Guía de Despliegue en Entorno Local (Desarrollo & Testing)

El entorno local permite ejecutar la suite de contratos inteligentes sobre un nodo blockchain Anvil, junto con la base de datos SQLite y la aplicación Next.js.

### 🛠️ Prerrequisitos
- **Node.js** v20.x o superior (`node -v`)
- **Foundry** (`anvil`, `forge`, `cast` instalados)
- **Git**

### 🚀 Despliegue Automatizado (Un Solo Paso)

#### En Windows (PowerShell):
```powershell
.\deploy-local.ps1
```

#### En Linux / macOS (Bash):
```bash
chmod +x deploy-local.sh
./deploy-local.sh
```

#### Multiplataforma (Python):
```bash
python deploy-local.py
```

### 📋 Servicios Locales y Puertos

| Servicio | URL / Endpoint | Descripción |
| :--- | :--- | :--- |
| **Nodo Blockchain Anvil** | `http://127.0.0.1:8545` | Cadena EVM local (Chain ID: `31337`). |
| **Frontend & API Next.js** | `http://localhost:3000` | Interfaz Velvety + Endpoints `/api/*`. |
| **Indexador de Eventos** | Proceso en segundo plano | Sincroniza eventos de Smart Contracts a la BD local (`npm run indexer`). |
| **Base de Datos Local** | `web/server/truekeate.db` | Base de datos SQLite portable idempotente. |

### 🧪 Ejecución de Pruebas Unitarias

```bash
# 1. Pruebas de Smart Contracts (Foundry - 74 tests):
cd sc
forge test -vvv

# 2. Pruebas de Frontend, Identidad y APIs (Vitest - 40 tests):
cd ../web
npm test
```

---

## ☁️ 3. Guía de Despliegue en Google Cloud Platform (GCP) — Proyecto TrueKeate

### 🏢 Parámetros del Proyecto en GCP
- **Cuenta Administradora:** `anlucorporations@gmail.com`
- **Nombre del Proyecto:** `TrueKeate`
- **ID Sugerido:** `truekeate-main` (o `truekeate-app-2026`)
- **Cuenta de Facturación (Billing Account):** `013B00-B9A67C-014A43` (Estado: Activa/Abierta)
- **Región Principal:** `us-central1` (o `southamerica-east1`)

---

### 🛡️ Arquitectura de Seguridad en la Nube

```mermaid
graph TD
    subgraph Google Cloud Platform
        SM[Secret Manager]
        SA[Service Account: truekeate-app-sa]
        CR[Cloud Run: TrueKeate App]
        SQL[(Cloud SQL: PostgreSQL 15 + PostGIS)]
        VPC[Serverless VPC Access]
        AnvilVM[Compute Engine / GKE: Nodo RPC Anvil / L2]
    end

    User[👤 Usuario Web3] -->|HTTPS TLS 1.3| CR
    CR -->|roles/secretmanager.secretAccessor| SM
    CR -->|Cloud SQL Auth Proxy / Unix Socket| SQL
    CR -->|VPC Privada| AnvilVM
    SA -.->|Asignación IAM| CR
```

---

### 📝 Pasos de Aprovisionamiento en GCP

#### Paso 1: Creación del Proyecto y Asociación de Facturación
```bash
# Crear proyecto
gcloud projects create truekeate-main --name="TrueKeate"

# Vincular cuenta de facturación
gcloud beta billing projects link truekeate-main --billing-account=013B00-B9A67C-014A43

# Establecer proyecto por defecto
gcloud config set project truekeate-main
```

#### Paso 2: Habilitar APIs Obligatorias
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  vpcaccess.googleapis.com \
  compute.googleapis.com \
  cloudbuild.googleapis.com
```

#### Paso 3: Aprovisionar Base de Datos Segura (Cloud SQL PostgreSQL + PostGIS)
```bash
# Crear instancia con SSL obligatorio y sin redes públicas abiertas
gcloud sql instances create truekeate-db-prod \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=us-central1 \
  --require-ssl \
  --backup-start-time=02:00 \
  --enable-point-in-time-recovery

# Crear base de datos y usuario de aplicación
gcloud sql databases create truekeate --instance=truekeate-db-prod
gcloud sql users create app --instance=truekeate-db-prod --password='<GENERAR_PASSWORD_SEGURO_64_CHARS>'

# Habilitar extensión PostGIS para validación geoespacial
gcloud sql connect truekeate-db-prod --user=postgres --quiet \
  --command="CREATE EXTENSION IF NOT EXISTS postgis;"
```

#### Paso 4: Crear Service Account con Principio de Mínimo Privilegio
```bash
# Crear Service Account
gcloud iam service-accounts create truekeate-app-sa \
  --description="Service account para la aplicacion TrueKeate en Cloud Run" \
  --display-name="TrueKeate App SA"

# Asignar roles mínimos necesarios
gcloud projects add-iam-policy-binding truekeate-main \
  --member="serviceAccount:truekeate-app-sa@truekeate-main.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding truekeate-main \
  --member="serviceAccount:truekeate-app-sa@truekeate-main.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding truekeate-main \
  --member="serviceAccount:truekeate-app-sa@truekeate-main.iam.gserviceaccount.com" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding truekeate-main \
  --member="serviceAccount:truekeate-app-sa@truekeate-main.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"
```

#### Paso 5: Despliegue en Cloud Run inyectando Secret Manager
```bash
gcloud run deploy truekeate-web \
  --image=gcr.io/truekeate-main/truekeate:latest \
  --region=us-central1 \
  --service-account=truekeate-app-sa@truekeate-main.iam.gserviceaccount.com \
  --set-secrets="DATABASE_URL=DATABASE_URL:latest,KYC_SECRET=KYC_SECRET:latest,RELAYER_PRIVATE_KEY=RELAYER_PRIVATE_KEY:latest,RPC_URL=RPC_URL:latest" \
  --add-cloudsql-instances=truekeate-main:us-central1:truekeate-db-prod \
  --allow-unauthenticated
```

---

## 🔑 4. Registro y Manejo de Claves Sensibles

### 🔐 Matriz de Secretos y Variables de Entorno (Producción / Secret Manager)

| Nombre del Secreto | Propósito Criptográfico | Nivel de Riesgo | Ubicación de Almacenamiento |
| :--- | :--- | :---: | :--- |
| **`KYC_SECRET`** | Clave simétrica de 256 bits para cifrar correos, teléfonos y secretos 2FA de usuarios con **AES-256-GCM**. | 🔴 Crítico | Secret Manager (`KYC_SECRET:latest`) |
| **`RELAYER_PRIVATE_KEY`** | Clave privada ECDSA del relayer para firmar meta-transacciones EIP-712 sin gas. | 🔴 Crítico | Secret Manager (`RELAYER_PRIVATE_KEY:latest`) |
| **`DATABASE_URL`** | Cadena de conexión cifrada hacia Cloud SQL PostgreSQL (`postgres://app:...@127.0.0.1:5432/truekeate`). | 🔴 Crítico | Secret Manager (`DATABASE_URL:latest`) |
| **`RPC_URL`** | Endpoint seguro de conexión al nodo blockchain (Anvil privado o red EVM L2). | 🟡 Alto | Secret Manager (`RPC_URL:latest`) |
| **`PINATA_JWT` / `IPFS_KEY`** | Token JWT para fijado (pinning) inmutable de metadatos RWA y Vouchers en IPFS. | 🟡 Alto | Secret Manager (`PINATA_JWT:latest`) |

> [!IMPORTANT]
> **POLÍTICA DE SEGURIDAD ABSOLUTA:**  
> Ninguna de estas claves debe guardarse en repositorios Git, archivos `.env` comprometidos o enviarse al cliente frontend. En producción, se inyectan en memoria exclusivamente a través de GCP Secret Manager.

---

### 🧪 Claves de Prueba para Desarrollo Local (Entorno Anvil)

> [!WARNING]
> Las siguientes cuentas son de **uso exclusivo en Anvil Local (Chain ID: 31337)**. **NUNCA** transferir fondos reales de mainnet a estas direcciones.

| Rol en Desarrollo | Dirección Pública (Wallet) | Clave Privada (Private Key) | Saldo Local |
| :--- | :--- | :--- | :---: |
| **Account #0 (Deployer / Owner / Admin)** | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | 10,000 ETH |
| **Account #1 (User 1 / Creador de Truekes)** | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | 10,000 ETH |
| **Account #2 (User 2 / Contraparte Swap)** | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | 10,000 ETH |
| **Account #3 (Socio / Árbitro de Mediación)** | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | 10,000 ETH |
| **Account #4 (Relayer EIP-712 Gasless)** | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b1002572a818a1fce93955708b30b47e921570e060a0007` | 10,000 ETH |

---

### 📜 Variables Públicas del Frontend (`.env.local` / Next.js)

Estas variables son públicas y necesarias para que la dApp interactúe con los contratos desplegados en la red:

```env
# Direcciones de Contratos Inteligentes Desplegados (Generadas por scripts de deploy)
NEXT_PUBLIC_ESCROW_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_USER_REGISTRY_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
NEXT_PUBLIC_SUBSCRIPTION_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
NEXT_PUBLIC_BRLT_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
NEXT_PUBLIC_SBT_REGISTRY_ADDRESS=0x5FC8d32690cc91D4c39d9d3abcBD16989F875707
NEXT_PUBLIC_TRUEKE_SBT_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F
NEXT_PUBLIC_TRUEKE_RWA_ADDRESS=0xa513E6E4b8f2a923D98304ec87F64353C4D5C853
NEXT_PUBLIC_TRUEKE_SERVICE_ADDRESS=0x2279B7A0a67E14118866570202273010b9195b05

# Configuración de Red
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

---

## 🆕 5. Actualización — Manejo Seguro de Claves e Integración GCP (v2)

> **Fecha:** 31 de Agosto de 2026 — Adaptación del proyecto a los servicios
> globales de GCP (Foundry + PostgreSQL) y a las condiciones de manejo de
> claves e información sensible.

### 📦 Nuevos archivos

| Archivo | Propósito |
| :--- | :--- |
| `web/server/secrets.js` | Módulo central de secretos: env → Secret Manager (metadata server) → gcloud CLI. **Fail-fast en producción.** |
| `web/.env.gcp.example` | Documentación de variables GCP (secretos + públicas + infraestructura). |
| `web/Dockerfile` | Imagen Cloud Run (Next.js standalone, incluye `pg` vía `outputFileTracingIncludes`). |
| `web/Dockerfile.indexer` | Imagen del indexador (Cloud Run Jobs), con `sc/out` para ABIs. |
| `deploy-gcp.sh` | Orquestador: secretos → Cloud SQL → contratos remotos → Cloud Run → indexador. |
| `scripts/deploy-contracts-gcp.sh` | Despliegue de contratos al nodo Foundry remoto (claves vía env/Secret Manager, bloqueo de claves Anvil por defecto). |
| `scripts/cloudbuild.yaml`, `scripts/cloudbuild-indexer.yaml` | Builds de Cloud Build. |
| `web/scripts/setup-gcp-db.mjs` | Habilita PostGIS + esquema en Cloud SQL. |

### 🔒 Cambios de seguridad aplicados

1. **Eliminadas credenciales hardcodeadas** de `init-pg.js`,
   `create-truekeate-db.mjs`, `test-local-db.mjs` y de los templates de
   `deploy-local.sh/.py/.ps1` (la contraseña PostgreSQL local ya no se
   escribe en `.env.local`; se lee de `ADMIN_DATABASE_URL`/`DATABASE_URL`).
2. **`KYC_SECRET` (lib.js):** en producción es obligatoria (Secret Manager);
   el fallback de desarrollo solo aplica con `NODE_ENV != production`.
3. **`RELAYER_PRIVATE_KEY` y `RPC_URL` (relay/route.ts):** igual, fail-fast en
   producción — eliminado el fallback a la clave de Anvil #4.
4. **Cloud Run:** los secretos se inyectan con `--set-secrets`; la imagen
   Docker no contiene claves.
5. **Bloqueo de claves Anvil por defecto** en `deploy-contracts-gcp.sh`
   (aborta salvo `--allow-anvil-keys`, solo preview de desarrollo remoto).
6. **`.gitignore`:** añadidos `deployment-info-gcp.txt`, `web/.env.gcp`
   (y excepción para `.env.gcp.example`).

> [!IMPORTANT]
> Los secretos `DATABASE_URL`, `RPC_URL`, `KYC_SECRET` y `RELAYER_PRIVATE_KEY`
> se gestionan EXCLUSIVAMENTE en GCP Secret Manager para cualquier despliegue
> en la nube. `deploy-gcp.sh` los crea idempotentemente si no existen.
