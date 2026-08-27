# Plan de Implementación: Sistema de Reputación, Roles de Usuario y Rediseño Integral de Interfaces

Este documento define la arquitectura, lógica de negocio y plan de ejecución técnica para implementar el **doble eje de progresión**, los **3 tipos de roles** (Particular, Empresa, Socio) con el sistema de **admisión por votación de 5 días y depósito operativo**, y la **reestructuración total de interfaces** con acceso exclusivo al mercado para usuarios inscritos.

---

## 🎯 Reglas de Negocio Confirmadas

### 1. Control de Acceso a Interfaces
- **🌐 Landing Page (`/`):** 100% pública. Enfocada exclusivamente en promocionar la plataforma, explicar los 3 pilares del comercio Web3, estadísticas comunitarias y captación de usuarios.
- **🚪 Mercado de Intercambios (`/items`) y Dashboard (`/dashboard`):** Exclusivo para usuarios con billetera **inscrita on-chain (Nivel 1+)**.
- **Acceso por niveles al catálogo:**
  - **Inscrito (Nivel 1):** Ver ofertas y tener máximo **1 intercambio activo a la vez**.
  - **Verificado (Nivel 2):** Ver ofertas y tener máximo **3 intercambios activos a la vez**.
  - **Certificado (Nivel 3 SBT):** Operaciones ilimitadas, crear ofertas, perfil multidirección e historial completo.

### 2. Rangos de Reputación y Efectividad Comercial
- 🥉 **Bronce (Iniciado):** 0 a 49 truekes completados o efectividad $< 75\%$.
- 🥈 **Plata (Frecuente):** 50 a 999 truekes completados con $\ge 80\%$ de efectividad.
- 🥇 **Oro (Élite):** $+1,000$ truekes completados con $\ge 90\%$ de efectividad comercial.
- **Fórmula de efectividad:** $\text{Efectividad} = \frac{\text{Completados}}{\text{Completados} + \text{Disputas Perdidas}} \times 100\%$. Incluye periodo de gracia en caso de descensos temporales.

### 3. Requisitos y Acreditación de Roles
- **👤 Usuario Particular:** Rol base asignado automáticamente a toda billetera inscrita.
- **🏢 Usuario Empresa:** Requiere estar **Certificado (Nivel 3 SBT)** + **Rango Oro** ($+1,000$ truekes, $\ge 90\%$) + **Membresía BRLT**. Desbloquea: Gestión de inventario/stock, Puntos de encuentro comerciales fijos con horarios, Finanzas comerciales (flujo USDT/BRLT) y Promociones.
- **⚖️ Usuario Socio:** Requiere estar **Certificado** + **Rango Oro** + **Solicitud formal en `Governance.sol`** con depósito de postulación.
  - **Ventana de votación:** Máximo **5 días** (120 horas).
  - **Aprobación:** **Mayoría simple** de los Socios participantes.
  - **Destino del depósito:** Al ser aprobado, el depósito **se transfiere permanentemente a la tesorería de la plataforma** para cubrir gastos de operación (gas, servidores, mantenimiento). Si es rechazado, se le reembolsa.
  - **Desbloquea:** Tribunal de Disputas y Arbitraje, Votaciones de admisión de Socios y Finanzas Globales de la plataforma (gas relayer, tesorería, costos de infraestructura).

---

## 🛠️ Cambios Propuestos por Componente

### 1. Smart Contracts (`sc/`)
- **[`sc/src/Governance.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/sc/src/Governance.sol):**
  - Struct `SocioApplication` con candidato, motivación, monto de depósito, timestamp inicio/fin (5 días), votos a favor/contra, estado de ejecución.
  - Función `applyForSocio(string calldata motivation, address token, uint256 amount)`.
  - Función `voteSocioApplication(uint256 applicationId, bool support)`.
  - Función `resolveSocioApplication(uint256 applicationId)`: Ejecuta mayoría simple; si aprueba, otorga rol de Socio y transfiere el depósito al `treasuryAddress`; si rechaza, devuelve el depósito.
- **[`sc/src/Escrow.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/sc/src/Escrow.sol):**
  - Mapeo `activeTradesCount[address]`.
  - Verificación on-chain de límite de intercambios activos (1 para Inscrito, 3 para Verificado, ilimitado para Certificado/Empresa/Socio) al crear o aceptar una operación.
