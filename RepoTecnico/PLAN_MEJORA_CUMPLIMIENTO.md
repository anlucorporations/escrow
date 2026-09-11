# Plan de mejora del cumplimiento — TrueKeate frente a `README_ESTUDIANTE.md`

> **Documento base:** `RepoTecnico/INFORME_CUMPLIMIENTO_ESCROW_DAPP.md` (rúbrica de la §1, puntuaciones de la §14).
> **Fecha:** 11 de septiembre de 2026.
> **Objetivo:** elevar el cumplimiento ponderado del **64 % actual** al **95-98 %**, priorizando por retorno sobre esfuerzo y sin degradar el producto real.

---

## 1. Punto de partida

### 1.1 Puntuación corregida

| Bloque | Peso | Puntos | % | Valor de cada punto en el global |
|---|---:|---:|---:|---:|
| A. Funcionalidades principales | 25 % | 16 / 25 | 64 % | 1,00 |
| B. Estructura de archivos exigida | 20 % | 7 / 13 | 54 % | **1,54** |
| C. Stack tecnológico | 15 % | 8 / 8 | 100 % | 1,88 (completo) |
| D. Fases 1–12 | 15 % | 5,5 / 12 | 46 % | 1,25 |
| E. Mejoras opcionales | 10 % | 4,5 / 10 | 45 % | 1,00 |
| F. Calidad y verificación | 15 % | 6 / 8 | 75 % | **1,88** |
| **GLOBAL** | 100 % | — | **64 %** | — |

> Las cifras del informe original (67 %) tenían **dos errores de suma** (bloques B y F), corregidos en su §15.0. La base real es 63 % en el commit auditado y **64 %** con las reparaciones ya aplicadas.

### 1.2 Dónde está el dinero

El score no premia la calidad del producto: premia la **coincidencia con la estructura del enunciado**. Por eso:

- **Crear un componente con el nombre exacto pedido vale 1,54 puntos globales** (bloque B). Es lo más barato que existe.
- **Arreglar o añadir una prueba vale 1,88** (bloque F).
- **Cerrar una fase del enunciado vale 1,25** (bloque D).
- **Implementar una funcionalidad del bloque A vale 1,00 por punto** (5 puntos por funcionalidad).

Consecuencia estratégica: las mejoras de mayor retorno son de **fontanería y estructura**, no de arquitectura. Las tres cosas más caras del proyecto (multi-chain, subgraph, ofertas parciales) están en el bloque que **menos pesa** (E, 10 %) y solo valen 1 punto cada una.

### 1.3 Regla de integridad del plan

Ninguna tarea de este plan consiste en crear artefactos vacíos para cumplir con el nombre. Un componente que existe pero nadie usa vale lo mismo que `web/lib/contracts.ts`: **existe y aun así el informe lo puntúa como parcial porque es código muerto**. Cada artefacto debe quedar **cableado y probado**, y el criterio de "hecho" de cada tarea incluye su verificación.

---

## 2. Fase 1 — Cimientos: 64 % → ~82 % (mayor retorno)

Seis tareas de coste bajo o medio que no dependen de decisiones de producto.

| # | Tarea | Archivos | Bloque que sube | Δ global | Esfuerzo |
|---|---|---|---|---|---|
| 1.1 | **Arreglar las 4 pruebas de backend en rojo** (subastas y disputas). Primero diagnosticar: pueden esconder bugs reales del motor de disputas, no solo pruebas desactualizadas | `backend/test/api.test.js`, `test/suite-integracion.test.js`, `backend/api/routes/disputas.js` | F 3: ⚠️→✅ | **+0,94** | Media (4-6 h) |
| 1.2 | **Pruebas unitarias de frontend**: añadir `vitest` + `@testing-library`, script `npm test`, y cubrir `lib/ethereum.tsx`, `lib/api.ts`, `components/StatusBadge` y la lógica de `navegacion.ts` | `web/package.json`, `web/vitest.config.ts`, `web/test/*` | F 4: ❌→✅ | **+1,88** | Media (6-8 h) |
| 1.3 | **`BalanceDebug.tsx` real**: panel con ETH y tokens por cuenta leídos con ethers (`getBalance`, `balanceOf`), botón de refresco y estado del contrato Escrow. Es lo que hoy no existe y además cierra el requisito 5 del bloque A (junto con 1.4) y la fase 9 del enunciado | `web/components/BalanceDebug.tsx` | B 9: ❌→✅ · D 9: ❌→✅ | **+2,79** | Baja-Media (4 h) |
| 1.4 | **Extraer y cablear los componentes del enunciado**: `ConnectButton.tsx` (renombrar `BotonConectarLogin`), `CreateOperation.tsx` (extraer el alta de hoy en dashboard/mercado), `OperationsList.tsx` (con **auto-refresh cada 5 s**, que hoy no existe) y completar `BalanceDebug`. Todos **usados por las pantallas actuales**, no duplicados | `web/components/`, `web/app/suite/**` | B 5,7,8 (+3 pts) · D 5,7,8 · A 5 → 5/5 | **+1,54·3 +0,63·3 +4,00 = +10,5** | Media-Alta (8-10 h) |
| 1.5 | **Filtros y búsqueda por token** en mercado y catálogo: endpoint con filtro y caja de búsqueda en la UI | `backend/api/routes/catalog.js`, `web/app/suite/mercado/page.tsx` | E 6: ❌→✅ | **+1,00** | Baja (3 h) |
| 1.6 | **Manejo del rechazo de MetaMask (4001) y escucha de `chainChanged`**: mensaje al usuario y aviso de red incorrecta | `web/lib/ethereum.tsx` | D 11: ⚠️→✅ | **+0,63** | Baja (2 h) |

