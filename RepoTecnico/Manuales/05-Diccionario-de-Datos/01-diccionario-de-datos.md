# Manual Técnico 05 — Diccionario de Datos (modelo PostgreSQL off-chain)

> **Alcance**: diccionario de datos del esquema PostgreSQL real de TrueKeate (21 tablas, 11 tipos ENUM), su relación con las decisiones D17/D23/D26/D28/D32/D33/D34 y los eventos on-chain que alimentan cada tabla. **Revisión 2026-09**: `username` en `usuarios`, columnas SBT/imágenes en `kyc`, enum `tipo_imagen` con `KYC_DNI`/`KYC_SELFIE` y `contenido`/`mime` en `imagenes_certificadas` (certificación D28 etapa 2).
> **Fuentes leídas**: `backend/db/schema.sql` (esquema real, 377 líneas), `backend/db/migracion_sbt.sql`, `backend/db/migracion_username.sql`, `backend/db/migracion_disputas_v2.sql`, `backend/db/migracion_valor.sql`, `RepoTecnico/diccionario_datos.md` (inventario de diseño), `backend/indexador.js` (eventos mapeados a tablas), eventos declarados en `sc/src/*.sol`.
> **Convención**: toda referencia `ruta:línea` apunta al código real. Lo que el código no implementa se marca **"pendiente de confirmar"** (por ejemplo, entidades del diccionario de diseño que aún no tienen tabla SQL o anclajes on-chain no materializados).
>
> 🔄 **Revisión 2026-09-08/09 (ciclos del director)**: esquema ampliado a **21 tablas** — nuevas
> `evidencias_disputa`, `votos_disputa` y `notificaciones` (flujo de disputas v2,
> `schema.sql:220-251` + `migracion_disputas_v2.sql`), y `movimientos_valor`/`movimientos_brlt`
> (sección VALOR, `backend/db/migracion_valor.sql:23-48`); `truekes` gana `encuentro_*`/`cierre_*`;
> `disputas` gana `justificativo_vence_at`, `votacion_vence_at`, `veredicto`, `resuelta_en`; y la
> tabla `valoraciones` (ya existente) ahora **sí se escribe** desde `POST /truekes/:id/valoracion`.

---

## 1. Panorama del modelo de datos

### 1.1 Tres clases de tablas (patrón RNF-01.1/RNF-03.2)

El esquema distingue explícitamente quién puede escribir cada tabla (cabecera en `backend/db/schema.sql:1-7`):

| Clase | Tablas | Quién escribe | Fuente de verdad |
|---|---|---|---|
| **Espejo del estado on-chain** | `truekes`, columnas de `kyc`/`usuarios`/`finanzas`/`suscripciones` sincronizadas | **Solo el indexador** (RNF-01.1); ⚠️ el flujo de cierre/disputa 2026-09 también actualiza `truekes.estado` desde la API (ver §2.1) | Blockchain (eventos) |
| **Off-chain de negocio** | `articulos`, `valoraciones`, `puntos_encuentro`, `puntos_favoritos`, `disputas`, `evidencias_disputa`, `votos_disputa`, `notificaciones`, `imagenes_certificadas`, `campanas`, `subastas` | El backend (API REST) | Backend + evidencias off-chain |
| **Finanzas del socio (VALOR, off-chain)** | `finanzas` (saldos), `movimientos_valor`, `movimientos_brlt` | El backend (rutas `/valor`) | Backend + Stripe (webhook) |
| **Operación del indexador** | `auditoria`, `indexador_checkpoint` | El indexador | Registro de eventos procesados |

- La blockchain es la única fuente de verdad de los estados del escrow; el indexador **nunca escribe en cadena** (`backend/indexador.js:7-8`).
- Extensiones habilitadas: `postgis` y `pgcrypto` (`backend/db/schema.sql:9-10`); PostGIS sostiene la regla de ≤10 km (RF-08.3/08.4) y `pgcrypto` el cifrado de PII (D17).

### 1.2 Inventario: 21 tablas

| # | Tabla | Línea | Clase | Propósito |
|---|---|---|---|---|
| 1 | `usuarios` | `schema.sql:70-88` | Espejo parcial + off-chain | Registro e identidad (CU-01/02); `username` público |
| 2 | `kyc` | `schema.sql:92-108` | Espejo parcial (merkle) + off-chain | Metadata KYC; certificación SBT e imágenes (2026-09) |
| 3 | `articulos` | `schema.sql:111-125` | Off-chain | Publicaciones AtoA (CU-06) |
| 4 | `truekes` | `schema.sql:130-151` | **Espejo del escrow** | Intercambios y su estado (RNF-01.1); ofertas + encuentro + cierres |
| 5 | `valoraciones` | `schema.sql:154-166` | Off-chain | Evaluación 1-5 al cierre (D18/D36); persistida desde 2026-09-09 |
| 6 | `puntos_encuentro` | `schema.sql:169-177` | Off-chain (PostGIS) | Zonas de encuentro ≤10 km (CU-16) |
| 7 | `puntos_favoritos` | `schema.sql:182-189` | Off-chain | Últimos puntos usados (favoritos) |
| 8 | `disputas` | `schema.sql:201-217` | Off-chain + espejo de votos | Disputas v2 (flujo del director, 2026-09-08) |
| 9 | `evidencias_disputa` | `schema.sql:220-228` | Off-chain | **Nueva (2026-09-08)**: fotos de cada parte (RECLAMO/JUSTIFICATIVO) |
| 10 | `votos_disputa` | `schema.sql:231-238` | Off-chain | **Nueva (2026-09-08)**: votos ANULAR/VALIDO de los Socios |
| 11 | `notificaciones` | `schema.sql:241-251` | Off-chain | **Nueva (2026-09-08)**: campana in-app por wallet |
| 12 | `imagenes_certificadas` | `schema.sql:254-267` | Off-chain (evidencia) | Imágenes certificadas + KYC (RF-11, D23) |
| 13 | `suscripciones` | `schema.sql:270-280` | Espejo parcial | Suscripciones de empresa (CU-24, D33) |
| 14 | `campanas` | `schema.sql:283-293` | Off-chain | Campañas VENTA/RECOLECTA (CU-09/10) |
| 15 | `subastas` | `schema.sql:296-311` | Off-chain | Subastas de empresa (RF-17, CU-25/26) |
| 16 | `finanzas` | `schema.sql:314-323` | Espejo parcial | Saldos del socio (criptos/BRLT) y fondo global (CU-30/31) |
| 17 | `auditoria` | `schema.sql:326-338` | Operación (append-only) | Registro auditable + idempotencia (RF-18.6) |
| 18 | `indexador_checkpoint` | `schema.sql:341-346` | Operación | Checkpoints de reproceso (RNF-07.4) |
| 19 | `sesiones` | `schema.sql:350-356` | Off-chain | Tokens de sesión del login con wallet (RF-16) |
| 20 | `movimientos_valor` | `migracion_valor.sql:23-34` | Finanzas VALOR | **Nueva (2026-09-09)**: auditoría append-only de cripto/BRLT |
| 21 | `movimientos_brlt` | `migracion_valor.sql:37-48` | Finanzas VALOR | **Nueva (2026-09-09)**: pagos BRLT por fiat (Stripe Checkout) |

