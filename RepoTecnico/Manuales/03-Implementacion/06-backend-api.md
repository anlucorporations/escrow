# Manual Técnico 06 — Backend: API REST (Express)

> **Alcance**: implementación real de la API REST/JSON de TrueKeate (Ciclo 6 y Ciclo 8): `app.js`, routers `/auth`, `/kyc`, `/catalog`, `/truekes`, `/admin`, `/reputacion`, `/subastas`, capa de almacén en memoria y reglas de negocio (D14, RF-14.4, D12/D30, D27, D17, D18, D28, RF-17.x).
> **Fuentes leídas**: `backend/api/app.js`, `backend/api/index-api.js`, `backend/api/routes/*.js` (7 routers), `backend/api/lib/*.js` (almacen, auth, reputacion), `backend/test/api.test.js`, `backend/test/ciclo8.test.js`, `RepoTecnico/arquitectura_tecnica.md` §7 (diseño de referencia).
> **Convención**: referencias `ruta:línea` al código real. Endpoints que el diseño §7 lista pero que el código no implementa se marcan explícitamente como **no implementados en este ciclo** para no prometer funciones inexistentes.
>
> ⚠️ **Revisión 2026-09**: este manual describe la base C6/C8 con el **almacén en memoria**. Desde la
> integración con PostgreSQL y la certificación SBT, el router `/kyc` fue **reescrito** (verificación
> con código real de correo, SBT/imágenes y guard Owner on-chain) → su documentación actualizada está
> en **`03-Implementacion/09-certificacion-sbt.md`**; el Panel del Owner (rutas `/admin/*` + `/kyc/*`
> Owner) en **`08-Suite-Sistemas/01-panel-sistemas.md`**. El montaje de producción inyecta
> PostgreSQL/relayer/indexador (ver §1).

---

## 1. Montaje de la aplicación

### 1.1 `crearApp(deps)` — composición y middleware

- Fábrica que recibe `deps = { almacen, relayer?, escrowAbi?, contratos? }` y construye la app Express (`backend/api/app.js:31-32`).
- `express.json({ limit: '1mb' })` para el cuerpo JSON (`backend/api/app.js:33`).
- **Rate-limiting global (D16/RF-09.6)**: 120 peticiones por minuto por ventana de 60 s, con `standardHeaders` y mensaje `{ error: 'rate_limit', detalle: 'demasiadas peticiones' }` (`backend/api/app.js:36-44`).
- `GET /healthz` → `{ ok: true, servicio: 'truekeate-api' }` (`backend/api/app.js:46`).
- Montaje de routers en sus prefijos (`backend/api/app.js:76-86`): `/auth`, `/kyc`, `/catalog`,
  `/truekes`, `/admin`, `/reputacion`, `/subastas`, `/finanzas`, `/disputas`, `/gobernanza`,
  `/puntos-encuentro` (11 routers en el código actual).
- Manejo de 404 (`{ error: 'not_found' }`) y error handler central que devuelve `status`/`code`/`detalle` en JSON (`backend/api/app.js:57-62`).

### 1.2 `iniciarServidor` y punto de entrada

- `iniciarServidor(deps, puerto = PORT || 4000)` escucha en `http://127.0.0.1:<puerto>` y devuelve `{ app, server }` (`backend/api/app.js:68-74`).
- El entry `backend/api/index-api.js` crea **solo el almacén en memoria** y arranca sin relayer/indexador/contratos (`backend/api/index-api.js:6-10`). Consecuencia real: `GET /admin/infra/health` devuelve `{}` (no hay `relayer` ni `indexador` inyectados) y las rutas de trueques operan en modo "simulado" (`backend/api/routes/truekes.js:38-39`).

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

## 5. Truekes (orquestación del escrow)

### 5.1 Rutas /truekes (routes/truekes.js)

| Método y ruta | Función | Línea |
|---|---|---|
| `POST /truekes` | Crea un trueque; requiere estado **VERIFICADO/CERTIFICADO** (D14); valida `parteB`, `activoA`, `activoB`; **máx. 3 activos para Verificado (RF-14.4)** contando truekes propios en CREADO/ACTIVO/CUSTODIADO/APERTURA → 403 `max_3_activos`; devuelve 201 con el trueke | `backend/api/routes/truekes.js:43-60` |
| `GET /truekes/:id` | Detalle del trueque (CU-05.1, info de confianza); 404 si no existe | `backend/api/routes/truekes.js:63-67` |
| `POST /truekes/:id/custodiar` | Custodia (CU-12): autoriza por lado (A solo `usuarioA`, B solo `parteB`) y marca el estado espejo **CUSTODIADO** | `backend/api/routes/truekes.js:70-80` |
| `POST /truekes/:id/firma-recepcion` | Firma de recepción (CU-14): autoriza por lado y marca `firmaA`/`firmaB` en el espejo | `backend/api/routes/truekes.js:83-91` |
| `POST /truekes/:id/valoracion` | Valoración (D18): exige 5 renglones enteros entre 1 y 5 (`aceptacion`, `honestidad`, `seguridad`, `confiabilidad`, `compromiso`) → 400 `valoraciones_1_a_5`; guarda `valoracionDe`, `valorado` y `renglones` en el espejo | `backend/api/routes/truekes.js:94-105` |

### 5.2 Helper `_enviar` (relayer / empresas)

