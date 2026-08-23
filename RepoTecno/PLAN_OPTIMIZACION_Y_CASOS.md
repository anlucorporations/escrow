# PLAN DE OPTIMIZACIÓN Y CASOS PRÁCTICOS — Escrow DApp

> **Objetivo:** entender cómo se usa el proyecto, optimizarlo y adaptarlo a una versión
> que sirva como **caso práctico real** (demo reproducible y con propósito de negocio).

---

## PARTE A — Cómo se usa el proyecto hoy

### A.1 Actores del sistema

| Actor | Rol en el contrato | Rol en la web |
|---|---|---|
| **Owner / Admin** | Despliega el contrato; autoriza tokens ERC20 (`addToken`) | Página `/add-token` (solo visible si `account == owner()`) |
| **User1 (creador)** | Ofrece **Token A** y pide **Token B** (`createOperation`) | Formulario "New Operation" |
| **User2 (contraparte)** | Deposita **Token B** y recibe **Token A** (`completeOperation`) | Botón "Complete Operation" |

### A.2 Ciclo de vida de una operación (flujo actual)

```
  Admin              User1 (creador)            Contrato Escrow            User2 (contraparte)
   │                        │                         │                          │
   ├─ addToken(TKA,TKB) ───►│                         │                          │
   │                        ├─ approve(TKA) ─────────►│                          │
   │                        ├─ createOperation ──────►│ (custodia amountA)       │
   │                        │                         │  estado: ACTIVA          │
   │                        │                         │◄───── approve(TKB) ──────┤
   │                        │◄──── 50 TKB ────────────┤◄───── completeOp ────────┤
   │                        │                         ├─► User2 recibe 100 TKA ──►│
   │                        │                         │  estado: CERRADA          │
   │                        │                         │                          │
   │   (alternativa)        ├─ cancelOperation ──────►│                          │
   │                        │◄── 100 TKA devueltos ───┤  estado: CERRADA          │
```

**Reglas que garantizan la seguridad (la "lógica" del proyecto):**

1. **Custodia previa:** el contrato retiene el Token A *antes* de publicar la operación → si nadie la completa, el creador no ha perdido nada.
2. **Intercambio atómico:** `completeOperation` transfiere Token B (user2 → user1) y Token A (contrato → user2) **en la misma transacción** → ninguno de los dos puede quedarse con lo suyo sin dar lo suyo.
3. **Control de acceso:** solo el owner lista tokens; solo el creador cancela; nadie completa su propia operación.
4. **ReentrancyGuard:** las 3 funciones que mueven fondos están protegidas.

### A.3 Qué hace falta para que sea "de verdad" útil

- **Expiración automática** (hoy la cancelación es manual y sin plazo).
- **Mecanismo de disputas/arbitraje** (hoy no existe).
- **Diferenciar "completada" vs "cancelada"** (hoy solo `isActive=false + closedAt`).
- **Paginación** de operaciones (hoy `getAllOperations()` recorre todo).
- **Frontend sin duplicados** y con saldos por decimales reales del token.

---

## PARTE B — Plan de optimización

### B.0 Fase 0 — Restaurar el entorno (BLOQUEANTE)

| # | Tarea | Comando / acción |
|---|---|---|
| 0.1 | Inicializar submódulos (hoy `sc/lib` no existe y `forge build` falla) | `git submodule update --init --recursive` |
| 0.2 | Compilar y testear contratos | `cd sc && forge build && forge test` |
| 0.3 | Instalar dependencias web | `cd web && npm install` |
| 0.4 | Crear los scripts que la documentación promete (`setup.sh`, `start.sh`, `stop.sh`, `verify-setup.sh`, `accounts.sh`) o actualizar los 5 docs que los referencian | Refactor de `deploy.sh` en scripts idempotentes |
| 0.5 | Regenerar artefactos locales | `deployment-info.txt`, `web/.env.local` |

> ⚠️ Sin la Fase 0 nada más puede ejecutarse. Es la única parte estrictamente bloqueante.

### B.1 Fase 1 — Optimización del contrato (prioridad alta)

