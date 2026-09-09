# Manual Técnico 10 — Disputas v2: flujo completo (motor + API + UI)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **03-Implementacion / 10 — Disputas v2**,
> el flujo afinado del director (2026-09-08): cómo nace una disputa desde el cierre ✗ No Conforme,
> cómo el conforme carga su justificativo, cómo votan los Socios y qué veredicto se aplica
> (ANULAR / VALIDO). Complementa a **06-backend-api.md §13** con foco en el flujo del usuario.
> **Fuentes leídas**: `backend/api/lib/flujo-disputas.js` (206 líneas, motor), `backend/api/routes/disputas.js`
> (213 líneas, API), `backend/api/routes/truekes.js:355-439` (origen en el cierre),
> `web/app/suite/disputas/page.tsx` (837 líneas, UI), `backend/db/schema.sql:201-251` +
> `migracion_disputas_v2.sql` (tablas).
> **Convención**: referencias `ruta:línea` al código real. Lo no verificado se marca **pendiente de confirmar**.

---

## 1. Modelo de la disputa

### 1.1 Origen único: el cierre ✗ No Conforme

- La disputa **nace solo desde `POST /truekes/:id/cierre`** con `{ lado, conforme: false, motivo, fotos }`
  (`backend/api/routes/truekes.js:355-439`), que invoca `motorDisputas.abrirDisputaDesdeCierre`
  (`backend/api/lib/flujo-disputas.js:158-203`).
- No existe `POST /truekes/:id/disputa` ni `GET /disputas` público: la disputa siempre tiene un
  trueke padre y dos partes (A/B del trueke).

### 1.2 Máquina de estados

`REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA` (`flujo-disputas.js:5-6`), con
`ESTADOS_ACTIVOS = ['REPORTADA','ESPERA_JUSTIFICATIVO','EN_VOTACION']` (`flujo-disputas.js:13`).

| Estado | Significado | Se entra cuando |
|---|---|---|
| `REPORTADA` | Disputa registrada, la contraparte aún no declaró postura | El cierre ✗ No Conforme ocurre y la contraparte no firmó cierre (`flujo-disputas.js:197-202`) |
| `ESPERA_JUSTIFICATIVO` | La contraparte está CONFORME y debe cargar justificativo | La contraparte firmó `CONFORME` (`flujo-disputas.js:182-193`) |
| `EN_VOTACION` | Los Socios votan ANULAR o VALIDO | Ambas partes aportaron evidencia, o vence el justificativo, o el conforma cargó su justificativo (`flujo-disputas.js:139-147`) |
| `RESUELTA` | Veredicto aplicado (ANULAR o VALIDO) | Votación completa/vencida o justificativo vencido (`flujo-disputas.js:74-123`) |

### 1.3 Plazos del director

- Justificativo del conforme: **3 días** — `PLAZO_JUSTIFICATIVO_MS = 3 * DIA_MS` (`flujo-disputas.js:11`).
- Votación de Socios: **5 días** — `PLAZO_VOTACION_MS = 5 * DIA_MS` (`flujo-disputas.js:12`; D13/D21).

---

## 2. El motor (`lib/flujo-disputas.js`)

### 2.1 `abrirDisputaDesdeCierre({ truekeId, reclamante, motivo, fotos })`

Decisión de arranque (`flujo-disputas.js:158-203`):

1. Si ya existe una disputa **activa** del mismo trueke:
   - y quien firma No Conforme es el mismo reclamante → devuelve la existente (`flujo-disputas.js:164-165`);
   - y es la **contraparte** → agrega sus fotos `RECLAMO` y salta a **EN_VOTACION** (ambas con evidencia,
     `flujo-disputas.js:166-171`).
2. Si no existe: crea la disputa con `solicitante = reclamante` y guarda las fotos `RECLAMO`
   (`flujo-disputas.js:173-176`); pasa el trueke a `EN_DISPUTA` (`flujo-disputas.js:180`).
3. Estado inicial según el cierre de la contraparte:
   - `CONFORME` → `ESPERA_JUSTIFICATIVO` con `justificativoVenceAt` + notificación `PEDIDO_JUSTIFICATIVO`
     (`flujo-disputas.js:182-193`);
   - `NO_CONFORME` → `EN_VOTACION` directo (`flujo-disputas.js:194-196`);
   - sin cierre → `REPORTADA` + notificación `DISPUTA_REPORTADA` (`flujo-disputas.js:197-202`).

### 2.2 `abrirVotacion(d)` y notificación a Socios

