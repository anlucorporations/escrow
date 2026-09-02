# TrueKeate — Documento de Arquitectura Técnica (Diseño para la Fase 3 · Desarrollo)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** |
| Documento | `RepoTecnico/arquitectura_tecnica.md` |
| Tipo | Documento de diseño técnico — **Fase 3 (Desarrollo)** |
| Rol autor | Arquitecto de software senior |
| Fuentes | `requerimientos.md` (RF-01…RF-19, RNF-01…RNF-08, RT-01…RT-05, R1–R13, D1–D41) · `diccionario_datos.md` · `casos_uso.md` (CU-01…CU-31) · `entornos_globales.md` · `escrow_estados.puml` · `PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` (RNF-08) · `TrueKeate/` (RF-19) · `INFORME_OPTIMIZACION_V1.md` (referencia de no repetición de errores) |
| Rama de trabajo | `escrow-dsh-GCP` (D8) — GitHub y GitLab.com (`anlucorporations/escrow`) |
| Estado | Documento de arquitectura **válido al 100 %** — base para planificar los ciclos C1–C8 de la Fase 3 (pendientes D32–D40 resueltos; ver §10) |

> Convención de trazabilidad: cada elemento se cita con su ID de origen, p. ej. "(RF-09.6, D29)".
> Toda alternativa de diseño que **no** esté cerrada por un RF/RNF/RT/D existente se marca
> explícitamente como **PENDIENTE DE DECISIÓN** (no es un requerimiento; debe resolverse en la
> planificación de la Fase 3, idealmente en acta).

---

## 1. Propósito y alcance

Este documento es el **diseño técnico de referencia para la Fase 3 (Desarrollo)** del proyecto
TrueKeate: una DApp Web3 de trueques (intercambio de Bienes, Productos, Servicios y Criptos/NFTs)
con custodia en un contrato **escrow** hasta la firma dual de recepción, donde **la blockchain es la
única fuente de verdad de los estados del escrow** (RNF-01.1) y PostgreSQL es la base de **lectura
impulsada por eventos** (RNF-03.2, RT-02.3).

Alcance del documento:

1. **Contratos inteligentes** (on-chain): Escrow, SmartAccount ERC-4337, BRLT (ERC-20),
   SuscripcionEmpresa, certificación de imágenes (acumulador merkle) y el contrato de Socios
   (gobernanza) que exige RF-12.1/D6.
2. **Indexador de eventos propio en Node.js** (D25, RT-02.4) y su efecto sobre PostgreSQL.
3. **Modelo PostgreSQL** (off-chain) con PostGIS, cifrado en reposo de PII (D17) y objetivos de
   backup/recuperación (RNF-07).
4. **Relayer EIP-712 propio** (sin SaaS — D22, RT-03.2, RNF-05.1) con las 4 protecciones
   anti-abuso (D16) y los límites D29.
5. **Backend API (Node.js)**, servicios de apoyo (geocodificación, IPFS, códigos, KYC).
6. **Frontend Next.js 16 + TypeScript + Tailwind v4 + ethers v6** (D1, RT-01, RT-04).
7. **Seguridad y cumplimiento** operativo (resumen) y **plan de implementación por ciclos**.

No es alcance de este documento: la auditoría externa (Fase 4 — RF-18.6), los manuales (fase de
manuales) ni la definición de precios/planes comerciales (marcados como pendientes donde apliquen).

---

## 2. Vista general de la arquitectura

```mermaid
flowchart TB
    subgraph CLIENTE["Clientes"]
        W["Frontend Web<br/>Next.js 16 + TS + Tailwind v4 + ethers v6<br/>(lib/ethereum.tsx: MetaMask + auto-reconexión)"]
        APK["Wallet móvil (MetaMask mobile)<br/>firma delegada (D40)"]
        MM["MetaMask (browser) / wallet"]
    end

    subgraph BACK["Capa Backend (Node.js propio — D22/D25)"]
        API["Backend API REST/JSON<br/>(auth, KYC 2 etapas, publicaciones,<br/>trueques, disputas, subastas, campañas)"]
        REL1["Relayer EIP-712 — instancia 1"]
        REL2["Relayer EIP-712 — instancia 2"]
        COL["Cola de reintentos + health-check<br/>(SLA ≥ 99% — D15)"]
        IDX["Indexador de eventos<br/>(listener Node.js propio — D25)"]
    end

    subgraph CHAIN["Blockchain — única fuente de verdad (RNF-01.1)"]
        SC["Contratos:<br/>Escrow · SmartAccount ERC-4337 · BRLT ERC-20<br/>SuscripcionEmpresa · Socios (gobernanza) ·<br/>Acumulador merkle de imágenes"]
    end

    subgraph OFF["Off-chain — volumen (RNF-03.1)"]
        PG[("PostgreSQL mcc-postgres<br/>lectura por eventos + PostGIS<br/>(reusado — D25/RT-02.8)")]
        IPFS["IPFS con pinning propio<br/>(servicio open source — D23/RNF-05.1)"]
        SEC["GCP Secret Manager<br/>(RELAYER/ADMIN_PRIVATE_KEY — RF-18.5)"]
    end

    W -->|HTTPS autenticado + rate-limiting| API
    W -->|EIP-1193 provider/signer/account| MM
    APK -->|firma| W
    API -->|submit intent firmado EIP-712| REL1
    API -->|submit intent firmado EIP-712| REL2
    REL1 <--> COL
    REL2 <--> COL
    COL -->|tx asumiendo gas (cuenta 1 anvil — RF-15.2)| SC
    API -->|despliegues/lecturas| SC
    SC -.->|eventos| IDX
    IDX -->|UPSERT idempotente (txHash/logIndex)| PG
    API --> PG
    API <--> IPFS
    REL1 -.-> SEC
    REL2 -.-> SEC
    IDX -.-> SEC
```

Lectura del diagrama (componentes):

- **Frontend (Next.js 16)**: aplica el stack RT-01 (D1) con ethers v6; gestiona MetaMask y la
  auto-reconexión (RF-16.1/16.2, RT-04.4); en móvil la firma se delega a la wallet móvil
  (MetaMask mobile) en la **PWA instalable (D40)**. El usuario
  **firma intents sin gas**; nunca envía transacciones pagando gas (salvo Empresa — R1, RF-09.3).
- **Backend API**: lógica off-chain (KYC, geolocalización, IPFS, códigos, reputación, subastas
  off-chain de pujas previas a custodia) y única puerta de entrada al relayer.
- **Relayer EIP-712 (2 instancias)**: envía las transacciones **asumiendo el gas** desde la
  **cuenta 1** del anvil (RF-15.2, RF-09.2), validando las 4 protecciones anti-abuso (D16) y los
  límites de D29; el **fondo de valor** financia el gas con alerta de saldo bajo (D7, D15).
- **Contratos**: despliegue de pruebas sobre el **nodo anvil (chain 31337)** del entorno GCP
  `truekeate-main` (D10, RT-05.1/05.2); la cuenta 0 despliega como Owner (RF-15.1).
