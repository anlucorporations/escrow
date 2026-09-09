# TrueKeate — Diccionario de Datos

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Documento | `RepoTecnico/diccionario_datos.md` |
| Estado | Actualizado **2026-09-09** — alineado con el esquema PostgreSQL **real** (Fase 3 materializada). Revisión anterior: 2026-09-02 |
| Fuente maestra | `backend/db/schema.sql` (BD nueva, 19 tablas) + migraciones `backend/db/migracion_*.sql` (`migracion_trueke_abierto.sql`, `migracion_disputas_v2.sql`, `migracion_valor.sql`, `migracion_sbt.sql`, `migracion_username.sql`) → **21 tablas, 11 tipos ENUM** |
| Escritores reales | `backend/api/lib/almacen-pg.js` (backend/API) · `backend/indexador.js` (espejo on-chain) — confirmados en código |
| Fuente de diseño | `RepoTecnico/requerimientos.md` (RF-01 a RF-19, RNF-01…RNF-08) · `arquitectura_tecnica.md` (§3–§5) |

> ⚠️ **Diccionario de datos materializado (2026-09-09).** Los tipos, restricciones y relaciones
> definitivas provienen de `backend/db/schema.sql` y de las migraciones `backend/db/migracion_*.sql`
> (el `schema.sql` describe la BD nueva completa; sobre BDs existentes cada migración aplica sus
> cambios de forma idempotente). Los nombres de columna son los **snake_case reales** de la BD;
> el inventario histórico de diseño (camelCase, Fase 2) se conserva en §1 y como trazabilidad en §4.
> Lo que el código aún no materializa se marca **"sin tabla SQL"** o **"pendiente"** (no se inventa).

---

## 1. Entidades on-chain (contratos)

| Entidad | Descripción | Campos candidatos |
|---|---|---|
| `Escrow` | Custodia de NFTs/criptos durante el trueque | `id`, `truekeId`, `parteA`, `parteB`, `nftsCustodiados[]`, `estado` **ENUM canónico (9)** (CREADO/ACTIVO/CUSTODIADO/APERTURA/EN_DISPUTA/RESOLUCION_SOCIOS/COMPLETADO/ANULADO/BLOQUEADO), `horaPautada`, `aperturaA`, `aperturaB`, `firmaRecepcionA`, `firmaRecepcionB`, `solicitudAnulacion`, `solicitanteAnulacion`, `plazoResolucion` (≤5 días), `votacionSocios`, `quorum` (≥2/3, 1 voto por Socio — D21), `resolucion`, `motivoAnulacion`, `anulacionPorDefecto` (D26: vence plazo sin quórum → ANULADO), `rootMerkleImagenes` (D23: raíz merkle de certificaciones anclada on-chain), `timelockSanciones` (6 h — D21, solo sanciones) |
| `SmartAccount` (ERC-4337 inspirada — D35) | Wallet contrato de identidad | `owner`, `kycMerkleRoot`, `estadoVerificacion` **ENUM escalera D28** (INSCRITO/VERIFICADO/CERTIFICADO), `guardianes[]` (3 — D34), `umbralGuardianes` (2 de 3 — D34), `timelockRecuperacion` (48 h — D34), `recuperacionKyc` (solo con revisión humana del Owner) |
| `NivelesReputacion` | Algoritmo de nivel (D12, D30) | `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1−ratio_apelaciones)`; insumos **normalizados a 0–100** (reputación ×20; volumen relativo al máximo ×100; apelaciones 100×(1−ratio)); **recálculo mensual**; `intercambioEfectivo` (COMPLETED + firmas + valoración); `medallaOro` (≥1000 efectivos y ≥90% ratio) |
| `BRLT` (ERC-20) | Stablecoin BorloTokens | `totalSupply`, `balanceOf`, `admin` (contrato de Socios), `topeEmision` (**1.000.000 BRLT inicial — D32**), `emisionesRegistradas[]` (proposito, monto, quorum 2/3 — D32), `valor` |
| `SuscripcionEmpresa` | Cobro automático por **staking bloqueado** (D33) | `empresa`, `montoPlan` (base **100 BRLT/mes**, configurable por Owner — D33), `periodo` (30 días), `ultimoCobro`, `activa`, `estado` (ACTIVA/IRREGULAR/CANCELADA) |
| `Reputacion` (si on-chain) | Puntajes por renglón | `usuario`, `aceptacion`, `honestidad`, `seguridad`, `confiabilidad`, `compromiso`, `nivel`, `medalla` |

> **Nota de coherencia (2026-09-09):** el estado **`PROPUESTO`** (oferta abierta del Mercado) **no
> existe on-chain**: vive solo en PostgreSQL (`estado_escrow` tiene 10 valores = 9 on-chain +
> `PROPUESTO` off-chain). En cadena el ciclo arranca en `CREADO` cuando B acuerda la oferta
> (`backend/db/schema.sql:30-37`, `backend/api/lib/almacen-pg.js:389-424`).

## 2. Entidades off-chain (PostgreSQL)

Esquema real (Fase 3): extensiones `postgis` + `pgcrypto` (`backend/db/schema.sql:9-10`); patrón
de escritura por clase de tabla (RNF-01.1/RNF-03.2): **espejo on-chain = solo el indexador**;
**negocio off-chain = el backend (API)**; **operación del indexador = el propio indexador**.

### 2.1 Inventario — 21 tablas

