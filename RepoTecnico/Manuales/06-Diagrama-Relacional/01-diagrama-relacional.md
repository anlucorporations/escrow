# Manual Técnico 06 — Diagrama Relacional (modelo PostgreSQL off-chain)

> **Alcance**: descripción textual de las **21 tablas** del esquema real, sus relaciones (1:N, 1:1, N:M resueltas), qué tabla es espejo de qué contrato/evento on-chain y el rol de PostGIS (radio ≤10 km, RNF-08.3/08.4) en la búsqueda de trueques. **Revisión 2026-09**: esquema ampliado (`username`, certificación SBT/imágenes en `kyc`, `KYC_DNI`/`KYC_SELFIE` y `contenido`/`mime` en `imagenes_certificadas`, tablas `puntos_favoritos` y `sesiones`).
> **Fuentes leídas**: `backend/db/schema.sql` (377 líneas), `backend/db/migracion_disputas_v2.sql`, `backend/db/migracion_valor.sql`, `backend/indexador.js`, eventos declarados en `sc/src/*.sol`, `RepoTecnico/arquitectura_tecnica.md` (§4 modelo, §5 indexador).
> **Convención**: toda referencia `ruta:línea` apunta al código real. Las FKs **sin constraint SQL** se marcan como "FK lógica" y su enforcement se delega al backend o queda **pendiente de confirmar**.

---

## 1. Mapa general del modelo

### 1.1 Diagrama textual de tablas y relaciones

```
                         usuarios (70-88)
                        ┌───────────────┐
   FK usuario_id        │ id PK         │        FK usuario_id
     1:N (kyc)          │ wallet UNIQUE │        1:N (articulos,
                        │ geog (PostGIS)│        puntos_encuentro,
                        │ estado (D28)  │        campanas)
                        └──────┬────────┘
                               │ FK usuario_id
               ┌───────────────┼───────────────────────┐
               │               │ 1:N                   │ 1:1 (finanzas)
               ▼               ▼                       ▼
             kyc (92)     articulos (111)         finanzas (314)
               │               │  ▲                    │
               │ FK usuario_id │  │ imagen_certificacion_id   ▲ espejo BRLT
               │               │  │ (FK lógica 1—1, D23)      │ + API VALOR (moverSaldo)
               │               ▼  │ imagenes_certificadas(254)│
               │             ┌───────────────┐                │
               │ FK         │ truekes (130)  │◄── espejo Escrow│
               │ 1:N        │ escrow_id UNIQ │   (indexador)   │
               ▼             │ art_a FK art.  │                │
           disputas (201)    │ art_b FK art.  │  usuario_a/b    │
               │             │ estado 9 enums │                │
               │ 1:N         └───────┬────────┘                │
               ├──► evidencias_disputa (220)   │ 1:N           │
               │       (ON DELETE CASCADE)     ▼               │
               └──► votos_disputa (231)   valoraciones (154)   │
                     (ON DELETE CASCADE)  (persistida 2026-09) │
                                            suscripciones(270) ── espejo
                                            campanas(283)      SuscripcionEmpresa
                                            subastas(296)      .Suscrita
        notificaciones (241)  ── por wallet (ref_tipo/ref_id → disputa|trueke)
        movimientos_valor (migracion_valor.sql:23) ── por wallet (VALOR)
        movimientos_brlt  (migracion_valor.sql:37) ── por wallet (Stripe)
                                            (eventos procesados)
                                     auditoria (326) ── indexador_checkpoint (341)
```

Leyenda: `(n)` = línea de apertura de la tabla en `backend/db/schema.sql`; líneas continuas = FK con `REFERENCES` real; líneas punteadas = FK lógica sin constraint. Las tablas de VALOR (`movimientos_*`) viven en `backend/db/migracion_valor.sql`.

> **Revisión 2026-09-08/09**: el esquema creció (327 → **377 líneas**; `username`, certificación
> SBT/imágenes en `kyc`, `KYC_DNI`/`KYC_SELFIE`, tablas `puntos_favoritos` y `sesiones` en la
> revisión previa) y sumó **21 tablas** con el flujo afinado del director: `evidencias_disputa` y
> `votos_disputa` (hijas de `disputas`, ON DELETE CASCADE), `notificaciones` (por wallet) y
> `movimientos_valor`/`movimientos_brlt` (VALOR, migración aparte); `truekes` gana
> `encuentro_*`/`cierre_*` y `disputas` gana plazos/veredicto (ver §11). Las líneas del diagrama
> están actualizadas; el re-marcado fino de secciones no revisadas queda pendiente de confirmar.