- **Indexador (listener Node.js propio — D25)**: escucha los eventos de cada contrato y actualiza
  PostgreSQL de forma **idempotente**, con reproceso y reconciliación (RNF-07.4); nunca escribe
  estado en cadena (la cadena sigue siendo la única fuente de verdad — RNF-01.1).
- **PostgreSQL `mcc-postgres` reutilizado** (D25, RT-02.8) con **PostGIS** (RT-02.5) para la regla
  de ≤10 km (RF-08.3/08.4) y **cifrado en reposo de PII** (D17).
- **IPFS con pinning propio** (servicio open source, sin SaaS comercial — D23, RNF-05.1/RT-02.6).

Principio rector: **on-chain = estados y custodia (mínimo gas, RNF-03.1); off-chain = volumen**
(publicaciones, chat, KYC cifrado, geolocalización, pujas auxiliares, estadísticas — RF-05.6,
RT-02.2). Ninguna actualización de PostgreSQL altera el estado del escrow (RNF-01.1).

---

## 3. Contratos inteligentes (diseño)

Directrices comunes (RNF-01.2, RT-01.3): Solidity con Foundry (RT-01.1/01.2) y librerías estándar
**OpenZeppelin** (Ownable, ReentrancyGuard, IERC20/ERC20, EIP712). Sin `paymaster`/`bundler`
externo ni SaaS (D22, RNF-05.1). Toda función que libera fondos queda tras `ReentrancyGuard` y se
gobierna por la máquina de estados.

### 3.1 `Escrow.sol` — máquina de estados del trueque

Modelo de estados según `escrow_estados.puml` (RF-05, RF-06, D13, D21, D26):

```
CREADO / ACTIVO → CUSTODIADO → APERTURA ──→ COMPLETADO (firmas duales + marcador "ambas valoraron", D36)
                                  │
                                  ├─→ EN_DISPUTA → RESOLUCION_SOCIOS ──→ ANULADO (quórum ≥2/3, D13)
                                  │                                     ├─→ ANULADO (por defecto a los 5 días, D26)
                                  │                                     ├─→ BLOQUEADO (sanción, timelock 6h)
                                  │                                     └─→ COMPLETADO (quórum rechaza anulación)
CUSTODIADO ─→ BLOQUEADO (violación de norma RF-05.8)
APERTURA  ─→ BLOQUEADO (violación de norma)
Terminales: COMPLETADO · ANULADO · BLOQUEADO
```

Funciones principales (cada una emite eventos para el indexador, §5):

| Función | Semántica | Trazabilidad |
|---|---|---|
| `crearTrueke(...)` | Registra acuerdo CREADO/ACTIVO con `parteA`, `parteB`, `horaPautada`; exige partes verificadas | RF-05.1, RF-01.2, D14, CU-11 |
| `custodiarA()` / `custodiarB()` | Recibe el NFT/cripto ofrecido en custodia → `CUSTODIADO` (al custodiar B ambos activos quedan custodiados) | RF-05.2, CU-12 |
| `aperturaA()` / `aperturaB()` | Registra apertura on-chain con ventanas: **≤10 min de la hora pautada** y **≤10 min de diferencia** entre aperturas → `APERTURA` | RF-05.7, R5, RNF-06.2, CU-13 |
| `firmarRecepcionA()` / `firmarRecepcionB()` | Cada parte firma recepción correcta (tras certificación de imagen, §3.6); con ambas firmas el contrato **libera los activos** (transferencia cruzada) | RF-05.2/05.4, CU-14 |
| `marcarValoracion(...)` + `cerrarTrueke()` | La valoración (5 renglones 1–5: aceptación del producto, honestidad publicitaria, seguridad, confiabilidad, compromiso — RF-07.2/D18) es requisito del cierre; **aprobado (D36)**: el detalle de los 5 renglones se registra **off-chain en PostgreSQL** y el contrato solo registra el **marcador on-chain "ambas partes valoraron"** (eventos `ValoracionMarcadaA/B`) como condición para `COMPLETED` | RF-07.1, RNF-06.1, RF-03.4 (efectivo), CU-15, D36 |
| `solicitarAnulacion(motivo)` | `EN_DISPUTA` con `solicitanteAnulacion`; fija plazo de resolución **≤5 días** | RF-06.1, D13, CU-18 |
| `votarSocio(decision)` | Votación en `RESOLUCION_SOCIOS`: **1 voto por Socio** (D21); se aprueba con **quórum ≥2/3** del padrón vigente del contrato de Socios | RF-06.2, D21, CU-18/CU-19 |
| `resolver()` | Ejecuta la resolución: anulación (devolución de NFTs a ambas billeteras), rechazo (continúa cierre) o sanción | RF-06.1/06.3, D21 |
| `resolverPorDefecto()` | **Si vencen los 5 días sin quórum → `ANULADO` por defecto**, NFTs devueltos a ambas partes (cierre en tiempo finito garantizado); ejecutable por cualquiera (keeper/relayer) | **D26**, RF-05.2b, CU-18 A1 |
| `bloquear(...)` / `autorizarCierreIrregular()` | Moderación: `BLOQUEADO` congelando activos; cierre irregular consentido por ambas partes (no efectivo) o elevación a disputa | RF-05.8, RF-18.2, CU-17 |
| `programarSancion()` / `ejecutarSancion()` | Sanciones ejecutadas **on-chain por el contrato tras la resolución con timelock de 6 h** (revisables antes de vencer) | RF-06.3, D21, CU-19 |

**Invariantes de no-liberación (aserciones de contrato + tests de invariantes — RNF-04.1):**

- I1. Nunca se libera un activo custodiado sin (a) firmas de recepción de **ambas** partes, o
  (b) resolución aprobada con quórum (nunca liberación unilateral — H-05/RF-05.2).
- I2. Una vez custodiados los activos, **no existe cancelación unilateral** (D31, RF-05.3): la única
  salida es anulación con quórum o resolución de disputa (CU-18/CU-19).
- I3. Apertura: `|aperturaX − horaPautada| ≤ 10 min` y `|aperturaB − aperturaA| ≤ 10 min` (R5).
- I4. Toda solicitud de anulación se resuelve en **≤5 días**; sin quórum → `ANULADO` (D26).
- I5. Sanción ejecutable solo tras **6 h** desde la resolución (D21).
- I6. Solo Socios del padrón vigente votan, **1 voto por Socio**, sin ponderación por nivel (D21).
- I7. El cierre `COMPLETED` requiere valoración registrada por ambas partes (RNF-06.1) → cuenta como
  "intercambio efectivo" solo con firmas + valoración (RF-03.4, D12).

### 3.2 `SmartAccount.sol` (patrón ERC-4337 — wallet de identidad)

- Cada usuario particular posee una Smart Account desplegada como su **wallet de identidad**
  (RF-02.1, D22; despliegue por meta-tx del relayer, sin costo para el particular — CU-01).
