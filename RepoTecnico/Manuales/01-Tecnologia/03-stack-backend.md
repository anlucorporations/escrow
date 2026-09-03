# Manual técnico · Stack Backend (Node.js)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: backend de TrueKeate — indexador de
> eventos (D25), relayer EIP-712 (D16/D29/D39) y API REST Express + PostgreSQL/PostGIS.
> Referencias `ruta:línea` al código real. Lo no verificable se marca **pendiente de confirmar**.

---

## 1. Resumen del stack backend

| Componente | Tecnología | Evidencia |
|---|---|---|
| Runtime | Node.js (ECMAScript modules) | `backend/package.json:20` (`"type": "module"`) |
| API REST | **Express** 5.2.1 | `backend/package.json:15`, `backend/api/app.js` |
| Blockchain (cliente) | **ethers v6** (6.17.0) | `backend/package.json:14` |
| Base de datos | **pg** (PostgreSQL) + **PostGIS** | `backend/package.json:17`, `backend/db/schema.sql:9` |
| Rate limiting | express-rate-limit 8.7.0 | `backend/package.json:16`, `backend/api/app.js:18` |
| Indexador | Listener Node.js **propio** (D25) | `backend/indexador.js` (cabecera `indexador.js:1-16`) |
| Relayer | EIP-712 **propio**, sin SaaS (D22) | `backend/relayer.js` (cabecera `relayer.js:1-19`) |
| BD objetivo | `mcc-postgres` reutilizado (D25/RT-02.8) | `backend/README.md:26`, `entornos_globales.md:71` |

Roles del backend según `arquitectura_tecnica.md:378-415`: "Capa REST/JSON en Node.js (mismo
repo/stack TS — RNF-04.2)". Nota: el código real está en **JavaScript puro con ESM** (no
TypeScript) → el comentario de diseño "mismo repo/stack TS" no se cumple en el código actual
(**pendiente de confirmar** si es intencional o una desviación del diseño).

---

## 2. Node.js y gestión de módulos

### 2.1 `backend/package.json`

- `name`: `truekeate-backend`, `version`: `1.0.0`, `main`: `index.js` (`package.json:2-5`).
- Descripción: "TrueKeate backend: indexador + relayer EIP-712" (`package.json:4`).
- Licencia: ISC (`package.json:12`).
- Scripts (`package.json:6-9`):
  - `test`: `node --test test/indexador.test.js test/relayer.test.js test/api.test.js`
    (`package.json:7`).
  - `api`: `node api/index-api.js` (`package.json:8`).

### 2.2 Dependencias declaradas vs versiones exactas (lockfile)

| Dependencia | Rango declarado (`package.json`) | Versión exacta (package-lock) | Uso |
|---|---|---|---|
| ethers | `^6.17.0` (`package.json:14`) | **6.17.0** | Cliente RPC, interfaces, firmas |
| express | `^5.2.1` (`package.json:15`) | **5.2.1** | API REST |
| express-rate-limit | `^8.7.0` (`package.json:16`) | **8.7.0** | Rate limiting |
| pg | `^8.23.0` (`package.json:17`) | **8.23.0** | Pool PostgreSQL |
| supertest | `^7.2.2` (`package.json:18`) | **7.2.2** | Tests HTTP (declarada en `dependencies`, aunque es de test) |

### 2.3 Estructura del directorio `backend/`

```
backend/
├─ db/schema.sql          # Esquema PostgreSQL (14 tablas + PostGIS + constraints) — README:10
├─ indexador.js           # Indexador de eventos (D25) — README:11
├─ indexador-cli.js       # CLI: barrido único o --watch — README:12
├─ relayer.js             # Relayer EIP-712 (Ciclo 5) — README:13
├─ contratos.json         # Mapa contrato → {direccion, abi} — README:14
├─ api/
│  ├─ index-api.js        # Punto de entrada del servidor API
│  ├─ app.js              # Aplicación Express (routers + rate-limit)
│  ├─ lib/                # almacen.js (en memoria), auth.js (EIP-191), reputacion.js
│  └─ routes/             # auth, kyc, catalog, truekes, admin, reputacion, subastas
└─ test/                  # indexador, relayer, api, ciclo8, integracion-relayer
```

---

