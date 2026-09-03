# Manual técnico · Plataforma TrueKeate

> Manual técnico del equipo de manuales (rol TÉCNICO) — tema: plataforma, stack y despliegue.
> Fuente de verdad: código real del repositorio `/home/dsh/workspace/escrow` + documentos maestros
> de `RepoTecnico/`. Las referencias usan `ruta:línea`. Lo no verificable se marca **pendiente de
> confirmar**. Idioma: español. Jerarquía: `## Tema` → `### Sección` → `#### Sub-sección`.

---

## 1. Qué es TrueKeate

### 1.1 Definición general

TrueKeate es una **DApp Web3 de trueques** (intercambio directo entre personas, AtoA) de bienes,
productos, servicios y criptos/NFTs, con **custodia atómica en un contrato escrow** hasta la firma
dual de recepción, reputación comunitaria y **meta-transacciones sin gas (EIP-712)**.

Definición de referencia en el propio repositorio:

- `README.md:5` — "Plataforma Web3 de intercambio (trueque) de Bienes, Productos, Servicios y
  Criptos representados en NFTs, con custodia atómica mediante contrato escrow, reputación
  comunitaria y meta-transacciones sin gas (EIP-712)".
- `RepoTecnico/requerimientos.md:15` — "Plataforma Web3 llamada TrueKeate donde usuarios (empresas
  o particulares) intercambian Activos, Bienes y Servicios representados como NFTs/criptos, de forma
  segura y fiable".
- `RepoTecnico/requerimientos.md:18` — "Los trueques se custodian mediante un contrato escrow hasta
  que ambas partes firman la recepción correcta de lo negociado, y el cierre exige una valoración".

### 1.2 Alcance técnico del sistema (qué es y qué no es)

Según `RepoTecnico/arquitectura_tecnica.md:20` (propósito y alcance), TrueKeate es un sistema de
tres capas:

1. **On-chain (contratos inteligentes)** — Escrow, SmartAccount (patrón ERC-4337 inspirado),
   BRLT (ERC-20), SuscripcionEmpresa, FondoDeValor, SociosRegistry y acumulador merkle de imágenes
   (diseño). La **blockchain es la única fuente de verdad de los estados del escrow**
   (`arquitectura_tecnica.md:24`; `RNF-01.1`).
2. **Off-chain de volumen** — PostgreSQL con PostGIS como base de **lectura impulsada por
   eventos** (`arquitectura_tecnica.md:25`; `RNF-03.2`, `RT-02.3`), más IPFS con pinning propio.
3. **Orquestación Node.js** — API REST Express, indexador de eventos propio (D25) y relayer
   EIP-712 propio (D22).

Principio rector declarado en `arquitectura_tecnica.md:113`:

> "on-chain = estados y custodia (mínimo gas, RNF-03.1); off-chain = volumen (publicaciones, chat,
> KYC cifrado, geolocalización, pujas auxiliares, estadísticas)". Ninguna actualización de
> PostgreSQL altera el estado del escrow (RNF-01.1).

### 1.3 Documentos maestros de referencia

| Documento | Contenido |
|---|---|
| `RepoTecnico/requerimientos.md` | RF-01…RF-19, RNF-01…RNF-08, RT-01…RT-05 y decisiones D1…D41 (`requerimientos.md:9`) |
| `RepoTecnico/arquitectura_tecnica.md` | Diseño técnico de la Fase 3 y ciclos C1…C8 (`arquitectura_tecnica.md:9-11`) |
| `RepoTecnico/casos_uso.md` | CU-01…CU-31 |
| `RepoTecnico/diccionario_datos.md` | Diccionario de datos |
| `RepoTecnico/entornos_globales.md` | Repositorios, entorno GCP y variables de entorno |

> El estado de fase en `README.md:16-19` indica "Fase 3 — Desarrollo: pendiente", pero en el árbol
> del repositorio ya existe código de contratos, backend y frontend (ver §6 de este manual). La
> coherencia entre el estado declarado en `README.md` y el código existente es **pendiente de
> confirmar**.