| # | Tabla | Fuente SQL | Clase / escritor | Propósito |
|---|---|---|---|---|
| 1 | `usuarios` | `schema.sql:70-88` | Espejo parcial + off-chain · backend | Registro e identidad (CU-01/02); escalera D28 |
| 2 | `kyc` | `schema.sql:92-108` | Espejo parcial + off-chain · backend | Metadata KYC; certificación SBT (2026-09) |
| 3 | `articulos` | `schema.sql:111-125` | Off-chain · backend | Publicaciones AtoA (CU-06) |
| 4 | `truekes` | `schema.sql:130-151` | Espejo + ofertas PROPUESTO · indexador **y** backend | Intercambios y su estado (RNF-01.1) |
| 5 | `valoraciones` | `schema.sql:154-166` | Off-chain · backend | Evaluación 1–5 al cierre (D18/D36) |
| 6 | `puntos_encuentro` | `schema.sql:169-177` | Off-chain (PostGIS) · backend | Zonas de encuentro ≤10 km (CU-16) |
| 7 | `puntos_favoritos` | `schema.sql:182-189` · `migracion_trueke_abierto.sql:50-57` | Off-chain · backend | Últimos puntos usados como favoritos (punto 7) — **🆕** |
| 8 | `disputas` | `schema.sql:201-217` · `migracion_disputas_v2.sql` | Off-chain · backend | Disputas: REPORTADA→…→RESUELTA (CU-18/19) — **🆕 v2** |
| 9 | `evidencias_disputa` | `schema.sql:220-228` · `migracion_disputas_v2.sql:31-39` | Off-chain · backend | Fotos de cada parte (RECLAMO/JUSTIFICATIVO) — **🆕** |
| 10 | `votos_disputa` | `schema.sql:231-238` · `migracion_disputas_v2.sql:43-50` | Off-chain · backend | Voto de cada Socio (ANULAR/VALIDO) — **🆕** |
| 11 | `notificaciones` | `schema.sql:241-251` · `migracion_disputas_v2.sql:54-64` | Off-chain · backend | Campana in-app — **🆕** |
| 12 | `imagenes_certificadas` | `schema.sql:254-267` · `migracion_sbt.sql` | Off-chain · backend | Evidencia imágenes (D23) + KYC_DNI/SELFIE + binario (2026-09) |
| 13 | `suscripciones` | `schema.sql:270-280` | Espejo parcial · indexador/backend | Suscripciones empresa (CU-24, D33) |
| 14 | `campanas` | `schema.sql:283-293` | Off-chain · backend | Campañas VENTA/RECOLECTA (CU-09/10) |
| 15 | `subastas` | `schema.sql:296-311` | Off-chain · backend | Subastas de empresa (RF-17, CU-25/26) |
| 16 | `finanzas` | `schema.sql:314-323` | Espejo parcial + off-chain · backend | Saldos y fondo global (CU-30/31) |
| 17 | `auditoria` | `schema.sql:326-338` | Operación append-only · indexador | Registro auditable + idempotencia (RF-18.6) |
| 18 | `indexador_checkpoint` | `schema.sql:341-346` | Operación · indexador | Checkpoints de reproceso (RNF-07.4) |
| 19 | `sesiones` | `schema.sql:350-356` | Off-chain · backend | Token de sesión del login con wallet (RF-16) |
| 20 | `movimientos_valor` | `migracion_valor.sql:23-33` | Off-chain append-only · backend | Auditoría de movimientos de VALOR 4.1/4.3 — **🆕 2026-09-09** |
| 21 | `movimientos_brlt` | `migracion_valor.sql:37-48` | Off-chain · backend | Pagos BRLT por fiat (Stripe Checkout) — **🆕 2026-09-09** |

> **Nota:** `schema.sql` (BD nueva) ya incluye los cambios de `migracion_trueke_abierto.sql`,
> `migracion_disputas_v2.sql`, `migracion_sbt.sql` y `migracion_username.sql`; las tablas
> `movimientos_valor` y `movimientos_brlt` solo existen en `migracion_valor.sql` (2026-09-09).

### 2.2 Tipos ENUM (11)

| ENUM | Valores | Uso |
|---|---|---|
| `tipo_usuario` | `PARTICULAR` / `EMPRESA` / `SOCIO` | `usuarios.tipo` (rol funcional; `SOCIO` lo fija el indexador con `SocioAdmitido`) |
| `nivel_usuario` | `INICIADO` / `COMUN` / `FRECUENTE` / `SOCIO` | `usuarios.nivel` (D12/D30); `subastas.nivel_ganador` (D27) |
| `medalla_usuario` | `BRONCE` / `PLATA` / `ORO` | `usuarios.medalla` |
| `estado_verificacion` | `INSCRITO` / `VERIFICADO` / `CERTIFICADO` | `usuarios.estado` — escalera D28 |
| `estado_escrow` | `PROPUESTO` / `CREADO` / `ACTIVO` / `CUSTODIADO` / `APERTURA` / `EN_DISPUTA` / `RESOLUCION_SOCIOS` / `COMPLETADO` / `ANULADO` / `BLOQUEADO` | `truekes.estado` — **10 valores: `PROPUESTO` (off-chain, 🆕) + 9 on-chain** |
| `categoria_item` | `ARTICULO` / `SERVICIO` / `BIEN` / `CRIPTO` | `articulos.categoria` (tipo de trueque); `truekes.tipo_requerido` — **🆕** |
| `estado_kyc` | `PENDIENTE` / `APROBADO` / `RECHAZADO` / `APELACION` | `kyc.estado` |
| `tipo_imagen` | `PUBLICACION` / `RECEPCION` / `KYC_DNI` / `KYC_SELFIE` | `imagenes_certificadas.tipo` — KYC_DNI/KYC_SELFIE 🆕 2026-09 |
| `estado_suscripcion` | `ACTIVA` / `IRREGULAR` / `CANCELADA` | `suscripciones.estado` (D33) |
| `tipo_campana` | `VENTA` / `RECOLECTA` | `campanas.tipo` |
| `estado_subasta` | `ABIERTA` / `CERRADA` / `ANULADA` | `subastas.estado` |

> ⚠️ `nivel_usuario` y `tipo_usuario` comparten el valor `SOCIO` con significados distintos:
> `tipo='SOCIO'` es rol de gobernanza (votación D21); `nivel='SOCIO'` es el nivel superior de reputación.
>
> Varias columnas **no usan ENUM** sino `TEXT` con CHECK o valores literales (documentados en cada
> tabla): `disputas.estado`, `truekes.encuentro_estado`/`cierre_a`/`cierre_b`, `votos_disputa.voto`,
> `evidencias_disputa.tipo`, `movimientos_valor.tipo`, `movimientos_brlt.estado`.

