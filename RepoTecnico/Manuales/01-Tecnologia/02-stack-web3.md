# Manual técnico · Stack Web3 (contratos inteligentes)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: stack de contratos de TrueKeate.
> Todo lo citado es código real verificado con `ruta:línea`. Lo no verificable se marca
> **pendiente de confirmar**.

---

## 1. Resumen del stack Web3

La capa on-chain de TrueKeate se construye con:

| Componente | Valor verificado | Fuente |
|---|---|---|
| Herramienta de desarrollo | **Foundry** (forge/anvil/cast) | `sc/foundry.toml` · `sc/script/Deploy.s.sol:4` |
| Lenguaje | **Solidity `^0.8.24`** (pragma en todos los contratos) | `sc/src/Escrow.sol:2`, `sc/src/SmartAccount.sol:2`, `sc/foundry.toml:5` |
| Compilador fijado | `solc_version = "0.8.24"` · `evm_version = "paris"` | `sc/foundry.toml:5`, `sc/foundry.toml:8` |
| Librerías | **OpenZeppelin v5.0.2** · **forge-std v1.9.4** (submódulos) | `.gitmodules:1-6` · tags verificados en `sc/lib/` |
| Wallet de identidad | **Smart Account inspirada en ERC-4337, SIN EntryPoint** (D35) | `requerimientos.md:395`, `SmartAccount.sol:10-14` |
| Meta-transacciones | **EIP-712 + relayer propio** (sin bundler/paymaster SaaS, D22) | `backend/relayer.js`, `requerimientos.md:45` |
| Red de pruebas | anvil, **chain 31337** | `entornos_globales.md:42`, `gcp-env.sh:55` |

---

## 2. Foundry

### 2.1 Perfil de compilación (`sc/foundry.toml`)

`sc/foundry.toml:1-8` define el perfil `default`:

- `src = "src"`, `out = "out"`, `libs = ["lib"]` (`foundry.toml:2-4`).
- `solc_version = "0.8.24"` (`foundry.toml:5`).
- `optimizer = true`, `optimizer_runs = 200` (`foundry.toml:6-7`).
- `evm_version = "paris"` (`foundry.toml:8`).

### 2.2 Remappings de dependencias

`sc/foundry.toml:11-14`:

```toml
remappings = [
    "forge-std/=lib/forge-std/src/",
    "@openzeppelin/=lib/openzeppelin-contracts/",
]
```

Estos remappings explican los imports de los contratos, p. ej.
`import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol"` (`sc/src/Escrow.sol:4`).

### 2.3 Perfiles de prueba (fuzzing e invariantes)

- Fuzzing: `runs = 256` (`foundry.toml:17-19`).
- Invariantes (handler-based, RNF-04.1): `runs = 64`, `depth = 100`,
  `fail_on_revert = false` (`foundry.toml:21-24`).

### 2.4 Estructura del proyecto de contratos (`sc/`)

| Ruta | Contenido |
|---|---|
| `sc/src/*.sol` | Contratos de producción (8 contratos + 2 mocks) |
| `sc/src/mocks/` | `TrueKeateToken.sol` (ERC20) y `TrueKeateNFT.sol` (ERC721) de prueba |
| `sc/script/Deploy.s.sol` | Script de despliegue Foundry (Ciclos 1-3) |
| `sc/test/*.t.sol` | Suites Foundry (`Escrow.t.sol`, `SmartAccount.t.sol`, `Ciclo3.t.sol`, `EscrowCiclo8.t.sol`) |
| `sc/test/invariantes/` | `EscrowHandler.sol` y `EscrowInvariants.t.sol` |
| `sc/lib/` | Submódulos `forge-std` y `openzeppelin-contracts` |
| `sc/out/` | Artefactos de compilación (los ABIs JSON se copian a `web/lib/abis/`, ver `web/lib/contracts.ts:9`) |

### 2.5 Librerías como submódulos git

El `.gitmodules` está en la **raíz del repositorio** (no dentro de `sc/`):

- `.gitmodules:1-3` — submódulo `sc/lib/forge-std` → `https://github.com/foundry-rs/forge-std.git`.
- `.gitmodules:4-6` — submódulo `sc/lib/openzeppelin-contracts` →
  `https://github.com/OpenZeppelin/openzeppelin-contracts.git`.

Versiones verificadas del checkout local (comando `git describe --tags`):

