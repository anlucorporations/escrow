# TrueKeate — Entornos Globales

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Documento | `RepoTecnico/entornos_globales.md` |
| Actualizado | **2026-09-09** (estado REAL verificado en vivo: API rev `truekeate-api-00022-s24`, web rev `truekeate-web-00028-mwk`) |

> Origen histórico: el documento nació en Fase 1 — Concepto (Decisiones D8–D10). Esta
> revisión actualiza rama/HEAD, despliegue Cloud Run, secretos, contratos y endpoints
> al estado real del 2026-09-09. Fuentes de verdad: `backend/api/index-gcp.js`,
> `backend/contratos.json`, `backend/api/app.js` + `backend/api/routes/*`,
> `web/lib/api.ts`, `web/lib/contracts.ts`, `/home/dsh/workspace/gcp-env.sh`,
> `REGISTRO_REPOSITORIOS_DESPLIEGUE_Y_CLAVES.md` y `RepoTecnico/estado_proyecto.md`.

---

## 1. Repositorios remotos (Decisión D8)

| Plataforma | URL | Rama de trabajo |
|---|---|---|
| GitHub | `https://github.com/anlucorporations/escrow` | **`escrow-dsh-GCP`** (existe, = rama de trabajo) |
| GitLab.com | `https://gitlab.com/anlucorporations/escrow` | **`escrow-dsh-GCP`** (existe) |
| GitLab Codecrypto | `https://gitlab.codecrypto.academy/anlucorporations/escrow` | **`escrow-dsh-GCP`** (rama remota existente) |

**Estado verificado 2026-09-09** (dentro del repo):

```bash
git rev-parse HEAD                # a717efbf4272b1d03361d98eea5937116f337a32  (HEAD = a717efb)
git branch --show-current         # escrow-dsh-GCP
git remote -v
# github    git@github.com:anlucorporations/escrow.git
# gitlab    git@gitlab.com:anlucorporations/escrow.git
# codecrypto https://gitlab.codecrypto.academy/anlucorporations/escrow.git
```

Últimos commits en HEAD: `a717efb` (docs: VALOR + botón D28 + pestañas histórico +
inventario flotante verificado en vivo) ← `e6c61f7` ← `a665847` (feat VALOR: criptos
socio, reputación, BRLT Stripe Checkout) ← `1b2e2ee` ← `3e62c52` (endurecimiento
Sistemas: `/admin/*` solo Owner on-chain).

### Claves SSH disponibles (`~/.ssh/`)
| Host | Key |
|---|---|
| `github.com` | `id_ed25519_github` |
| `gitlab.com` | `id_ed25519_gitlab` |
| `gitlab.codecrypto.academy` | `id_ed25519_codecrypto_gcp` (denegada) / `id_ed25519_codecrypto` (denegada) |

> ⚠️ **Pendiente**: restaurar acceso SSH a `gitlab.codecrypto.academy` (registrar la clave pública en la cuenta del usuario `git` de ese servidor). Hoy el remoto `codecrypto` opera por HTTPS y la rama `escrow-dsh-GCP` ya está publicada allí (fetch OK).

---

## 2. Entorno GCP (Decisiones D9 → D10)

| Campo | Valor |
|---|---|
| Cuenta activa | `anlucorporations@gmail.com` |
| Billing account | `013B00-B9A67C-014A43` |
| Proyecto del proyecto | **`truekeate-main`** ("TrueKeate") — **reutilizado** ✅ *(Decisión D10)* |
| Estado proyecto | ACTIVE, con billing vinculado y servicios habilitados |
| Región Cloud Run | `europe-west1` (servicios `truekeate-api` y `truekeate-web`) |
| Cloud SQL | Instancia `truekeate-db-dev` en `southamerica-east1` (BD `truekeate`, usuario `app`, PostgreSQL 15.18) |
| Proyecto `truekeate-dsh` | **Creado y eliminado** (se descartó; el billing account ya tenía 5 proyectos vinculados y se reutilizó el existente) |
| Proyectos vinculados al billing | `barloventasv2`, `daovotacionv1`, `mcc-ecommerce`, `quantum-feat-503600-q6`, `truekeate-main` |