### 1.2 Tipos de clave presentes en el esquema

| Tipo de FK | Definición | Ejemplos |
|---|---|---|
| **FK real** (`REFERENCES`) | Constraint declarado en SQL | `kyc.usuario_id → usuarios.id` (94), `truekes.articulo_a_id → articulos.id` (133) |
| **FK lógica** (sin constraint) | Columna referencial sin `REFERENCES`; enforcement por aplicación | `articulos.imagen_certificacion_id` (118), `truekes.punto_encuentro_id` (143), `imagenes_certificadas.ref_id` (257) |
| **Dirección on-chain denormalizada** | `CHAR(42)` de wallet, sin FK a `usuarios` | `truekes.usuario_a/b` (135-136), `valoraciones.valorador/valorado` (157-158), `disputas.solicitante` (204), `auditoria.actor` (330) |

**Por qué las direcciones no son FK**: `usuarios.wallet` cambia cuando el Smart Account recupera/rota su owner (`OwnerActualizado`/`RecuperacionEjecutada`, `backend/indexador.js:115-121`); las tablas espejo conservan la dirección **que participó en el momento del evento** como valor histórico inmutable.

### 1.3 Cardinalidades presentes

- **1:N**: la relación dominante (usuario → sus tablas; trueque → valoraciones/disputas). Ver §2.
- **1:1**: `usuarios`–`finanzas` (PK compartida, `schema.sql:315`); `usuarios`–`kyc` (lógica: 1 fila KYC por usuario, sin `UNIQUE` en `usuario_id` → el esquema permite N); `articulos`–`imagenes_certificadas` (FK lógica `imagen_certificacion_id`, `schema.sql:118`).
- **N:M**: no hay tablas puente explícitas; el trueque es la **relación N:M usuario↔artículo resuelta con 2+2 columnas** en `truekes` (ver §4).
- **Polimorfismo**: `imagenes_certificadas(tipo, ref_id)` apunta a `articulos` (PUBLICACION),
  `truekes` (RECEPCION) o **`kyc`** (`KYC_DNI`/`KYC_SELFIE`, 2026-09) según `tipo`
  (`schema.sql:256-257`; índice `idx_imagenes_ref (tipo, ref_id)` en 370).
- **KYC 2026-09**: `kyc` gana FKs lógicas a `imagenes_certificadas` (`documento_img_id`, `selfie_img_id`,
  `schema.sql:104-105`) y referencias on-chain propias (`sbt_contrato`/`sbt_token_id`/`via_sbt`,
  `schema.sql:101-103`) — ver Manual 03 · 09-certificacion-sbt.

---

## 2. Relaciones 1:N reales (con `REFERENCES`)

### 2.1 Del lado de `usuarios` (tabla padre)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `usuarios` | `kyc` | `usuario_id` | 94 | Metadata KYC cifrada (D17) |
| `usuarios` | `articulos` | `usuario_id` | 113 | Publicaciones del usuario |
| `usuarios` | `puntos_encuentro` | `usuario_id` | 171 | Puntos registrados por el usuario |
| `usuarios` | `suscripciones` | `empresa_id` | 272 | Ciclos de suscripción de la empresa (D33) |
| `usuarios` | `campanas` | `usuario_id` | 286 | Campañas creadas (CU-09/10) |
| `usuarios` | `subastas` | `empresa_id` | 298 | Subastas de la empresa (RF-17) |
| `usuarios` | `subastas` | `ganador_id` | 306 | Ganador adjudicado (D27) |
| `usuarios` | `finanzas` | `usuario_id` (PK + FK) | 315 | Relación **1:1** por PK compartida |

### 2.2 Del lado de `articulos` (catálogo)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `articulos` | `truekes` | `articulo_a_id` | 133 | Oferta de la parte A |
| `articulos` | `truekes` | `articulo_b_id` | 134 | Oferta de la parte B (NULL en `PROPUESTO`) |
| `articulos` | `subastas` | `articulo_id` | 299 | Artículo subastado |

### 2.3 Del lado de `truekes` (núcleo del intercambio)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `truekes` | `valoraciones` | `trueke_id` | 156 | Valoraciones del trueque (D18/D36); `UNIQUE(trueke_id, valorador)` en 165; **persistida por la API desde 2026-09-09** |
| `truekes` | `disputas` | `trueke_id` | 203 | Disputas del trueque (flujo v2 2026-09-08; una disputa activa por trueke en la práctica) |