> Las tablas 8-11 existen tanto en `schema.sql` (base) como en `migracion_disputas_v2.sql` (aplicable
> a BDs ya creadas); las 20-21 viven en `backend/db/migracion_valor.sql` (no en `schema.sql`).

### 1.3 Entidades de diseño aún NO materializadas (pendiente de confirmar)

El inventario de diseño (`RepoTecnico/diccionario_datos.md`) lista entidades que **no tienen tabla en el esquema SQL actual**:

- **`encargos`** (RF-04.3/CU-07): pedido de artículo fuera del mercado — solo descrita en `RepoTecnico/diccionario_datos.md:33`.
- **`marcadorOnChain`** en valoraciones: el requisito de "ambas partes valoraron" existe como eventos `ValoracionMarcadaA/B` en `sc/src/Escrow.sol:100-101`, pero el esquema de `valoraciones` no materializa el marcador (solo los 5 renglones, `backend/db/schema.sql:159-163`).
- **`emisionesRegistradas`** de BRLT (D32): existe como campo de diseño on-chain (`RepoTecnico/diccionario_datos.md:22`); en SQL solo hay saldo agregado `finanzas.brlt`.
- **Guardianes D34** (`guardianes[]`, umbral 2/3, timelock 48 h): viven **solo on-chain** en `SmartAccount` (`sc/src/SmartAccount.sol:59-65`) y no tienen representación SQL en este esquema.

---

## 2. Tipos ENUM

### 2.1 Enum canónico de 9 estados del escrow

Definición SQL: `estado_escrow` en `backend/db/schema.sql:34-36` (SQL antepone `PROPUESTO`, off-chain); definición Solidity espejo: `enum Estado` en `sc/src/Escrow.sol:39-49` (9 estados; orden idéntico al SQL excluyendo `PROPUESTO`).

| Valor SQL/Solidity | Línea SQL | Línea Solidity | Significado | ¿Quién lo escribe en `truekes`? |
|---|---|---|---|---|
| `CREADO` | 35 | 40 | Acuerdo registrado, sin activos custodiados | Indexador (evento `TruekeCreado`, `backend/indexador.js:70-78`) |
| `ACTIVO` | 35 | 41 | Sinónimo de CREADO para compatibilidad de lectura | **Pendiente de confirmar** (no hay evento que lo escriba en este ciclo) |
| `CUSTODIADO` | 35 | 42 | Al menos un activo custodiado | Indexador (`CustodiaA`/`CustodiaB` → `CUSTODIADO`, mapa en `backend/indexador.js:80`; UPDATE en 86-92) |
| `APERTURA` | 35 | 43 | Ambas partes abrieron en sus ventanas | Indexador (`AperturaA`/`AperturaB`, mapa en `backend/indexador.js:81`; timestamps en 93-101) |
| `EN_DISPUTA` | 35 | 44 | Solicitud de anulación en curso (C8) | **Pendiente de confirmar** (C8) |
| `RESOLUCION_SOCIOS` | 36 | 45 | Votación de Socios (C8) | **Pendiente de confirmar** (C8) |
| `COMPLETADO` | 36 | 46 | Firmas duales + valoraciones, activos liberados | Indexador (`TruekeCompletado`, mapa en `backend/indexador.js:82`) |
| `ANULADO` | 36 | 47 | Anulación con quórum o por defecto | Indexador (`TruekeCancelado`, mapa en `backend/indexador.js:83`; D26: el *por defecto* es lógica on-chain, evento `ResolucionPorDefecto` en `sc/src/Escrow.sol:108` no mapeado aún) |
| `BLOQUEADO` | 36 | 48 | Violación de norma (C8) | Indexador (`EscrowBloqueado`, mapa en `backend/indexador.js:84`) |

Nota operativa: el mapa de eventos del indexador actual (`backend/indexador.js:79-85`) solo escribe 6 de los 9 valores (`CREADO`, `CUSTODIADO`, `APERTURA`, `COMPLETADO`, `ANULADO`, `BLOQUEADO`). Desde el **flujo afinado 2026-09-08/09**, los estados `EN_DISPUTA`, `RESOLUCION_SOCIOS` (y también `COMPLETADO`/`ANULADO` por veredicto) los escribe **la API** sobre el espejo al cerrar/disputar trueques del flujo abierto-acordado (`backend/api/routes/truekes.js:355-439`, `backend/api/lib/flujo-disputas.js:74-147`; `PROPUESTO` es 100 % off-chain, ofertas del Mercado). La sincronización on-chain de esos estados con el `Escrow` sigue **pendiente de confirmar**.

### 2.2 Escalera D28 (`estado_verificacion`)

- SQL: `estado_verificacion AS ENUM ('INSCRITO','VERIFICADO','CERTIFICADO')` — `backend/db/schema.sql:27` (comentario "Escalera de verificación (D28)").
- Solidity espejo: `enum EstadoVerificacion { INSCRITO, VERIFICADO, CERTIFICADO }` — `sc/src/SmartAccount.sol:29`.
- La columna `usuarios.estado` usa este enum con default `'INSCRITO'` (`backend/db/schema.sql:72`).
- Decisión D28 (`RepoTecnico/requerimientos.md:388`): INSCRITO = billetera + inscripción (ve ofertas, no completa trueques — RF-14.3); VERIFICADO = códigos de correo y teléfono (crea/completa trueques, máx. 3 activos — RF-14.4); CERTIFICADO = KYC completo documento + selfie (todas las operaciones y subastas — RF-14.5).
- Certificación criptográfica: el Smart Account guarda `kycMerkleRoot` (`sc/src/SmartAccount.sol:51`) y emite `MerkleRootActualizado(root, estado)` (`sc/src/SmartAccount.sol:61,150-151`); el indexador copia la raíz a `kyc.merkle_root` (`backend/indexador.js:107-113`). Así la escalera se certifica on-chain **sin revelar la identidad real** (RNF-01.3/01.4).