## 3. API REST (Express)

### 3.1 Creación de la aplicación (`backend/api/app.js`)

- `crearApp(deps)` — `app.js:31`; parseo JSON limitado a 1 MB (`app.js:33`).
- **Rate-limiting global** 120 peticiones/min con encabezados estándar (`app.js:36-44`; D16/
  RF-09.6).
- Health-check público: `GET /healthz` → `{ ok: true, servicio: 'truekeate-api' }` (`app.js:46`).
- Routers montados (`app.js:48-54`): `/auth`, `/kyc`, `/catalog`, `/truekes`, `/admin`,
  `/reputacion`, `/subastas`.
- 404 y manejador de errores JSON (`app.js:57-62`).

### 3.2 Arranque y puerto

- `iniciarServidor(deps, puerto)` con `PORT` (default **4000**) (`app.js:68-73`); loguea
  `http://127.0.0.1:${puerto}` (`app.js:71`).
- Punto de entrada `backend/api/index-api.js` — crea el almacén en memoria (`almacen.js:9`) e
  inicia el servidor con él (`index-api.js:6-10`).

### 3.3 Endpoints reales por router

| Router (montaje) | Endpoints (método · ruta · línea) | Notas |
|---|---|---|
| `/auth` (`app.js:48`) | `POST /connect` (`routes/auth.js:13`) · `POST /register` (`routes/auth.js:24`) · `POST /session` (`routes/auth.js:37`) | Inscripción/registro, sesión por firma |
| `/kyc` (`app.js:49`) | `POST /init` (`routes/kyc.js:15`) · `POST /verify-codes` (`routes/kyc.js:23`) · `POST /submit` (`routes/kyc.js:35`) · `GET /status` (`routes/kyc.js:49`) · `POST /review` (`routes/kyc.js:56`) | Escalera D28; revisión humana Owner |
| `/catalog` (`app.js:50`) | `POST /articulos` (`routes/catalog.js:16`) · `GET /` (`routes/catalog.js:34`) · `POST /encargos` (`routes/catalog.js:39`) · `GET /encargos` (`routes/catalog.js:47`) | `POST /articulos` exige estado VERIFICADO/CERTIFICADO (`catalog.js:16`) |
| `/truekes` (`app.js:51`) | `POST /` (`routes/truekes.js:43`) · `GET /:id` (`routes/truekes.js:63`) · `POST /:id/custodiar` (`routes/truekes.js:70`) · `POST /:id/firma-recepcion` (`routes/truekes.js:83`) · `POST /:id/valoracion` (`routes/truekes.js:94`) | Orquesta intents hacia el escrow (ver §7) |
| `/admin` (`app.js:52`) | `GET /usuarios` (`routes/admin.js:13`) · `GET /contratos` (`routes/admin.js:22`) · `GET /kpis-disputas` (`routes/admin.js:27`) · `GET /db` (`routes/admin.js:34`) · `GET /infra/health` (`routes/admin.js:43`) | Dashboard Owner (RF-13.1) |
| `/reputacion` (`app.js:53`) | `GET /mi` (`routes/reputacion.js:14`) · `POST /recargo-mensual` (`routes/reputacion.js:56`) | Reputación y recálculo mensual (D30) |
| `/subastas` (`app.js:54`) | `POST /` (`routes/subastas.js:18`) · `GET /` (`routes/subastas.js:44`) · `POST /:id/pujas` (`routes/subastas.js:49`) · `POST /:id/cerrar` (`routes/subastas.js:69`) | Subastas de empresa (RF-17) |

Reglas de negocio reales en la API de trueques:

- Crear trueque exige sesión + estado VERIFICADO/CERTIFICADO (`routes/truekes.js:43`).
- Verificado: máximo **3 trueques activos** (`routes/truekes.js:51-56`, RF-14.4).
- Valoración: 5 renglones enteros 1-5 (`routes/truekes.js:97-101`, D18).

### 3.4 Autenticación (EIP-191 + token opaco)

`backend/api/lib/auth.js`:

- Mensaje de sesión `'TrueKeate: iniciar sesión'` (`auth.js:10`) y recuperación de firmante con
  `ethers.verifyMessage` (`auth.js:13-15`).
