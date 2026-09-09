# Manual Técnico 06 — Backend: API REST (Express)

> **Alcance**: implementación real de la API REST/JSON de TrueKeate (Ciclo 6, Ciclo 8 y ciclos del
> director 2026-09-08/09): `app.js`, routers `/auth`, `/kyc`, `/catalog`, `/truekes`, `/admin`,
> `/reputacion`, `/subastas`, `/finanzas`, `/valor`, `/disputas`, `/notificaciones`, `/gobernanza`,
> `/puntos-encuentro` (13 routers), capa de almacén (memoria/PG), motor de disputas
> (`lib/flujo-disputas.js`) y reglas de negocio (D14, RF-14.4, D12/D30, D27, D17, D18, D28,
> RF-17.x, RF-13.1, flujo del director 2026-09-08/09).
> **Fuentes leídas**: `backend/api/app.js`, `backend/api/index-gcp.js`, `backend/api/routes/*.js`
> (13 routers), `backend/api/lib/*.js` (almacen, auth, es-owner, reputacion, flujo-disputas),
> `backend/db/schema.sql` + migraciones 2026-09, `backend/test/*.test.js`,
> `RepoTecnico/arquitectura_tecnica.md` §7 (diseño de referencia).
> **Convención**: referencias `ruta:línea` al código real. Endpoints que el diseño §7 lista pero que
> el código no implementa se marcan explícitamente como **no implementados en este ciclo** para no
> prometer funciones inexistentes.
>
> ⚠️ **Revisión 2026-09**: este manual describe la base C6/C8 con el **almacén en memoria**. Desde la
> integración con PostgreSQL y la certificación SBT, el router `/kyc` fue **reescrito** (verificación
> con código real de correo, SBT/imágenes y guard Owner on-chain) → su documentación actualizada está
> en **`03-Implementacion/09-certificacion-sbt.md`**; el Panel del Owner (rutas `/admin/*` + `/kyc/*`
> Owner) en **`08-Suite-Sistemas/01-panel-sistemas.md`**. El montaje de producción inyecta
> PostgreSQL/relayer/indexador (ver §1).
>
> 🔄 **Revisión 2026-09-09 (ciclos del director)**: §6 Admin ya NO se protege por "tipo SOCIO o rol
> OWNER": **todas** las rutas `/admin/*` exigen sesión + `requiereOwner` (dueño on-chain del
> `SociosRegistry`, `lib/es-owner.js`), con `GET /admin/owner` público; §5 Truekes refleja el flujo
> abierto-acordado y el cierre ✗ No Conforme; y se añadieron las secciones **§13 Disputas v2**,
> **§14 VALOR**, **§15 Notificaciones**, **§16 Regla de encuentro** y **§17 Valoración persistida**.

---

## 1. Montaje de la aplicación

### 1.1 `crearApp(deps)` — composición y middleware

- Fábrica que recibe `deps = { almacen, relayer?, escrowAbi?, contratos? }` y construye la app Express (`backend/api/app.js:31-32`).
- `express.json({ limit: '12mb' })` para el cuerpo JSON (soporta fotos base64 de artículos y de disputas; `backend/api/app.js:39`).
- **Rate-limiting global (D16/RF-09.6)**: 120 peticiones por minuto por ventana de 60 s, con `standardHeaders` y mensaje `{ error: 'rate_limit', detalle: 'demasiadas peticiones' }` (`backend/api/app.js:66-74`).
- `GET /healthz` → `{ ok: true, servicio: 'truekeate-api' }` (`backend/api/app.js:76`).
- Montaje de routers en sus prefijos (`backend/api/app.js:78-90`): `/auth`, `/kyc`, `/catalog`,
  `/truekes`, `/admin`, `/reputacion`, `/subastas`, `/finanzas`, `/valor`, `/disputas`,
  `/notificaciones`, `/gobernanza`, `/puntos-encuentro` (**13 routers** en el código actual; `/valor`
  y `/notificaciones` montados en la revisión 2026-09-09).
- Manejo de 404 (`{ error: 'not_found' }`) y error handler central que devuelve `status`/`code`/`detalle` en JSON (`backend/api/app.js:57-62`).

### 1.2 `iniciarServidor` y punto de entrada

- `iniciarServidor(deps, puerto = PORT || 4000)` escucha en `http://127.0.0.1:<puerto>` y devuelve `{ app, server }` (`backend/api/app.js:68-74`).
- El entry `backend/api/index-api.js` crea **solo el almacén en memoria** y arranca sin relayer/indexador/contratos (`backend/api/index-api.js:6-10`). Consecuencia real: `GET /admin/infra/health` devuelve `{}` (no hay `relayer` ni `indexador` inyectados) y las rutas de trueques avanzan el espejo **sin envío on-chain** (solo firma-por-acción EIP-191 validada por `requiereFirmaAccion`; ver §5). El entry de producción `backend/api/index-gcp.js` inyecta PostgreSQL (`crearAlmacenPg`), `proveedor`/`registryAddress`, relayer, minteador e indexador cuando las env están configuradas (`backend/api/index-gcp.js:54-129`).

### 1.3 Almacén en memoria (lib/almacen.js)

- El almacén imita las tablas PostgreSQL del Ciclo 4 con `Map`s: `usuarios`, `kyc`, `articulos`, `encargos`, `truekes`, `sesiones` (`backend/api/lib/almacen.js:7-18`).
- Defaults de usuario (`crearUsuario`): `tipo: 'PARTICULAR'`, `nivel: 'INICIADO'`, `medalla: 'BRONCE'`, `estado: 'INSCRITO'` (escalera D28), `consentimientoGdpr: false`, `smartAccount: null` (`backend/api/lib/almacen.js:22-34`).
- API del almacén: `crearTrueke` devuelve el **id numérico** e inicia `estado: 'CREADO'` (`backend/api/lib/almacen.js:79-83`); `actualizarTrueke`/`getTrueke` convierten el id a número (`backend/api/lib/almacen.js:84-92`); sesiones `token → { wallet }` (`backend/api/lib/almacen.js:100-105`).
- El comentario declara que en la integración C8 se sustituye por consultas a PostgreSQL manteniendo la interfaz (`backend/api/lib/almacen.js:1-6`) — **pendiente de confirmar** si ya se sustituyó (el código actual sigue en memoria).