| # | Mejora | Motivación | Impacto |
|---|---|---|---|
| 1.1 | `enum Status { Active, Completed, Cancelled, Disputed }` en lugar de `bool isActive` | Distinguir estados finales; base para disputas | Alto |
| 1.2 | Campo `deadline` en la operación + `refundAfterExpiry(id)` (solo creador, tras vencer) | Evita fondos bloqueados para siempre | Alto |
| 1.3 | Rol **arbitro** (`setArbiter`) + `disputeOperation(id)` + `resolveDispute(id, favorUser1)` | Habilita el caso de pagos con garantía | Alto |
| 1.4 | Paginación: `getOperations(offset, limit)` + `getOperationsCount()` | Gas predecible; escala | Medio |
| 1.5 | Validar en `addToken`: `extcodesize > 0` + `try symbol()` | Evita añadir direcciones sin contrato ERC20 | Medio |
| 1.6 | Eventos con montos completos en `OperationCompleted`/`OperationCancelled` | Indexación y auditoría | Bajo |
| 1.7 | (Opcional) Fee del protocolo + treasury (`onlyOwner`) | Monetización del marketplace | Bajo |

### B.2 Fase 2 — Optimización del frontend (prioridad media)

| # | Mejora | Motivación |
|---|---|---|
| 2.1 | Eliminar componentes huérfanos/duplicados: `BalanceDebug.tsx`, `AddToken.tsx`, `CreateOperation.tsx`, `OperationsList.tsx` | Mantenibilidad (la lógica está duplicada en las páginas) |
| 2.2 | Hooks compartidos: `useEscrow()` y `useTokenInfo(addr)` (symbol, decimals, name) | Una sola fuente de verdad |
| 2.3 | Usar `token.decimals()` en vez de `ethers.formatEther` hardcodeado | Correcto para tokens con ≠18 decimales |
| 2.4 | `NEXT_PUBLIC_ESCROW_ADDRESS` desde `.env.local` | Config sin tocar código |
| 2.5 | Re-fetch de datos en lugar de `window.location.reload()` | UX fluida |
| 2.6 | Traducir errores de revert a mensajes amigables | Usabilidad |
| 2.7 | Tests de componentes (Vitest + Testing Library) | Regresión |
| 2.8 | Parametrizar (o eliminar) la API route con RPC hardcodeado | Portabilidad |

### B.3 Fase 3 — Calidad, CI y documentación

| # | Tarea |
|---|---|
| 3.1 | CI: añadir job web (`npm ci`, `lint`, `typecheck`, `build`) junto al workflow Foundry existente |
| 3.2 | Corregir encoding UTF-8 roto en `SCRIPTS.md`, `USAGE.md`, `SETUP-GUIDE.md` |
| 3.3 | Unificar versión de Next.js (16) en todos los docs; eliminar mención a Wagmi/Viem |
| 3.4 | Documentar el flujo real (1 botón que encadena approve + tx) |

### B.4 Fase 4 — Empaquetar como caso práctico

| # | Tarea |
|---|---|
| 4.1 | Script `setup.sh` idempotente (anvil → deploy → addToken → mint → env) |
| 4.2 | Datos de demostración y guion de demo (ver Parte D) |
| 4.3 | `README_CASO_PRACTICO.md` con 3 escenarios listos para ejecutar |

### B.5 Priorización resumida

| Fase | Esfuerzo | Riesgo si se omite |
|---|---|---|
| 0. Entorno | Bajo | Nada funciona |
| 1. Contrato | Medio | Caso práctico limitado (sin deadline/disputas) |
| 2. Frontend | Medio | Código duplicado, UX pobre |
| 3. Calidad/docs | Bajo | Confusión y onboarding lento |
| 4. Empaquetado | Medio | No se puede demostrar |

---

## PARTE C — Dos casos reales donde aplica la metodología

### CASO 1 — Intercambio P2P de activos digitales (marketplace "cero confianza")

**Problema real:** Ana quiere cambiar **500 USDT por 0.01 WBTC** con Luis, o vender un
activo digital (skin, dominio, suscripción) por cripto. En un mercado P2P sin
intermediario, **¿quién entrega primero?** El modelo clásico genera estafas de
"pago por adelantado" o "no envié nada".

**Cómo aplica exactamente la lógica del proyecto:**

