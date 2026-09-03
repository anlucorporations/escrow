# Manual Técnico 05 — Diccionario de Datos (modelo PostgreSQL off-chain)

> **Alcance**: diccionario de datos del esquema PostgreSQL real de TrueKeate (14 tablas, 10 tipos ENUM), su relación con las decisiones D17/D23/D26/D28/D32/D33/D34 y los eventos on-chain que alimentan cada tabla.
> **Fuentes leídas**: `backend/db/schema.sql` (esquema real, 276 líneas), `RepoTecnico/diccionario_datos.md` (inventario de diseño), `backend/indexador.js` (eventos mapeados a tablas), eventos declarados en `sc/src/*.sol`.
> **Convención**: toda referencia `ruta:línea` apunta al código real. Lo que el código no implementa se marca **"pendiente de confirmar"** (por ejemplo, entidades del diccionario de diseño que aún no tienen tabla SQL o anclajes on-chain no materializados).

---

## 1. Panorama del modelo de datos

### 1.1 Tres clases de tablas (patrón RNF-01.1/RNF-03.2)

El esquema distingue explícitamente quién puede escribir cada tabla (cabecera en `backend/db/schema.sql:1-7`):

| Clase | Tablas | Quién escribe | Fuente de verdad |
|---|---|---|---|
| **Espejo del estado on-chain** | `truekes`, columnas de `kyc`/`usuarios`/`finanzas`/`suscripciones` sincronizadas | **Solo el indexador** (RNF-01.1) | Blockchain (eventos) |
| **Off-chain de negocio** | `articulos`, `valoraciones`, `puntos_encuentro`, `disputas`, `imagenes_certificadas`, `campanas`, `subastas` | El backend (API REST) | Backend + evidencias off-chain |
| **Operación del indexador** | `auditoria`, `indexador_checkpoint` | El indexador | Registro de eventos procesados |

- La blockchain es la única fuente de verdad de los estados del escrow; el indexador **nunca escribe en cadena** (`backend/indexador.js:7-8`).
- Extensiones habilitadas: `postgis` y `pgcrypto` (`backend/db/schema.sql:9-10`); PostGIS sostiene la regla de ≤10 km (RF-08.3/08.4) y `pgcrypto` el cifrado de PII (D17).

### 1.2 Inventario: 14 tablas

| # | Tabla | Línea en schema.sql | Clase | Propósito |
|---|---|---|---|---|
| 1 | `usuarios` | 62-79 | Espejo parcial + off-chain | Registro e identidad (CU-01/02) |
| 2 | `kyc` | 82-93 | Espejo parcial (merkle) | Metadata KYC cifrada (RF-01.7, D17) |
| 3 | `articulos` | 96-108 | Off-chain | Publicaciones AtoA (CU-06) |
| 4 | `truekes` | 111-126 | **Espejo del escrow** | Intercambios y su estado (RNF-01.1) |
| 5 | `valoraciones` | 129-141 | Off-chain | Evaluación 1-5 al cierre (D18/D36) |
| 6 | `puntos_encuentro` | 144-152 | Off-chain (PostGIS) | Zonas de encuentro ≤10 km (CU-16) |
| 7 | `disputas` | 155-167 | Off-chain + espejo de votos | Disputas y apelaciones (CU-18/19) |
| 8 | `imagenes_certificadas` | 170-181 | Off-chain (evidencia) | Certificación de imágenes (RF-11, D23) |
| 9 | `suscripciones` | 184-194 | Espejo parcial | Suscripciones de empresa (CU-24, D33) |
| 10 | `campanas` | 197-207 | Off-chain | Campañas VENTA/RECOLECTA (CU-09/10) |
| 11 | `subastas` | 210-225 | Off-chain | Subastas de empresa (RF-17, CU-25/26) |
| 12 | `finanzas` | 228-237 | Espejo parcial | Saldos y fondo global (CU-30/31) |
| 13 | `auditoria` | 240-252 | Operación (append-only) | Registro auditable + idempotencia (RF-18.6) |
| 14 | `indexador_checkpoint` | 255-260 | Operación | Checkpoints de reproceso (RNF-07.4) |

