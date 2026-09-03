# Manual técnico · Implementación: contrato `Escrow` (escrow on-chain del trueque)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: implementación del contrato
> `Escrow` (`sc/src/Escrow.sol`) — máquina de estados de 9 estados canónicos, custodia de
> NFTs/ERC20, apertura dual con ventanas, cierre por firmas duales + marcador de valoración
> (D36), cancelación pre-custodia (D31) y ciclo C8 de disputa/anulación/sanción con quórum de
> Socios (D13/D21/D26). Todo lo citado es código real verificado con `ruta:línea`; lo no
> verificable se marca **pendiente de confirmar**.

---

## 1. Visión general del contrato

### 1.1 Ficha técnica

| Aspecto | Valor verificado | Fuente |
|---|---|---|
| Archivo | `sc/src/Escrow.sol` (523 líneas) | — |
| Pragma | `^0.8.24` | `sc/src/Escrow.sol:2` |
| Herencia | `Ownable` + `ReentrancyGuard` (OpenZeppelin) | `sc/src/Escrow.sol:28` |
| Imports | `Ownable`, `ReentrancyGuard`, `IERC20`, `IERC721`, `SafeERC20` | `sc/src/Escrow.sol:4-8` |
| Rol declarado | Custodia NFTs/ERC20 durante un trueque AtoA hasta que AMBAS partes firmen la recepción correcta (RF-05.2) | `sc/src/Escrow.sol:10-14` |
| Fuente de verdad | La blockchain es la única fuente de verdad de los estados (RNF-01.1) | `sc/src/Escrow.sol:12-14` |
| Trazabilidad declarada | RF-05.1…RF-05.7, R5, D31, D36, CU-11…CU-15 (C1); CU-17/18/19 (C8) | `sc/src/Escrow.sol:16-26` |
| Owner | El desplegador (`constructor() Ownable(msg.sender)`) | `sc/src/Escrow.sol:128` |
| Suites que lo prueban | `sc/test/Escrow.t.sol` (C1), `sc/test/EscrowCiclo8.t.sol` (C8), `sc/test/invariantes/*` | cabeceras de cada archivo |

### 1.2 Rol en la arquitectura

- Es el contrato central del trueque (intercambio directo entre dos partes **A** y **B**):
  registra el acuerdo, custodia los activos ofrecidos, habilita el encuentro (apertura dual),
  libera los activos en cruz solo con firmas duales de recepción y cierra/deniega según el caso.
- Cubre el flujo feliz (C1: `CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO`,
  `Escrow.sol:16-19`) y el cierre vertical (C8: disputa/anulación/sanción,
  `Escrow.sol:23-24`), comentados en el propio NatSpec del contrato.
- **No integra** el FondoDeValor (comisión del 1 % de trueques completados, D7): no existe
  ninguna referencia a BRLT/FondoDeValor en `Escrow.sol` → la comisión 1 % es **pendiente de
  confirmar** (integración de ciclos posteriores, según `sc/src/FondoDeValor.sol:20`).

---

## 2. Estados canónicos del escrow (enum de 9 estados)

### 2.1 Declaración del `enum Estado`

`enum Estado` con exactamente 9 valores y su semántica documentada en línea
(`sc/src/Escrow.sol:39-49`):

| Posición | Estado | Semántica declarada (comentario en código) |
|---|---|---|
| 0 | `CREADO` | Acuerdo registrado, sin activos custodiados |
| 1 | `ACTIVO` | Acuerdo vigente (sinónimo de `CREADO` para compatibilidad de lectura) |
| 2 | `CUSTODIADO` | Al menos un activo (o ambos) custodiados |
| 3 | `APERTURA` | Ambas partes abrieron dentro de las ventanas de tiempo |
| 4 | `EN_DISPUTA` | Solicitud de anulación en curso (C8) |
| 5 | `RESOLUCION_SOCIOS` | Votación de Socios (C8) |
| 6 | `COMPLETADO` | Firmas duales + valoraciones: activos liberados en cruz |
| 7 | `ANULADO` | Anulación con quórum o por defecto (C8) |
| 8 | `BLOQUEADO` | Violación de norma (C8) |

#### Nota de verificación sobre `ACTIVO`