- Fija `EN_VOTACION` + `votacionVenceAt`, pasa el trueke a `RESOLUCION_SOCIOS` y avisa a **todos los
  Socios del padrón** (menos las partes) con `VOTACION_ABIERTA` (`flujo-disputas.js:126-147`).
- Padrón: `padronSocios()` lee el `SociosRegistry` on-chain (`totalSocios`, `socios(i)`; ABI
  `flujo-disputas.js:15-19`) con fallback a usuarios `tipo=SOCIO` de BD (`flujo-disputas.js:36-50`);
  `esSocioWallet` usa `esSocio` on-chain o el padrón (`flujo-disputas.js:52-58`).

### 2.3 Vencimientos automáticos (`resolverVencidasSiAplica`)

Se ejecuta al leer las disputas (antes de responder `GET /disputas`, `GET /disputas/:id` y
`GET /disputas/votaciones` — `routes/disputas.js:24,49,179`):

- `ESPERA_JUSTIFICATIVO` vencido (3 días) → **ANULAR** por defecto (falla a favor del reclamante)
  (`flujo-disputas.js:107-110`).
- `EN_VOTACION` vencida (5 días):
  - sin votos → **ANULA** por defecto (`flujo-disputas.js:115-117`);
  - con votos → mayoría simple (empate → **ANULA**) (`flujo-disputas.js:118-120`).

### 2.4 `ejecutarVeredicto(d, t, veredicto, detalle)`

- `ANULAR` → trueke `ANULADO` (devolución total de los NFTs en custodia) (`flujo-disputas.js:76-81`).
- `VALIDO` → trueke `COMPLETADO` + **liberación en cruz** (`reasignarArticulo`: artículo A → `usuarioB`,
  artículo B → `usuarioA`) (`flujo-disputas.js:83-94`).
- En ambos casos: disputa `RESUELTA` con `veredicto`, `resueltaEn`, `resolucion` y notificación
  `VEREDICTO` a ambas partes (`flujo-disputas.js:90-99`).

---

## 3. La API (`routes/disputas.js`)

| Método y ruta | Función | Línea |
|---|---|---|
| `GET /disputas` | Mis disputas (parte A/B); resuelve vencidas antes de responder | `disputas.js:19-27` |
| `GET /disputas/padron` | `{ esSocio, totalSocios, padron }` para la UI del Socio | `disputas.js:30-36` |
| `GET /disputas/votaciones` | Solo Socios (403 `solo_socio`): disputas `EN_VOTACION`/`RESUELTA` con evidencias, votos, `soyParte`, `miVoto`, `puedeVotar` | `disputas.js:39-58` |
| `POST /disputas/:id/justificativo` | El **conforme** carga fotos (`fotos: [{data,mime}]`, ≥1 → 400 `fotos_requeridas`); solo estados `REPORTADA`/`ESPERA_JUSTIFICATIVO` (409 `estado_no_justificable`); el reclamante no puede (403 `no_autorizado`); registra cierre `CONFORME` si faltaba y abre votación | `disputas.js:62-91` |
| `POST /disputas/:id/no-conforme` | La contraparte declara **también** No Conforme (`motivo` obligatorio + fotos ≥1); ambas partes con evidencia → `EN_VOTACION` | `disputas.js:95-129` |
| `POST /disputas/:id/votar` | Voto del Socio `{ voto: 'ANULAR'|'VALIDO' }` (400 `voto_invalido`); exige `EN_VOTACION` no vencida, padrón (403 `solo_socio`), no ser parte (403 `socio_involucrado`, punto 4 del director) y 1 voto (409 `ya_voto`, D21); si votaron **todos** los elegibles → veredicto inmediato (mayoría simple; empate → ANULA) | `disputas.js:132-169` |
| `GET /disputas/:id` | Detalle: disputa + trueke + evidencias + votos + `miVoto`/`puedeVotar` (parte o Socio) | `disputas.js:172-194` |
| `GET /disputas/:id/evidencia/:evId` | Imagen de una evidencia (parte o Socio; `Content-Type` según mime) | `disputas.js:197-210` |

### 3.1 Reglas de voto (resumen operativo)

1. **Solo Socios** del padrón vigente votan (`disputas.js:144-145`).
2. **Un voto por Socio y disputa** (`UNIQUE (disputa_id, socio)`, D21; `disputas.js:151-154`).
3. **El Socio que es parte del trueke no vota** (`disputas.js:146-150`).
4. Veredicto: mayoría simple de votos; **empate → ANULA**; votación vencida sin votos → ANULA
   (`disputas.js:161-166`; `flujo-disputas.js:111-121`).