### 1.3 Entidades de diseño aún NO materializadas (pendiente de confirmar)

El inventario de diseño (`RepoTecnico/diccionario_datos.md`) lista entidades que **no tienen tabla en el esquema SQL actual**:

- **`encargos`** (RF-04.3/CU-07): pedido de artículo fuera del mercado — solo descrita en `RepoTecnico/diccionario_datos.md:33`.
- **`marcadorOnChain`** en valoraciones: el requisito de "ambas partes valoraron" existe como eventos `ValoracionMarcadaA/B` en `sc/src/Escrow.sol:100-101`, pero el esquema de `valoraciones` no materializa el marcador (solo los 5 renglones, `backend/db/schema.sql:134-138`).
- **`emisionesRegistradas`** de BRLT (D32): existe como campo de diseño on-chain (`RepoTecnico/diccionario_datos.md:22`); en SQL solo hay saldo agregado `finanzas.brlt`.
- **Guardianes D34** (`guardianes[]`, umbral 2/3, timelock 48 h): viven **solo on-chain** en `SmartAccount` (`sc/src/SmartAccount.sol:59-65`) y no tienen representación SQL en este esquema.

---

## 2. Tipos ENUM

### 2.1 Enum canónico de 9 estados del escrow

Definición SQL: `estado_escrow` en `backend/db/schema.sql:32-34`; definición Solidity espejo: `enum Estado` en `sc/src/Escrow.sol:39-49` (orden idéntico de valores).

| Valor SQL/Solidity | Línea SQL | Línea Solidity | Significado | ¿Quién lo escribe en `truekes`? |
|---|---|---|---|---|
| `CREADO` | 33 | 40 | Acuerdo registrado, sin activos custodiados | Indexador (evento `TruekeCreado`, `backend/indexador.js:70-78`) |
| `ACTIVO` | 33 | 41 | Sinónimo de CREADO para compatibilidad de lectura | **Pendiente de confirmar** (no hay evento que lo escriba en este ciclo) |
| `CUSTODIADO` | 33 | 42 | Al menos un activo custodiado | Indexador (`CustodiaA`/`CustodiaB` → `CUSTODIADO`, mapa en `backend/indexador.js:80`; UPDATE en 86-92) |
| `APERTURA` | 33 | 43 | Ambas partes abrieron en sus ventanas | Indexador (`AperturaA`/`AperturaB`, mapa en `backend/indexador.js:81`; timestamps en 93-101) |
| `EN_DISPUTA` | 34 | 44 | Solicitud de anulación en curso (C8) | **Pendiente de confirmar** (C8) |
| `RESOLUCION_SOCIOS` | 34 | 45 | Votación de Socios (C8) | **Pendiente de confirmar** (C8) |
| `COMPLETADO` | 34 | 46 | Firmas duales + valoraciones, activos liberados | Indexador (`TruekeCompletado`, mapa en `backend/indexador.js:82`) |
| `ANULADO` | 34 | 47 | Anulación con quórum o por defecto | Indexador (`TruekeCancelado`, mapa en `backend/indexador.js:83`; D26: el *por defecto* es lógica on-chain, evento `ResolucionPorDefecto` en `sc/src/Escrow.sol:108` no mapeado aún) |
| `BLOQUEADO` | 34 | 48 | Violación de norma (C8) | Indexador (`EscrowBloqueado`, mapa en `backend/indexador.js:84`) |

Nota operativa: el mapa de eventos del indexador actual (`backend/indexador.js:79-85`) solo escribe 6 de los 9 valores (`CREADO`, `CUSTODIADO`, `APERTURA`, `COMPLETADO`, `ANULADO`, `BLOQUEADO`); `ACTIVO`, `EN_DISPUTA` y `RESOLUCION_SOCIOS` quedan para el ciclo C8 (reconciliación fina, `backend/indexador.js:222-230`).

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
| `estado_kyc` | `PENDIENTE` / `APROBADO` / `RECHAZADO` / `APELACION` | 38 | `kyc.estado` |
| `tipo_imagen` | `PUBLICACION` / `RECEPCION` | 42 | `imagenes_certificadas.tipo` (polimorfismo de `ref_id`) |
| `estado_suscripcion` | `ACTIVA` / `IRREGULAR` / `CANCELADA` | 46 | `suscripciones.estado` (D33) |
| `tipo_campana` | `VENTA` / `RECOLECTA` | 50 | `campanas.tipo` |
| `estado_subasta` | `ABIERTA` / `CERRADA` / `ANULADA` | 54 | `subastas.estado` |

