# Manual técnico · Implementación: contratos de identidad (`SmartAccount` + `SmartAccountFactory`)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: implementación de la wallet de
> identidad del usuario particular (patrón inspirado en ERC-4337 sin EntryPoint — D35) y su
> factory de despliegue CREATE2. Cubre: ejecución por firma EIP-712 con nonce por cuenta
> (D16/D35), escalera de verificación INSCRITO/VERIFICADO/CERTIFICADO certificada por merkle
> root (D28, RF-01.7) y recuperación social 3 guardianes / umbral 2 de 3 / timelock 48 h (D34).
> Todo lo citado es código real verificado con `ruta:línea`; lo no verificable se marca
> **pendiente de confirmar**.

---

## 1. Visión general

### 1.1 Ficha técnica

| Aspecto | Valor verificado | Fuente |
|---|---|---|
| Contratos | `SmartAccount` (264 líneas) y `SmartAccountFactory` (54 líneas) | `sc/src/SmartAccount.sol`, `sc/src/SmartAccountFactory.sol` |
| Pragma | `^0.8.24` en ambos | `SmartAccount.sol:2`, `SmartAccountFactory.sol:2` |
| Herencia | `EIP712` + `ReentrancyGuard` (SmartAccount) | `SmartAccount.sol:24` |
| Imports OZ | `EIP712`, `ECDSA`, `MerkleProof`, `ReentrancyGuard` | `SmartAccount.sol:4-7` |
| Rol declarado | Wallet de identidad de cada usuario particular (RF-02.1, D22) | `SmartAccount.sol:10-14` |
| Trazabilidad declarada | RF-01.7, RF-02.1–02.3, D16, D22, D28, D34, D35, CU-01/02/04 | `SmartAccount.sol:21-22`; `SmartAccountFactory.sol:12` |
| Suite | `sc/test/SmartAccount.t.sol` (232 líneas) | cabecera `SmartAccount.t.sol:8-15` |

### 1.2 Por qué existe este par de contratos

- **`SmartAccount`** es la identidad on-chain del particular: guarda el `owner` (EOA del
  usuario), el estado de verificación y su prueba merkle, y ejecuta llamadas arbitrarias solo
  con firma EIP-712 del owner, de modo que un **relayer propio** envíe la transacción pagando
  el gas (RF-02.3/RF-09.2) (`SmartAccount.sol:11-14`).
- **`SmartAccountFactory`** despliega esas cuentas con CREATE2, una por owner, para que el
  usuario no incurra en gas (RF-09.1–09.2, CU-01) (`SmartAccountFactory.sol:8-10`).
- Decisión D35 (no EntryPoint oficial): `requerimientos.md:395`; sin EntryPoint/bundler/
  paymaster desplegado (RNF-05.1).

---

## 2. `SmartAccount`: estado, dominio EIP-712 y constantes

### 2.1 Constructor y dominio EIP-712

```solidity
constructor(address ownerInicial, bytes32 rootInicial) EIP712("TrueKeate SmartAccount", "1")
```

`sc/src/SmartAccount.sol:82-86`:

- `owner = ownerInicial` (la EOA del usuario).
- `kycMerkleRoot = rootInicial` (root inicial del usuario **INSCRITO**; puede ser 0 hasta el
  KYC, comentario `SmartAccount.sol:81`).
- `estadoVerificacion = EstadoVerificacion.INSCRITO`.
- Dominio EIP-712 con nombre `"TrueKeate SmartAccount"` y versión `"1"`; el separador de
  dominio es consultable con `domainSeparator()` (`SmartAccount.sol:97-99`).

### 2.2 Estado on-chain

`sc/src/SmartAccount.sol:50-56`:

- `address public owner` — propietario actual (cambiable solo por recuperación social).
- `bytes32 public kycMerkleRoot` — certifica el estado de verificación (RF-01.7).
- `EstadoVerificacion public estadoVerificacion` — escalera D28.
- `uint256 public nonce` — **nonce por cuenta** (anti-replay, D16).
- `address[NUM_GUARDIANES] private _guardianes` — guardianes designados.
- `PropuestaRecuperacion private _propuesta` — propuesta de recuperación en curso.

### 2.3 Tipos y constantes