- La cuenta **verifica la firma EIP-712 del owner** y ejecuta llamadas arbitrarias con
  **nonce por cuenta** (anti-replay — D16): es el mecanismo que el relayer aprovecha para enviar la
  transacción asumiendo el gas (RF-02.3, RF-09.2). No se despliega EntryPoint/bundler externo:
  el relayer propio desempeña ese rol de envío. **Aprobado (D35)**: la Smart Account es
  **inspirada en ERC-4337** (misma seguridad/recuperación) **sin adoptar el EntryPoint estándar**;
  se usa el patrón de ejecución por firma EIP-712 con el relayer propio (RF-02.3, D22).
- **Estado de verificación por merkle root** (RF-01.7): el Smart Account guarda `kycMerkleRoot`
  que compromete el estado del usuario de la escalera **INSCRITO / VERIFICADO / CERTIFICADO** (D28)
  y el hash de su metadata KYC, **sin revelar identidad real** (RNF-01.3/01.4). El contrato Escrow
  consulta este estado on-chain para admitir operaciones (RF-01.2, RF-14.3–14.5, D14).
- **Recuperación social/guardianes** (RF-02.2, CU-04): guardianes designados aprueban el
  restablecimiento del owner **sin mover fondos**; la vía vinculada a KYC exige verificación con
  revisión humana del Owner (RF-18.4) y nunca es automática solo con datos (H-18). Parámetros
  **aprobados (D34)**: **3 guardianes**, **umbral 2 de 3**, **timelock de aviso 48 h** antes de
  ejecutar el cambio de owner.

### 3.3 `BRLT.sol` (ERC-20 — BorloTokens)

- Stablecoin **emitida desde el inicio del proyecto**, controlada por el **contrato de Socios**
  (D6, RF-12.1/12.4): `mint`/ajuste de valor solo invocables por el contrato de Socios tras
  autorización de estos (RF-12.3, CU-31); rechaza cualquier otra cuenta.
- Mecanismo de decisión sobre emisión/valor: **multisig on-chain de Socios** (voto sin ponderación
  por nivel, según principio de gobernanza D21). **Aprobado (D32)**: el quórum de emisión/valor es
  el **mismo ≥2/3 de D21**; **tope inicial de emisión 1.000.000 BRLT**; el aumento del tope exige
  votación de ≥2/3 de Socios; **cada emisión se registra con su propósito** (RF-12.3, CU-31).
- El nivel **Frecuente** puede ofrecer artículos por **BRLT** (RF-12.2, RF-03.8); el saldo BRLT es
  visible/gestionable solo para **Socios y Owner** (RF-14.7, D5).
- La emisión contribuye el **5% al fondo de valor** (D7, §6).
- Implementación con OpenZeppelin ERC20 + Ownable delegado al contrato de Socios (RNF-01.2).

### 3.4 `SuscripcionEmpresa.sol` (patrón EIP-1337 / staking bloqueado)

- Cobro automático del plan de empresa **cada 30 días sin firma manual** (RF-10.1, R2, CU-24).
- Diseño base: **staking bloqueado** (la empresa deposita/cubre el período con aprobación ERC-20;
  una función `recolectarCiclo(empresa)` llamable por keeper/relayer o el backend transfiere el
  monto periódico al vencer los 30 días). **Aprobado (D33)**: se adopta **staking bloqueado**
  (EIP-1337 es borrador — H-45); se descarta EIP-1337 por simplicidad y menor riesgo normativo.
- Cada cobro registra `fecha/monto/txHash` (off-chain `suscripciones`) y transfiere **10% del
  cobro al fondo de valor** (D7, RF-03.9, CU-24). Fallos reiterados → suscripción `IRREGULAR` y
  escalado a soporte (Owner + moderador — RF-18.3). Plan base **aprobado (D33)**: **100 BRLT/mes**,
  **configurable por el Owner**.
- La empresa **paga el gas** de sus transacciones (R1, RF-09.3); el pago de inscripción inicial
  (RF-09.4) se ejecuta con gas de la empresa.

### 3.5 Contrato de Socios (`SociosRegistry` — gobernanza; requerido por D6/RF-12.1)

- Padrón vigente de Socios (admisión por solicitud formal + votación con quórum ≥2/3, un voto por
  Socio — RF-01.9, RF-03.9, D21; CU-03), consultado por Escrow, BRLT y SuscripcionEmpresa.
- Registra votaciones de admisión y exposiciones de resolución; sirve de contraparte del
  "multisig de Socios" para BRLT (§3.3). (No duplica el flujo de votación de disputas, que vive en
  cada escrow en `RESOLUCION_SOCIOS` según el puml.)

### 3.6 Certificación de imágenes (`CertificacionImagenes` o función en `Escrow`)

- Flujo: subida de imagen (publicación o recepción) → **hash SHA-256(imagen + metadata + wallet)**
  (RF-11.1/11.2) → almacenamiento en **IPFS con pinning propio** (D23) → la **wallet firma el hash
  (ECDSA)** (RF-11.3) → `firma` y `hash` persisten en PostgreSQL → el hash entra al **acumulador
  merkle** y la **raíz se ancla on-chain** en el contrato escrow (RF-11.4, RT-02.7, D23; CU-06/CU-14).
- On-chain: estado `rootMerkleImagenes` + evento `MerkleRootActualizado(raizAnterior, raizNueva)`
  (histórico auditable por evento); función `actualizarRootImagenes(bytes32)` restringida al rol
  de anclaje (relayer/backend) tras persistir la hoja off-chain.
- Verificación (CU-27): (1) recomputar hash desde IPFS, (2) verificar firma ECDSA contra la wallet,
  (3) **prueba de inclusión** contra la raíz anclada on-chain → inmutabilidad y auditoría real
  (RNF-01.5). Si se implementa como contrato aparte en vez de función en Escrow: **PENDIENTE DE
  DECISIÓN** (RT-02.7 exige el anclaje en el escrow; un módulo auxiliar debe mantener esa relación).

### 3.7 Pruebas Foundry requeridas (RNF-04.1)

- **Unit** por contrato y por función con aserciones de dominio (estados, quórums, ventanas).
- **Fuzz** de funciones con parámetros numéricos (montos, tiempos, votos).
- **Invariantes** (handler-based): I1–I7 de §3.1, no-liberación, máquina de estados unidireccional,
  timelock 6 h, límite 5 días/D26, 1 voto por Socio.
- **Cobertura** mínima con `forge coverage`: **≥80 % de líneas** como gate obligatorio de cada
  ciclo (D38); meta de ramas en contratos críticos (escrow, relayer, BRLT).
- Nombres/estructura acordes a RNF-04.1: suite `test_fuzzing_o_invariantes` y `test_cobertura`
  dentro de la estructura de pruebas de Foundry (unit/fuzz/invariantes/cobertura), ejecutables en
  CI y reproducibles sobre anvil (chain 31337).

---