---

## 2. Autenticación y sesión (auth)

### 2.1 lib/auth.js — primitivas

- `recuperarFirmante(mensaje, firma)` recupera la wallet firmante de un mensaje **EIP-191** con `ethers.verifyMessage` (`backend/api/lib/auth.js:13-15`); el mensaje de sesión canónico es `'TrueKeate: iniciar sesión'` (`backend/api/lib/auth.js:10`).
- `nuevoToken()` genera un **token opaco** de `randomBytes(24)` en hex — no es un JWT (`backend/api/lib/auth.js:18-20`).
- Middleware `requiereSesion(almacen)`: exige `Authorization: Bearer <token>` con sesión válida; carga `req.wallet` y `req.usuario`; 401 `{ error: 'no_autorizado' }` en caso contrario (`backend/api/lib/auth.js:23-33`).
- Middleware `requiereEstado(almacen, ...estados)`: exige que el usuario esté en alguno de los estados de la escalera D28; 403 `estado_requerido` o 404 si el usuario no existe (`backend/api/lib/auth.js:36-45`).

### 2.2 Rutas /auth (routes/auth.js)

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /auth/connect` | El frontend anuncia la wallet conectada; **inscripción automática RF-01.4**. Valida `^0x[0-9a-fA-F]{40}$` (400 `wallet_invalida`); crea el usuario si no existe y devuelve `{ usuario }` | `backend/api/routes/auth.js:13-21` |
| `POST /auth/register` | Formaliza la inscripción con correo/teléfono + **consentimiento GDPR obligatorio (D17)**; sin consentimiento → 400 `consentimiento_requerido`; 404 si el usuario no existe | `backend/api/routes/auth.js:24-34` |
| `POST /auth/session` | Valida la firma EIP-191 del mensaje `'TrueKeate: iniciar sesión'`, crea token opaco y guarda la sesión; 401 `firma_invalida`, 404 `usuario_inexistente` | `backend/api/routes/auth.js:37-50` |

- **Discrepancia documentada**: la cabecera de `app.js` menciona "JWT corto" (`backend/api/app.js:13-14`) y el diseño §7 "JWT de corta vida"; la implementación usa un **token opaco** (`backend/api/lib/auth.js:18-20`) — no hay JWT en el código.
- **No implementados** (listados en diseño §7): `POST /auth/verify-email` y `POST /auth/verify-phone` → pendiente de confirmar; la verificación de códigos vive en `/kyc/verify-codes` — con validación real de código (TTL 10 min) en el router reescrito (ver Manual 09 §4.2).

---

## 3. KYC — reescrito en 2026-09 (ver Manual 09)

> ⚠️ La sección original de este manual describía el router `/kyc` del Ciclo 6 (almacén en memoria,
> códigos sin validación real, submit con referencias y `/kyc/review` sin control de rol). Ese router
> fue **reescrito por completo** (2026-09, decisión del director): verificación de correo con código
> real (SMTP opcional/modo demo), **certificación con SBT** (`/kyc/sbt`, `/kyc/auto-certificar`),
> **imágenes reales** DNI+selfie (`/kyc/submit`, `/kyc/imagen/:id`) y **guard Owner on-chain**
> (`esOwner` → `SociosRegistry.owner()`) en `/kyc/pendientes` y `/kyc/review`.
>
> **Documentación actualizada y completa**: `03-Implementacion/09-certificacion-sbt.md` (§4 con todas
> las rutas y referencias `backend/api/routes/kyc.js:<línea>`).

---

## 4. Catálogo AtoA y encargos (catalog)

### 4.1 Límites por nivel (D14 / RF-04.2)

- Tabla `LIMITE_ARTICULOS_POR_NIVEL = { INICIADO: 5, COMUN: 50, FRECUENTE: 100, SOCIO: 100 }` (`backend/api/routes/catalog.js:10`). Default de seguridad: 5.
- **El nivel manda sobre el tipo (D14)**: el límite aplica según `u.nivel` del usuario, no por su tipo (`backend/api/routes/catalog.js:21`).

### 4.2 Rutas /catalog

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /catalog/articulos` | Publica un artículo AtoA; requiere estado **VERIFICADO o CERTIFICADO** (middleware `requiereEstado`) y que el usuario no supere el límite de su nivel (403 `limite_articulos`); valida `titulo` y `rubro` | `backend/api/routes/catalog.js:16-31` |
| `GET /catalog` | Catálogo **público** (sin sesión): solo artículos `disponible` (el Inscrito puede ver ofertas — RF-14.3) | `backend/api/routes/catalog.js:34-36` |
| `POST /catalog/encargos` | Solicitar artículo fuera del mercado (CU-07); solo requiere sesión; valida `articuloDeseado` | `backend/api/routes/catalog.js:39-44` |
| `GET /catalog/encargos` | Lista encargos en estado `ACTIVO` | `backend/api/routes/catalog.js:47-49` |

- El límite de artículos cuenta los propios con `disponible !== false` (`backend/api/routes/catalog.js:22`).

---

## 5. Truekes (orquestación del escrow, flujo abierto-acordado)

### 5.1 Rutas /truekes (routes/truekes.js)