> ⚠️ `nivel_usuario` y `tipo_usuario` comparten el valor `SOCIO` con significados distintos: `tipo='SOCIO'` es rol de gobernanza (votación D21); `nivel='SOCIO'` es el nivel superior de reputación (mapeo D4).

---

## 3. Identidad: `usuarios` y `kyc`

### 3.1 `usuarios` — registro e identidad (`backend/db/schema.sql:62-79`)

**Propósito**: cuenta raíz de cada usuario (CU-01/02); una fila por wallet.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación con decisiones y eventos |
|---|---|---|---|
| `id` | `BIGINT GENERATED ALWAYS AS IDENTITY` | **PK** | Identificador interno; referenciado por 7 tablas |
| `wallet` | `CHAR(42)` | `UNIQUE NOT NULL` | Dirección EOAs/Smart Account; es la clave natural on-chain |
| `correo`, `telefono`, `direccion_inscripcion` | `TEXT` | **PII†** (cifrado en reposo) | **D17** (`backend/db/schema.sql:65-67`; RNF-01.4 en `RepoTecnico/requerimientos.md:214`) |
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

### 3.2 `kyc` — metadata KYC cifrada (`backend/db/schema.sql:82-93`)

**Propósito**: almacenar la metadata del proceso KYC (RF-01.7) **cifrada en reposo**; solo una raíz merkle (hash) viaja al Smart Account.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación con decisiones y eventos |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `usuario_id` | `BIGINT` | **FK → `usuarios(id)`** (`schema.sql:84`) | 1 registro KYC por usuario (relación 1:1 lógica; el esquema no impone `UNIQUE`) |
| `documento_identidad` | `BYTEA` | **PII† cifrado** | **D17** (RNF-01.4) |
| `selfie_ref` | `TEXT` | **PII†** referencia (IPFS/cifrada) | **D17** |
| `selfie_hash` | `BYTEA` | — | Integridad de la selfie |
| `merkle_root` | `BYTEA` | Espejo on-chain | **D28/RF-01.7**: actualizado por el indexador al recibir `SmartAccount.MerkleRootActualizado` (`backend/indexador.js:106-114`; evento en `sc/src/SmartAccount.sol:61`) |
| `estado` | `estado_kyc` | default `PENDIENTE` | Flujo PENDIENTE→APROBADO/RECHAZADO/APELACION |
| `revisado_por` | `CHAR(42)` | Owner (RF-18.4) | Revisión humana del Owner (también requerida en la recuperación con KYC de D34) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | |

---

## 4. Catálogo e intercambio: `articulos`, `truekes`, `imagenes_certificadas`

### 4.1 `articulos` — publicaciones AtoA (`backend/db/schema.sql:96-108`)

**Propósito**: catálogo de ofertas de trueque (CU-06), incluye NFTs y criptos declarados.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | Referenciado por `truekes.articulo_a_id/b_id` y `subastas.articulo_id` |
| `usuario_id` | `BIGINT` | **FK → `usuarios(id)`** (`schema.sql:98`) | Dueño/publicador |
| `titulo` | `TEXT NOT NULL` | — | |
| `rubro` | `TEXT NOT NULL` | índice `idx_articulos_rubro` (`schema.sql:269`) | Búsqueda por rubro (límites por nivel RF-01.2b) |
| `imagen_certificacion_id` | `BIGINT` | FK lógica **1—1 → `imagenes_certificadas(id)`** (**sin constraint real**) | **D23** (`schema.sql:102`) |
| `nft_token_id` | `NUMERIC` | — | Token on-chain si el artículo es NFT |
| `disponible` | `BOOLEAN` | default `TRUE` | Disponibilidad para trueque |
| `alta_disponibilidad` | `BOOLEAN` | default `FALSE`, **computado** | D19 (`schema.sql:105`) |