| Submódulo | Commit | Tag |
|---|---|---|
| `sc/lib/forge-std` | `1eea5bae12ae557d589f9f0f0edae2faa47cb262` | **v1.9.4** |
| `sc/lib/openzeppelin-contracts` | `dbb6104ce834628e473d2173bbc9d47f81a9eec3` | **v5.0.2** (coincide con `package.json` interno) |

---

## 3. Solidity 0.8.24

### 3.1 Pragmas reales

Todos los contratos declaran `pragma solidity ^0.8.24`:

- `sc/src/Escrow.sol:2`, `sc/src/SmartAccount.sol:2`, `sc/src/SmartAccountFactory.sol:2`,
  `sc/src/BRLT.sol:2`, `sc/src/FondoDeValor.sol:2`, `sc/src/SociosRegistry.sol:2`,
  `sc/src/SuscripcionEmpresa.sol:2`, `sc/src/mocks/TrueKeateToken.sol:2`,
  `sc/src/mocks/TrueKeateNFT.sol:2`, `sc/script/Deploy.s.sol:2`.

El compilador fijo es `0.8.24` (`sc/foundry.toml:5`).

---

## 4. OpenZeppelin v5.0.2

### 4.1 Módulos usados en el código real

| Módulo OZ | Import | Uso |
|---|---|---|
| `access/Ownable.sol` | `sc/src/Escrow.sol:4`, `sc/src/BRLT.sol:5`, `sc/src/FondoDeValor.sol:4`, `sc/src/SociosRegistry.sol:4`, `sc/src/SuscripcionEmpresa.sol:4` | Propietario (Owner) de cada contrato |
| `utils/ReentrancyGuard.sol` | `sc/src/Escrow.sol:5`, `sc/src/SmartAccount.sol:7` | Protección reentrancia en funciones que liberan fondos |
| `utils/cryptography/EIP712.sol` | `sc/src/SmartAccount.sol:4` | Dominio EIP-712 ("TrueKeate SmartAccount", versión "1") |
| `utils/cryptography/ECDSA.sol` | `sc/src/SmartAccount.sol:5` | Recuperación de firmante (`digest.recover(firma)`) |
| `utils/cryptography/MerkleProof.sol` | `sc/src/SmartAccount.sol:6` | Prueba de inclusión del estado KYC |
| `token/ERC20/IERC20.sol` | `sc/src/Escrow.sol:6`, `sc/src/FondoDeValor.sol:5`, `sc/src/SociosRegistry.sol:5`, `sc/src/SuscripcionEmpresa.sol:5` | Interfaz ERC20 |
| `token/ERC20/utils/SafeERC20.sol` | `sc/src/Escrow.sol:8`, `sc/src/FondoDeValor.sol:6`, `sc/src/SuscripcionEmpresa.sol:6` | Transferencias ERC20 seguras |
| `token/ERC721/IERC721.sol` | `sc/src/Escrow.sol:7` | Interfaz ERC721 (NFTs) |
| `token/ERC20/ERC20.sol` | `sc/src/BRLT.sol:4`, `sc/src/mocks/TrueKeateToken.sol:4` | Implementación ERC20 |
| `token/ERC721/ERC721.sol` | `sc/src/mocks/TrueKeateNFT.sol:4` | Implementación ERC721 |

### 4.2 Patrón Ownable aplicado

Cada contrato pasa `msg.sender` al constructor de Ownable, de modo que el **desplegador se vuelve
Owner**:

- `Escrow`: `constructor() Ownable(msg.sender) {}` (`sc/src/Escrow.sol:128`).
- `BRLT`: `Ownable(msg.sender)` (`sc/src/BRLT.sol:50`).
- `FondoDeValor` (`sc/src/FondoDeValor.sol:46`), `SociosRegistry` (`sc/src/SociosRegistry.sol:64`),
  `SuscripcionEmpresa` (`sc/src/SuscripcionEmpresa.sol:67`).

En el despliegue real el owner es la **cuenta 0** del anvil: `Deploy.s.sol:29-31` obtiene
`PRIVATE_KEY` del entorno y el owner se loguea al final (`Deploy.s.sol:71`).

---

## 5. Catálogo de contratos del proyecto