### Servicios globales a usar
- **Foundry/anvil** (nodo de pruebas interno, chain 31337).
- **PostgreSQL** (Cloud SQL `truekeate-db-dev`; contraseña desde Secret Manager).
- **GCP Secret Manager** para identidad y claves/datos esenciales.
- **Cloud Run** (API + Web), **Artifact Registry** (`southamerica-east1-docker.pkg.dev/truekeate-main/truekeate-repo`) y **Cloud Build**.
- Restringir acceso a servicios no necesarios para uso público.

### Carga de entorno global (workspace)
```bash
source /home/dsh/workspace/gcp-env.sh
# Exporta: RPC_URL, CHAIN_ID=31337, DATABASE_URL (proxy 127.0.0.1:5433),
#          PGADMIN_*, RELAYER_PRIVATE_KEY, ADMIN_PRIVATE_KEY, DS_*
```
Archivos de referencia: `/home/dsh/workspace/.env.global`, `/home/dsh/workspace/gcp-env.sh`, `/home/dsh/workspace/gcp-setup.sh`.

---

## 3. Entorno de pruebas (anvil)

| Rol | Cuenta | Función |
|---|---|---|
| Owner / deploys | **Cuenta 0** del anvil (`0xf39F…2266`) | EO owner, despliega contratos, **dueño on-chain del SociosRegistry** |
| Relayer / plataforma | **Cuenta 1** del anvil | Relayer y cuenta general para pagos de gas y otros gastos |

> El **Owner de la plataforma** es la wallet dueña on-chain de `SociosRegistry.owner()`
> (cuenta anvil #0 en GCP: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`), no un "tipo de
> usuario". Las rutas `/admin/*` exigen esa wallet (ver `backend/api/lib/es-owner.js`,
> `backend/api/routes/admin.js`; endurecimiento commit `3e62c52`).

---

## 4. Variables de entorno clave

### Tabla histórica (base global)

| Variable | Descripción | Fuente |
|---|---|---|
| `RPC_URL` | RPC del nodo Foundry/Anvil (chain 31337) | `gcp-env.sh` ← `MCC_ANVIL_RPC_URL` |
| `CHAIN_ID` | `31337` | `gcp-env.sh` |
| `DATABASE_URL` | PostgreSQL (patrón pgadmin, `mcc-postgres-*.a.run.app:443`) | `gcp-env.sh` ← Secret `POSTGRES_PASSWORD` |
| `RELAYER_PRIVATE_KEY` | Clave del relayer | Secret Manager |
| `ADMIN_PRIVATE_KEY` | Clave del admin/owner | Secret Manager |
| `DS_*` | Secretos convención nuevos proyectos (RPC, DB, KYC, relayer, Pinata) | Secret Manager |
| `GCP_PROJECT_ID` | `mcc-ecommerce` (global) → **`truekeate-main`** (proyecto) | `.env.global` / decisión D10 |

### Secretos GCP (Secret Manager — proyecto `truekeate-main`) al 2026-09-09

| Secreto | Propósito | Fuente (código) |
|---|---|---|
| `RPC_URL` | RPC del anvil remoto GCP (chain 31337) | `backend/api/index-gcp.js:57`, `backend/indexador.js:19` |
| `DATABASE_URL` | Conexión Cloud SQL `truekeate-db-dev` (`postgres://app:…@…/truekeate`) | `index-gcp.js:37` |
| `RELAYER_PRIVATE_KEY` | Cuenta EIP-712 del relayer (gas/pagos plataforma) | `index-gcp.js:82`, `relayer.js` |
| `KYC_SECRET` | Clave AES-256-GCM (correos, teléfonos, 2FA) | lib KYC (`kyc.js` / registro maestro §4) |
| `NFT_ADDRESS` | Contrato `TrueKeateNFT` para el minteo al publicar | `index-gcp.js:69-72` (minteador NFT) |
| `STRIPE_SECRET_KEY` | **Nuevo (2026-09-09, modo test)** — API Stripe (Checkout + webhook) | `backend/api/routes/valor.js:196,235` |
| `STRIPE_PUBLISHABLE_KEY` | **Nuevo (2026-09-09, modo test)** — clave pública Stripe (uso web) | `RepoTecnico/estado_proyecto.md`, `plan_desarrollo.md` |