El router actual (488 líneas) implementa el **modelo abierto-acordado** del director
(`RepoTecnico/logica_trueke.md`): A publica una oferta (`PROPUESTO`), B la acuerda, la parte de
mayor nivel/reputación propone el encuentro, y el cierre es ✓ Recibido Conforme o ✗ No Conforme
(este último **dispara la disputa**, ver §13).

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /truekes/ofertas` | A publica una oferta abierta (estado `PROPUESTO`); requiere **VERIFICADO/CERTIFICADO** + **firma por acción** (`requiereFirmaAccion('publicar oferta de trueque')`); máx. 3 activos para Verificado (RF-14.4) → 403 `max_3_activos`; valida que `articuloAId` sea del usuario | `backend/api/routes/truekes.js:44-70` |
| `GET /truekes/ofertas` | Ofertas abiertas del Mercado (público, observable con wallet — RF-14.3) | `backend/api/routes/truekes.js:73-78` |
| `POST /truekes/:id/acordar` | B acuerda la oferta (exige `articuloBId` propio); estados activos a contar para RF-14.4: CREADO/ACTIVO/CUSTODIADO/APERTURA | `backend/api/routes/truekes.js:82-106` |
| `GET /truekes/:id/contacto` | Contacto (teléfono/correo) de la **contraparte**, solo para las partes y mientras el trueke no esté cerrado (oculto en COMPLETADO/ANULADO/BLOQUEADO) | `backend/api/routes/truekes.js:111-129` |
| `GET /truekes/:id` | Detalle del trueque; 404 si no existe | `backend/api/routes/truekes.js:132-136` |
| `POST /truekes` | Crea trueque clásico (A⇄B directo); requiere VERIFICADO/CERTIFICADO + firma; valida `articuloAId`, `articuloBId`, `parteB` | `backend/api/routes/truekes.js:140-164` |
| `POST /truekes/:id/custodiar` | Custodia (CU-12): autoriza por lado (`lado` A solo `usuarioA`, B solo `usuarioB`) + firma; marca el espejo **CUSTODIADO** | `backend/api/routes/truekes.js:167-177` |
| `POST /truekes/:id/firma-recepcion` | Firma de recepción (CU-14): autoriza por lado + firma; marca `firmaA`/`firmaB` | `backend/api/routes/truekes.js:180-190` |
| `POST /truekes/:id/valoracion` | Valoración (D18): 5 renglones enteros 1–5 → 400 `valoraciones_1_a_5`; estados admitidos CUSTODIADO/APERTURA/COMPLETADO; **persiste en la tabla `valoraciones`** vía `almacen.registrarValoracion` cuando el almacén lo soporta (§17) | `backend/api/routes/truekes.js:195-226` |
| `POST /truekes/:id/cierre` | Cierre (punto 9): `{ lado, conforme }` + firma. ✓ Conforme registra `cierre_a/b='CONFORME'` (con ambos conformes → COMPLETADO + reasignación **en cruz** de los artículos); ✗ No Conforme **exige motivo + fotos** y llama `motorDisputas.abrirDisputaDesdeCierre` (§13) | `backend/api/routes/truekes.js:355-439` |
| `POST /truekes/nft/:tokenId/usar` | Consume el NFT recibido (punto 2): quema on-chain con `minteadorNft.usar` (o simula sin red) y marca `usado_el` | `backend/api/routes/truekes.js:447-485` |

### 5.2 Encuentro: propuesta/aceptación (regla del director)

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /truekes/:id/encuentro/rol` | Devuelve `{ rol: 'propone'|'aprueba', propone, aprueba, regla, encuentroEstado }` según `quienProponeEncuentro` (mayor nivel → mayor reputación → A) | `backend/api/routes/truekes.js:251-269` |
| `POST /truekes/:id/propuesta-encuentro` | Solo la parte que gana la regla propone `{ puntoEncuentroId, horaPautada }`; fija `encuentroEstado='PROPUESTO'` y `encuentroPropuestoPor`; registra el punto en favoritos | `backend/api/routes/truekes.js:274-306` |
| `POST /truekes/:id/encuentro/aceptar` | La contraparte acepta → `encuentroEstado='ACEPTADO'` y **custodia automática de ambos** (estado `CUSTODIADO`, punto 7) | `backend/api/routes/truekes.js:311-330` |
| `POST /truekes/:id/encuentro/rechazar` | La contraparte rechaza → `encuentroEstado='RECHAZADO'` | `backend/api/routes/truekes.js:333-348` |

### 5.3 Firma por acción y estado real del envío on-chain

- Las operaciones sensibles exigen **firma EIP-191 por acción** en el body (`{ mensaje, firma }` con
  formato `TrueKeate: <acción> (ts=<epoch_ms>)`, ventana anti-replay de 5 min): middleware
  `requiereFirmaAccion(accion)` en `backend/api/lib/auth.js:99-106` (validación en `:42-66`).
- **Estado real**: las rutas de avance actualizan el espejo (BD o memoria) y validan la firma, pero
  **no envían intents EIP-712 al relayer** desde este router en el código actual (el dep `relayer`
  se inyecta en producción — `backend/api/index-gcp.js:88-99` — pero ninguna ruta de `truekes.js` lo
  invoca) → pendiente de confirmar el cableado on-chain (el comentario de cabecera lo declara,
  `truekes.js:6-7`).
- **No implementados** (diseño §7): `POST /truekes/:id/apertura`, `POST /truekes/:id/anulacion`,
  `POST /truekes/:id/punto` y `POST /truekes/:id/disputa` — la disputa hoy nace en
  `POST /truekes/:id/cierre` con `conforme:false` (§13) y los puntos de encuentro viven en
  `/puntos-encuentro`.

---

## 6. Admin / dashboard del Owner (RF-13.1) — endurecido 2026-09-09

