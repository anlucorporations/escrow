# Manual Técnico 07 · Wallets y cuentas — 05 · Verificación de los NFTs de los trueques en la wallet

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Contrato **TrueKeateNFT** (ERC-721 de prueba) desplegado en el anvil remoto (chain 31337).
> Dirección auditada el 2026-09-04 (artefacto `broadcast`; ver `sc/script/Deploy.s.sol`).
> Referencias `ruta:línea` al código real. Lo no verificable se marca **"pendiente de confirmar"**.

## Verificación de los NFTs de los trueques en la wallet

### 1. El contrato TrueKeateNFT (estado real)

#### 1.1 Datos del contrato

| Parámetro | Valor |
|---|---|
| Dirección | `0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f` |
| Nombre | `TrueKeate NFT` |
| Símbolo | `TKANFT` |
| Estándar | **ERC-721** (`balanceOf`, `ownerOf`, `mint`, `transferFrom`, …) |

- El despliegue crea el NFT de prueba con nombre "TrueKeate NFT" y símbolo "TKANFT"
  (`sc/script/Deploy.s.sol:44`).
- El código del contrato es un **mock ERC-721 mínimo** (`sc/src/mocks/TrueKeateNFT.sol:1-18`):
  hereda de OpenZeppelin ERC721 (`sc/src/mocks/TrueKeateNFT.sol:4`) y solo añade `mint` público
  (`sc/src/mocks/TrueKeateNFT.sol:14-17`), que asigna token IDs **secuenciales desde 1**
  (`_siguienteTokenId`, `sc/src/mocks/TrueKeateNFT.sol:10`).

#### 1.2 Naturaleza de prueba del contrato

- TrueKeateNFT es un **mock de pruebas** (carpeta `sc/src/mocks/`): representa los NFTs ofrecidos
  en trueques en el entorno de desarrollo. El diseño del producto expresa los objetos del trueque
  como NFTs/certificados digitales, pero el contrato productivo definitivo de representación de
  objetos es **pendiente de confirmar** (hoy solo existe este mock y los trueques del entorno
  guardan su espejo en la base con `escrow_id` sintético — ver cabecera de
  `backend/api/routes/truekes.js:4-9`).
- El `mint` **no tiene control de acceso** (`sc/src/mocks/TrueKeateNFT.sol:14-17`): cualquiera
  puede acuñar un NFT de prueba a cualquier cuenta. En el despliegue base **no se mintea ningún
  NFT** (`sc/script/Deploy.s.sol:44` solo despliega): los token IDs existentes en cada entorno
  dependen de los mints hechos por pruebas/flujos → qué token IDs existen ahora en el anvil remoto
  **pendiente de confirmar** (consultar con §3).

### 2. Cómo añadir un NFT coleccionable a MetaMask

#### 2.1 Requisitos previos

- Tener seleccionada la red del proyecto (chain 31337 — `02-conexion-red-rpc.md`).
- Conocer la **dirección del contrato** (`0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f`) y el
  **token ID** a importar (número entero, p. ej. `1`).

#### 2.2 Pasos en MetaMask (PC)

1. Abrir MetaMask → pestaña **"NFTs"** (junto a "Activos").
2. Pulsar **"Importar NFTs"** (o el icono de importar).
3. Rellenar:
   - *Dirección*: `0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f`
   - *ID*: el token ID (p. ej. `1`).
4. **Añadir**. MetaMask valida que el contrato es ERC-721 y que la cuenta activa posee ese token.

#### 2.3 Pasos en MetaMask (móvil)

1. MetaMask móvil → pestaña **"NFTs"** → **"Importar NFTs"**.
2. Pegar dirección del contrato + token ID → **Añadir**.

#### 2.4 Qué muestra MetaMask (limitación conocida)

- El mock **no define `_baseURI` ni metadatos**: `tokenURI` devuelve cadena vacía (ERC721 de
  OpenZeppelin 5.0.2 devuelve `""` cuando `_baseURI()` está vacío —
  `sc/lib/openzeppelin-contracts/contracts/token/ERC721/ERC721.sol:88-101`, y TrueKeateNFT no hace
  override). Sin `tokenURI` con metadatos (imagen/JSON), MetaMask puede mostrar el NFT **sin
  imagen ni descripción** o fallar la vista previa → comportamiento exacto de la interfaz de
  MetaMask con metadatos vacíos **pendiente de confirmar**.
- La verificación de **propiedad** no depende de los metadatos: se hace on-chain con
  `balanceOf`/`ownerOf` (§3).

### 3. Verificación fiable de propiedad (on-chain)

#### 3.1 balanceOf / ownerOf vía RPC (recomendado)

```bash
RPC=https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app
NFT=0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f

# ¿Cuántos NFTs TKANFT tiene Ana (cuenta 2)?
cast call $NFT "balanceOf(address)(uint256)" \
  0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC --rpc-url $RPC

# ¿Quién es el dueño del token 1?
cast call $NFT "ownerOf(uint256)(address)" 1 --rpc-url $RPC

# Si el token no existe, ownerOf revierte (error de ejecución)
```

- `balanceOf` cuenta NFTs propios; `ownerOf` devuelve el dueño de un token concreto (métodos
  ERC-721 estándar, `sc/src/mocks/TrueKeateNFT.sol:4`).
- Con ethers (Node):

```js
const { ethers } = require('ethers');
const rpc = new ethers.JsonRpcProvider('https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app');
const nft = new ethers.Contract(
  '0x99dbe4aea58e518c50a1c04ae9b48c9f6354612f',
  ['function balanceOf(address) view returns (uint256)',
   'function ownerOf(uint256) view returns (address)'],
  rpc
);
console.log(await nft.balanceOf('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'));
console.log(await nft.ownerOf(1));
```

#### 3.2 Explorador de bloques

- No hay un explorador de bloques configurado/verificado para el anvil remoto del proyecto →
  **pendiente de confirmar**; hasta entonces, la verificación fiable es la consulta RPC (§3.1) o el
  panel Owner/API si expone los NFTs en stock (`backend/api/routes/finanzas.js:25-27` guarda el
  stock declarado `nftsStock` en la base; es un **espejo off-chain**, no la cadena).

### 4. Verificación dentro de la plataforma

- El módulo Finanzas muestra "NFTs en stock" de la cuenta conectada
  (`web/app/suite/finanzas/page.tsx:100-112`, datos de `GET /finanzas/mi` con `nftsStock`).
- Ese stock es el **registrado en la base de datos** (espejo), no una lectura directa del
  contrato: para confirmar propiedad real de un token hay que consultar la cadena (§3.1).

### 5. Advertencias

- ⚠️ Token IDs y saldos dependen del estado de cada anvil (reinicios, `04-Despliegue/
  02-reinicio-y-bootstrap.md`): si `ownerOf` revierte o `balanceOf` da 0, el NFT no existe en ese
  momento en esa red.
- ⚠️ Cualquiera puede mintear TKANFT de prueba (mint abierto): la posesión de un NFT de este mock
  **no certifica nada** sobre la identidad ni el estado D28 del usuario; es solo soporte de pruebas
  del escrow.
- ⚠️ Red de pruebas: estos NFTs no tienen valor real.