> Nota de trazabilidad: el webhook de Stripe (`POST /valor/brlt/webhook`) también lee
> `STRIPE_WEBHOOK_SECRET` para validar la firma de los eventos (`valor.js:236`) — gestionar
> junto a las claves Stripe en Secret Manager cuando se active la validación.

### Variables de entorno API — Cloud Run `truekeate-api` (producción)

| Variable | Valor en prod | Fuente (código) |
|---|---|---|
| `PORT` | `8080` (inyectado por Cloud Run) | `index-gcp.js:132` |
| `RPC_URL` | Secret (anvil remoto GCP, chain 31337) | `index-gcp.js:57` |
| `CHAIN_ID` | `31337` | `gcp-env.sh` / red anvil |
| `DATABASE_URL` | Secret (Cloud SQL `truekeate-db-dev`) | `index-gcp.js:37` |
| `FACTORY_ADDRESS` | `0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849` (despliegue GCP 2026-09) | `index-gcp.js:83-86` (default) |
| `REGISTRY_ADDRESS` | (opcional; fallback `contratos.SociosRegistry.direccion`) | `index-gcp.js:60-63` |
| `NFT_ADDRESS` | Secret (TrueKeateNFT) | `index-gcp.js:69-72` |
| `RELAYER_PRIVATE_KEY` | Secret | `index-gcp.js:82` |
| `CORS_ORIGEN` | `https://truekeate-web-593453426217.europe-west1.run.app` | `backend/api/app.js:44` |
| `TASA_ETH_BRLT` | `3000` (1 ETH ≈ 3000 BRLT, tasa plataforma) | `backend/api/routes/valor.js:27` |
| `CONTRATOS_FILE` | (opcional) ruta a `contratos.json` | `index-gcp.js:27-28` |
| `INTERVALO_MS` / `DESDE_BLOQUE` | (opcional) ciclo del indexador | `index-gcp.js:109-110` |

### Variables de entorno Web — Cloud Run `truekeate-web` (producción)

| Variable | Valor en prod | Fuente (código) |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://truekeate-api-593453426217.europe-west1.run.app` | `web/lib/api.ts:8-9` |
| `NEXT_PUBLIC_STRIPE_KEY` | `pk_test` (modo test) | `RepoTecnico/estado_proyecto.md` / `plan_desarrollo.md` |
| `NEXT_PUBLIC_ESCROW` | (default `0x8a93…e5d8`) | `web/lib/contracts.ts:22` |
| `NEXT_PUBLIC_FACTORY` | (default `0x4091…d849`) | `web/lib/contracts.ts:23-24` |
| `NEXT_PUBLIC_BRLT` | (default `0x6f6f…f78`) | `web/lib/contracts.ts:25` |
| `NEXT_PUBLIC_REGISTRY` | (default `0xb0f0…e21b`) | `web/lib/contracts.ts:26-27` |
| `NEXT_PUBLIC_SUSCRIPCION` | (default `0x5fea…c4ae`) | `web/lib/contracts.ts:28-29` |

---

## 5. Comandos útiles

```bash
# Estado del repositorio / ramas
git ls-remote git@github.com:anlucorporations/escrow.git
git rev-parse HEAD                 # a717efb (2026-09-09)

# GCP
gcloud projects list
gcloud billing projects list --billing-account=013B00-B9A67C-014A43
gcloud config set project truekeate-main

# Carga de entorno (incluye Cloud SQL Auth Proxy en 127.0.0.1:5433)
source /home/dsh/workspace/gcp-env.sh

# Health check de producción
curl -s https://truekeate-api-593453426217.europe-west1.run.app/healthz

# Build de imágenes (Cloud Build) — desde backend/ y web/ respectivamente
gcloud builds submit --config /tmp/cb-backend.yaml .   # backend
gcloud builds submit --config /tmp/cb-web.yaml .       # web
# Imágenes: southamerica-east1-docker.pkg.dev/$PROJECT_ID/truekeate-repo/{backend,web}:latest

# Despliegue Cloud Run (patrón de tag release-<short>, p. ej. release-e6c61f7)
# Los secretos se inyectan con --set-secrets="…=…:latest" (ver registro maestro §3 paso 5)
gcloud run deploy truekeate-api --image=…/truekeate-repo/backend:latest \
  --region=europe-west1 --allow-unauthenticated \
  --set-env-vars "CHAIN_ID=31337,FACTORY_ADDRESS=0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849,\
CORS_ORIGEN=https://truekeate-web-593453426217.europe-west1.run.app,TASA_ETH_BRLT=3000" \
  --set-secrets "RPC_URL=RPC_URL:latest,DATABASE_URL=DATABASE_URL:latest,\
RELAYER_PRIVATE_KEY=RELAYER_PRIVATE_KEY:latest,KYC_SECRET=KYC_SECRET:latest,\
NFT_ADDRESS=NFT_ADDRESS:latest,STRIPE_SECRET_KEY=STRIPE_SECRET_KEY:latest"
```

