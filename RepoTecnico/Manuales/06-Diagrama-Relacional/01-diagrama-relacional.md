# Manual Técnico 06 — Diagrama Relacional (modelo PostgreSQL off-chain)

> **Alcance**: descripción textual de las 14 tablas del esquema real, sus relaciones (1:N, 1:1, N:M resueltas), qué tabla es espejo de qué contrato/evento on-chain y el rol de PostGIS (radio ≤10 km, RNF-08.3/08.4) en la búsqueda de trueques.
> **Fuentes leídas**: `backend/db/schema.sql`, `backend/indexador.js`, eventos declarados en `sc/src/*.sol`, `RepoTecnico/arquitectura_tecnica.md` (§4 modelo, §5 indexador).
> **Convención**: toda referencia `ruta:línea` apunta al código real. Las FKs **sin constraint SQL** se marcan como "FK lógica" y su enforcement se delega al backend o queda **pendiente de confirmar**.

---

## 1. Mapa general del modelo

### 1.1 Diagrama textual de tablas y relaciones

```
                         usuarios (62-79)
                        ┌───────────────┐
   FK usuario_id        │ id PK         │        FK usuario_id
     1:N (kyc)          │ wallet UNIQUE │        1:N (articulos,
                        │ geog (PostGIS)│        puntos_encuentro,
                        │ estado (D28)  │        campanas)
                        └──────┬────────┘
                               │ FK usuario_id
              ┌────────────────┼───────────────────────┐
              │                │ 1:N                   │ 1:1 (finanzas)
              ▼                ▼                       ▼
            kyc (82)      articulos (96)          finanzas (228)
              │                │  ▲                    ▲
              │ FK usuario_id  │  │ imagen_certificacion_id   ▲ espejo
              │                │  │ (FK lógica 1—1, D23)      │ BRLT.EmisionRegistrada
              │                ▼  │ imagenes_certificadas(170)│
              │              ┌───────────────┐                │
              │ FK          │ truekes (111)  │◄── espejo Escrow│
              │ 1:N         │ escrow_id UNIQ │   (indexador)   │
              ▼              │ art_a FK art.  │                │
           disputas (155)    │ art_b FK art.  │  usuario_a/b    │
                             │ punto_enc(id)  │  CHAR(42)      │
                             │ estado 9 enums │                │
                             └───────┬────────┘                │
                    FK trueke_id     │ 1:N                     │
                     1:N             ▼                         │
                  valoraciones(129)  │            suscripciones(184) ── espejo
                                     │            campanas(197)      SuscripcionEmpresa
                                     │            subastas(210)      .Suscrita
                                     ▼
                        (eventos procesados)
                     auditoria (240) ── indexador_checkpoint (255)
```

Leyenda: `(n)` = línea de apertura de la tabla en `backend/db/schema.sql`; líneas continuas = FK con `REFERENCES` real; líneas punteadas = FK lógica sin constraint.

### 1.2 Tipos de clave presentes en el esquema

| Tipo de FK | Definición | Ejemplos |
|---|---|---|
| **FK real** (`REFERENCES`) | Constraint declarado en SQL | `kyc.usuario_id → usuarios.id` (84), `truekes.articulo_a_id → articulos.id` (114) |
| **FK lógica** (sin constraint) | Columna referencial sin `REFERENCES`; enforcement por aplicación | `articulos.imagen_certificacion_id` (102), `truekes.punto_encuentro_id` (122), `imagenes_certificadas.ref_id` (173) |
| **Dirección on-chain denormalizada** | `CHAR(42)` de wallet, sin FK a `usuarios` | `truekes.usuario_a/b` (116-117), `valoraciones.valorador/valorado` (132-133), `disputas.solicitante` (158), `auditoria.actor` (243) |

**Por qué las direcciones no son FK**: `usuarios.wallet` cambia cuando el Smart Account recupera/rota su owner (`OwnerActualizado`/`RecuperacionEjecutada`, `backend/indexador.js:115-121`); las tablas espejo conservan la dirección **que participó en el momento del evento** como valor histórico inmutable.

### 1.3 Cardinalidades presentes

- **1:N**: la relación dominante (usuario → sus tablas; trueque → valoraciones/disputas). Ver §2.
- **1:1**: `usuarios`–`finanzas` (PK compartida, `schema.sql:229`); `usuarios`–`kyc` (lógica: 1 fila KYC por usuario, sin `UNIQUE` en `usuario_id` → el esquema permite N); `articulos`–`imagenes_certificadas` (FK lógica `imagen_certificacion_id`, `schema.sql:102`).
- **N:M**: no hay tablas puente explícitas; el trueque es la **relación N:M usuario↔artículo resuelta con 2+2 columnas** en `truekes` (ver §4).
- **Polimorfismo**: `imagenes_certificadas(tipo, ref_id)` apunta a `articulos` (PUBLICACION) o `truekes` (RECEPCION) según `tipo` (`schema.sql:172-173`).