## 4. Base de datos PostgreSQL (modelo off-chain)

Derivada de `diccionario_datos.md` y de los CU. Se reutiliza **`mcc-postgres`** (D25, RT-02.8;
patrón pgadmin + contraseña desde Secret Manager — `entornos_globales.md`). Patrón de acceso:
**lectura impulsada por eventos** (RNF-03.2, RT-02.3): las tablas "espejo" de estado on-chain
(`truekes`, `usuarios.estado`, `subastas.estado`, `suscripciones`) solo se actualizan desde el
indexador (§5); el backend escribe únicamente tablas off-chain (PII, publicaciones, pujas auxiliares,
valoraciones de detalle, auditoría de API).

Convenciones: PK `BIGINT GENERATED ALWAYS AS IDENTITY` o `UUID`; FKs con nombre de entidad;
enum como CHECK o tipo ENUM; columnas de tipo `TIMESTAMPTZ`; PII cifrada (D17). Todo campo PII se
marca **[PII†]** = cifrado en reposo (§9). Extensiones: `postgis` (RT-02.5) y `pgcrypto`.

| Tabla | Propósito | Columnas clave (tipos) | Relaciones |
|---|---|---|---|
| `usuarios` | Registro e identidad (CU-01/02) | `id BIGINT PK`, `wallet CHAR(42) UNIQUE`, `correo [PII†]`, `telefono [PII†]`, `direccion_inscripcion [PII†] TEXT`, `geog GEOGRAPHY(Point,4326)`, `tipo ENUM(PARTICULAR,EMPRESA,SOCIO)`, `nivel ENUM(INICIADO,COMUN,FRECUENTE,SOCIO)`, `medalla ENUM(BRONCE,PLATA,ORO)`, `estado ENUM(INSCRITO,VERIFICADO,CERTIFICADO)` (D28), `smart_account CHAR(42)`, `consentimiento_gdpr BOOL`, `consentimiento_fecha TIMESTAMPTZ`, `actividad_ultima TIMESTAMPTZ`, `created_at` | 1—N: `kyc`, `articulos`, `valoraciones`, `suscripciones`, `finanzas` |
| `kyc` | Metadata KYC cifrada (RF-01.7, D17) | `usuario_id FK`, `documento_identidad [PII†] BYTEA`, `selfie_ref [PII†]`, `selfie_hash BYTEA`, `merkle_root BYTEA`, `estado ENUM(PENDIENTE,APROBADO,RECHAZADO,APELACION)`, `revisado_por`, `fechas` | N—1: `usuarios`; espejo del estado on-chain del Smart Account |
| `articulos` | Publicaciones AtoA (CU-06) | `id`, `usuario_id FK`, `titulo`, `descripcion`, `rubro`, `imagen_certificacion_id FK`, `nft_token_id`, `disponible BOOL`, `alta_disponibilidad BOOL`, `created_at` | N—1: `usuarios`; 1—1: `imagenes_certificadas` |
| `truekes` | **Espejo del estado on-chain** del escrow | `id`, `escrow_id UNIQUE`, `articulo_a FK`, `articulo_b FK`, `usuario_a FK`, `usuario_b FK`, `estado ENUM(CREADO,ACTIVO,CUSTODIADO,APERTURA,EN_DISPUTA,RESOLUCION_SOCIOS,COMPLETADO,ANULADO,BLOQUEADO)`, `hora_pautada`, `punto_encuentro_id FK`, `tx_hash`, `bloque` | N—1: `usuarios`; 1—N: `valoraciones`, `disputas` |
| `valoraciones` | Detalle off-chain de valoración (RF-07.2, D18) | `id`, `trueke_id FK`, `valorador FK`, `valorado FK`, 5 columnas `SMALLINT CHECK (1..5)` (aceptacion, honestidad, seguridad, confiabilidad, compromiso) | N—1: `truekes`, `usuarios` |
| `puntos_encuentro` | Zonas registradas (CU-16) | `id`, `usuario_id FK`, `direccion [PII†]`, `geog GEOGRAPHY(Point,4326)`, `radio_km NUMERIC`, `aprobado_socios BOOL` (retiros, CU-22) | N—1: `usuarios`; 1—N: `truekes` |
| `disputas` | Conflictos y apelaciones (CU-18/19) | `id`, `trueke_id FK`, `solicitante FK`, `motivo`, `estado`, `resolucion`, `sancion`, `timelock_ejecuta_at`, `registro_votos JSONB` (espejo de votos on-chain) | N—1: `truekes` |
| `imagenes_certificadas` | Evidencia (RF-11, CU-06/14/27) | `id`, `tipo ENUM(PUBLICACION,RECEPCION)`, `ref_id`, `hash_sha256 BYTEA`, `ipfs_cid TEXT`, `wallet CHAR(42)`, `firma_ecdsa BYTEA`, `metadata JSONB`, `root_merkle_anclada BYTEA` | N—1: `articulos`/`truekes` por `ref_id` |
| `suscripciones` | Cobros empresa (CU-24) | `id`, `empresa_id FK`, `plan`, `monto NUMERIC`, `ciclo_inicio`, `ciclo_fin`, `fecha`, `tx_hash`, `estado ENUM(ACTIVA,IRREGULAR,CANCELADA)` | N—1: `usuarios` |
| `campanas` | Venta masiva / recolecta (CU-09/10) | `id`, `tipo ENUM(VENTA,RECOLECTA)`, `usuario_id FK`, `estado`, `aprobada_socios BOOL`, `articulos JSONB`, `causa`, `plazo_fin` | N—1: `usuarios` |
| `subastas` | Subastas empresa (RF-17, CU-25/26) | `id`, `empresa_id FK`, `articulo_id FK`, `escrow_id`, `duracion`, `puja_inicial`, `incremento_minimo`, `pujas JSONB`, `estado ENUM(ABIERTA,CERRADA,ANULADA)`, `ganador_id FK`, `valor_ganador`, `nivel_ganador` (desempate D27) | N—1: `usuarios`, `articulos` |
| `finanzas` | Saldos y fondo global (RF-14.7/14.8, CU-30/31) | `usuario_id PK FK`, `nfts_stock JSONB`, `criptos JSONB`, `brlt NUMERIC`, `fondo_valor NUMERIC`, `porcentajes_config JSONB` (D7: trueque 1%, suscripciones 10%, BRLT 5% — configurables Owner) | 1—1: `usuarios` |
| `auditoria` | Registro auditable (RF-18.6) | `id`, `entidad`, `evento`, `actor`, `tx_hash`, `bloque`, `log_index`, `payload JSONB`, `procesado BOOL`, `procesado_at` | — (appende-only) |
| `indexador_checkpoint` | Checkpoints de reproceso (§5, RNF-07.4) | `contrato`, `ultimo_bloque`, `ultimo_log_index`, `updated_at` | — |

Reglas de datos implementadas como CHECK/triggers/consulta PostGIS:

- **Distancia ≤ 10 km**: `ST_DWithin(geog_a, geog_b, 10000)` entre las direcciones de inscripción
  de ambas partes (RF-08.3/08.4, R3); lógica **exclusivamente off-chain** (PostGIS) (RF-08.4).
- **Límites por nivel**: Particular ≤5 artículos (RF-04.2, D14); Común ≤20 rubros y ≤50 artículos
  (RF-03.7, R11); **el nivel manda sobre el tipo** (D14); Iniciado ≤5 rubros y sin proponer lugar
  (RF-03.6, R10); Verificado ≤3 trueques activos (RF-14.4, D28).
- **Valoración obligatoria** para `COMPLETED` (RNF-06.1); "intercambio efectivo" = COMPLETED +
  firmas + valoración (RF-03.4, D12).
- **Recálculo mensual** de nivel/medalla con la fórmula D12/D30 (§6 backend) y al evento (CU-20).
- Oro = +1000 efectivos y ≥90% de ratio de efectividad (RF-03.4/07.4) — requisito Empresa (RF-01.8).
- Retención GDPR: borrado a los **24 meses de inactividad** o a solicitud (D17, RNF-01.7).

**Backup y recuperación (RNF-07)**: backup diario con **RPO ≤ 24 h** (RNF-07.1), restauración
completa off-chain con **RTO ≤ 48 h** (RNF-07.2), pruebas de restauración **al menos trimestrales
documentadas** (RNF-07.3) y reproceso del indexador desde bloque N con reconciliación contra la
cadena (RNF-07.4).

---

## 5. Indexador de eventos (listener Node.js propio — D25)

**Arquitectura** (RT-02.4, D25): servicio Node.js que se conecta al **RPC del nodo anvil/GCP**
(`RPC_URL`, chain 31337 — `entornos_globales.md`), suscribe/filtra eventos de cada contrato
desplegado y los aplica a PostgreSQL. No es The Graph; es código propio del proyecto (D25).

Componentes y garantías:

- **Conexión al RPC** con reintentos/backoff y detección de lag de bloque.
- **Idempotencia por `(txHash, logIndex, contrato)`**: constraint UNIQUE en `auditoria`; un evento
  ya procesado no se re-aplica (RNF-07.4; H-16).
- **Checkpoints**: tabla `indexador_checkpoint` por contrato → **reproceso desde bloque N** ante
  pérdida/corrupción (RNF-07.4).
- **Reorgs**: ante reorganización (bloque reemplazado), retroceso al checkpoint seguro y re-lectura;
  en anvil/preview el riesgo es bajo pero se diseña desde el inicio (H-16).
- **Métricas de lag** (bloques y eventos pendientes) y alertas al dashboard del Owner (D15, RF-18.1;
  H-17): exponer `/healthz`, lag y últimos checkpoints.
- **Reconciliación con la cadena** (única fuente de verdad — RNF-01.1): barrido periódico que
  compara `estado` de `truekes`/`subastas` on-chain vs espejo PostgreSQL y corrige desviaciones;
  jamás escribe en cadena.

**Eventos a escuchar y efecto en PostgreSQL:**

| Contrato | Eventos | Efecto (tabla espejo off-chain) |
|---|---|---|
| `Escrow` | `EscrowCreado` · `CustodiaA/CustodiaB` · `AperturaA/AperturaB` · `RecepcionFirmadaA/B` · `SolicitudAnulacion` · `VotoSocio` · `ResolucionEjecutada` · `ResolucionPorDefecto` (D26) · `SancionProgramada/SancionEjecutada` · `EscrowBloqueado` · `CierreIrregular` · `ValoracionMarcadaA/B` (solo marcador on-chain — D36) · `MerkleRootActualizado` | UPSERT `truekes.estado` + `hora_pautada` + ventanas; INSERT en `disputas`/`auditoria`; `imagenes_certificadas.root_merkle_anclada`; votos JSONB en `disputas`; comisión 1% (D7) en `finanzas.fondo_valor` al `COMPLETED` |
| `SmartAccount` | `SmartAccountDesplegada` · `EstadoVerificacionActualizado(root, estado)` · `OwnerRestablecido` · `GuardianAnadido/Removido` | UPDATE `usuarios.smart_account`, `usuarios.estado` (INSCRITO/VERIFICADO/CERTIFICADO — D28) y `kyc.merkle_root` |
| `SociosRegistry` | `SolicitudSocioPresentada` · `VotoAdmision` · `SocioAdmitido/SocioRechazado` | UPDATE `usuarios.tipo`=SOCIO; INSERT `auditoria` (CU-03) |
| `BRLT` (ERC-20) | `Transfer` · `EmisionAutorizada` · `ValorActualizado` | UPDATE `finanzas.brlt`/`criptos`; 5% de emisión (D7) al `fondo_valor`; auditoría (CU-31) |
| `SuscripcionEmpresa` | `SuscripcionActivada` · `CobroEjecutado(empresa,monto,ciclo)` · `SuscripcionIrregular` · `SuscripcionCancelada` | INSERT `suscripciones`; 10% del cobro (D7) al `fondo_valor`; estado del plan (CU-24) |

Regla de oro: el indexador es **solo lectura de cadena → escritura en PostgreSQL**; el estado
canónico nunca se modifica por SQL (RNF-01.1, CU-12 CA "Indexación del evento de custodia").

---

## 6. Relayer y gas (meta-transacciones EIP-712)

**Flujo de meta-transacción** (RF-09.1/09.2, RT-03.1, CU-23):

1. El **Particular** (Smart Account, sin costo de gas) firma un **intent EIP-712** con dominio
   `chainId` (31337) y **nonce por cuenta** (anti-replay — D16).
2. El intent llega al **backend** por **endpoint autenticado con rate-limiting** y claves rotadas
   (RF-09.6, D16).
3. El **Relayer** (2 instancias, D15) valida las **4 protecciones** (D16):
   1. **Nonce único EIP-712 por cuenta** (dominio con chainId) — no consumido.
   2. **Allowlist**: solo intents de **Smart Accounts de particulares verificados** — chequeo
      **on-chain** del estado de verificación (D28) en el Smart Account/Escrow.
   3. **Límite diario: 20 meta-tx por usuario/día** (D29).
   4. Endpoints autenticados + rate-limiting + rotación de claves (RF-09.6; claves en Secret
      Manager — RF-18.5, `entornos_globales.md`).
4. Protección adicional D29: **3 fallos en 10 minutos → bloqueo temporal del signer por 1 hora**.
5. El relayer envía la transacción a la cadena **asumiendo el gas** desde la **cuenta 1** del anvil
   (RF-15.2; relayer y cuenta general de la plataforma).
6. La Smart Account verifica firma/nonce y ejecuta; el indexador actualiza PostgreSQL (§5).

**Empresas** (R1, RF-09.3): pagan el gas de todas sus transacciones (sin pasar por el relayer);
pagan además inscripción (RF-09.4) y suscripción automática cada 30 días (RF-10, R2).