- Tokens de sesión opacos (`randomBytes(24)`) (`auth.js:18-20`).
- Middleware `requiereSesion(almacen)` — exige `Authorization: Bearer <token>`
  (`auth.js:23-33`).
- Middleware `requiereEstado(almacen, ...estados)` — control de acceso por escalera D28
  (`auth.js:36-45`).

### 3.5 Almacén de datos actual (en memoria, puente a PostgreSQL)

- `backend/api/lib/almacen.js:2-5` — "Almacén en memoria que imita las tablas PostgreSQL del Ciclo
  4. En la integración C8 se sustituye por consultas reales a mcc-postgres manteniendo la misma
  interfaz".
- Estado interno: Maps de usuarios, kyc, articulos, encargos, truekes, sesiones (`almacen.js:8-15`).
- Interfaz de funciones `crearUsuario/getUsuario/actualizarUsuario`, `initKyc/getKyc`,
  `crearArticulo/listarArticulos`, `crearTrueke/getTrueke/actualizarTrueke`,
  `guardarSesion/getSesion` (`almacen.js:20-106`).
- La integración real con PostgreSQL está pendiente de la fase de integración C8
  (`backend/README.md:101-103`).

---

## 4. ethers v6 en el backend (usos reales)

| Uso | Lugar |
|---|---|
| `ethers.JsonRpcProvider(RPC_URL)` — proveedor RPC | `backend/indexador.js:250` |
| `ethers.Interface(abi)` — parseo de logs | `indexador.js:167`, `relayer.js:40` |
| `provider.getLogs({...})` — barrido de eventos | `indexador.js:200-205` |
| `provider.call({ to, data })` — lectura on-chain del estado de verificación | `relayer.js:104` |
| `new ethers.Contract(dir, abi, signer)` — envío directo de empresas | `backend/api/routes/truekes.js:24` |
| `ethers.Contract` lectura factory `cuentas(owner)` | `relayer.js:120-125` |
| `ethers.verifyMessage(mensaje, firma)` — EIP-191 | `backend/api/lib/auth.js:14` |
| `ethers.parseEther('0.5')` — umbral de saldo bajo | `relayer.js:203` |
| `ethers.getDefaultProvider`/red (`provider.getNetwork()`) | `relayer.js:139` |

---

## 5. PostgreSQL + PostGIS

### 5.1 Esquema (`backend/db/schema.sql`, 276 líneas)

- Extensiones: `postgis` y `pgcrypto` (`schema.sql:9-10`).
- 11 tipos ENUM, incluidos `estado_verificacion` (D28) (`schema.sql:27`), **estado_escrow de 9
  valores** (`schema.sql:31-35`) y tipos por dominio (usuario, nivel, medalla, kyc, imagen,
  suscripción, campaña, subasta) (`schema.sql:14-55`).
- **14 tablas**: `usuarios` (`schema.sql:62`), `kyc` (`schema.sql:82`), `articulos`
  (`schema.sql:96`), `truekes` — espejo del escrow (`schema.sql:111`), `valoraciones`
  (`schema.sql:129`), `puntos_encuentro` (`schema.sql:144`), `disputas` (`schema.sql:155`),
  `imagenes_certificadas` (`schema.sql:170`), `suscripciones` (`schema.sql:184`), `campanas`
  (`schema.sql:197`), `subastas` (`schema.sql:210`), `finanzas` (`schema.sql:228`),
  `auditoria` (`schema.sql:240`), `indexador_checkpoint` (`schema.sql:255`).
- Índices: estado de truekes, usuarios por estado, rubro de artículos, auditoría por
  tx/log, GIST sobre geografía de puntos de encuentro (`schema.sql:265-272`).
- Regla **≤ 10 km** con `ST_DWithin(geog, geog, 10000)` — consulta de ejemplo comentada
  (`schema.sql:274-276`).

### 5.2 Patrón de acceso: lectura impulsada por eventos

- Cabecera del esquema: "solo el indexador escribe en tablas espejo del estado on-chain
  (RNF-01.1); el backend escribe tablas off-chain" (`schema.sql:4-5`).
- El estado canónico nunca se modifica por SQL (RNF-01.1; `arquitectura_tecnica.md:336-337`).

### 5.3 PII y cifrado en reposo (D17)

