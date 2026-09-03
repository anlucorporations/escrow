# Manual Técnico 08 — Estrategia y evidencia de pruebas

> **Alcance**: estrategia de pruebas de la plataforma TrueKeate y evidencia verificable en el repositorio: contratos (Forge: unit + fuzz + invariantes), backend (node:test) y frontend (Playwright E2E multi-proyecto).
> **Fuentes leídas**: `sc/foundry.toml`, `sc/test/*.t.sol`, `sc/test/invariantes/*.sol`, `sc/README.md`, `backend/test/*.js`, `backend/package.json`, `web/e2e/*.spec.ts`, `web/playwright.config.ts`, `web/package.json`, `RepoTecnico/estado_proyecto.md` (tabla de cierre de Fase 4, líneas 47-58).
> **Convención**: cada número reportado indica su origen (código, ejecución propia o documento). Los valores que no pudieron re-ejecutarse en este entorno se marcan **"dato reportado — pendiente de confirmar"**.

---

## 1. Estrategia global de pruebas

### 1.1 Pirámide y gate de calidad

- **Contratos (Forge)**: unit + fuzz + **invariantes handler-based** (RNF-04.1). El gate D38 exige cobertura `forge coverage ≥ 80 %` de líneas por ciclo.
- **Backend (Node)**: suite `node:test` sobre indexador, relayer y API con dependencias simuladas (pool/proveedor en memoria, sin red ni Postgres reales).
- **Frontend (Playwright E2E)**: pruebas de extremo a extremo sobre el build de Next.js (servidor `npm run start` en :3000), en **2 proyectos** (chromium desktop + mobile-chrome Pixel 5 — RNF-02.3 móvil-first).
- Evidencia consolidada en `RepoTecnico/estado_proyecto.md:47-58`: Foundry **62/62** (61 unit/fuzz + 1 suite de invariantes), Backend **26/26**, E2E **18/18**, cobertura Forge **89.55 % líneas (497/555)**.

### 1.2 Configuración de Forge (sc/foundry.toml)

- Solidity `0.8.24`, optimizador con 200 runs, `evm_version = "paris"` (`sc/foundry.toml:1-8`).
- Remappings: `forge-std/` y `@openzeppelin/` (`sc/foundry.toml:10-13`).
- **Fuzzing**: `runs = 256` (`sc/foundry.toml:16-17`).
- **Invariantes**: `runs = 64`, `depth = 100`, `fail_on_revert = false` (handler-based, RNF-04.1) (`sc/foundry.toml:19-23`).

---

## 2. Contratos — Forge (unit + fuzz + invariantes)

### 2.1 Archivos de prueba y casos (mapa real del código)

| Archivo | Funciones `test*` | Temática |
|---|---|---|
| `sc/test/Escrow.t.sol` | 18 | Máquina de estados del escrow (Ciclo 1) |
| `sc/test/Ciclo3.t.sol` | 20 | Ciclo 3 (integración de contratos) |
| `sc/test/SmartAccount.t.sol` | 14 | Smart Account ERC-4337 / identidad |
| `sc/test/EscrowCiclo8.t.sol` | 9 | Ciclo 8 (escrow, valoración, anulaciones) |
| `sc/test/invariantes/EscrowInvariants.t.sol` | 5 invariantes | Suite de invariantes handler-based |

- Conteo estático realizado sobre el código: **61 funciones `test*`** (18+20+14+9) + **1 suite de invariantes** con 5 invariantes = el **62/62** reportado (61 unit/fuzz + 1 suite de invariantes, según `estado_proyecto.md:48`).
- **Nota de exactitud**: no fue posible re-ejecutar `forge test` en este entorno (binario `forge` no disponible); el resultado **62/62 es dato reportado en `RepoTecnico/estado_proyecto.md:48` → pendiente de confirmar** con una re-ejecución local.

### 2.2 Suite de invariantes (EscrowInvariants.t.sol)