- `enum EstadoVerificacion { INSCRITO, VERIFICADO, CERTIFICADO }` (`SmartAccount.sol:29`) —
  escalera de verificación del usuario (D28, `requerimientos.md:388`).
- `struct PropuestaRecuperacion` con `nuevoOwner`, `momentoAprobada`, `aprobacionesBitmask`
  (bits 0..2 por guardián) y `solicitante` (`SmartAccount.sol:31-36`).
- Typehashes EIP-712 (`SmartAccount.sol:39-42`):
  - `Execute(address to,uint256 value,bytes data,uint256 nonce)`
  - `CambiarEstadoVerificacion(uint8 estado,uint256 nonce)`
- Constantes de recuperación social (D34, `requerimientos.md:394`):
  `NUM_GUARDIANES = 3`, `UMBRAL_GUARDIANES = 2`, `TIMELOCK_RECUPERACION = 48 hours`
  (`SmartAccount.sol:45-47`).

---

## 3. Ejecución por firma EIP-712: `execute` (meta-transacción, D16/D35)

### 3.1 Firma y comportamiento

`execute(destino, valor, data, nonceFirma, firma)` (`sc/src/SmartAccount.sol:113-132`):

1. `nonReentrant` (`SmartAccount.sol:119`).
2. **Nonce**: si `nonceFirma != nonce` revierte `NonceInvalido(esperado, recibido)`
   (`SmartAccount.sol:120`) — garantiza que cada intent firmado se usa una sola vez (D16).
3. **Firma del owner**: `_validarFirmaOwner(_hashExecute(...), firma)` (`SmartAccount.sol:121`);
   el digest se construye con `_hashTypedDataV4` sobre el typehash `Execute` con
   `keccak256(data)` como hash del payload (`SmartAccount.sol:223-231`).
4. Incrementa el nonce y emite `Ejecutado(destino, data, nonce)` **antes** de la llamada
   (`SmartAccount.sol:122-123`).
5. Ejecuta `destino.call{value: valor}(data)` (`SmartAccount.sol:124`); si falla, **propaga el
   revert de la llamada interna** con `assembly { revert(add(ret, 32), mload(ret)) }`
   (`SmartAccount.sol:126-130`).

### 3.2 Recuperación del firmante

`_validarFirmaOwner` (`SmartAccount.sol:237-240`): `digest.recover(firma)` vía ECDSA; si el
firmante no es `owner`, `FirmaInvalida`. Los tests firman con `vm.sign` y concatenan `r,s,v`
(`sc/test/SmartAccount.t.sol:40-43`) y reconstruyen el digest manualmente contra
`cuenta.domainSeparator()` (`SmartAccount.t.sol:45-53`).

> El contrato **no** exige internamente un estado de verificación mínimo para `execute`
> (p. ej. VERIFICADO): la restricción de "solo Smart Accounts de particulares verificados" la
> aplica el **relayer/backend** como protección anti-abuso (D16/D29, ver
> `backend/relayer.js` y manual de backend). Observación: la política de uso está off-chain.

---

## 4. Escalera de verificación por merkle root (D28, RF-01.7)

### 4.1 Qué certifica el contrato

- La metadata KYC se almacena **cifrada off-chain**; on-chain solo queda el `kycMerkleRoot`
  (RF-01.7, `requerimientos.md:38`) que certifica el estado de la escalera **sin revelar la
  identidad real** (RNF-01.3/01.4, comentario `SmartAccount.sol:16-17`).

### 4.2 `cambiarEstadoVerificacion(nuevoEstado, nuevoRoot, nonceFirma, firma)` (CU-02)

`sc/src/SmartAccount.sol:140-152`:

1. `nonReentrant`; valida nonce (`NonceInvalido`) (`SmartAccount.sol:146`).
2. Valida firma EIP-712 del owner del digest
   `_hashCambiarEstado(uint8(nuevoEstado), nonceFirma)` (typehash
   `CambiarEstadoVerificacion(uint8 estado,uint256 nonce)`, `SmartAccount.sol:233-235`).
3. Incrementa el nonce, fija `estadoVerificacion = nuevoEstado` y `kycMerkleRoot = nuevoRoot`
   (`SmartAccount.sol:148-150`), emite `MerkleRootActualizado(nuevoRoot, nuevoEstado)`
   (`SmartAccount.sol:151`).