- Columnas marcadas `[PII†]` con comentario "cifrado en reposo (D17)": `usuarios.correo`,
  `telefono`, `direccion_inscripcion` (`schema.sql:65-67`); `kyc.documento_identidad` (BYTEA),
  `selfie_ref`, `selfie_hash` (`schema.sql:85-87`).
- La extensión `pgcrypto` está habilitada (`schema.sql:10`).
- **No se verifica en el esquema un mecanismo concreto de cifrado de columnas** (solo los
  comentarios `[PII†]`) → implementación del cifrado **pendiente de confirmar**.

### 5.4 Base de datos objetivo

- Reutiliza `mcc-postgres` (D25/RT-02.8; `backend/README.md:26`); patrón pgadmin + contraseña
  desde Secret Manager (`entornos_globales.md:43`, `gcp-env.sh:59-70`). Ver manual 04-Despliegue.

---

## 6. Indexador de eventos (D25)

### 6.1 Arquitectura

- Clase `Indexador` (`backend/indexador.js:26-35`) con `provider` (ethers), `pool` (pg) y
  `contratos` = mapa `{ entidad: { direccion, abi } }`.
- Fabrica instancias con `crearIndexador(pool, contratos)` (`indexador.js:249-253`).
- Configuración por entorno: `RPC_URL` (default `http://127.0.0.1:8545`), `DATABASE_URL`,
  `CHECKPOINT_STEP` (default 50) (`indexador.js:19-23`).

### 6.2 Idempotencia (RNF-07.4/H-16)

- Constraint `UNIQUE (tx_hash, log_index, entidad)` en `auditoria` (`schema.sql:251`).
- `_registrarProcesado` inserta con `ON CONFLICT (...) DO NOTHING` (`indexador.js:38-48`).
- `procesarLog` comprueba primero si el evento ya está en `auditoria` y lo omite
  (`indexador.js:171-176`).

### 6.3 Aplicación de eventos a tablas espejo

Dispatcher por entidad (`indexador.js:52-66`) y mapeos:

| Entidad | Eventos | Efecto SQL |
|---|---|---|
| `Escrow` | `TruekeCreado` → INSERT `truekes` estado CREADO (`indexador.js:70-78`); `CustodiaA/B`, `AperturaA/B`, `TruekeCompletado`, `TruekeCancelado`, `EscrowBloqueado` → UPDATE estado (`indexador.js:79-92`); aperturas → timestamps `apertura_a/b` (`indexador.js:94-101`) | Tabla espejo `truekes` (`schema.sql:111`) |
| `SmartAccount` | `MerkleRootActualizado` → UPDATE `kyc.merkle_root` (`indexador.js:107-114`); `OwnerActualizado`/`RecuperacionEjecutada` → UPDATE `usuarios.wallet` (`indexador.js:115-121`) | `kyc`, `usuarios` |
| `SociosRegistry` | `SocioAdmitido` → UPDATE `usuarios.tipo='SOCIO'` (`indexador.js:127-133`) | `usuarios` |
| `BRLT` | `EmisionRegistrada` → suma en `finanzas.brlt` (`indexador.js:139-146`) | `finanzas` |
| `SuscripcionEmpresa` | `Suscrita` → INSERT `suscripciones` ACTIVA con ciclo de 30 días (`indexador.js:152-160`) | `suscripciones` |

### 6.4 Checkpoints, reproceso y barrido

- `barrerDesde(entidad, desdeBloque)` — obtiene logs por `topic0` de cada evento del ABI y
  actualiza el checkpoint en `indexador_checkpoint` (`indexador.js:191-220`).
- Reproceso desde bloque N ante pérdida/corrupción (RNF-07.4): se relanza con `DESDE_BLOQUE`
  (CLI, `indexador-cli.js:15`).

### 6.5 Reconciliación y métricas de lag

- `reconciliar(entidad)` — en este ciclo solo resume el espejo; la reconciliación fina por trueke
  se completa en C8 con los getters del escrow (`indexador.js:222-230`).
- `metricasLag()` — cabeza de bloque vs checkpoint por contrato (`indexador.js:233-245`), para el
  dashboard del Owner (D15/H-17).

### 6.6 CLI (`backend/indexador-cli.js`)