- Setup: despliega `Escrow`, `SociosRegistry` y dos tokens mock; vincula registry; el fuzzer actúa **solo a través del `EscrowHandler`** (`targetContract(handler)`, `excludeContract(escrow)`) (`sc/test/invariantes/EscrowInvariants.t.sol:26-55`).
- Invariantes presentes en el archivo:
  - `invariant_I1_ConservacionDeActivos()` — el escrow nunca crea ni destruye saldo (I1) (`EscrowInvariants.t.sol:58`).
  - `invariant_I2_SinCancelacionConCustodia()` — sin cancelación unilateral post-custodia (I2) (`EscrowInvariants.t.sol:68`).
  - `invariant_I4_AnulacionesResueltasEnPlazo()` (I4) (`EscrowInvariants.t.sol:82`).
  - `invariant_I5_SancionSoloTrasTimelock()` — sanción solo tras timelock (I5) (`EscrowInvariants.t.sol:100`).
  - `invariant_I7_CompletadoRequiereFirmasYValoracion()` (I7) (`EscrowInvariants.t.sol:117`).
- El encabezado del archivo menciona "invariantes I1–I7" (`EscrowInvariants.t.sol:2-4`), pero **solo existen 5 funciones de invariante en el archivo actual** (I1, I2, I4, I5, I7). El reporte de Fase 4 confirma "Invariantes 5/5" con esos mismos nombres (`estado_proyecto.md:49`). I3 (ventanas de apertura ±10 min) e I6 no tienen función en este archivo → cubiertos según `sc/README.md` en ciclos previos (diseño) o pendientes; **estado real: pendiente de confirmar**.

### 2.3 Cobertura Forge (gate D38 ≥ 80 %)

- Dato reportado en `estado_proyecto.md:52`: **89.55 % líneas (497/555)** con desglose por contrato: Escrow 95.19 %, SmartAccount 95.12 %, Factory 100 %, BRLT 90 %, Fondo 100 %, Registry 94.03 %, Suscripción 81.82 %, Handler de invariantes 100 %.
- El gate D38 está definido en `estado_proyecto.md:113` ("forge coverage ≥80 % líneas como gate por ciclo").
- **No re-ejecutable en este entorno** (`forge` ausente) → **dato reportado — pendiente de confirmar**. Comando de verificación: `cd sc && forge coverage`.
- `sc/README.md:27` conserva una métrica anterior del Ciclo 1 (94.96 % líneas) que no debe confundirse con el valor consolidado de Fase 4 (89.55 %); el reporte vigente es el de `estado_proyecto.md`.

---

## 3. Backend — node:test (26/26 verificado)

### 3.1 Ejecución propia (verificada en este análisis)

- Comando ejecutado: `node --test test/indexador.test.js test/relayer.test.js test/api.test.js test/ciclo8.test.js` en `backend/`.
- **Resultado: 26 tests, 26 pass, 0 fail** (verificado). Desglose por archivo:

| Archivo | Tests | Resultado | Ref. de casos |
|---|---|---|---|
| `backend/test/indexador.test.js` | 5 | 5/5 | mapeo TruekeCreado, idempotencia, Custodia→CUSTODIADO/Completado→COMPLETADO, checkpoint+lag, contrato desconocido — `test/indexador.test.js:101-173` |
| `backend/test/relayer.test.js` | 7 | 7/7 | D16 allowlist/nonce/chainId, límite diario D29, bloqueo 1 h D29, health D15 — `test/relayer.test.js:65-143` |
| `backend/test/api.test.js` | 7 | 7/7 | auth+GDPR, kyc D28, catalog D14, truekes RF-14.4, admin, healthz — `test/api.test.js:43-143` |
| `backend/test/ciclo8.test.js` | 7 | 7/7 | fórmula D12/D30, Oro histórico, inactividad D19, `/reputacion/mi`, subastas RF-17, adjudicación D27 — `test/ciclo8.test.js:15-141` |

- **Nota**: el script `test` de `backend/package.json` ejecuta solo `indexador.test.js relayer.test.js api.test.js` (**19 tests**); `ciclo8.test.js` **no está incluido** en `npm test` y debe ejecutarse explícitamente para alcanzar los 26 (ver `backend/package.json` scripts).

### 3.2 Técnicas de simulación usadas

