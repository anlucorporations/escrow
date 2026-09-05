# Manual Técnico 07 · Wallets y cuentas — 03 · Cuentas del anvil (desarrollo/pruebas)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Cuentas del nodo anvil/Foundry remoto (chain 31337, RPC
> `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app`). Todas las direcciones y claves privadas
> fueron **verificadas con ethers el 2026-09-04** contra el mnemónico estándar de anvil.
> Referencias `ruta:línea` al código real. ⚠️ **Claves solo para PRUEBAS: nunca usar en producción.**

## Cuentas de desarrollo del anvil (tabla completa)

### 1. Qué son las cuentas del anvil

- Anvil (Foundry) genera por defecto **20 cuentas** derivadas de un **mnemónico estándar conocido**
  y financia las primeras **10 (índices 0–9)** con ETH de prueba. Son las cuentas con las que se
  despliegan contratos, opera el relayer y se prueban los flujos.
- Roles operativos fijos (RF-15.1/15.2, `requerimientos.md:175-176`;
  `RepoTecnico/entornos_globales.md:56-62`):
  - **Cuenta 0** = Owner/Admin: desplegó los contratos y es la autoridad del panel Owner.
  - **Cuenta 1** = Relayer/cuenta general de la plataforma: paga el gas de las meta-transacciones
    de los particulares (RF-09.2, RF-15.2). El relayer se construye con `RELAYER_PRIVATE_KEY`
    (`backend/api/index-gcp.js:64-82`; `entornos_globales.md:72-73`).

#### 1.1 Mnemónico estándar

```
test test test test test test test test test test test junk
```

- Es el mnemónico por defecto de Foundry/anvil y **aparece en la documentación pública del
  framework**: cualquier persona puede derivar estas claves → por eso **jamás** deben usarse fuera
  de pruebas.

#### 1.2 Path de derivación (HD)

```
m/44'/60'/0'/0/N      (N = índice de la cuenta: 0, 1, 2, …, 12)
```

- BIP-44: `44'` (propósito), `60'` (coin type Ethereum), `0'/0'` (cuenta/cadena), `N` (índice).
- Es el mismo path que usa MetaMask por defecto para sus cuentas, por lo que **importar la frase
  semilla en MetaMask** reproduciría las mismas direcciones (ver §2).

### 2. Tabla de cuentas (2–12) con referencia a 0 y 1