- El estado `ACTIVO` está declarado como sinónimo de lectura (`Escrow.sol:41`), pero **ninguna
  función del código asigna `ACTIVO`**: `crearTrueke` inicializa en `CREADO`
  (`Escrow.sol:198`) y el resto de transiciones usan `CUSTODIADO`, `APERTURA`, etc. `ACTIVO`
  solo se **acepta** como estado compatible de entrada en `custodiarA`/`custodiarB`/`cancelar`
  (`Escrow.sol:228`, `:247`, `:372`). En la práctica el estado 1 no se observa en el espacio de
  estados generado por el código actual.

### 2.2 Lectura del estado

- `estado(uint256 id) external view returns (Estado)` — getter directo del enum
  (`Escrow.sol:167-169`).
- `getTrueke(uint256 id) external view returns (Trueke memory)` — struct completa
  (`Escrow.sol:163-165`).
- `siguienteId()` — contador interno expuesto (`Escrow.sol:161`), útil para enumerar truekes.

---

## 3. Estructuras de datos y estado interno

### 3.1 `struct Activo` (activo ofrecido en el trueque)

`sc/src/Escrow.sol:52-57`:

| Campo | Tipo | Significado |
|---|---|---|
| `token` | `address` | Contrato ERC20 o ERC721 |
| `tokenId` | `uint256` | `tokenId` si es NFT; `0` si es ERC20 |
| `cantidad` | `uint256` | Cantidad si es ERC20; `1` si es NFT |
| `esNft` | `bool` | `true` = ERC721, `false` = ERC20 |

La validación (`_validarActivo`, `Escrow.sol:496-503`) exige:

- `token != address(0)` → si no, `ActivoNoPermitido` (`Escrow.sol:497`).
- Si `esNft`: `tokenId != 0` **y** `cantidad == 1` (`Escrow.sol:498-499`).
- Si es ERC20: `cantidad != 0` (`Escrow.sol:500-502`).

### 3.2 `struct Trueke` (el acuerdo AtoA)

`sc/src/Escrow.sol:60-85`. Campos agrupados por función:

- **Identidad y partes**: `id`, `parteA` (ofrece `activoA` y recibe `activoB`), `parteB`
  (ofrece `activoB` y recibe `activoA`) (`Escrow.sol:61-63`).
- **Activos**: `activoA` (lo que ofrece A — se custodia) y `activoB` (lo que ofrece B)
  (`Escrow.sol:64-65`).
- **Máquina de estados**: `estado` (`Escrow.sol:66`).
- **Ventanas temporales**: `horaPautada`, `aperturaA`, `aperturaB` (0 = no abrió)
  (`Escrow.sol:67-69`).
- **Cierre**: `firmaRecepcionA/B`, `valoracionA/B`, `activoCustodiadoA/B`
  (`Escrow.sol:70-75`).
- **Ciclo 8 (CU-17/18/19)**: `solicitanteAnulacion`, `motivoAnulacion`, `plazoAnulacion`,
  `votosAFavor`, `votosEnContra`, `socioVotoRegistrado`, `resolucionTimestamp`,
  `sancionTimestamp` (`Escrow.sol:76-84`).

### 3.3 Estado del contrato

`sc/src/Escrow.sol:88-90`:

- `uint256 private _siguienteId` — contador de ids.
- `mapping(uint256 => Trueke) private _truekes` — almacén de truekes.
- `mapping(bytes32 => bool) private _votoEmitido` — slot `keccak256(abi.encodePacked(id, socio))`
  que marca el voto único de un Socio por trueke (D21).

---

## 4. Eventos y errores

### 4.1 Eventos (alimentan al indexador D25)

Los 17 eventos declarados en `sc/src/Escrow.sol:93-109` son el contrato de datos del
indexador (comentario "eventos (para el indexador, §5)" en `Escrow.sol:92`):

- Ciclo de vida: `TruekeCreado`, `CustodiaA`, `CustodiaB`, `AperturaA`, `AperturaB`,
  `RecepcionFirmadaA`, `RecepcionFirmadaB`, `ValoracionMarcadaA`, `ValoracionMarcadaB`,
  `TruekeCompletado`, `TruekeCancelado` (`Escrow.sol:93-103`).
