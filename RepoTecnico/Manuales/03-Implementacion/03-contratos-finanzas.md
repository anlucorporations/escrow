# Manual técnico · Implementación: contratos de finanzas y gobernanza (`SociosRegistry`, `BRLT`, `FondoDeValor`, `SuscripcionEmpresa`)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: implementación de la capa
> financiera y de gobernanza (Ciclo 3): padrón y votaciones de Socios (D21/D32), stablecoin
> BRLT con tope de emisión de 1.000.000 (D32) y contribución del 5 % al fondo (D7), fondo de
> valor con porcentajes configurables 1 %/10 %/5 % (D7) y suscripción de empresas por staking
> bloqueado de 30 días (D33) con el 10 % al fondo (D7). Todo lo citado es código real verificado
> con `ruta:línea`; lo no verificable se marca **pendiente de confirmar**.

---

## 1. Visión general de la capa financiera

### 1.1 Ficha de los cuatro contratos

| Contrato | Archivo | Rol declarado | Trazabilidad declarada |
|---|---|---|---|
| `SociosRegistry` | `sc/src/SociosRegistry.sol` (203 líneas) | Padrón vigente de Socios y votaciones (admisión + propuestas económicas) | RF-01.9, RF-03.9, RF-12.3, D21, D32, CU-03/31 (`SociosRegistry.sol:15`) |
| `BRLT` | `sc/src/BRLT.sol` (111 líneas) | Stablecoin ERC-20 "BorloTokens" controlada por el SociosRegistry | RF-12.1-12.4, RF-14.7, D5/D6/D7/D32, CU-31 (`BRLT.sol:19`) |
| `FondoDeValor` | `sc/src/FondoDeValor.sol` (99 líneas) | Fondo para gastos de operación; 1 % trueque + 10 % suscripción + 5 % emisión BRLT | RF-03.9, D7, D15, CU-30 (`FondoDeValor.sol:22`) |
| `SuscripcionEmpresa` | `sc/src/SuscripcionEmpresa.sol` (158 líneas) | Suscripción de empresas con cobro por staking bloqueado | RF-09.3/09.4, RF-10, R2, D7/D33, CU-24 (`SuscripcionEmpresa.sol:19`) |
| Suite | `sc/test/Ciclo3.t.sol` (319 líneas) | CU-03, CU-24, CU-30, CU-31 | cabecera `Ciclo3.t.sol:10-19` |

### 1.2 Relaciones entre contratos (vinculaciones reales)

Las vinculaciones se ejecutan **por el Owner** en el script de despliegue
(`sc/script/Deploy.s.sol:53-58`) y en `setUp` de los tests (`sc/test/Ciclo3.t.sol:41-46`):

| Contrato | Vincula | Función | Fuente |
|---|---|---|---|
| `BRLT` | SociosRegistry (autoridad de emisión) | `vincularRegistry` | `BRLT.sol:55-58` |
| `BRLT` | FondoDeValor (recibe 5 %) | `vincularFondo` | `BRLT.sol:60-63` |
| `FondoDeValor` | BRLT (token + emisor del 5 %) | `vincularBrlt` | `FondoDeValor.sol:48-52` |
| `SociosRegistry` | BRLT (destino de propuestas económicas) | `vincularBrlt` | `SociosRegistry.sol:68-71` |
| `SuscripcionEmpresa` | BRLT (token de pago) y FondoDeValor (10 %) | `vincularBrlt` / `vincularFondo` | `SuscripcionEmpresa.sol:69-77` |
| `Escrow` | SociosRegistry (quórum de disputas) | `vincularSociosRegistry` | `sc/src/Escrow.sol:136-138` (no se ejecuta en `Deploy.s.sol` — ver manual 01) |

Ninguna de las funciones `vincular*` tiene guard de una sola vez: son `onlyOwner` y admiten
re-vinculación.

---

## 2. `SociosRegistry` (padrón + gobernanza, D21/D32)

### 2.1 Estado y tipos