| N | Usuario de ejemplo | Dirección (0x…) | Clave privada (0x…) | Rol / notas |
|---|---|---|---|---|
| 0 | Owner/Admin | `f39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` | Despliega contratos; panel Owner. Tiene fondos. |
| 1 | Relayer/plataforma | `70997970C51812dc3A010C7d01b50e0d17dc79C8` | `59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` | Paga el gas (meta-tx); wallet del backend. Tiene fondos. |
| **2** | **Ana** | `3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` | Usuario particular de prueba. Tiene fondos. |
| **3** | **Bruno** | `90F79bf6EB2c4f870365E785982E1f101E93b906` | `7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` | Usuario particular de prueba. Tiene fondos. |
| **4** | **Carla** | `15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` | Usuario particular de prueba. Tiene fondos. |
| **5** | **Diego** | `9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` | Usuario particular de prueba. Tiene fondos. |
| **6** | **Elena** | `976EA74026E726554dB657fA54763abd0C3a0aa9` | `92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` | Usuario particular de prueba. Tiene fondos. |
| **7** | **Fabián** | `14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` | Usuario particular de prueba. Tiene fondos. |
| **8** | **Gisela** | `23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | `dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97` | Usuario particular de prueba. Tiene fondos. |
| **9** | **Héctor** | `a0Ee7A142d267C1f36714E4a8F75612F20a79720` | `2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6` | Usuario particular de prueba. Tiene fondos. |
| **10** | **Irene** | `Bcd4042DE499D14e55001CcbB24a551F3b954096` | `f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897` | ⚠️ **SIN FONDOS** en este anvil (solo se financian 0–9 por defecto). |
| **11** | **Javier** | `71bE63f3384f5fb98995898A86B02Fb2426c5788` | `701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82` | Sin fondos por defecto (ver §6). |
| **12** | **Karen** | `FABB0ac9d68B0B445fB7357272Ff202C5651694a` | `a267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1` | Sin fondos por defecto (ver §6). |

- Notas de la tabla:
  - Direcciones en minúsculas; la plataforma normaliza a minúsculas al guardar la cuenta conectada
    (`web/lib/ethereum.tsx:57-59`).
  - "Tiene fondos" = anvil financia por defecto los índices 0–9 con ETH de prueba.
  - Los nombres Ana…Karen son **usuarios de ejemplo para pruebas/manuales**; el rol concreto
    (PARTICULAR/EMPRESA/SOCIO) y el estado D28 de cada uno en la base de datos dependen de la
    inscripción/verificación realizada en cada entorno → **pendiente de confirmar** por entorno.
  - Referencia de uso de las claves 0/1 en pruebas reales: `backend/test/integracion-relayer.js:30-31`
    (PK0 = owner que firma, PK1 = relayer que paga el gas).

### 3. Importar una cuenta del anvil en MetaMask

#### 3.1 Por qué importarlas

- Para que la plataforma web vea al usuario "Ana" (o cualquier cuenta 0–12) hay que **importar su
  clave privada** en MetaMask (o importar la frase semilla completa). La web solo muestra y firma
  con las cuentas que MetaMask tiene cargadas.

#### 3.2 Pasos en MetaMask (PC)

1. Abrir MetaMask → icono de perfil (arriba a la derecha) → **"Cambiar cuenta"** (o
   *"Cuentas"*).
2. Pulsar **"+ Añadir cuenta o cuenta de hardware"** → **"Importar cuenta"**.
3. En *"Tipo"* dejar **Clave privada** y pegar la clave de la tabla (p. ej. la de Ana, índice 2).
4. **Importar**. La cuenta aparece en el selector con su dirección; comprobar que coincide con la
   tabla.

#### 3.3 Pasos en MetaMask (móvil)

1. MetaMask móvil → icono de perfil/cuentas → **"Añadir cuenta"** → **"Importar cuenta"**.
2. Pegar la clave privada → **Importar**.

#### 3.4 Comprobación

```bash
# La clave 0x5de4… (Ana) debe derivar en la dirección 0x3C44…
cast wallet address --private-key 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a
# → 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
```

### 4. Cómo cambiar de cuenta en la plataforma

#### 4.1 Cambio de cuenta dentro de MetaMask

- Cambiar la cuenta activa en MetaMask (selector de cuentas). La plataforma escucha el evento
  `accountsChanged` y actualiza la cuenta mostrada al instante (`web/lib/ethereum.tsx:49-61,79-87`).

#### 4.2 Cómo reacciona la plataforma

- Al cambiar de cuenta, el contexto de sesión re-consulta el estado de inscripción de la **nueva**
  cuenta (`web/lib/sesion.tsx:88-98`) y **descarta el token de sesión de la cuenta anterior**: el
  token de sesión está asociado a la wallet que lo firmó (el backend lo valida con
  `recuperarFirmante`, `backend/api/lib/auth.js:13-15`), así que con otra cuenta habrá que volver a
  firmar la sesión (`06-interactuar-wallet.md` §3).
- Si la lista de cuentas llega vacía (MetaMask bloqueada o cuenta eliminada), la plataforma se
  desconecta y limpia el `localStorage` (`web/lib/ethereum.tsx:51-55,110-114`).

#### 4.3 Desconectar / cerrar sesión

- En la barra superior de la suite hay "⏻ Desconectar billetera" (`web/components/TopBar.tsx:141-149`);
  al desconectar se limpia la cuenta y, por efecto del contexto, el token de sesión
  (`web/lib/sesion.tsx:95-97`).

### 5. Advertencias obligatorias

- ⚠️ **Cuenta 10 (Irene) sin fondos**: si un flujo necesita que Irene pague gas on-chain o reciba
  ETH, primero hay que financiarla; no hay faucet automático verificado en este entorno →
  **pendiente de confirmar** el mecanismo de financiación.
- ⚠️ **Solo pruebas**: el mnemónico es público y todas las claves derivadas son conocidas. **Nunca
  usar estas cuentas (ni fondos reales) en producción.**
- ⚠️ En producción, las claves del Owner y del relayer viven en Secret Manager
  (`entornos_globales.md:72-73`); las claves de este manual solo son para el anvil de pruebas.
- ⚠️ Cualquiera que conozca la clave privada puede firmar por esa cuenta: no compartir las claves
  de la tabla entre entornos con datos reales.