| Contrato | Archivo | Rol | Trazabilidad declarada |
|---|---|---|---|
| `Escrow` | `sc/src/Escrow.sol` | Máquina de estados del trueque (custodia, firmas duales, disputas) | RF-05.1…05.7, R5, D31, D36, CU-11…15 (`Escrow.sol:26`) |
| `SmartAccount` | `sc/src/SmartAccount.sol` | Wallet de identidad ERC-4337 inspirada (sin EntryPoint, D35) | RF-01.7, RF-02, D16/D22/D28/D34/D35, CU-01/02/04 (`SmartAccount.sol:21-22`) |
| `SmartAccountFactory` | `sc/src/SmartAccountFactory.sol` | Despliegue CREATE2 de Smart Accounts (one-per-owner) | RF-02.1, D22, D35, CU-01 (`SmartAccountFactory.sol:12`) |
| `BRLT` | `sc/src/BRLT.sol` | Stablecoin ERC-20 "BorloTokens", emisión controlada por SociosRegistry | RF-12.1-12.4, D5/D6/D7/D32, CU-31 (`BRLT.sol:19`) |
| `FondoDeValor` | `sc/src/FondoDeValor.sol` | Fondo de valor 1 %/10 %/5 % configurables (D7) | RF-03.9, D7, D15, CU-30 (`FondoDeValor.sol:22`) |
| `SociosRegistry` | `sc/src/SociosRegistry.sol` | Padrón de Socios + propuestas económicas (quórum ≥ 2/3) | RF-01.9, RF-03.9, RF-12.3, D21/D32, CU-03/31 (`SociosRegistry.sol:15`) |
| `SuscripcionEmpresa` | `sc/src/SuscripcionEmpresa.sol` | Suscripción de empresas por staking bloqueado (D33) | RF-09.3/09.4, RF-10, R2, D7/D33, CU-24 (`SuscripcionEmpresa.sol:19`) |
| `TrueKeateToken` (mock) | `sc/src/mocks/TrueKeateToken.sol` | ERC20 de prueba (criptos ofrecidos en trueque) | tests del escrow (`TrueKeateToken.sol:7`) |
| `TrueKeateNFT` (mock) | `sc/src/mocks/TrueKeateNFT.sol` | ERC721 de prueba (NFTs ofrecidos en trueque) | tests del escrow (`TrueKeateNFT.sol:7`) |

> El diseño de `arquitectura_tecnica.md` §3.6 menciona también la **certificación de imágenes**
> (acumulador merkle): no existe contrato dedicado en `sc/src/` y la ubicación del anclaje quedó
> como PENDIENTE DE DECISIÓN (`arquitectura_tecnica.md:227-239`) → **pendiente de confirmar**.

---

## 6. Smart Accounts inspiradas en ERC-4337 sin EntryPoint (D35)

### 6.1 La decisión D35

- `requerimientos.md:395` (D35): "NO se usa el EntryPoint oficial: Smart Account inspirada en
  ERC-4337 (misma seguridad/recuperación) operada por el relayer propio EIP-712 (RF-02, D22)".
- `arquitectura_tecnica.md:178-180`: "Aprobado (D35): la Smart Account es inspirada en ERC-4337
  (misma seguridad/recuperación) sin adoptar el EntryPoint estándar; se usa el patrón de ejecución
  por firma EIP-712 con el relayer propio (RF-02.3, D22)".
- No se despliega EntryPoint/bundler/paymaster externo ni SaaS (`arquitectura_tecnica.md:122-123`;
  RNF-05.1).

### 6.2 Implementación real (`sc/src/SmartAccount.sol`)

- Hereda de `EIP712` y `ReentrancyGuard` (`SmartAccount.sol:24`).
- **Dominio EIP-712**: `constructor(...) EIP712("TrueKeate SmartAccount", "1")`
  (`SmartAccount.sol:82`); el separador de dominio es consultable con `domainSeparator()`
  (`SmartAccount.sol:97-99`).
- **Typehashes** (`SmartAccount.sol:39-42`):
  - `Execute(address to,uint256 value,bytes data,uint256 nonce)`
  - `CambiarEstadoVerificacion(uint8 estado,uint256 nonce)`
- **Nonce por cuenta** (anti-replay D16): `uint256 public nonce` (`SmartAccount.sol:53`);
  incrementado en `execute` (`SmartAccount.sol:122`) y en `cambiarEstadoVerificacion`
  (`SmartAccount.sol:148`); error `NonceInvalido` (`SmartAccount.sol:70`).