- `enum TipoPropuesta { EMITIR_BRLT, SUBIR_TOPE_BRLT }` (`SociosRegistry.sol:19`) — las dos
  decisiones económicas delegadas al contrato BRLT.
- `struct Propuesta` con `id`, `tipo`, `proponente`, `descripcion` (**hash** del detalle
  off-chain, D32), `parametro` (monto a emitir o nuevo tope), `votosAFavor`, `votosEnContra`,
  `totalVotado`, `creadaEn`, `ejecutada`, `cerrada` (`SociosRegistry.sol:21-33`).
- Estado: `brlt` (contrato vinculado), `esSocio` (mapping), `socios` (array para totalizar),
  `proximaPropuestaId`, `propuestas`, `yaVoto` (`SociosRegistry.sol:36-42`).
- Owner: el desplegador (`constructor() Ownable(msg.sender)`, `SociosRegistry.sol:64`).

### 2.2 Padrón: altas/bajas

- `admitirSocioDirecto(socio)` (`onlyOwner`) — siembra inicial del padrón / caso fundacional;
  revierte `YaSocio` si ya está (`SociosRegistry.sol:74-77`).
- `removerSocio(socio)` (`onlyOwner`) — baja con **swap+pop** sobre el array `socios` para
  mantener la lista compacta; revierte `NoSocio` si no existe (`SociosRegistry.sol:79-91`).
- `totalSocios()` — `socios.length` (`SociosRegistry.sol:94`); lo consulta el `Escrow` vía
  `staticcall` para sus quórums de disputa (ver manual 01).

### 2.3 Quórum de aprobación (helper compartido)

`esQuorumAprobado(votosAFavor)` (`SociosRegistry.sol:96-100`):
`votosAFavor * 3 >= socios.length * 2 && votosAFavor > 0` — mayoría cualificada ≥2/3 del padrón
**vigente en el momento del cálculo** (sin snapshot; si cambia el padrón, cambia el quórum).
Con 3 Socios, 2 votos a favor bastan (test `test_AdmisionSocio_Quorum2de3`,
`Ciclo3.t.sol:55-60`).

### 2.4 Admisión de Socios por votación (CU-03, D21)

Registros de votación por candidato (`SociosRegistry.sol:108-111`): `votoAdmision[candidato][socio]`,
`votosAFavorAdmision`, `votosEnContraAdmision`, `candidatoPendiente`.

- `solicitarAdmision()` — el propio candidato se postula; revierte `YaSocio` si ya es Socio;
  marca `candidatoPendiente[candidato] = true` (`SociosRegistry.sol:113-117`).
- `votarAdmision(candidato, aFavor)` — solo Socios (`SoloSocio`); exige candidato pendiente
  (`NoSocio`) y voto no emitido (`YaVoto`) (`SociosRegistry.sol:119-123`).
- Al alcanzar `esQuorumAprobado(votosAFavorAdmision[candidato])` el candidato se **admite
  automáticamente** (`_registrarSocio`) y deja de estar pendiente
  (`SociosRegistry.sol:128-131`).
- El puntaje ≥76 del candidato se valida off-chain (comentario `SociosRegistry.sol:103-107`) →
  **pendiente de confirmar** el mecanismo off-chain que lo garantiza.
- `_registrarSocio` (privado) marca `esSocio` y hace `push` al array; emite `SocioAdmitido`
  (`SociosRegistry.sol:194-198`).

### 2.5 Propuestas económicas (D32)

#### 2.5.1 `crearPropuesta(tipo, descripcion, parametro)`

`SociosRegistry.sol:135-156`:

- `onlyOwner` — **solo el Owner crea propuestas** (el `proponente` registrado es siempre
  `msg.sender` = Owner; la descripción es un `bytes32` hash del detalle off-chain).
- Requiere BRLT vinculado (`SinBrltVinculado` si `brlt == address(0)`) (`SociosRegistry.sol:140`).
- Registra la propuesta con `creadaEn = block.timestamp` y emite `PropuestaCreada`
  (`SociosRegistry.sol:141-155`). No hay plazo de cierre/expiración para propuestas sin quórum.

