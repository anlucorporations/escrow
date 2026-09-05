# Manual Técnico 07 · Wallets y cuentas — 04 · Agregar el token BRLT (BorloTokens) a la wallet

> Manual técnico del equipo de manuales (rol TÉCNICO). Tema: **07-Wallets-y-Cuentas**.
> Token **BRLT** (BorloTokens), ERC-20, desplegado en el anvil remoto (chain 31337).
> Dirección auditada el 2026-09-04 y corroborada en `web/lib/contracts.ts:25`.
> Referencias `ruta:línea` al código real. Lo no verificable se marca **"pendiente de confirmar"**.

## Agregar el token BRLT a la wallet (MetaMask)

### 1. Datos del token (para "Importar tokens")

| Parámetro | Valor |
|---|---|
| Dirección del contrato | `0x6f6f570f45833e249e27022648a26f4076f48f78` |
| Símbolo | `BRLT` |
| Decimales | `18` |
| Estándar | ERC-20 (`balanceOf`, `transfer`, …) |

- La dirección vive en el registro de contratos del frontend (`web/lib/contracts.ts:21-30`:
  `BRLT: process.env.NEXT_PUBLIC_BRLT ?? "0x6f6f…48f78"`) y en `backend/contratos.json`
  (despliegue en GCP, anvil remoto 31337).
- El contrato real se llama **BorloTokens** con símbolo **BRLT**:
  `constructor() ERC20("BorloTokens", "BRLT")` en `sc/src/BRLT.sol:50`.

### 2. Qué es BRLT y cómo se comporta su contrato real

#### 2.1 Establecoin de la plataforma (RF-12.1)

- BRLT es la stablecoin interna de TrueKeate (RF-12.1, `requerimientos.md:150`), controlada por el
  padrón de Socios (`SociosRegistry`): `emitir`/`subirTope` solo pueden invocarlas el
  SociosRegistry (que ya validó quórum ≥2/3 de Socios, D32) — `sc/src/BRLT.sol:76-105` y errores
  `SoloRegistry` (`sc/src/BRLT.sol:44-47`).
- **Tope de emisión inicial: 1.000.000 BRLT** (`sc/src/BRLT.sol:51`); aumentar el tope exige
  votación de Socios (`sc/src/BRLT.sol:99-105`).
- El **5% de cada emisión** se mintea directamente al FondoDeValor (D7) y se registra la
  contribución (`sc/src/BRLT.sol:82-89,108-111`).
- Para la wallet esto significa: el saldo BRLT que veas proviene de **emisiones aprobadas por los
  Socios** (D32) — no se "crea" BRLT desde la wallet ni desde la plataforma sin ese mecanismo.

#### 2.2 Regla de negocio: quién ve/gestiona el saldo BRLT (D5 / RF-14.7-14.8)

- El saldo BRLT **en la plataforma** solo es visible/gestionable para **Socios y Owner**
  (RF-14.7 en `requerimientos.md:171`; decisión D5 en `requerimientos.md:365`; RF-14.8 en
  `requerimientos.md:172`).
- Implementación real en el backend: `GET /finanzas/mi` solo incluye `brlt` (y el fondo) si
  `u.tipo === 'SOCIO'`; si no, el campo llega `undefined`
  (`backend/api/routes/finanzas.js:23-31`). `GET /finanzas/globales` exige tipo SOCIO
  (`backend/api/routes/finanzas.js:38-48`).
- En el frontend, la tarjeta BRLT muestra el saldo solo a Socios y, si no, el aviso textual
  *"El saldo BRLT solo es visible y gestionable para Socios y Owner (RF-14.8)"*
  (`web/app/suite/finanzas/page.tsx:134-142`).
- ⚠️ **Distinción importante**: esta regla aplica a la **plataforma** (módulo Finanzas, reglas de
  la DApp). En la **blockchain**, cualquier dirección que tenga BRLT puede consultar su propio
  saldo desde una wallet: la regla no impide ver tus tokens en MetaMask.
- Detalle de implementación: el código real marca la visibilidad con `tipo === 'SOCIO'`; el Owner
  entra por su wallet (cuenta 0 del anvil) cuyo `tipo` en la base debe estar marcado como SOCIO en
  el entorno → mecanismo exacto de marcado del Owner **pendiente de confirmar**.

### 3. Importar BRLT en MetaMask (PC)

1. Abrir MetaMask y asegurarse de tener **seleccionada la red del proyecto** (chain 31337 —
   `02-conexion-red-rpc.md`).
2. Pestaña **"Activos"** → botón **"Importar tokens"**.
3. Seleccionar la pestaña **"Token personalizado"**:
   - *Dirección del contrato de tokens*: `0x6f6f570f45833e249e27022648a26f4076f48f78`
   - Al pegar la dirección, MetaMask **autocompleta** símbolo (`BRLT`) y decimales (`18`) leyendo
     el contrato (ERC-20); si no, escribirlos a mano.
4. **Añadir token personalizado** → **Importar tokens**. BRLT aparecerá en *Activos* con su saldo.

### 4. Importar BRLT en MetaMask (móvil)

1. Seleccionar la red del proyecto (chain 31337) en el selector de red.
2. Pestaña **"Activos"** → **"Importar tokens"** → pestaña **"Personalizado"**.
3. Pegar la dirección `0x6f6f570f45833e249e27022648a26f4076f48f78`; verificar símbolo `BRLT` y
   decimales `18` → **Importar**.

### 5. Comprobar el saldo BRLT

#### 5.1 En MetaMask

- La tarjeta "BRLT" de la pestaña Activos muestra el saldo (con 18 decimales) de la cuenta activa.
- Si el saldo no aparece pese a tener tokens, confirmar que la cuenta activa es la correcta y que
  la red seleccionada es la 31337.

#### 5.2 Por RPC (verificación on-chain fiable)

```bash
# balanceOf de BRLT para la cuenta 2 (Ana)
cast call 0x6f6f570f45833e249e27022648a26f4076f48f78 \
  "balanceOf(address)(uint256)" 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC \
  --rpc-url https://mcc-foundry-anvil-slzlptbcla-ew.a.run.app

# Símbolo y decimales
cast call 0x6f6f570f45833e249e27022648a26f4076f48f78 "symbol()(string)" --rpc-url <RPC>
cast call 0x6f6f570f45833e249e27022648a26f4076f48f78 "decimals()(uint8)" --rpc-url <RPC>
```

### 6. Notas técnicas y advertencias

- BRLT es un ERC-20 estándar de OpenZeppelin (`sc/src/BRLT.sol:4`); no incluye logo propio ni
  listado automático: MetaMask no lo mostrará hasta que se **importe manualmente** (no está en
  listas públicas de tokens porque es una red de pruebas).
- El saldo de BRLT en la wallet puede ser 0 aunque la cuenta esté "inscrita": los BRLT solo existen
  si se emitieron mediante propuesta de Socios aprobada (D32) — ver `backend/contratos.json` y el
  estado de las emisiones.
- ⚠️ Red de pruebas: los BRLT no tienen valor real; no comprar ni vender.
- Dirección alternativa de referencia en despliegues: el registro vive en
  `web/lib/contracts.ts:25` (fallback) y en `backend/contratos.json` (fuente para el backend); si
  el anvil se reinicia (`04-Despliegue/02-reinicio-y-bootstrap.md`), las direcciones podrían
  cambiar → verificar antes de importar.