### 2.3 Resto de ENUMs

| ENUM | Valores | Línea | Uso en tabla |
|---|---|---|---|
| `tipo_usuario` | `PARTICULAR` / `EMPRESA` / `SOCIO` | 14 | `usuarios.tipo` (rol funcional; `SOCIO` lo fija el indexador con `SocioAdmitido`) |
| `nivel_usuario` | `INICIADO` / `COMUN` / `FRECUENTE` / `SOCIO` | 18 | `usuarios.nivel` (nivel por reputación, D12/D30); `subastas.nivel_ganador` (desempate D27) |
| `medalla_usuario` | `BRONCE` / `PLATA` / `ORO` | 22 | `usuarios.medalla` |
| `estado_verificacion` | `INSCRITO` / `VERIFICADO` / `CERTIFICADO` | 27 | `usuarios.estado` (escalera D28 — §2.2) |
| `estado_escrow` | 9 estados | 34 | `truekes.estado` (— §2.1) |
| `categoria_item` | `ARTICULO` / `SERVICIO` / `BIEN` / `CRIPTO` | 42 | `articulos.categoria` (tipo de trueque) |
| `estado_kyc` | `PENDIENTE` / `APROBADO` / `RECHAZADO` / `APELACION` | 46 | `kyc.estado` |
| `tipo_imagen` | `PUBLICACION` / `RECEPCION` / `KYC_DNI` / `KYC_SELFIE` | 50 | `imagenes_certificadas.tipo` (polimorfismo de `ref_id`) |
| `estado_suscripcion` | `ACTIVA` / `IRREGULAR` / `CANCELADA` | 54 | `suscripciones.estado` (D33) |
| `tipo_campana` | `VENTA` / `RECOLECTA` | 58 | `campanas.tipo` |
| `estado_subasta` | `ABIERTA` / `CERRADA` / `ANULADA` | 62 | `subastas.estado` |

> ⚠️ `nivel_usuario` y `tipo_usuario` comparten el valor `SOCIO` con significados distintos: `tipo='SOCIO'` es rol de gobernanza (votación D21); `nivel='SOCIO'` es el nivel superior de reputación (mapeo D4).

> **Nuevo (2026-09, certificación D28 etapa 2)**: el enum `tipo_imagen` incorpora **`KYC_DNI`** y
> **`KYC_SELFIE`** (aplicado por `backend/db/migracion_sbt.sql:6-11`). Para esos tipos, `ref_id`
> apunta al **`kyc.id`** de la solicitud (ver §3.2 y §4.3).

---

## 3. Identidad: `usuarios` y `kyc`

### 3.1 `usuarios` — registro e identidad (`backend/db/schema.sql:70-88`)

**Propósito**: cuenta raíz de cada usuario (CU-01/02); una fila por wallet.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación con decisiones y eventos |
|---|---|---|---|
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | **PK** | Identificador interno; referenciado por 7 tablas |
| `wallet` | `CHAR(42)` | `UNIQUE NOT NULL` | Dirección EOAs/Smart Account; es la clave natural on-chain |
| `username` | `TEXT UNIQUE` | Handle público | **Nuevo (2026-09)** (`backend/db/migracion_username.sql:6-12`): el menú muestra `@username` en vez de la wallet; la migración lo deriva del correo o `u_<wallet>`; lo expone la API (`backend/api/lib/almacen-pg.js:23`, `web/lib/api.ts:14`) |
| `correo`, `telefono`, `direccion_inscripcion` | `TEXT` | **PII†** (cifrado en reposo) | **D17** (`backend/db/schema.sql:74-76`; RNF-01.4 en `RepoTecnico/requerimientos.md:214`) |
| `geog` | `GEOGRAPHY(Point,4326)` | — (PostGIS) | Regla ≤10 km entre direcciones de inscripción (RF-08.3/08.4) |
| `tipo` | `tipo_usuario` | default `PARTICULAR` | Actualizado a `SOCIO` por el indexador: `SociosRegistry.SocioAdmitido` → `UPDATE usuarios SET tipo='SOCIO'` (`backend/indexador.js:126-135`) |
| `nivel` | `nivel_usuario` | default `INICIADO` | Nivel de reputación (D12/D30); recálculo mensual |
| `medalla` | `medalla_usuario` | default `BRONCE` | Requisito Empresa: medalla ORO |
| `estado` | `estado_verificacion` | default `INSCRITO` | **D28** (escalera, §2.2) |
| `smart_account` | `CHAR(42)` | — | Dirección del Smart Account (D35); el indexador la usa para localizar al usuario ante eventos del contrato (`backend/indexador.js:110-119`) |
| `consentimiento_gdpr` / `consentimiento_fecha` | `BOOLEAN` / `TIMESTAMPTZ` | default `FALSE` | **D17** GDPR: consentimiento explícito al registro (RNF-01.7, `RepoTecnico/requerimientos.md:217`) |
| `actividad_ultima` | `TIMESTAMPTZ` | — | Retención/borrado a los 24 meses de inactividad (D17) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | Auditoría temporal |

**Eventos on-chain que la modifican** (vía indexador): `SmartAccount.OwnerActualizado` y `SmartAccount.RecuperacionEjecutada` actualizan `wallet` (recuperación social D34): `UPDATE usuarios SET wallet=$1 WHERE smart_account=$2` (`backend/indexador.js:115-121`). Consecuencia de diseño: `wallet` refleja al *owner actual* del Smart Account; por eso las tablas espejo (`truekes`, `valoraciones`, `disputas`) guardan la dirección **de forma denormalizada** (ver Manual 06 §3).

### 3.2 `kyc` — metadata KYC + certificación SBT (`backend/db/schema.sql:92-108`)