- El flujo documentado (CU-02) es que el backend actualice el estado invocando esta función
  con la firma del owner (comentario `SmartAccount.sol:136-138`).

#### Observación de verificación sobre la escalera

- El contrato **no valida la monotonicidad** de la escalera (INSCRITO → VERIFICADO →
  CERTIFICADO): cualquier valor del enum puede fijarse con una firma válida del owner, incluida
  una "bajada" de estado o un salto directo a CERTIFICADO. La progresión real depende de la
  política off-chain del backend que emite la firma y el root → la secuencia D28 se controla
  fuera del contrato (**pendiente de confirmar** cómo se garantiza en backend).

### 4.3 `verificarInclusion(leaf, prueba)` (prueba de inclusión)

`sc/src/SmartAccount.sol:103-105`: `MerkleProof.verify(prueba, kycMerkleRoot, leaf)` — permite
a cualquier verificador comprobar que el hash de la identidad/estado del usuario (`leaf`)
pertenece al árbol certificado on-chain (RF-01.7).

---

## 5. Recuperación social (D34: 3 guardianes / 2 de 3 / 48 h)

La recuperación **nunca mueve fondos**: solo cambia el `owner` (comentario
`SmartAccount.sol:175`; `requerimientos.md:394`).

### 5.1 `designarGuardianes(nuevosGuardianes)` — una sola vez por cuenta

`sc/src/SmartAccount.sol:159-170`:

- Solo el `owner` (`SoloOwner`).
- **Fijos de por vida**: si `_guardianes[0] != address(0)` revierte `GuardianesFijos`
  (`SmartAccount.sol:161`) — evita rotación maliciosa durante un ataque (comentario
  `SmartAccount.sol:156-158`).
- Validaciones: sin `address(0)`, sin el propio `owner`, sin duplicados (revierte `SoloGuardian`)
  (`SmartAccount.sol:162-167`).
- Asigna el array y emite `GuardianesDesignados` (`SmartAccount.sol:168-169`).

### 5.2 `proponerRecuperacion(nuevoOwner)` — aprobaciones y umbral 2/3

`sc/src/SmartAccount.sol:177-194`:

1. `_soloGuardian(msg.sender)` — solo guardianes designados (`SoloGuardian`)
   (`SmartAccount.sol:178`, helpers `SmartAccount.sol:242-251`).
2. `nuevoOwner != address(0)` (`SoloOwner` como error genérico) (`SmartAccount.sol:179`).
3. Una propuesta a la vez: si `momentoAprobada != 0` (umbral ya alcanzado), `PropuestaYaEnCurso`
   (`SmartAccount.sol:180`).
4. Voto del guardián por **bitmask**: `idx = _indiceGuardian(msg.sender)`, `bit = 1 << idx`; si
   el bit ya está, `GuardiaYaAprobo` (`SmartAccount.sol:182-184`).
5. Registra el bit, `nuevoOwner` y `solicitante`; emite `RecuperacionSolicitada`
   (`SmartAccount.sol:186-189`).
6. Al contar bits (`_contarBits`, `SmartAccount.sol:253-260`) ≥ `UMBRAL_GUARDIANES` (2), fija
   `momentoAprobada = block.timestamp` — arranca el timelock de 48 h (`SmartAccount.sol:191-193`).

#### Observación de verificación

- El bitmask acumula aprobaciones **sin validar que los guardianes coincidan en el mismo
  `nuevoOwner`**: un segundo guardián puede aprobar una propuesta con un `nuevoOwner` distinto
  del fijado por el primero (solo se reescribe `nuevoOwner`/`solicitante` en
  `SmartAccount.sol:187-188`). Con 2 bits de guardianes distintos basta para arrancar el timelock hacia el
  `nuevoOwner` del último aprobador. Comportamiento verificable del código; su impacto queda
  como observación para auditoría.

### 5.3 `cancelarRecuperacion()` — el owner legítimo puede abortar

`sc/src/SmartAccount.sol:199-204`:

- Solo `owner` (`SoloOwner`).
- Requiere propuesta **con umbral alcanzado**: si `momentoAprobada == 0`, revierte
  `SinPropuesta` (`SmartAccount.sol:201`) — un owner no puede cancelar una propuesta aún
  incompleta (menos de 2 guardianes) por esta vía.
- `delete _propuesta` + `RecuperacionCancelada` (`SmartAccount.sol:202-203`).