### 2.3 `usuarios` — registro e identidad (CU-01/02)

**Escritor:** backend (`POST /auth/*`, `almacen-pg.js:44-114`); el indexador actualiza `tipo`/`wallet`
desde eventos on-chain. **Fuente:** `schema.sql:70-88` + `migracion_username.sql`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK interna | Referenciada por `kyc`, `articulos`, `puntos_encuentro`, `suscripciones`, `campanas`, `subastas`, `finanzas` |
| `wallet` | `CHAR(42)` | Dirección EOAs/Smart Account | `UNIQUE NOT NULL`; clave natural on-chain |
| `username` | `TEXT` | Handle público `@username` | `UNIQUE` (índice parcial); **🆕 2026-09** (`migracion_username.sql`) — derivado del correo o `u_<wallet>` |
| `correo` | `TEXT` | Email — **PII†** cifrado en reposo | D17 |
| `telefono` | `TEXT` | Teléfono — **PII†** | D17 |
| `direccion_inscripcion` | `TEXT` | Dirección de inscripción — **PII†** | D17 |
| `geog` | `GEOGRAPHY(Point,4326)` | Ubicación (PostGIS) | Regla ≤10 km (RF-08.3/08.4) |
| `tipo` | `tipo_usuario` | Rol funcional | default `PARTICULAR`; `SOCIO` lo fija el indexador (`SocioAdmitido`) |
| `nivel` | `nivel_usuario` | Nivel de reputación | default `INICIADO` (D12/D30) |
| `medalla` | `medalla_usuario` | Medalla | default `BRONCE` (requisito Empresa: ORO) |
| `estado` | `estado_verificacion` | Escalera D28 | default `INSCRITO` (→ VERIFICADO → CERTIFICADO) |
| `smart_account` | `CHAR(42)` | Smart Account del usuario (D35) | El indexador localiza al usuario por esta columna |
| `consentimiento_gdpr` | `BOOLEAN` | Consentimiento GDPR (D17) | default `FALSE` |
| `consentimiento_fecha` | `TIMESTAMPTZ` | Fecha del consentimiento | — |
| `actividad_ultima` | `TIMESTAMPTZ` | Última actividad | Retención/borrado por inactividad (D17) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoría temporal | default `now()` |

> **Nota sobre el rol OWNER (🆕 2026-09-09):** el Owner **no es un valor de `tipo` ni una columna
> nueva** en `usuarios`. Se detecta **on-chain** como el dueño del `SociosRegistry`
> (`SociosRegistry.owner()`, `sc/src/SociosRegistry.sol:17`), resuelto en
> `backend/api/lib/es-owner.js` (`function owner() view returns (address)`); sin red se usa el env
> `OWNER_WALLET`, y solo en dev/tests el almacén en memoria guarda un `rol: 'OWNER'` de prueba.

### 2.4 `kyc` — metadata KYC + certificación SBT (RF-01.7, D17)

**Escritor:** backend (`POST /kyc/*`). **Fuente:** `schema.sql:92-108` + `migracion_sbt.sql`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `usuario_id` | `BIGINT` | FK → `usuarios(id)` | 1 registro KYC por usuario (relación 1:1 lógica) |
| `documento_identidad` | `BYTEA` | Documento cifrado — **PII†** | D17 (legado: el flujo 2026-09 guarda la imagen en `imagenes_certificadas`) |
| `selfie_ref` / `selfie_hash` | `TEXT` / `BYTEA` | Referencia/hash de selfie — **PII†** | Legado del diseño original |
| `merkle_root` | `BYTEA` | Raíz merkle — espejo on-chain | D28: lo copia el indexador (`MerkleRootActualizado`) |
| `estado` | `estado_kyc` | Estado del trámite | default `PENDIENTE` (APROBADO automático vía SBT) |
| `revisado_por` | `CHAR(42)` | Owner (RF-18.4) o minter | Revisión humana o cuenta de la plataforma |
| `via_sbt` | `BOOLEAN` | Certificado con SBT | **🆕 2026-09** default `FALSE` (`migracion_sbt.sql:14`) |
| `sbt_contrato` | `CHAR(42)` | Contrato del SBT (nativo/externo) | **🆕 2026-09** |
| `sbt_token_id` | `NUMERIC` | tokenId del SBT usado/minteado | **🆕 2026-09** |
| `documento_img_id` | `BIGINT` | Imagen `KYC_DNI` | FK lógica → `imagenes_certificadas(id)` — **🆕 2026-09** |
| `selfie_img_id` | `BIGINT` | Imagen `KYC_SELFIE` | FK lógica → `imagenes_certificadas(id)` — **🆕 2026-09** |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoría temporal | default `now()` |

### 2.5 `articulos` — publicaciones AtoA (CU-06)

**Escritor:** backend (`POST /catalog/articulos`). **Fuente:** `schema.sql:111-125` + `migracion_trueke_abierto.sql:36-38`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | Referenciada por `truekes.articulo_a_id/b_id`, `subastas.articulo_id` |
| `usuario_id` | `BIGINT` | FK → `usuarios(id)` | Dueño/publicador |
| `titulo` | `TEXT` | Título | `NOT NULL` |
| `descripcion` | `TEXT` | Descripción | — |
| `rubro` | `TEXT` | Rubro | `NOT NULL`; índice `idx_articulos_rubro` |
| `categoria` | `categoria_item` | Tipo de ítem (tipo de trueke) | default `ARTICULO` — **🆕** (`migracion_trueke_abierto.sql:36`) |
| `imagen_certificacion_id` | `BIGINT` | Imagen certificada de la publicación | FK lógica 1—1 → `imagenes_certificadas(id)` (sin constraint real; D23) |
| `nft_token_id` | `NUMERIC` | tokenId del TrueKeateNFT oficial | Punto 1 de la lógica maestra |
| `disponible` | `BOOLEAN` | Disponible para trueque | default `TRUE` |
| `usado_el` | `TIMESTAMPTZ` | Ítem consumido (NFT quemado) | **🆕** (`migracion_trueke_abierto.sql:38`; lógica post-trueke punto 2) |
| `alta_disponibilidad` | `BOOLEAN` | Alta disponibilidad | default `FALSE` — **computado** (D19) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoría temporal | default `now()` |