**Propósito**: almacenar la metadata del proceso KYC (RF-01.7) **cifrada en reposo**; solo una raíz merkle (hash) viaja al Smart Account. Desde 2026-09 también guarda la **certificación vía SBT** y las **imágenes** (DNI/selfie) cuando no hay SBT (etapa 2 de D28 — ver Manual 03 · 09-certificacion-sbt).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación con decisiones y eventos |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `usuario_id` | `BIGINT` | **FK → `usuarios(id)`** (`schema.sql:94`) | 1 registro KYC por usuario (relación 1:1 lógica; el esquema no impone `UNIQUE`) |
| `documento_identidad` | `BYTEA` | **PII† cifrado** | **D17** (RNF-01.4); legado — el flujo 2026-09 guarda la imagen en `imagenes_certificadas` |
| `selfie_ref` / `selfie_hash` | `TEXT` / `BYTEA` | **PII†** | **D17**; legado del diseño original |
| `merkle_root` | `BYTEA` | Espejo on-chain | **D28/RF-01.7**: actualizado por el indexador al recibir `SmartAccount.MerkleRootActualizado` (`backend/indexador.js:106-114`; evento en `sc/src/SmartAccount.sol:61`) |
| `estado` | `estado_kyc` | default `PENDIENTE` | Flujo PENDIENTE→APROBADO/RECHAZADO/APELACION; **APROBADO automático** vía SBT (`/kyc/auto-certificar`) |
| `revisado_por` | `CHAR(42)` | Owner (RF-18.4) o minter | Revisión humana del Owner (`/kyc/review`) o la cuenta de la plataforma en auto-certificación (`routes/kyc.js:175-177`) |
| `via_sbt` | `BOOLEAN NOT NULL DEFAULT FALSE` | — | **Nuevo (2026-09)** (`schema.sql:101`; `migracion_sbt.sql:14`): certificado con SBT |
| `sbt_contrato` | `CHAR(42)` | — | Contrato del SBT usado (nativo `TrueKeateSBT` o externo) (`schema.sql:102`) |
| `sbt_token_id` | `NUMERIC` | — | tokenId del SBT usado/minteado (`schema.sql:103`) |
| `documento_img_id` | `BIGINT` | FK lógica → `imagenes_certificadas(id)` (`schema.sql:104`) | Imagen `KYC_DNI` subida por `/kyc/submit` |
| `selfie_img_id` | `BIGINT` | FK lógica → `imagenes_certificadas(id)` (`schema.sql:105`) | Imagen `KYC_SELFIE` subida por `/kyc/submit` |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | |

---

## 4. Catálogo e intercambio: `articulos`, `truekes`, `imagenes_certificadas`

### 4.1 `articulos` — publicaciones AtoA (`backend/db/schema.sql:111-125`)

**Propósito**: catálogo de ofertas de trueque (CU-06), incluye NFTs y criptos declarados.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | Referenciado por `truekes.articulo_a_id/b_id` y `subastas.articulo_id` |
| `usuario_id` | `BIGINT` | **FK → `usuarios(id)`** (`schema.sql:113`) | Dueño/publicador |
| `titulo` | `TEXT NOT NULL` | — | |
| `rubro` | `TEXT NOT NULL` | índice `idx_articulos_rubro` (`schema.sql:365`) | Búsqueda por rubro (límites por nivel RF-01.2b) |
| `imagen_certificacion_id` | `BIGINT` | FK lógica **1—1 → `imagenes_certificadas(id)`** (**sin constraint real**) | **D23** (`schema.sql:118`) |
| `nft_token_id` | `NUMERIC` | — | Token on-chain si el artículo es NFT |
| `disponible` | `BOOLEAN` | default `TRUE` | Disponibilidad para trueque |
| `alta_disponibilidad` | `BOOLEAN` | default `FALSE`, **computado** | D19 (`schema.sql:122`) |

### 4.2 `truekes` — espejo del estado on-chain del escrow + flujo abierto (`backend/db/schema.sql:130-151`)

**Propósito**: tabla espejo del contrato `Escrow` (RNF-01.1; comentario `schema.sql:127-129`).
Desde 2026-09 el estado `PROPUESTO` (oferta abierta del Mercado) vive **solo off-chain** y la API
escribe también estados de cierre/disputa en el espejo (ver §2.1 y Manual 06 §5/§13).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Quién lo escribe |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | — |
| `escrow_id` | `NUMERIC UNIQUE NOT NULL` | Id on-chain del escrow (sintético **negativo** para ofertas) | `Escrow.TruekeCreado` / `crearOferta` de la API; `ON CONFLICT (escrow_id) DO UPDATE` (idempotencia) |
| `articulo_a_id` / `articulo_b_id` | `BIGINT` | **FK → `articulos(id)`** (`schema.sql:133-134`) | Oferta de cada parte; `articulo_b_id` NULL en `PROPUESTO` |
| `usuario_a` / `usuario_b` | `CHAR(42) NOT NULL` | Direcciones on-chain (sin FK; ver Manual 06 §3); `usuario_b` NULL en `PROPUESTO` | `TruekeCreado`/`acordarOferta` |
| `estado` | `estado_escrow` | default `'PROPUESTO'` (`schema.sql:137`) | Indexador (eventos) + API (cierres/disputas 2026-09, §2.1) |
| `descripcion_requerida` | `TEXT` | Qué quiere recibir A (oferta abierta, punto 2) (`schema.sql:138`) | API (`POST /truekes/ofertas`) |
| `tipo_requerido` | `categoria_item` | Tipo de ítem que A desea recibir (punto 4) (`schema.sql:139`) | API |
| `hora_pautada` | `TIMESTAMPTZ` | — | Acuerdo/propuesta de encuentro |
| `apertura_a` / `apertura_b` | `TIMESTAMPTZ` | — | `AperturaA`/`AperturaB` → `to_timestamp(ts)` (indexador) |
| `punto_encuentro_id` | `BIGINT` | FK lógica → `puntos_encuentro(id)` (**sin constraint real**) (`schema.sql:143`) | API (`propuesta-encuentro`) |
| `encuentro_propuesto_por` | `CHAR(42)` | Quién propuso el encuentro (puntos 6/7 del director) (`schema.sql:144`) | API (`POST /truekes/:id/propuesta-encuentro`) |
| `encuentro_estado` | `TEXT` | `'PROPUESTO'`/`'ACEPTADO'`/`'RECHAZADO'` (`schema.sql:145`) | API (rutas de encuentro) |
| `cierre_a` / `cierre_b` | `TEXT` | `'CONFORME'`/`'NO_CONFORME'` (punto 9) (`schema.sql:146-147`) | API (`POST /truekes/:id/cierre`, `registrarCierre`) |
| `tx_hash` | `CHAR(66)` | — | Hash de la tx de creación |
| `bloque` | `BIGINT` | — | Bloque de creación |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | Cada `UPDATE` de estado |

**Mapeo evento → columna (resumen)** (`backend/indexador.js:69-103`):