#### 2.5.2 `votarPropuesta(id, aFavor)`

`SociosRegistry.sol:158-176`:

1. Solo Socios (`SoloSocio`) (`SociosRegistry.sol:159`).
2. Propuesta abierta: si `cerrada || ejecutada` revierte `PropuestaCerrada`; voto único por
   Socio (`YaVoto`) (`SociosRegistry.sol:161-163`).
3. Acumula y emite `VotoEmitido` (`SociosRegistry.sol:164-167`).
4. **Ejecución inmediata al alcanzar el quórum**: si `esQuorumAprobado(votosAFavor)` marca
   `ejecutada`/`cerrada` y llama `_ejecutar(p)` + `PropuestaEjecutada`
   (`SociosRegistry.sol:170-175`).

#### 2.5.3 `_ejecutar` (llamadas de bajo nivel al BRLT)

`SociosRegistry.sol:178-191`:

- `EMITIR_BRLT` → `brlt.call(abi.encodeWithSignature("emitir(uint256,address,bytes32)", parametro, proponente, descripcion))` — la emisión se dirige al **proponente (Owner)**; el 5 % se mintea al fondo dentro de BRLT (D7). `require(ok, "emitir fallo")` (`SociosRegistry.sol:179-184`).
- `SUBIR_TOPE_BRLT` → `brlt.call(abi.encodeWithSignature("subirTope(uint256)", parametro))`; `require(ok, "subirTope fallo")` (`SociosRegistry.sol:185-190`).

> Observación: la votación es binaria y solo la **aprobación** ejecuta; una propuesta sin
> quórum permanece abierta (no hay cierre por plazo ni por votos en contra) y no existe
> mecanismo para "ejecutar después" de una propuesta aprobada fuera del propio voto que alcanza
> el quórum.

---

## 3. `BRLT` (BorloTokens, stablecoin de la plataforma)

### 3.1 ERC-20 con tope de emisión (D32)

- Hereda `ERC20("BorloTokens", "BRLT")` + `Ownable` (`BRLT.sol:21`, constructor
  `BRLT.sol:50-52`).
- `topeEmision = 1_000_000 ether` — **tope inicial 1.000.000 BRLT** (D32)
  (`BRLT.sol:51`). Aumentarlo exige votación de ≥2/3 de Socios (D32, `requerimientos.md:392`).
- Estado: `registry` (autoridad de emisión, D6/D32), `fondoDeValor` (destino del 5 %, D7),
  `porcentajeFondo = 5` (configurable por Owner) (`BRLT.sol:23-26`).
- Registro de emisiones: `totalEmisiones`, `struct Emision { monto, proposito, timestamp }` y
  mapping `emisiones` (`BRLT.sol:28-34`) — cada emisión queda registrada con su propósito
  (D32, `EmisionRegistrada`).

### 3.2 Configuración (Owner)

- `vincularRegistry(registry_)` (`BRLT.sol:55-58`), `vincularFondo(fondo_)`
  (`BRLT.sol:60-63`), `setPorcentajeFondo(pct)` (`BRLT.sol:65-68`) — todas `onlyOwner`.

### 3.3 `emitir(monto, destino, proposito)` — solo vía SociosRegistry

`BRLT.sol:76-97`:

1. `msg.sender != registry` → `SoloRegistry` (`BRLT.sol:77`) — el quórum ≥2/3 ya lo validó el
   SociosRegistry (D32).
2. Tope: si `totalSupply() + monto > topeEmision`, `ExcedeTope(disponible, solicitado)`
   (`BRLT.sol:78-80`).
3. **5 % al fondo (D7)**: `alFondo = (monto * porcentajeFondo) / 100`; `neto = monto - alFondo`
   (`BRLT.sol:83-84`). Si `alFondo > 0` y hay fondo vinculado: `_mint(fondoDeValor, alFondo)` y
   `FondoDeValorLike(fondoDeValor).registrarEmision(alFondo)` (`BRLT.sol:86-89`).