- C8: `EscrowBloqueado`, `AnulacionSolicitada`, `VotoSocio`, `ResolucionEjecutada`,
  `ResolucionPorDefecto`, `SancionProgramada` (`Escrow.sol:104-109`).

Nota: `TruekeCreado` incluye `tokenA`/`tokenB` indexados por `id` (`Escrow.sol:93`);
`AperturaA/B` llevan `timestamp` (`Escrow.sol:96-97`).

### 4.2 Errores personalizados

`sc/src/Escrow.sol:112-125`: `NoAutorizado`, `EstadoInvalido`, `FueraDeVentanaApertura`,
`DiferenciaAperturasExcedida`, `ActivoYaCustodiado`, `SinCustodiaCompleta`,
`ActivoNoPermitido`, `SinSolicitudAnulacion` (declarado pero no usado en el código actual →
**pendiente de confirmar** su uso futuro), `AnulacionYaSolicitada`, `PlazoAnulacionVencido`,
`SoloSocio`, `QuorumNoAlcanzado` (usado con doble propósito: "ya votó", ver §10.3),
`TimelockNoVencido`, `SinSancionProgramada`.

---

## 5. Creación y custodia de activos

### 5.1 `crearTrueke(parteB, activoA, activoB, horaPautada)` (CU-11)

`sc/src/Escrow.sol:180-218`:

1. `nonReentrant`; `parteA = msg.sender`; revierte `NoAutorizado(0)` si `parteA == parteB`
   (`Escrow.sol:186-187`).
2. Valida ambos activos con `_validarActivo` (`Escrow.sol:188-189`).
3. Asigna `id = _siguienteId++` e inicializa el `Trueke` completo en `Estado.CREADO`, con todos
   los flags de apertura/custodia/firma/valoración en `false` y los campos C8 en cero
   (`Escrow.sol:191-216`).
4. Emite `TruekeCreado(id, parteA, parteB, activoA.token, activoB.token, horaPautada)`
   (`Escrow.sol:217`).

> Importante: en este contrato la **parte A es quien crea** (`msg.sender`) ofreciendo `activoA`
> y solicitando `activoB` de `parteB`. No existe una función que permita a B "aceptar" una
> oferta; B participa directamente custodiando (§5.2).

### 5.2 Custodia: `custodiarA` / `custodiarB` (CU-12)

- `custodiarA(uint256 id)` (`Escrow.sol:224-234`):
  - Solo `t.parteA`; revierte si `activoCustodiadoA` ya es `true` (`ActivoYaCustodiado`,
    `Escrow.sol:227`).
  - Estado de entrada: `CREADO` o `ACTIVO` (`Escrow.sol:228`).
  - Transfiere `activoA` de A al escrow (`_transferirDesde`, `Escrow.sol:230`), marca
    `activoCustodiadoA = true` y pasa a `CUSTODIADO`; emite `CustodiaA` (`Escrow.sol:231-233`).
- `custodiarB(uint256 id)` (`Escrow.sol:240-254`):
  - Solo `t.parteB`; revierte si ya custodiado (`Escrow.sol:243`).
  - **Permite custodiar en cualquier orden**: si A ya custodío exige estado `CUSTODIADO`
    (`Escrow.sol:244-245`); si no, admite `CREADO`/`ACTIVO` (`Escrow.sol:246-247`).
  - Idem transferencia + `activoCustodiadoB = true` + `CUSTODIADO` + `CustodiaB`
    (`Escrow.sol:250-253`).

Transferencias reales (`_transferirDesde`, `Escrow.sol:505-511`):

- NFT (ERC721): `IERC721(token).transferFrom(desde, hacia, tokenId)` (`Escrow.sol:507`).
- ERC20: `IERC20(token).safeTransferFrom(desde, hacia, cantidad)` (`Escrow.sol:509`) — exige
  `approve` previo de la parte hacia el escrow (los tests aprueban `type(uint256).max`,
  p. ej. `sc/test/EscrowCiclo8.t.sol:41-42`).

---

## 6. Apertura dual y ventanas temporales (RF-05.7)

### 6.1 `aperturaA` / `aperturaB`

- `aperturaA(uint256 id)` (`Escrow.sol:260-267`): solo `t.parteA`; `_checkApertura(t, true)`;
  registra `aperturaA = block.timestamp`, estado `APERTURA`, emite `AperturaA(id, timestamp)`.