---

## 6. Servicios en producción (Cloud Run, 2026-09-09)

| Servicio | URL | Revisión (serving 100 %) |
|---|---|---|
| **API** | `https://truekeate-api-593453426217.europe-west1.run.app` | **`truekeate-api-00022-s24`** |
| **Web** | `https://truekeate-web-593453426217.europe-west1.run.app` | **`truekeate-web-00028-mwk`** |

- Despliegue verificado en vivo (release `e6c61f7`): VALOR con criptos/BRLT/Stripe,
  reputación, pestañas Histórico, botón D28 — capturas en
  `RepoTecnico/pruebas/1ra-prueba/` (`valor-owner.png`, `valor-particular.png`).
- Imágenes en **Artifact Registry**: `southamerica-east1-docker.pkg.dev/truekeate-main/truekeate-repo/{backend,web}`.
- Archivos de build de referencia: `/tmp/cb-backend.yaml`, `/tmp/cb-web.yaml`.

---

## 7. Contratos desplegados (anvil GCP, chain 31337 — `backend/contratos.json`)

| Contrato | Dirección | Notas |
|---|---|---|
| **TrueKeateNFT** | `0x6C2d83262fF84cBaDb3e416D527403135D757892` | Minteo NFT al publicar (env `NFT_ADDRESS`) |
| **TrueKeateSBT** | `0x870526b7973b56163a6997bB7C886F5E4EA53638` | SBT de certificación (escalera D28) |
| **Escrow** | `0x8a93d247134d91e0de6f96547cb0204e5be8e5d8` | Escrow de trueques (estados/eventos indexados) |
| **BRLT** | `0x6f6f570f45833e249e27022648a26f4076f48f78` | Token BRLT (1:1) |
| **SociosRegistry** | `0xb0f05d25e41fbc2b52013099ed9616f1206ae21b` | Padrón de socios + gobernanza; **owner = `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`** |
| **SuscripcionEmpresa** | `0x5feaebfb4439f3516c74939a9d04e95afe82c4ae` | Suscripciones de empresas |
| **SmartAccountFactory** | `0x40918ba7f132e0acba2ce4de4c4baf9bd2d7d849` | Fábrica de SmartAccounts (EIP-712); ABI en `web/lib/abis/SmartAccountFactory.json` |

> Notas de trazabilidad:
> - `contratos.json` incluye además la clave `SmartAccount` (template con dirección
>   `0x000…000`): las cuentas se despliegan por instancia vía la factory; el ABI se usa
>   para el relayer (`index-gcp.js:87`, `web/lib/abis/SmartAccount.json`).
> - La dirección de la factory no está como clave propia en `contratos.json`: se fija por
>   env `FACTORY_ADDRESS` o por el default del despliegue GCP 2026-09
>   (`index-gcp.js:83-86`, `web/lib/contracts.ts:23-24`).
> - El frontend carga las direcciones por defecto (despliegue GCP) desde `web/lib/contracts.ts`;
>   en runtime `/admin/contratos` (Owner) devuelve el `contratos.json` completo (RF-13.1).

---

## 8. API REST — rutas y endpoints (estado 2026-09-09)