### 2.4 Del lado de `disputas` (nuevo 2026-09-08)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `disputas` | `evidencias_disputa` | `disputa_id` | 222 | Fotos de cada parte (`ON DELETE CASCADE`); `CHECK tipo IN (RECLAMO, JUSTIFICATIVO)` en 224 |
| `disputas` | `votos_disputa` | `disputa_id` | 233 | Votos de los Socios (`ON DELETE CASCADE`); `UNIQUE(disputa_id, socio)` en 237 |

---

## 3. FKs lógicas sin constraint SQL

| Columna | Tabla | Destino lógico | Línea | Riesgo / estado |
|---|---|---|---|---|
| `imagen_certificacion_id` | `articulos` | `imagenes_certificadas(id)` (1—1) | 118 | Comentario del esquema: "FK 1—1 imagenes_certificadas (D23)" — **sin `REFERENCES`** |
| `punto_encuentro_id` | `truekes` | `puntos_encuentro(id)` | 143 | **Sin `REFERENCES`**; punto acordado del encuentro (CU-16) |
| `ref_id` | `imagenes_certificadas` | `articulos.id`, `truekes.id` o **`kyc.id`** según `tipo` (KYC_DNI/KYC_SELFIE) | 257 | Polimórfica; índice `(tipo, ref_id)` en 370 |
| `documento_img_id` / `selfie_img_id` | `kyc` | `imagenes_certificadas(id)` (1—1 lógica, 2026-09) | 104-105 | **Sin `REFERENCES`**; imágenes DNI/selfie del KYC (Manual 03 · 09) |
| `usuario_a`, `usuario_b` | `truekes` | `usuarios.wallet` (dirección) | 135-136 | Denormalizada a propósito (§1.2); índices en 362-363 |
| `valorador`, `valorado` | `valoraciones` | `usuarios.wallet` | 157-158 | Denormalizada |
| `solicitante` | `disputas` | `usuarios.wallet` | 204 | Denormalizada (reclamante) |
| `autor` | `evidencias_disputa` | `usuarios.wallet` | 223 | **Nuevo (2026-09-08)** — denormalizada |
| `socio` | `votos_disputa` | `usuarios.wallet` | 234 | **Nuevo (2026-09-08)** — denormalizada |
| `wallet` | `notificaciones` | `usuarios.wallet` | 243 | **Nuevo (2026-09-08)** — denormalizada (destinatario) |
| `ref_tipo` + `ref_id` | `notificaciones` | `disputas.id` o `truekes.id` según `ref_tipo` | 247-248 | **Nuevo (2026-09-08)** — referencia polimórfica (sin FK) |
| `wallet` | `imagenes_certificadas` | `usuarios.wallet` | 260 | Autor de la certificación (D23) |
| `actor` | `auditoria` | `log.address` del evento | 330 | Dirección emisora; histórico |
| `escrow_id` | `truekes` | id del escrow on-chain (`Escrow`) | 132 | **Clave de integración con la cadena** (`NUMERIC UNIQUE NOT NULL`) |
| `wallet` / `contraparte` | `movimientos_valor` | `usuarios.wallet` / cuenta de la plataforma | `migracion_valor.sql:25,29` | **Nuevo (2026-09-09)** — denormalizadas (VALOR, sin FK) |
| `wallet` | `movimientos_brlt` | `usuarios.wallet` | `migracion_valor.sql:39` | **Nuevo (2026-09-09)** — denormalizada (Stripe, sin FK) |

---

## 4. El trueque: relación N:M resuelta y espejo del contrato

### 4.1 Resolución de la relación N:M usuario ↔ artículo

El intercambio AtoA es una relación **N:M entre usuarios y artículos** que el esquema resuelve con una sola fila en `truekes` que porta **cuatro referencias** (`backend/db/schema.sql:130-151`):

- `articulo_a_id` + `usuario_a` → qué ofrece la parte A y quién es.
- `articulo_b_id` + `usuario_b` → qué ofrece la parte B y quién es.
- `articulo_*_id` son FK reales a `articulos(id)` (`schema.sql:133-134`); `usuario_*` son direcciones on-chain (`CHAR(42)`, sin FK — §1.2).
- Cada trueque puede participar más de una vez como `articulo_a` o `articulo_b` en filas distintas (un artículo con `disponible=FALSE` queda excluido de nuevas ofertas — `schema.sql:120`).

### 4.2 `truekes` como espejo del contrato `Escrow`