| Evento `Escrow` | Línea .sol | Efecto SQL | Línea indexador |
|---|---|---|---|
| `TruekeCreado` | 93 | INSERT `truekes` (estado `CREADO`) | 70-78 |
| `CustodiaA` / `CustodiaB` | 94-95 | estado = `CUSTODIADO` | 80 (UPDATE 86-92) |
| `AperturaA` / `AperturaB` | 96-97 | estado = `APERTURA` + `apertura_a/b` | 81, 93-101 |
| `TruekeCompletado` | 102 | estado = `COMPLETADO` | 82 |
| `TruekeCancelado` | 103 | estado = `ANULADO` | 83 |
| `EscrowBloqueado` | 104 | estado = `BLOQUEADO` | 84 |
| `RecepcionFirmadaA/B`, `ValoracionMarcadaA/B`, `AnulacionSolicitada`, `VotoSocio`, `ResolucionEjecutada`, `ResolucionPorDefecto`, `SancionProgramada` | 98-109 | **No mapeados en este ciclo** (C8) | — |

> Escritores adicionales de la API (2026-09-09): `crearOferta`, `acordarOferta`,
> `actualizarTrueke` (encuentro/cierre/estado) y `registrarCierre` (`backend/api/lib/almacen-pg.js`
> — ver Manual 06 §5).

### 4.3 `imagenes_certificadas` — evidencia de imágenes (RF-11, D23; KYC 2026-09) (`backend/db/schema.sql:254-267`)

**Propósito**: evidencia inmutable de la imagen que certifica una publicación (`PUBLICACION`), una recepción (`RECEPCION`) o un **KYC** (`KYC_DNI`/`KYC_SELFIE`, 2026-09); hash + firma + referencia IPFS, y desde 2026-09 **binario + MIME** para servirlas por la API.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `tipo` | `tipo_imagen` | `PUBLICACION`/`RECEPCION`/`KYC_DNI`/`KYC_SELFIE` (`schema.sql:256`) | Determina la semántica de `ref_id` |
| `ref_id` | `BIGINT NOT NULL` | **FK lógica polimórfica**: `articulos.id` si `PUBLICACION`; `truekes.id` si `RECEPCION`; **`kyc.id` si `KYC_DNI`/`KYC_SELFIE`** (**sin constraint real**) | Relaciona con la entidad certificada |
| `hash_sha256` | `BYTEA NOT NULL` | — | Integridad (RF-11.2); lo calcula `guardarImagen` (`backend/api/lib/almacen-pg.js:189`) |
| `ipfs_cid` | `TEXT` | — | Almacenamiento IPFS con pinning propio (D23/RT-02.6) |
| `wallet` | `CHAR(42) NOT NULL` | — | Autor de la certificación (para KYC, la wallet del solicitante) |
| `firma_ecdsa` | `BYTEA` | **Opcional desde 2026-09** (`schema.sql:261`; `migracion_sbt.sql:22`) | Las imágenes KYC las guarda la plataforma **sin firma** del usuario |
| `metadata` | `JSONB` | — | Datos auxiliares |
| `root_merkle_anclada` | `BYTEA` | Raíz merkle **anclada on-chain** | **D23** (`schema.sql:263`): el diseño prevé anclar la raíz en el contrato escrow (RT-02.7, `RepoTecnico/requerimientos.md:285`), pero **los contratos de este ciclo no declaran ese anclaje** (no existe `rootMerkle`/evento de imágenes en `sc/src/Escrow.sol`) → **pendiente de confirmar**. |
| `contenido` | `BYTEA` | — | **Nuevo (2026-09)** (`schema.sql:264`): binario de la imagen (KYC y artículos) |
| `mime` | `TEXT` | — | **Nuevo (2026-09)** (`schema.sql:265`): `image/jpeg`, `image/png`, `image/webp`… |

**Escritores reales (backend, no el indexador)**: `guardarImagen` (`almacen-pg.js:188-197`) para KYC
(`POST /kyc/submit`, tipos `KYC_DNI`/`KYC_SELFIE` con `ref_id = kyc.id`) y `guardarImagenArticulo`
(`almacen-pg.js:299-304`) para artículos (`PUBLICACION`); `getImagen` (`almacen-pg.js:317-324`) las
sirve vía `GET /kyc/imagen/:id` (dueño u Owner). Confirmado: **no la escribe el indexador**.

---

## 5. Confianza y resolución: `valoraciones`, `disputas` v2 (evidencias/votos) y `notificaciones`

### 5.1 `valoraciones` — evaluación al cierre (D18/D36) (`backend/db/schema.sql:154-166`)

**Propósito**: valoración de 5 renglones en escala 1-5 que ambas partes deben emitir para cerrar el trueque (requisito COMPLETADO; D18; detalle off-chain D36).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `trueke_id` | `BIGINT NOT NULL` | **FK → `truekes(id)`** (`schema.sql:156`) | Trueque valorado |
| `valorador` / `valorado` | `CHAR(42) NOT NULL` | Direcciones (sin FK) | Quién valora a quién |
| `aceptacion`, `honestidad`, `seguridad`, `confiabilidad`, `compromiso` | `SMALLINT` | `CHECK (… BETWEEN 1 AND 5)` (`schema.sql:159-163`) | Escala 1-5 (D18) |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `UNIQUE (trueke_id, valorador)` | — | Restricción (`schema.sql:165`) | **Un voto por valorador y por trueque** (impide doble valoración) |

> **Escritor real (2026-09-09)**: `POST /truekes/:id/valoracion` persiste aquí vía
> `almacen.registrarValoracion` (INSERT … `ON CONFLICT (trueke_id, valorador) DO UPDATE`,
> `backend/api/lib/almacen-pg.js:599-613`) y `GET /valor/mi` la lee con `listarValoracionesDe`
> (`almacen-pg.js:615-639`) para los pendientes y los últimos 10 (VALOR 4.2). La tabla existía en
> `schema.sql` pero no se usaba en pg hasta esta revisión (`backend/db/migracion_valor.sql:18-19`).
> Los eventos `ValoracionMarcadaA/B` (`sc/src/Escrow.sol:100-101`) siguen sin mapearse (pendiente).

### 5.2 `disputas` — flujo v2 del director (2026-09-08) (`backend/db/schema.sql:201-217`)