- `node indexador-cli.js` — barrido único + reconciliación; `--watch` — modo servicio con
  checkpoints (`indexador-cli.js:3-4`).
- Variables: `CONTRATOS_FILE` (default `./contratos.json`), `INTERVALO_MS` (default 5000),
  `DESDE_BLOQUE` (default 0) (`indexador-cli.js:12-15`).
- Bucle por entidad: `barrerDesde` → métricas → `reconciliar('Escrow')` (`indexador-cli.js:23-30`).

### 6.7 Mapa de contratos (`backend/contratos.json`)

- Formato `{ entidad: { direccion, abi } }` (verificado: Escrow, SmartAccount, SociosRegistry,
  BRLT, SuscripcionEmpresa con sus ABIs y direcciones).
- `SmartAccount` figura con dirección `0x0000...` (placeholder): al ser cuentas por usuario
  (factory), la suscripción a eventos requiere resolver las direcciones desplegadas → **pendiente
  de confirmar** cómo se completa en producción.
- `backend/README.md:14` — "actualizar tras cada deploy".

---

## 7. Relayer EIP-712

### 7.1 Componentes

- Clase `RelayerEIP712` (`backend/relayer.js:34-46`): `provider`, `wallet` (signer que paga el
  gas — cuenta 1 del anvil, RF-15.2), `smartAccountFactory` y ABI de SmartAccount.
- Estado anti-abuso en memoria por signer (`relayer.js:43`, `relayer.js:49-54`); persistencia
  prevista en C6/PostgreSQL (`relayer.js:30-32`).

### 7.2 Procesamiento de intents con las 4+2 protecciones

`procesarIntent(intent)` (`relayer.js:134-181`), en orden:

1. chainId correcto (`relayer.js:139-143`).
2. Bloqueo temporal activo (3 fallos/10 min → 1 h, D29) (`relayer.js:146-150`).
3. Límite diario 20 meta-tx (`relayer.js:153-156`).
4. Nonce + allowlist on-chain de verificados (D16/D28) (`relayer.js:158-160` vía
   `_validarCuenta`, `relayer.js:93-115`).
5. Envío: `wallet.sendTransaction` a la Smart Account con `execute(destino, valor, data, nonce,
   firma)` y `gasLimit: GAS_MAXIMO` (`relayer.js:162-167`).
6. Registro de éxito (nonce local + contador diario) o fallo → `_registrarFallos`
   (`relayer.js:170-180`).

### 7.3 Métricas y health-check

- `metricas()` — enviadas/rechazadas por motivo/signers activos (`relayer.js:184-190`).
- `health()` — saldo del wallet, chainId y `saldoBajo` (< 0.5 ETH, alerta al Owner D15)
  (`relayer.js:193-205`).

### 7.4 Integración con la API

`backend/api/routes/truekes.js:30-36` — los particulares entregan la firma EIP-712 en el body y la
API delega en `relayer.procesarIntent`; si el relayer rechaza, responde 422
`meta_tx_rechazada` (`truekes.js:34`). Test de integración en anvil verificado:
`backend/README.md:79-80` y `backend/test/integracion-relayer.js`.

---

## 8. Pruebas del backend

- `npm test` ejecuta `node --test` sobre `test/indexador.test.js`, `test/relayer.test.js` y
  `test/api.test.js` (`package.json:7`); total documentado **19/19** (`backend/README.md:98`).
- Los tests del indexador usan un pool en memoria (sin PostgreSQL) y validan el mapeo de eventos e
  idempotencia; la integración con `mcc-postgres` real se verifica en GCP
  (`backend/README.md:56-57`).
- Archivos adicionales: `backend/test/ciclo8.test.js` y `backend/test/integracion-relayer.js`
  (integración E2E en anvil, no incluida en `npm test`).

---

## 9. Notas de verificación

- El diseño pide TypeScript (RNF-04.2, `arquitectura_tecnica.md:380`); el código es JavaScript ESM
  → **pendiente de confirmar**.
- El cifrado en reposo de PII está marcado en el esquema pero sin mecanismo verificado → ver §5.3.
- El almacén en memoria de la API será sustituido por PostgreSQL en la integración C8
  (`almacen.js:2-5`).