### 4.2 `truekes` — espejo del estado on-chain del escrow (`backend/db/schema.sql:111-126`)

**Propósito**: tabla espejo del contrato `Escrow` (RNF-01.1); **solo el indexador la escribe** (comentario `schema.sql:110`).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Evento on-chain que la alimenta |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | — |
| `escrow_id` | `NUMERIC UNIQUE NOT NULL` | Id on-chain del escrow | `Escrow.TruekeCreado` inserta la fila con `escrow_id` (`backend/indexador.js:70-78`); `ON CONFLICT (escrow_id) DO UPDATE` da **idempotencia por escrow** |
| `articulo_a_id` / `articulo_b_id` | `BIGINT` | **FK → `articulos(id)`** (`schema.sql:114-115`) | Oferta de cada parte |
| `usuario_a` / `usuario_b` | `CHAR(42) NOT NULL` | Direcciones on-chain (sin FK; ver Manual 06 §3) | `TruekeCreado` `parteA`/`parteB` (`backend/indexador.js:73-76`) |
| `estado` | `estado_escrow` | default `'CREADO'` (`schema.sql:118`) | Mapa de eventos `backend/indexador.js:79-85` (ver §2.1) |
| `hora_pautada` | `TIMESTAMPTZ` | — | Ventana de apertura (≤10 min) |
| `apertura_a` / `apertura_b` | `TIMESTAMPTZ` | — | `AperturaA`/`AperturaB` → `to_timestamp(ts)` (`backend/indexador.js:93-101`) |
| `punto_encuentro_id` | `BIGINT` | FK lógica → `puntos_encuentro(id)` (**sin constraint real**) (`schema.sql:122`) | Punto acordado (CU-16) |
| `tx_hash` | `CHAR(66)` | — | Hash de la tx de creación (`backend/indexador.js:76`) |
| `bloque` | `BIGINT` | — | Bloque de creación (`backend/indexador.js:76`) |
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

### 4.3 `imagenes_certificadas` — evidencia de imágenes (RF-11, D23) (`backend/db/schema.sql:170-181`)

**Propósito**: evidencia inmutable de la imagen que certifica una publicación (`PUBLICACION`) o una recepción (`RECEPCION`); hash + firma + referencia IPFS.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `tipo` | `tipo_imagen` | `PUBLICACION`/`RECEPCION` | Determina la semántica de `ref_id` |
| `ref_id` | `BIGINT NOT NULL` | **FK lógica polimórfica**: `articulos.id` si `tipo=PUBLICACION`, `truekes.id` si `tipo=RECEPCION` (**sin constraint real**) | Relaciona con la entidad certificada |
| `hash_sha256` | `BYTEA NOT NULL` | — | Integridad (RF-11.2) |
| `ipfs_cid` | `TEXT` | — | Almacenamiento IPFS con pinning propio (D23/RT-02.6) |
| `wallet` | `CHAR(42) NOT NULL` | — | Autor de la certificación |
| `firma_ecdsa` | `BYTEA NOT NULL` | — | Firma del hash (inmutabilidad, D23) |
| `metadata` | `JSONB` | — | Datos auxiliares |
| `root_merkle_anclada` | `BYTEA` | Raíz merkle **anclada on-chain** | **D23** (`schema.sql:179`): el diseño prevé anclar la raíz en el contrato escrow (RT-02.7, `RepoTecnico/requerimientos.md:285`), pero **los contratos de este ciclo no declaran ese anclaje** (no existe `rootMerkle`/evento de imágenes en `sc/src/Escrow.sol`) → **pendiente de confirmar**. |

Nota: no hay eventos on-chain de imágenes; esta tabla la alimenta el backend (endpoint de carga de imágenes). No se encontró el INSERT en `backend/indexador.js` — confirmado que **no la escribe el indexador**; el endpoint exacto del backend es **pendiente de confirmar**.

---

## 5. Confianza y resolución: `valoraciones` y `disputas`

### 5.1 `valoraciones` — evaluación al cierre (D18/D36) (`backend/db/schema.sql:129-141`)