### 2.6 `truekes` — intercambios y ofertas abiertas (espejo + PROPUESTO)

**Escritor dual:** el **indexador** inserta/actualiza el espejo desde eventos on-chain
(`escrow_id` positivo, RNF-01.1); el **backend** crea ofertas `PROPUESTO` y trueques simulados con
`escrow_id` **negativo sintético** (−1, −2…) que no colisionan con la cadena, y registra encuentro/
cierre (`almacen-pg.js:350-466`). **Fuente:** `schema.sql:130-151` + `migracion_trueke_abierto.sql`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | Referenciada por `valoraciones`, `disputas`, `imagenes_certificadas` (RECEPCION) |
| `escrow_id` | `NUMERIC` | Id on-chain del escrow | `UNIQUE NOT NULL`; **negativo sintético** para filas del backend sin contraparte on-chain |
| `articulo_a_id` | `BIGINT` | Lo que A ofrece | FK → `articulos(id)` |
| `articulo_b_id` | `BIGINT` | Lo que B ofrece al acordar | FK → `articulos(id)`; `NULL` en `PROPUESTO` |
| `usuario_a` | `CHAR(42)` | Parte A | `NOT NULL` |
| `usuario_b` | `CHAR(42)` | Parte B | `NULL` en `PROPUESTO` (oferta sin contraparte) — nullable **🆕** |
| `estado` | `estado_escrow` | Estado del trueque | default `PROPUESTO`; enum 10 valores (§2.2) — **🆕 PROPUESTO** |
| `descripcion_requerida` | `TEXT` | Qué quiere recibir A (oferta abierta) | **🆕** — NULL fuera de `PROPUESTO` |
| `tipo_requerido` | `categoria_item` | Tipo de ítem que A desea recibir | **🆕** |
| `hora_pautada` | `TIMESTAMPTZ` | Hora pautada del encuentro | Ventana de apertura ≤10 min |
| `apertura_a` / `apertura_b` | `TIMESTAMPTZ` | Apertura de cada parte | Espejo de `AperturaA/B` (indexador) |
| `punto_encuentro_id` | `BIGINT` | Punto de encuentro acordado | FK lógica → `puntos_encuentro(id)` (sin constraint real) — **🆕** |
| `encuentro_propuesto_por` | `CHAR(42)` | Quién propuso el encuentro | **🆕** |
| `encuentro_estado` | `TEXT` | Estado de la propuesta de encuentro | **🆕** — valores literales `'PROPUESTO'` / `'ACEPTADO'` / `'RECHAZADO'` |
| `cierre_a` | `TEXT` | Cierre de A | **🆕** — valores literales `'CONFORME'` / `'NO_CONFORME'` (punto 9) |
| `cierre_b` | `TEXT` | Cierre de B | **🆕** — `'CONFORME'` / `'NO_CONFORME'` |
| `tx_hash` | `CHAR(66)` | Tx de creación | Indexador |
| `bloque` | `BIGINT` | Bloque de creación | Indexador |
| `updated_at` | `TIMESTAMPTZ` | Última actualización | default `now()` (sin `created_at` en el esquema actual) |

> **Flujo de cierre (2026-09):** con ambos `cierre_a/b = CONFORME` + valoraciones → el trueque pasa a
> `COMPLETADO`. Si una parte declara `NO_CONFORME` → se crea la disputa y el trueke pasa a
> `EN_DISPUTA` (`almacen-pg.js:651-668`); el veredicto de la disputa lo lleva a `ANULADO` o `COMPLETADO`.

### 2.7 `valoraciones` — evaluación al cierre (D18/D36)

**Escritor:** backend. **🆕 2026-09-09:** el `POST /truekes/:id/valoracion` **persiste en esta tabla**
(`backend/api/routes/truekes.js:192-210` → `almacen-pg.js:598-612`); hasta el Ciclo 6 la valoración
vivía **solo en memoria** (`almacen.js`). Es el insumo de la sección VALOR 4.2 (reputación y últimos
10 trueques valorados). **Fuente:** `schema.sql:154-166` + `migracion_valor.sql:18-19`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `trueke_id` | `BIGINT` | Trueque valorado | FK → `truekes(id)` |
| `valorador` | `CHAR(42)` | Quién valora | — |
| `valorado` | `CHAR(42)` | Quién es valorado | — |
| `aceptacion`…`compromiso` | `SMALLINT` | 5 renglones (aceptación, honestidad, seguridad, confiabilidad, compromiso) | `CHECK (… BETWEEN 1 AND 5)` en cada renglón |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |
| `UNIQUE (trueke_id, valorador)` | — | **Un voto por valorador y por trueque** | Impide doble valoración; el INSERT usa `ON CONFLICT DO UPDATE` |

> El marcador on-chain "ambas partes valoraron" (requisito `COMPLETADO`, eventos
> `ValoracionMarcadaA/B` en `sc/src/Escrow.sol`) **no tiene columna** en el esquema — queda como
> diseño pendiente (C8); la tabla garantiza 1 valoración por parte y trueque.

### 2.8 `puntos_encuentro` y `puntos_favoritos` (CU-16/22; PostGIS)

**Escritor:** backend (`POST /puntos-encuentro`; `registrarUsoPunto`). **Fuente:** `schema.sql:169-189`
+ `migracion_trueke_abierto.sql:50-57`.