**Presupuesto de gas financiado por el fondo de valor** (D7, RF-03.9, CU-30): el fondo se nutre de
**1% del valor de cada trueque completado + 10% de las suscripciones de empresas + 5% de la emisión
de BRLT** (los tres porcentajes configurables por el Owner desde su dashboard — D7). El relayer
consume del fondo con **alerta de saldo bajo** al Owner (Operador de Infraestructura — D15, RF-18.1).

**Resiliencia (D15, RNF-03.3)**: mínimo **2 instancias** del relayer con **cola de reintentos**
(backoff) y **health-check/failover**; SLA de disponibilidad **≥99% uptime**; métricas de
procesamiento, gas consumido, tasa de fallos y saldo del fondo (H-02/H-17). **Fallback aprobado
(D39)**: ante indisponibilidad prolongada (>1 h) se activa el **modo degradado** — el usuario
puede **pagar el gas directamente** con su wallet; la plataforma **reembolsa en BRLT** si la caída
fue responsabilidad del operador (proceso operativo documentado — H-02 recomendación).

---

## 7. Backend API (Node.js)

Capa REST/JSON en Node.js (mismo repo/stack TS — RNF-04.2) que orquesta off-chain, autentica y
fronta al relayer. Endpoints autenticados (firma de sesión con la wallet/Smart Account + JWT de
corta vida; sesiones de Owner/moderador protegidas — RNF-01.6) y **rate-limiting global y por
usuario** (D16, RF-09.6). Formato: `JSON`; errores con códigos estables y validación de entrada.

| Módulo | Endpoints principales (método · ruta) | Función / CU |
|---|---|---|
| Auth / registro (ERC-4337) | `POST /auth/connect` · `POST /auth/register` · `POST /auth/session` · `POST /auth/verify-email` · `POST /auth/verify-phone` | Registro, consentimiento GDPR, escalera D28 (CU-01/02) |
| KYC (2 etapas, D28) | `POST /kyc/init` · `POST /kyc/submit` (documento + selfie) · `GET /kyc/status` · `POST /kyc/appeal` · `GET /kyc/queue` (Owner) · `POST /kyc/review` (Owner) | Verificación automática + revisión humana Owner (RF-18.4, CU-02) |
| Publicaciones | `POST /articulos` · `GET /catalogo` · `GET /articulos/{id}` · `POST /encargos` · `GET /encargos` | AtoA + encargo (RF-04, CU-06/07/08) |
| Trueques / escrow | `POST /truekes` · `GET /truekes/{id}` · `POST /truekes/{id}/custodiar` · `POST /truekes/{id}/apertura` · `POST /truekes/{id}/firma-recepcion` · `POST /truekes/{id}/valoracion` · `POST /truekes/{id}/anulacion` · `POST /truekes/{id}/disputa` | Orquesta intents EIP-712 hacia Escrow (CU-11…CU-15, CU-18) |
| Puntos de encuentro (mapas) | `POST /puntos-encuentro` · `GET /puntos-encuentro/cercanos?lat&lng&radio` · `POST /truekes/{id}/punto` | PostGIS ≤10 km + mapa + ruta móvil (RF-08, CU-16) |
| Disputas / votaciones | `GET /disputas` · `GET /disputas/{id}` · `POST /disputas/{id}/voto` (Socio) | Gobernanza D21 (CU-18/19) |
| Subastas | `POST /subastas` (Empresa) · `GET /subastas` · `POST /subastas/{id}/pujas` (Certificado) · `GET /subastas/{id}/pujas` | RF-17, D27 (CU-25/26) |
| Campañas | `POST /campanas` · `GET /campanas` · `POST /campanas/{id}/aprobacion` · `POST /campanas/{id}/participar` | CU-09/10 |
| Finanzas | `GET /finanzas/mi` · `GET /finanzas/globales` (Socio/Owner) · `PUT /finanzas/porcentajes` (Owner, D7) | RF-14.7/14.8, CU-30 |
| Dashboard Owner | `GET /admin/contratos` · `GET /admin/usuarios` · `GET /admin/kpis-disputas` · `GET /admin/db` · `GET /admin/infra/health` | RF-13.1, CU-28 |

**Servicios de apoyo:**

- **Geocodificación con fallback** (RF-08.4): dirección de inscripción → coordenadas; servicio
  externo/open source con **fallback** y manejo de errores ante caída (H-43). **Aprobado (D37)**:
  **OpenStreetMap + Nominatim** (geocodificación) y **OSRM** (rutas) — open source, RNF-05.1.
- **IPFS con pinning propio** (D23, RT-02.6): nodo/kubo del proyecto, pinning redundante, CIDs
  verificables y gateway interno; sin SaaS (RNF-05.1). **Aprobado (D37)**: **nodo Kubo propio**.
- **Envío de códigos** (correo/teléfono): generación, vencimiento, reintentos limitados y bloqueo
  temporal ante fallos (CU-02 A1). **Aprobado (D37)**: **Nodemailer + SMTP propio** para email;
  los **códigos de verificación llegan por email + notificación in-app**; **SMS queda como mejora
  futura** (sin proveedor de pago).
- **Verificación KYC**: validación automática (servicio verificador documento+selfie) con
  **revisión humana del Owner** y gestión de apelaciones (RF-18.4, CU-02); los artefactos se
  cifran (D17) y solo el hash/merkle root sube al Smart Account (RF-01.7).
- **Niveles/reputación**: recálculo por evento y **lote mensual** (D30, CU-20) de
  `puntaje = 0,5·reputación + 0,3·volumen_efectivo + 0,2·(1 − ratio_apelaciones)` con insumos
  normalizados a 0–100 y umbrales Iniciado 0–25 / Común 26–50 / Frecuente 51–75 / Socio ≥76
  (RF-03.3, D12/D30) + penalización por inactividad de 180 días y >5% del mercado (D19, CU-21).

---

## 8. Frontend (Next.js 16 + TypeScript + Tailwind v4 + ethers v6)

Stack fijo por RT-01/D1/RT-04 (Next.js **16** App Router, TypeScript, ethers **v6**, Tailwind
**v4**) y MetaMask + wallet móvil (RT-01.7, RF-16, D40). Diseño **mobile-first** con versiones PC/tablet
(RNF-02.2/02.3), colores vivos y navegación intuitiva (RNF-02.1).

**Sistema de diseño (RNF-08 / PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md)**: concepto **"Bóveda Digital
Moderna"** — paleta Navy `#1A2B4C`/`#0A1128`, Teal `#2A9D8F`, Cyan `#48CAE4`, Gold `#D4AF37`,
lienzo `#F8F9FA`, error `#E63946`, warning `#F4A261`; tipografía Montserrat/Poppins (títulos) e
Inter/Roboto (cuerpo); componentes cápsula (pill), tarjetas con borde premium dorado para RWA,
bottom-nav flotante móvil con botón central hexagonal dorado; animaciones con curvas estándar y
checkmark vectorial `TrueKeat☑`. Aplicación en `tailwind.config`: `navy.{900,800}`, `teal.500`,
`cyan.400`, `gold.500`, radios `pill/card/modal` (RNF-08.7).