- **`execute(destino, valor, data, nonceFirma, firma)`** (`SmartAccount.sol:113-132`): verifica
  nonce y firma EIP-712 del owner (`_validarFirmaOwner`, `SmartAccount.sol:237-240`), ejecuta la
  llamada arbitraria y propaga revert con `assembly { revert(...) }` (`SmartAccount.sol:127-129`).
  Es el mecanismo que usa el relayer para enviar transacciones asumiendo el gas.
- **Estado de verificación on-chain** (escalera D28): enum `EstadoVerificacion`
  (`SmartAccount.sol:29`), estado público (`SmartAccount.sol:52`) y
  `cambiarEstadoVerificacion(nuevoEstado, nuevoRoot, nonceFirma, firma)`
  (`SmartAccount.sol:140-152`), que actualiza `kycMerkleRoot` y emite
  `MerkleRootActualizado(root, estado)` (`SmartAccount.sol:61`).
- **Prueba de inclusión KYC**: `verificarInclusion(leaf, prueba)` con `MerkleProof.verify`
  (`SmartAccount.sol:103-105`) contra `kycMerkleRoot` (`SmartAccount.sol:51`) — sin revelar
  identidad real (RNF-01.3/01.4).

### 6.3 Recuperación social (D34: 3 guardianes / 2 de 3 / timelock 48 h)

Parámetros como constantes (`SmartAccount.sol:45-47`):
`NUM_GUARDIANES = 3`, `UMBRAL_GUARDIANES = 2`, `TIMELOCK_RECUPERACION = 48 hours`.

- `designarGuardianes` — fija los guardianes una sola vez por cuenta (`SmartAccount.sol:159-170`).
- `proponerRecuperacion(nuevoOwner)` — un guardián aprueba; al alcanzar el umbral 2/3 se fija el
  timestamp del timelock (`SmartAccount.sol:177-194`).
- `cancelarRecuperacion` — el owner legítimo cancela antes del vencimiento (`SmartAccount.sol:199-204`).
- `ejecutarRecuperacion` — transcurridas las 48 h, cambia el owner **sin mover fondos**
  (`SmartAccount.sol:210-220`).
- Errores dedicados: `SoloGuardian`, `GuardiaYaAprobo`, `TimelockNoVencido`, etc.
  (`SmartAccount.sol:68-77`).

### 6.4 Despliegue por factory (CREATE2, sin gas para el usuario)

`sc/src/SmartAccountFactory.sol`:

- `mapping(address => address) public cuentas` — owner EOA → SmartAccount (`Factory.sol:19`).
- `desplegarCuenta(ownerInicial, rootInicial)` — CREATE2 con
  `salt = keccak256(abi.encodePacked(ownerInicial, rootInicial))` y evento
  `SmartAccountDesplegada` (`Factory.sol:22-35`).
- `predecirCuenta(...)` — dirección precalculada con la fórmula CREATE2 (`Factory.sol:38-53`).
- El despliegue lo paga el llamante (relayer/plataforma) para que el particular no incurra en gas
  (RF-09.1/09.2, CU-01 — comentario en `Factory.sol:8-10`).

---

## 7. EIP-712 y el relayer (meta-transacciones sin gas)

### 7.1 Qué se firma

- El **usuario particular** firma un intent EIP-712 con dominio `chainId` (31337) y nonce por
  cuenta (anti-replay D16) — `arquitectura_tecnica.md:345-346`.
- En el contrato, el digest se construye con `_hashTypedDataV4` sobre los typehashes
  (`SmartAccount.sol:223-235`).
- El **relayer** valida el `chainId` recibido contra la red (`backend/relayer.js:139-143`).

### 7.2 Flujo completo de meta-transacción

Secuencia documentada en `arquitectura_tecnica.md:343-359` y verificada en el código:

1. El frontend firma el intent EIP-712 (el usuario no paga gas — `arquitectura_tecnica.md:480-481`).
2. La API recibe el intent (`backend/api/routes/truekes.js:32-33`: `{ signer, nonce, firma,
   chainId }` + `data`).
3. La API delega en `relayer.procesarIntent({...})` (`truekes.js:33`).
4. El relayer valida protecciones y envía `execute(destino, valor, data, nonce, firma)` a la Smart
   Account con `gasLimit` máximo (`backend/relayer.js:162-167`).