4. Si `neto > 0`, `_mint(destino, neto)` (`BRLT.sol:90-92`).
5. Registra la `Emision` y emite `EmisionRegistrada`; incrementa `totalEmisiones`
   (`BRLT.sol:94-96`).

### 3.4 `subirTope(nuevoTope)` — solo vía registry

`BRLT.sol:100-105`: `msg.sender != registry` → `SoloRegistry`; `require(nuevoTope > topeEmision)`;
actualiza y emite `TopeActualizado`.

### 3.5 Interfaz `FondoDeValorLike`

`BRLT.sol:109-110`: interfaz mínima con `registrarEmision(uint256)` para que BRLT notifique la
contribución al fondo.

---

## 4. `FondoDeValor` (1 % / 10 % / 5 % configurables, D7)

### 4.1 Propósito y estado

- Fondo para gastos de operación (hosting, gas, red de despliegue — RF-03.9)
  (`FondoDeValor.sol:10-13`), nutrido por tres fuentes (D7, `requerimientos.md:367`).
- Estado: `brlt` (IERC20) y `brltContract` (dirección emisora del 5 %), y los tres porcentajes
  configurables por el Owner (`FondoDeValor.sol:28-32`):
  - `porcentajeTrueque = 1` (1 % del valor de cada trueque completado)
  - `porcentajeSuscripcion = 10` (10 % de las suscripciones de empresas)
  - `porcentajeEmision = 5` (5 % de la emisión de BRLT)
- Owner: el desplegador (`constructor() Ownable(msg.sender)`, `FondoDeValor.sol:46`).

### 4.2 Configuración (Owner, D7)

- `vincularBrlt(brlt_)` fija `brlt` y `brltContract` (`FondoDeValor.sol:48-52`).
- `setPorcentajeTrueque` / `setPorcentajeSuscripcion` / `setPorcentajeEmision`
  (`FondoDeValor.sol:55-68`) — emiten `PorcentajeActualizado(parametro, valor)`.

### 4.3 Aportes (entradas)

- `registrarEmision(monto)` — **solo `brltContract`** (`SoloBrlt`): registra la contribución del
  5 % que BRLT ya minteó a este contrato; emite `ContribucionRegistrada(3, monto)` (fuente 3 =
  emisión) (`FondoDeValor.sol:72-76`).