---

## 2. Actores y roles

### 2.1 Modelo de actores (documento de requisitos)

`RepoTecnico/requerimientos.md:28` (`RF-01.1`): "Los usuarios pueden ser **empresas** o
**particulares**". Sobre esa base se definen los tipos de usuario del sistema:

| Actor | Cómo se accede | Documento de referencia |
|---|---|---|
| **Usuario Particular** | Billetera conectada (inscripción automática, `RF-01.4`) | `requerimientos.md:36`, `RF-01.2b` en `requerimientos.md:30-33` |
| **Usuario Empresa** | Certificado + clasificación Oro (`RF-01.8`) | `requerimientos.md:39` |
| **Usuario Socio** | Solicitud formal + votación de los Socios (`RF-01.9`) | `requerimientos.md:40` |
| **Owner** | Cuenta 0 del anvil, EO owner que despliega (`RF-15.1`) | `requerimientos.md:175`, `entornos_globales.md:59-61` |

En código, el tipo de usuario se modela en el esquema PostgreSQL:

- `backend/db/schema.sql:14` — `CREATE TYPE tipo_usuario AS ENUM ('PARTICULAR','EMPRESA','SOCIO')`;
- `backend/db/schema.sql:62-79` — tabla `usuarios` con columna `tipo` (`schema.sql:69`) y columna
  `estado` de la escalera D28 (`schema.sql:72`).

### 2.2 Usuario Particular y la escalera de verificación (D28)

La escalera **INSCRITO → VERIFICADO → CERTIFICADO** está definida en `requerimientos.md:30-33`
(RF-01.2b) y formalizada como decisión **D28** (`requerimientos.md:388`):

| Estado | Requisito | Capacidades |
|---|---|---|
| **INSCRITO** | Billetera conectada + inscripción formal (correo, teléfono, dirección) | Ver ofertas/catálogo; **no completa trueques** (`RF-14.3`, `requerimientos.md:167`) |
| **VERIFICADO** | Código confirmado en correo y teléfono | Crea y completa trueques, máx. **3 activos** a la vez (`RF-14.4`, `requerimientos.md:168`) |
| **CERTIFICADO** | KYC completo (documento + selfie) | Todas las operaciones + subastas (`RF-14.5`, `requerimientos.md:169`) |

La escalera vive en **dos lugares** que deben mantenerse sincronizados:

- **Off-chain**: enum `estado_verificacion` (`backend/db/schema.sql:27`) y columna `usuarios.estado`
  (`backend/db/schema.sql:72`).
- **On-chain**: enum `EstadoVerificacion { INSCRITO, VERIFICADO, CERTIFICADO }` en
  `sc/src/SmartAccount.sol:29`, estado público `estadoVerificacion` (`SmartAccount.sol:52`) y
  función `cambiarEstadoVerificacion(...)` (`SmartAccount.sol:140-152`).

El puente off-chain ↔ on-chain es el **merkle root** (`kycMerkleRoot`, `SmartAccount.sol:51`) que
certifica el estado **sin revelar identidad** (`RF-01.7`, `requerimientos.md:38`; `RNF-01.3/01.4`).
El relayer valida on-chain que el signer tenga estado `!= INSCRITO` antes de enviar meta-tx
(`backend/relayer.js:99-114`, comentario "allowlist D16/D28").

### 2.3 Usuario Empresa

- Requiere certificación + nivel Oro (`RF-01.8`, `requerimientos.md:39`).
- Paga el **gas de sus propias transacciones** (no pasa por el relayer): `R1`/`RF-09.3`
  (`arquitectura_tecnica.md:361-362`); implementado en la capa API
  (`backend/api/routes/truekes.js:19-28`, rama `esEmpresa` con envío directo).
- Paga inscripción inicial (`RF-09.4`) y **suscripción automática cada 30 días** por staking
  bloqueado (`RF-10`/`D33`, contrato `sc/src/SuscripcionEmpresa.sol:8-19`).
- En la suite web su módulo se contempla en `web/README.md:14` (rutas de empresa) aunque las
  páginas de empresa existentes son placeholders (ver manual 04-stack-frontend).

