# Informe de Pruebas E2E Profundas — TrueKeate

**Fecha:** ciclo de pruebas con navegador headless (Chromium + wallet inyectada del owner)
**Resultado final:** ✅ 77/77 checks en verde (A: 16/16 · B: 22/22 · C: 16/16 · D: 23/23) + tsc 0, eslint 0, vitest 59/59.

## Metodología

- **Navegador real** (headless Chromium vía Playwright) con un **proveedor EIP-1193 inyectado** (`window.ethereum`) que firma con la clave del **owner** (cuenta 0) a través de un puente Node → Anvil. Esto permitió probar los flujos de UI completos (firma de tx, EIP-712, permits, personal_sign) sin MetaMask.
- Suites:
  - **A. Páginas**: las 16 rutas renderizan, sin errores de consola ni hydration mismatch.
  - **B. Flujos owner (UI)**: auto-conexión, dashboard, crear/completar/disputar/resolver/cancelar operaciones, add-token admin, identidad (términos/contacto/2FA/SBT), catálogo firmado, campañas crear+aprobar, KYC.
  - **C. APIs**: 16 endpoints con casos de éxito y de error esperados (privacidad, 404, validaciones).
  - **D. Contratos + indexador**: refund tras expiración (warp), exchange (orden/llenar/cancelar), gobernanza (postular/votar/resolver con warp de 5 días), suscripción BRLT, SBT/RWA/vouchers, meta-transacción vía relay, valoraciones legítimas y duplicadas, encuentros (crear/abrir/cerrar), sincronización del indexador en BD.

## Bugs REALES encontrados y corregidos (este ciclo)

| # | Bug | Impacto | Fix |
|---|-----|---------|-----|
| 1 | **Indexador no guardaba `user2` al procesar `OperationDisputed`** (`web/scripts/indexer.mjs`) | Las operaciones completadas por **resolución de disputa** quedaban sin contraparte en la BD → las **valoraciones post-disputa fallaban** ("Solo puedes valorar a tu contraparte") | El handler ahora guarda `user2 = disputer` (el contrato lo setea on-chain y el evento lo lleva). Verificado end-to-end: op de disputa ahora tiene user2 en BD y D7 (valoración) pasa. |

## Bugs de infraestructura de pruebas (no de la app) resueltos

| # | Problema | Solución |
|---|----------|----------|
| 2 | Colisión de nonces entre txs secuenciales (anvil devuelve nonces 'pending' desactualizados) | Gestión explícita de nonces por cuenta en el puente y en la suite D |
| 3 | Tx que revierte en `estimateGas` dejaba un hueco de nonce que encolaba las siguientes para siempre | El contador solo avanza si la emisión tiene éxito; `fillGaps()` rellena huecos detectados vía `txpool_content` |
| 4 | `estimateGas` de anvil simula sobre el bloque 'pending' con el reloj **sin warp** → falsos "revert" por tiempo en refund/resolve | `gasLimit` explícito en `call()` (omite la estimación) |
| 5 | `evm_increaseTime`/`evm_setNextBlockTimestamp` aplican el salto **un bloque después** en esta versión de anvil | Helper `warp()` que mina y **verifica** el timestamp hasta que realmente avanza |
| 6 | Permit EIP-2612 con deadline del reloj real → `ERC2612ExpiredSignature` al warpear la cadena | Deadline del permit relativo al **timestamp de la cadena** |
| 7 | USDT mock tiene 6 decimales (los tests usaban 18) | Montos con decimales correctos por token |
| 8 | Parámetros de entorno con BOM/CRLF y claves de contratos (nombres vs camelCase) | Parser tolerante a BOM + mapa nombre→clave |

## Bugs encontrados y corregidos en ciclos anteriores (validados ahora por E2E)

- Indexador escuchaba eventos de un contrato viejo (`TradeCreated`… vs `OperationCreated`…) + sin backfill histórico → **reescrito con eventos reales + backfill**.
- Relay de meta-txs enviaba `BigInt` a `JSON.stringify` → `deadline.toString()`.
- Fuga de privacidad: cualquiera podía pasar `?isOwner=true` y leer PII → verificación server-side contra `escrow.owner()`.
- `/api/ratings` permitía valorar a cualquiera → solo la contraparte.
- `openMeetup` permitía reabrir a la misma parte → columna `opened_by` + bloqueo.
- KYC del admin usaba POST (ruta PUT) y fabricaba datos → PUT + conserva cifrado.
- `EXCHANGE_ADDRESS` apuntaba al token TKA → Exchange desplegado + `.env.local` + fallback corregido.
- `registerUser()` inexistente en componentes huérfanos → `register()` real de 8 parámetros.
- BottomNav `/items/create` (404) → `/items/new`.
- Gobernanza mostraba postulaciones fabricadas → datos on-chain reales.
- Admin de identidad solo mostraba su propia fila → directorio real `getRegisteredWalletsPaged`.
- Hydration mismatch por caché Turbopack obsoleta → `predev` limpia `.next`.
- `.ps1` con `$true` → `"true"` (cast rechaza "True") + BOM UTF-8 para PowerShell 5.1.

## Plan para mantener el 100%

1. **Ejecutar la suite completa** (con servicios arriba):
   ```powershell
   .\start-services.ps1                      # anvil + deploy + indexador + web
   cd web
   node scripts/e2e/run-e2e.mjs              # suites A-C (páginas, UI owner, APIs)
   node scripts/e2e/contracts-test.mjs       # suite D (contratos + indexador)
   ```
   Los reportes quedan en `web/scripts/e2e/report.json` y `report-d.json`; capturas de fallos en `web/scripts/e2e/shots/`.
2. **Si hay fallos**: revisar `report*.json` → corregir → `stop-services.ps1` + `start-services.ps1` (cadena limpia) → repetir el ciclo.
3. **Regresión estándar**: `npx tsc --noEmit`, `npm run lint`, `npm test`, `cd ../sc && forge test` (80 tests).
4. **Cuidados conocidos** (solo afectan a los tests, no a la app): el reloj de anvil se warpea (los tests usan timestamps de cadena); la BD PostgreSQL persiste entre reinicios (los tests toleran ratings/usuarios previos); al reiniciar anvil los contratos se redespliegan con nuevas direcciones (el indexador re-sincroniza por backfill).