- `aperturaB(uint256 id)` (`Escrow.sol:273-280`): solo `t.parteB`; `_checkApertura(t, false)`;
  idem con `AperturaB`.
- Ambas funciones pueden invocarse más de una vez: re-registran el timestamp y vuelven a fijar
  `APERTURA` (no hay guard de "ya abrió"). El estado `APERTURA` queda fijado desde la primera
  apertura de cualquiera de las dos partes.

### 6.2 `_checkApertura` (ventanas de ±10 minutos)

`sc/src/Escrow.sol:282-300` con las constantes (`Escrow.sol:33-35`):

- `VENTANA_APERTURA = 10 minutes` — ventana respecto de la hora pautada.
- `MAX_DIFERENCIA_APERTURAS = 10 minutes` — diferencia máxima entre aperturas de ambas partes.

Reglas verificadas en el código:

1. **Custodia completa previa**: si `!activoCustodiadoA || !activoCustodiadoB` revierte
   `SinCustodiaCompleta` (`Escrow.sol:283`). Es decir, **no se puede abrir sin que ambos
   activos estén en el escrow**.
2. **Ventana de la hora pautada**: `|ahora − horaPautada| ≤ 10 min`; la comparación evita
   underflow usando `ahora > pautada + VENTANA_APERTURA || ahora + VENTANA_APERTURA < pautada`;
   si no, `FueraDeVentanaApertura(actual, pautada)` (`Escrow.sol:285-289`).
3. **Diferencia entre aperturas**: cuando la otra parte ya abrió, la segunda apertura debe
   ocurrir a lo sumo 10 min después de la primera; si no,
   `DiferenciaAperturasExcedida(aperturaX, ahora)` (`Escrow.sol:291-299`).

### 6.3 Observación de verificación: la apertura no es un gate obligatorio de cierre

En el código, `firmarRecepcionA/B` no comprueban `estado` propio ni ventanas, y
`_intentarCompletar` acepta `APERTURA` **o `CUSTODIADO`** (`Escrow.sol:347`). En consecuencia,
un trueke con ambos activos custodiados podría completarse firmando directamente desde
`CUSTODIADO`, sin pasar por `APERTURA`. Los tests del flujo feliz siempre ejecutan la apertura
dual antes de firmar (p. ej. `sc/test/Escrow.t.sol:59-63`), por lo que en la práctica
documentada el paso existe, pero **la secuencia RF-05.7 no se impone mecánicamente en el
contrato** (observación, no promesa de función).

---

## 7. Cierre: valoraciones (D36), firmas duales y liberación en cruz

### 7.1 `marcarValoracionA` / `marcarValoracionB` (marcador on-chain, D36)

- `marcarValoracionA(uint256 id)` (`Escrow.sol:306-311`) y `marcarValoracionB(uint256 id)`
  (`Escrow.sol:316-321`): solo la parte correspondiente; fijan `valoracionA/B = true` y emiten
  `ValoracionMarcadaA/B`. **No validan estado**: pueden llamarse en cualquier momento por la
  parte (el detalle de la valoración 1–5 es off-chain — D36 en `requerimientos.md:396`; aquí
  solo queda el marcador booleano).

### 7.2 `firmarRecepcionA` / `firmarRecepcionB` (CU-14/CU-15)

- `firmarRecepcionA` (`Escrow.sol:326-332`): solo `parteA`; fija `firmaRecepcionA`; emite
  `RecepcionFirmadaA`; llama `_intentarCompletar(t)`.
- `firmarRecepcionB` (`Escrow.sol:338-344`): idem para B. No existe una función separada
  "completar": el cierre se intenta tras **cada** firma de recepción.

### 7.3 `_intentarCompletar` (cierre y liberación en cruz)

`sc/src/Escrow.sol:346-361`:

1. Estado debe ser `APERTURA` o `CUSTODIADO`; si no, `EstadoInvalido(id, APERTURA)`
   (`Escrow.sol:347`).
2. Si faltan firmas duales, `return` (espera la segunda) (`Escrow.sol:348`).
3. **Invariante I7 / RNF-06.1**: si falta la valoración de cualquiera de las partes,
   `return` — el cierre requiere valoración registrada por ambas (D36) (`Escrow.sol:349-350`).