Montaje de módulos en `backend/api/app.js` (Express): `/auth`, `/kyc`, `/catalog`,
`/truekes`, `/admin`, `/reputacion`, `/subastas`, `/finanzas`, `/valor`, `/disputas`,
`/notificaciones`, `/gobernanza`, `/puntos-encuentro` + `/healthz`.
Rutas por archivo en `backend/api/routes/*.js`. Cliente tipado: `web/lib/api.ts`.

### Endpoints nuevos / actualizados (2026-09-09)

| Método | Ruta | Función | Archivo |
|---|---|---|---|
| GET | `/valor/mi` | Resumen VALOR: saldos criptos/BRLT, reputación, valoraciones pendientes, movimientos | `routes/valor.js` |
| POST | `/valor/criptos/recargar` | La plataforma acredita ETH al socio | `routes/valor.js` |
| POST | `/valor/criptos/retirar` | El socio retira ETH (lo envía la plataforma) | `routes/valor.js` |
| POST | `/valor/criptos/convertir` | ETH ⇄ BRLT a tasa plataforma (3000) | `routes/valor.js` |
| POST | `/valor/brlt/checkout` | Crea Stripe Checkout Session (compra BRLT con fiat) | `routes/valor.js` |
| POST | `/valor/brlt/webhook` | **Webhook Stripe** — acredita BRLT al confirmar pago (sin sesión) | `routes/valor.js` |
| POST | `/valor/brlt/retirar` | Retiro BRLT (registro; Payouts documentado) | `routes/valor.js` |
| GET | `/admin/owner` | Wallet del Owner (público; el frontend oculta Sistemas al resto) | `routes/admin.js` |
| GET | `/notificaciones` | Mis avisos (últimas 50) + no leídas | `routes/notificaciones.js` |
| POST | `/notificaciones/:id/leida` / `/notificaciones/leer-todas` | Marcar leídas | `routes/notificaciones.js` |
| GET | `/disputas/padron` | Padrón de socios + `esSocio` de la wallet | `routes/disputas.js` |
| GET | `/disputas/votaciones` | Disputas EN_VOTACION/RESUELTAS para Socios (con pruebas) | `routes/disputas.js` |
| POST | `/disputas/:id/justificativo` | El conforme carga fotos de justificativo | `routes/disputas.js` |
| POST | `/disputas/:id/no-conforme` | La contraparte declara también No Conforme | `routes/disputas.js` |
| POST | `/disputas/:id/votar` | Voto del Socio: `ANULAR` \| `VALIDO` | `routes/disputas.js` |

> Acceso `/admin/*`: **solo el Owner real** (dueño on-chain del SociosRegistry) — middleware
> `requiereOwner` (`backend/api/lib/es-owner.js`, `routes/admin.js`). Frontend: sección
> "Sistemas" oculta salvo Owner (`/auth/estado` y `/auth/session` exponen `esOwner`).

---

## 9. Referencias

| Documento / archivo | Contenido |
|---|---|
| `REGISTRO_REPOSITORIOS_DESPLIEGUE_Y_CLAVES.md` (raíz) | Registro maestro (2026-08-27 → v2 2026-08-31): repos, despliegue local/GCP, matriz de secretos, cuentas anvil. **Ojo:** su rama oficial declarada (`escrow-Antigravity`) quedó **obsoleta** — la rama real hoy es `escrow-dsh-GCP` (ver §1). |
| `RepoTecnico/estado_proyecto.md` | Estado 2026-09-09: VALOR verificado en vivo, revisiones `truekeate-api-00022-s24` / `truekeate-web-00028-mwk` |
| `RepoTecnico/plan_desarrollo.md` | Plan: VALOR/Stripe (secretos `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_KEY`) |
| `backend/api/index-gcp.js` | Punto de entrada de producción (Cloud Run): envs, relayer, indexador |
| `backend/contratos.json` | Direcciones + ABIs del despliegue anvil GCP |
| `backend/api/app.js` + `backend/api/routes/*` | API REST (montaje y endpoints) |
| `web/lib/api.ts` / `web/lib/contracts.ts` | Cliente tipado / direcciones frontend |
| `/home/dsh/workspace/gcp-env.sh` / `.env.global` | Cargador global de entorno y secretos |
| `/tmp/cb-backend.yaml` / `/tmp/cb-web.yaml` | Cloud Build (Artifact Registry `truekeate-repo`) |