**Propósito**: valoración de 5 renglones en escala 1-5 que ambas partes deben emitir para cerrar el trueque (requisito COMPLETADO; D18; detalle off-chain D36).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `trueke_id` | `BIGINT NOT NULL` | **FK → `truekes(id)`** (`schema.sql:131`) | Trueque valorado |
| `valorador` / `valorado` | `CHAR(42) NOT NULL` | Direcciones (sin FK) | Quién valora a quién |
| `aceptacion`, `honestidad`, `seguridad`, `confiabilidad`, `compromiso` | `SMALLINT` | `CHECK (… BETWEEN 1 AND 5)` (`schema.sql:134-138`) | Escala 1-5 (D18) |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |
| `UNIQUE (trueke_id, valorador)` | — | Restricción (`schema.sql:140`) | **Un voto por valorador y por trueque** (impide doble valoración) |

Los eventos `ValoracionMarcadaA/B` (`sc/src/Escrow.sol:100-101`) marcan on-chain que la parte valoró; el contenido queda off-chain (D36) en esta tabla — la tabla **no** guarda el marcador (pendiente de confirmar si se sincronizará en C8).

### 5.2 `disputas` — conflictos y apelaciones (CU-18/19) (`backend/db/schema.sql:155-167`)

**Propósito**: registrar la solicitud de anulación/disputa de un trueque, su resolución por Socios (D21/D26) y las sanciones con timelock.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `trueke_id` | `BIGINT NOT NULL` | **FK → `truekes(id)`** (`schema.sql:157`) | Trueque disputado |
| `solicitante` | `CHAR(42) NOT NULL` | Dirección (sin FK) | Parte que solicita |
| `motivo` | `TEXT` | — | Justificación (RF-06.1) |
| `estado` | `TEXT` | default `'ABIERTA'` (**texto libre**, no ENUM) | Nota: no usa ENUM en el esquema |
| `resolucion` / `sancion` | `TEXT` | — | Resultado y sanción |
| `timelock_ejecuta_at` | `TIMESTAMPTZ` | — | **D21**: timelock de 6 h para sanciones (`schema.sql:163`) |
| `registro_votos` | `JSONB` | — | **Espejo de votos on-chain** (D21): quórum ≥2/3, 1 voto por Socio (`schema.sql:164`) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | |

Relación con **D26**: si vence el plazo (≤5 días desde la solicitud, RF-05.2b) sin alcanzar quórum, el escrow se resuelve `ANULADO` por defecto con devolución de NFTs (`RepoTecnico/requerimientos.md:96,386`). La decisión de anulación se ejecuta on-chain (eventos `VotoSocio`/`ResolucionEjecutada`/`ResolucionPorDefecto`, `sc/src/Escrow.sol:106-108`), **no mapeados al esquema en este ciclo** (pendiente de confirmar C8). El estado espejo del trueque sí llega a `ANULADO` vía `TruekeCancelado`.

---

## 6. Geografía: `puntos_encuentro` (PostGIS)

### 6.1 `puntos_encuentro` — zonas de encuentro (CU-16, CU-22) (`backend/db/schema.sql:144-152`)

**Propósito**: puntos físicos de encuentro entre partes; base de la regla de ≤10 km (RF-08.3/08.4) mediante PostGIS.

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | Referenciado (lógicamente) por `truekes.punto_encuentro_id` |
| `usuario_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:146`) | Usuario que registró el punto |
| `direccion` | `TEXT` | **PII†** | **D17** (cifrado en reposo) |
| `geog` | `GEOGRAPHY(Point,4326) NOT NULL` | PostGIS | Coordenadas; índice GIST `idx_puntos_geog` (`schema.sql:271`) |
| `radio_km` | `NUMERIC` | default `10` | Radio de búsqueda (≤10 km) |
| `aprobado_socios` | `BOOLEAN` | default `FALSE` | Establecimientos de retiro aprobados por Socios (CU-22) |
| `created_at` | `TIMESTAMPTZ` | default `now()` | |

---

## 7. Monetización y finanzas: `suscripciones`, `campanas`, `subastas`, `finanzas`

### 7.1 `suscripciones` — cobro de empresas por staking bloqueado (D33) (`backend/db/schema.sql:184-194`)