### 5.4 `ejecutarRecuperacion()` — tras el timelock de 48 h

`sc/src/SmartAccount.sol:210-220`:

1. Requiere propuesta con umbral (`SinPropuesta` si no) (`SmartAccount.sol:211`).
2. Si `block.timestamp < momentoAprobada + TIMELOCK_RECUPERACION`, `TimelockNoVencido(falta)`
   (`SmartAccount.sol:212-213`).
3. Ejecuta: `delete _propuesta`; `owner = nuevoOwner`; emite `OwnerActualizado` y
   `RecuperacionEjecutada` (`SmartAccount.sol:215-219`).
- **Invocable por cualquiera** (keeper/relayer) una vez vencido el timelock (comentario
  `SmartAccount.sol:207-209`).

### 5.5 `receive() external payable`

`sc/src/SmartAccount.sol:263`: acepta ETH "sin uso previsto en C2; se documenta para no
bloquear transferencias".

---

## 6. `SmartAccountFactory` (CREATE2, one-per-owner)

### 6.1 Estado

`sc/src/SmartAccountFactory.sol:19`: `mapping(address => address) public cuentas` — owner EOA →
dirección de su SmartAccount. El factory **no tiene owner** ni control de acceso: cualquier
llamante puede desplegar (quien paga el gas; en el flujo real el relayer/plataforma,
`SmartAccountFactory.sol:8-10`).

### 6.2 `desplegarCuenta(ownerInicial, rootInicial)`

`sc/src/SmartAccountFactory.sol:22-35`:

1. Si `cuentas[ownerInicial] != address(0)`, devuelve la cuenta existente — **one-per-owner**
   (`SmartAccount.sol:26-27`).
2. `salt = keccak256(abi.encodePacked(ownerInicial, rootInicial))`
   (`SmartAccount.sol:29`).
3. `new SmartAccount{salt: salt}(ownerInicial, rootInicial)` — despliegue CREATE2
   (`SmartAccount.sol:30-32`).
4. Registra en `cuentas` y emite `SmartAccountDesplegada(owner, cuenta)` (`SmartAccount.sol:33-34`).

> Nota: como el salt incluye `rootInicial`, dos despliegues del mismo owner con distinto root
> intentarían direcciones distintas, pero el mapeo one-per-owner devuelve la primera cuenta —
> la dirección efectiva de un owner es la de su primer despliegue.

### 6.3 `predecirCuenta(ownerInicial, rootInicial)` — dirección precalculada

`sc/src/SmartAccountFactory.sol:38-53` implementa la fórmula CREATE2 a mano:

```
hash = keccak256(0xff ++ address(this) ++ salt ++ keccak256(creationCode ++ abi.encode(owner, root)))
```

- `salt` idéntico al de despliegue (`SmartAccountFactory.sol:43`).
- Incluye `type(SmartAccount).creationCode` concatenado con los argumentos del constructor
  (`SmartAccountFactory.sol:49`). Útil para que el backend/relayer resuelva la cuenta de un
  usuario sin desplegarla (permite el chequeo on-chain del estado de verificación previo al
  envío de meta-tx).

---

## 7. Notas de verificación y pendientes de confirmar

1. `designarGuardianes` es de una sola vez y no permite rotación posterior (§5.1) — decisión de
   diseño documentada en el código.
2. `proponerRecuperacion` no valida coherencia de `nuevoOwner` entre guardianes (§5.2,
   observación).
3. `cancelarRecuperacion` solo es efectiva tras alcanzar el umbral (`SinPropuesta` antes)
   (§5.3, observación).
4. La escalera D28 no se impone on-chain: `cambiarEstadoVerificacion` acepta cualquier valor
   con firma del owner (§4.2, observación); el control de secuencia vive en el backend →
   **pendiente de confirmar** su enforcement off-chain.
5. No hay límite on-chain de qué operaciones ejecuta cada estado de verificación vía
   `execute`; la política (máx. 3 activos, etc.) se aplica off-chain (D28/RF-14.4) →
   **pendiente de confirmar**.
6. Suite de pruebas: `sc/test/SmartAccount.t.sol` cubre despliegue por factory, ejecución
   EIP-712 con nonce, escalera KYC por merkle root y recuperación social (cabecera
   `SmartAccount.t.sol:8-15`).