**`puntos_encuentro`** — zonas de encuentro:

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | Referenciado por `truekes.punto_encuentro_id`, `puntos_favoritos` |
| `usuario_id` | `BIGINT` | FK → `usuarios(id)` | Quien registró el punto |
| `direccion` | `TEXT` | Dirección — **PII†** | D17 |
| `geog` | `GEOGRAPHY(Point,4326)` | Coordenadas | `NOT NULL`; índice GIST `idx_puntos_geog` |
| `radio_km` | `NUMERIC` | Radio de búsqueda | default `10` (≤10 km) |
| `aprobado_socios` | `BOOLEAN` | Establecimiento de retiro aprobado | default `FALSE` (CU-22) |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

**`puntos_favoritos`** — favoritos/últimos usados — **🆕**:

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `usuario_id` | `BIGINT` | FK → `usuarios(id)` | — |
| `punto_encuentro_id` | `BIGINT` | FK → `puntos_encuentro(id)` | — |
| `ultimo_uso` | `TIMESTAMPTZ` | Último uso del punto | Se refresca al completar un trueke con ese punto; default `now()` |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |
| `UNIQUE (usuario_id, punto_encuentro_id)` | — | 1 fila por usuario y punto | Upsert con `ON CONFLICT DO UPDATE` |

### 2.9 `disputas` — flujo afinado v2 (CU-18/19) — **🆕 2026-09-08**

**Escritor:** backend (`POST /disputas`, `flujo-disputas.js`). **Fuente:** `schema.sql:201-217` +
`migracion_disputas_v2.sql`. **Estados (TEXT, no ENUM):** `REPORTADA` → `ESPERA_JUSTIFICATIVO` →
`EN_VOTACION` → `RESUELTA` (el estado legado `ABIERTA` se migra a `REPORTADA`).

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | Referenciada por `evidencias_disputa`, `votos_disputa` (ON DELETE CASCADE) |
| `trueke_id` | `BIGINT` | Trueque disputado | FK → `truekes(id)` |
| `solicitante` | `CHAR(42)` | Reclamante (quien firmó NO_CONFORME) | — |
| `motivo` | `TEXT` | Motivo del reclamo (formulario) | — |
| `estado` | `TEXT` | Estado del flujo | default `'REPORTADA'` (TEXT, no ENUM) |
| `justificativo_vence_at` | `TIMESTAMPTZ` | Plazo del conforme para justificar | **🆕** — 3 días |
| `votacion_vence_at` | `TIMESTAMPTZ` | Plazo de la votación de Socios | **🆕** — 5 días (D13/D21) |
| `veredicto` | `TEXT` | Veredicto | **🆕** — `'ANULAR'` / `'VALIDO'` (RESUELTA) |
| `resuelta_en` | `TIMESTAMPTZ` | Cuándo se resolvió | **🆕** |
| `resolucion` | `TEXT` | Detalle legible del desenlace | — |
| `sancion` | `TEXT` | Sanción aplicada | — |
| `timelock_ejecuta_at` | `TIMESTAMPTZ` | Timelock 6 h (D21, solo sanciones) | — |
| `registro_votos` | `JSONB` | Espejo de votos (D21) | Legado del diseño on-chain; el detalle de votos hoy vive en `votos_disputa` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoría temporal | default `now()` |

### 2.10 `evidencias_disputa` y `votos_disputa` — **🆕 2026-09-08**

**Escritor:** backend (`POST /disputas/:id/evidencias`, `POST /disputas/:id/votar`).
**Fuente:** `schema.sql:220-238` + `migracion_disputas_v2.sql:31-51`.

**`evidencias_disputa`** — fotos de cada parte:

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `disputa_id` | `BIGINT` | FK → `disputas(id)` | `ON DELETE CASCADE` |
| `autor` | `CHAR(42)` | Wallet de la parte que sube la foto | — |
| `tipo` | `TEXT` | Origen de la evidencia | `CHECK (tipo IN ('RECLAMO','JUSTIFICATIVO'))` |
| `contenido` | `BYTEA` | Binario de la imagen | `NOT NULL` |
| `mime` | `TEXT` | Tipo MIME | default `'image/jpeg'` |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

**`votos_disputa`** — voto de los Socios (1 voto por socio y disputa):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `disputa_id` | `BIGINT` | FK → `disputas(id)` | `ON DELETE CASCADE` |
| `socio` | `CHAR(42)` | Socio votante (padrón on-chain; no votan las partes A/B) | — |
| `voto` | `TEXT` | Sentido del voto | `CHECK (voto IN ('ANULAR','VALIDO'))` |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |
| `UNIQUE (disputa_id, socio)` | — | **1 voto por socio y disputa** | Upsert `ON CONFLICT DO UPDATE` |

### 2.11 `notificaciones` — campana in-app — **🆕 2026-09-08**

**Escritor:** backend (`flujo-disputas.js`, `POST /notificaciones/*`). **Fuente:** `schema.sql:241-251`
+ `migracion_disputas_v2.sql:54-64`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `wallet` | `CHAR(42)` | Destinatario | índice `ix_notificaciones_wallet(wallet, leida, created_at DESC)` |
| `tipo` | `TEXT` | Tipo de notificación | `'DISPUTA_REPORTADA'` / `'PEDIDO_JUSTIFICATIVO'` / `'VOTACION_ABIERTA'` / `'VEREDICTO'` / `'SISTEMA'` |
| `titulo` | `TEXT` | Título | `NOT NULL` |
| `cuerpo` | `TEXT` | Cuerpo | — |
| `ref_tipo` | `TEXT` | Tipo de referencia | `'disputa'` / `'trueke'` |
| `ref_id` | `BIGINT` | Id de la referencia | — |
| `leida` | `BOOLEAN` | Marca de leída | default `FALSE` |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

### 2.12 `imagenes_certificadas` — evidencia de imágenes (RF-11, D23; KYC 2026-09)