| Actor del caso | Rol Escrow actual | Flujo |
|---|---|---|
| Ana (vendedora) | User1 | Deposita 0.01 WBTC (tokenA) pidiendo 500 USDT (tokenB) → contrato custodia el WBTC |
| Luis (comprador) | User2 | Deposita 500 USDT → recibe el WBTC al instante; Ana recibe los USDT |
| Owner (marketplace) | Admin | Autoriza WBTC y USDT; (opcional) cobra 1% de fee |

**Ventajas sobre la solución actual (centralizada):** sin custodia por parte de la
plataforma, liquidación en una sola transacción, sin retención de fondos, disputas
resolubles por arbitraje on-chain.

**Adaptaciones necesarias (delta sobre el código actual):**
1. `deadline` + `refundAfterExpiry`: si Luis no deposita en X días, Ana recupera su WBTC automáticamente (hoy sería manual).
2. (Opcional) Fee del 1% para el marketplace (mejora 1.7).
3. La web muestra el par con precio fijo visible: *"0.01 WBTC ↔ 500 USDT"*.

**Métricas de éxito:** 0 disputas manuales · liquidación en 1 tx · refund automático al vencer.

---

### CASO 2 — Escrow de pagos por servicios (freelancing / contratos)

**Problema real:** Una empresa contrata a un freelancer por **5.000 USDT**. Riesgo
mutuo: el cliente teme no recibir el trabajo; el freelancer teme no cobrar. Hoy se
usan plataformas centralizadas (Upwork, Fiverr) con comisiones del 10–20% y
retenciones de semanas.

**Cómo aplica exactamente la lógica del proyecto:**

| Actor del caso | Rol Escrow actual | Flujo |
|---|---|---|
| Cliente (empresa) | User1 | Deposita 5.000 USDT (tokenA) y pide 1 token de **recibo de entrega** (tokenB) |
| Freelancer | User2 | Entrega el trabajo y deposita el token-recibo → recibe los 5.000 USDT; el cliente recibe el recibo |
| Arbitro (nuevo rol) | — | Solo interviene si hay disputa |

**Cómo funciona el token-recibo (prueba de entrega):** el freelancer despliega un
ERC20 "DELIVERY" (1 token = 1 entrega certificada). Al completar, el cliente recibe
el recibo tokenizado y el freelancer el pago. El intercambio sigue siendo atómico y
sin confianza: **o el cliente paga y recibe su recibo, o nadie pierde nada**.

**Adaptaciones necesarias (delta sobre el código actual):**
1. Rol **arbitro** + `disputeOperation` + `resolveDispute` (mejoras 1.3): si el cliente
   disputa, el arbitro decide a favor de cliente (refund) o freelancer (pago).
2. **Deadline de entrega** (mejora 1.2): si vence sin entrega → refund al cliente.
3. **Milestones:** dividir el contrato en N operaciones (una por hito). El modelo ya lo
   soporta: cada hito es una operación independiente.

**Variante simplificada (recomendada para la demo):** usar el **mismo contrato** sin
modificar la mecánica central: tokenB = token-recibo emitido por el freelancer. Así el
caso 2 reutiliza el 100% de la lógica actual + las mejoras 1.1–1.3.

**Métricas de éxito:** comisión ~0% (vs 10–20% de plataformas) · pago liberado en
minutos tras la entrega · disputas resueltas on-chain con trazabilidad.

---

## PARTE D — Versión adaptada para caso práctico (propuesta concreta)

### D.1 Elección

Construir **una sola demo con dos modos de uso** sobre el mismo contrato:

1. **Modo SWAP** (caso 1): intercambio directo tokenA ↔ tokenB (comportamiento actual).
2. **Modo PAGO CON GARANTÍA** (caso 2): tokenA = pago en stablecoin, tokenB = recibo de
   entrega, con deadline y arbitraje.

### D.2 Cambios mínimos al contrato (delta sobre `Escrow.sol`)