---

## 4. Persistencia (tablas)

| Tabla | Contenido | Ref. |
|---|---|---|
| `disputas` | trueke, solicitante, motivo, estado, plazos (`justificativo_vence_at`, `votacion_vence_at`), `veredicto`, `resuelta_en`, `resolucion`, `sancion`, `timelock_ejecuta_at`, `registro_votos` (JSONB, espejo D21) | `schema.sql:201-217` + `migracion_disputas_v2.sql` |
| `evidencias_disputa` | Fotos por disputa: `autor`, `tipo` (`RECLAMO`/`JUSTIFICATIVO`), `contenido` BYTEA, `mime`; FK `disputa_id` CASCADE | `schema.sql:220-228` |
| `votos_disputa` | `disputa_id`, `socio`, `voto` (`ANULAR`/`VALIDO`); `UNIQUE (disputa_id, socio)` | `schema.sql:231-238` |
| `notificaciones` | Avisos por wallet (`DISPUTA_REPORTADA`, `PEDIDO_JUSTIFICATIVO`, `VOTACION_ABIERTA`, `VEREDICTO`, `SISTEMA`) | `schema.sql:241-251` |

- Métodos del almacén: `crearDisputa`, `actualizarDisputa`, `agregarEvidenciaDisputa`,
  `registrarVotoDisputa`, `registrarCierre`, `listarEvidenciasDisputa`, `listarVotosDisputa`,
  `getEvidenciaDisputa`, `crearNotificacion` (`backend/api/lib/almacen-pg.js:426-436,651-835`).

---

## 5. La UI (`web/app/suite/disputas/page.tsx`)

### 5.1 Roles que reconoce la pantalla

`miRol(d, account, esSocio)` → `reclamante | contraparte | socio | observador` (`page.tsx:84-90`).

### 5.2 Secciones de la página

- **Mis disputas** (`page.tsx:312-540`): tarjetas con motivo, estado (badges), plazos y veredicto;
  botón "🔍 Ver pruebas de ambas partes" (detalle con evidencias RECLAMO vs JUSTIFICATIVO,
  `page.tsx:182-201,484-534`).
- **Acciones de la contraparte** (`page.tsx:389-461`): si está conforme → formulario "📷 Enviar
  justificativo" (fotos, `SubirFotos`); si no firmó → también puede "✗ Declarar mi No Conforme"
  (motivo + fotos).
- **Votación de Socios** (`page.tsx:542-615`): solo si la wallet está en el padrón; tarjetas con
  conteo `n ANULAR · m VALIDO`, vencimiento y botón "📂 Ver caso y votar".
- **Flotante de votación** (`page.tsx:628-807`): abre el caso con motivo + evidencias de ambas
  partes (miniaturas ampliables, `page.tsx:809-834`) y botones "🗳️ ANULAR — devolución total" /
  "🗳️ VALIDO — completar trueke"; guardas: parte no vota, 1 voto por Socio, RESUELTA muestra el
  veredicto (`page.tsx:758-802`).
- Componentes: `ImagenProtegida` (descarga con `Authorization: Bearer`,
  `web/components/ImagenProtegida.tsx`), `SubirFotos` (`web/components/SubirFotos.tsx`, máx. `max`
  fotos a base64), `CampanaNotificaciones` (avisos en la TopBar — Manual 07 §15).

### 5.3 Clientes de API (`web/lib/api.ts`)

`misDisputas`, `padronDisputas`, `votacionesDisputas`, `detalleDisputa`, `cargarJustificativo`,
`declararNoConforme`, `votarDisputa`, `urlEvidenciaDisputa` (`api.ts:541-576`).

---

## 6. Pendientes de confirmar

1. La API escribe estados `EN_DISPUTA`/`RESOLUCION_SOCIOS`/`COMPLETADO`/`ANULADO` en el espejo
   `truekes` (flujo off-chain); la **sincronización on-chain** de esos estados con el contrato
   `Escrow` queda pendiente (ver Manual 06 §12).
2. El padrón on-chain usa el `SociosRegistry` cuando hay red; sin red, el fallback es
   `usuarios.tipo = 'SOCIO'` de BD (coherente con el registro `SocioAdmitido` del indexador).
3. `disputas.registro_votos` (JSONB, espejo D21 de votos on-chain) no se usa en el flujo v2 off-chain:
   los votos viven en `votos_disputa` (ver Manual 05 §5.4).