**Escritor:** backend (`guardarImagen`, `guardarImagenArticulo`; no lo escribe el indexador).
**Fuente:** `schema.sql:254-267` + `migracion_sbt.sql` + `migracion_trueke_abierto.sql:64-65`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | Referenciada por `articulos.imagen_certificacion_id`, `kyc.documento_img_id/selfie_img_id` |
| `tipo` | `tipo_imagen` | Clase de imagen | `PUBLICACION` / `RECEPCION` / `KYC_DNI` / `KYC_SELFIE` — KYC 🆕 2026-09 |
| `ref_id` | `BIGINT` | Id polimórfico según `tipo` | `articulos.id` (PUBLICACION), `truekes.id` (RECEPCION), `kyc.id` (KYC_*) — sin constraint real |
| `hash_sha256` | `BYTEA` | Hash de integridad | `NOT NULL` (RF-11.2) |
| `ipfs_cid` | `TEXT` | Referencia IPFS | D23 (pinning propio) |
| `wallet` | `CHAR(42)` | Autor | `NOT NULL` |
| `firma_ecdsa` | `BYTEA` | Firma del dueño | **Opcional desde 2026-09** (las imágenes KYC no llevan firma) |
| `metadata` | `JSONB` | Datos auxiliares | — |
| `root_merkle_anclada` | `BYTEA` | Raíz merkle anclada on-chain | D23 — **pendiente**: los contratos de este ciclo no declaran el anclaje |
| `contenido` | `BYTEA` | Binario de la imagen | **🆕 2026-09** (imágenes en mercado y KYC) |
| `mime` | `TEXT` | Tipo MIME | **🆕 2026-09** (`image/jpeg`, `image/png`…) |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

### 2.13 `suscripciones`, `campanas`, `subastas` (CU-24, CU-09/10, CU-25/26)

**Fuente:** `schema.sql:270-311`.

**`suscripciones`** (cobro empresa por staking bloqueado — D33):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `empresa_id` | `BIGINT` | FK → `usuarios(id)` | Empresa suscrita |
| `plan` | `TEXT` | Plan | base 100 BRLT/mes configurable (D33) |
| `monto` | `NUMERIC` | Monto del ciclo | `NOT NULL` |
| `ciclo_inicio` / `ciclo_fin` | `TIMESTAMPTZ` | Ciclo de 30 días | `ciclo_fin = ciclo_inicio + 30 días` |
| `fecha` | `TIMESTAMPTZ` | Fecha del cobro | default `now()` |
| `tx_hash` | `CHAR(66)` | Tx del evento | — |
| `estado` | `estado_suscripcion` | Estado | default `ACTIVA` |

**`campanas`**:

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `tipo` | `tipo_campana` | VENTA/RECOLECTA | `NOT NULL` |
| `usuario_id` | `BIGINT` | FK → `usuarios(id)` | Organizador |
| `estado` | `TEXT` | Estado | default `'ACTIVA'` (texto libre) |
| `aprobada_socios` | `BOOLEAN` | Aprobación de Socios | default `FALSE` |
| `articulos` | `JSONB` | Artículos de la campaña | — |
| `causa` | `TEXT` | Causa (RECOLECTA) | — |
| `plazo_fin` | `TIMESTAMPTZ` | Fin de campaña | — |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

**`subastas`**:

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `empresa_id` | `BIGINT` | FK → `usuarios(id)` | Empresa subastadora |
| `articulo_id` | `BIGINT` | FK → `articulos(id)` | Artículo subastado |
| `escrow_id` | `NUMERIC` | Escrow asociado | — |
| `duracion` | `INTERVAL` | Duración | — |
| `puja_inicial` / `incremento_minimo` | `NUMERIC` | Puja inicial / incremento | — |
| `pujas` | `JSONB` | Historial de pujas | — |
| `estado` | `estado_subasta` | Estado | default `ABIERTA` |
| `ganador_id` | `BIGINT` | FK → `usuarios(id)` | Ganador |
| `valor_ganador` | `NUMERIC` | Mayor valor ofrecido | D27 |
| `nivel_ganador` | `nivel_usuario` | Nivel del ganador | Desempate por nivel (D27) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | Auditoría temporal | default `now()` |

### 2.14 `finanzas` — saldos y fondo global (CU-30/31)

**Escritor:** backend (`moverSaldo`, `asegurarFinanzas`) + indexador (incremento BRLT por emisión).
**Fuente:** `schema.sql:314-323`. Nota: la sección **VALOR** (2026-09-09) reemplaza el concepto de
"Finanzas" por 3 subsecciones (criptos 4.1, reputación 4.2, BRLT 4.3); `finanzas` conserva los saldos
agregados y los nuevos movimientos se auditan en `movimientos_valor`/`movimientos_brlt`.

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `usuario_id` | `BIGINT` | PK + FK → `usuarios(id)` | 1:1 usuario–finanzas |
| `nfts_stock` | `JSONB` | Stock de NFTs | — |
| `criptos` | `JSONB` | Stock de criptos | — |
| `brlt` | `NUMERIC` | Saldo BRLT | default `0`; lo acredita el webhook de Stripe y la emisión on-chain (D32) |
| `fondo_valor` | `NUMERIC` | Fondo global de valor | default `0` |
| `porcentajes_config` | `JSONB` | Porcentajes configurables Owner | default `{"trueque":1,"suscripciones":10,"brlt":5}` (D7) |
| `updated_at` | `TIMESTAMPTZ` | Última actualización | default `now()` |

### 2.15 `movimientos_valor` y `movimientos_brlt` — sección VALOR — **🆕 2026-09-09**

**Escritor:** backend (routes `valor.js`). **Fuente:** `migracion_valor.sql` (aún no incorporadas a
`schema.sql`). Regla de negocio: los movimientos de cripto/BRLT son **solo entre el usuario y la
PLATAFORMA** (`contraparte` = cuenta operativa); no hay transferencia P2P directa de cripto.

