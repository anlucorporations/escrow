# Manual técnico · Despliegue, entornos y operación

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: entornos (anvil local y GCP
> `truekeate-main`), scripts de despliegue (Foundry, indexador/relayer/API y frontend), variables
> de entorno reales, red y puertos. Referencias `ruta:línea`. Lo no verificable se marca
> **pendiente de confirmar**.

---

## 1. Entornos previstos

### 1.1 Local: nodo anvil (chain 31337)

- anvil es el nodo de pruebas interno del proyecto (chain **31337**) (`entornos_globales.md:42`;
  `gcp-env.sh:55`).
- Roles de cuentas del anvil (`entornos_globales.md:56-62`; `RF-15.1/15.2` en
  `requerimientos.md:175-176`):
  - **Cuenta 0**: EO owner, despliega los contratos.
  - **Cuenta 1**: relayer y cuenta general de la plataforma (paga el gas).
- Uso típico documentado en el propio script de despliegue (`sc/script/Deploy.s.sol:20-25`):
  1. `anvil` (nodo local, chain 31337).
  2. `forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --private-key <cuenta0>
     --broadcast`.
  3. Las direcciones quedan en `broadcast/` (deployment-info) (`Deploy.s.sol:25`).
- El RPC local por defecto de los servicios backend es `http://127.0.0.1:8545`
  (`backend/indexador.js:19`).

### 1.2 GCP: proyecto `truekeate-main` (D10)

- Proyecto GCP **reutilizado** `truekeate-main` ("TrueKeate"), ACTIVE con billing vinculado
  (decisión D10, `entornos_globales.md:36-38`).
- Servicios globales a usar: Foundry/anvil (chain 31337), PostgreSQL (patrón pgadmin + Secret
  Manager), GCP Secret Manager (`entornos_globales.md:41-45`).