---

## 2. Relaciones 1:N reales (con `REFERENCES`)

### 2.1 Del lado de `usuarios` (tabla padre)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `usuarios` | `kyc` | `usuario_id` | 84 | Metadata KYC cifrada (D17) |
| `usuarios` | `articulos` | `usuario_id` | 98 | Publicaciones del usuario |
| `usuarios` | `puntos_encuentro` | `usuario_id` | 146 | Puntos registrados por el usuario |
| `usuarios` | `suscripciones` | `empresa_id` | 186 | Ciclos de suscripción de la empresa (D33) |
| `usuarios` | `campanas` | `usuario_id` | 200 | Campañas creadas (CU-09/10) |
| `usuarios` | `subastas` | `empresa_id` | 212 | Subastas de la empresa (RF-17) |
| `usuarios` | `subastas` | `ganador_id` | 220 | Ganador adjudicado (D27) |
| `usuarios` | `finanzas` | `usuario_id` (PK + FK) | 229 | Relación **1:1** por PK compartida |

### 2.2 Del lado de `articulos` (catálogo)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `articulos` | `truekes` | `articulo_a_id` | 114 | Oferta de la parte A |
| `articulos` | `truekes` | `articulo_b_id` | 115 | Oferta de la parte B |
| `articulos` | `subastas` | `articulo_id` | 213 | Artículo subastado |

### 2.3 Del lado de `truekes` (núcleo del intercambio)

| Padre | Hijo (1:N) | Columna FK | Línea | Notas |
|---|---|---|---|---|
| `truekes` | `valoraciones` | `trueke_id` | 131 | Valoraciones del trueque (D18/D36); `UNIQUE(trueke_id, valorador)` en 140 |
| `truekes` | `disputas` | `trueke_id` | 157 | Disputas del trueque (CU-18/19) |

---

## 3. FKs lógicas sin constraint SQL

| Columna | Tabla | Destino lógico | Línea | Riesgo / estado |
|---|---|---|---|---|
| `imagen_certificacion_id` | `articulos` | `imagenes_certificadas(id)` (1—1) | 102 | Comentario del esquema: "FK 1—1 imagenes_certificadas (D23)" — **sin `REFERENCES`** |
| `punto_encuentro_id` | `truekes` | `puntos_encuentro(id)` | 122 | **Sin `REFERENCES`**; punto acordado del encuentro (CU-16) |
| `ref_id` | `imagenes_certificadas` | `articulos.id` o `truekes.id` según `tipo` | 173 | Polimórfica; índice `(tipo, ref_id)` en 272 |
| `usuario_a`, `usuario_b` | `truekes` | `usuarios.wallet` (dirección) | 116-117 | Denormalizada a propósito (§1.2); índices en 266-267 |
| `valorador`, `valorado` | `valoraciones` | `usuarios.wallet` | 132-133 | Denormalizada |
| `solicitante` | `disputas` | `usuarios.wallet` | 158 | Denormalizada |
| `wallet` | `imagenes_certificadas` | `usuarios.wallet` | 176 | Autor de la certificación (D23) |
| `actor` | `auditoria` | `log.address` del evento | 243 | Dirección emisora; histórico |
| `escrow_id` | `truekes` | id del escrow on-chain (`Escrow`) | 113 | **Clave de integración con la cadena** (`NUMERIC UNIQUE NOT NULL`) |

---

## 4. El trueque: relación N:M resuelta y espejo del contrato

### 4.1 Resolución de la relación N:M usuario ↔ artículo

El intercambio AtoA es una relación **N:M entre usuarios y artículos** que el esquema resuelve con una sola fila en `truekes` que porta **cuatro referencias** (`backend/db/schema.sql:111-126`):

- `articulo_a_id` + `usuario_a` → qué ofrece la parte A y quién es.
- `articulo_b_id` + `usuario_b` → qué ofrece la parte B y quién es.
- `articulo_*_id` son FK reales a `articulos(id)` (`schema.sql:114-115`); `usuario_*` son direcciones on-chain (`CHAR(42)`, sin FK — §1.2).
- Cada trueque puede participar más de una vez como `articulo_a` o `articulo_b` en filas distintas (un artículo con `disponible=FALSE` queda excluido de nuevas ofertas — `schema.sql:104`).

### 4.2 `truekes` como espejo del contrato `Escrow`

- `truekes.escrow_id` = `id` on-chain del escrow (columna `NUMERIC UNIQUE` en `schema.sql:113`).
- El indexador inserta la fila con el evento `Escrow.TruekeCreado` (`backend/indexador.js:70-78`) y la actualiza con el mapa de eventos `backend/indexador.js:79-85`:
  `CustodiaA/B → CUSTODIADO`, `AperturaA/B → APERTURA`, `TruekeCompletado → COMPLETADO`, `TruekeCancelado → ANULADO`, `EscrowBloqueado → BLOQUEADO`.