**Propósito**: registro de cada ciclo de suscripción de empresa (CU-24); el cobro se produce por **staking bloqueado 30 días** (D33; se descartó EIP-1337 — `RepoTecnico/requerimientos.md:141,292`).

**Campos clave**:

| Campo | Tipo | PK/FK / notas | Evento que la alimenta |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `empresa_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:186`) | Empresa suscrita |
| `plan` | `TEXT` | — | Plan (base 100 BRLT/mes configurable — D33) |
| `monto` | `NUMERIC NOT NULL` | — | `montoBloqueado` del evento |
| `ciclo_inicio` / `ciclo_fin` | `TIMESTAMPTZ` | — | `ciclo_fin = ciclo_inicio + 2.592.000 s (30 días)` |
| `fecha` | `TIMESTAMPTZ` | default `now()` | |
| `tx_hash` | `CHAR(66)` | — | Tx del evento |
| `estado` | `estado_suscripcion` | default `'ACTIVA'` | `ACTIVA`/`IRREGULAR`/`CANCELADA` |

**Evento mapeado**: `SuscripcionEmpresa.Suscrita(empresa, montoBloqueado, cicloInicio)` (`sc/src/SuscripcionEmpresa.sol:54`) → INSERT con `to_timestamp` y ciclo de 30 días (`backend/indexador.js:151-161`). Los eventos `CicloRecolectado`, `SuscripcionIrregular`, `SuscripcionCancelada` (`sc/src/SuscripcionEmpresa.sol:55-57`) existen pero **no están mapeados** (pendiente de confirmar).

### 7.2 `campanas` — venta masiva / recolecta (CU-09/10) (`backend/db/schema.sql:197-207`)

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** |
| `tipo` | `tipo_campana NOT NULL` | `VENTA`/`RECOLECTA` |
| `usuario_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:200`) |
| `estado` | `TEXT` | default `'ACTIVA'` (texto libre) |
| `aprobada_socios` | `BOOLEAN` | default `FALSE` |
| `articulos` | `JSONB` | Artículos de la campaña |
| `causa` | `TEXT` | Causa social (RECOLECTA) |
| `plazo_fin` | `TIMESTAMPTZ` | Fin de la campaña |

### 7.3 `subastas` — subastas de empresa (RF-17, CU-25/26) (`backend/db/schema.sql:210-225`)

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `id` | `BIGINT IDENTITY` | **PK** | |
| `empresa_id` | `BIGINT NOT NULL` | **FK → `usuarios(id)`** (`schema.sql:212`) | Empresa subastadora |
| `articulo_id` | `BIGINT` | **FK → `articulos(id)`** (`schema.sql:213`) | Artículo subastado |
| `escrow_id` | `NUMERIC` | — | Escrow asociado (si aplica) |
| `duracion` | `INTERVAL` | — | |
| `puja_inicial` / `incremento_minimo` | `NUMERIC` | — | |
| `pujas` | `JSONB` | — | Historial de pujas |
| `estado` | `estado_subasta` | default `'ABIERTA'` | |
| `ganador_id` | `BIGINT` | **FK → `usuarios(id)`** (`schema.sql:220`) | Ganador |
| `valor_ganador` | `NUMERIC` | — | Mayor valor ofrecido (D27) |
| `nivel_ganador` | `nivel_usuario` | — | **Desempate por nivel (D27)** (`schema.sql:222`) |
| `created_at` / `updated_at` | `TIMESTAMPTZ` | default `now()` | |

### 7.4 `finanzas` — saldos y fondo global (CU-30/31) (`backend/db/schema.sql:228-237`)

| Campo | Tipo | PK/FK / notas | Relación |
|---|---|---|---|
| `usuario_id` | `BIGINT` | **PK + FK → `usuarios(id)`** (`schema.sql:229`) | 1:1 usuario–finanzas |
| `nfts_stock` | `JSONB` | — | Stock de NFTs |
| `criptos` | `JSONB` | — | Stock de criptos |
| `brlt` | `NUMERIC` | default `0` | Saldo BRLT; **D32**: el indexador lo incrementa con `BRLT.EmisionRegistrada` → `UPDATE finanzas SET brlt = COALESCE(brlt,0)+$1 WHERE usuario_id IN (SELECT id FROM usuarios WHERE tipo='SOCIO' LIMIT 1)` (`backend/indexador.js:137-148`; evento en `sc/src/BRLT.sol:39`) |
| `fondo_valor` | `NUMERIC` | default `0` | Fondo global de valor |
| `porcentajes_config` | `JSONB` | default `'{"trueque":1,"suscripciones":10,"brlt":5}'` | **D7**: porcentajes configurables por el Owner (`schema.sql:234-235`) |
| `updated_at` | `TIMESTAMPTZ` | default `now()` | |