```solidity
enum Status { Active, Completed, Cancelled, Disputed }

struct Operation {
    uint256 id;
    address user1;
    address tokenA;
    address tokenB;
    uint256 amountA;
    uint256 amountB;
    Status status;          // ← reemplaza bool isActive
    uint256 createdAt;      // ← nuevo
    uint256 deadline;       // ← nuevo (0 = sin expiración)
}

address public arbiter;     // ← nuevo rol

// Nuevas funciones
function setArbiter(address _arbiter) external onlyOwner;
function disputeOperation(uint256 id) external;           // user1 o user2, antes del deadline
function resolveDispute(uint256 id, bool favorUser1) external onlyArbiter;
function refundAfterExpiry(uint256 id) external;          // user1 tras deadline sin contraparte

// Paginación (reemplaza el loop infinito)
function getOperations(uint256 offset, uint256 limit) external view returns (Operation[] memory);
function getOperationsCount() external view returns (uint256);
```

### D.3 Cambios al frontend

| Área | Cambio |
|---|---|
| Dashboard | Badges por estado: **Activa / Completada / Cancelada / En disputa / Vencida** |
| Tarjeta de operación | Botones contextuales por actor + estado (Completar / Cancelar / Disputar / Reclamar tras vencimiento) |
| Formulario de creación | Campos nuevos: *deadline (días)* y *tipo (SWAP / PAGO)* |
| Página "Mi actividad" | Filtro por operaciones del usuario conectado |
| Panel de arbitro | Visible solo si `account == arbiter`: resolver disputas |

### D.4 Guion de demo reproducible (3 terminales, < 10 min)

```bash
# Terminal 1
anvil

# Terminal 2
./setup.sh          # despliega Escrow + TKA + TKB + USDT-mock + DELIVERY, mintea, configura env

# Terminal 3
cd web && npm run dev   # http://localhost:3000
```

| Paso | Escenario | Verificación |
|---|---|---|
| 1 | Admin añade USDT y DELIVERY al contrato | Aparecen en `/add-token` |
| 2 | **SWAP:** User1 crea 100 TKA ↔ 50 TKB | Estado **Activa** |
| 3 | User2 completa la operación | User2 tiene 100 TKA, User1 50 TKB; estado **Completada** |
| 4 | **PAGO:** Cliente deposita 1.000 USDT pidiendo 1 DELIVERY con deadline 7 días | Estado **Activa** |
| 5 | Freelancer entrega trabajo y completa | Cliente recibe DELIVERY, freelancer 1.000 USDT |
| 6 | **DISPUTA:** nueva operación, cliente la disputa | Estado **En disputa** |
| 7 | Arbitro resuelve a favor del cliente | Refund de USDT al cliente |
| 8 | **EXPIRACIÓN:** operación sin contraparte, `cast rpc anvil_evm_increaseTime` + reclamar | User1 recupera su token |

> Los pasos 6–8 se automatizan además como tests Foundry (`forge test`) para que la
> demo sea verificable sin frontend.

### D.5 Criterios de éxito de la versión práctica

- ✅ `forge test` cubre los 8 escenarios (happy path + disputa + expiración + reverts).
- ✅ Demo completa en < 10 minutos con 3 terminales.
- ✅ El contrato funciona **sin cambios** en ambos casos de negocio (solo configuración).
- ✅ Documentación `README_CASO_PRACTICO.md` con guion paso a paso.

---

## PARTE E — Roadmap sugerido

| Semana | Entregable |
|---|---|
| 1 | Fase 0 (entorno) + Fase 1 (contrato: Status, deadline, arbitro, paginación) + tests |
| 2 | Fase 2 (frontend: limpieza, hooks, decimals dinámicos, badges de estado) |
| 3 | Fase 3 (CI web, docs, encoding) + Fase 4 (setup.sh, guion de demo) |
| 4 | Pruebas end-to-end de los 8 escenarios y `README_CASO_PRACTICO.md` |

---

## Resumen de "por qué funciona" (la lógica transferible)

El valor del proyecto no es el contrato en sí, sino el **patrón de custodia bilateral
con intercambio atómico**:

> *Ninguna parte entrega su contraprestación sin recibir la suya, y ninguna parte
> puede quedar atrapada con sus fondos en custodia para siempre (cancelación +
> expiración).*

Ese patrón es directamente aplicable a: marketplaces P2P, pagos por servicios,
ventas con garantía, liquidación de contratos, intercambio de activos tokenizados y
cualquier transacción entre dos partes que no se conocen ni se confían.