**Estado proyectado al cerrar la Fase 1**

| Bloque | Antes | Después | Puntos |
|---|---:|---:|---:|
| A | 64 % | 80 % | 20,00 |
| B | 54 % | 85 % | 16,92 |
| C | 100 % | 100 % | 15,00 |
| D | 46 % | 71 % | 10,63 |
| E | 45 % | 55 % | 5,50 |
| F | 75 % | 94 % | 14,06 |
| **GLOBAL** | **64 %** | **82 %** | |

**Verificación de la fase:** `forge test` en verde, `npm test` en `backend/` con 51/51, `npm test` en `web/` con el runner nuevo, `npx playwright test` en verde y comprobación manual del panel de balances contra un Anvil con contratos desplegados.

---

### 2.1 Estado de avance de la Fase 1

> **Actualizado el 11 de septiembre de 2026.** Cinco de las seis tareas están cerradas y verificadas; falta la 1.4.

| # | Tarea | Estado | Verificación |
|---|---|---|---|
| 1.1 | Pruebas de backend en verde | ✅ **Hecha** | Los 4 fallos **no eran bugs del producto**, sino pruebas desactualizadas (la subasta exige que el artículo sea de la Empresa; el No Conforme exige motivo y foto; `POST /disputas` ya no existe). `npm test` pasa de 3 archivos a la suite completa: **52/52**. Se corrigieron además las cifras del README del backend |
| 1.2 | Pruebas unitarias de frontend | ✅ **Hecha** | vitest + jsdom + testing-library; **61 pruebas** en 6 archivos (ethereum, api, navegación, mercado, StatusBadge, BalanceDebug). `@types/node` alineado a la 22 del runtime real |
| 1.3 | `BalanceDebug` real | ✅ **Hecha** | Componente que lee la cadena con ethers (ETH, tokens, SBT, estado del Escrow) y degrada con elegancia si el RPC no responde; cableado en `/suite/admin` |
| 1.4 | Componentes del enunciado + auto-refresh 5 s | ⏳ **Pendiente** | Es la tarea más grande de la fase (+10,5 puntos) |
| 1.5 | Filtros y búsqueda por token | ✅ **Hecha** | Buscador y filtro por categoría en `/suite/mercado`, con lógica pura testeada (ignora acentos y mayúsculas) |
| 1.6 | Rechazo de MetaMask y cambio de red | ✅ **Hecha** | Aviso de rechazo (4001) en pantalla, escucha de `chainChanged` y botón para cambiar de red (incluye el caso 4902 de red desconocida) |

**Puntuación real tras lo hecho: 75,6 %** (desde 64,4 %). Al cerrar la 1.4 la fase queda en **82,1 %**.

| Bloque | Antes | Ahora | Al cerrar la 1.4 |
|---|---:|---:|---:|
| A | 64 % | **80 %** | 80 % |
| B | 54 % | **62 %** | 85 % |
| C | 100 % | 100 % | 100 % |
| D | 46 % | **58 %** | 71 % |
| E | 45 % | **55 %** | 55 % |
| F | 69 % | **94 %** | 94 % |
| **GLOBAL** | **64 %** | **76 %** | **82 %** |

## 3. Fase 2 — Cumplimiento literal: 82 % → ~95 %

Aquí se implementa el enunciado **como módulo propio**, sin tocar la arquitectura del producto. Es la decisión de diseño central del plan.

### 3.1 La decisión previa (requiere tu aprobación)

El enunciado describe un contrato con **6 funciones y 4 eventos con nombres exactos** (`addToken`, `createOperation`, `completeOperation`, `cancelOperation`, `getAllowedTokens`, `getAllOperations`; `TokenAdded`, `OperationCreated`, `OperationCompleted`, `OperationCancelled`). El `Escrow` real de TrueKeate tiene una API distinta (máquina de 9 estados con custodia dual y gobernanza). Hay tres caminos:

| Opción | Qué implica | Riesgo | Δ A |
|---|---|---|---|
| **A. Renombrar la API del `Escrow` real** | Añadir alias con los nombres del enunciado sobre la lógica actual | **Alto**: rompe contratos, backend, tests y el despliegue en GCP | +5,00 |
| **B. Contrato de referencia + allowlist real (recomendado)** | Crear `sc/src/EscrowReference.sol` con la API exacta del enunciado y, además, añadir la **allowlist de tokens al `Escrow` real** como funcionalidad de producto | Medio: la allowlist cambia el comportamiento (solo tokens autorizados) y obliga a redesplegar | +5,00 |
| **C. Solo contrato de referencia** | El enunciado se cumple en el módulo didáctico; el producto no cambia | Bajo | +2,00 |

La opción B es la que da el máximo retorno sin destruir nada: el contrato de referencia satisface la literalidad y la allowlist mejora de verdad el control de acceso del producto.

### 3.2 Tareas

| # | Tarea | Archivos | Bloque que sube | Δ global | Esfuerzo |
|---|---|---|---|---|---|
| 2.1 | **`EscrowReference.sol`**: `Ownable` + `ReentrancyGuard`, las 6 funciones y los 4 eventos exactos, con `SafeERC20`; suite de pruebas completa (happy path, reverts, edge cases, fuzz) | `sc/src/EscrowReference.sol`, `sc/test/EscrowReference.t.sol` | D 2: ❌→✅ | **+1,25** | Media (6-8 h) |
| 2.2 | **`deploy.sh` en la raíz** que cumpla los 6 pasos del enunciado: desplegar el Escrow, desplegar TokenA y TokenB, agregarlos con `addToken`, mintear 1000 de cada uno a las 3 cuentas de Anvil, actualizar `web/lib/contracts.ts` y generar `deployment-info.txt` | `deploy.sh` | D 3: ❌→✅ · B 12: ⚠️→✅ | **+2,79** | Media (4-6 h) |
| 2.3 | **Allowlist en el `Escrow` real** (`addToken`/`quitarToken`/`tokenPermitido`) + `AddToken.tsx` y pantalla de administración del Owner. Requiere redesplegar y actualizar direcciones | `sc/src/Escrow.sol`, `web/components/AddToken.tsx`, `backend/api/routes/admin.js` | A 1: 0→5 · B 6: ❌→✅ | **+6,54** | Media (5-6 h) |
| 2.4 | **Pantalla "Escrow DApp"** con cabecera, grid de 3 columnas (AddToken + CreateOperation │ OperationsList │ BalanceDebug) y footer, cableada por ethers al contrato de referencia | `web/app/escrow-dapp/page.tsx` | D 10: ⚠️→✅ | **+0,63** | Baja (3 h) |
| 2.5 | **Dar vida a `web/lib/contracts.ts`**: que la app lo consuma de verdad (carga de ABIs y direcciones al arrancar) o retirarlo. Hoy es código muerto y el informe lo penaliza | `web/lib/contracts.ts`, `web/app/layout.tsx` | B 11: ⚠️→✅ | **+0,77** | Baja (1-2 h) |

**Estado proyectado al cerrar la Fase 2** (opción B): A 100 % · B 100 % · C 100 % · D 100 % · E 55 % · F 94 % → **95 %**

**Verificación de la fase:** `forge test` con la suite nueva incluida; `./deploy.sh` ejecutado contra un Anvil temporal aislado con verificación de las 6 salidas (2 tokens desplegados y autorizados, 1000 unidades en cada una de las 3 cuentas, `contracts.ts` actualizado, `deployment-info.txt` generado).

---

## 4. Fase 3 — Mejoras del enunciado: 95 % → ~98 %

| # | Tarea | Archivos | Bloque que sube | Δ global | Esfuerzo |
|---|---|---|---|---|---|
| 3.1 | **Cobrar la comisión del 1 %** en el trueque completado (hoy el contrato la define pero no se aplica) | `sc/src/Escrow.sol`, `sc/src/FondoDeValor.sol` | E 1: ⚠️→✅ | **+1,00** | Media (6 h) |
| 3.2 | **Expiración temporal de un trueke activo** (TTL configurable con cierre y liberación automática) | `sc/src/Escrow.sol`, backend | E 2: ⚠️→✅ | **+1,00** | Media (6 h) |
| 3.3 | **Cerrar la cadena de despliegue completa**: reparar `scripts/deploy-contracts-gcp.sh`, crear los archivos que faltan (`web/Dockerfile.indexer`, `web/.env.gcp.example`) y validar un build real de la imagen | `scripts/`, `web/` | F 5: ⚠️→✅ | **+0,94** | Media (4 h) |