- Timestamps de ventana: `AperturaA/B` también rellenan `apertura_a`/`apertura_b` (`backend/indexador.js:93-101`), base de las métricas de ventana (I3).
- Los 9 estados del enum canónico se definen en `backend/db/schema.sql:32-34` y en `enum Estado` de `sc/src/Escrow.sol:39-49` (ver Manual 05 §2.1).

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

---

## 6. Tablas off-chain escritas por el backend

| Tabla | Contenido | Dependencias | Notas de escritura |
|---|---|---|---|
| `articulos` | Catálogo AtoA (CU-06) | FK `usuarios`; FK lógica a `imagenes_certificadas` | CRUD del backend; `alta_disponibilidad` es computado (D19, `schema.sql:105`) |
| `valoraciones` | Valoración 1-5 (D18/D36) | FK `truekes` | Contenido off-chain; las marcas on-chain (`ValoracionMarcadaA/B`, `sc/src/Escrow.sol:100-101`) no se sincronizan en este ciclo (pendiente) |
| `puntos_encuentro` | Zonas (CU-16) | FK `usuarios` | Escritura por el usuario/backend; geografía PostGIS |
| `disputas` | Solicitudes de anulación (CU-18/19) | FK `truekes` | `registro_votos` JSONB es espejo de votos on-chain (D21); su llenado automatizado es **pendiente de confirmar** |
| `imagenes_certificadas` | Evidencia de imágenes (D23) | FK lógica polimórfica `(tipo, ref_id)` | Hash SHA-256 + firma ECDSA obligatorios (`schema.sql:174,177`); backend/IPFS; el anclaje on-chain de la raíz (D23) no está en los contratos de este ciclo (Manual 05 §4.3) |
| `campanas` | VENTA/RECOLECTA (CU-09/10) | FK `usuarios` | Backend; `estado` en texto libre |
| `subastas` | Subastas (RF-17, CU-25/26) | FK `usuarios` ×2, `articulos` | Backend; `pujas` JSONB; desempate por `nivel_ganador` (D27) |
| `finanzas` | Saldos por usuario | PK/FK `usuarios` | Parcialmente espejo (BRLT) — §5 |

---

## 7. PostGIS y la búsqueda de trueques por cercanía (≤10 km, RNF)

### 7.1 Columnas geográficas e índice

- `usuarios.geog` `GEOGRAPHY(Point,4326)` — dirección de inscripción del usuario (`backend/db/schema.sql:68`).
- `puntos_encuentro.geog` `GEOGRAPHY(Point,4326) NOT NULL` + `radio_km NUMERIC DEFAULT 10` (`backend/db/schema.sql:148-149`).
- Índice espacial: `CREATE INDEX idx_puntos_geog ON puntos_encuentro USING GIST(geog)` (`backend/db/schema.sql:271`) — requisito para que `ST_DWithin` sea eficiente.

### 7.2 Regla de negocio: distancia ≤ 10 km

- Consulta de referencia del propio esquema (`backend/db/schema.sql:274-276`):

  ```sql
  SELECT * FROM puntos_encuentro pe, usuarios u
   WHERE ST_DWithin(pe.geog, u.geog, 10000);
  ```

- La regla RF-08.3/08.4 exige que las partes de un trueque estén a ≤10 km; se implementa entre `puntos_encuentro.geog` y `usuarios.geog` (dirección de inscripción) y es **exclusivamente off-chain** (PostGIS) — `RepoTecnico/arquitectura_tecnica.md:285-288`.
- Rol en la **búsqueda de trueques**: (a) sugerir puntos de encuentro cercanos al usuario (CU-16); (b) filtrar ofertas/trueques viables por cercanía geográfica; (c) los establecimientos de retiro aprobados por Socios (CU-22, `aprobado_socios` en `schema.sql:150`) se buscan por el mismo radio.
- Exposición prevista en la API: `GET /puntos-encuentro/cercanos?lat&lng&radio` (diseño, `RepoTecnico/arquitectura_tecnica.md:391`); implementación del endpoint **pendiente de confirmar**.

### 7.3 Nota de diseño (geometría vs. geografía)

Las columnas usan el tipo `GEOGRAPHY`, por lo que las distancias de `ST_DWithin` se expresan en **metros** (`10000` = 10 km) y se calculan sobre el elipsoide, sin necesidad de reproyección — coherente con `radio_km` en la tabla (`schema.sql:149`).

---

## 8. Integridad, idempotencia y auditoría

### 8.1 Cadena de garantías del indexador (RNF-07.4 / H-16)