- **[`sc/src/UserRegistry.sol`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/sc/src/UserRegistry.sol):**
  - Contadores on-chain `completedTradesCount` y `disputedLossesCount`.
  - Función de consulta `getUserReputation(address)` y `getUserRole(address)`.

---

### 2. Base de Datos PostgreSQL / SQLite & Indexador (`web/`)
- **[`web/server/db.js`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/web/server/db.js):**
  - Columnas añadidas a `users`: `role`, `reputation_rank`, `completed_trades`, `disputes_lost`, `effectiveness_pct`.
  - Nueva tabla `company_stores` (locales comerciales fijos, coordenadas UTM, horarios de atención).
  - Nueva tabla `company_inventory` (gestión de stock de artículos y servicios).
  - Nueva tabla `socio_applications` (solicitudes de admisión y votos).
  - Nueva tabla `platform_treasury_logs` (ingresos por depósitos/suscripciones y gastos de gas/mantenimiento).
- **[`web/scripts/indexer.mjs`](file:///c:/Users/lucci/MasterCodeCripto/GitLab/escrow/web/scripts/indexer.mjs):**
  - Indexar eventos de `SocioApplicationCreated`, `SocioApplicationResolved`, `TradeCompleted`, `TradeDisputed` para actualizar métricas de reputación en tiempo real.
- **Nuevos Endpoints API:**
  - `/api/company/inventory` (CRUD de inventario para Empresas).
  - `/api/company/stores` (Puntos de venta fijos).
  - `/api/company/finances` (Métricas de ventas y cobros en cripto).
  - `/api/governance/applications` (Postulaciones a socio y votación).
  - `/api/governance/treasury` (Balance global y costos operativos).

---

### 3. Frontend & Rediseño de Interfaces (`web/`)
- **Landing Page (`web/app/page.tsx`):**
  - Showcase público de alto impacto visual con diseño Velvety.
  - Explicación interactiva de los 3 pilares del comercio Web3 (Trueke Multi-Activo, Reputación Inmutable, Resolución Descentralizada).
  - Llamada a la acción para conectar billetera e ingresar al mercado.
- **Protección de Rutas & Access Gate (`web/components/AccessGate.tsx`):**
  - Rutas `/items` y `/dashboard` requieren billetera inscrita (Nivel 1+).
  - Muestra avisos contextuales de cuota disponible de truekes (ej. "1/1 trueke en curso — Completa tu 2FA para desbloquear hasta 3").
- **Navegación & Menú de Usuario (`web/components/Header.tsx`, `web/components/UserMenu.tsx`):**
  - Badges con Rol (`Particular`, `Empresa`, `Socio`) y Rango (`Bronce`, `Plata`, `Oro`).
  - Accesos dinámicos según permisos del usuario.
- **Nuevos Módulos y Suites:**
  - **Componente `ReputationBadge.tsx`:** Indicador visual de rango y barra de efectividad.
  - **Componente `TradeQuotaIndicator.tsx`:** Visualizador de operaciones activas / límite.
  - **Suite Empresa (`web/app/(platform)/company/`):** `/inventory`, `/finances`, `/promotions`.
  - **Suite Socio (`web/app/(platform)/governance/`):** `/socio-voting`, `/disputes`, `/treasury`.

---

## 🧪 Plan de Verificación

1. **Foundry Smart Contract Tests (`sc/test/`):**
   - Test de postulación de Socio con depósito y ventana de 5 días.
   - Test de votación por mayoría simple y transferencia de depósito a tesorería.
   - Test de límite de 1 intercambio para Inscrito y 3 para Verificado en `Escrow.t.sol`.
   - Ejecutar `forge test -vvv`.
2. **Re-despliegue local:**
   - Ejecutar `python -u deploy-local.py` y validar configuración de roles.
3. **Vitest Frontend Tests (`web/test/`):**
   - Tests para `ReputationBadge.tsx`, `TradeQuotaIndicator.tsx`, `AccessGate.tsx` con roles y límites.
   - Tests para suite Empresa y suite Socio.
   - Ejecutar `npm test`.
4. **TypeScript & Build:**
   - `npx tsc --noEmit` y `npm run build`.
5. **Disciplina Git:**
   - Commit local en la rama `escrow-Antigravity` (**sin push a remotos**).