- `truekes.escrow_id` = `id` on-chain del escrow (columna `NUMERIC UNIQUE` en `schema.sql:132`; sintético **negativo** para ofertas `PROPUESTO`).
- El indexador inserta la fila con el evento `Escrow.TruekeCreado` (`backend/indexador.js:70-78`) y la actualiza con el mapa de eventos `backend/indexador.js:79-85`:
  `CustodiaA/B → CUSTODIADO`, `AperturaA/B → APERTURA`, `TruekeCompletado → COMPLETADO`, `TruekeCancelado → ANULADO`, `EscrowBloqueado → BLOQUEADO`.
- Timestamps de ventana: `AperturaA/B` también rellenan `apertura_a`/`apertura_b` (`backend/indexador.js:93-101`), base de las métricas de ventana (I3).
- Desde 2026-09-09 la **API** escribe también en el espejo: estados `EN_DISPUTA`/`RESOLUCION_SOCIOS`/`COMPLETADO`/`ANULADO` (cierre y disputas), `encuentro_estado`/`encuentro_propuesto_por` y `cierre_a`/`cierre_b` (`routes/truekes.js`, `lib/flujo-disputas.js` — Manual 06 §5/§13).
- Los 9 estados del enum canónico se definen en `backend/db/schema.sql:34-36` y en `enum Estado` de `sc/src/Escrow.sol:39-49` (ver Manual 05 §2.1).

---

## 5. Tablas espejo ↔ contrato ↔ evento

| Tabla SQL | Contrato | Evento(s) | Efecto SQL | Líneas |
|---|---|---|---|---|
| `truekes` | `Escrow` | `TruekeCreado` | INSERT (estado `CREADO`, tx, bloque) | `backend/indexador.js:70-78` |
| `truekes` | `Escrow` | `CustodiaA`/`CustodiaB`, `AperturaA`/`AperturaB`, `TruekeCompletado`, `TruekeCancelado`, `EscrowBloqueado` | UPDATE de `estado` (+ `apertura_a/b`) | `backend/indexador.js:79-101` |
| `kyc.merkle_root` | `SmartAccount` | `MerkleRootActualizado` | UPDATE `kyc` por `usuarios.smart_account` | `backend/indexador.js:106-114`; evento `sc/src/SmartAccount.sol:61` |
| `usuarios.wallet` | `SmartAccount` | `OwnerActualizado`, `RecuperacionEjecutada` | UPDATE de `wallet` (D34: recuperación social) | `backend/indexador.js:115-121`; eventos `sc/src/SmartAccount.sol:59,65` |
| `usuarios.tipo` | `SociosRegistry` | `SocioAdmitido` | `tipo='SOCIO'` | `backend/indexador.js:126-135`; evento `sc/src/SociosRegistry.sol:45` |
| `finanzas.brlt` | `BRLT` | `EmisionRegistrada` | Suma al saldo del primer SOCIO (D32) | `backend/indexador.js:137-148`; evento `sc/src/BRLT.sol:39` |
| `suscripciones` | `SuscripcionEmpresa` | `Suscrita` | INSERT con ciclo de 30 días (`+2.592.000 s`) | `backend/indexador.js:150-161`; evento `sc/src/SuscripcionEmpresa.sol:54` |
| `auditoria` | Todos los anteriores | Cualquier evento parseado | INSERT append-only (idempotente) | `backend/indexador.js:38-48, 163-188` |
| `indexador_checkpoint` | Todos los anteriores | — (barrido) | UPSERT del último bloque | `backend/indexador.js:190-220` |

**Contratos con eventos pero SIN mapeo en este ciclo** (pendiente de confirmar en C8): `FondoDeValor` (`ContribucionRegistrada`, `PorcentajeActualizado`, `RetiroParaOperacion`, `sc/src/FondoDeValor.sol:35-38`) — afecta a `finanzas.fondo_valor`; y los eventos de disputa/resolución del escrow (`AnulacionSolicitada`, `VotoSocio`, `ResolucionEjecutada`, `ResolucionPorDefecto`, `SancionProgramada`, `sc/src/Escrow.sol:105-109`) — afectarían a `disputas`/`truekes`. El mapa del indexador solo cubre 5 entidades (`backend/indexador.js:51-66`).