> ⚠️ **Cambio de acceso (2026-09-09, decisión del director)**: ya **NO** entra "cualquier tipo SOCIO
> ni rol OWNER" en BD. **TODAS** las rutas `/admin/*` exigen sesión **Y** que la wallet sea el
> **Owner real**: el dueño on-chain del `SociosRegistry` (`owner()`), resuelto por
> `backend/api/lib/es-owner.js`. Ana/Bruno (tipo `SOCIO`) NO acceden a Sistemas; solo la wallet
> `owner()` del registry (cuenta anvil #0 en GCP).

### 6.1 Rutas /admin (routes/admin.js)

El router crea el detector de Owner una vez: `owner = crearDetectorOwner({ almacen, proveedor,
registryAddress, ownerWallet })` (`backend/api/routes/admin.js:16`) y protege cada ruta con
`requiereSesion(almacen)` + `owner.requiereOwner`:

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /admin/usuarios` | Usuarios inscritos → `{ total, usuarios }`; **solo Owner** (403 `solo_owner`) | `backend/api/routes/admin.js:19-22` |
| `GET /admin/contratos` | Direcciones de contratos desplegados (`contratos ?? {}`); **solo Owner** | `backend/api/routes/admin.js:25-27` |
| `GET /admin/kpis-disputas` | KPIs: `totalTruekes` y `disputasAbiertas` (estados `EN_DISPUTA`/`RESOLUCION_SOCIOS` del espejo); **solo Owner** | `backend/api/routes/admin.js:30-34` |
| `GET /admin/db` | Estado de la BD off-chain (conteos de usuarios, artículos, truekes); **solo Owner** | `backend/api/routes/admin.js:37-44` |
| `GET /admin/infra/health` | Salud del relayer (`health()` + `metricas()`) e indexador (`metricasLag()`) cuando están inyectados (D15/H-17); sin deps devuelve `{}`; **solo Owner** | `backend/api/routes/admin.js:47-53` |
| `GET /admin/owner` | **Público** (sin sesión ni rol): `{ owner }` = wallet del Owner resuelta (el frontend lo usa para ocultar/mostrar el icono de Sistemas; sin PII adicional) | `backend/api/routes/admin.js:57-60` |

### 6.2 lib/es-owner.js — única fuente de verdad del Owner

- **Definición** (`backend/api/lib/es-owner.js:1-14`): el Owner es el dueño **on-chain** del
  `SociosRegistry` (`owner()`, ABI mínimo `['function owner() view returns (address)']`, línea 17),
  no un "tipo de usuario". Ana/Bruno/Owner son todos `tipo=SOCIO` en la BD, pero solo la wallet
  dueña del registry es el Owner (RF-13.1 / RF-18.4).
- **Orden de resolución de `resolverOwner()`** (`es-owner.js:41-67`), con caché de 30 s (línea 27):
  1. **On-chain**: `owner()` del `SociosRegistry` si hay `registryAddress` + `proveedor`
     (`es-owner.js:29-38`) — vía de producción (GCP).
  2. Sin red: env `OWNER_WALLET`/`ownerWallet` (`es-owner.js:51-56`).
  3. Sin red ni env: usuario de BD con `rol === 'OWNER'` (`es-owner.js:57-65`) — *solo útil en tests
     en memoria*: la columna `rol` **no existe** en `usuarios` (ver Manual 05).
- `esOwner(wallet)` compara en minúsculas (`es-owner.js:70-73`).
- Middleware `requiereOwner(req, res, next)` → 403 `{ error: 'solo_owner', detalle: 'sección
  reservada al Owner (RF-13.1)' }` si la wallet de la sesión no es el Owner; 500 `internal` si la
  verificación on-chain falla (`es-owner.js:76-88`).
- Consumo fuera de /admin: `/auth/estado`, `/auth/connect` y `/auth/session` devuelven `esOwner`
  (calculado con el mismo detector, `backend/api/routes/auth.js:52,67,116`) y `/valor` amplía el rol
  del Owner como `OWNER` (§14).

---

## 7. Reputación y niveles (D12/D30, CU-20)

### 7.1 Fórmula de puntaje (lib/reputacion.js)

- **Fórmula D12**: `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)` con pesos `{ reputacion: 0.5, volumen: 0.3, apelaciones: 0.2 }` (`backend/api/lib/reputacion.js:16`).
- **Normalización 0–100 (D30)** en `calcularPuntaje` (`backend/api/lib/reputacion.js:23-35`):
  - reputación: media 1–5 × 20 (clamp 0–100) — línea 24.
  - volumen: `(volumenEfectivo / volumenMaximoSistema) × 100`, clamp 0–100 — líneas 25-27.
  - apelaciones: `100 × (1 − ratio)`, con `ratio = min(1, apelaciones/efectivos)` — líneas 28-29.
  - resultado redondeado y clamp 0–100 — líneas 31-34.
- **Umbrales de nivel/medalla (D12)** (`backend/api/lib/reputacion.js:9-14`): INICIADO 0–25 BRONCE · COMUN 26–50 PLATA · FRECUENTE 51–75 ORO · SOCIO 76–100 ORO.
- `clasificarNivel(puntaje)` recorre los umbrales y devuelve `{ nivel, medalla }` (`backend/api/lib/reputacion.js:38-45`).
- `esOroHistorico(efectivos, efectivosTotales)`: **≥ 1000 efectivos y ratio ≥ 90 %** (RF-03.4/07.4) — requisito de Empresa (`backend/api/lib/reputacion.js:48-51`).
- `penalizarPorInactividad(...)`: **180 días sin actividad y dominio > 5 %** del mercado (D19/CU-21) (`backend/api/lib/reputacion.js:54-61`).

### 7.2 Rutas /reputacion (routes/reputacion.js)

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /reputacion/mi` | Calcula y devuelve `{ puntaje, nivel, medalla, oroHistorico, metricas, formula }` del usuario en sesión (CU-20) | `backend/api/routes/reputacion.js:14-53` |
| `POST /reputacion/recargo-mensual` | Dispara el recálculo mensual (D30); en este ciclo **solo responde un aviso** (el lote programado real está pendiente) | `backend/api/routes/reputacion.js:56-59` |

### 7.3 Insumos reales del cálculo (GET /reputacion/mi)

- Truekes propios desde el espejo en memoria: `efectivos` = COMPLETADO; `apelaciones` = EN_DISPUTA o RESOLUCION_SOCIOS (`backend/api/routes/reputacion.js:16-20`).
- `reputacionMedia` = promedio de los `renglones` de valoraciones (1–5) guardados en el espejo; si no hay valoraciones, 0 (`backend/api/routes/reputacion.js:23-28`).
- `volumenMaximo` está **fijado en 1** en este ciclo (`Math.max(1, ...)`, `backend/api/routes/reputacion.js:31-34`) → la normalización de volumen devuelve 100 % con 1 o más trueque efectivo; la normalización contra el máximo real del sistema queda pendiente.
- `penalizarPorInactividad` se importa (`backend/api/routes/reputacion.js:8`) pero **no se invoca** en ninguna ruta.

---

## 8. Subastas de empresa (RF-17, D27, CU-25/26)

### 8.1 Rutas /subastas (routes/subastas.js)

- El estado de las subastas vive en un **`Map` local del router** (no en el almacén ni en PostgreSQL) con ids autoincrementales (`backend/api/routes/subastas.js:13-15`).
- `PRIORIDAD_NIVEL = { INICIADO: 0, COMUN: 1, FRECUENTE: 2, SOCIO: 3 }` para el desempate D27 (`backend/api/routes/subastas.js:9`).

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /subastas` | Crear subasta; **solo tipo EMPRESA (RF-17.1)** → 403 `solo_empresa`; valida `articuloId` y `pujaInicial`; defaults `incrementoMinimo: 0`, `duracionHoras: 24`; estado `ABIERTA` y `cierraEn = now + duracionHoras·3600000` | `backend/api/routes/subastas.js:18-41` |
| `GET /subastas` | Lista subastas `ABIERTA` (público, sin sesión) | `backend/api/routes/subastas.js:44-46` |
| `POST /subastas/:id/pujas` | Pujar; **solo estado CERTIFICADO (RF-17.2)** → 403 `solo_certificado`; 404 si la subasta no está ABIERTA; rechaza puja < `pujaInicial` (400 `puja_baja`) o que no respete `incrementoMinimo` sobre la última (400 `incremento_minimo`); guarda `{ wallet, valor, nivel, en }` | `backend/api/routes/subastas.js:49-66` |
| `POST /subastas/:id/cerrar` | Cierre manual: solo si `Date.now() >= cierraEn` (400 `no_vencida` con minutos restantes); sin pujas → `ANULADA` con `ganador: null`; **adjudicación D27: mayor valor; empate → mayor nivel** (`PRIORIDAD_NIVEL`); estado `CERRADA` + `ganador` | `backend/api/routes/subastas.js:69-91` |

- **Nota**: no hay endpoint de detalle `GET /subastas/:id` ni de listado de pujas; el cierre es manual (no hay cron de vencimiento); la persistencia es volátil (Map del router). El test `ciclo8` valida la adjudicación D27 reimplementada en unit (`backend/test/ciclo8.test.js:128-141`).

---

## 9. Reglas de negocio transversales (resumen)

### 9.1 Escalera y niveles

| Regla | Implementación | Ref. |
|---|---|---|
| Escalera D28: INSCRITO → VERIFICADO → CERTIFICADO | Estados en `almacen.js:27`, transiciones en kyc.js | `backend/api/routes/kyc.js` (ver Manual 09) |
| Límites por nivel de artículos: 5/50/100/100 (D14) | `LIMITE_ARTICULOS_POR_NIVEL` | `backend/api/routes/catalog.js:10` |
| Máx. 3 trueques activos para Verificado (RF-14.4) | Conteo de activos (ofertas y crear/acordar) | `backend/api/routes/truekes.js:59-61,99-101,152-154` |
| Valoraciones 1–5 en 5 dimensiones (D18) | Validación de enteros + persistencia en `valoraciones` | `backend/api/routes/truekes.js:201-203,215-220` |
| Fórmula reputación D12/D30 (0,5/0,3/0,2) | `calcularPuntaje` | `backend/api/lib/reputacion.js:23-35` |
| Subastas: empresa crea (RF-17.1), certificado puja (RF-17.2), desempate por nivel (D27) | Router /subastas | `backend/api/routes/subastas.js:18,49,84-85` |
| Consentimiento GDPR (D17) | `consentimientoGdpr` obligatorio | `backend/api/routes/auth.js:74-101` |
| Rate-limiting global (D16/RF-09.6) | 120 req/min | `backend/api/app.js:66-74` |
| Admin solo Owner on-chain (RF-13.1) | `esOwner`/`requiereOwner` | `backend/api/lib/es-owner.js:41-88`; `routes/admin.js:16,19` |
| Firma por acción EIP-191 (seguridad por acción) | `requiereFirmaAccion` (mensaje `ts=` 5 min) | `backend/api/lib/auth.js:42-66,99-106` |
| Flujo de disputas REPORTADA→…→RESUELTA (director) | `crearMotorDisputas` | `backend/api/lib/flujo-disputas.js:27,104-147,158-203` |

### 9.2 Modelo de errores

- Errores en JSON con `error` (código estable), a veces `detalle`: `wallet_invalida`,
  `consentimiento_requerido`, `datos_requeridos`, `firma_invalida`, `estado_requerido`,
  `limite_articulos`, `max_3_activos`, `valoraciones_1_a_5`, `solo_owner`, `solo_empresa`,
  `solo_certificado`, `solo_socio`, `solo_empresa_socio`, `solo_empresa_socio_owner`,
  `socio_involucrado`, `ya_voto`, `no_en_votacion`, `votacion_vencida`, `estado_no_justificable`,
  `estado_no_declarable`, `motivo_requerido`, `fotos_requeridas`, `voto_invalido`,
  `disputa_inexistente`, `evidencia_inexistente`, `monto_invalido`, `saldo_insuficiente`,
  `datos_invalidos`, `stripe_no_configurado`, `stripe_error`, `webhook_error`, `firma_requerida`,
  `mensaje_invalido`, `firma_expirada`, `firma_no_corresponde`, `rate_limit`, `not_found`,
  `internal` (`backend/api/app.js:95-98` y routers).

---

## 10. Endpoints del diseño §7 aún no implementados (estado 2026-09-09)

**Ya existen** en el código: `/finanzas/*`, `/valor/*`, `/disputas/*`, `/notificaciones/*`,
`/gobernanza/*`, `/puntos-encuentro/*` (montados en `backend/api/app.js:78-90`), el router `/kyc`
reescrito (Manual 09) y el flujo de trueques abierto-acordado con cierre/disputa (§5/§13). Siguen
**pendientes de confirmar** (sin router en el código): `POST /auth/verify-email`,
`POST /auth/verify-phone`, `POST /kyc/appeal`, `GET /kyc/queue`, campañas (`/campanas/*`) y las
variantes on-chain directas de apertura/anulación (`POST /truekes/:id/apertura`,
`POST /truekes/:id/anulacion`). El router `/finanzas` quedó como legado (montado pero fuera de la
matriz de navegación): la sección de la suite es **VALOR** (`/valor`, §14).

---

## 11. Suite de pruebas de la API (14/14)

- `backend/test/api.test.js` (7 casos) — flujos C6 (`backend/test/api.test.js:43-143`):
  1. `/auth/connect` inscribe (RF-01.4) y `/auth/register` exige GDPR (D17) (`api.test.js:43-55`).
  2. `/auth/connect` rechaza wallet malformada (`api.test.js:57-60`).
  3. KYC códigos → VERIFICADO; submit + revisión Owner → CERTIFICADO (D28/CU-02) (`api.test.js:62-81`).
  4. Catalog: solo Verificado/Certificado publica; límite por nivel (D14/RF-04.2) (`api.test.js:83-96`).
  5. Truekes: Verificado crea (máx 3 RF-14.4) y valida valoración 1–5 (D18) (`api.test.js:98-123`).
  6. Admin: dashboard con KPIs (`api.test.js:125-137`).
  7. `/healthz` responde (`api.test.js:139-143`).
- `backend/test/ciclo8.test.js` (7 casos): 4 unit de reputación (fórmula D12/D30, Oro histórico, penalización D19 — `ciclo8.test.js:15-39`), `GET /reputacion/mi` (`ciclo8.test.js:71-80`), subastas RF-17.1/17.2 (`ciclo8.test.js:101-126`) y unit de adjudicación D27 (`ciclo8.test.js:128-141`).
- Ejecución verificada en este análisis: 14/14 verdes (backend total 26/26 — ver manual 08).

---

## 12. Limitaciones y pendientes observados

- **Almacén**: `backend/api/index-api.js` (dev) usa el **almacén en memoria** (`lib/almacen.js`) y los
  datos se pierden al reiniciar; el entry de producción `backend/api/index-gcp.js` inyecta
  **PostgreSQL** (`lib/almacen-pg.js`) cuando hay `DATABASE_URL`, más relayer e indexador desde
  `backend/contratos.json` (`index-gcp.js:37-129`).
- **Sesiones**: en memoria en dev; en producción persisten en la tabla `sesiones` (24 h —
  `backend/db/schema.sql:350-356`).
- **KYC (2026-09)**: resuelto en el router reescrito — código real con TTL 10 min (SMTP opcional,
  `codigoDemo` en demo), guard Owner on-chain en `/kyc/review` y `/kyc/pendientes` (Manual 09).
- **Truekes**: las rutas de avance actualizan el espejo y validan la **firma por acción**, pero no
  envían intents EIP-712 al relayer en el código actual (el dep `relayer` se inyecta en producción
  pero ninguna ruta lo invoca) — §5.3.
- **Disputas/cierre**: la API escribe estados `EN_DISPUTA`/`RESOLUCION_SOCIOS`/`COMPLETADO`/
  `ANULADO` en el espejo `truekes` (flujo off-chain 2026-09); la sincronización on-chain de esos
  estados con el contrato `Escrow` queda **pendiente de confirmar**.
- **Reputación**: `volumenMaximo` fijo en 1; lote mensual de recálculo solo simulado.
- **Subastas**: estado en `Map` local (volátil), cierre manual, sin endpoints de detalle/pujas.
- **VALOR/BRLT**: sin `STRIPE_SECRET_KEY` el checkout registra el movimiento como **demo** (503
  `stripe_no_configurado`, `routes/valor.js:196-200`); el retiro a fiat real requiere Stripe
  Payouts (registrado, no ejecutado — `valor.js:267-288`).
- **Autenticación**: token opaco en lugar del "JWT corto" citado en comentarios
  (`backend/api/app.js:13`; el real es `lib/auth.js:19-21`).

---

## 13. Disputas v2 (/disputas) — flujo afinado del director (2026-09-08)

### 13.1 Origen y estados

- La disputa **nace SOLO desde el cierre ✗ No Conforme**: `POST /truekes/:id/cierre` con
  `{ lado, conforme: false, motivo, fotos }` invoca `motorDisputas.abrirDisputaDesdeCierre`
  (`backend/api/routes/truekes.js:370-383`). No existe `POST /truekes/:id/disputa` ni
  `GET /disputas` público.
- **Máquina de estados** (`backend/api/lib/flujo-disputas.js:5-6,13`):
  `REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA`, con `ESTADOS_ACTIVOS =
  ['REPORTADA','ESPERA_JUSTIFICATIVO','EN_VOTACION']`.
- **Plazos del director**: justificativo del conforme **3 días** (`PLAZO_JUSTIFICATIVO_MS`,
  `flujo-disputas.js:11`) y votación **5 días** (`PLAZO_VOTACION_MS`, `flujo-disputas.js:12`;
  D13/D21).
- Decisión de arranque en `abrirDisputaDesdeCierre` (`flujo-disputas.js:158-203`):
  - si ya hay disputa activa y quien firma No Conforme es la **contraparte** (no el reclamante),
    ambas partes aportaron evidencia → `EN_VOTACION` directo (`flujo-disputas.js:164-171`);
  - si la contraparte ya firmó `CONFORME` → `ESPERA_JUSTIFICATIVO` con `justificativoVenceAt`
    (`flujo-disputas.js:182-193`) y se le notifica `PEDIDO_JUSTIFICATIVO`;
  - si la contraparte también firmó `NO_CONFORME` → `EN_VOTACION` (`flujo-disputas.js:194-196`);
  - si la contraparte no firmó cierre → `REPORTADA` + notificación `DISPUTA_REPORTADA`
    (`flujo-disputas.js:197-202`).
- **Vencimientos automáticos** (`resolverVencidasSiAplica`, `flujo-disputas.js:104-123`): sin
  justificativo en 3 días → veredicto **ANULAR** por defecto; votación vencida sin votos → **ANULA**
  por defecto; votación vencida con votos → mayoría simple (empate → ANULA).

### 13.2 Veredicto (ejecutarVeredicto)

- `ANULAR` → trueke `ANULADO` (devolución total de los NFTs en custodia)
  (`flujo-disputas.js:76-81`).
- `VALIDO` → trueke `COMPLETADO` + **liberación en cruz** (`reasignarArticulo`: el artículo A pasa
  a `usuarioB` y el B a `usuarioA`) (`flujo-disputas.js:83-94`).
- En ambos casos la disputa queda `RESUELTA` con `veredicto` + `resueltaEn` + `resolucion`, y se
  notifica `VEREDICTO` a ambas partes (`flujo-disputas.js:90-99`).

### 13.3 Endpoints (routes/disputas.js)

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /disputas` | Mis disputas (parte A/B); **antes de responder resuelve vencimientos** | `backend/api/routes/disputas.js:19-27` |
| `GET /disputas/padron` | `{ esSocio, totalSocios, padron }` — padrón on-chain del `SociosRegistry` (sin red → usuarios `tipo=SOCIO` de BD) | `disputas.js:30-36`; `flujo-disputas.js:36-50` |
| `GET /disputas/votaciones` | Solo Socios del padrón (403 `solo_socio`): disputas `EN_VOTACION`/`RESUELTA` recientes con `evidencias`, `votos`, `soyParte`, `miVoto`, `puedeVotar` | `disputas.js:39-58` |
| `POST /disputas/:id/justificativo` | La parte **CONFORME** carga fotos de justificativo (`fotos: [{data,mime}]`) → registra su cierre CONFORME si faltaba → `abrirVotacion`; 400 `fotos_requeridas`, 409 `estado_no_justificable`, 403 `no_autorizado` | `disputas.js:62-91` |
| `POST /disputas/:id/no-conforme` | La contraparte declara **también** No Conforme (`motivo` + `fotos`) → ambas con evidencia → `EN_VOTACION` | `disputas.js:95-129` |
| `POST /disputas/:id/votar` | Voto del Socio `{ voto: 'ANULAR'|'VALIDO' }`: exige padrón, `EN_VOTACION` no vencida y no ser parte (403 `socio_involucrado`), 1 voto (409 `ya_voto`, D21); si votaron **todos** los elegibles → veredicto inmediato por mayoría simple | `disputas.js:132-169` |
| `GET /disputas/:id` | Detalle con `evidencias`, `votos`, `miVoto`, `puedeVotar` (parte o Socio) | `disputas.js:172-194` |
| `GET /disputas/:id/evidencia/:evId` | Imagen de una evidencia (parte o Socio; `Content-Type` del mime) | `disputas.js:197-210` |

### 13.4 Apertura de votación y avisos

- `abrirVotacion` (`flujo-disputas.js:139-147`): fija `EN_VOTACION` + `votacionVenceAt`, pasa el
  trueke a `RESOLUCION_SOCIOS` y **notifica a todos los socios del padrón** (menos las partes,
  `notificarSociosVotacion`, `flujo-disputas.js:126-136`) con `VOTACION_ABIERTA`.
- Padrón y chequeo de socio: `padronSocios`/`esSocioWallet` leen el `SociosRegistry` on-chain
  (`totalSocios`/`socios(i)`/`esSocio`, ABI en `flujo-disputas.js:15-19`) con fallback a BD
  (`flujo-disputas.js:36-58`).

### 13.5 Tablas y persistencia

- `disputas` (estados y plazos, ver Manual 05 §5.2), `evidencias_disputa` (fotos `RECLAMO`/
  `JUSTIFICATIVO`) y `votos_disputa` (1 voto por `(disputa_id, socio)`, `CHECK voto IN
  ('ANULAR','VALIDO')`) — `backend/db/schema.sql:201-238` (+ `migracion_disputas_v2.sql`).
- Métodos del almacén: `crearDisputa`, `actualizarDisputa`, `agregarEvidenciaDisputa`,
  `registrarVotoDisputa`, `registrarCierre`, `listarEvidenciasDisputa`, `listarVotosDisputa`,
  `getEvidenciaDisputa` (`backend/api/lib/almacen-pg.js:426-436,651-826`).

---

## 14. VALOR (/valor) — ex "Finanzas" (rediseño del director 2026-09-09)

### 14.1 Modelo general

- VALOR reemplaza a "Finanzas" en la suite con **3 subsecciones** (4.1 criptos, 4.2 reputación,
  4.3 BRLT). Los movimientos de cripto ocurren **siempre entre el usuario y la PLATAFORMA** como
  contraparte (`walletPlataforma()`, `backend/api/routes/valor.js:42-46`): no hay transferencia
  P2P directa de cripto — entre socios la cripto solo se mueve a través de un Trueke
  (comentario de diseño `valor.js:4-16`).
- Roles: `rolValor(req)` devuelve `OWNER` si la wallet es el dueño on-chain (`es-owner`), si no el
  `tipo` del usuario (`valor.js:34-39`). Gestión (criptos y BRLT) solo
  **EMPRESA/SOCIO/OWNER**: `puedeBRLT`/`puedeCriptos` (`valor.js:48-49`); VALOR es visible para
  todo inscrito pero con contenido restringido en la UI.
- Tasa interna de conversión **ETH⇄BRLT** de la plataforma: `TASA_ETH_BRLT` (env) o **3000**
  (`valor.js:27`) — 1 ETH ≈ 3000 BRLT.

### 14.2 4.1 Criptos (recargar / retirar / convertir)

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /valor/criptos/recargar` | La plataforma acredita ETH al socio (contraparte plataforma); 403 `solo_empresa_socio`, 400 `monto_invalido`, 409 `saldo_insuficiente` | `valor.js:142-144` (helper `operarCripto` `:118-139`) |
| `POST /valor/criptos/retirar` | Retiro de ETH (lo envía la plataforma); mismo control | `valor.js:147-149` |
| `POST /valor/criptos/convertir` | Conversión `{ desde: 'ETH'|'BRLT', monto }` a `TASA_ETH_BRLT` (ETH→BRLT redondea a 2 decimales; BRLT→ETH a 1e-6) | `valor.js:152-177` |

### 14.3 4.2 Reputación y valoraciones pendientes

- `GET /valor/mi` (`valor.js:52-111`) devuelve, además de saldos:
  - `reputacion`: `{ puntaje, nivel, medalla, reputacionMedia, truequesCompletados }` calculado con
    la misma fórmula D12/D30 (`calcularPuntaje`/`clasificarNivel`, `valor.js:77-87`);
  - `pendientesValoracion`: trueques `COMPLETADOS` donde soy parte y **aún no valoré** (≤20),
    alimentado por `listarValoracionesDe` (`valor.js:63-75`) — la valoración inline desde VALOR
    llama a `POST /truekes/:id/valoracion` (§17);
  - `ultimasValoraciones`: últimos 10 trueques valorados;
  - `movimientos`: últimas 20 filas de `movimientos_valor`.
- Persistencia de valoraciones en tabla `valoraciones` (UNIQUE por valorador y trueque) —
  `backend/db/schema.sql:154-166`.

### 14.4 4.3 BRLT con Stripe Checkout + webhook (y restricción de rol)

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /valor/brlt/checkout` | Crea una **Stripe Checkout Session** alojada (compra BRLT con fiat; `montoBRLT` × `precioBRLT`); solo EMPRESA/SOCIO/OWNER (403 `solo_empresa_socio_owner`); registra `movimientos_brlt` `PENDIENTE`; **sin `STRIPE_SECRET_KEY`** registra el movimiento como demo y responde 503 `stripe_no_configurado` | `valor.js:184-229` |
| `POST /valor/brlt/webhook` | **Sin sesión** (Stripe firma): valida `checkout.session.completed` con `STRIPE_WEBHOOK_SECRET` (o confía en el payload en dev), busca la sesión `PENDIENTE` y **acredita BRLT** (`confirmarMovimientoBrlt` → `moverSaldo`) | `valor.js:233-264` |
| `POST /valor/brlt/retirar` | Retiro BRLT: debita saldo y registra `RETIRO_BRLT`; el desembolso fiat real queda documentado como **Stripe Payouts** (aviso en la respuesta) | `valor.js:267-288` |

- Conversión BRLT→ETH/ETH→BRLT de BRLT comprado se hace por `/valor/criptos/convertir`
  (`desde: 'BRLT'` o `'ETH'`), no hay endpoint separado.
- Tablas: `finanzas` (saldos `criptos`/`brlt`/`fondo_valor`, `schema.sql:314-323`),
  `movimientos_valor` (auditoría append-only de 4.1/4.3) y `movimientos_brlt` (pagos Stripe) —
  `backend/db/migracion_valor.sql:23-48`. Métodos del almacén: `asegurarFinanzas`, `moverSaldo`,
  `registrarMovimientoValor`, `crearMovimientoBrlt`, `buscarMovimientoBrltPorSesion`,
  `confirmarMovimientoBrlt` (`backend/api/lib/almacen-pg.js:503-596`).

---

## 15. Notificaciones (/notificaciones) — campana in-app

- Centro de avisos (decisión del director): disputas reportadas, pedidos de justificativo,
  votaciones abiertas para Socios y veredictos (`backend/api/routes/notificaciones.js:1-8`).
- Las notificaciones las crea el **motor de disputas** (`notificar` en
  `backend/api/lib/flujo-disputas.js:60-68`) y `routes/truekes.js:408-416` (pedido de
  justificativo) vía `almacen.crearNotificacion`; tipos: `DISPUTA_REPORTADA`,
  `PEDIDO_JUSTIFICATIVO`, `VOTACION_ABIERTA`, `VEREDICTO`, `SISTEMA`.

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /notificaciones` | Mis avisos (últimas 50) + `noLeidas` | `notificaciones.js:15-21` |
| `POST /notificaciones/leer-todas` | Marca todas como leídas | `notificaciones.js:23-28` |
| `POST /notificaciones/:id/leida` | Marca una como leída (dueño) | `notificaciones.js:30-35` |

- Tabla `notificaciones` (`wallet` destinatario, `tipo`, `titulo`, `cuerpo`, `ref_tipo`/`ref_id` →
  disputa o trueke, `leida`) — `backend/db/schema.sql:241-251`; índice
  `ix_notificaciones_wallet (wallet, leida, created_at DESC)` (`schema.sql:373`).
- UI: campana `CampanaNotificaciones` en la TopBar (ver Manual 07 §15).

---

## 16. Regla de encuentro (quién propone) — punto 5 del director

- `quienProponeEncuentro(t)` (`backend/api/routes/truekes.js:235-247`) decide quién propone el
  punto/fecha/hora del encuentro:
  1. **mayor nivel D12** (`ORDEN_NIVEL = { INICIADO:0, COMUN:1, FRECUENTE:2, SOCIO:3 }`,
     `truekes.js:232`);
  2. empate → **mayor reputación** (proxy: nº de trueques `COMPLETADOS` de cada parte);
  3. empate → **quien publicó (A)** (desempate).
- `GET /truekes/:id/encuentro/rol` expone `{ rol: 'propone'|'aprueba', propone, aprueba, regla,
  encuentroEstado }` solo a las partes (`truekes.js:251-269`).
- La contraparte (menor nivel/reputación) **solo aprueba o rechaza**:
  `POST /truekes/:id/propuesta-encuentro` (403 `no_autorizado` si no ganó la regla,
  `truekes.js:289-292`), `POST /truekes/:id/encuentro/aceptar` (custodia automática de ambos NFTs,
  `truekes.js:326`), `POST /truekes/:id/encuentro/rechazar` (`truekes.js:345`). Ver §5.2 y
  Manual 07 (Intercambio).

---

## 17. Valoración persistida (POST /truekes/:id/valoracion → tabla `valoraciones`)

- Desde 2026-09-09 la valoración **ya no queda solo en el espejo**: `POST /truekes/:id/valoracion`
  valida los 5 renglones 1–5 (400 `valoraciones_1_a_5`) y el estado del trueque (409
  `estado_no_valorable`), actualiza el espejo (`valoracionDe`/`valorado`/`renglones`) y, si el
  almacén lo soporta, **persiste una fila en la tabla `valoraciones`** vía
  `almacen.registrarValoracion` (`backend/api/routes/truekes.js:209-223`;
  `backend/api/lib/almacen-pg.js:599-613`).
- Esa persistencia alimenta la subsección **VALOR 4.2**: `pendientesValoracion` (completados sin
  valorar) y `ultimasValoraciones` (los últimos 10) leen `listarValoracionesDe`
  (`backend/api/lib/almacen-pg.js:615-639`; `routes/valor.js:63-75,106-107`), y la media alimenta
  la reputación D12/D30.
- Esquema: `valoraciones` con 5 `CHECK BETWEEN 1 AND 5` y `UNIQUE (trueke_id, valorador)`
  (`backend/db/schema.sql:154-166`; la migración `migracion_valor.sql:18-19` aclara que la tabla ya
  existía pero no se usaba en pg).