**Activos de marca (RF-19)**: copiar `TrueKeate/` a `web/public/` — `TrueKeate_logo.svg/png/ico`,
`TrueKeate_titulo.svg/png/ico`, imágenes hero `Gemini_Generated_Image_*.jpg` y
`Guía_sobre_Soulbound_Tokens_(SBT).png`. Los SVG son la fuente vectorial (recoloreables con tokens
RNF-08.1); los `.ico` se usan como favicon; las imágenes hero alimentan la landing (RF-14.1).

**Estructura base según RT-04:**

```
web/
├─ app/                       # Next.js 16 (App Router)
│  ├─ layout.tsx · page.tsx   # Landing pública (RF-14.1) con assets hero + logo/título
│  ├─ (suite)/                # Dashboard según rol/estado (RF-14.2–14.8)
│  │  ├─ dashboard/           # Verificado/Certificado: mis truekes, catálogo
│  │  ├─ intercambio/         # Crear/completar trueque, escrow, valoración, disputa
│  │  │  └─ sala/             # Blueprint "Sala de Intercambio Atómico" (RNF-08.6)
│  │  ├─ perfil/              # Direcciones, reputación, KYC, recuperación
│  │  ├─ historial/
│  │  ├─ empresa/             # Inventario, puntos, finanzas, promociones, subastas
│  │  ├─ socio/               # Disputas, votaciones, finanzas globales
│  │  └─ admin/               # Dashboard Owner (RF-13.1, CU-28)
│  ├─ subastas/               # RF-17 (CU-25/26)
│  └─ campanas/               # CU-09/10
├─ lib/
│  ├─ ethereum.tsx            # Context provider (RT-04.4): MetaMask provider/signer/
│  │                          #   account + auto-reconexión al refrescar (RF-16.1/16.2)
│  └─ contracts.ts            # ABIs de los contratos desplegados (RT-04.5)
├─ components/                # Button (pill-primary/outline-navy/gold-accent), Card,
│  │                          #   BottomNav, StatusBadge, AssetCard, AvatarHex (RNF-08.4)
├─ hooks/ · styles/ (Tailwind v4 con tokens RNF-08.1/08.2)
└─ public/                    # Assets RF-19 + PWA instalable (manifest/service worker, D40)
```

**Páginas/roles (mapeo a RF-14):**

- **Landing pública** (RF-14.1): cantidades, volumen, qué es un Trueke Digital, ventajas,
  seguridad y filosofía — sin autenticación.
- **Suite por estado/rol**: Inscrito (ver ofertas/catálogo; **no completa trueques** — RF-14.3/D28);
  Verificado (crea/completa trueques, máx. 3 activos — RF-14.4/D28); Certificado (todas las
  operaciones + subastas — RF-14.5/D28/RF-17.2); Empresa (inventario, direcciones de encuentro,
  finanzas de usuario —NFTs/Criptos/BRLT—, promociones, subastas — RF-14.7/D5); Socio (Disputas +
  Finanzas Globales — RF-14.8); Owner (dashboard exclusivo RF-13.1).
- **Sección Intercambio** (RF-14.6): crear/completar intercambio, intercambios en disputa;
  **Perfil** (nueva dirección particular, ver reputación); **Historial**.
- **Firma móvil**: en móvil, la firma/autorización se delega a la wallet móvil (MetaMask
  mobile/APK del navegador — RF-16.3). **Aprobado (D40)**: en la Fase 3 se adopta **PWA
  instalable** (ver `PROPUESTA_FRONTEND_MOVIL_PWA.md`); la **APK nativa queda como mejora futura**.

El frontend **no paga gas**: genera intents firmados EIP-712 y los envía al backend/relayer
(particulares — R1) o transacciones directas con el gas de la empresa (R1, RF-09.3).

---

## 9. Seguridad y cumplimiento (resumen operativo)

| Tema | Medida | Trazabilidad |
|---|---|---|
| **Relayer (4 protecciones)** | Nonce EIP-712 por cuenta + allowlist solo particulares verificados (chequeo on-chain) + 20 meta-tx/día + endpoints autenticados con rate-limiting; 3 fallos/10 min → bloqueo 1 h | RF-09.6, D16, D29 |
| **Fondos custodiados** | No-liberación sin firmas duales o resolución con quórum; sin cancelación post-custodia; timelock 6 h en sanciones | RF-05.2/05.3/06.3, D21, D26, D31 |
| **Gobernanza** | Quórum ≥2/3 y 1 voto por Socio en disputas y admisión de Socios; escrow ANULADO por defecto a los 5 días (cierre finito) | RF-03.9/06.2, D13, D21, D26 |
| **GDPR / PII (D17)** | Consentimiento explícito al registrar (biométricos: categoría especial Art. 9); cifrado en reposo de **todos** los campos PII (correo, teléfono, dirección, documento, selfie); retención 24 meses de inactividad o derecho al olvido; acceso restringido; notificación de brechas | RNF-01.3/01.4/01.7, D17 |
| **Identidad confidencial** | Solo divulgación con autorización expresa para facturas/certificados; KYC cifrado y solo hash/merkle root on-chain | RF-01.6/01.7, R4 |
| **Control de acceso** | Escalera INSCRITO/VERIFICADO/CERTIFICADO (D28) consultada on-chain; menús por rol/estado (RF-14); dashboard Owner exclusivo; servicios no públicos restringidos | RF-13.1, RF-14, RNF-01.6, RT-05.4 |
| **Contratos** | OpenZeppelin (Ownable, ReentrancyGuard, IERC20, EIP712); invariantes I1–I7 en tests | RNF-01.2, RNF-04.1 |
| **Claves** | RELAYER/ADMIN_PRIVATE_KEY en GCP Secret Manager, rotación y separación de funciones (custodio: Owner) | RF-18.5, RT-05.3 |
| **Evidencia de imágenes** | Hash SHA-256 + firma ECDSA + IPFS con pinning propio + raíz merkle anclada on-chain; prueba de inclusión verificable | RF-11, D23, RNF-01.5 |
| **Backup / recuperación** | Backup diario RPO ≤24 h; RTO ≤48 h; pruebas de restauración trimestrales; reproceso del indexador desde bloque N con reconciliación | RNF-07.1–07.4 |
| **Registro auditable** | `auditoria` + Socios revisores; auditoría externa en Fase 4 | RF-18.6 |
| **Cumplimiento** | Revisión externa (legal/compliance) para GDPR, BRLT y custodia — pendiente de contratación (requisito documentado) | RF-18.7 |

---

## 10. Plan de implementación por ciclos (Fase 3)