### 2.4 Usuario Socio (gobernanza)

- **Padrón vigente de Socios** en el contrato `sc/src/SociosRegistry.sol` (estado `esSocio` y
  `socios`, `SociosRegistry.sol:37-38`; evento `SocioAdmitido`, `SociosRegistry.sol:45`).
- Vota disputas y admisiones con **quórum ≥ 2/3, 1 voto por Socio, sin ponderación**
  (`D21`, `requerimientos.md:84` y `requerimientos.md:381`).
- Votación de disputas implementada en `Escrow.sol` (`votarSocio`, `sc/src/Escrow.sol:412-434`)
  con quórum calculado contra el registry (`_esQuorum`, `Escrow.sol:148-158`).
- Propuestas económicas de BRLT (emisión / subida de tope) también con quórum 2/3 (`D32`,
  `requerimientos.md:391-392` y cabecera de `SociosRegistry.sol:12-13`).

### 2.5 Owner

- **Cuenta 0 del anvil**: EO owner que despliega los contratos (`RF-15.1`,
  `requerimientos.md:175`; `entornos_globales.md:60`).
- Propietario (Ownable) de los contratos: `Escrow` (`Escrow.sol:128`, constructor
  `Ownable(msg.sender)`), `BRLT` (`BRLT.sol:50`), `FondoDeValor` (`FondoDeValor.sol:46`),
  `SociosRegistry` (`SociosRegistry.sol:64`) y `SuscripcionEmpresa` (`SuscripcionEmpresa.sol:67`).
- Configura los **porcentajes del fondo de valor** (D7): setters `onlyOwner` en
  `sc/src/FondoDeValor.sol:55-68`.
- **Dashboard exclusivo** (RF-13.1, `requerimientos.md:156`); en el backend la API de admin
  expone `GET /admin/...` (`backend/api/routes/admin.js:13-48`).
- **Custodio de claves** RELAYER/ADMIN_PRIVATE_KEY en GCP Secret Manager (RF-18.5,
  `requerimientos.md:195`; `RepoTecnico/entornos_globales.md:72-73`).

### 2.6 Roles operativos (no usuarios finales)

Definidos por `D15`/`RF-09.5` (`requerimientos.md:132`) y el cuadro de seguridad de
`arquitectura_tecnica.md:485-500`:

- **Operador de Infraestructura**: opera relayer + indexador + backend, mínimo 2 instancias y SLA
  ≥ 99 % (`RF-09.5`, `requerimientos.md:132`).
- **Moderador**: soporte/IRREGULAR de suscripciones y moderación (referencias `RF-18.2/18.3` en
  `arquitectura_tecnica.md:155` y `arquitectura_tecnica.md:214`).
- **Owner** como custodio de claves y revisor humano de KYC (`RF-18.4`, `requerimientos.md:411`
  citado en `arquitectura_tecnica.md:409-411`).

---

## 3. Modelo de negocio: el fondo de valor (D7)

### 3.1 Fuentes de financiación (1 % / 10 % / 5 %)

Decisión **D7** (`requerimientos.md:367`): el fondo de valor se nutre de una **combinación de
fuentes** con porcentajes **definidos y modificables por el Owner**:

| Fuente | Porcentaje | Base imponible | Referencia |
|---|---|---|---|
| Trueques completados | **1 %** | Valor de cada trueque completado | `requerimientos.md:83`, `arquitectura_tecnica.md:365-366` |
| Suscripciones de empresas | **10 %** | Cada cobro de suscripción | `requerimientos.md:83`, `SuscripcionEmpresa.sol:40` |
| Emisión de BRLT | **5 %** | Cada emisión de BRLT | `requerimientos.md:83`, `BRLT.sol:26` |

Declaración funcional completa en `requerimientos.md:83` (RF-03.9):

> "El fondo se nutre de una combinación de fuentes con un porcentaje definido y modificable por el
> Owner (Decisión D7): comisión base del 1% del valor de cada trueque completado + 10% de las
> suscripciones de empresas + 5% de la emisión de BRLT. Los tres porcentajes son configurables por
> el Owner desde el dashboard."