- `depositarDesde(monto)` — depósito voluntario de BRLT **previa aprobación ERC-20**: el fondo
  hace `safeTransferFrom(msg.sender, this, monto)`; emite `ContribucionRegistrada(2, monto)`
  (fuente 2 = suscripción) (`FondoDeValor.sol:79-83`). No hay lista de remitentes autorizados:
  cualquier cuenta que apruebe puede depositar (comentario "fuentes autorizadas previa
  aprobación ERC-20", `FondoDeValor.sol:78`).
- `saldoBrlt()` — `balanceOf(this)` sobre BRLT (`FondoDeValor.sol:95-98`).

> **Fuente 1 (trueque 1 %) — pendiente de confirmar**: el contrato declara `porcentajeTrueque`
> y el evento `ContribucionRegistrada` admite `fuente=1`, pero **no existe función que la
> invoque**: el depósito del 1 % de trueques completados corresponde al `Escrow`, "integración
> de ciclos posteriores" (comentario `FondoDeValor.sol:20`). Además, `depositarDesde` siempre
> emite fuente 2, por lo que un futuro depósito del Escrow por esta vía se registraría como
> suscripción. El cálculo del 1 % tampoco ocurre en ningún contrato actual → **pendiente de
> confirmar**.

### 4.4 Salidas

- `retirarParaOperacion(destino, monto)` — `onlyOwner` (Owner / Operador de Infraestructura —
  D15/RF-18.1): `safeTransfer` de BRLT al destino; emite `RetiroParaOperacion`
  (`FondoDeValor.sol:87-92`). Revierte `SinBrlt` si no hay BRLT vinculado y `MontoCero`.

---

## 5. `SuscripcionEmpresa` (staking bloqueado 30 días, D33)

### 5.1 Modelo y estado

- Cobro automático por **staking bloqueado** (D33, `requerimientos.md:393`): la empresa aprueba
  BRLT y al suscribirse el contrato **retiene el monto del plan por 30 días**; al vencer el
  ciclo, `recolectarCiclo` (keeper/relayer/backend) ejecuta el cobro y aplica el 10 % al
  FondoDeValor (D7) (`SuscripcionEmpresa.sol:8-13`).
- `enum EstadoSuscripcion { NO_SUSCRITA, ACTIVA, IRREGULAR, CANCELADA }`
  (`SuscripcionEmpresa.sol:25`).
- `struct Suscripcion { estado, montoPlan, cicloInicio, ultimoCobro, fallosCobro }`
  (`SuscripcionEmpresa.sol:27-33`).
- Configurables por el Owner: `planBase = 100 ether` (100 BRLT/mes), `porcentajeFondo = 10`;
  fijos sin setter: `periodo = 30 days`, `maxFallos = 3` (`SuscripcionEmpresa.sol:38-41`).
  Getter explícito: `suscripciones(empresa)` (`SuscripcionEmpresa.sol:46-48`).

### 5.2 Configuración (Owner)

- `vincularBrlt` (`SuscripcionEmpresa.sol:69-72`), `vincularFondo` (`SuscripcionEmpresa.sol:74-77`),
  `setPlanBase(nuevoPlan)` con `PlanCero` si es 0 (`SuscripcionEmpresa.sol:79-83`).
- `periodo` y `maxFallos` no tienen setter → fijos tras el deploy.

### 5.3 `suscribirse()` — bloqueo del staking (CU-24)

`SuscripcionEmpresa.sol:90-105`:

1. Requiere BRLT vinculado (`SinBrlt`).
2. Si ya está `ACTIVA`, `YaSuscrita` (`SuscripcionEmpresa.sol:92`).
3. `brlt.safeTransferFrom(msg.sender, address(this), planBase)` — transfiere el monto al
   contrato (`SuscripcionEmpresa.sol:95`).
4. Registra `ACTIVA` con `montoPlan = planBase`, `cicloInicio = ultimoCobro = block.timestamp`,
   `fallosCobro = 0`; emite `Suscrita` (`SuscripcionEmpresa.sol:97-104`).
- La empresa paga el gas de sus transacciones (R1) y no requiere firma manual por período
  (RF-10.1, R2) (`SuscripcionEmpresa.sol:15-16`).

### 5.4 `recolectarCiclo(empresa)` — cobro al vencer 30 días

`SuscripcionEmpresa.sol:113-136`:

1. Solo `ACTIVA` (`NoSuscrita`); si `block.timestamp < cicloInicio + periodo` (30 días),
   `CicloNoVencido(falta)` (`SuscripcionEmpresa.sol:115-117`).
2. `cobro = montoPlan`; `alFondo = (cobro * porcentajeFondo) / 100` (10 %);
   `neto = cobro - alFondo` (`SuscripcionEmpresa.sol:119-124`).
3. Si `alFondo > 0` y hay fondo: `brlt.approve(fondoDeValor, alFondo)` + `FondoLike(fondo).depositarDesde(alFondo)`
   — el fondo hace `transferFrom` sobre este contrato (`SuscripcionEmpresa.sol:128-131`).
4. Actualiza `ultimoCobro` y `cicloInicio = block.timestamp`; emite `CicloRecolectado(empresa, cobro, alFondo)`
   (`SuscripcionEmpresa.sol:133-135`).

Comportamiento económico verificado en el código:

- El `neto` (90 %) **permanece en el contrato** como fondos de operación de la plataforma
  (comentario `SuscripcionEmpresa.sol:126-127`); no se transfiere a otra dirección.
- El staking original (`montoPlan`) **no se consume ni se repone por ciclo**: el contrato solo
  mueve el 10 % mensual hacia el fondo y reinicia `cicloInicio` sin transferencias nuevas de la
  empresa. La empresa no vuelve a aprobar por cada ciclo (RF-10.1).
- El comentario "si el saldo del contrato no cubre el próximo ciclo, la suscripción pasa a
  IRREGULAR" (`SuscripcionEmpresa.sol:121-122`) **no está implementado**: no hay comprobación
  de saldo ni transición automática en `recolectarCiclo`.

### 5.5 `cancelarSuscripcion()` — devolución del staking no cobrado (CU-24 A2)

`SuscripcionEmpresa.sol:139-145`:

1. Solo si está `ACTIVA` (`NoSuscrita`).
2. Marca `CANCELADA` y **devuelve `s.montoPlan`** con `safeTransfer` a la empresa; emite
   `SuscripcionCancelada` (`SuscripcionEmpresa.sol:142-144`).
- Observación: la devolución entrega el `montoPlan` completo (100 BRLT) sin prorrateo por
  tiempo transcurrido en el ciclo; si el saldo del contrato ya fue drenado por ciclos previos
  (10 % × N hacia el fondo), la transferencia puede revertir por saldo insuficiente. La
  política exacta de prorrateo/antigüedad queda **pendiente de confirmar**.

### 5.6 `marcarIrregular(empresa)` y el flag de fallos (RF-18.3)

`SuscripcionEmpresa.sol:148-152`: `onlyOwner` — marca `IRREGULAR` manualmente (soporte) y emite
`SuscripcionIrregular`.

> **Observación importante**: `fallosCobro` y `maxFallos` están declarados
> (`SuscripcionEmpresa.sol:32`, `:41`) pero **ningún flujo los incrementa ni consulta**: no hay
> detección automática de fallos reiterados → `IRREGULAR` (RF-18.3). El único camino a
> `IRREGULAR` es la llamada manual del Owner. **Pendiente de confirmar** la automatización
> prevista.

### 5.7 Interfaz `FondoLike`

`SuscripcionEmpresa.sol:156-158`: interfaz mínima con `depositarDesde(uint256)`.

---

## 6. Despliegue (orden y vinculaciones)

`Deploy.run()` (`sc/script/Deploy.s.sol:28-72`) despliega en orden: `Escrow` (:34),
`SmartAccountFactory` (:37), mocks TKA/TKB (:40-41) y NFT (:44), y el bloque Ciclo 3
`BRLT` + `FondoDeValor` + `SociosRegistry` + `SuscripcionEmpresa` (:47-50), seguido de las
**seis vinculaciones** `onlyOwner` (:53-58). El owner es la cuenta 0 del anvil (RF-15.1,
`Deploy.s.sol:29-31` y log :71). La vinculación `Escrow.vincularSociosRegistry` **no** se
ejecuta en este script (ver manual 01-contratos-escrow §10.1).

---

## 7. Notas de verificación y pendientes de confirmar

1. El 1 % de trueques completados (D7) no tiene implementación: ninguna función del
   `FondoDeValor` ni del `Escrow` la ejecuta (§4.3).
2. `depositarDesde` registra siempre fuente 2 (`ContribucionRegistrada(2, ...)`) aunque lo
   invoque otra fuente autorizada (§4.3, observación).
3. `recolectarCiclo` no comprueba saldo para el ciclo siguiente ni detecta fallos
   automáticamente; `maxFallos`/`fallosCobro` están sin uso (§5.4/§5.6).
4. `cancelarSuscripcion` devuelve el `montoPlan` íntegro sin prorrateo y puede revertir si el
   contrato ya no tiene saldo (§5.5).
5. En `SociosRegistry`, las propuestas sin quórum no expiran y no hay ejecución diferida;
   además `crearPropuesta` es `onlyOwner` (§2.5).
6. La admisión de Socios depende del puntaje ≥76 validado off-chain (§2.4) → **pendiente de
   confirmar**.
7. Suite: `sc/test/Ciclo3.t.sol` cubre admisión por quórum 2/3 (CU-03), emisión BRLT con tope y
   5 % al fondo (CU-31), suscripción con 10 % al fondo (CU-24) y porcentajes configurables del
   fondo (CU-30) (cabecera `Ciclo3.t.sol:10-19`).