1. **Append-only**: `auditoria` acumula cada evento procesado (`backend/db/schema.sql:239-252`; RF-18.6).
2. **Idempotencia por evento**: `UNIQUE (tx_hash, log_index, entidad)` (`schema.sql:251`) + pre-chequeo y `ON CONFLICT DO NOTHING` (`backend/indexador.js:171-176, 42-47`).
3. **Idempotencia por escrow**: `truekes.escrow_id UNIQUE` con `ON CONFLICT DO UPDATE` (`schema.sql:113`; `backend/indexador.js:75`).
4. **Reproceso**: `indexador_checkpoint` guarda el último bloque por contrato (`backend/indexador.js:211-217`), permitiendo barrer desde bloque N.
5. **Reconciliación**: `reconciliar()` lee el espejo (`backend/indexador.js:222-230`); la comparación fina contra los getters del escrow se completa en C8 (pendiente de confirmar).

### 8.2 Restricciones CHECK y UNIQUE destacadas

| Restricción | Tabla | Línea | Efecto |
|---|---|---|---|
| `UNIQUE (tx_hash, log_index, entidad)` | `auditoria` | 251 | Idempotencia del indexador |
| `UNIQUE (escrow_id)` | `truekes` | 113 | Un escrow on-chain = una fila espejo |
| `UNIQUE (trueke_id, valorador)` | `valoraciones` | 140 | Un voto por valorador y trueque |
| `CHECK (… BETWEEN 1 AND 5)` ×5 | `valoraciones` | 134-138 | Escala 1-5 (D18) |
| `wallet UNIQUE NOT NULL` | `usuarios` | 64 | Una cuenta por dirección |

---

## 9. Caminos de lectura típicos (ejemplos con el código real)

| Consulta de negocio | Ruta en el modelo |
|---|---|
| Estado actual de un trueque | `truekes` por `escrow_id` o `id` → `estado` (enum 9 estados); KPIs de disputas leen el espejo: `backend/api/routes/admin.js:27-30` |
| Escalera D28 de un usuario | `usuarios.estado` (INSCRITO→VERIFICADO→CERTIFICADO) + `kyc.estado`/`merkle_root` (espejo de `SmartAccount.kycMerkleRoot`, `sc/src/SmartAccount.sol:51`) |
| ¿Quién participó y con qué? | `truekes.usuario_a/b` (direcciones) + `articulos` vía `articulo_a_id/b_id` |
| Valoraciones de un trueque | `valoraciones` por `trueke_id` (5 renglones 1-5); reputación media derivada (`backend/api/routes/reputacion.js:22-27`) |
| Búsqueda de trueques por cercanía | `ST_DWithin(puntos_encuentro.geog, usuarios.geog, 10000)` (≤10 km, RNF-08) + índice GIST `idx_puntos_geog` |
| Ciclo de suscripción de una empresa | `suscripciones` por `empresa_id` (ciclos 30 días, D33) |
| Evento procesado / reproceso | `auditoria` (eventos únicos) + `indexador_checkpoint` (último bloque por contrato) |

---

## 10. Resumen de relaciones por tabla (checklist)

| Tabla | PK | FKs reales (REFERENCES) | FKs lógicas / denormalizadas |
|---|---|---|---|
| `usuarios` | `id` | — | `wallet` (clave natural on-chain) |
| `kyc` | `id` | `usuario_id → usuarios` | `revisado_por` (wallet Owner), `merkle_root` (espejo) |
| `articulos` | `id` | `usuario_id → usuarios` | `imagen_certificacion_id → imagenes_certificadas` (1—1, D23) |
| `truekes` | `id` | `articulo_a_id`, `articulo_b_id → articulos` | `escrow_id` (on-chain), `usuario_a/b` (wallets), `punto_encuentro_id → puntos_encuentro` |
| `valoraciones` | `id` | `trueke_id → truekes` | `valorador`/`valorado` (wallets) |
| `puntos_encuentro` | `id` | `usuario_id → usuarios` | `geog` espacial |
| `disputas` | `id` | `trueke_id → truekes` | `solicitante` (wallet), `registro_votos` (espejo JSONB) |
| `imagenes_certificadas` | `id` | — | `ref_id` polimórfico `(tipo)`; `wallet` |
| `suscripciones` | `id` | `empresa_id → usuarios` | `tx_hash` (evento) |
| `campanas` | `id` | `usuario_id → usuarios` | `articulos` JSONB |
| `subastas` | `id` | `empresa_id → usuarios`, `articulo_id → articulos`, `ganador_id → usuarios` | `escrow_id` (on-chain), `nivel_ganador` (desempate D27) |
| `finanzas` | `usuario_id` (= FK) | `usuario_id → usuarios` | `nfts_stock`/`criptos`/`porcentajes_config` JSONB |
| `auditoria` | `id` | — | `actor` (log.address); UNIQUE idempotencia |
| `indexador_checkpoint` | `contrato` | — | — |