**`movimientos_valor`** — auditoría append-only (4.1 criptos y 4.3 BRLT):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `wallet` | `CHAR(42)` | Usuario que opera | `NOT NULL`; índice `ix_movimientos_wallet(wallet, created_at DESC)` |
| `tipo` | `TEXT` | Tipo de movimiento | `RECARGA_CRIPTO` / `RETIRO_CRIPTO` / `CONVERSION` / `RECARGA_BRLT` / `RETIRO_BRLT` |
| `moneda` | `TEXT` | Moneda | `'ETH'` / `'BRLT'` |
| `monto` | `NUMERIC` | Cantidad movida | `NOT NULL` |
| `contraparte` | `CHAR(42)` | **La PLATAFORMA** (cuenta operativa) | `NOT NULL` — nunca P2P |
| `detalle` | `TEXT` | Descripción legible | — |
| `tx_hash` | `CHAR(66)` | Tx on-chain real (si aplica) | — |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

**`movimientos_brlt`** — pagos BRLT por fiat (Stripe Checkout alojado + webhook; 4.3):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `wallet` | `CHAR(42)` | Comprador | `NOT NULL` |
| `monto_brlt` | `NUMERIC` | BRLT acreditables al confirmar | `NOT NULL` |
| `monto_fiat` | `NUMERIC` | Monto en moneda fiat | USD/EUR… |
| `fiat_moneda` | `TEXT` | Moneda fiat | default `'usd'` |
| `stripe_session` | `TEXT` | Id de la Checkout Session | Lo busca el webhook |
| `stripe_payment` | `TEXT` | PaymentIntent (cuando confirma) | — |
| `estado` | `TEXT` | Estado del pago | default `'PENDIENTE'` — `PENDIENTE` / `PAGADO` / `FALLIDO`; índice `ix_movimientos_brlt_wallet(wallet, estado)` |
| `created_at` | `TIMESTAMPTZ` | Fecha | default `now()` |
| `confirmado_at` | `TIMESTAMPTZ` | Cuándo se confirmó (PAGADO) | Se acredita BRLT vía `moverSaldo` |

> Acceso (roles VALOR, `backend/api/routes/valor.js`): BRLT (4.3) y criptos (4.1) solo para
> `EMPRESA` / `SOCIO` / `OWNER`; retiros fiat documentados vía Stripe Payouts.

### 2.16 `auditoria`, `indexador_checkpoint`, `sesiones` — operación y sesión

**`auditoria`** (append-only, RF-18.6) — **escritor: indexador** (`schema.sql:326-338`):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | PK | — |
| `entidad` | `TEXT` | Contrato de origen | `NOT NULL` |
| `evento` | `TEXT` | Nombre del evento | `NOT NULL` |
| `actor` | `CHAR(42)` | Dirección emisora | — |
| `tx_hash` | `CHAR(66)` | Hash de la tx | `NOT NULL` |
| `bloque` | `BIGINT` | Bloque | `NOT NULL` |
| `log_index` | `INT` | Índice del log | `NOT NULL` |
| `payload` | `JSONB` | Args serializados | — |
| `procesado` / `procesado_at` | `BOOLEAN` / `TIMESTAMPTZ` | Marca de procesamiento | default `FALSE` |
| `UNIQUE (tx_hash, log_index, entidad)` | — | **Idempotencia del indexador** | (H-16, RNF-07.4) |

**`indexador_checkpoint`** — **escritor: indexador** (`schema.sql:341-346`):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `contrato` | `TEXT` | Contrato | **PK** (un checkpoint por contrato) |
| `ultimo_bloque` | `BIGINT` | Último bloque barrido | default `0` |
| `ultimo_log_index` | `INT` | Último log index | default `0` |
| `updated_at` | `TIMESTAMPTZ` | Fecha | default `now()` |

**`sesiones`** — token de sesión del login con wallet (RF-16) — **escritor: backend**
(`guardarSesion` en `almacen-pg.js:984-999`; sobrevive entre instancias de Cloud Run):

| Campo | Tipo | Descripción | Referencias / restricciones |
|---|---|---|---|
| `token` | `TEXT` | Token de sesión (firma EIP-191) | **PK** |
| `wallet` | `CHAR(42)` | Wallet del usuario | FK → `usuarios(wallet)`; índice `idx_sesiones_wallet` |
| `created_at` | `TIMESTAMPTZ` | Creación | default `now()` |
| `expires_at` | `TIMESTAMPTZ` | Expiración | default `now() + 24 h` |

### 2.17 Entidades de diseño aún SIN tabla SQL

- **`encargos`** (RF-04.3/CU-07): pedido de artículo fuera del mercado. Sigue siendo una entidad del
  backend **solo en memoria** (`almacen.js`, `POST /catalog/encargos`); **no existe tabla SQL**
  (no aparece en `schema.sql` ni en las migraciones).
- **`marcadorOnChain`** de `valoraciones` (ambas partes valoraron): sin columna (ver §2.7).
- **`emisionesRegistradas[]`** de BRLT (D32): lógica on-chain del contrato; en SQL solo el saldo
  agregado `finanzas.brlt`.
- **Guardianes D34** (`guardianes[]`, umbral 2/3, timelock 48 h): viven solo on-chain en
  `SmartAccount`; sin representación SQL.

## 3. Reglas de datos destacadas

- `distanciaPuntoEncuentro` ≤ 10 km entre partes (PostGIS, off-chain).
- Ventanas de apertura: ≤ 10 min de la hora pautada y ≤ 10 min de diferencia entre aperturas.
- Límites por nivel: Iniciado (5 rubros, 3% del rubro, sin lugar de encuentro), Común (20 rubros, 50 artículos), Particular (5 artículos; el nivel manda sobre el tipo).
- Valoración **obligatoria** para cerrar un trueque (5 renglones); **desde 2026-09-09 se persiste en
  `valoraciones`** vía `POST /truekes/:id/valoracion` (antes solo memoria) y alimenta la sección VALOR 4.2.