### 3.2 Dónde vive el fondo en el código

El fondo es el contrato **`sc/src/FondoDeValor.sol`** ("Fondo de valor para gastos de operación —
hosting, gas, red de despliegue — RF-03.9", `FondoDeValor.sol:8-13`):

- Porcentajes por defecto como variables públicas: `porcentajeTrueque = 1`, `porcentajeSuscripcion
  = 10`, `porcentajeEmision = 5` (`FondoDeValor.sol:30-32`).
- Configurables por el Owner: `setPorcentajeTrueque`, `setPorcentajeSuscripcion`,
  `setPorcentajeEmision` (`FondoDeValor.sol:55-68`).
- Aportes implementados hasta hoy:
  - **5 % de emisión BRLT**: `BRLT.emitir()` mintea el porcentaje directamente al fondo y llama
    `registrarEmision(...)` (`sc/src/BRLT.sol:82-89`; receptor `FondoDeValor.registrarEmision`,
    `FondoDeValor.sol:72-76`).
  - **10 % de suscripciones**: el flujo en `SuscripcionEmpresa` transfiere el porcentaje al fondo
    en cada ciclo (configuración `porcentajeFondo = 10`, `SuscripcionEmpresa.sol:40`; descripción
    del contrato `SuscripcionEmpresa.sol:12-13`).
  - **1 % de trueques completados**: la integración escrow → fondo está declarada en la cabecera de
    `FondoDeValor.sol:20` como "integración de ciclos posteriores" → **pendiente de confirmar** su
    implementación en el Escrow (no se observa llamada al fondo en `sc/src/Escrow.sol`).
- Salidas: `retirarParaOperacion(destino, monto)` solo Owner (`FondoDeValor.sol:87-92`) y saldo
  consultable con `saldoBrlt()` (`FondoDeValor.sol:95-98`).

Espejo off-chain del fondo y de los porcentajes: tabla `finanzas`
(`backend/db/schema.sql:228-237`), con `fondo_valor NUMERIC` (`schema.sql:233`) y
`porcentajes_config JSONB` con default `{"trueque":1,"suscripciones":10,"brlt":5}`
(`schema.sql:234-235`).

### 3.3 Uso del fondo

- El fondo **financia el gas** de las meta-transacciones de particulares (`RF-03.9`/`D7`,
  `arquitectura_tecnica.md:364-367`; el relayer firma desde la cuenta 1: `RF-15.2`,
  `requerimientos.md:176`).
- **Alerta de saldo bajo** al Owner: `backend/relayer.js:203` (`saldoBajo: balance <
  ethers.parseEther('0.5')`) dentro del health-check del relayer (`relayer.js:193-205`).
- Fallback operativo (D39): si el relayer cae > 1 h, el usuario puede pagar el gas directamente y
  la plataforma reembolsa en BRLT si la caída fue del operador (`requerimientos.md:399`; proceso
  operativo referenciado en `arquitectura_tecnica.md:371-374`).

---

## 4. Propósito del escrow y su máquina de estados

### 4.1 Por qué existe el escrow

El contrato **Escrow** custodia los activos de un trueque hasta que **ambas** partes firman la
recepción correcta de lo negociado; así se evita la liberación unilateral:

- `sc/src/Escrow.sol:11-14` — "Custodia NFTs/ERC20 durante un trueque (intercambio AtoA) hasta que
  AMBAS partes firmen la recepción correcta de lo negociado (RF-05.2). La blockchain es la única
  fuente de verdad de los estados del escrow (RNF-01.1)".
- Invariantes de no-liberación I1-I7 en `arquitectura_tecnica.md:158-169` (p. ej. I1: nunca se
  libera un activo custodiado sin firmas de recepción de ambas partes o resolución aprobada con
  quórum; I2: sin cancelación unilateral tras custodia — D31).
- Representación de un trueque en el contrato: struct `Trueke` (`Escrow.sol:60-85`) con partes,
  activos ofrecidos (`Activo`, `Escrow.sol:52-57`: NFT ERC721 o cripto ERC20), estado, ventanas,
  firmas, valoraciones y campos de disputa/anulación/sanción.

### 4.2 Los 9 estados canónicos

Enum canónico on-chain (`sc/src/Escrow.sol:39-49`) y su espejo PostgreSQL
(`backend/db/schema.sql:32-35`):

| # | Estado | Significado on-chain (`Escrow.sol:39-49`) |
|---|---|---|
| 1 | `CREADO` | Acuerdo registrado, sin activos custodiados |
| 2 | `ACTIVO` | Acuerdo vigente (sinónimo de CREADO para compatibilidad de lectura) |
| 3 | `CUSTODIADO` | Al menos un activo (o ambos) custodiados |
| 4 | `APERTURA` | Ambas partes abrieron dentro de las ventanas de tiempo |
| 5 | `EN_DISPUTA` | Solicitud de anulación en curso |
| 6 | `RESOLUCION_SOCIOS` | Votación de Socios en curso |
| 7 | `COMPLETADO` | Firmas duales + valoraciones: activos liberados en cruz |
| 8 | `ANULADO` | Anulación con quórum o por defecto |
| 9 | `BLOQUEADO` | Violación de norma / sanción |

Espejo SQL: `CREATE TYPE estado_escrow AS ENUM ('CREADO','ACTIVO','CUSTODIADO','APERTURA',
'EN_DISPUTA','RESOLUCION_SOCIOS','COMPLETADO','ANULADO','BLOQUEADO')`
(`backend/db/schema.sql:31-35`).

### 4.3 Transiciones clave implementadas en el contrato

Diagrama canónico de estados en `arquitectura_tecnica.md:130-140`; implementación real en
`sc/src/Escrow.sol`:

| Transición | Función (ruta:línea) | Regla |
|---|---|---|
| CREADO/ACTIVO | `crearTrueke(parteB, activoA, activoB, horaPautada)` — `Escrow.sol:180-218` | parte A = `msg.sender`; valida activos (`_validarActivo`, `Escrow.sol:496-503`) |
| → CUSTODIADO | `custodiarA` — `Escrow.sol:224-234` · `custodiarB` — `Escrow.sol:240-254` | Deposita el activo al escrow; solo desde CREADO/ACTIVO |
| → APERTURA | `aperturaA` — `Escrow.sol:260-267` · `aperturaB` — `Escrow.sol:273-280` | Requiere custodia completa y ventanas ±10 min (`_checkApertura`, `Escrow.sol:282-300`) |
| → COMPLETADO | `firmarRecepcionA/B` + `_intentarCompletar` — `Escrow.sol:326-361` | Requiere ambas firmas + ambos marcadores de valoración (`Escrow.sol:348-350`); libera en cruz (`_liberar`, `Escrow.sol:516-522`) |
| → ANULADO (pre-custodia) | `cancelar` — `Escrow.sol:368-376` | Solo antes de custodiar (D31, `Escrow.sol:371`) |
| → EN_DISPUTA | `solicitarAnulacion(id, motivo)` — `Escrow.sol:395-406` | Fija plazo ≤ 5 días (`plazoAnulacionMax`, `Escrow.sol:132`) |
| → RESOLUCION_SOCIOS | `votarSocio(id, aFavor)` — `Escrow.sol:412-434` | Solo Socios; 1 voto por Socio; quórum ≥ 2/3 (`_esQuorum`, `Escrow.sol:148-158`) |
| → ANULADO (quórum o por defecto) | `_anular` — `Escrow.sol:484-493` · `resolverPorDefecto` — `Escrow.sol:440-453` | Devuelve activos; por defecto a los 5 días (D26) |
| → BLOQUEADO | `bloquear` — `Escrow.sol:383-388` (onlyOwner) · `ejecutarSancion` — `Escrow.sol:472-482` | Congela activos; sanción con timelock 6 h (D21, `Escrow.sol:133`) |

Ventanas de apertura como constantes: `VENTANA_APERTURA = 10 minutes` y
`MAX_DIFERENCIA_APERTURAS = 10 minutes` (`Escrow.sol:33-35`); invariantes I3-I5 documentadas en
`arquitectura_tecnica.md:164-166`.

### 4.4 Eventos del escrow (puente al indexador)

El contrato emite eventos para que el indexador actualice PostgreSQL sin escribir en cadena
(`arquitectura_tecnica.md:328-330`; implementación `Escrow.sol:93-109`):

- `TruekeCreado`, `CustodiaA/B`, `AperturaA/B`, `RecepcionFirmadaA/B`, `ValoracionMarcadaA/B`,
  `TruekeCompletado`, `TruekeCancelado`, `EscrowBloqueado`, `AnulacionSolicitada`, `VotoSocio`,
  `ResolucionEjecutada`, `ResolucionPorDefecto`, `SancionProgramada`.

El mapeo evento → tabla espejo está en `backend/indexador.js:69-103` (estados) y la idempotencia
en `backend/indexador.js:38-48`.

### 4.5 Certezas y límites de esta sección

- La **valoración on-chain es solo un marcador** ("ambas valoraron"): D36
  (`requerimientos.md:396`); el detalle de 5 renglones 1-5 es off-chain (`backend/db/schema.sql:
  129-141`, tabla `valoraciones` con `CHECK (… BETWEEN 1 AND 5)`).
- El **1 % al fondo por trueque completado** no se observa invocado desde `Escrow.sol` → ver
  §3.2, **pendiente de confirmar**.
- La certificación de imágenes (hash SHA-256 + firma ECDSA + acumulador merkle anclado on-chain)
  está en diseño (`arquitectura_tecnica.md:227-239`) con la ubicación del anclaje (función en
  Escrow vs contrato aparte) marcada como **PENDIENTE DE DECISIÓN** en
  `arquitectura_tecnica.md:238-239` y sin evidencia de contrato dedicado en `sc/src/`.

---

## 5. Arquitectura de los ciclos C1…C8

### 5.1 Planificación por ciclos (documento de diseño)

`arquitectura_tecnica.md:504-521` define 8 ciclos **verticales** (cada uno termina operativo y con
criterio de aceptación), ejecutados sobre anvil chain 31337 en la rama `escrow-dsh-GCP` (D8,
`arquitectura_tecnica.md:507-508`; rama en `entornos_globales.md:15-16`):

| Ciclo | Contenido planificado | Entregable (diseño) |
|---|---|---|
| C1 | Setup Foundry + Escrow base (CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO, ventanas 10 min) | Contrato + tests unit/fuzz (`arquitectura_tecnica.md:514`) |
| C2 | SmartAccount (firma EIP-712 + nonce), escalera D28 por merkle root, recuperación social | SmartAccount + módulos KYC (`arquitectura_tecnica.md:515`) |
| C3 | BRLT + Suscripciones + Fondo (D32/D33) + gobernanza Socios (D21) | 3 contratos + gobernanza + tests de fondos (`arquitectura_tecnica.md:516`) |
| C4 | Indexador Node.js propio (D25) sobre mcc-postgres + PostGIS + cifrado PII | Esquema SQL + listener + health-check (`arquitectura_tecnica.md:517`) |
| C5 | Relayer EIP-712 con 2 instancias, cola, health-check (D15) y protecciones D16/D29 | Relayer + tests anti-abuso (`arquitectura_tecnica.md:518`) |
| C6 | Backend API REST (§7 del documento) + servicios (geocodificación, IPFS, códigos, KYC) | API documentada + tests de integración (`arquitectura_tecnica.md:519`) |
| C7 | Frontend Next.js 16 + suite por rol + sistema de diseño RNF-08 + PWA (D40) | Web desplegable + PWA instalable (`arquitectura_tecnica.md:520`) |
| C8 | Cierre de CU-17/18/19, campañas CU-09/10, valoración CU-15/20, subastas CU-25/26, dashboard CU-28-31 | Plataforma integrada E2E (`arquitectura_tecnica.md:521`) |

Dependencias críticas entre ciclos (C5 requiere C2+C3; C4 paralelo a C2/C3; C7 integra contra
C5/C6) en `arquitectura_tecnica.md:523-526`. Las decisiones D32…D40 quedaron resueltas en la ronda
de arquitectura (`arquitectura_tecnica.md:528-537`).

### 5.2 Evidencia real de implementación por ciclo (código existente)

Estado verificado en el repositorio (no es el plan, es lo que existe):

| Ciclo | Evidencia en el código |
|---|---|
| C1 | `sc/src/Escrow.sol` (523 líneas, máquina de estados + disputas C8) · tests `sc/test/Escrow.t.sol` (376 líneas) |
| C2 | `sc/src/SmartAccount.sol` (264 líneas) · `sc/src/SmartAccountFactory.sol` (54 líneas) · tests `sc/test/SmartAccount.t.sol` (232 líneas) |
| C3 | `sc/src/BRLT.sol`, `sc/src/FondoDeValor.sol`, `sc/src/SociosRegistry.sol`, `sc/src/SuscripcionEmpresa.sol` · tests `sc/test/Ciclo3.t.sol` (319 líneas) |
| C4 | `backend/indexador.js` (253 líneas) · `backend/indexador-cli.js` · `backend/db/schema.sql` (276 líneas) · tests `backend/test/indexador.test.js` |
| C5 | `backend/relayer.js` (206 líneas) · `backend/test/relayer.test.js` · `backend/test/integracion-relayer.js` |
| C6 | `backend/api/app.js`, `backend/api/routes/*.js` (7 routers), `backend/api/lib/*.js` · tests `backend/test/api.test.js` |
| C7 | `web/app/*` (layout, landing, suite), `web/components/*`, `web/lib/*` · E2E `web/e2e/*.spec.ts` |
| C8 (parcial) | `sc/test/EscrowCiclo8.t.sol` (166 líneas) y `sc/test/invariantes/*` (handler + invariantes); páginas de suite web como placeholders "se completa en el Ciclo 8" (`web/app/suite/intercambio/page.tsx:1`, `web/app/suite/perfil/page.tsx:1`) |

Script de despliegue real: `sc/script/Deploy.s.sol` (despliega Escrow, SmartAccountFactory,
tokens de prueba, BRLT, FondoDeValor, SociosRegistry y SuscripcionEmpresa y los vincula —
`Deploy.s.sol:34-58`).

### 5.3 Arquitectura en componentes (vista general)

Diagrama oficial en `arquitectura_tecnica.md:49-91` (mermaid): clientes (frontend web, wallet
móvil, MetaMask) → backend API + relayer (2 instancias) + cola + indexador → contratos on-chain →
PostgreSQL `mcc-postgres` + IPFS + Secret Manager. Lectura del diagrama en
`arquitectura_tecnica.md:93-111`. Los manuales siguientes de esta carpeta detallan cada capa:
`02-stack-web3.md` (contratos), `03-stack-backend.md` (indexador/relayer/API) y
`04-stack-frontend.md` (Next.js).

---

## 6. Estado actual y trazabilidad de referencia

### 6.1 Qué se ha verificado en este manual

- Contratos reales en `sc/src/` con funcionalidad implementada (estados, quórum, fondos).
- Backend real en `backend/` (indexador, relayer, API) y frontend real en `web/`.
- Decisiones D7, D13, D21, D25, D26, D28, D31, D35, D36, D39 y D40 citadas con su línea en
  `requerimientos.md:337-400`.

### 6.2 Lo marcado como "pendiente de confirmar"

1. Coherencia README (`README.md:16-19`, Fase 3 "pendiente") vs código existente.
2. Contribución del 1 % trueque completado → `FondoDeValor` (no invocada desde `Escrow.sol`).
3. Anclaje del acumulador merkle de imágenes (decisión abierta, `arquitectura_tecnica.md:238-239`).
4. Estado real del entorno GCP `truekeate-main` (ver manual 04-Despliegue).