- `_enviar(req, res, operacion, args, data)` decide el envío según el tipo de usuario (`backend/api/routes/truekes.js:17-40`):
  - **Empresa** (con `walletEmpresas`): envía transacción directa al Escrow con su propio gas (R1/RF-09.3) creando `new ethers.Contract(contratoEscrow, escrowAbi, signer)` y llamando `contrato[operacion](...args)` (`backend/api/routes/truekes.js:21-28`).
  - **Particular con relayer**: delega en `relayer.procesarIntent(...)`; rechazo → `422 meta_tx_rechazada` (`backend/api/routes/truekes.js:30-36`).
  - **Sin red configurada (tests)**: responde `{ ok: true, simulado: true }` (`backend/api/routes/truekes.js:38-39`).
- **Estado real**: `_enviar` está definido pero **ninguna ruta lo invoca** en este ciclo; `POST /truekes` solo crea el espejo en memoria (`backend/api/routes/truekes.js:43-60`). Los intents EIP-712 no se envían aún desde la API → pendiente de confirmar el cableado (C8).
- **Simplificaciones del espejo en memoria**: `custodiar` no distingue qué lado custodió ni comprueba la custodia previa del otro lado; `firma-recepcion` y `valoracion` tampoco validan el estado on-chain del escrow (el contrato lo hará al integrar).
- **No implementados** (diseño §7): `POST /truekes/:id/apertura`, `POST /truekes/:id/anulacion`, `POST /truekes/:id/disputa`, `POST /truekes/:id/punto` y `GET /disputas*`.

---

## 6. Admin / dashboard del Owner (RF-13.1)

### 6.1 Rutas /admin (routes/admin.js)

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /admin/usuarios` | Usuarios inscritos; **solo tipo SOCIO o rol OWNER** (403 `solo_owner`); devuelve `total` y lista | `backend/api/routes/admin.js:13-19` |
| `GET /admin/contratos` | Direcciones de contratos desplegados (`contratos ?? {}`); solo requiere sesión, sin control de rol | `backend/api/routes/admin.js:22-24` |
| `GET /admin/kpis-disputas` | KPIs: `totalTruekes` y `disputasAbiertas` (estados EN_DISPUTA o RESOLUCION_SOCIOS) | `backend/api/routes/admin.js:27-31` |
| `GET /admin/db` | Estado de la BD off-chain: conteos de usuarios, artículos y truekes | `backend/api/routes/admin.js:34-40` |
| `GET /admin/infra/health` | Salud del relayer (`health()` + `metricas()`) e indexador (`metricasLag()`) cuando están inyectados en `deps` (D15/H-17); sin deps devuelve `{}` | `backend/api/routes/admin.js:43-49` |

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
| Escalera D28: INSCRITO → VERIFICADO → CERTIFICADO | Estados en `almacen.js:27`, transiciones en kyc.js | `backend/api/routes/kyc.js:97,117` (ver Manual 09) |
| Límites por nivel de artículos: 5/50/100/100 (D14) | `LIMITE_ARTICULOS_POR_NIVEL` | `backend/api/routes/catalog.js:10` |
| Máx. 3 trueques activos para Verificado (RF-14.4) | Conteo de activos | `backend/api/routes/truekes.js:50-56` |
| Valoraciones 1–5 en 5 dimensiones (D18) | Validación de enteros | `backend/api/routes/truekes.js:97-101` |
| Fórmula reputación D12/D30 (0,5/0,3/0,2) | `calcularPuntaje` | `backend/api/lib/reputacion.js:23-35` |
| Subastas: empresa crea (RF-17.1), certificado puja (RF-17.2), desempate por nivel (D27) | Router /subastas | `backend/api/routes/subastas.js:18,49,84-85` |
| Consentimiento GDPR (D17) | `consentimientoGdpr` obligatorio | `backend/api/routes/auth.js:29-31` |
| Rate-limiting global (D16/RF-09.6) | 120 req/min | `backend/api/app.js:36-44` |

### 9.2 Modelo de errores

- Errores en JSON con `error` (código estable), a veces `detalle`: p. ej. `wallet_invalida`, `consentimiento_requerido`, `firma_invalida`, `estado_requerido`, `limite_articulos`, `max_3_activos`, `meta_tx_rechazada`, `valoraciones_1_a_5`, `solo_owner`, `solo_empresa`, `solo_certificado`, `rate_limit`, `not_found`, `internal` (`backend/api/app.js:57-62` y routers).

---

## 10. Endpoints del diseño §7 aún no implementados (estado 2026-09)

Tras la integración C8 y la certificación 2026-09 **ya existen** en el código: `/finanzas/*`,
`/disputas/*`, `/gobernanza/*`, `/puntos-encuentro/*` (montados en `backend/api/app.js:76-86`) y el
router `/kyc` reescrito (Manual 09). Siguen **pendientes de confirmar** (sin router en el código):
`POST /auth/verify-email`, `POST /auth/verify-phone`, `POST /kyc/appeal`, `GET /kyc/queue`,
campañas (`/campanas/*`) y las variantes on-chain directas de apertura/anulación
(`POST /truekes/:id/apertura`, `POST /truekes/:id/anulacion`).

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
  `backend/contratos.json` (`index-gcp.js:19-54`).
- **Sesiones**: en memoria en dev; en producción persisten en la tabla `sesiones` (24 h —
  `backend/db/schema.sql:303-309`).
- **KYC (2026-09)**: resuelto en el router reescrito — código real con TTL 10 min (SMTP opcional,
  `codigoDemo` en demo), guard Owner on-chain en `/kyc/review` y `/kyc/pendientes` (Manual 09).
- **Truekes**: no se envían intents al relayer (helper `_enviar` sin invocar); estados espejo simplificados.
- **Reputación**: `volumenMaximo` fijo en 1; lote mensual de recálculo solo simulado.
- **Subastas**: estado en `Map` local (volátil), cierre manual, sin endpoints de detalle/pujas.
- **Autenticación**: token opaco en lugar del "JWT corto" citado en comentarios (`backend/api/app.js:13-14`).