Nota D32: el tope de emisión (1.000.000 BRLT inicial) y el quórum 2/3 son lógica on-chain del contrato `BRLT` (evento `TopeActualizado`, `sc/src/BRLT.sol:40`); en SQL solo se refleja el saldo agregado. El contrato `FondoDeValor` (eventos `ContribucionRegistrada`, `PorcentajeActualizado`, `RetiroParaOperacion`, `sc/src/FondoDeValor.sol:35-38`) **no está en el mapa del indexador** (`backend/indexador.js:51-66`) → el mantenimiento de `fondo_valor` es **pendiente de confirmar**.

---

## 8. Operación del indexador: `auditoria` e `indexador_checkpoint`

### 8.1 `auditoria` — registro append-only e idempotencia (RF-18.6, H-16) (`backend/db/schema.sql:240-252`)

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
| `UNIQUE (tx_hash, log_index, entidad)` | — | **Clave de idempotencia** (`schema.sql:251`); el INSERT usa `ON CONFLICT … DO NOTHING` (`backend/indexador.js:42-47`) |

### 8.2 `indexador_checkpoint` — reproceso desde bloque N (RNF-07.4) (`backend/db/schema.sql:255-260`)

| Campo | Tipo | PK/FK / notas |
|---|---|---|
| `contrato` | `TEXT` | **PK** (un checkpoint por contrato) |
| `ultimo_bloque` | `BIGINT` | default `0`; último bloque barrido (`backend/indexador.js:211-217`) |
| `ultimo_log_index` | `INT` | default `0` |
| `updated_at` | `TIMESTAMPTZ` | default `now()` |

---

## 9. Reglas de integridad y datos destacadas (resumen)

- **Idempotencia por `(tx_hash, log_index, entidad)`**: constraint UNIQUE en `auditoria` (`backend/db/schema.sql:251`) + pre-chequeo en `procesarLog` (`backend/indexador.js:171-176`); doble mecanismo.
- **Idempotencia por escrow**: `truekes.escrow_id UNIQUE` + `ON CONFLICT DO UPDATE` (`backend/db/schema.sql:113`, `backend/indexador.js:75`).
- **Un voto por valorador y trueque**: `UNIQUE (trueke_id, valorador)` (`backend/db/schema.sql:140`).
- **Escala 1-5**: `CHECK` en los 5 renglones de `valoraciones` (`backend/db/schema.sql:134-138`, D18).
- **Distancia ≤10 km**: PostGIS `ST_DWithin(pe.geog, u.geog, 10000)` entre `puntos_encuentro.geog` y `usuarios.geog` (RF-08.3/08.4) — consulta de ejemplo en `backend/db/schema.sql:274-276`.
- **PII cifrada en reposo (D17)**: `usuarios.correo/telefono/direccion_inscripcion` (`schema.sql:65-67`), `kyc.documento_identidad/selfie_ref` (`schema.sql:85-86`), `puntos_encuentro.direccion` (`schema.sql:147`); consentimiento GDPR explícito (`schema.sql:74-75`).
- **Índices declarados** (`backend/db/schema.sql:265-272`): `truekes(estado)`, `truekes(usuario_a)`, `truekes(usuario_b)`, `usuarios(estado)`, `articulos(rubro)`, `auditoria(tx_hash, log_index)`, GIST `puntos_encuentro(geog)`, `imagenes_certificadas(tipo, ref_id)`. Nota: **no hay índice sobre `usuarios.smart_account`** pese a que el indexador consulta por esa columna (`backend/indexador.js:110-119`) — impacto de desempeño pendiente de confirmar.