**Propósito**: registrar la disputa de un trueque que nace **solo** desde el cierre ✗ No Conforme y
su resolución por votación de Socios. Estados (texto libre, no ENUM):
`REPORTADA → ESPERA_JUSTIFICATIVO → EN_VOTACION → RESUELTA` (comentario `schema.sql:191-200`).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `trueke_id` | `BIGINT NOT NULL` | **FK → `truekes(id)`** (`schema.sql:203`) | Trueque disputado |
| `solicitante` | `CHAR(42) NOT NULL` | Dirección (sin FK) | Reclamante (quien firmó No Conforme) |
| `motivo` | `TEXT` | — | Motivo del reclamo (formulario) |
| `estado` | `TEXT` | default `'REPORTADA'` (`schema.sql:206`) | Flujo REPORTADA→ESPERA_JUSTIFICATIVO→EN_VOTACION→RESUELTA |
| `justificativo_vence_at` | `TIMESTAMPTZ` | **Nuevo (2026-09-08)** (`schema.sql:207`) | Plazo **3 días** del conforme para cargar justificativo |
| `votacion_vence_at` | `TIMESTAMPTZ` | **Nuevo (2026-09-08)** (`schema.sql:208`) | Plazo **5 días** de la votación (D13/D21) |
| `veredicto` | `TEXT` | **Nuevo (2026-09-08)** (`schema.sql:209`) | `'ANULAR'` (devolución total) o `'VALIDO'` (trueke completado) |
| `resuelta_en` | `TIMESTAMPTZ` | **Nuevo (2026-09-08)** (`schema.sql:210`) | Cuándo se resolvió |
| `resolucion` | `TEXT` | — | Detalle legible del desenlace (`schema.sql:211`) |
| `sancion` | `TEXT` | — | Sanción (si aplica) |
| `timelock_ejecuta_at` | `TIMESTAMPTZ` | — | **D21**: timelock de 6 h para sanciones (`schema.sql:213`) |
| `registro_votos` | `JSONB` | — | Espejo de votos on-chain (D21) — el flujo 2026-09 vota en `votos_disputa` (§5.4) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | |

- **Escritor real**: motor `backend/api/lib/flujo-disputas.js` + `backend/api/routes/disputas.js`
  (justificativo/no-conforme/votar) y `routes/truekes.js` (cierre). Vencimientos: sin justificativo
  en 3 días o votación vencida sin votos → **ANULA por defecto** (`flujo-disputas.js:104-123`);
  veredicto por mayoría simple de votantes (empate → ANULA, `disputas.js:161-166`).
- Migración `backend/db/migracion_disputas_v2.sql:21-28`: añade las 4 columnas nuevas y migra los
  estados legados `'ABIERTA'` → `'REPORTADA'`.

### 5.3 `evidencias_disputa` — fotos de cada parte (**nueva 2026-09-08**) (`backend/db/schema.sql:220-228`)

**Propósito**: imágenes de evidencia de cada parte de la disputa — el reclamo del reclamante
(`RECLAMO`) y el justificativo del conforme (`JUSTIFICATIVO`).

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `disputa_id` | `BIGINT NOT NULL` | **FK → `disputas(id)` `ON DELETE CASCADE`** (`schema.sql:222`) |
| `autor` | `CHAR(42) NOT NULL` | Wallet de la parte que sube la foto |
| `tipo` | `TEXT` | `CHECK (tipo IN ('RECLAMO','JUSTIFICATIVO'))` (`schema.sql:224`) |
| `contenido` | `BYTEA NOT NULL` | Binario de la imagen |
| `mime` | `TEXT` | default `'image/jpeg'` (`schema.sql:226`) |
| `created_at` | `TIMESTAMPTZ` | default `now()` |

- Índice `ix_evidencias_disputa (disputa_id, tipo)` (`schema.sql:371`).
- Escritores: `agregarEvidenciaDisputa` (`backend/api/lib/almacen-pg.js:763-771`) desde
  `POST /truekes/:id/cierre`, `POST /disputas/:id/justificativo` y `/no-conforme`; servidas por
  `GET /disputas/:id/evidencia/:evId` (solo parte o Socio).

### 5.4 `votos_disputa` — votos de los Socios (**nueva 2026-09-08**) (`backend/db/schema.sql:231-238`)

**Propósito**: 1 voto por Socio y disputa en la votación `EN_VOTACION` (D21: 1 voto por Socio; el
socio que es parte del trueke no vota — decisión del director).

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `disputa_id` | `BIGINT NOT NULL` | **FK → `disputas(id)` `ON DELETE CASCADE`** (`schema.sql:233`) |
| `socio` | `CHAR(42) NOT NULL` | Wallet del Socio votante (dirección, sin FK) |
| `voto` | `TEXT` | `CHECK (voto IN ('ANULAR','VALIDO'))` (`schema.sql:235`) |
| `created_at` | `TIMESTAMPTZ` | default `now()` |
| `UNIQUE (disputa_id, socio)` | — | `schema.sql:237` — 1 voto por Socio y disputa |

- Índice `ix_votos_disputa (disputa_id)` (`schema.sql:372`); escritor: `registrarVotoDisputa`
  (`almacen-pg.js:807-816`) desde `POST /disputas/:id/votar`.

### 5.5 `notificaciones` — campana in-app (**nueva 2026-09-08**) (`backend/db/schema.sql:241-251`)

**Propósito**: avisos por wallet (centro de notificaciones de la campana): disputas reportadas,
pedidos de justificativo, votaciones abiertas y veredictos.

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `wallet` | `CHAR(42) NOT NULL` | Destinatario (dirección, sin FK) |
| `tipo` | `TEXT` | `'DISPUTA_REPORTADA'`/`'PEDIDO_JUSTIFICATIVO'`/`'VOTACION_ABIERTA'`/`'VEREDICTO'`/`'SISTEMA'` (`schema.sql:244`) |
| `titulo` | `TEXT NOT NULL` | Título corto |
| `cuerpo` | `TEXT` | Cuerpo legible |
| `ref_tipo` / `ref_id` | `TEXT` / `BIGINT` | Referencia polimórfica `'disputa'`/`'trueke'` → `disputas.id`/`truekes.id` (sin FK) |
| `leida` | `BOOLEAN` | default `FALSE` |
| `created_at` | `TIMESTAMPTZ` | default `now()` |

- Índice `ix_notificaciones_wallet (wallet, leida, created_at DESC)` (`schema.sql:373`);
  escritor: `crearNotificacion` (`almacen-pg.js:827-835`) invocado por el motor de disputas
  (`flujo-disputas.js:60-68`) y por `routes/truekes.js`; API de lectura: `routes/notificaciones.js`
  (Manual 06 §15).

---

## 6. Geografía: `puntos_encuentro` (PostGIS)

### 6.1 `puntos_encuentro` — zonas de encuentro (CU-16, CU-22) (`backend/db/schema.sql:169-177`)

