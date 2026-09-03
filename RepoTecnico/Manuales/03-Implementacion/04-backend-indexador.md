# Manual Técnico 04 — Backend: Indexador de eventos (D25)

> **Alcance**: implementación real del indexador de eventos de TrueKeate (Ciclo 4) y su relación con el esquema PostgreSQL.
> **Fuentes leídas**: `backend/indexador.js`, `backend/indexador-cli.js`, `backend/db/schema.sql`, `backend/test/indexador.test.js`, `backend/contratos.json`, contratos en `sc/src/*.sol` (eventos), `RepoTecnico/arquitectura_tecnica.md` §5 (diseño de referencia).
> **Convención**: toda referencia `ruta:línea` apunta al código real. Lo que el código no implementa se marca **"pendiente de confirmar"** o se indica como diseño no cubierto en este ciclo.

---

## 1. Indexador de eventos (D25)

### 1.1 Rol y principios de diseño

- El indexador es un **listener Node.js propio** (decisión D25) que escucha los eventos on-chain de los contratos y actualiza PostgreSQL con el patrón de **lectura impulsada por eventos** (RNF-03.2). Ver cabecera del módulo en `backend/indexador.js:1-16`.
- La blockchain es la **única fuente de verdad** del estado del escrow (RNF-01.1): el indexador **nunca escribe en cadena**; su flujo es estrictamente *lectura de cadena → escritura en PostgreSQL* (`backend/indexador.js:7-8`).
- Garantías declaradas (RNF-07.4 / H-16) en `backend/indexador.js:10-15`:
  - Idempotencia por `(tx_hash, log_index, entidad)` mediante constraint UNIQUE en `auditoria`.
  - Checkpoints por contrato en `indexador_checkpoint` → reproceso desde bloque N.
  - Reconciliación periódica del estado espejo contra la cadena.
  - Métricas de lag (D15 / RF-18.1, H-17).

### 1.2 Arquitectura de archivos

| Archivo | Rol |
|---|---|
| `backend/indexador.js` | Clase `Indexador` + factory `crearIndexador` (lógica de procesamiento) |
| `backend/indexador-cli.js` | Punto de entrada CLI: barrido único o modo servicio (`--watch`) |
| `backend/db/schema.sql` | Tablas `auditoria`, `indexador_checkpoint` y tablas espejo |
| `backend/contratos.json` | Registro `{ entidad: { direccion, abi } }` que alimenta el indexador |
| `backend/test/indexador.test.js` | Suite node:test (5/5) con pool en memoria |

### 1.3 Clase `Indexador` y su constructor

- La clase se construye con tres dependencias inyectadas: `provider` (ethers `JsonRpcProvider`), `pool` (Pool de `pg`) y `contratos` (`{ entidad: { direccion, abi } }`) — `backend/indexador.js:26-35`.
- Estado interno de la instancia: `procesados`, `eventosFallidos`, `ultimoCheckpoint` y `activo` (`backend/indexador.js:31-34`).
- La factory `crearIndexador(pool, contratos)` crea un `ethers.JsonRpcProvider` apuntando a `RPC_URL` (`backend/indexador.js:249-253`).

### 1.4 Configuración por variables de entorno