**TrueKeateSBT (2026-09) sin espejo en el indexador**: el evento `SbtMinteado`
(`sc/src/TrueKeateSBT.sol:32`) **no está mapeado** en `backend/indexador.js`; los campos
`kyc.via_sbt`/`sbt_contrato`/`sbt_token_id` los escribe **la API directamente** al certificar
(`routes/kyc.js` + `lib/almacen-pg.js:154-185`) — la cadena no necesita espejo para este flujo.

---

## 6. Tablas off-chain escritas por el backend

| Tabla | Contenido | Dependencias | Notas de escritura |
|---|---|---|---|
| `articulos` | Catálogo AtoA (CU-06) | FK `usuarios`; FK lógica a `imagenes_certificadas` | CRUD del backend; `alta_disponibilidad` es computado (D19, `schema.sql:122`) |
| `valoraciones` | Valoración 1-5 (D18/D36) | FK `truekes` | **2026-09-09**: la persiste `POST /truekes/:id/valoracion` (`registrarValoracion`, `almacen-pg.js:599-613`) y la lee VALOR 4.2 (`listarValoracionesDe`, `:615-639`); las marcas on-chain (`ValoracionMarcadaA/B`, `sc/src/Escrow.sol:100-101`) no se sincronizan (pendiente) |
| `puntos_encuentro` | Zonas (CU-16) | FK `usuarios` | Escritura por el usuario/backend; geografía PostGIS |
| `disputas` | Disputas v2 (flujo del director, 2026-09-08) | FK `truekes` | Motor `lib/flujo-disputas.js` + `routes/disputas.js` y cierre en `routes/truekes.js`; columnas de plazos/veredicto nuevas (`schema.sql:207-210`) |
| `evidencias_disputa` | Fotos de evidencia por parte | FK `disputas` (CASCADE) | **Nueva (2026-09-08)**: `agregarEvidenciaDisputa` (`almacen-pg.js:763-771`) desde cierre ✗ No Conforme, justificativo y no-conforme |
| `votos_disputa` | Votos ANULAR/VALIDO de Socios | FK `disputas` (CASCADE) | **Nueva (2026-09-08)**: `registrarVotoDisputa` (`almacen-pg.js:807-816`) desde `POST /disputas/:id/votar` |
| `notificaciones` | Campana in-app por wallet | ref polimórfica `(ref_tipo, ref_id)` → disputa/trueke | **Nueva (2026-09-08)**: `crearNotificacion` (`almacen-pg.js:827-835`); la crea el motor de disputas y el cierre |
| `kyc` | Metadata KYC + certificación (D28) | FK `usuarios` | **2026-09**: `initKyc`/`getKyc`/`actualizarKyc` (`backend/api/lib/almacen-pg.js:117-185`); `via_sbt`/`sbt_*`/`documento_img_id`/`selfie_img_id` los escriben `/kyc/auto-certificar` y `/kyc/review`; `merkle_root` es espejo del Smart Account (§5); `imagenes_certificadas` recibe las imágenes `KYC_DNI`/`KYC_SELFIE` |
| `imagenes_certificadas` | Evidencia de imágenes (D23) | FK lógica polimórfica `(tipo, ref_id)` | Hash SHA-256 + `contenido`/`mime` (2026-09); `firma_ecdsa` opcional para KYC (`schema.sql:261`); escritura real por `guardarImagen`/`guardarImagenArticulo` (`almacen-pg.js:188-197,299-304`); el anclaje on-chain de la raíz (D23) no está en los contratos de este ciclo (Manual 05 §4.3) |
| `campanas` | VENTA/RECOLECTA (CU-09/10) | FK `usuarios` | Backend; `estado` en texto libre |
| `subastas` | Subastas (RF-17, CU-25/26) | FK `usuarios` ×2, `articulos` | Backend; `pujas` JSONB; desempate por `nivel_ganador` (D27) |
| `finanzas` | Saldos del socio | PK/FK `usuarios` | Espejo parcial (BRLT) — §5; **desde 2026-09-09 también la API de VALOR** (`moverSaldo`, `almacen-pg.js:516-533`) |
| `movimientos_valor` | Auditoría de movimientos (VALOR) | `wallet`/`contraparte` denormalizadas | **Nueva (2026-09-09)**: `registrarMovimientoValor`/`listarMovimientosValor` (`almacen-pg.js:535-561`) |
| `movimientos_brlt` | Pagos BRLT por fiat (Stripe) | `wallet` denormalizada | **Nueva (2026-09-09)**: `crearMovimientoBrlt`/`buscarMovimientoBrltPorSesion`/`confirmarMovimientoBrlt` (`almacen-pg.js:564-596`); el webhook acredita |

