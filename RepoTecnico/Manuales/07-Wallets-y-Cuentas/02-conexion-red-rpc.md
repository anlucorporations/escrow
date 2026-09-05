# Manual Técnico 07 · Wallets y cuentas — 02 · Conexión de la wallet a la red del proyecto (RPC)

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Datos de red **auditados el 2026-09-04** contra el anvil remoto y los artefactos `broadcast`:
> RPC `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app` · Chain ID **31337** · Moneda nativa
> **ETH** (simbólico de pruebas).
> Referencias `ruta:línea` al código real. Lo no verificable se marca **"pendiente de confirmar"**.

## Conexión de la wallet a la red del proyecto

### 1. Datos de la red (para añadir a la wallet)

#### 1.1 Parámetros auditados

| Parámetro | Valor | Notas |
|---|---|---|
| Nombre de red (sugerido) | `TrueKeate Anvil (pruebas)` | nombre libre, solo visual |
| **Nuevo RPC URL** | `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app` | anvil/Foundry remoto (GCP Cloud Run) |
| **Chain ID** | `31337` | hexadecimal `0x7a69` |
| Símbolo de moneda | `ETH` | moneda nativa de pruebas |
| Decimales | `18` | estándar de ETH |
| Explorador de bloques | *(dejar vacío)* | no hay explorador configurado para este anvil → **pendiente de confirmar** |

#### 1.2 De dónde salen estos datos

- El chain ID `31337` es el entorno anvil del proyecto (`RepoTecnico/entornos_globales.md:42,70`;
  `CHAIN_ID=31337` en `gcp-env.sh:55`).
- Los tests E2E del frontend simulan esa red con `eth_chainId → "0x7a69"` y
  `net_version → "31337"` (`web/e2e/suite.spec.ts:35-36`).
- Las direcciones de los contratos desplegados en esa red están fijadas en
  `web/lib/contracts.ts:21-30` (fallback de `NEXT_PUBLIC_*`) y en `backend/contratos.json`.
- **Nota de trazabilidad**: el manual `04-Despliegue/01-despliegue.md:85,232` documenta otra URL de
  anvil GCP MCC más antigua; la URL de este manual es la **auditada el 2026-09-04** como RPC actual
  del proyecto.

### 2. Añadir la red manualmente en MetaMask (PC)

#### 2.1 Aviso previo importante

- La plataforma **no añade ni cambia la red por ti**: no hay código de
  `wallet_addEthereumChain`/`wallet_switchEthereumChain` en `web/` (verificado en `web/app`,
  `web/components`, `web/lib`). La red debe añadirse **una vez, a mano**, en MetaMask.
- Pasos válidos para la extensión (nombres de menú de MetaMask, versión actual de escritorio).

#### 2.2 Pasos en la extensión de MetaMask

1. Abrir MetaMask y pulsar el **selector de red** en la parte superior (muestra "Ethereum Mainnet"
   u otra).
2. Pulsar **"Añadir red"** → **"Añadir una red manualmente"**.
3. Rellenar el formulario:
   - *Nombre de red*: `TrueKeate Anvil (pruebas)`
   - *Nueva URL de RPC*: `https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app`
   - *ID de cadena*: `31337`
   - *Símbolo de moneda*: `ETH`
   - *Explorador de bloques (opcional)*: **dejar vacío** (no hay explorador verificado).
4. **Guardar**. MetaMask validará el RPC (debe responder) y quedará seleccionada la red nueva.

#### 2.3 Seleccionar la red al usar la plataforma

- Antes de operar (leer saldos de contrato, firmar sesión, etc.) conviene tener la red
  `TrueKeate Anvil (pruebas)` seleccionada en el selector.
- La lectura de contratos funciona aunque estés en otra red si el frontend usa el RPC propio, pero
  la **firma de la wallet** va contra la red seleccionada en MetaMask: para que el backend acepte
  tus intents/meta-tx el `chainId` debe coincidir con el de la red (el relayer rechaza intents con
  `chainId` distinto al esperado — `backend/relayer.js:138-143`).

### 3. Añadir la red en MetaMask móvil

1. Abrir MetaMask móvil → icono de **red** (parte superior) → **Añadir red** → pestaña
   **Personalizada** (custom).
2. Introducir los mismos datos de §1.1 y **Guardar**.
3. Si usas el navegador interno de MetaMask para la PWA (`01-instalacion-wallet.md` §3.2), la red
   seleccionada en la app es la que se usa al firmar.

### 4. Verificar que la conexión funciona

#### 4.1 Comprobación en MetaMask

- El selector debe mostrar el nombre de red elegido y, tras añadirla, el saldo de la cuenta en
  **ETH** (las cuentas 0–9 del anvil tienen fondos de prueba; la 10 no — ver `03-cuentas-anvil.md`).

#### 4.2 Comprobación por RPC (herramienta de consola)

```bash
# Con cast (Foundry) contra el anvil remoto
cast chain-id --rpc-url https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app
# → 31337

cast balance 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 \
  --rpc-url https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app
# → saldo en wei de la cuenta 0 (Owner)
```

- Los contratos del proyecto se consultan igual: p. ej. `balanceOf` de BRLT
  (`04-token-brlt.md`), `ownerOf`/`balanceOf` de TrueKeateNFT (`05-nfts-trueques.md`).

### 5. Advertencias de red de pruebas (obligatorias)

- ⚠️ Es una red de **PRUEBAS**: el ETH es **simbólico** y las claves privadas de las cuentas son
  **públicas** (`03-cuentas-anvil.md`). **No usar fondos reales ni cuentas de producción.**
- El anvil remoto puede **reiniciarse** (operación de entorno): el estado on-chain podría
  reiniciarse o cambiar entre reinicios (procedimiento en
  `RepoTecnico/Manuales/04-Despliegue/02-reinicio-y-bootstrap.md`); si una cuenta deja de tener
  saldo o un contrato no responde, verificar que la red sigue viva con `cast chain-id` (§4.2).
- La moneda nativa de esta red (ETH de pruebas) la paga el **relayer** (cuenta 1) en las
  meta-transacciones de los particulares (RF-09.1/09.2, `requerimientos.md:128-129`); el usuario
  particular no necesita tener ETH salvo en el plan de contingencia D39
  (`backend/relayer.js:17-18`; implementación **pendiente de confirmar**).