- **Cierre del trueke (2026-09):** ambos `cierre_a/b = CONFORME` + valoraciones → `COMPLETADO`;
  cualquier `NO_CONFORME` → nace la disputa (`REPORTADA`) y el trueke pasa a `EN_DISPUTA`.
- Medalla Oro = +1000 intercambios efectivos y 90% efectivos (requisito Empresa).
- **Verificación obligatoria para completar un trueque**: escalera Inscrito → Verificado (códigos correo+teléfono) → Certificado (KYC documento+selfie) — D28.
- Anulación del escrow: quórum de Socios ≥2/3, plazo máximo 5 días desde la solicitud; **sin quórum al vencer el plazo → ANULADO por defecto y NFTs devueltos a ambas partes** (D26).
- **Disputas v2 (2026-09-08):** `REPORTADA` (reclamo con motivo + fotos) → `ESPERA_JUSTIFICATIVO`
  (el conforme carga justificativo con evidencias, plazo **3 días** → `justificativo_vence_at`) →
  `EN_VOTACION` (votan todos los Socios del padrón salvo las partes A/B, 1 voto c/u) → `RESUELTA`.
  Veredicto por **mayoría simple** de votantes: `ANULAR` (devolución total, trueke ANULADO) o `VALIDO`
  (trueke COMPLETADO, liberación en cruz); **sin votos en 5 días** (`votacion_vence_at`) → ANULA por
  defecto. Restricciones: `votos_disputa UNIQUE(disputa_id, socio)`; `voto` ∈ {ANULAR, VALIDO}.
- **Notificaciones:** cada transición de disputa emite notificación in-app a los involucrados
  (`DISPUTA_REPORTADA`, `PEDIDO_JUSTIFICATIVO`, `VOTACION_ABIERTA`, `VEREDICTO`).
- Subastas: gana el **mayor valor ofrecido**; empate → mayor nivel (D27).
- Cancelación: unilateral y sin penalización **solo antes de la custodia**; después, solo anulación con quórum (D31, RF-05.3).
- Relayer: **límite 20 meta-tx/usuario/día**; 3 fallos en 10 min → bloqueo 1 h (D29).
- **Gobernanza (D21)**: resoluciones de disputas y admisión de Socios con quórum 2/3 y un voto por Socio; sanciones ejecutadas on-chain con timelock 6h.
- **Imágenes (D23)**: raíz merkle de certificaciones anclada on-chain en el escrow; IPFS con pinning propio.
- `hashSha256 + firmaEcdsa` obligatorios para imágenes (inmutabilidad) — **salvo imágenes KYC 2026-09** (firma opcional).
- **VALOR (2026-09-09):** criptos y BRLT se mueven **solo contra la plataforma** (`contraparte` en
  `movimientos_valor`); sin P2P de cripto entre socios. Compra BRLT por fiat vía **Stripe Checkout
  alojado** (sin pasarela propia) + webhook; retiro a fiat vía Stripe Payouts (documentado). Solo
  `EMPRESA`/`SOCIO`/`OWNER`. `PENDIENTE` → `PAGADO` (acredita BRLT) o `FALLIDO`.
- **OWNER:** no es un tipo de usuario en BD — se resuelve on-chain con `owner()` del `SociosRegistry`
  (fallback: env `OWNER_WALLET`; `rol:'OWNER'` solo en almacenes de prueba).

## 4. Trazabilidad de cambios (2026-09-02 → 2026-09-09)

Cambios incorporados a este diccionario desde la revisión anterior, todos verificados contra el código:

| Fecha | Cambio | Evidencia |
|---|---|---|
| 2026-09-08 | Flujo de disputas v2: estados `REPORTADA`/`ESPERA_JUSTIFICATIVO`/`EN_VOTACION`/`RESUELTA` (legado `ABIERTA` → `REPORTADA`); columnas `justificativo_vence_at`, `votacion_vence_at`, `veredicto` (ANULAR/VALIDO), `resuelta_en` | `backend/db/migracion_disputas_v2.sql` |
| 2026-09-08 | Tablas nuevas `evidencias_disputa`, `votos_disputa` (UNIQUE disputa_id+socio), `notificaciones` | `backend/db/migracion_disputas_v2.sql:31-64` |
| 2026-09 | Trueque abierto-publicado: enum `estado_escrow` + `PROPUESTO` (off-chain); `truekes.usuario_b` nullable; columnas `descripcion_requerida`, `tipo_requerido`, `cierre_a/b` (CONFORME/NO_CONFORME), `encuentro_propuesto_por`, `encuentro_estado`, `punto_encuentro_id`, `hora_pautada`; `articulos.categoria` + `usado_el`; tabla `puntos_favoritos`; `imagenes_certificadas.contenido/mime` | `backend/db/migracion_trueke_abierto.sql` |
| 2026-09 | Certificación SBT + imágenes KYC: `tipo_imagen` + `KYC_DNI`/`KYC_SELFIE`; `kyc.via_sbt/sbt_contrato/sbt_token_id/documento_img_id/selfie_img_id`; `firma_ecdsa` opcional | `backend/db/migracion_sbt.sql` |
| 2026-09 | `usuarios.username` (handle `@username`) con índice único parcial | `backend/db/migracion_username.sql` |
| 2026-09-09 | Sección VALOR: tablas nuevas `movimientos_valor` y `movimientos_brlt` (Stripe); `valoraciones` pasa de solo memoria a **persistida** por `POST /truekes/:id/valoracion`; rol OWNER **on-chain** (`owner()` de `SociosRegistry`), sin columna nueva en `usuarios` | `backend/db/migracion_valor.sql` · `backend/api/lib/almacen-pg.js:535-648` · `backend/api/lib/es-owner.js` |

**Totales al 2026-09-09:** **21 tablas** (19 de `schema.sql` + `movimientos_valor`/`movimientos_brlt`
de `migracion_valor.sql`) y **11 tipos ENUM**.