---

## 7. PostGIS y la búsqueda de trueques por cercanía (≤10 km, RNF)

### 7.1 Columnas geográficas e índice

- `usuarios.geog` `GEOGRAPHY(Point,4326)` — dirección de inscripción del usuario (`backend/db/schema.sql:77`).
- `puntos_encuentro.geog` `GEOGRAPHY(Point,4326) NOT NULL` + `radio_km NUMERIC DEFAULT 10` (`backend/db/schema.sql:173-174`).
- Índice espacial: `CREATE INDEX idx_puntos_geog ON puntos_encuentro USING GIST(geog)` (`backend/db/schema.sql:368`) — requisito para que `ST_DWithin` sea eficiente.

### 7.2 Regla de negocio: distancia ≤ 10 km

- Consulta de referencia del propio esquema (`backend/db/schema.sql:375-377`):

  ```sql
  SELECT * FROM puntos_encuentro pe, usuarios u
   WHERE ST_DWithin(pe.geog, u.geog, 10000);
  ```

- La regla RF-08.3/08.4 exige que las partes de un trueque estén a ≤10 km; se implementa entre `puntos_encuentro.geog` y `usuarios.geog` (dirección de inscripción) y es **exclusivamente off-chain** (PostGIS) — `RepoTecnico/arquitectura_tecnica.md:285-288`.
- Rol en la **búsqueda de trueques**: (a) sugerir puntos de encuentro cercanos al usuario (CU-16); (b) filtrar ofertas/trueques viables por cercanía geográfica; (c) los establecimientos de retiro aprobados por Socios (CU-22, `aprobado_socios` en `schema.sql:175`) se buscan por el mismo radio.
- Exposición prevista en la API: `GET /puntos-encuentro/cercanos?lat&lng&radio` (diseño, `RepoTecnico/arquitectura_tecnica.md:391`); implementación del endpoint **pendiente de confirmar**.

### 7.3 Nota de diseño (geometría vs. geografía)

Las columnas usan el tipo `GEOGRAPHY`, por lo que las distancias de `ST_DWithin` se expresan en **metros** (`10000` = 10 km) y se calculan sobre el elipsoide, sin necesidad de reproyección — coherente con `radio_km` en la tabla (`schema.sql:174`).

---

## 8. Integridad, idempotencia y auditoría

### 8.1 Cadena de garantías del indexador (RNF-07.4 / H-16)

1. **Append-only**: `auditoria` acumula cada evento procesado (`backend/db/schema.sql:326-338`; RF-18.6).
2. **Idempotencia por evento**: `UNIQUE (tx_hash, log_index, entidad)` (`schema.sql:337`) + pre-chequeo y `ON CONFLICT DO NOTHING` (`backend/indexador.js:171-176, 42-47`).
3. **Idempotencia por escrow**: `truekes.escrow_id UNIQUE` con `ON CONFLICT DO UPDATE` (`schema.sql:132`; `backend/indexador.js:75`).
4. **Reproceso**: `indexador_checkpoint` guarda el último bloque por contrato (`backend/indexador.js:211-217`), permitiendo barrer desde bloque N.
5. **Reconciliación**: `reconciliar()` lee el espejo (`backend/indexador.js:222-230`); la comparación fina contra los getters del escrow se completa en C8 (pendiente de confirmar).

### 8.2 Restricciones CHECK y UNIQUE destacadas

| Restricción | Tabla | Línea | Efecto |
|---|---|---|---|
| `UNIQUE (tx_hash, log_index, entidad)` | `auditoria` | 337 | Idempotencia del indexador |
| `UNIQUE (escrow_id)` | `truekes` | 132 | Un escrow on-chain = una fila espejo |
| `UNIQUE (trueke_id, valorador)` | `valoraciones` | 165 | Un voto por valorador y trueque |
| `CHECK (… BETWEEN 1 AND 5)` ×5 | `valoraciones` | 159-163 | Escala 1-5 (D18) |
| `UNIQUE (disputa_id, socio)` | `votos_disputa` | 237 | **Nuevo (2026-09-08)**: 1 voto por Socio y disputa (D21) |
| `CHECK (voto IN ('ANULAR','VALIDO'))` | `votos_disputa` | 235 | **Nuevo (2026-09-08)**: veredictos posibles |
| `CHECK (tipo IN ('RECLAMO','JUSTIFICATIVO'))` | `evidencias_disputa` | 224 | **Nuevo (2026-09-08)**: tipo de evidencia acotado |
| `wallet UNIQUE NOT NULL` | `usuarios` | 72 | Una cuenta por dirección |