Ciclos **verticales**: cada uno termina con algo operativo y con criterio de aceptación verificable.
Se ejecutan en la rama `escrow-dsh-GCP` (D8) contra anvil (chain 31337) en el entorno GCP
`truekeate-main` (D10, RT-05.1/05.2); entorno global con `source /home/dsh/workspace/gcp-env.sh`
(`entornos_globales.md`). Cada contrato que se libere pasa por unit + fuzz + invariantes +
cobertura (RNF-04.1).

| Ciclo | Contenido | Entregable | Criterio de aceptación |
|---|---|---|---|
| **C1 — Setup Foundry + Escrow base** | Proyecto Foundry, despliegue script (cuenta 0 Owner), `Escrow.sol` mínimo: CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO con ventanas 10 min/10 min, firmas duales, cancelación solo pre-custodia (D31) | Contrato + tests unit/fuzz de estados y ventanas (RNF-04.1) | CU-11/12/13/14: máquina de estados básica cumple invariantes I1–I3 en anvil; `forge test` verde |
| **C2 — SmartAccount ERC-4337 + KYC estados** | `SmartAccount.sol` (firma EIP-712 + nonce), despliegue por relayer sin gas del usuario; verificación por merkle root con escalera INSCRITO/VERIFICADO/CERTIFICADO (D28); recuperación social (RF-02.2) | SmartAccount + módulos KYC on-chain/off-chain | CU-01/02/04: el estado on-chain refleja la escalera D28; un no-verificado no completa trueques |
| **C3 — BRLT + Suscripciones + Fondo** | `BRLT.sol` controlado por SociosRegistry (D6), emisión inicial con **tope 1M y quórum 2/3 (D32)**; `SuscripcionEmpresa.sol` (**staking bloqueado — D33**); fondo de valor 1%/10%/5% configurables (D7); admisión de Socios con quórum 2/3 (D21) | 3 contratos + gobernanza + tests de fondos | CU-03/05/24/30/31: admisión de Socios con quórum 2/3 (CU-03); cobros automáticos por staking y contribuciones al fondo; emisión BRLT solo con quórum 2/3 y respetando el tope D32 |
| **C4 — Indexador + PostgreSQL + PostGIS** | Servicio indexador Node.js propio (D25) sobre `mcc-postgres` (D25/RT-02.8) con idempotencia, checkpoints/reproceso, métricas de lag y reconciliación (RNF-07.4); modelo §4 + PostGIS (≤10 km) + cifrado PII (D17) + backup RPO/RTO (RNF-07) | Esquema SQL + listener + health-check | CU-12/16 y RNF-03.2: evento de custodia actualiza `truekes`; distancias ≤10 km calculadas; reproceso desde bloque N verificado |
| **C5 — Relayer EIP-712** | Relayer con 2 instancias, cola de reintentos, health-check (D15); validación de las 4 protecciones (D16) + límite 20/día y bloqueo 1 h (D29); gas desde cuenta 1 financiado por el fondo | Relayer + tests de anti-abuso | CU-23: meta-tx de particular sin gas; replay/empresa/superación de cupo rechazados; SLA ≥99% (RNF-03.3) |
| **C6 — Backend API** | API REST §7 (auth por firma, KYC 2 etapas, publicaciones, trueques, puntos de encuentro, disputas, subastas, campañas, encargos, finanzas, dashboard), servicios de geocodificación con fallback, IPFS pinning propio, códigos, verificación KYC automática + revisión Owner | API documentada + tests de integración | CU-02/06/07/16/21/22/25/26/27/28: endpoints operan contra contratos + BD (incl. encargos CU-07, penalización por inactividad CU-21, establecimientos CU-22, verificación on-chain de imagen CU-27); rate-limiting y roles aplicados |
| **C7 — Frontend suite + landing** | Next.js 16 + TS + Tailwind v4 + ethers v6 (D1); `lib/ethereum.tsx` (RT-04.4), `lib/contracts.ts` (RT-04.5); landing (RF-14.1) y suite por estado/rol (RF-14.2–14.8); móvil-first con versión PC/tablet (RNF-02.2/02.3); **sistema de diseño RNF-08** (tokens, componentes Button/Card/BottomNav/StatusBadge/AssetCard, sala de intercambio RNF-08.6) + **assets de marca RF-19** (logo/título SVG recolorables vía `currentColor`, favicon, hero); **PWA instalable** con firma móvil delegada a wallet (MetaMask mobile — D40) | Web desplegable + PWA instalable + integración MetaMask + assets de marca integrados | CU-08/28: landing y suite por rol renderizan según estado D28 y **estilo visual RNF-08**; PWA instalable con disparo de firma móvil vía wallet (D40); conexión y auto-reconexión funcionan (RF-16); logo/título/imágenes visibles correctamente |
| **C8 — Subastas/campañas/disputas completas + dashboard Owner** | Cierre vertical de CU-17/18/19 (bloqueo, anulación 5 días/D26, disputas, sanciones timelock 6 h), CU-09/10 (campañas), CU-15/20 (valoración mutua + recálculo nivel/medalla D12/D30), CU-25/26 (subastas, mayor valor — D27) y CU-28/29/30/31 (dashboard Owner, moderación, finanzas) | Plataforma integrada E2E | Todos los CU con criterios Gherkin/EARS pasan E2E, incluidos CU-15 (valoración mutua), CU-20 (recálculo mensual D30), CU-27 (evidencia on-chain) y CU-21/22; KPIs del dashboard Owner operativos; sanciones ejecutadas solo tras timelock |

**Dependencias críticas entre ciclos:** C5 requiere C2 (Smart Account/nonce) y C3 (fondo para gas);
C4 puede avanzar en paralelo con C2/C3 escuchando los contratos ya desplegados; C7 integra contra
C5/C6. Cada ciclo mantiene verde la suite RNF-04.1 y documenta sus pruebas de restauración
trimestrales (RNF-07.3) a partir de C4.

**PENDIENTES DE DECISIÓN consolidados — RESUELTOS en la ronda de arquitectura (D32–D40)**:
- D32: emisión BRLT con quórum 2/3 + tope inicial 1M BRLT (H-19) ✓
- D33: suscripción por **staking bloqueado** (H-45) + plan base 100 BRLT/mes configurable ✓
- D34: recuperación social 3 guardianes / umbral 2 de 3 / timelock 48 h ✓
- D35: **sin EntryPoint estándar**; Smart Account inspirada en ERC-4337 + relayer EIP-712 propio ✓
- D36: valoraciones **off-chain** (5 renglones 1–5) + marcador on-chain "ambas valoraron" ✓
- D37: proveedores open source: OSM+Nominatim, OSRM, Nodemailer+SMTP (códigos email+in-app), Kubo propio ✓
- D38: cobertura `forge coverage` **≥80 % líneas** como gate de cada ciclo ✓
- D39: fallback del relayer: **modo degradado** (usuario paga gas) + reembolso en BRLT si caída del operador ✓
- D40: **PWA instalable** en Fase 3; APK nativa como mejora futura ✓

**Documento de arquitectura listo al 100 %** para iniciar la Fase 3 (ciclos C1–C8 de §10).