**Propósito**: puntos físicos de encuentro entre partes; base de la regla de ≤10 km (RF-08.3/08.4) mediante PostGIS.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | Referenciado (lógicamente) por `truekes.punto_encuentro_id` |
| `usuario_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:171`) | Usuario que registró el punto |
| `direccion` | `TEXT` | **PII†** | **D17** (cifrado en reposo) |
| `geog` | `GEOGRAPHY(Point,4326) NOT NULL` | PostGIS | Coordenadas; índice GIST `idx_puntos_geog` (`schema.sql:368`) |
| `radio_km` | `NUMERIC` | default `10` | Radio de búsqueda (≤10 km) |
| `aprobado_socios` | `BOOLEAN` | default `FALSE` | Establecimientos de retiro aprobados por Socios (CU-22) |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

---

## 7. Monetización y finanzas: `suscripciones`, `campanas`, `subastas`, `finanzas`

### 7.1 `suscripciones` — cobro de empresas por staking bloqueado (D33) (`backend/db/schema.sql:270-280`)

**Propósito**: registro de cada ciclo de suscripción de empresa (CU-24); el cobro se produce por **staking bloqueado 30 días** (D33; se descartó EIP-1337 — `RepoTecnico/requerimientos.md:141,292`).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Evento que la alimenta |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `empresa_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:272`) | Empresa suscrita |
| `plan` | `TEXT` | — | Plan (base 100 BRLT/mes configurable — D33) |
| `monto` | `NUMERIC NOT NULL` | — | `montoBloqueado` del evento |
| `ciclo_inicio` / `ciclo_fin` | `TIMESTAMPTZ` | — | `ciclo_fin = ciclo_inicio + 2.592.000 s (30 días)` |
| `fecha` | `TIMESTAMPTZ` | default `now()` | |
| `tx_hash` | `CHAR(66)` | — | Tx del evento |
| `estado` | `estado_suscripcion` | default `'ACTIVA'` | `ACTIVA`/`IRREGULAR`/`CANCELADA` |

**Evento mapeado**: `SuscripcionEmpresa.Suscrita(empresa, montoBloqueado, cicloInicio)` (`sc/src/SuscripcionEmpresa.sol:54`) → INSERT con `to_timestamp` y ciclo de 30 días (`backend/indexador.js:151-161`). Los eventos `CicloRecolectado`, `SuscripcionIrregular`, `SuscripcionCancelada` (`sc/src/SuscripcionEmpresa.sol:55-57`) existen pero **no están mapeados** (pendiente de confirmar).

### 7.2 `campanas` — venta masiva / recolecta (CU-09/10) (`backend/db/schema.sql:283-293`)

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `tipo` | `tipo_campana NOT NULL` | `VENTA`/`RECOLECTA` |
| `usuario_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:286`) |
| `estado` | `TEXT` | default `'ACTIVA'` (texto libre) |
| `aprobada_socios` | `BOOLEAN` | default `FALSE` |
| `articulos` | `JSONB` | Artículos de la campaña |
| `causa` | `TEXT` | Causa social (RECOLECTA) |
| `plazo_fin` | `TIMESTAMPTZ` | Fin de la campaña |

### 7.3 `subastas` — subastas de empresa (RF-17, CU-25/26) (`backend/db/schema.sql:296-311`)

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `empresa_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:298`) | Empresa subastadora |
| `articulo_id` | `BIGINT` | **FK → `articulos(id)`** (`schema.sql:299`) | Artículo subastado |
| `escrow_id` | `NUMERIC` | — | Escrow asociado (si aplica) |
| `duracion` | `INTERVAL` | — | |
| `puja_inicial` / `incremento_minimo` | `NUMERIC` | — | |
| `pujas` | `JSONB` | — | Historial de pujas |
| `estado` | `estado_subasta` | default `'ABIERTA'` | |
| `ganador_id` | `BIGINT` | **FK → `usuarios(id)`** (`schema.sql:306`) | Ganador |
| `valor_ganador` | `NUMERIC` | — | Mayor valor ofrecido (D27) |
| `nivel_ganador` | `nivel_usuario` | — | **Desempate por nivel (D27)** (`schema.sql:308`) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | |

### 7.4 `finanzas` — saldos del socio y fondo global (CU-30/31) (`backend/db/schema.sql:314-323`)

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `usuario_id` | `BIGINT` | **PK + FK → `usuarios(id)`** (`schema.sql:315`) | 1:1 usuario–finanzas |
| `nfts_stock` | `JSONB` | — | Stock de NFTs |
| `criptos` | `JSONB` | — | Stock de criptos (p. ej. `{ ETH: n }`) — lo opera la API de VALOR |
| `brlt` | `NUMERIC` | default `0` | Saldo BRLT del socio. Dos vías reales: (a) indexador con `BRLT.EmisionRegistrada` → `UPDATE … WHERE tipo='SOCIO' LIMIT 1` (D32, `backend/indexador.js:137-148`); (b) **API de VALOR** (recarga Stripe/webhook, conversión, retiro) con `moverSaldo` (`backend/api/lib/almacen-pg.js:516-533`, 2026-09-09) |
| `fondo_valor` | `NUMERIC` | default `0` | Fondo global de valor |
| `porcentajes_config` | `JSONB` | default `'{"trueque":1,"suscripciones":10,"brlt":5}'` | **D7**: porcentajes configurables por el Owner (`schema.sql:320-321`) |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

Nota D32: el tope de emisión (1.000.000 BRLT inicial) y el quórum 2/3 son lógica on-chain del contrato `BRLT` (evento `TopeActualizado`, `sc/src/BRLT.sol:40`); en SQL solo se refleja el saldo agregado. El contrato `FondoDeValor` (eventos `ContribucionRegistrada`, `PorcentajeActualizado`, `RetiroParaOperacion`, `sc/src/FondoDeValor.sol:35-38`) **no está en el mapa del indexador** (`backend/indexador.js:51-66`) → el mantenimiento de `fondo_valor` es **pendiente de confirmar**. La gestión diaria del BRLT del socio (2026-09-09) ocurre en la sección **VALOR** (off-chain): ver Manual 03 · 06-backend-api.md §14 y Manual 03 · 03-contratos-finanzas.md §8.

### 7.5 `movimientos_valor` y `movimientos_brlt` — VALOR (2026-09-09) (`backend/db/migracion_valor.sql:23-48`)

**Propósito**: auditoría off-chain de la sección VALOR. `movimientos_valor` registra **cada**
movimiento de cripto/BRLT (append-only, contraparte = la PLATAFORMA); `movimientos_brlt` guarda el
detalle de los pagos fiat por Stripe (sesión/estado) hasta su confirmación.