5. La Smart Account verifica firma/nonce y ejecuta; el evento `Ejecutado`/derivado alimenta al
   indexador (`indexador.js`), que actualiza PostgreSQL.
6. Si la red no está configurada (tests), la API registra la intención como simulada
   (`truekes.js:38-39`).

### 7.3 Protecciones anti-abuso (D16 + D29) implementadas en `backend/relayer.js`

| # | Protección | Implementación |
|---|---|---|
| 1 | Nonce EIP-712 único por cuenta (anti-replay) | `_validarCuenta` (`relayer.js:93-98`) con registro local (`relayer.js:43`) |
| 2 | Allowlist: solo Smart Accounts de verificados (chequeo on-chain D28) | `_validarCuenta` consulta `estadoVerificacion` on-chain (`relayer.js:99-113`) vía `_cuentaDe` con la factory (`relayer.js:118-126`) |
| 3 | Límite diario 20 meta-tx/usuario | `_checkLimiteDiario` (`relayer.js:77-86`), `LIMITE_DIARIO` env (`relayer.js:22`) |
| 4 | chainId correcto | `relayer.js:139-143` |
| 5 | 3 fallos en 10 min → bloqueo del signer 1 h | `_registrarFallos` (`relayer.js:56-66`), `_checkBloqueo` (`relayer.js:70-74`) |
| — | Endpoints autenticados + rate-limiting | capa API (`backend/api/app.js:36-44`; middlewares en `backend/api/lib/auth.js:23-45`) |

El estado anti-abuso es **en memoria** para el ciclo 5; la persistencia en PostgreSQL está prevista
en C6 (comentario en `relayer.js:42` y `relayer.js:30-32`).

### 7.4 Límites y configuración por entorno

Constantes configurables en `backend/relayer.js:22-26`:

- `LIMITE_METATX_DIARIO` (default 20) · `UMBRAL_FALLOS` (default 3) · `GAS_MAXIMO` (default
  300000 wei de gas) · ventanas fijas de 10 min y 1 h (`relayer.js:24-25`).

### 7.5 Empresas: pagan su propio gas

Las empresas **no** pasan por el relayer: envían transacción directa al Escrow con su signer
(`backend/api/routes/truekes.js:19-28`; `R1`/`RF-09.3`, `arquitectura_tecnica.md:361-362`).

---

## 8. Pruebas de contratos (RNF-04.1)

### 8.1 Suites reales en el repositorio

| Suite | Archivo | Contenido (verificado por cabecera/estructura) |
|---|---|---|
| Escrow C1 | `sc/test/Escrow.t.sol` (376 líneas) | Tests de la máquina de estados base |
| SmartAccount C2 | `sc/test/SmartAccount.t.sol` (232 líneas) | Firma EIP-712, nonce, verificación |
| Ciclo 3 | `sc/test/Ciclo3.t.sol` (319 líneas) | BRLT / fondo / socios / suscripción |
| Ciclo 8 | `sc/test/EscrowCiclo8.t.sol` (166 líneas) | Disputa, anulación, sanción |
| Invariantes | `sc/test/invariantes/EscrowHandler.sol` (130 líneas) · `sc/test/invariantes/EscrowInvariants.t.sol` (129 líneas) | Invariantes I1-I7 handler-based |

### 8.2 Configuración de pruebas

- Fuzz con 256 runs (`foundry.toml:17-19`); invariantes 64 runs × 100 depth
  (`foundry.toml:21-24`).
- Requisito de diseño: `forge coverage` ≥ 80 % de líneas como gate de cada ciclo (D38,
  `arquitectura_tecnica.md:247-248` y `arquitectura_tecnica.md:535`).
- Estructura de pruebas y nombres según RNF-04.1 (`arquitectura_tecnica.md:241-251`); ejecutables
  en CI y reproducibles sobre anvil (chain 31337) (`arquitectura_tecnica.md:249-251`). La
  existencia de una pipeline de CI no está verificada en el repo → **pendiente de confirmar**.

---

## 9. Notas de verificación

- Versiones de librerías: verificadas por tag del checkout local (ver §2.5).
- Los ABIs generados por forge se consumen desde `web/lib/abis/*.json` (6 archivos) y desde
  `backend/contratos.json` (ver manuales 03 y 04).
- No existe contrato de certificación de imágenes en `sc/src/` (ver §5) → **pendiente de confirmar**
  su implementación futura.