**Estado proyectado al cerrar la Fase 3:** A 100 % · B 100 % · C 100 % · D 100 % · E 75 % · F 100 % → **98 %**

---

## 5. Proyección y retorno acumulado

| Hito | Global | Δ | Esfuerzo acumulado |
|---|---:|---:|---:|
| Estado actual | **64 %** | — | — |
| Fase 1 — Cimientos | **82 %** | +18 | 27-33 h |
| Fase 2 — Cumplimiento literal | **95 %** | +12 | +19-25 h |
| Fase 3 — Mejoras del enunciado | **98 %** | +3 | +16 h |
| Techo (bloque E al 100 %) | **100 %** | +2 | +40-60 h (no recomendado) |

**Lectura del retorno:** más de la mitad de la mejora total (18 de los 34 puntos hasta el 98 %) se consigue en la Fase 1, que es la más barata. El tramo final del 98 % al 100 % exige ofertas parciales, multi-chain y un subgraph, cuesta más que las tres fases juntas y **el subgraph contradice la decisión D25 del propio proyecto** (indexación con listener propio en Node.js).

---

## 6. Qué NO hacer

1. **No crear componentes vacíos para cumplir nombres.** El informe ya penaliza el caso exacto: `web/lib/contracts.ts` existe con el nombre correcto y se puntúa como parcial por ser código muerto. Crear cinco archivos que nadie importa repetiría el error y sería deshonesto ante una evaluación externa.
2. **No renombrar la API del `Escrow` real** (opción A de la §3.1): rompe tests, backend, despliegue y la plataforma en producción a cambio del mismo +5 que la opción B sin riesgo.
3. **No implementar el subgraph** por cumplir la mejora 10: contradice D25 y aporta 1 punto.
4. **No añadir ERC-1155 ni ERC-2981** pensando en el informe: no están en la rúbrica; serían 0 puntos.
5. **No maquillar las cifras de la documentación.** Parte del 36 % que falta proviene de que la documentación del proyecto afirma cosas que el código no respalda (4 pruebas en rojo, funciones inexistentes, 9 cifras contradictorias). Arreglar el código y luego la documentación, nunca al revés.

---

## 7. Riesgos y dependencias

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **La allowlist cambia el producto** (solo tokens autorizados podrán intercambiarse) | Alto para los usuarios actuales | Decidir antes de la Fase 2.2; si no se quiere restringir, usar la opción C (solo contrato de referencia) y asumir +2 en lugar de +5 |
| **Todo cambio en contratos obliga a redesplegar** (no hay proxies ni upgradeability) | Alto: cambian las direcciones | Actualizar en el mismo commit: `web/.env.local`, `web/Dockerfile`, `scripts/cloudbuild.yaml`, `backend/contratos.json` y el esquema de datos si aplica |
| **Las 4 pruebas en rojo pueden ser bugs reales** del motor de disputas, no pruebas obsoletas | Medio | Diagnosticar antes de tocar: si son bugs, priorizar sobre cualquier mejora de puntuación |
| **Riesgo de "optimizar para la rúbrica"** | Medio: la rúbrica es de este informe, no de un evaluador externo | La Fase 1 produce valor real (pruebas, panel de balances, filtros, manejo de errores); la Fase 2 concentra lo literal en un módulo aislado y documentado como didáctico |
| **El techo real puede ser < 100 %** | Bajo | Es esperable: el enunciado pide una DApp de práctica y el repositorio es un producto. El plan busca el máximo cumplimiento **sin degradar el producto** |

---

## 8. Orden de ejecución recomendado

```
Fase 1 (Sprint 1, ~30 h)   →  83 %
   1.1 pruebas backend  →  1.2 pruebas frontend  →  1.6 MetaMask  →  1.5 filtros
   1.3 BalanceDebug     →  1.4 componentes + auto-refresh
   [punto de control: re-puntuar el informe con la rúbrica de la §1]

Fase 2 (Sprint 2, ~22 h)   →  95 %
   [DECISIÓN: opción A, B o C de la §3.1]
   2.1 contrato de referencia + tests  →  2.2 deploy.sh  →  2.3 allowlist + AddToken
   2.4 pantalla Escrow DApp  →  2.5 dar vida a lib/contracts.ts
   [punto de control: re-puntuar]

Fase 3 (Sprint 3, ~16 h)   →  98 %
   3.3 despliegue GCP  →  3.1 comisión 1 %  →  3.2 expiración
   [punto de control: informe final de cumplimiento]
```

En cada punto de control conviene **regenerar la puntuación con la misma rúbrica**, para que la mejora sea medible y no una impresión.

---

*Plan derivado del informe `INFORME_CUMPLIMIENTO_ESCROW_DAPP.md`, con la base aritmética corregida en su §15.0. Las estimaciones de esfuerzo son orientativas y suponen una persona con conocimiento del proyecto.*