**`movimientos_valor`** (`migracion_valor.sql:23-34`):

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `wallet` | `CHAR(42) NOT NULL` | Usuario que opera (dirección, sin FK) |
| `tipo` | `TEXT NOT NULL` | `RECARGA_CRIPTO`/`RETIRO_CRIPTO`/`CONVERSION`/`RETIRO_BRLT`… |
| `moneda` | `TEXT NOT NULL` | `'ETH'` o `'BRLT'` |
| `monto` | `NUMERIC NOT NULL` | Cantidad movida |
| `contraparte` | `CHAR(42) NOT NULL` | **La plataforma** (cuenta operativa) |
| `detalle` | `TEXT` | Descripción legible |
| `tx_hash` | `CHAR(66)` | Si hubo tx on-chain real |
| `created_at` | `TIMESTAMPTZ` | default `now()` |

**`movimientos_brlt`** (`migracion_valor.sql:37-48`):

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `wallet` | `CHAR(42) NOT NULL` | Comprador |
| `monto_brlt` | `NUMERIC NOT NULL` | BRLT acreditables al confirmar |
| `monto_fiat` | `NUMERIC` | Monto en la moneda fiat |
| `fiat_moneda` | `TEXT` | default `'usd'` |
| `stripe_session` | `TEXT` | Id de la Stripe Checkout Session |
| `stripe_payment` | `TEXT` | PaymentIntent cuando confirma |
| `estado` | `TEXT` | default `'PENDIENTE'` — `PENDIENTE`/`PAGADO`/`FALLIDO` |
| `created_at` / `confirmado_at` | `TIMESTAMPTZ` | — |

- Escritores: `registrarMovimientoValor`/`listarMovimientosValor`, `crearMovimientoBrlt`/
  `buscarMovimientoBrltPorSesion`/`confirmarMovimientoBrlt` (`backend/api/lib/almacen-pg.js:535-597`);
  el webhook de Stripe acredita BRLT al confirmar (`routes/valor.js:233-264`). Índices:
  `ix_movimientos_wallet (wallet, created_at DESC)` y `ix_movimientos_brlt_wallet (wallet, estado)`
  (`migracion_valor.sql:34,49`).

---

## 8. Operación del indexador: `auditoria` e `indexador_checkpoint`

### 8.1 `auditoria` — registro append-only e idempotencia (RF-18.6, H-16) (`backend/db/schema.sql:326-338`)

**Propósito**: bitácora de **todos** los eventos on-chain procesados; garantiza la idempotencia del indexador (RNF-07.4).

**Campos clave**:

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `entidad` | `TEXT NOT NULL` | Contrato de origen (p. ej. `Escrow`) |
| `evento` | `TEXT NOT NULL` | Nombre del evento (p. ej. `CustodiaA`) |
| `actor` | `CHAR(42)` | Dirección emisora (`log.address`) |
| `tx_hash` | `CHAR(66) NOT NULL` | Hash de la transacción |
| `bloque` | `BIGINT NOT NULL` | Bloque |
| `log_index` | `INT NOT NULL` | Índice del log dentro de la tx |
| `payload` | `JSONB` | Args serializados (bigint → string, `backend/indexador.js:38-41`) |
| `procesado` / `procesado_at` | `BOOLEAN` / `TIMESTAMPTZ` | Marca de procesamiento |
| `UNIQUE (tx_hash, log_index, entidad)` | — | **Clave de idempotencia** (`schema.sql:337`); el INSERT usa `ON CONFLICT … DO NOTHING` (`backend/indexador.js:42-47`) |

### 8.2 `indexador_checkpoint` — reproceso desde bloque N (RNF-07.4) (`backend/db/schema.sql:341-346`)

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `contrato` | `TEXT` | **PK** (un checkpoint por contrato) |
| `ultimo_bloque` | `BIGINT` | default `0`; último bloque barrido (`backend/indexador.js:211-217`) |
| `ultimo_log_index` | `INT` | default `0` |
| `updated_at` | `TIMESTAMPTZ` | default `now()` |

---

## 9. Reglas de integridad y datos destacadas (resumen)

- **Idempotencia por `(tx_hash, log_index, entidad)`**: constraint UNIQUE en `auditoria` (`backend/db/schema.sql:337`) + pre-chequeo en `procesarLog` (`backend/indexador.js:171-176`); doble mecanismo.
- **Idempotencia por escrow**: `truekes.escrow_id UNIQUE` + `ON CONFLICT DO UPDATE` (`backend/db/schema.sql:132`; `backend/indexador.js:75`).
- **Un voto por valorador y trueque**: `UNIQUE (trueke_id, valorador)` (`backend/db/schema.sql:165`).
- **Escala 1-5**: `CHECK` en los 5 renglones de `valoraciones` (`backend/db/schema.sql:159-163`, D18).
- **Un voto por Socio y disputa**: `UNIQUE (disputa_id, socio)` en `votos_disputa` (`schema.sql:237`); `CHECK (voto IN ('ANULAR','VALIDO'))` (`schema.sql:235`).
- **Tipo de evidencia acotado**: `CHECK (tipo IN ('RECLAMO','JUSTIFICATIVO'))` en `evidencias_disputa` (`schema.sql:224`).
- **Distancia ≤10 km**: PostGIS `ST_DWithin(pe.geog, u.geog, 10000)` entre `puntos_encuentro.geog` y `usuarios.geog` (RF-08.3/08.4) — consulta de ejemplo en `backend/db/schema.sql:375-377`.
- **PII cifrada en reposo (D17)**: `usuarios.correo/telefono/direccion_inscripcion` (`schema.sql:74-76`), `kyc.documento_identidad/selfie_ref` (`schema.sql:95-96`), `puntos_encuentro.direccion` (`schema.sql:172`); consentimiento GDPR explícito (`schema.sql:83-84`).
- **Índices declarados** (`backend/db/schema.sql:361-373`): `truekes(estado)`, `truekes(usuario_a)`, `truekes(usuario_b)`, `usuarios(estado)`, `articulos(rubro)`, `articulos(categoria)`, `auditoria(tx_hash, log_index)`, GIST `puntos_encuentro(geog)`, `puntos_favoritos(usuario_id, ultimo_uso DESC)`, `imagenes_certificadas(tipo, ref_id)`, `evidencias_disputa(disputa_id, tipo)`, `votos_disputa(disputa_id)`, `notificaciones(wallet, leida, created_at DESC)` (+ `movimientos_valor`/`movimientos_brlt` en `migracion_valor.sql:34,49`). Nota: **no hay índice sobre `usuarios.smart_account`** pese a que el indexador consulta por esa columna (`backend/indexador.js:110-119`) — impacto de desempeño pendiente de confirmar.