- **Estado del entorno**: en el momento de escribir este manual los archivos de entorno global
  siguen apuntando al proyecto/entorno **MCC** (ver §2 y §6); no se verifica en el repositorio un
  despliegue dedicado a `truekeate-main` → **pendiente de confirmar** ("GCP truekeate-main
  pendiente de entorno real — D25").
- Repositorios remotos y rama de trabajo `escrow-dsh-GCP`: GitHub y GitLab.com
  (`entornos_globales.md:11-16`); GitLab Codecrypto pendiente (D11, `entornos_globales.md:17`).

### 1.3 Contenedores/CI

- **No se encontraron** en el repositorio `Dockerfile`, `docker-compose`, configuraciones de CI
  (`.github/`), `vercel.json` ni similares (búsqueda global sin resultados) → el despliegue
  contenerizado/automatizado es **pendiente de confirmar**.

---

## 2. Variables de entorno reales

### 2.1 Carga global del entorno (workspace)

```bash
source /home/dsh/workspace/gcp-env.sh
```

- El cargador lee `.env.global` (variables sin secretos) y los secretos de GCP Secret Manager, y
  exporta `RPC_URL, CHAIN_ID=31337, DATABASE_URL, PGADMIN_*, RELAYER_PRIVATE_KEY,
  ADMIN_PRIVATE_KEY, DS_*` (`entornos_globales.md:48-52`; cabecera `gcp-env.sh:1-18`).
- `gcp-env.sh` **nunca imprime ni persiste valores de secretos** (`gcp-env.sh:14`); en modo
  diagnóstico solo lista nombres (`gcp-env.sh:96-101`).
- Ejecución con la SA de mínimo privilegio: `GCP_SA=ds-dev bash gcp-env.sh`
  (`gcp-env.sh:17`, `gcp-env.sh:39-41`).

### 2.2 Variables exportadas por `gcp-env.sh` (con línea)

| Variable | Origen/valor | Fuente |
|---|---|---|
| `RPC_URL` | `MCC_ANVIL_RPC_URL` (RPC anvil, chain 31337) | `gcp-env.sh:54` |
| `CHAIN_ID` | `31337` | `gcp-env.sh:55` |
| `PG_PASSWORD` | Secreto `POSTGRES_PASSWORD` (runtime) | `gcp-env.sh:59-60` |
| `PG_HOST` / `PG_PORT` / `PG_USER` / `PG_DATABASE` | `mcc-postgres-slzlptbcla-ew.a.run.app` · 443 · postgres · postgres | `gcp-env.sh:61-64` |
| `DATABASE_URL` | `postgresql://postgres:***@mcc-postgres-…:443/postgres` | `gcp-env.sh:65` |
| `PGADMIN_URL` / `PGADMIN_EMAIL` / `PGADMIN_PASSWORD` | pgadmin MCC / `anlucorporations@gmail.com` / secreto | `gcp-env.sh:66-70` |
| `ADMIN_PRIVATE_KEY` / `RELAYER_PRIVATE_KEY` | Secretos homónimos | `gcp-env.sh:76-81` |
| `DS_RPC_URL`, `DS_DATABASE_URL`, `DS_KYC_SECRET`, `DS_RELAYER_PRIVATE_KEY`, `DS_PINATA_JWT` | Secretos convención `DS_*` | `gcp-env.sh:84-94` |

### 2.3 Variables de `.env.global` (sin secretos; `/home/dsh/workspace/.env.global`)

| Variable | Valor | Línea |
|---|---|---|
| `GCP_PROJECT_ID` | `mcc-ecommerce` (global; el proyecto TrueKeate según D10 es `truekeate-main`) | `.env.global:10` |
| `GCP_REGION` / `GCP_REGION_RUN` | `us-central1` / `europe-west1` | `.env.global:11-12` |
| `GCP_SA_DEV` / `GCP_SA_DEV_EMAIL` | `ds-dev` / `ds-dev@mcc-ecommerce.iam.gserviceaccount.com` | `.env.global:16-17` |
| `MCC_ANVIL_RPC_URL` | `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` | `.env.global:32` |
| `MCC_POSTGRES_URL` / `MCC_PGADMIN_URL` | `https://mcc-postgres-…run.app` / `https://mcc-pgadmin-…run.app` | `.env.global:33-34` |
| `MCC_PGADMIN_EMAIL` | `anlucorporations@gmail.com` | `.env.global:35` |
| Nombres de secretos `GCP_SECRET_*` y `MCC_SECRET_*` | referencias (no valores) | `.env.global:41-54` |

> Discrepancia detectada: `.env.global:10` define `GCP_PROJECT_ID=mcc-ecommerce` mientras la
> decisión D10 indica que el proyecto de TrueKeate es `truekeate-main`
> (`entornos_globales.md:36`; tabla de variables en `entornos_globales.md:75`). Estado real del
> proyecto GCP activo → **pendiente de confirmar**.

### 2.4 Variables que lee el código (defaults y overrides)

| Variable | Uso | Default en código |
|---|---|---|
| `RPC_URL` | Indexador | `http://127.0.0.1:8545` (`backend/indexador.js:19`) |
| `DATABASE_URL` | Pool pg (indexador y CLI) | `postgresql://postgres:postgres@localhost:5432/postgres` (`indexador.js:20-22`) |
| `CHECKPOINT_STEP` | Paso de checkpoint del indexador | `50` (`indexador.js:23`) |
| `CONTRATOS_FILE` | Mapa contrato→ABI del indexador | `./contratos.json` (`indexador-cli.js:12`) |
| `INTERVALO_MS` | Intervalo de barrido `--watch` | `5000` (`indexador-cli.js:14`) |
| `DESDE_BLOQUE` | Bloque inicial de reproceso | `0` (`indexador-cli.js:15`) |
| `PORT` | Puerto de la API | `4000` (`backend/api/app.js:68`) |
| `LIMITE_METATX_DIARIO` | Límite diario del relayer (D29) | `20` (`backend/relayer.js:22`) |
| `UMBRAL_FALLOS` / `GAS_MAXIMO` | Relayer (D29) | `3` / `300000` (`relayer.js:23`, `relayer.js:26`) |
| `PRIVATE_KEY` | Clave del owner en el script forge | — (`sc/script/Deploy.s.sol:29`, `vm.envUint`) |
| `NEXT_PUBLIC_ESCROW` y `NEXT_PUBLIC_*` | Direcciones de contratos del frontend | direcciones anvil hardcodeadas (`web/lib/contracts.ts:22-29`) |
| `BASE_URL` | baseURL de E2E Playwright | `http://127.0.0.1:3000` (`web/playwright.config.ts:15`) |

---

## 3. Despliegue de contratos (Foundry)

### 3.1 Prerrequisitos

- Nodo anvil levantado (chain 31337) o RPC remoto disponible.
- Clave privada de la cuenta que despliega (owner = cuenta 0, RF-15.1) en `PRIVATE_KEY`
  (`sc/script/Deploy.s.sol:29`).
- Librerías de submódulos presentes (`forge build` resuelve vía `sc/foundry.toml:11-14`).

### 3.2 Comando de despliegue (documentado en el propio script)

```
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 \
  --private-key <cuenta0> --broadcast
```

(`sc/script/Deploy.s.sol:20-25`, con `anvil` como paso previo). Las direcciones desplegadas se
registran en `broadcast/` (deployment-info) (`Deploy.s.sol:25`).

### 3.3 Qué despliega el script y en qué orden

`Deploy.run()` (`sc/script/Deploy.s.sol:28-72`):

1. `Escrow` (`Deploy.s.sol:34`).
2. `SmartAccountFactory` (`Deploy.s.sol:37`).
3. Tokens ERC20 de prueba `TrueKeateToken` TKA/TKB (`Deploy.s.sol:40-41`).
4. NFT de prueba `TrueKeateNFT` (`Deploy.s.sol:44`).
5. Ciclo 3: `BRLT`, `FondoDeValor`, `SociosRegistry`, `SuscripcionEmpresa`
   (`Deploy.s.sol:47-50`).
6. **Vinculaciones** entre contratos (solo owner) (`Deploy.s.sol:53-58`): BRLT → registry y
   fondo; fondo → BRLT; registry → BRLT; suscripción → BRLT y fondo. Estas llamadas corresponden a
   las funciones `onlyOwner` de cada contrato (p. ej. `vincularBrlt` en `sc/src/BRLT.sol:55-63`,
   `vincularSociosRegistry` en `sc/src/Escrow.sol:136-138` — esta última **no** se ejecuta en
   `Deploy.s.sol`; el Escrow queda sin vincular al registry en este script → **pendiente de
   confirmar** su vinculación en un script posterior).
7. Log de direcciones y del owner (`Deploy.s.sol:62-71`).

### 3.4 Tras el despliegue

- Actualizar `backend/contratos.json` (mapa `{ entidad: { direccion, abi } }`) — indicado en
  `backend/README.md:14` ("actualizar tras cada deploy").
- Actualizar (si aplica) las direcciones del frontend (`web/lib/contracts.ts:21-30`, override por
  `NEXT_PUBLIC_*`).

---

## 4. Despliegue del backend

### 4.1 Preparar el esquema PostgreSQL (una vez)

```bash
psql "$DATABASE_URL" -f backend/db/schema.sql
```

(`backend/README.md:31-32`). El esquema es idempotente (`CREATE TABLE IF NOT EXISTS`, enums con
`EXCEPTION WHEN duplicate_object`, `backend/db/schema.sql:13-55`).

### 4.2 Indexador

```bash
node backend/indexador-cli.js            # barrido único desde DESDE_BLOQUE
node backend/indexador-cli.js --watch    # modo servicio (checkpoints cada INTERVALO_MS)
```

(`backend/README.md:35-37`; implementación `backend/indexador-cli.js:19-40`). Requiere
`RPC_URL`, `DATABASE_URL` y `CONTRATOS_FILE` (`indexador-cli.js:12-17`).

### 4.3 API REST

```bash
npm run api        # backend/api/index-api.js → http://127.0.0.1:4000 (PORT configurable)
```

(`backend/package.json:8`; `backend/api/index-api.js:6-10`; `backend/api/app.js:68-73`).
Health-check: `GET /healthz` (`app.js:46`).

### 4.4 Relayer EIP-712

- Es un módulo de Node (clase `RelayerEIP712`, `backend/relayer.js:34`) consumido por la API
  (`backend/api/routes/truekes.js:30-36`); no tiene punto de entrada propio en el repo → su
  ejecución como servicio independiente (2 instancias, cola de reintentos, health-check, SLA ≥99 %
  — D15/RF-09.5, `requerimientos.md:132`) es **pendiente de confirmar**.
- Health/alertas de saldo bajo ya implementados en `relayer.health()` (`relayer.js:193-205`).

---

## 5. Despliegue del frontend

### 5.1 Desarrollo, build y servido

```bash
cd web
npm run dev      # http://localhost:3000
npm run build    # build de producción (verificado: 9 páginas estáticas — web/README.md:33)
npm start        # servir el build (usa Playwright en E2E)
```

(`web/package.json:6-9`; `web/README.md:31-35`). Sin configuración de hosting en el repo
(Vercel/Netlify/Cloud Run no presentes) → **pendiente de confirmar** el destino de publicación.

### 5.2 Pruebas E2E (Playwright)

`npx playwright test` con servidor propio: `webServer.command = "npm run start"`, puerto 3000
(`web/playwright.config.ts:23-28`); proyectos chromium y mobile-chrome (Pixel 5)
(`playwright.config.ts:19-22`).

### 5.3 PWA

- Manifest en `web/public/manifest.json` servido en `/manifest.json` (`web/app/layout.tsx:21`);
  instalable según navegador. Service worker **pendiente de confirmar** (ver manual 04-stack-frontend §8).

---

## 6. Red y puertos

| Componente | Red/URL | Puerto | Fuente |
|---|---|---|---|
| anvil local | `http://localhost:8545` (RPC) | 8545 | `sc/script/Deploy.s.sol:22`, default `backend/indexador.js:19` |
| anvil GCP (MCC compartido) | `https://mcc-foundry-anvil-1095249147821.europe-west1.run.app` | 443 | `.env.global:32` |
| Chain ID | **31337** | — | `gcp-env.sh:55` |
| API backend (local) | `http://127.0.0.1:4000` | 4000 | `backend/api/app.js:71` |
| Web frontend (dev/build) | `http://localhost:3000` | 3000 | `web/README.md:32`; `web/playwright.config.ts:15` |
| PostgreSQL GCP (MCC) | `mcc-postgres-slzlptbcla-ew.a.run.app` | 443 | `gcp-env.sh:61-62` |
| pgAdmin GCP (MCC) | `https://mcc-pgadmin-slzlptbcla-ew.a.run.app` | 443 | `.env.global:34` |
| Wallet (navegador) | MetaMask vía EIP-1193 (`window.ethereum`) | — | `web/lib/ethereum.tsx:20-27` |
| Redes de despliegue en producción | cadena objetivo de producción sin definir | — | **pendiente de confirmar** (diseño solo contempla anvil 31337) |

---

## 7. Secretos y seguridad operativa

### 7.1 GCP Secret Manager

- Nombres usados en runtime: `POSTGRES_PASSWORD`, `PGADMIN_PASSWORD`, `ADMIN_PRIVATE_KEY`,
  `RELAYER_PRIVATE_KEY` (`gcp-env.sh:59-81`; nombres MCC en `.env.global:49-52`) y convención
  `DS_*` (`gcp-env.sh:84-94`; `.env.global:41-46`).
- Lectura con `gcloud secrets versions access latest --secret=<nombre>` sin imprimir el valor
  (`gcp-env.sh:44-46`).
- Custodia de RELAYER/ADMIN_PRIVATE_KEY: Owner como custodio, política de **rotación** y
  separación de funciones (RF-18.5, `requerimientos.md:195`; `entornos_globales.md:72-73`).

### 7.2 Uso operativo recomendado

- Ejecutar procesos con la SA dev `ds-dev` (mínimo privilegio) mediante
  `GCP_SA=ds-dev bash gcp-env.sh` (impersonación, `gcp-env.sh:39-41`).
- Nunca commitear secretos: `.env.global` no contiene valores (`/home/dsh/workspace/.env.global:4-5`);
  el repo raíz tiene `.gitignore`.

---

## 8. Operación y monitoreo

> 📎 **Operación adicional**: reinicio limpio de la BD off-chain (sin tocar anvil) y bootstrap
> del Owner como CERTIFICADO + SOCIO → ver **`04-Despliegue/02-reinicio-y-bootstrap.md`**
> (`backend/scripts/reiniciar-plataforma.sh` y `backend/scripts/bootstrap-owner.sh`).

### 8.1 Health-checks reales

| Servicio | Endpoint/función | Fuente |
|---|---|---|
| API | `GET /healthz` → `{ok:true, servicio:'truekeate-api'}` | `backend/api/app.js:46` |
| Indexador | `metricasLag()` (cabeza, lag por contrato, procesados, fallidos) | `backend/indexador.js:233-245` |
| Relayer | `health()` (saldo del wallet, chainId, `saldoBajo`) | `backend/relayer.js:193-205` |

### 8.2 Backup y recuperación (RNF-07)

- Objetivos: backup diario RPO ≤ 24 h; restauración off-chain RTO ≤ 48 h; pruebas de restauración
  trimestrales; reproceso del indexador desde bloque N con reconciliación (RNF-07.1-07.4,
  `arquitectura_tecnica.md:298-301`).
- No se verifica implementación operativa de backups en el repositorio → **pendiente de confirmar**.

### 8.3 Fallback del relayer (D39)

- Modo degradado: ante caída prolongada (> 1 h) el usuario paga el gas directamente y la
  plataforma reembolsa en BRLT si la caída fue del operador (`requerimientos.md:399`;
  `arquitectura_tecnica.md:371-374`). Proceso operativo documentado a nivel de requisito →
  **pendiente de confirmar** su implantación.

---

## 9. Resumen de pendientes de confirmar

1. Entorno GCP dedicado a `truekeate-main` (hoy los archivos globales apuntan a MCC/
   `mcc-ecommerce`): `entornos_globales.md:36-38` vs `.env.global:10`.
2. Despliegues en Cloud Run/Docker/CI: no existe configuración en el repo (§1.3).
3. Vinculación Escrow ↔ SociosRegistry ausente en `Deploy.s.sol` (§3.3).
4. Servicio independiente del relayer con 2 instancias + cola de reintentos (D15) (§4.4).
5. Red de producción destino (solo se trabaja sobre anvil 31337) (§6).
6. Backups operativos RNF-07 y proceso D39 (§8).