---

## 9. Caminos de lectura típicos (ejemplos con el código real)

| Consulta de negocio | Ruta en el modelo |
|---|---|
| Estado actual de un trueque | `truekes` por `escrow_id` o `id` → `estado` (enum 9 estados) + `encuentro_estado`/`cierre_a/b`; KPIs de disputas leen el espejo: `backend/api/routes/admin.js:30-34` |
| Escalera D28 de un usuario | `usuarios.estado` (INSCRITO→VERIFICADO→CERTIFICADO) + `kyc.estado`/`merkle_root` (espejo de `SmartAccount.kycMerkleRoot`, `sc/src/SmartAccount.sol:51`) |
| Certificación KYC/SBT (2026-09) | `kyc` (`via_sbt`, `sbt_contrato`, `sbt_token_id`, `documento_img_id`, `selfie_img_id`) + `imagenes_certificadas` (`KYC_DNI`/`KYC_SELFIE`) + on-chain `TrueKeateSBT.sbtDe(wallet)` (`backend/api/routes/kyc.js:136-145`) |
| ¿Quién participó y con qué? | `truekes.usuario_a/b` (direcciones) + `articulos` vía `articulo_a_id/b_id` |
| Valoraciones de un trueque | `valoraciones` por `trueke_id` (5 renglones 1-5); reputación media derivada (`backend/api/routes/reputacion.js:22-27`) y VALOR 4.2 (`listarValoracionesDe`) |
| Disputa v2 de un trueque (2026-09-08) | `disputas` por `trueke_id` (estado/plazos/veredicto) → `evidencias_disputa` (RECLAMO/JUSTIFICATIVO) y `votos_disputa` (ANULAR/VALIDO) por `disputa_id` → `notificaciones` a `wallet` |
| Saldos y movimientos VALOR del socio (2026-09-09) | `finanzas` por `usuario_id` (saldos) + `movimientos_valor`/`movimientos_brlt` por `wallet` |
| Búsqueda de trueques por cercanía | `ST_DWithin(puntos_encuentro.geog, usuarios.geog, 10000)` (≤10 km, RNF-08) + índice GIST `idx_puntos_geog` |
| Ciclo de suscripción de una empresa | `suscripciones` por `empresa_id` (ciclos 30 días, D33) |
| Evento procesado / reproceso | `auditoria` (eventos únicos) + `indexador_checkpoint` (último bloque por contrato) |

---

## 10. Resumen de relaciones por tabla (checklist)