| Variable | Default | Uso |
|---|---|---|
| `RPC_URL` | `http://127.0.0.1:8545` | RPC del nodo (anvil en dev, chain 31337) — `backend/indexador.js:19` |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/postgres` | Conexión PostgreSQL — `backend/indexador.js:20-22` |
| `CHECKPOINT_STEP` | `50` | **Declarado pero sin uso en este ciclo** — `backend/indexador.js:23` (ver §5.3) |
| `CONTRATOS_FILE` | `./contratos.json` | JSON `{ entidad: { direccion, abi } }` — `backend/indexador-cli.js:12` |
| `INTERVALO_MS` | `5000` | Período del barrido en modo servicio — `backend/indexador-cli.js:14` |
| `DESDE_BLOQUE` | `0` | Bloque inicial del barrido — `backend/indexador-cli.js:15` |

### 1.5 Entrada CLI (`indexador-cli.js`)

- **Modo barrido único**: `node indexador-cli.js` ejecuta un ciclo (barrido de todos los contratos + métricas + reconciliación) y termina cerrando el pool (`backend/indexador-cli.js:19-39`).
- **Modo servicio**: `node indexador-cli.js --watch` repite el ciclo cada `INTERVALO_MS` con `setInterval` (`backend/indexador-cli.js:32-38`).
- Cada ciclo recorre todas las entidades del archivo de contratos, llama a `idx.barrerDesde(entidad, DESDE_BLOQUE)`, imprime métricas de lag y ejecuta `reconciliar('Escrow')` (`backend/indexador-cli.js:23-30`).
- Los errores fatales terminan con código de salida 1 (`backend/indexador-cli.js:42-44`).

---

## 2. Ciclo de procesamiento de un log

### 2.1 Flujo de `procesarLog(entidad, log)`

El método central procesa un log recibido de la cadena en pasos sucesivos (`backend/indexador.js:163-188`):

1. **Resolución del contrato**: si `entidad` no existe en `this.contratos` devuelve `false` (`backend/indexador.js:165-166`).
2. **Parseo**: crea `ethers.Interface` con el ABI y parsea topics+data con `iface.parseLog`; si no parsea devuelve `false` (`backend/indexador.js:167-169`).
3. **Idempotencia**: consulta `SELECT 1 FROM auditoria WHERE tx_hash=$1 AND log_index=$2 AND entidad=$3`; si ya existe, el evento **se omite** devolviendo `false` (`backend/indexador.js:171-176`).
4. **Aplicación + registro**: llama a `_aplicarEvento(entidad, nombre, args, log)` y después a `_registrarProcesado(...)`; incrementa `procesados` y devuelve `true` (`backend/indexador.js:178-182`).
5. **Manejo de errores**: ante excepción incrementa `eventosFallidos` y registra el fallo en consola con bloque, devolviendo `false` (`backend/indexador.js:183-187`). El fallo de una aplicación NO rompe el barrido.

### 2.2 Registro en `auditoria` (idempotencia)

- `_registrarProcesado` inserta la fila de auditoría con el payload serializado; los valores `bigint` de los `args` se convierten a `string` para JSON (`backend/indexador.js:38-48`).
- La idempotencia real se apoya en dos mecanismos que **conviven**:
  1. Pre-chequeo en `procesarLog` (`backend/indexador.js:172-176`).
  2. Constraint `UNIQUE (tx_hash, log_index, entidad)` en la tabla + `ON CONFLICT ... DO NOTHING` en el INSERT (`backend/db/schema.sql:251`, `backend/indexador.js:45`).
- La tabla `auditoria` es **append-only** (RF-18.6): `entidad`, `evento`, `actor`, `tx_hash`, `bloque`, `log_index`, `payload JSONB`, `procesado`, `procesado_at` (`backend/db/schema.sql:239-252`).

### 2.3 Despacho por entidad (`_aplicarEvento`)

- El despacho por entidad soporta 5 contratos; cualquier otra entidad devuelve `0` filas afectadas sin error (`backend/indexador.js:51-66`):
  - `Escrow`, `SmartAccount`, `SociosRegistry`, `BRLT`, `SuscripcionEmpresa`.

---

## 3. Mapeo de eventos → tablas del schema.sql

### 3.1 Mapa completo de las 14 tablas

El `schema.sql` define 14 tablas (`backend/db/schema.sql`): `usuarios`, `kyc`, `articulos`, `truekes`, `valoraciones`, `puntos_encuentro`, `disputas`, `imagenes_certificadas`, `suscripciones`, `campanas`, `subastas`, `finanzas`, `auditoria` e `indexador_checkpoint`.

- **Tablas que escribe el indexador en el código actual** (7): `truekes`, `usuarios`, `kyc`, `finanzas`, `suscripciones`, `auditoria`, `indexador_checkpoint`.
- **Tablas off-chain escritas por el backend** (las restantes): `articulos`, `valoraciones`, `puntos_encuentro`, `disputas`, `imagenes_certificadas`, `campanas`, `subastas` (ver manual 06-backend-api.md).

### 3.2 Eventos de `Escrow` → tabla espejo `truekes`

- **`TruekeCreado(id, parteA, parteB, ...)`** → `INSERT INTO truekes (escrow_id, usuario_a, usuario_b, estado, tx_hash, bloque)` con estado `'CREADO'`; `ON CONFLICT (escrow_id) DO UPDATE SET estado='CREADO'` (`backend/indexador.js:69-78`). Nota: el evento on-chain emite 6 argumentos (`sc/src/Escrow.sol:93`); el indexador solo consume `[id, parteA, parteB]`.
- **Mapa de eventos de estado** (`backend/indexador.js:79-92`):

| Evento on-chain | Estado espejo |
|---|---|
| `CustodiaA` / `CustodiaB` | `CUSTODIADO` |
| `AperturaA` / `AperturaB` | `APERTURA` |
| `TruekeCompletado` | `COMPLETADO` |
| `TruekeCancelado` | `ANULADO` |
| `EscrowBloqueado` | `BLOQUEADO` |

  → Todos se aplican como `UPDATE truekes SET estado=$2, updated_at=now() WHERE escrow_id=$1` (`backend/indexador.js:87-91`).

- **`AperturaA` / `AperturaB(id, timestamp)`** → además del estado, se registra el timestamp en `apertura_a` / `apertura_b` con `to_timestamp($2)` (`backend/indexador.js:93-101`). Nota: estos eventos se procesan por dos vías (mapa de estados + bloque de timestamps); los eventos de apertura reales llevan 2 argumentos (`sc/src/Escrow.sol:96-97`) y el bloque de estados solo lee `args[0]` (id), por lo que ambos caminos coexisten sin conflicto.
- La tabla `truekes` guarda el espejo: `escrow_id` (NUMERIC UNIQUE), `usuario_a`, `usuario_b`, `estado` (ENUM `estado_escrow` con los 9 estados canónicos: CREADO, ACTIVO, CUSTODIADO, APERTURA, EN_DISPUTA, RESOLUCION_SOCIOS, COMPLETADO, ANULADO, BLOQUEADO — `backend/db/schema.sql:31-35`), `hora_pautada`, `apertura_a/b`, `tx_hash`, `bloque` (`backend/db/schema.sql:110-126`).

### 3.3 Eventos de `SmartAccount` → `usuarios` y `kyc`

- **`MerkleRootActualizado(root, estado)`** → `UPDATE kyc SET merkle_root=$1 WHERE usuario_id IN (SELECT id FROM usuarios WHERE smart_account=$2)`; la raíz hex se convierte a bytes (`root.slice(2)` → hex) (`backend/indexador.js:106-114`). El evento on-chain existe en `sc/src/SmartAccount.sol:61`.
- **`OwnerActualizado(nuevoOwner)` y `RecuperacionEjecutada(nuevoOwner)`** → `UPDATE usuarios SET wallet=$1 WHERE smart_account=$2` (la wallet del usuario pasa a ser el nuevo owner de la smart account tras la recuperación) (`backend/indexador.js:115-121`). Ambos eventos existen en `sc/src/SmartAccount.sol:59,65`.

### 3.4 Evento de `SociosRegistry` → `usuarios`

- **`SocioAdmitido(socio)`** → `UPDATE usuarios SET tipo='SOCIO' WHERE wallet=$1` (`backend/indexador.js:126-135`). El evento existe en `sc/src/SociosRegistry.sol:45`. Marca la admisión de socios en el espejo (CU-03).

### 3.5 Evento de `BRLT` → `finanzas`

- **`EmisionRegistrada(id, monto, proposito, destino)`** → suma el monto a `finanzas.brlt` del primer usuario con `tipo='SOCIO'` (`UPDATE finanzas SET brlt = COALESCE(brlt,0) + $1 WHERE usuario_id IN (SELECT id FROM usuarios WHERE tipo='SOCIO' LIMIT 1)`) (`backend/indexador.js:138-148`). El evento existe en `sc/src/BRLT.sol:39`.
- **Advertencia de fidelidad**: el diseño §5 (arquitectura) prevé derivar además el **5 % de emisión al `fondo_valor`** (D7); el código actual solo acumula `brlt` y **no actualiza `fondo_valor` ni los porcentajes** → pendiente de confirmar en ciclos posteriores.

### 3.6 Evento de `SuscripcionEmpresa` → `suscripciones`

- **`Suscrita(empresa, montoBloqueado, cicloInicio)`** → inserta la suscripción con `empresa_id` resuelto por wallet, `ciclo_inicio = to_timestamp(cicloInicio)` y `ciclo_fin = to_timestamp(cicloInicio + 2592000)` (30 días en segundos) con estado `'ACTIVA'` (`backend/indexador.js:151-161`). El evento existe en `sc/src/SuscripcionEmpresa.sol:54`.
- La tabla `suscripciones` está definida en `backend/db/schema.sql:183-194` (incluye `plan`, `monto`, `ciclo_inicio/fin`, `tx_hash`, ENUM `estado_suscripcion`).

### 3.7 Checkpoints (`indexador_checkpoint`)

- La tabla guarda por contrato `ultimo_bloque` (y `ultimo_log_index` en esquema) (`backend/db/schema.sql:254-260`).
- El código actual solo escribe/lee `ultimo_bloque` (`backend/indexador.js:211-219`, `237-243`); el campo `ultimo_log_index` está definido en el esquema pero **no se actualiza en este ciclo**.

### 3.8 Cobertura de eventos vs. diseño (§5 de arquitectura)

El diseño de referencia lista más eventos (`SolicitudAnulacion`, `VotoSocio`, `ResolucionEjecutada`, `ResolucionPorDefecto`, `SancionProgramada/SancionEjecutada`, `RecepcionFirmadaA/B`, `ValoracionMarcadaA/B`, `CierreIrregular`, `Transfer` de BRLT, `CicloRecolectado`…) que **no están mapeados** en el código actual del indexador (`backend/indexador.js:69-161`). Los eventos de disputa y gobernanza existen on-chain (`sc/src/Escrow.sol:105-109`) pero su efecto sobre `disputas`/`imagenes_certificadas`/`subastas` **no está implementado** → "pendiente de confirmar".

---

## 4. Checkpoints y reproceso desde bloque N (RNF-07.4)

### 4.1 Barrido `barrerDesde(entidad, desdeBloque)`

- Por cada evento del ABI del contrato (filtrados por `type === 'event'` y su `sighash` como topic0), consulta `provider.getLogs({ address, topics: [topic0], fromBlock, toBlock: 'latest' })` y procesa cada log con `procesarLog` (`backend/indexador.js:191-209`).
- Al terminar el barrido de un contrato, actualiza el checkpoint con el último bloque de la cabeza (`getBlockNumber`) mediante `INSERT ... ON CONFLICT (contrato) DO UPDATE` y guarda el valor en memoria (`backend/indexador.js:210-219`).

### 4.2 Nota de eficiencia y reproceso

- En modo `--watch`, cada ciclo vuelve a barrer **desde `DESDE_BLOQUE`** (default 0) para cada contrato (`backend/indexador-cli.js:23-30`), es decir, **re-consulta todo el rango de bloques en cada ciclo**; la idempotencia evita duplicados pero el coste de RPC no está acotado por checkpoint en este ciclo. El uso del checkpoint para **continuar desde el último bloque procesado** (reproceso incremental) no está implementado → pendiente de confirmar.

---

## 5. Reconciliación y métricas de lag

### 5.1 `reconciliar(entidad)`

- Estado actual: consulta el espejo (`SELECT COUNT(*) , MIN(updated_at) FROM truekes`) y devuelve el resumen; el comentario del código indica que la **reconciliación fina por trueke** (comparar estado on-chain leído con getters del escrow vs. espejo) se completa en C8 (`backend/indexador.js:222-230`).
- **Estado real**: la comparación contra la cadena (única fuente de verdad, RNF-01.1) **no está implementada** → pendiente de confirmar.

### 5.2 `metricasLag()` (D15 / H-17)

- Calcula la cabeza de la cadena, y por contrato el lag = `cabeza − ultimo_bloque` del checkpoint (0 si no hay checkpoint); devuelve `{ cabeza, lag, procesados, fallidos }` (`backend/indexador.js:232-245`).
- Consumidores: el dashboard del Owner expone estas métricas en `GET /admin/infra/health` vía `indexador.metricasLag()` (`backend/api/routes/admin.js:43-49`) — ver manual 06.

### 5.3 Constantes sin uso

- `CHECKPOINT_STEP` se define en `backend/indexador.js:23` pero no se referencia en ninguna otra línea del módulo → variable muerta en este ciclo.

---

## 6. Esquema PostgreSQL de soporte (resumen)

### 6.1 Extensiones y ENUMs

- Extensiones `postgis` y `pgcrypto` (`backend/db/schema.sql:9-10`).
- ENUMs creados con bloque `DO $$ ... EXCEPTION WHEN duplicate_object` para idempotencia de migración: `tipo_usuario`, `nivel_usuario`, `medalla_usuario`, `estado_verificacion` (escalera D28), `estado_escrow` (9 estados), `estado_kyc`, `tipo_imagen`, `estado_suscripcion`, `tipo_campana`, `estado_subasta` (`backend/db/schema.sql:12-55`).

### 6.2 Índices

- Índices de apoyo: `truekes(estado)`, `truekes(usuario_a/b)`, `usuarios(estado)`, `articulos(rubro)`, `auditoria(tx_hash, log_index)`, GIST sobre `puntos_encuentro(geog)` (PostGIS, regla ≤10 km RF-08.3/08.4) e `imagenes_certificadas(tipo, ref_id)` (`backend/db/schema.sql:265-272`).
- La consulta PostGIS de ejemplo de distancia ≤10 km queda comentada al final del archivo (`backend/db/schema.sql:274-276`).

---

## 7. Suite de pruebas del indexador (5/5)

- Archivo: `backend/test/indexador.test.js`. Ejecución verificada en este análisis: **5/5 verdes** (suite total backend 26/26 — ver manual 08-pruebas).
- **Pool en memoria** (`crearPoolMemoria`, `backend/test/indexador.test.js:18-59`) que simula `auditoria`, `truekes` e `indexador_checkpoint` sin PostgreSQL real; el proveedor mock devuelve logs fabricados y `getBlockNumber() = 100` (`backend/test/indexador.test.js:66-73`).
- Los ABIs se cargan desde los artefactos de Forge (`sc/out/<Contrato>.sol/<Contrato>.json`) (`backend/test/indexador.test.js:61-64`).
- Casos:
  1. `TruekeCreado` → INSERT en `truekes` con estado CREADO y registro en auditoría (`backend/test/indexador.test.js:101-112`).
  2. Idempotencia: el mismo evento no se re-aplica (UNIQUE tx/log/entidad) (`backend/test/indexador.test.js:114-125`).
  3. Mapeo `CustodiaA/B` → CUSTODIADO y `TruekeCompletado` → COMPLETADO (`backend/test/indexador.test.js:127-145`).
  4. `barrerDesde` actualiza checkpoint y métricas de lag (`backend/test/indexador.test.js:147-164`).
  5. Evento de contrato desconocido no falla (`backend/test/indexador.test.js:166-173`).

---

## 8. Limitaciones y pendientes observados

- **Sin suscripción en tiempo real**: el indexador no usa `provider.on(...)`; el único disparo es el polling del CLI (`--watch`) o el barrido único (manual de despliegue 04-despliegue).
- **Reorgs sin manejo**: el diseño H-16 prevé retroceso a checkpoint seguro ante reorganización; no hay código que lo implemente.
- **Reconciliación fina pendiente**: `reconciliar` solo cuenta filas del espejo (`backend/indexador.js:222-230`).
- **Checkpoint incremental pendiente**: `barrerDesde` parte siempre de `DESDE_BLOQUE` configurado (`backend/indexador.js:191-209`).
- **Cobertura parcial de eventos**: disputas, resoluciones, sanciones, recepciones firmadas y valoraciones on-chain no se reflejan aún en `disputas`, `imagenes_certificadas`, `valoraciones` ni `finanzas.fondo_valor`.
- **`CHECKPOINT_STEP` sin uso** (`backend/indexador.js:23`).
- **BD objetivo**: el esquema declara como destino `mcc-postgres` (D25/RT-02.8, `backend/db/schema.sql:6`); en los tests no se conecta PostgreSQL real (pool simulado) → la ejecución real contra Postgres **no se verificó en este entorno**.