4. Marca estado y emite **antes** de las transferencias externas ("logs ordenados para el
   indexador", `Escrow.sol:352-356`): `activoCustodiadoA/B = false`, `estado = COMPLETADO`,
   `emit TruekeCompletado`.
5. Libera en cruz (`Escrow.sol:358-360`): `_liberar(activoB, parteA)` y
   `_liberar(activoA, parteB)` — **A recibe lo que ofreció B y viceversa** (RF-05.2/05.4).

`_liberar` (`Escrow.sol:516-522`): el escrow es el balance holder, por lo que ERC20 usa
`safeTransfer` (no `transferFrom`, que exigiría auto-aprobación) y ERC721 usa
`IERC721.transferFrom(address(this), hacia, tokenId)` (válido sin approve siendo el owner).

### 7.4 Cobertura de tests

- Flujo feliz completo en `sc/test/Escrow.t.sol` (helper `_crearYCompletarFlujo`,
  `Escrow.t.sol:51-76`: custodiar → warp a la hora pautada → apertura dual → valoraciones →
  firmas).
- Invariante I7 ("ningún COMPLETADO sin firmas duales y valoración dual"),
  `sc/test/invariantes/EscrowInvariants.t.sol:117-128`.

---

## 8. Cancelación pre-custodia (D31, RF-05.3)

`cancelar(uint256 id)` (`sc/src/Escrow.sol:368-376`):

1. Solo `parteA` o `parteB` (`NoAutorizado` si no).
2. **Si algún activo está custodiado, revierte `ActivoYaCustodiado`** — no existe cancelación
   unilateral post-custodia (D31) (`Escrow.sol:371`).
3. Estado de entrada `CREADO`/`ACTIVO` (`Escrow.sol:372`).
4. Pasa a `ANULADO` (sin penalización) y emite `TruekeCancelado` (`Escrow.sol:374-375`).

Verificación: invariante I2 ("ningún ANULADO por cancelación pre-custodia retiene activos"),
`sc/test/invariantes/EscrowInvariants.t.sol:68-78`; el flujo C8 además impide `solicitarAnulacion`
sin custodia (`sc/test/EscrowCiclo8.t.sol:131-138`).

---

## 9. Bloqueo por violación de norma (CU-17)

`bloquear(uint256 id)` (`sc/src/Escrow.sol:383-388`):

- `onlyOwner` (moderación/Owner, comentario `Escrow.sol:380-382`).
- Revierte `EstadoInvalido` si el trueque ya está `COMPLETADO` o `ANULADO` (`Escrow.sol:385`);
  en el resto de estados fija `BLOQUEADO` y emite `EscrowBloqueado` (`Escrow.sol:386-387`).
- Los activos quedan congelados en el escrow (test `test_Bloquear_Owner` verifica que el saldo
  del escrow conserva el activo: `sc/test/EscrowCiclo8.t.sol:58-64`).
- Solo el Owner puede bloquear (test `test_Revert_Bloquear_NoOwner`,
  `EscrowCiclo8.t.sol:66-71`).

---

## 10. Anulación con quórum de Socios (D13/D26, CU-18)

### 10.1 Vinculación al padrón y helpers

- `address public sociosRegistry` (`Escrow.sol:131`) fijada por `vincularSociosRegistry`
  (`Escrow.sol:136-138`, `onlyOwner`; sin guard de una sola vez, admite re-vinculación).
  > En `sc/script/Deploy.s.sol` esta vinculación **no se ejecuta** (ver manual 04-Despliegue
  > §3.3): tras el deploy con ese script, el Escrow queda sin padrón → **pendiente de confirmar**
  > su vinculación en un script posterior. Los tests sí la hacen (`EscrowCiclo8.t.sol:37`).
- `_esSocio(quien)` — `staticcall` a `esSocio(address)` del registry (`Escrow.sol:140-146`).
- `_esQuorum(aFavor, enContra)` — consulta `totalSocios()` del registry **en el momento del
  voto** (no hay snapshot del padrón) y exige mayoría cualificada
  `aFavor * 3 >= total * 2 && aFavor > 0` (`Escrow.sol:148-158`). Con padrón de 3 Socios, 2 a
  favor alcanzan el quórum (test `test_Anulacion_Quorum2de3`, `EscrowCiclo8.t.sol:74-91`).

### 10.2 `solicitarAnulacion(id, motivo)` (inicio de la disputa)

`sc/src/Escrow.sol:395-406`:

1. Solo `parteA`/`parteB` (`Escrow.sol:397`).
2. Estado de entrada `CUSTODIADO` o `APERTURA` (solo tiene sentido con activos custodiados)
   (`Escrow.sol:398`).
3. Una sola solicitud por trueque: si `solicitanteAnulacion != 0`, `AnulacionYaSolicitada`
   (`Escrow.sol:399`).
4. Registra solicitante, motivo (RF-06.1) y `plazoAnulacion = block.timestamp + plazoAnulacionMax`
   (**5 días**, D13) (`Escrow.sol:401-403`).
5. Estado `EN_DISPUTA` + `emit AnulacionSolicitada` (`Escrow.sol:404-405`).

### 10.3 `votarSocio(id, aFavor)` (quórum ≥2/3)

`sc/src/Escrow.sol:412-434`:

1. `_esSocio(msg.sender)` o `SoloSocio` (`Escrow.sol:414`).
2. Estado `EN_DISPUTA` o `RESOLUCION_SOCIOS` (`Escrow.sol:415-417`).
3. Dentro del plazo: si `block.timestamp >= plazoAnulacion`, `PlazoAnulacionVencido`
   (`Escrow.sol:418`).
4. Voto único por Socio: slot `keccak256(abi.encodePacked(id, msg.sender))` en `_votoEmitido`;
   si ya votó revierte `QuorumNoAlcanzado` (reuso del error como "ya votó") (`Escrow.sol:421-422`).
5. Incrementa `votosAFavor`/`votosEnContra`, fija estado `RESOLUCION_SOCIOS`, emite `VotoSocio`
   (`Escrow.sol:425-428`).
6. Si `_esQuorum(...)`: fija `resolucionTimestamp` y llama `_anular(t, false)` — **devolución
   inmediata, sin timelock** (D13/D21, comentario `Escrow.sol:432`) (`Escrow.sol:430-433`).

### 10.4 `resolverPorDefecto(id)` (D26: ANULADO por defecto a los 5 días)

`sc/src/Escrow.sol:440-453`:

1. Estado `EN_DISPUTA`/`RESOLUCION_SOCIOS` (`Escrow.sol:442-444`).
2. Solo tras vencer el plazo (`block.timestamp >= plazoAnulacion`); si no,
   `PlazoAnulacionVencido` (`Escrow.sol:445`).
3. Si el quórum ya se alcanzó → `_anular(t, false)`; si no → `_anular(t, true)` (por defecto,
   D26, cierre en tiempo finito) (`Escrow.sol:448-452`).
4. Invocable por **cualquiera** (keeper/backend). Test: `test_Anulacion_PorDefecto_AlVencer5Dias`
   (`sc/test/EscrowCiclo8.t.sol:105-120`) con `vm.warp(block.timestamp + 5 days + 1)`.

### 10.5 `_anular` (devolución de activos)

`sc/src/Escrow.sol:484-493`:

- Devuelve cada activo custodiado a su dueño (`_liberar(activoA, parteA)` /
  `_liberar(activoB, parteB)`) (RF-06.1/D26) (`Escrow.sol:486-487`).
- Limpia flags de custodia y fija `ANULADO` (`Escrow.sol:488-490`).
- Emite `ResolucionPorDefecto` (si por defecto) o `ResolucionEjecutada(id, true)` si no
  (`Escrow.sol:491-492`).

#### Observación de verificación sobre la resolución de disputas

- En el código actual, una vez solicitada la anulación, la **única salida posible es `ANULADO`**
  (por quórum a favor o por defecto al vencer el plazo): no existe ruta on-chain que "rechace"
  la anulación y reanude el trueque. El evento `ResolucionEjecutada` solo se emite con
  `anulada = true` (`Escrow.sol:492`). El test `test_Anulacion_QuorumRechazado` (votos en
  contra mayoritarios) deja el escrow en `RESOLUCION_SOCIOS` dentro del plazo
  (`sc/test/EscrowCiclo8.t.sol:93-103`), y al vencer el plazo `resolverPorDefecto` lo anula
  igualmente (invariante I4, `EscrowInvariants.t.sol:82-96`). Si el diseño prevé "rechazo →
  continuar el trueque", eso **no está implementado** → **pendiente de confirmar**.

---

## 11. Sanción con timelock de 6 horas (D21, CU-19)

### 11.1 `programarSancion(id)` — solo Socios

`sc/src/Escrow.sol:460-469`:

1. `_esSocio(msg.sender)` o `SoloSocio` (`Escrow.sol:462`).
2. Estado de entrada `BLOQUEADO` o `RESOLUCION_SOCIOS` (`Escrow.sol:463-465`).
3. Fija `sancionTimestamp = block.timestamp + timelockSanciones` (**6 h**, D21,
   `Escrow.sol:133`), estado `RESOLUCION_SOCIOS`, emite `SancionProgramada`
   (`Escrow.sol:466-468`).

### 11.2 `ejecutarSancion(id)` — tras el timelock

`sc/src/Escrow.sol:472-482`:

1. Si no hay sanción programada (`sancionTimestamp == 0`), `SinSancionProgramada`
   (`Escrow.sol:474`).
2. Si `block.timestamp < sancionTimestamp`, `TimelockNoVencido(falta)` (`Escrow.sol:475-477`).
3. Ejecuta: `estado = BLOQUEADO` (bloqueo definitivo sin liberación, según comentario
   `Escrow.sol:478`), resetea `sancionTimestamp`, emite `EscrowBloqueado` (`Escrow.sol:479-481`).

Test: `test_Sancion_Timelock6h` (`sc/test/EscrowCiclo8.t.sol:141-158`) — a las 5 h revierte; a
las 6 h ejecuta. Invariante I5 ("ninguna sanción programada puede dejar el escrow `BLOQUEADO`
antes del timelock"), `sc/test/invariantes/EscrowInvariants.t.sol:100-114`.

#### Observación de verificación sobre la sanción

- La "sanción" ejecutada por el contrato es el **bloqueo definitivo sin liberación**
  (`Escrow.sol:478`), que es el estado al que también lleva `bloquear` (Owner). En el código
  actual no se observa un mecanismo que, tras la sanción, devuelva o redistribuya los activos
  congelados; la interpretación económica/sancionatoria exacta queda **pendiente de confirmar**
  frente a RF-06.3.

---

## 12. Parámetros temporales y de gobernanza

Variables de configuración en `sc/src/Escrow.sol:131-133`:

| Variable | Valor por defecto | ¿Configurable? | Fuente |
|---|---|---|---|
| `sociosRegistry` | `address(0)` | Sí, por Owner (`vincularSociosRegistry`) | `Escrow.sol:131`, `:136-138` |
| `plazoAnulacionMax` | `5 days` | **No** (variable pública sin setter; efectivamente fija tras el deploy) | `Escrow.sol:132` |
| `timelockSanciones` | `6 hours` | **No** (ídem) | `Escrow.sol:133` |
| `VENTANA_APERTURA` | `10 minutes` (constante) | No | `Escrow.sol:33` |
| `MAX_DIFERENCIA_APERTURAS` | `10 minutes` (constante) | No | `Escrow.sol:35` |

---

## 13. Resumen de pendientes de confirmar y observaciones

1. El estado `ACTIVO` (1) nunca se asigna en el código actual; solo se acepta como estado de
   entrada (§2.1).
2. La apertura dual no es un requisito mecánico para completar: `_intentarCompletar` admite
   `CUSTODIADO` (§6.3).
3. Sin ruta on-chain de "rechazo de anulación": toda solicitud de anulación termina en
   `ANULADO` (quórum o por defecto) (§10.5).
4. `BLOQUEADO` no tiene en el código una salida que libere/redistribuya activos; el ciclo
   sanción lleva de vuelta a `BLOQUEADO` (§11).
5. El Escrow no referencia BRLT/FondoDeValor: la comisión del 1 % de trueques completados (D7)
   es **pendiente de confirmar** (integración posterior, `FondoDeValor.sol:20`).
6. `SinSolicitudAnulacion` está declarado pero no se usa (§4.2).
7. La vinculación Escrow ↔ SociosRegistry no está en `Deploy.s.sol` (§10.1).