| Tabla | PK | FKs reales (REFERENCES) | FKs lógicas / denormalizadas |
|---|---|---|---|
| `usuarios` | `id` | — | `wallet` (clave natural on-chain), `username` (handle público, 2026-09) |
| `kyc` | `id` | `usuario_id → usuarios` | `revisado_por` (wallet Owner/minter), `merkle_root` (espejo), `sbt_contrato` (dirección on-chain), `documento_img_id`/`selfie_img_id` → `imagenes_certificadas` (FK lógica) |
| `articulos` | `id` | `usuario_id → usuarios` | `imagen_certificacion_id → imagenes_certificadas` (1—1, D23) |
| `truekes` | `id` | `articulo_a_id`, `articulo_b_id → articulos` | `escrow_id` (on-chain), `usuario_a/b` (wallets), `punto_encuentro_id → puntos_encuentro` |
| `valoraciones` | `id` | `trueke_id → truekes` | `valorador`/`valorado` (wallets) |
| `puntos_encuentro` | `id` | `usuario_id → usuarios` | `geog` espacial |
| `puntos_favoritos` | `id` | `usuario_id → usuarios`, `punto_encuentro_id → puntos_encuentro` | `UNIQUE (usuario_id, punto_encuentro_id)` |
| `disputas` | `id` | `trueke_id → truekes` | `solicitante` (wallet), `registro_votos` (espejo JSONB); **hija 1—N**: `evidencias_disputa`, `votos_disputa` (CASCADE) |
| `evidencias_disputa` | `id` | `disputa_id → disputas` (CASCADE) | **Nuevo (2026-09-08)**: `autor` (wallet), `tipo` CHECK RECLAMO/JUSTIFICATIVO |
| `votos_disputa` | `id` | `disputa_id → disputas` (CASCADE) | **Nuevo (2026-09-08)**: `socio` (wallet), `UNIQUE (disputa_id, socio)`, `CHECK voto` |
| `notificaciones` | `id` | — | **Nuevo (2026-09-08)**: `wallet` (destinatario), `ref_tipo`/`ref_id` → disputa/trueke (polimórfica) |
| `imagenes_certificadas` | `id` | — | `ref_id` polimórfico `(tipo)` → articulos/truekes/**kyc**; `wallet` |
| `suscripciones` | `id` | `empresa_id → usuarios` | `tx_hash` (evento) |
| `campanas` | `id` | `usuario_id → usuarios` | `articulos` JSONB |
| `subastas` | `id` | `empresa_id → usuarios`, `articulo_id → articulos`, `ganador_id → usuarios` | `escrow_id` (on-chain), `nivel_ganador` (desempate D27) |
| `finanzas` | `usuario_id` (= FK) | `usuario_id → usuarios` | `nfts_stock`/`criptos`/`porcentajes_config` JSONB; la API de VALOR la actualiza (`moverSaldo`) |
| `movimientos_valor` | `id` | — | **Nuevo (2026-09-09)**: `wallet`/`contraparte` denormalizadas; append-only (VALOR) |
| `movimientos_brlt` | `id` | — | **Nuevo (2026-09-09)**: `wallet` denormalizada; pagos Stripe (`stripe_session`, `estado`) |
| `auditoria` | `id` | — | `actor` (log.address); UNIQUE idempotencia |
| `indexador_checkpoint` | `contrato` | — | — |
| `sesiones` | `token` | `wallet → usuarios(wallet)` | Tokens del login con wallet (RF-16); expiración 24 h |

---

## 11. Relaciones nuevas 2026-09-08/09 (flujo del director)

### 11.1 `disputas` 1—N `evidencias_disputa` y 1—N `votos_disputa` (2026-09-08)

- `disputas.id` → `evidencias_disputa.disputa_id` (**FK real `ON DELETE CASCADE`**,
  `backend/db/schema.sql:222`): una disputa tiene 0..N fotos de cada parte (tipo
  `RECLAMO`/`JUSTIFICATIVO`, CHECK en `schema.sql:224`). 1 disputa : N evidencias.
- `disputas.id` → `votos_disputa.disputa_id` (**FK real `ON DELETE CASCADE`**,
  `schema.sql:233`): una disputa tiene 0..N votos de Socios (`UNIQUE (disputa_id, socio)` en
  `schema.sql:237`, 1 voto por Socio — D21). 1 disputa : N votos.
- Ambas hijas se crean/votan desde el backend (`lib/almacen-pg.js:763-771,807-816`); no son espejo
  de eventos on-chain (la votación es off-chain v2; la sincronización on-chain queda pendiente).

### 11.2 `finanzas` y los movimientos de VALOR (2026-09-09)

- `finanzas.usuario_id` (PK+FK 1:1 con `usuarios`, `schema.sql:315`) es la cuenta de saldos; los
  movimientos que la explican viven **por wallet** (sin FK, denormalizadas — §1.2):
  - `movimientos_valor.wallet` (1 usuario : N movimientos, `migracion_valor.sql:25`) con
    `contraparte` = la plataforma (`:29`); cada recarga/retiro/conversión de cripto/BRLT queda
    registrado append-only (`ix_movimientos_wallet (wallet, created_at DESC)`, `:34`).
  - `movimientos_brlt.wallet` (1 usuario : N pagos Stripe, `migracion_valor.sql:39`): la recarga
    fiat crea la fila `PENDIENTE` y el webhook la confirma → acredita `finanzas.brlt`
    (`confirmarMovimientoBrlt`, `almacen-pg.js:585-596`).
- O sea: **`finanzas` 1—N `movimientos_valor` / `movimientos_brlt`** por la columna `wallet`
  (relación lógica por dirección, no constraint SQL).

### 11.3 `notificaciones` por wallet (2026-09-08)

- `notificaciones.wallet` = destinatario (dirección denormalizada, `schema.sql:243`): 1 wallet : N
  notificaciones; índice `ix_notificaciones_wallet (wallet, leida, created_at DESC)`
  (`schema.sql:373`) soporta el contador de no leídas de la campana.
- Referencia al negocio: `notificaciones.ref_tipo` + `ref_id` apuntan a `disputas.id` o `truekes.id`
  (polimórfica sin FK, `schema.sql:247-248`); la crea el motor de disputas
  (`lib/flujo-disputas.js:60-68`) y el cierre No Conforme (`routes/truekes.js:408-416`).