- **Indexador**: pool "en memoria" que simula las tablas `auditoria`, `truekes` e `indexador_checkpoint` (`backend/test/indexador.test.js:18-59`); proveedor mock con logs fabricados desde el ABI real de `sc/out` (`test/indexador.test.js:61-87`).
- **Relayer**: wallet con clave ficticia, proveedor mock con `estadoVerificacion` configurable (0/1/2) y factory mockeada (`backend/test/relayer.test.js:21-50`).
- **API**: `supertest` contra `crearApp({ almacen })` real escuchando en puerto 0 (`backend/test/api.test.js:33-40`).
- Existe además `backend/test/integracion-relayer.js` (script de integración relayer↔API, **no parte de `npm test`**).

---

## 4. Frontend — Playwright E2E (18 ejecuciones)

### 4.1 Configuración y conteo estructural

- Proyectos: `chromium` + `mobile-chrome` (Pixel 5) → cada caso corre en ambos (`web/playwright.config.ts:19-22`).
- Casos en el código: `web/e2e/landing.spec.ts` (**4**) + `web/e2e/suite.spec.ts` (**5**) = **9 casos × 2 proyectos = 18 ejecuciones**.
- Servidor bajo prueba: `npm run start` (build de producción) en :3000 con `reuseExistingServer` (`web/playwright.config.ts:23-28`).

### 4.2 Evidencia de ejecución

- Resultado reportado **18/18 verdes** en `estado_proyecto.md:47-58`, con detalle del entorno: Chromium headless con fuentes DejaVu/fontconfig instaladas en el sandbox (hallazgo no funcional resuelto en Fase 4 — `estado_proyecto.md:56-58`).
- **No hay artefacto `playwright-report/` ni `test-results/` en el repositorio** → el 18/18 es **dato reportado — pendiente de confirmar** con una re-ejecución (`cd web && npx playwright test`, requiere `npm run build` previo porque el webServer lanza `npm run start`).

### 4.3 Cobertura funcional E2E

- Landing (RF-14.1): hero/marca, métricas, ventajas, CTA → `/suite/dashboard` (`web/e2e/landing.spec.ts`).
- Suite (RF-14.2): barra superior `@usuario` (RNF-08.4), escalera D28, gating visual de módulos por estado (RF-14.3), botón Conectar MetaMask sin sesión (RF-16), BottomNav central (`web/e2e/suite.spec.ts`).
- **Limitación de alcance**: los E2E no ejercitan wallet real (MetaMask no automatizado), ni backend real, ni contratos; son pruebas de UI/estado estático.

---

## 5. Cómo reproducir las suites

### 5.1 Contratos (Forge)

```bash
cd sc
forge test            # 62/62 reportado (61 unit/fuzz + 1 suite invariantes)
forge coverage        # gate D38: ≥80 % líneas (89.55 % reportado, 497/555)
```

### 5.2 Backend (node:test)

```bash
cd backend
npm test                              # 19 tests (script oficial: indexador+relayer+api)
node --test test/*.test.js            # 26 tests (incluye ciclo8) — verificado 26/26
```

### 5.3 Frontend (Playwright)

```bash
cd web
npm run build           # requerido: el webServer de Playwright ejecuta `npm run start`
npx playwright test     # 9 casos × 2 proyectos (chromium + mobile-chrome)
```

---

## 6. Limitaciones y huecos de cobertura observados

- **Forge y cobertura**: no re-ejecutados en este entorno (binario ausente) → valores reportados pendientes de confirmar.
- **Invariantes**: el archivo declara 5 invariantes (I1/I2/I4/I5/I7); I3 e I6 sin función en el archivo actual (ver §2.2).
- **Sin pruebas de integración con PostgreSQL real**: indexador (pool simulado) y API (almacén en memoria) no se prueban contra `mcc-postgres`; la reconciliación y el puente C8 quedan sin evidencia de ejecución.
- **E2E estático**: sin wallet ni backend; 4 de los 9 casos cubren páginas placeholder o contenido estático de la suite.
- **Relayer**: los tests cubren las protecciones con mocks; la integración real relayer→SmartAccount on-chain y el script `test/integracion-relayer.js` no forman parte de `npm test`.
- **Documentación**: `sc/README.md` conserva métricas antiguas (18/18 y 94.96 % de ciclos previos) que difieren del consolidado de Fase 4 (`estado_proyecto.md:47-58`), que es la referencia vigente.
