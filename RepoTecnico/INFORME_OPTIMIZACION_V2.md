# Informe de Optimización V2 — TrueKeate

**Versión:** V2 · **Fecha:** 30 de agosto de 2026 · **Estado:** Consolidación de 6 auditorías especializadas (Scopes A–F) + síntesis

---

## 1. Resumen ejecutivo

El proyecto TrueKeate/Escrow tiene una base **funcional pero insegura e inconsistente**: los tests pasan (forge 86/86, vitest 59/59, tsc 0 errores, lint 0 problemas), los servicios locales arrancan y el esquema de datos es portable, pero la brecha entre la visión documentada (M1–M16), el código real y el despliegue es enorme. Se consolidaron **59 hallazgos únicos** a partir de los 108 reportados por los 6 agentes (tras deduplicar repeticiones).

| Severidad | Nº hallazgos |
|---|---|
| CRÍTICA | 6 |
| ALTA | 12 |
| MEDIA | 37 |
| BAJA | 4 |
| **Total** | **59** |

**Veredicto: NO apto para producción.** El proyecto no debe desplegarse fuera de un entorno local controlado hasta corregir, como mínimo, las 6 críticas: (1) disputas secuestrables por terceros que permiten robo de fondos y DoS, (2) fuga de PII completa vía `GET /api/identity` sin autenticación, (3) KYC auto-aprobable y sin verificación on-chain, (4) OTP/2FA ficticios que otorgan Nivel 2/3 sin garantía, (5) PII en claro on-chain en `UserRegistry`, y (6) secretos reales versionados en el repositorio (con espejo público en GitHub). Las 4 críticas principales **ya fueron detectadas en la auditoría previa** (`docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md`) y **siguen sin corregir**, lo que indica ausencia de un proceso de seguimiento de hallazgos.

**Lo que sí funciona (verificado con ejecución en Scope F):** contratos compilan y pasan fuzz e invariantes del Escrow legacy; el backend de datos (SQLite/PostgreSQL) es consistente en la mayoría de consultas; el cifrado AES-256-GCM está correctamente aplicado en la capa de datos; el dominio EIP-712 incluye `chainId` + `verifyingContract` (anti-replay entre cadenas) y nonces por usuario; las cuotas por nivel de identificación están on-chain.

---

## 2. Metodología

- **Fecha de la auditoría:** 30 de agosto de 2026.
- **Alcance:** repositorio `escrow` completo de TrueKeate — contratos Solidity (`sc/src`, 12 contratos), tests Foundry (`sc/test`, 9 suites), scripts de despliegue (`.sh`/`.ps1`), frontend Next.js (`web/app`, 23 páginas; `web/components`, 26 componentes), backend API (`web/app/api`, `web/server`), indexador, relayer, documentación de requisitos y despliegue (`RepoTecnico/`, `docs/`), CI y QA.
- **Equipo (6 agentes auditores, modo lectura-only):**

| Agente | Scope | Enfoque |
|---|---|---|
| A | Scope A — On-chain | Contratos `sc/src`, tests Foundry, scripts, despliegue local, indexador, relayer, requisitos on-chain (15 hallazgos) |
| B | Scope B — Backend/API/datos | `web/server/db.js`, `lib.js`, rutas API, indexador, esquema de datos, secretos (18 hallazgos) |
| C | Scope C — Frontend UX/UI | Páginas, componentes, estilos, PWA, i18n, a11y, navegación, datos mock (18 hallazgos) |
| D | Scope D — Seguridad/criptografía | Meta-txs EIP-712, permits, cifrado AES-GCM, identidad/KYC, claves, documentación de secretos (18 hallazgos) |
| E | Scope E — Especificación/proyecto | Cumplimiento de requisitos M1–M16, consistencia doc-código, stakeholders, CI/CD, despliegue GCP (18 hallazgos) |
| F | Scope F — QA con ejecución | forge test, tsc, lint, vitest, E2E, servicios locales, reproducción de hallazgos previos (18 hallazgos) |

- **Síntesis:** deduplicación de hallazgos repetidos entre agentes (108 → 59), asignación de IDs únicos (H-01…H-59), priorización por severidad y categorización en Ambigüedades / Inconsistencias / NFRs faltantes / Stakeholders faltantes / Otros. Los desacuerdos entre agentes se marcan como **"en conflicto"** con veredicto razonado (§ 5).
- **Restricciones:** ninguna auditoría modificó archivos. Los puntos que dependen del entorno (si la credencial PostgreSQL es de producción, el origen de claves divergentes, métricas LCP/TTI reales) se marcan **"necesita verificación"**.

---

## 3. Estado de calidad actual (métricas ejecutadas por QA — Scope F)

Entorno de ejecución: servicios locales activos — Anvil `:8545` (chainId 31337) y web `:3000` (HTTP 200).

| Métrica | Comando | Resultado |
|---|---|---|
| Tests de contratos | `forge test` (sc/) | **86 PASS / 0 fallos** (9 suites; incluye 6 fuzz con 256 runs) |
| TypeScript | `npx tsc --noEmit` (web/) | **0 errores** |
| Lint | `npm run lint` (web/) | **0 problemas** (1 warning: dependencia `baseline-browser-mapping` desactualizada) |
| Unit tests frontend | `npm test` (vitest) | **59/59 PASS** en 13 archivos — **lento**: 65.47 s total (setup 51.10 s; environment jsdom 279.60 s); **sin cobertura configurada** |
| E2E UI/API (suites A–C) | `node scripts/e2e/run-e2e.mjs` | **NO EJECUTABLE**: falla al arrancar con `ERR_MODULE_NOT_FOUND 'playwright'` — la dependencia **no está declarada** en `web/package.json` |
| E2E contratos (suite D) | `node scripts/e2e/contracts-test.mjs` | **21/22 en 1ª ejecución** (D7 "valoración legítima" falla por BD SQLite persistente ya valorada); **2ª ejecución FATAL** en D3: `Already a socio` → **suite no idempotente ni reproducible** sin redeploy completo |
| Cobertura | `forge coverage` / `vitest --coverage` | **No ejecutado / no configurado**: sin métricas de ramas ni umbrales en ninguno de los dos |

**Notas de QA:** los conteos de tests documentados no coinciden con la realidad (docs: 74/80/86 forge y 40/59 vitest → real: 86 y 59; ver H-54). QA confirmó reproduciendo los 4 hallazgos CRÍTICOS del informe previo (disputa por terceros, fuga PII por `requester`, 2FA sin TOTP, PII on-chain) y la rotura gasless con BRLT (sin `permit`). Las métricas de rendimiento web (LCP/TTI) **no pudieron medirse** (no hay setup de Lighthouse).

---

## 4. Hallazgos por severidad (tabla consolidada)

| ID | Severidad | Área | Título |
|---|---|---|---|
| H-01 | CRÍTICA | Arbitraje / Escrow | Disputa secuestrable por terceros: contraparte fantasma, robo de fondos sin depósito y DoS (Escrow.sol y TruekeEscrow.sol) |
| H-02 | CRÍTICA | API / Privacidad | Fuga de PII (email/teléfono descifrados, hashes KYC/selfie, 2FA) vía `GET /api/identity/[address]?requester=` sin autenticación |
| H-03 | CRÍTICA | API / KYC | KYC simulado: `PUT /api/users/[address]/kyc` público auto-aprueba 'certificado'; `verify-sbt` no consulta el contrato on-chain |
| H-04 | CRÍTICA | Identidad / 2FA | OTP y 2FA ficticios: códigos vacíos/'123456'/cualquier 6 dígitos aceptados; sin TOTP real; Niveles 2/3 obtenibles sin verificación |
| H-05 | CRÍTICA | Smart Contracts / Privacidad | PII en claro on-chain en UserRegistry: email/teléfono/dirección en storage y en eventos |
| H-06 | CRÍTICA | Secretos / Configuración | Secretos hardcodeados/commiteados: contraseña PostgreSQL, clave relayer Anvil #4, KYC_SECRET fallback, IDs GCP en repo público |
| H-07 | ALTA | Arquitectura / Integración | TruekeEscrow huérfano: no desplegado ni indexado, pero la Landing lo promociona; dos escrows con semántica divergente |
| H-08 | ALTA | Gobernanza / Integración | Rol Socio/Gobernanza desconectado: árbitro único=owner, sanciones sin enforcement, SBT/BRLT solo owner |
| H-09 | ALTA | Arquitectura / Exchange | Triple solapamiento de venues de swap con reglas inconsistentes; Exchange sin expiración ni re-chequeo de allowlist |
| H-10 | ALTA | Acceso / Registro | Usuarios no registrados pueden operar en Escrow/TruekeEscrow (registro solo enforceado en UI y Exchange) |
| H-11 | ALTA | Relayer / API | Relayer abierto: sin auth/rate-limit/allowlist/fee/staticCall/timeout; drenaje de gas; errores crudos expuestos |
| H-12 | ALTA | Indexador / Datos | Indexador sin backfill (Governance/SBT/Subscription), notificaciones duplicadas por reinicio, sin cursor persistente, UsernameUpdated no indexado |
| H-13 | ALTA | Identidad / Divergencia on-chain | Nivel de identidad/KYC escrito solo en BD sin reflejo on-chain (identityAdmin sin uso): estado partido BD vs cadena |
| H-14 | ALTA | Autorización / API | Endpoints de escritura sensibles sin firma de posesión (ratings, vouches, meetups/open, accept, refresh, notifications) |
| H-15 | ALTA | Requisitos funcionales | Reglas de negocio de la spec no implementadas (M4/M12/M2): niveles 3%/rubros, máx rubros/artículos, 5 avales, penalización, subastas, encargo |
| H-16 | ALTA | Entorno / Configuración | DApp/relayer/rutas fijados a Anvil localhost (31337/127.0.0.1) sin multi-red configurable; stats truncados >500 — *en conflicto (CRITICA vs MEDIA)* |
| H-17 | ALTA | Meta-tx / BRLT | BRLT sin ERC20Permit: meta-transacciones gasless con el token nativo revierten — *en conflicto (MEDIA vs ALTA)* |
| H-18 | ALTA | NFRs / Backend | NFRs backend ausentes: rate limiting global, CORS/headers, timeouts RPC, logging/auditoría, backups BD, 500s filtran err.message |
| H-19 | MEDIA | Cuotas / Escrow | Cuotas por nivel hardcodeadas (1/3), fail-open silencioso (catch vacío) y contador solo de creaciones; niveles dispares entre artefactos |
| H-20 | MEDIA | Deadlines / Escrow | Semántica de deadline divergente (0=sin expiración) y sin ventana máxima de vigencia |
| H-21 | MEDIA | TruekeEscrow / Quema | autoBurnService aplicado a ambas patas del trueke + fallback silencioso a transferencia |
| H-22 | MEDIA | Subscription / Negocio | Suscripción sin cobro automático, withdraw total del fondo en cualquier momento, businessFlag/isActive sin consumo |
| H-23 | MEDIA | Gobernanza / Quorum | Admisión de Socio sin quorum, ventanas fijas no configurables, solicitudes múltiples simultáneas |
| H-24 | MEDIA | Eventos / Indexador | Eventos de auditoría incompletos: mintMore sin evento, refund indistinguible (TradeCancelled) |
| H-25 | MEDIA | NFRs / Contratos | Sin Pausable, sin upgradeabilidad, sin timelock; admin con poder unilateral; loops view O(n) |
| H-26 | MEDIA | QA / Cobertura | Cobertura de pruebas insuficiente: flujos críticos sin tests (disputa por terceros, expiración, quema, Exchange, Governance), sin métricas/umbrales, fuzz solo en Escrow |
| H-27 | MEDIA | Tokens / Validación | Validación de tokens inconsistente: fee-on-transfer/rebasing/permit no verificados; Exchange sin validación; TruekeEscrow sin allowlist; pragmas dispares |
| H-28 | MEDIA | Rendimiento / DDL | initSchema() ejecuta DDL completo (CREATE + ~25 ALTER) en cada request de 20 rutas |
| H-29 | MEDIA | Contrato de API | Contratos de API ambiguos: rutas duplicadas, camelCase vs snake_case, identificationLevel number vs string, campos no poblados |
| H-30 | MEDIA | Documentación / Enum | Enum IdentificationLevel desfasado (docs '0: Ninguno…' vs contrato Inscrito=0…Certificado=2) y mapeos duplicados |
| H-31 | MEDIA | Validación de entrada | Paginación sin validar (NaN/negativos → 500 o sin límite) y LIKE sin escapar comodines |
| H-32 | MEDIA | Privacidad / Meetups | Meetups: coordenadas/ubicación expuestas sin verificar parte; notificaciones sin paginación ni borrado |
| H-33 | MEDIA | Idempotencia | Endpoints de creación sin idempotencia (items, campañas, meetups): reintentos duplican registros |
| H-34 | MEDIA | Datos / Seed | Seed escribe email/phone en claro vs cifrado del sistema; tablas huérfanas sin API; drift doc-esquema |
| H-35 | MEDIA | Consistencia off/on-chain | user2 acordado off-chain (BD) sin vínculo on-chain: cualquiera puede completar la operación primero (race/MEV) |
| H-36 | MEDIA | UI / Diseño | Triple sistema de diseño visual + clases CSS en conflicto + hex sueltos que rompen los tokens |
| H-37 | MEDIA | Dead code | Componentes huérfanos (ExchangePlatform, OrderBook, LandingPage…), help/data.ts (481 líneas) sin importar, assets boilerplate |
| H-38 | MEDIA | UX / Flujo | Flujo catálogo→trueque roto: CTA 'Proponer Trueke Atómico' lleva a un detalle sin ninguna acción |
| H-39 | MEDIA | UX / Datos demo | Datos ficticios presentados como reales: mocks en Empresa/Tesorería y prefills falsos en registro/SBT |
| H-40 | MEDIA | UX / Estados | Estados de carga/error/vacío faltantes o engañosos en varias páginas |
| H-41 | MEDIA | UX / Navegación | Navegación incompleta: Empresa/Socio/admin-identity inalcanzables; Ayuda solo para invitados; 'Socios' visible para todos |
| H-42 | MEDIA | UX / Detalle ítem | Placeholder '—' en 'Intercambios completados' con comentario de proxy + estilo legado en el detalle |
| H-43 | MEDIA | PWA / Offline | PWA offline incompleta (3 URLs precacheadas) + colores de tema inconsistentes (manifest/viewport/CSS) |
| H-44 | MEDIA | i18n | Sin estrategia de internacionalización; fechas dependientes del locale del navegador |
| H-45 | MEDIA | Accesibilidad | Brechas a11y: textos <12px, icon-only sin aria-label, sin skip-link, sin loading/error/not-found |
| H-46 | MEDIA | Marca | Marca inconsistente 'TrueKeat' vs 'TrueKeate' en metadata, copy y assets |
| H-47 | MEDIA | Privacidad / UX | Operaciones de todos los usuarios visibles por defecto; filtro 'mi actividad' solo cubre user1 |
| H-48 | MEDIA | Especificación / Ambigüedad | Dos versiones del documento base (md vs txt) contradictorias y tres taxonomías de niveles/roles |
| H-49 | MEDIA | Stakeholders | Stakeholders faltantes: moderador/soporte, auditor externo, DPO/cumplimiento, couriers, peritos RWA, almacenes, proveedores SBT/KYC, operador del exchange, tesorería del relayer |
| H-50 | MEDIA | Documentación | Docs desalineadas con el código: MANUAL_TECNICO, README, INFORME_CUMPLIMIENTO, CLAUDE.md, GCP_DEPLOY.md inejecutable, DICCIONARIO_DE_DATOS |
| H-51 | MEDIA | CI/CD | CI/CD no operativo: workflow en sc/.github no descubierto por GitHub Actions, sin .gitlab-ci.yml, sin jobs E2E/cobertura/deploy |
| H-52 | MEDIA | IPFS | IPFS simulado: CIDs deterministas falsos sin pinning real; PINATA_JWT/IPFS_KEY sin uso |
| H-53 | MEDIA | Documentación / Claves | Claves privadas documentadas inconsistentes entre docs y código (cuenta #4 del relayer) |
| H-54 | MEDIA | Documentación / Métricas | Métricas de tests inconsistentes entre docs (74/80/86; 40/59) y prerequisitos contradictorios (PostgreSQL 18 vs SQLite; Node v20 vs ≥22.5) |
| H-55 | MEDIA | QA / E2E | Suites E2E no reproducibles: run-e2e.mjs falla (playwright no declarado); contracts-test.mjs no idempotente (D7 falla, 'Already a socio') |
| H-56 | BAJA | NFRs / Proceso | NFRs de proceso/operación ausentes: SLA de disputas, monitoreo/alertas, backups/DR, auditoría externa, bug bounty, screening sanciones/AML, límites por cuenta, respuesta a incidentes |
| H-57 | BAJA | Meta-tx / EIP-712 | Intención EIP-712 sin expiry propio y nonce único compartido entre create/complete |
| H-58 | BAJA | UX / Errores | Mensajes de error crudos sin traducir (getFriendlyError); logs en inglés |
| H-59 | BAJA | Rendimiento / Landing | Landing 100% client-side sin streaming; sin métricas LCP/TTI ni umbrales de rendimiento |

---

## 5. Detalle de hallazgos por categoría

> Convenciones: cada hallazgo incluye **evidencia** (ruta:línea) y **recomendación**. Los hallazgos marcados *en conflicto* indican severidad u opinión divergente entre agentes, con veredicto razonado. *Necesita verificación* indica dependencia de entorno no confirmable en lectura-only.

### (a) Ambigüedades

**H-20 — Semántica de deadline divergente (0 = sin expiración) y sin ventana máxima** *(MEDIA; A)*
- **Detalle:** en `Escrow`, `deadline==0` deja al creador cancelar en cualquier momento (`cancelOperation` sin restricción temporal), mientras `TruekeEscrow.cancelTrade` exige estado `Pending` y `InTransit` bloquea la cancelación: user1 queda atrapado hasta el deadline. `refundAfterExpiry` exige `deadline!=0` en ambos. No hay límite superior: un deadline enorme congela fondos por tiempo indefinido. El significado de `0` no está normalizado entre contratos ni documentado en la UI.
- **Evidencia:** `sc/src/Escrow.sol:364-380`, `sc/src/Escrow.sol:388-389`; `sc/src/TruekeEscrow.sol:209-232`.
- **Recomendación:** unificar reglas de cancelación/refund, documentar `deadline==0` vs expiración en la UI y definir una ventana máxima de vigencia de operaciones (con límite superior en el contrato).

**H-29 — Contratos de API ambiguos** *(MEDIA; B)*
- **Detalle:** (a) `POST /api/users/[address]` y `POST /api/users/[address]/refresh` hacen exactamente lo mismo (`refreshTrustLevel`); (b) `GET /api/operation/[id]` (on-chain, camelCase: `tokenA`, `amountA`) coexiste con `GET /api/operations/[id]` (BD, snake_case: `token_a`, `amount_a`) sin documentar cuál usar; (c) `UserProfile.identificationLevel` se declara `number` en el cliente pero la API devuelve strings ('inscrito'|'verificado'|'certificado') y el endpoint `/api/users/[address]` ni siquiera lo devuelve → `IdentityStatusBanner.tsx:14` siempre cae al fallback 1 y muestra niveles incorrectos; (d) `sbtClaimed`/`twoFactorEnabled` declarados pero nunca poblados.
- **Evidencia:** `web/app/api/users/[address]/route.js:49-60` vs `.../refresh/route.js:9-20`; `web/app/api/operation/[id]/route.ts:26-37` vs `web/app/api/operations/[id]/route.js:17`; `web/lib/items.ts:46-49`; `web/components/IdentityStatusBanner.tsx:14`.
- **Recomendación:** eliminar la ruta duplicada, definir un único naming (camelCase) y un único endpoint de operación; alinear `UserProfile` con la respuesta real de la API (o devolver `identificationLevel` de forma consistente); documentar cada endpoint con OpenAPI y ejemplos.

**H-30 — Enum IdentificationLevel documentado con desfase y mapeos duplicados** *(MEDIA; B)*
- **Detalle:** `DICCIONARIO_DE_DATOS.md` documenta '0: Ninguno, 1: Inscrito, 2: Verificado, 3: Certificado' (desfase +1 con valor 'Ninguno'), mientras el contrato define `{Inscrito=0, Verificado=1, Certificado=2}` y el código mapea 0→inscrito… Además `Escrow.sol` comenta 'Inscrito (Nivel 1 = 0 en enum)', mezclando etiqueta y valor; esto ya provocó mapeos distintos en admin page y hooks.
- **Evidencia:** `docs/DICCIONARIO_DE_DATOS.md:42` vs `sc/src/UserRegistry.sol:16-19` vs `web/app/(platform)/admin/identity/page.tsx:106-111` vs `sc/src/Escrow.sol:307-313`.
- **Recomendación:** corregir el diccionario y centralizar el mapeo enum→string en un único módulo compartido (server + client) con tests; usar constantes en lugar de literales mágicos.

**H-47 — Operaciones de todos los usuarios visibles por defecto; filtro 'mi actividad' incompleto** *(MEDIA; C)*
- **Detalle:** `/operations` lista por defecto todas las operaciones con montos y direcciones de cualquiera; 'Solo mi actividad' filtra solo `op.user1` (creador): un usuario que es la contraparte (user2) no aparece en 'mi actividad' aunque sí en el listado general. No está definido si las operaciones son públicas o privadas.
- **Evidencia:** `web/app/(platform)/operations/page.tsx:75-94,151-161`.
- **Recomendación:** decidir la política de visibilidad; si privada, filtrar user1 OR user2 por defecto; si pública, avisar y ocultar montos a terceros.

**H-48 — Especificación base duplicada y contradictoria; tres taxonomías de niveles/roles** *(MEDIA; E)*
- **Detalle:** el `.txt` dice 'las transacciones entre los usuarios no deberán generar coste de gas' (todos) mientras el `.md` dice 'solo los particulares' (las empresas pagan); el `.txt` declara Next.js 14 y el código actual usa Next.js 16. Conviven tres taxonomías: niveles de confianza Iniciado/Común/Frecuente/Socio (spec), niveles de identificación Inscrito/Verificado/Certificado (UserRegistry) y '4 roles: SuperUsuario, Socios, Comerciantes, Particulares' (INFORME). Las dimensiones de reputación también se nombran distinto ('Aceptación del producto' vs 'rapidez').
- **Evidencia:** `escrow-TrueKeate.txt:11,36` vs `escrow-TrueKeate.md:37-38`; `sc/src/UserRegistry.sol:16-20`; `RepoTecnico/INFORME_CUMPLIMIENTO.md:23`; `web/server/lib.js:10`.
- **Recomendación:** consolidar en un único documento de requisitos vigente (deprecar el `.txt` o marcarlo histórico), definir oficialmente una sola taxonomía de niveles con su mapping a roles on-chain y unificar nombres de dimensiones de reputación.

**H-57 — Intención EIP-712 sin expiración propia y nonce único compartido** *(BAJA; D)*
- **Detalle:** la intención de create no tiene `validUntil` de firma (el `deadline` es de la operación); el nonce EIP-712 es único y compartido entre create y complete por usuario: si el usuario firma dos intents y el primero se ejecuta, el segundo queda inválido, y un intent firmado 'antiguo' bloquea firmar uno nuevo (griefing del propio usuario o del relayer).
- **Evidencia:** `sc/src/Escrow.sol:73,155,158,196`; `web/lib/relay.ts:108,121,149,158`.
- **Recomendación:** añadir un campo `validUntil` a los typehash (verificado contra `block.timestamp`) y/o nonces por tipo (`createNonces`/`completeNonces`).

---

### (b) Inconsistencias

**H-07 — TruekeEscrow huérfano: no desplegado ni indexado, pero promocionado por la Landing; dos escrows con semántica divergente** *(ALTA; A, E, F)*
- **Detalle:** `deploy-local.sh` despliega el Escrow legacy pero nunca `TruekeEscrow`; `generate-contracts.mjs` y `web/lib/contracts.ts` no generan su ABI ni dirección; el indexador solo procesa eventos del Escrow legacy. Mientras, `LandingPage.tsx` afirma que los fondos quedan 'bloqueados en TruekeEscrow.sol'. Ambos escrows divergen: cancelación ilimitada vs bloqueo InTransit, chequeo de deadline en disputa, cuotas, allowlist y meta-txs solo en el legacy. El listado de direcciones del e2e no incluye TruekeEscrow; solo tiene 6 tests unitarios.
- **Evidencia:** `deploy-local.sh:91-105`; `web/scripts/generate-contracts.mjs:27-36`; `web/lib/contracts.ts:4-6937` (sin TRUEKE_ESCROW); `web/scripts/indexer.mjs:341-364`; `web/components/LandingPage.tsx:108`; `web/scripts/e2e/contracts-test.mjs:28-33`.
- **Recomendación:** decidir el contrato canónico: desplegar e integrar TruekeEscrow (ABI, indexer, deploy, tests) o eliminarlo; unificar semántica (deadline, cuotas, allowlist, disputas) en un solo contrato; corregir la Landing y documentar los contratos desplegados en MANUAL_TECNICO.

**H-08 — Gobernanza/Socios desconectada del resto del sistema** *(ALTA; A, F)*
- **Detalle:** el árbitro de los escrows es una única dirección seteada por el owner (en deploy-local es la cuenta 0); `Governance.sanctioned` no es consumido por Escrow/Exchange/TruekeSBT/UserRegistry (un sancionado puede seguir operando — enforcement inexistente); `TruekeSBT.revoke` es `onlyOwner` pese a su docstring 'Owner/Gobernanza'; `BRLT.mint` es `onlyOwner`; `removeSanction` lo ejecuta un único socio sin votación. `isSanctioned` solo aparece en el ABI generado en web, sin uso en rutas/UI.
- **Evidencia:** `sc/src/Escrow.sol:291-294`; `deploy-local.sh:133`; `sc/src/Governance.sol:230-233,235-237`; `sc/src/TruekeSBT.sol:81,14`; `sc/src/BRLT.sol:19-21`; `web/lib/contracts.ts:2589,2771`.
- **Recomendación:** conectar Governance al arbitraje (multisig de árbitros con timelock), hacer que las sanciones revoquen SBT y bloqueen `createOperation`/`completeOperation`/`meta*`/`createOrder`/`fillOrder` (con tests), y mover la emisión de BRLT a gobernanza.

**H-09 — Triple solapamiento de venues de intercambio atómico con reglas inconsistentes** *(ALTA; A)*
- **Detalle:** existen tres implementaciones de swap atómico con políticas distintas: Escrow (cuotas por nivel, arbitraje, meta-tx, allowlist), Exchange (libro de órdenes, exige registro, SIN expiración ni arbitraje ni cuotas) y TruekeEscrow (multi-activo, SIN allowlist ni cuotas ni meta-tx). `Exchange.fillOrder` no re-chequea `allowedTokens` tras `removeToken` (una orden abierta sobre token retirado sigue siendo llenable) y las órdenes sin deadline dejan fondos bloqueados hasta cancelación (con riesgo de cancelación justo antes del fill).
- **Evidencia:** `sc/src/Exchange.sol:127-140,76-87,15-25`; `sc/src/Escrow.sol:303-316`.
- **Recomendación:** definir un modelo de producto único y documentado (directo vs órdenes), añadir expiración a las órdenes y validar allowlist en `fillOrder`/`cancelOrder`.

**H-13 — Nivel de identidad/KYC escrito solo en BD sin reflejo on-chain: estado partido** *(ALTA; B)*
- **Detalle:** `submitKyc`, `verifyContactChannels`, `confirm2FA` y `verifyThirdPartySBT` mutan `identification_level`/`kyc_status` solo en PostgreSQL. El contrato `UserRegistry` tiene el rol `identityAdmin` (con `setIdentificationLevel`) justamente para validar estas subidas on-chain, y el indexador sobrescribe el nivel desde eventos on-chain (CASE que conserva el nivel previo). Resultado: la BD puede decir 'certificado' mientras on-chain sigue 'inscrito'; las cuotas reales se leen on-chain y la UI/avales leen BD → dos verdades distintas.
- **Evidencia:** `web/server/lib.js:630-638,652-677,694-714,717-748`; `sc/src/UserRegistry.sol:45-46,66,189`; `web/lib/hooks.ts:942-944`; `web/scripts/indexer.mjs:111-114`.
- **Recomendación:** el backend valida KYC/OTP/SBT y luego llama a `setIdentificationLevel` vía `identityAdmin` on-chain (o indexa las emisiones reales de SBT); la BD debe ser solo caché de lectura del estado on-chain, no la fuente de la escalada.

**H-34 — Seed escribe PII en claro vs cifrado del sistema; tablas huérfanas; drift doc-esquema** *(MEDIA; B)*
- **Detalle:** `seed-platform-data.mjs` inserta `u.email`/`u.phone` en claro, pero indexador y `submitKyc` los cifran con `encryptField` y `getUserIdentityProfile` los lee con `decryptField` → los usuarios sembrados muestran email/phone vacíos y lecturas mixtas inconsistentes. `company_stores`, `company_finances` y `platform_treasury_logs` se crean en el esquema y solo se pueblan por seed: sin rutas API ni eventos de indexador (inaccesibles en runtime). El DICCIONARIO documenta columnas distintas a las reales (`token_symbol/destination/tx_hash` vs `token/amount/actor/description`).
- **Evidencia:** `web/scripts/seed-platform-data.mjs:292-301` vs `web/server/lib.js:100-101,784-785`; `web/server/db.js:230-264`; `docs/DICCIONARIO_DE_DATOS.md:63-75`.
- **Recomendación:** cifrar también en el seed (reusar helpers del server) o eliminarlo de producción; decidir el destino de las 3 tablas huérfanas (endpoints o eliminación) y sincronizar el diccionario con el esquema real.

**H-36 — Triple sistema de diseño visual + clases CSS en conflicto + hex sueltos** *(MEDIA; C)*
- **Detalle:** `globals.css` define la paleta oficial (DS 2.0 navy/teal/gold), pero dashboard/items/register/profile usan DS 2.0; operations/items-new/balances/add-token/campaigns usan el estilo legado (dark:*, botones azules); identity/admin-identity usan una tercera paleta ámbar/stone ('Velvety'). En dashboard el mismo elemento declara `text-navy-900 text-white` (dos colores en conflicto cuyo ganador depende del orden CSS compilado) y varias páginas usan hex hardcoded en lugar de tokens `--color-*`.
- **Evidencia:** `web/app/globals.css:16-46,332`; `web/app/(platform)/operations/page.tsx:98,114,128`; `web/app/(platform)/items/new/page.tsx:83,90`; `web/app/(platform)/identity/page.tsx:293-294,318,385`; `web/app/(platform)/dashboard/page.tsx:173,188`; `web/app/register/page.tsx:142,219-220`.
- **Recomendación:** unificar todas las páginas al DS 2.0 (eliminar dark:* legados, botones azules y paleta ámbar), usar tokens de `@theme` y prohibir hex sueltos y clases duplicadas en conflicto vía lint.

**H-46 — Marca inconsistente 'TrueKeat' vs 'TrueKeate'** *(MEDIA; C)*
- **Detalle:** el metadata y varias páginas escriben 'TrueKeat' (sin 'e'), mientras footer, manifest y otros componentes usan 'TrueKeate'; `OperationCard` mezcla ambas ('TrueKeat Escrow').
- **Evidencia:** `web/app/layout.tsx:22`; `web/app/register/page.tsx:220,430`; `web/components/OperationCard.tsx:213`; `web/app/page.tsx:206`; `web/app/manifest.ts:6`.
- **Recomendación:** unificar la marca (recomendado 'TrueKeate') en metadata, copy, alt texts, manifest y assets; verificación de copy en CI.

**H-50 — Documentación desalineada con el código real** *(MEDIA; E, B)*
- **Detalle:** `MANUAL_TECNICO.md` documenta `resolveDispute(operationId, favorUser1, recipient)` de 3 parámetros cuando el contrato tiene `resolveDispute(uint256, bool)`, y `register(username)` cuando la firma real tiene 8 parámetros; `README.md` enlaza `RepoTecno/ACCOUNTS.md` (carpeta inexistente); `INFORME_CUMPLIMIENTO` asigna 'Cuentas 4,5: Comerciantes' mientras deploy-local usa cuentas 3,4 para empresas y 5,6 para particulares; `CLAUDE.md` referencia `Counter.s.sol`/`test_Increment` inexistentes; `GCP_DEPLOY.md` es inejecutable tal cual (`--set-secrets='RPC_URL=DATABASE_URL:1,...'` mal mapeado, `CMD node web/server.js` que no existe, encoding roto/mojibake en todo el archivo).
- **Evidencia:** `docs/MANUAL_TECNICO.md:95,112`; `README.md:57`; `RepoTecnico/INFORME_CUMPLIMIENTO.md:66-70` vs `deploy-local.sh:44-55`; `RepoTecnico/CLAUDE.md:90,75`; `RepoTecnico/GCP_DEPLOY.md:97,107`.
- **Recomendación:** regenerar la documentación técnica desde los artefactos compilados (como ya hace `generate-contracts.mjs` para ABIs), corregir rutas/nombres obsoletos, validar `GCP_DEPLOY.md` con un despliegue real y auditar enlaces del README.

**H-53 — Claves privadas documentadas inconsistentes entre docs y código (cuenta #4 del relayer)** *(MEDIA; D, E)*
- **Detalle:** el 'Registro Maestro de Claves' lista la clave del relayer como `0x47e1…060a0007`, que NO coincide con la clave real de la cuenta #4 de Anvil usada en `route.ts` (`0x47e1…34926a`, misma que deploy-local.ps1:39); `MANUAL_TECNICO.md:210` y `deploy-local.ps1:227` asignan al relayer la clave de la cuenta #0; `TruKeate_despliegue-1.md:23` difiere de la cuenta #2. Hay TRES 'claves del relayer' distintas en código/docs/scripts. *Necesita verificación:* el origen de las claves divergentes (¿alguna es real?).
- **Evidencia:** `RepoTecnico/REGISTRO_REPOSITORIOS_DESPLIEGUE_Y_CLAVES.md:236` vs `web/app/api/relay/route.ts:19` vs `docs/MANUAL_TECNICO.md:210` vs `deploy-local.ps1:227,39` vs `RepoTecnico/TruKeate_despliegue-1.md:23`.
- **Recomendación:** eliminar claves privadas de toda la documentación (incluso test): referenciar solo direcciones y origen 'Anvil default'; corregir/eliminar las claves divergentes; añadir escaneo CI (gitleaks/trufflehog) que falle ante patrones de clave.

**H-54 — Métricas de tests inconsistentes entre docs y prerequisitos contradictorios** *(MEDIA; F, E)*
- **Detalle:** los conteos de tests documentados no coinciden: `REGISTRO`: 74 forge y 40 vitest; `REPORTE.md`: 80; `BATERIA_DE_PRUEBAS`: 86 (correcto); ejecución real: forge 86, vitest 59. Además `CASOS_DE_USO_Y_DIAGRAMAS.md` afirma 'PostgreSQL 18 (14 Tablas)' mientras MANUAL_TECNICO/REGISTRO describen SQLite local (el código soporta ambos vía `node:sqlite` y `pg`); `REGISTRO` exige 'Node.js v20.x' pero `node:sqlite` (DatabaseSync) requiere Node ≥22.5 (entorno actual Node v24.16.0) → un dev con Node 20 ve fallar el arranque.
- **Evidencia:** `REGISTRO...:79,83,45,74`; `web/scripts/e2e/REPORTE.md:60`; `docs/pruebas/BATERIA_DE_PRUEBAS_SISTEMA.md:20-24`; `docs/CASOS_DE_USO_Y_DIAGRAMAS.md:30`; `web/server/db.js:5-6,14`; `docs/MANUAL_TECNICO.md:13,32`.
- **Recomendación:** centralizar los conteos en un script de verificación (parsear salida de forge/vitest en CI) y eliminar números estáticos de docs o marcarlos con fecha de generación; fijar `engines` en package.json (`node >=22.5`) y documentar la dualidad SQLite/PostgreSQL; versionar el esquema SQL.

**H-52 — 'Almacenamiento en IPFS' (M8) simulado** *(MEDIA; E)*
- **Detalle:** `uploadToIPFS` produce un CID construido como 'Qm' + 44 hex del sha256 (no es CIDv0 válido ni está subido; la URL `https://ipfs.io/ipfs/Qm...` devolverá 404) y no hay código de pinning a Pinata/web3.storage, pese a que el comentario lo promete y REGISTRO lista `PINATA_JWT`/`IPFS_KEY` como secretos. El resto de M8 (hash SHA-256 + firma ECDSA + tabla images) sí está implementado.
- **Evidencia:** `web/lib/ipfs.ts:30-51`; grep `PINATA` solo en comentario de `ipfs.ts:32`; `REGISTRO...:217`.
- **Recomendación:** implementar pinning real (Pinata/web3.storage) o eliminar la promesa de IPFS; usar librería oficial para CIDv0; marcar en la UI cuando la imagen solo tiene hash local.

**H-19 — Cuotas por nivel hardcodeadas, fail-open silencioso y contador asimétrico** *(MEDIA; A, D)*
- **Detalle:** los límites 1 (Inscrito) y 3 (Verificado) están hardcodeados en `_checkActiveTradeQuota` y no son configurables; el `catch{}` vacío desactiva silenciosamente la cuota si el registry revierte (fail-open); `completeOperation`/`metaCompleteOperation` chequean la cuota del completador (que solo refleja sus propias creaciones) sin incrementarla nunca; `activeTradesCount` solo cuenta creaciones, no participación → un usuario puede ser contraparte en un número ilimitado de operaciones activas. Los niveles no coinciden entre artefactos (enum Inscrito/Verificado/Certificado vs docs 'Iniciado/Común/Frecuente/Socio' vs 'nivel Frecuente' en Subscription).
- **Evidencia:** `sc/src/Escrow.sol:306-311,314,347,122-123`; `sc/src/UserRegistry.sol:16-20`; `sc/src/Subscription.sol:13`; `RepoTecnico/escrow-TrueKeate.md:29-33`.
- **Recomendación:** parametrizar cuotas por nivel (setters con eventos), política fail-closed (revert ante fallo del registry), fijar nivel 0 por defecto para no registrados y alinear el modelo de niveles entre contratos y documentación; definir la semántica exacta de 'operación activa' (creada vs participada) e implementarla consistentemente.

---

### (c) Requisitos no funcionales faltantes

**H-16 — DApp/relayer/rutas fijados a la red local Anvil (31337/127.0.0.1) sin multi-red configurable; stats truncados >500** *(ALTA; C, D, B)* ⚠ **en conflicto**
- **Conflicto:** el agente C lo califica CRÍTICA ('el producto no es desplegable fuera de desarrollo'), el agente D lo califica MEDIA (NFR de configuración). **Veredicto del sintetizador: ALTA** — impide el despliegue productivo (bloquea el negocio) pero no es una vulnerabilidad explotable por sí misma; su gravedad se agrava al combinarse con H-06 (clave del relayer por defecto pública) si alguien despliega 'tal cual' en una red pública.
- **Detalle:** el auto-conectado solo ocurre si `chainId === 31337n` y `connect()` fuerza `wallet_switchEthereumChain` a `0x7a69` o agrega la red 'Anvil Localhost' con RPC `http://127.0.0.1:8545`; el relayer y `/api/operation/[id]` usan el mismo default local. Además en `/api/stats`, `MAX_PAGES=5` × `PAGE_SIZE=100` limitan a 500 operaciones: si total > 500, los conteos se reportan incompletos **sin advertencia**.
- **Evidencia:** `web/lib/ethereum.tsx:77-80,145-179,166`; `web/app/api/relay/route.ts:17`; `web/app/api/operation/[id]/route.ts:7-8`; `web/app/api/stats/route.ts:16-17,39-47`; `web/lib/hooks.ts:455,468,577`.
- **Recomendación:** parametrizar por entorno (`NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`, direcciones por red) y validar la cadena contra la config; bloquear en producción los fallbacks locales y las claves de Anvil; en stats, computar conteos desde contadores del contrato o devolver flag `truncated`.

**H-18 — NFRs backend ausentes: rate limiting, CORS/headers, timeouts RPC, logging/auditoría, backups, 500s que filtran err.message** *(ALTA; B, D)*
- **Detalle:** no existe `middleware.ts` ni configuración en `next.config.ts`: sin rate limiting global (pese a endpoints públicos como relay e identity), sin cabeceras CORS/seguridad (CSP, HSTS, X-Frame-Options), sin timeouts en `JsonRpcProvider` ni `AbortController` en clientes, sin log estructurado ni registro de auditoría (aprobaciones KYC, campañas, 2FA), sin procedimiento de backup/restore para SQLite, y múltiples rutas devuelven `err.message` crudo en 500 (fuga de detalles internos).
- **Evidencia:** `web/next.config.ts:3-6`; ausencia de `web/middleware.*`; `web/app/api/items/route.js:23`, `.../users/[address]/route.js:45`, `.../meetups/route.js:21`, `.../notifications/route.js:19`, `.../campaigns/route.js:17`; `web/app/api/operation/[id]/route.ts:7-8`.
- **Recomendación:** middleware global (rate limiting por IP/wallet, cabeceras de seguridad/CORS según despliegue), timeouts y reintentos en proveedores RPC, logging estructurado + tabla `audit_log` (actor/acción/ts/hash), política de backups/restore para ambas BD y respuestas 500 genéricas sin internals.

**H-25 — NFRs de contratos ausentes: sin pausabilidad, sin upgradeabilidad, sin timelock** *(MEDIA; A)*
- **Detalle:** ningún contrato usa `Pausable` ni proxies: todos son `Ownable` con estado directo, sin camino de actualización ni emergencia. El owner único puede `addToken`/`setArbiter`, mintear BRLT ilimitado, retirar el fondo de suscripciones y nombrar/remover Socios sin timelock ni rendición de cuentas. `foundry.toml` es mínimo (sin perfiles de seguridad/verificación/gas). Los loops view O(n) (`Exchange.getOrdersByMaker`, `Escrow.getOperations`, `getRegisteredWalletsPaged`) pueden abusarse como gas sink.
- **Evidencia:** `sc/foundry.toml:1-14`; `sc/src/BRLT.sol:19-21`; `sc/src/Subscription.sol:73-78`; `sc/src/Exchange.sol:181-197`; `sc/src/Escrow.sol:468-481`.
- **Recomendación:** definir NFRs explícitos: pausa de emergencia (Pausable), decisión documentada de upgradeabilidad (proxies o immutables), timelock/multisig para funciones admin, límites de iteración y reportes de gas.

**H-28 — initSchema() ejecuta DDL completo en cada request** *(MEDIA; B)*
- **Detalle:** las 20 rutas llaman `await initSchema()` antes de operar: re-ejecuta `CREATE TABLE IF NOT EXISTS`, ~30 índices y ~20 `ensureColumn` (ALTER) por request; en SQLite cada ALTER fallido lanza y se traga la excepción genérica 'ALTER_FAILED'; en PostgreSQL usa DO blocks con `information_schema`, pero sigue siendo DDL por request (contención, latencia, ruido de errores).
- **Evidencia:** `web/app/api/items/route.js:12` (patrón idéntico en las demás rutas); `web/server/db.js:268-354,76-84,360-376`.
- **Recomendación:** mover la inicialización del esquema a un único punto de arranque (script de deploy / módulo singleton con promesa compartida) y usar migraciones versionadas.

**H-31 — Parámetros de paginación sin validar y LIKE sin escapar comodines** *(MEDIA; B)*
- **Detalle:** en `GET /api/items` y `GET /api/ratings`, `Number(limit)` con valor no numérico produce NaN que rompe el SQL (500 en vez de 400) y un `limit` negativo en SQLite se interpreta como 'sin límite'; el filtro `q` se concatena en `LIKE '%q%'` sin escapar `%`/`_` ('%%' devuelve todo el catálogo). El relayer tampoco valida tipos (`amountA='abc'` → `BigInt` lanza y devuelve el mensaje de ethers como 400).
- **Evidencia:** `web/app/api/items/route.js:18-19`; `web/app/api/ratings/route.js:18-19`; `web/server/lib.js:258-261`; `web/app/api/relay/route.ts:64-80`.
- **Recomendación:** validar limit/offset como enteros ≥0 con tope (400 si inválidos); escapar `%`/`_` en búsquedas; validar tipos y formatos en el relayer antes de construir la tx.

**H-33 — Endpoints de creación sin idempotencia** *(MEDIA; B)*
- **Detalle:** `createItem`, `createCampaign` y `createMeetup` generan un UUID nuevo (`newId()`) en cada POST; un reintento del cliente tras timeout/error de red duplica registros. Solo ratings (unique `operation_id+rater`) y vouches (`vouch_by+vouch_for`) están protegidos.
- **Evidencia:** `web/server/lib.js:202-227,459-476,385-398`; `web/server/db.js:155,176`.
- **Recomendación:** aceptar cabecera `Idempotency-Key` o deduplicar por hash del payload firmado (la firma ECDSA ya existente en items sirve como clave natural de idempotencia).

**H-43 — PWA offline incompleta y colores de tema inconsistentes** *(MEDIA; C)*
- **Detalle:** `sw.js` precachea solo ['/', '/manifest.webmanifest', '/icon.svg'] con cache-first: sin visitas previas no hay contenido offline ni fallback de navegación. Hay 3 valores de color distintos: manifest `#FAF8F5/#2D2A26`, viewport `themeColor #F8F9FA` y `--background #F8F9FA`; manifest usa `/icon.svg` genérico y fija `orientation: portrait-primary`.
- **Evidencia:** `web/public/sw.js:3,18-36`; `web/app/manifest.ts:11-13`; `web/app/layout.tsx:38`; `web/app/globals.css:4`.
- **Recomendación:** precachear el app-shell (build manifest de Next), añadir fallback offline de navegación y unificar colores/theme en un único origen.

**H-44 — Ausencia de internacionalización (i18n)** *(MEDIA; C)*
- **Detalle:** no hay framework i18n ni extracción de mensajes; `<html lang='es'>` fijo; las fechas usan `toLocaleDateString()`/`toLocaleString()` sin locale explícito → un navegador en inglés mezcla fechas en inglés con UI en español y varía el orden día/mes.
- **Evidencia:** `web/app/layout.tsx:47`; `web/app/(platform)/items/[id]/page.tsx:76`; `web/components/OperationCard.tsx:265-272`; `web/package.json:18-25`.
- **Recomendación:** definir RNF de i18n (es/en), centralizar strings y fijar locale explícito para fechas/monedas.

**H-45 — Brechas de accesibilidad (a11y)** *(MEDIA; C)*
- **Detalle:** numerosos textos en 8–10px (labels del stepper, badges, BottomNav) bajo el mínimo legible; botones icon-only sin `aria-label` (p. ej. cerrar de CreateOperationModal); sin skip-link ni focus visible consistente; no existen `loading.tsx`, `error.tsx` ni `not-found.tsx` a nivel app; algunos estados dependen solo de color/emoji.
- **Evidencia:** `web/components/BottomNav.tsx:76`; `web/app/globals.css:332`; `web/components/CreateOperationModal.tsx:106-113`; ausencia de loading/error/not-found en `web/app/**`.
- **Recomendación:** tamaños mínimos ≥12px, `aria-label` en controles icon-only, skip-link y focus-visible; crear `loading.tsx`/`error.tsx`/`not-found.tsx` con el DS 2.0.

**H-51 — CI/CD no operativo** *(MEDIA; E, F)*
- **Detalle:** el único workflow (`sc/.github/workflows/test.yml`) vive en un subdirectorio: GitHub Actions solo ejecuta workflows en `<raíz>/.github/workflows/`, por lo que este archivo no se dispara; el repo principal declarado es GitLab y no existe `.gitlab-ci.yml` en la raíz; el workflow no incluye job E2E (anvil+web+BD), ni cobertura, ni deploy. No hay gate automático contra regresiones.
- **Evidencia:** `sc/.github/workflows/test.yml:1-71`; ausencia de `.github/` y `.gitlab-ci.yml` en la raíz; `RepoTecnico/PROPUESTA_TRUEKEATE.md:27`; `RepoTecnico/PLAN_OPTIMIZACION_Y_CASOS.md:96`; `REGISTRO...:15`.
- **Recomendación:** mover el workflow a `.github/workflows/` de la raíz o crear `.gitlab-ci.yml` con stages (forge test + forge coverage; lint/typecheck/vitest con umbrales; job E2E con servicios levantados) y verificar en la plataforma que el pipeline se ejecuta.

**H-55 — Suites E2E no reproducibles** *(MEDIA; F)*
- **Detalle:** (a) `run-e2e.mjs` importa 'playwright' pero no está en `dependencies`/`devDependencies` de `web/package.json` → falla al arrancar con `ERR_MODULE_NOT_FOUND`; solo funciona en la máquina donde se instaló ad hoc. (b) `contracts-test.mjs` muta estado on-chain y depende de la BD SQLite persistente: 1ª ejecución 21/22 (D7 falla porque las operaciones del owner ya fueron valoradas), 2ª ejecución FATAL en D3 `Already a socio` → inservible para CI sin teardown completo.
- **Evidencia:** salida de ejecución `ERR_MODULE_NOT_FOUND 'playwright'`; `web/package.json:26-42`; `web/scripts/e2e/run-e2e.mjs`; `web/scripts/e2e/report-d.json:3-9`; `web/scripts/e2e/contracts-test.mjs:294-323,206-208`; `web/scripts/e2e/REPORTE.md:49-60`.
- **Recomendación:** declarar playwright + @playwright/test (npm script gestionado, `npx playwright install` documentado, job de CI); hacer la suite idempotente (cuentas frescas por run vía anvil fork/reset, BD temporal aislada, ratings des-duplicados sobre operaciones creadas en el propio run).

**H-56 — NFRs de proceso/operación ausentes: SLA, monitoreo, backups/DR, auditoría externa, bug bounty, sanciones/AML, límites por cuenta, respuesta a incidentes** *(BAJA; D, E)*
- **Detalle:** no hay documento con SLA (la auditoría interna pide 14 días para disputas), monitoreo/alertas ni DR (solo flags de backup de Cloud SQL sueltos en comandos del REGISTRO). El proyecto se declara 'Producción / Staging Ready' pero no existe auditoría de seguridad independiente de los contratos, programa de bug bounty, screening de sanciones (OFAC) ni verificación AML en el flujo KYC, límites por cuenta (montos máximos/volumen diario — solo existe la cuota concurrente on-chain) ni plan de respuesta a incidentes/rotación de claves.
- **Evidencia:** `RepoTecnico/REGISTRO...:4-5,152-158`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:11,103-105`; `sc/src/Escrow.sol:303-316`; `RepoTecnico/GCP_DEPLOY.md` (mojibake, CMD inexistente).
- **Recomendación:** redactar documento de NFRs (SLA/RPO/RTO, monitoreo con alertas, runbooks), contratar auditoría externa de `sc/src` (Escrow.sol y UserRegistry.sol primero) antes de mainnet, definir bug bounty, añadir screening de sanciones en onboarding, límites por cuenta (contrato + API) y asignar responsables de seguridad.

**H-59 — Landing 100% client-side sin streaming; sin métricas LCP/TTI ni umbrales de rendimiento** *(BAJA; C)*
- **Detalle:** `app/page.tsx` es `'use client'` completa sin Suspense/streaming y con `blur-3xl`/gradientes pesados; no hay mediciones ni objetivos de LCP (RNF de rendimiento ausente). `next/font` auto-hosted y `<Image priority>` mitigan parcialmente el LCP. *Necesita verificación:* métricas LCP/TTI reales (sin setup de Lighthouse).
- **Evidencia:** `web/app/page.tsx:1,34-210`; `web/app/layout.tsx:11-19`.
- **Recomendación:** medir LCP/TTI con Lighthouse y definir umbrales; convertir secciones de la landing a server components.

---

### (d) Stakeholders faltantes

**H-49 — Stakeholders del producto y del backend incompletos** *(MEDIA; B, E, F, D)*
- **Detalle:** el sistema implementa owner/admin, árbitro, socio, empresa, particular y relayer, pero faltan: **moderador/soporte** (no existe ninguna referencia a 'moderador' en `web/`: sin rutas, sin columna de roles, sin endpoints de moderación — banear, retirar artículos, resolver disputas; solo una página `/help` stub); **auditor externo** y **delegado de cumplimiento/DPO** (KYC self-issued sin marco legal RGPD/Habeas Data); **couriers/transportistas, peritos de calidad RWA y almacenes de depósito** (ya listados como requeridos por la auditoría previa); **proveedores externos de verificación SBT/KYC** (Binance BABT, WorldID se referencian en lib.js sin rol modelado); **operador del exchange** (Exchange.sol sin roles de admin de órdenes); **tesorería del relayer** (quién la financia). Además el árbitro no tiene tooling off-chain: las disputas solo existen on-chain (`onlyArbiter`), sin listado de disputas asignadas ni historial de resoluciones en la capa de datos/API.
- **Evidencia:** grep `moderador|moderator` en `web/` sin coincidencias; `sc/src/Escrow.sol:53-57,249-252`; `web/server/lib.js:716-739`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:86-97`; `docs/manuales/` (solo Árbitro/Empresa/Particular/Socio); `sc/src/Exchange.sol:10-66`.
- **Recomendación:** formalizar la matriz de stakeholders con responsabilidades y sistema de roles (on-chain o RBAC off-chain) que cubra soporte/moderación, auditoría, cumplimiento/privacidad, courier, perito, almacén y proveedores externos; vincular cada stakeholder a casos de uso y tests de aceptación; crear endpoints off-chain de disputas para árbitros (listar abiertas, historial, resolución con firma).

---

### (e) Otros

**H-01 — Disputa secuestrable por terceros: contraparte fantasma, robo de fondos sin depósito y DoS** *(CRÍTICA; A, D, E, F)*
- **Detalle:** `disputeOperation` no restringe `msg.sender` a user1/user2: cualquier dirección puede disputar una operación activa y, si `user2==address(0)`, queda registrada como user2 on-chain. `resolveDispute(favorUser1=false)` transfiere `amountA` de tokenA a ese user2 sin que haya depositado tokenB jamás. Además disputar congela la operación (status Disputed) e impide `completeOperation` y `refundAfterExpiry` hasta que el árbitro actúe, **sin plazo máximo de resolución** → vector de griefing/DoS sobre cualquier trueke y robo si el árbitro falla en contra del creador. `TruekeEscrow.disputeTrade` hereda el patrón y **además omite el chequeo de deadline** (a diferencia de `setInTransit`/`completeTrade`): una disputa post-expiración bloquea el refund para siempre. Los tests enshrinean el comportamiento (user2 disputa sin depositar y recibe fondos). Hallazgo del informe previo **sin corregir**; no existe ningún test del vector con tercero.
- **Evidencia:** `sc/src/Escrow.sol:406-419,413-415,422,431-438`; `sc/src/TruekeEscrow.sol:244-259,253-255,270-277,227-230`; `sc/test/Escrow.t.sol:268-280`; `sc/test/EscrowDemo.t.sol:110-121`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:39-41`.
- **Recomendación:** restringir `disputeOperation`/`disputeTrade` a `msg.sender == user1 || user2` registrado (intención firmada/registrada on-chain); validar deadline en `disputeTrade` y permitir refund tras expiry aunque esté Disputed; ventana máxima de resolución con timelock y árbitros múltiples/apelación; añadir test de revert de tercero.

**H-02 — Fuga de PII completa vía `GET /api/identity/[address]?requester=` sin autenticación** *(CRÍTICA; B, D, E, F)*
- **Detalle:** el endpoint toma `requester` del query string y NUNCA verifica que el solicitante controle esa wallet (sin firma ECDSA ni sesión). `getUserIdentityProfile` trata `isSelf = requester === target` y, en ese caso, devuelve email y teléfono DESCIFRADOS (AES-GCM), `document_hash`, `selfie_hash` y estado 2FA del objetivo. El camino 'isOwner' se concede comparando la dirección pública del owner on-chain: cualquiera que conozca esa dirección (pública por definición) puede usar `?requester=<owner>` y leer los datos privados de CUALQUIER usuario. El test e2e C3 solo cubre el caso tercero ≠ target ≠ owner, no estos dos vectores. Hallazgo previo (que pedía SIWE) sin corregir — solo se corrigió el flag `isOwner`, no la identificación del llamador.
- **Evidencia:** `web/app/api/identity/[address]/route.js:29-40`; `web/server/lib.js:751-799` (784-785 email/phone, 791-792 hashes); `web/scripts/e2e/run-e2e.mjs:423-428`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:57-59`.
- **Recomendación:** exigir prueba de control de la wallet (SIWE o firma EIP-191/EIP-712 de un challenge reciente sobre address+timestamp, verificada con `ethers.verifyMessage`) antes de devolver datos privados o conceder 'isOwner'; tratar `requester` como sugerencia, nunca como identidad; añadir tests de seguridad para requester=víctima y requester=owner.

**H-03 — KYC simulado: `PUT /api/users/[address]/kyc` público auto-aprueba 'certificado'; `verify-sbt` no consulta el contrato** *(CRÍTICA; B, D, E, F)*
- **Detalle:** `submitKyc()` fija `kyc_status='verified'` e `identification_level='certificado'` (nivel máximo) directamente en BD sin firma ni rol; la ruta recibe el address objetivo en la URL y un body opcional. La propia página admin usa este mismo endpoint con body vacío para 'aprobar' KYC, por lo que un atacante anónimo puede repetir esa llamada para cualquier dirección (la insignia habilita emitir avales: `createVouch` exige `kyc_status='verified'`). `selfie_hash`/`document_hash` no se validan (cualquier string sirve). Adicionalmente `verifyThirdPartySBT` valida solo una firma OPCIONAL del usuario sobre un string local y NUNCA consulta el contrato SBT on-chain (sin `balanceOf`/`ownerOf`): cualquiera puede quedar 'certificado' (Nivel 3, cuota ilimitada) con cualquier contrato y 'Binance BABT'. El comentario 'En producción requiere revisión' no tiene implementación.
- **Evidencia:** `web/app/api/users/[address]/kyc/route.js:11-29`; `web/server/lib.js:630-638,717-748,434-436`; `web/app/(platform)/admin/identity/page.tsx:139-145`; `web/app/api/identity/verify-sbt/route.js:8-22`.
- **Recomendación:** exigir firma ECDSA del address sobre payload canónico y verificar firmante == address; restringir la aprobación KYC de terceros a un rol verificado (owner/identityAdmin on-chain); separar 'kyc_submitted' de 'kyc_verified'; verificar el SBT on-chain contra el contrato emisor (o proveedor autorizado) con firma obligatoria; nunca auto-otorgar 'certificado' desde una ruta sin autorización.

**H-04 — OTP y 2FA ficticios: '123456' o cualquier código de 6 dígitos aprueba; sin TOTP real** *(CRÍTICA; B, C, D, E, F)*
- **Detalle:** `verifyContactChannels()` acepta `emailCode`/`phoneCode` vacíos, '123456' o cualquier string de 6 caracteres (no se emite ni valida ningún OTP real contra el canal); `confirm2FA()` acepta cualquier secuencia de 6 dígitos sin validar el TOTP contra `two_factor_secret` (el secreto se genera y devuelve pero nunca se usa). El frontend envía '123456' por defecto si el campo queda vacío y muestra 'Correo y teléfono verificados con éxito ✓' / '2FA activado… Nivel Verificado alcanzado ✓'. Con esto cualquiera puede marcar `email_verified`/`phone_verified`/`two_factor_enabled` de cualquier address (además sin firma) y ascender a Nivel 2 'verificado' (que habilita avales) y Nivel 3, degradando toda la confianza del sistema de identidad. Hallazgo previo sin corregir.
- **Evidencia:** `web/server/lib.js:652-660,694-714,680-691,436`; `web/app/(platform)/identity/page.tsx:181-187,235`; `web/app/api/identity/verify-sbt/route.js`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:66-68`.
- **Recomendación:** eliminar los fallbacks '123456' del cliente y servidor; emitir OTP reales por canal (correo/SMS) con expiración y límite de intentos; validar TOTP contra el secreto almacenado (otplib) con ventana de tiempo; exigir firma de la wallet para mutar el estado de verificación; bloquear '123456' en producción vía `NODE_ENV`.

**H-05 — PII en claro on-chain en UserRegistry (storage y eventos)** *(CRÍTICA; A, D, E, F)*
- **Detalle:** `register()` almacena email, teléfono y dirección física en claro en el struct `UserProfile` y `UserRegistered` los emite íntegros en el evento: quedan públicos e inmutables para siempre en la cadena (la especificación exige identidad real confidencial, solo hashes). Además los mappings `emailHashToWallet`/`phoneHashToWallet` son reversibles por fuerza bruta (baja entropía). El 'cifrado' AES-256-GCM solo existe en la capa de datos, y el indexador vuelve a cifrar al insertar — lo que evidencia que el contrato es la fuga. Los scripts de despliegue registran correos/teléfonos de ejemplo reales con este flujo. Hallazgo previo sin corregir; conflicto RGPD/Habeas Data.
- **Evidencia:** `sc/src/UserRegistry.sol:22-36,95-118,126-138`; `RepoTecnico/escrow-TrueKeate.md:41-42`; `web/scripts/indexer.mjs:98-101`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:100-102`; `docs/pruebas/BATERIA_DE_PRUEBAS_SISTEMA.md:79`.
- **Recomendación:** guardar on-chain solo hashes con salt (`emailHash`/`phoneHash` ya existen) y coordenadas aproximadas en lugar de dirección física; no emitir PII en eventos; mantener datos reales cifrados AES-256-GCM en PostgreSQL; normalizar username/email (case-insensitive).

**H-06 — Secretos hardcodeados/commiteados en el repositorio** *(CRÍTICA; B, D, E, F)* ⚠ **en conflicto**
- **Conflicto:** los agentes B y E lo califican CRÍTICA; los agentes D y F lo desglosan en ALTAS (KYC_SECRET fallback, credencial PostgreSQL, IDs GCP). **Veredicto del sintetizador: CRÍTICA consolidada** — la combinación (credencial de BD real + clave privada del relayer pública + clave de cifrado PII conocida + espejo GitHub público) hace trivial el compromiso total si se despliega sin variables de entorno, y parte de ello ya está expuesto en un repo público.
- **Detalle:** la contraseña PostgreSQL 'KeLuDa.2324' (usuario SUPERUSER 'anlucorporations') está en 4 scripts (`create-truekeate-db.mjs`, `setup-pg-user.mjs`, `test-local-db.mjs`, `init-pg.js`) y en `deploy-local.sh:221-222`/`deploy-local.ps1:228` (archivos trackeados por git); el relayer usa como default la clave PRIVADA pública de la cuenta #4 de Anvil (`0x47e1…34926a`) si `RELAYER_PRIVATE_KEY` no está definida; `kycKey()` cae a `'truekeate-dev-secret-0123456789abcdef'` (clave AES-256-GCM de PII) si falta `KYC_SECRET`, y `deploy-local.ps1:229` la fija en `web/.env.local`; `REGISTRO...` versiona el ID de cuenta de facturación GCP real (013B00-B9A67C-014A43) y el email admin, y declara un **espejo GitHub público**. *Necesita verificación:* si la credencial PostgreSQL corresponde a una BD de staging/producción.
- **Evidencia:** `web/scripts/create-truekeate-db.mjs:10,27`; `web/scripts/setup-pg-user.mjs:6,13,17,26`; `web/scripts/test-local-db.mjs:5,16`; `web/scripts/init-pg.js:5,21`; `deploy-local.sh:221-222`; `deploy-local.ps1:228-229`; `web/app/api/relay/route.ts:17-19`; `web/server/lib.js:596-600`; `REGISTRO...:15-16,93-96,219-221`; `.gitignore:11-13`.
- **Recomendación:** eliminar toda credencial/clave/secret del código y scripts versionados (rotar la contraseña si tiene uso no local; `git filter-repo`/BFG para purgar el historial); inyectar solo vía variables de entorno/Secret Manager (GCP); **fallar en seco (throw)** en producción si faltan `KYC_SECRET`/`RELAYER_PRIVATE_KEY` (guard por NODE_ENV); eliminar IDs de facturación/emails de archivos versionados; añadir escaneo CI (gitleaks/trufflehog).

**H-07 … H-59** *(resto — ver tabla § 4 y detalles en (a)–(d) anteriores)*

**H-10 — Usuarios no registrados pueden operar en el escrow** *(ALTA; A, E)*
- **Detalle:** Escrow no tiene gate de registro (a diferencia de `Exchange.onlyRegisteredUser`): con userRegistry seteado, un wallet no registrado devuelve `identificationLevel=0` por default del mapping y se le aplica la cuota de Inscrito (máx 1 operación), con lo cual SÍ puede crear y completar truekes, contradiciendo el requisito 'solo los usuarios inscritos y correctamente verificados podrán hacer acuerdos de intercambios'. TruekeEscrow no tiene ningún control de identidad. La puerta del frontend (AccessGate) es solo UX y no protege llamadas directas al contrato.
- **Evidencia:** `sc/src/Escrow.sol:303-316,322-336`; `sc/src/UserRegistry.sol:218-220`; `sc/src/Exchange.sol:52-55,102`; `web/components/AccessGate.tsx:12-16`; `RepoTecnico/escrow-TrueKeate.md:27`.
- **Recomendación:** añadir `onlyRegisteredUser`/validación on-chain de registro y nivel en `createOperation`/`metaCreateOperation` (o cuota 0/bloqueo explícito para no registrados) alineando Escrow con Exchange; documentar la política de niveles.

**H-11 — Relayer abierto: sin auth, rate-limit, allowlist, fee, staticCall ni timeout; drenaje de gas; errores crudos** *(ALTA; A, B, D, E, F)* ⚠ **en conflicto**
- **Conflicto:** el agente A lo califica MEDIA; B, D, E y F lo califican ALTA. **Veredicto: ALTA** — además de la falta de límites (ya recomendada y no implementada: rate limiting por IP/Wallet y alerta si saldo < 0.05 ETH), cada reintento de una intención válida o fallida quema gas del relayer, y no hay simulación previa ni idempotencia.
- **Detalle:** `POST /api/relay` ejecuta cualquier intención EIP-712 firmada pagando el gas del relayer sin autenticación, rate-limit, whitelist de tokens, tope de montos, `eth_call`/staticCall previo, monitorización de saldo ni timeout en `tx.wait()`. Como la intención es single-use (nonce), un tercero que obtenga la firma (front-run del propio relay o phishing) puede ejecutarla primero y quemar el gas del relayer o dejar la transacción del usuario fallida. Además responde con `e.shortMessage`/`e.message` crudos (fuga de detalles RPC/contrato). La regla 'los usuarios Empresas deberán pagar el gas' no se implementa (no distingue empresas con suscripción activa).
- **Evidencia:** `web/app/api/relay/route.ts:17-19,52-107,102-106`; `sc/src/Escrow.sol:155-163`; `web/lib/relay.ts:121,158`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:60-62`; `RepoTecnico/escrow-TrueKeate.md:37-38`.
- **Recomendación:** middleware de rate limiting por IP/wallet, allowlist de tokens/direcciones, staticCall + gas estimado antes de firmar, timeouts y reintentos con backoff, monitorización/alertas de saldo; mapear errores a mensajes genéricos; definir on-chain o en la API que las empresas (Subscription.isActive) paguen su propio gas.

**H-12 — Indexador: sin backfill, notificaciones duplicadas, sin cursor persistente, UsernameUpdated no indexado** *(ALTA; B, E)*
- **Detalle:** el backfill histórico solo cubre Escrow y UserRegistry; Governance (SocioSet, SocioApplication*), SBTRegistry, TruekeSBT y Subscription solo tienen listeners en vivo → si el indexador cae, votaciones, SBTs, suscripciones y roles se desincronizan silenciosamente. El backfill re-ejecuta `createNotification()` sin deduplicación cada arranque (`START_BLOCK=0`) acumulando notificaciones duplicadas, y no persiste `last_synced_block`. Nunca se indexa el evento `UsernameUpdated` (el contrato lo emite) dejando usernames obsoletos.
- **Evidencia:** `web/scripts/indexer.mjs:490-578,347-357,71-82,58,279-315,470-487`; `sc/src/UserRegistry.sol:61`.
- **Recomendación:** generalizar `backfillLogs()` a todos los contratos con checkpoint persistente por contrato (`indexer_state`); deduplicar notificaciones (unique ref + type + user) o regenerarlas desde el estado; registrar listener de `UsernameUpdated` y sincronizar usuarios en cada evento.

**H-14 — Endpoints de escritura sensibles sin firma de posesión** *(ALTA; B)*
- **Detalle:** `POST /api/ratings` acepta un `rater` arbitrario del body (`validateRating` solo comprueba que sea parte de una operación completada, no que controle la wallet) → valorar como otra persona (inflar/derrumbar reputación); `POST /api/vouches` solo exige `kyc_status` del `vouch_by` (auto-concedible vía H-03); `POST /api/operations/[id]/accept` permite a cualquier dirección autoproclamarse user2 de una operación activa; `POST /api/meetups/[id]/open` permite abrir con la address de la contraparte y bloquear la ventana M16 de 10 min (`opened_by` impide reaperturas).
- **Evidencia:** `web/app/api/ratings/route.js:31-58`; `web/server/lib.js:103-120,429-448`; `web/app/api/vouches/route.js:23-34`; `web/app/api/operations/[id]/accept/route.js:10-25`; `web/server/lib.js:336-345`; `web/app/api/meetups/[id]/open/route.js:9-20`; `web/server/lib.js:534-582`.
- **Recomendación:** añadir firma ECDSA del actor (rater/vouchBy/requester/address) sobre un payload canónico con nonce/timestamp en TODOS los endpoints de escritura sensibles y verificar la recuperación de la firma contra el address declarado (patrón ya usado en `POST /api/items`).

**H-15 — Reglas de negocio centrales de la especificación no implementadas (M4/M12/M2) y subastas sin implementar** *(ALTA; E, F)*
- **Detalle:** la spec define reglas por nivel (Iniciado: 3% del total de transacciones del rubro, máx 5 rubros; Común: 20 rubros/50 artículos, penalización si inactividad >5% del mercado; Frecuente: campañas/delivery/BRLT) y M12 exige 5 avales de verificados. El código implementa otra cosa: `computeTrustLevel` usa umbrales genéricos (3.5/3 y 4.2/25), Escrow limita operaciones activas por nivel (1/3/ilimitado) y no existe ningún límite de artículos/rubros ni conteo de avales ('rubro' no aparece en el código web). El requisito de 'subastas' (empresas propician subastas de artículos buscados) no tiene contrato, endpoint, UI ni tests (grep 'subasta|auction' solo encuentra la línea de la spec), igual que el 'encargo' para particulares.
- **Evidencia:** `RepoTecnico/escrow-TrueKeate.md:5,29-32`; `RepoTecnico/PROPUESTA_TRUEKEATE.md:70-77,142-145`; `web/server/lib.js:13-16,35-45,428-448`; `web/app/api/items/route.js:27-51`; `sc/src/Escrow.sol:303-316`.
- **Recomendación:** definir una única tabla de reglas por nivel y un módulo de cumplimiento que valide rubros, límites de artículos, cuota de operaciones y avales (count≥5) antes de crear operaciones/publicar items; decidir formalmente si subastas/encargos están en alcance (épica completa) o marcarlos 'fuera de alcance v1' en la spec; unificar las copias duplicadas de la spec.

**H-17 — BRLT sin ERC20Permit: meta-transacciones gasless con el token nativo revierten** *(ALTA; D, E, F)* ⚠ **en conflicto**
- **Conflicto:** el agente D lo califica MEDIA; E y F lo califican ALTA (F lo confirma por ejecución: el fallo aparece en runtime y solo `MockERC20` tiene permit, por lo que las pruebas nunca lo detectan). **Veredicto: ALTA** — rompe el flujo gasless prometido con la moneda con la que las empresas pagan suscripciones y se liquidan truekes del nivel Frecuente.
- **Detalle:** `metaCreateOperation`/`metaCompleteOperation` aplican `IERC20Permit(token).permit(...)`; BRLT hereda solo ERC20+Ownable sin `permit` → cualquier operación gasless con BRLT revierte. `addToken` acepta cualquier ERC20 con `symbol()` y no valida el soporte de permit, por lo que el fallo aparece en runtime. Hallazgo previo sin corregir.
- **Evidencia:** `sc/src/BRLT.sol:15-27`; `sc/src/Escrow.sol:6,166-177,204,258-280`; `web/lib/relay.ts:85-96`; `RepoTecnico/escrow-TrueKeate.md:32`; `docs/INFORME_AUDITORIA_Y_OPTIMIZACION.md:42-44`.
- **Recomendación:** hacer que BRLT herede `ERC20Permit` (OpenZeppelin) o que Escrow detecte soporte de permit y use `approve` tradicional en su defecto; validar permit en `addToken`; añadir test metaCreate/metaComplete con BRLT.

**H-21 — autoBurnService aplicado a ambas patas del trueke con fallback silencioso a transferencia** *(MEDIA; A)*
- **Detalle:** `completeTrade` pasa `autoBurnService` a las dos liquidaciones: si el activo que RECIBE una parte también es un voucher, se quema en lugar de entregarse. Además `_transferOutAsset` captura el revert de `consumeAndBurn` y cae silenciosamente a una transferencia normal, rompiendo la garantía de 'quema como prueba de consumo' que anuncia la documentación.
- **Evidencia:** `sc/src/TruekeEscrow.sol:199-200,301-304`; `sc/src/TruekeService.sol:17-19`.
- **Recomendación:** aplicar quema solo a la pata del proveedor de servicios y revertir si `consumeAndBurn` falla (o documentar explícitamente el fallback).

**H-22 — Suscripción sin cobro automático, withdraw total y doble concepto de 'empresa'** *(MEDIA; A)*
- **Detalle:** el requisito M9 pide cobros mensuales automáticos sin que la empresa firme cada mes; `subscribe()` es manual y `paidUntil` solo se extiende al llamarlo (sin pull/push). `withdraw()` drena el saldo COMPLETO del fondo común en cualquier momento, dejando `paidUntil` vigente sin respaldo real de fondos. `businessFlag` (seteado por owner) es independiente de `isActive` (basado en pago) y ningún contrato consume ninguno de los dos: los flujos de empresa dependen solo del flag manual.
- **Evidencia:** `sc/src/Subscription.sol:24,48-65,68-70,73-78`; `RepoTecnico/escrow-TrueKeate.md:39`.
- **Recomendación:** implementar cobro automático (pull con allowance o keeper), contabilidad por periodo (no retirar meses no devengados) e integrar `isActive`/`businessFlag` en los flujos de empresa reales.

**H-23 — Gobernanza: admisión de Socio sin quorum, ventanas fijas, solicitudes múltiples** *(MEDIA; A)*
- **Detalle:** `resolveSocioApplication` aprueba con mayoría simple sin quorum (`passed = yes > no`: con 0 votos en contra aprueba con un solo voto a favor), mientras `executeProposal` exige yes>no Y quorum mínimo (minQuorum=2). Las ventanas son constantes (3 días sanciones, 5 días aplicaciones) no configurables por propuesta. Un candidato puede presentar múltiples solicitudes simultáneas (cada una con depósito) que se resuelven independientemente, pudiendo aprobarse varias y transferir varios depósitos a tesorería.
- **Evidencia:** `sc/src/Governance.sol:53-55,103-132,161,222`.
- **Recomendación:** quorum uniforme y configurable para ambos tipos de votación, ventana por propuesta y prevención de aplicaciones duplicadas pendientes.

**H-24 — Eventos de auditoría incompletos** *(MEDIA; A)*
- **Detalle:** `TruekeService.mintMore` no emite ningún evento (el indexador no puede contabilizar la oferta adicional de vouchers); `TruekeEscrow.refundAfterExpiry` emite `TradeCancelled`, idéntico a `cancelTrade`, sin distinguir el motivo (expiración vs cancelación voluntaria); el indexador solo procesa eventos del Escrow legacy y SBT/RWA/Service, no TruekeEscrow ni Governance/Subscription.
- **Evidencia:** `sc/src/TruekeService.sol:115-123`; `sc/src/TruekeEscrow.sol:239`; `web/scripts/indexer.mjs:341-364,536-541`.
- **Recomendación:** emitir eventos para `mintMore` y para refunds con tipo de cierre; ampliar el indexador a los contratos canónicos y documentar su cobertura.

**H-26 — Cobertura de pruebas insuficiente: flujos críticos sin tests, sin métricas/umbrales de cobertura, fuzz solo en Escrow** *(MEDIA; A, F)*
- **Detalle:** `TruekeMultiAsset.t.sol` solo cubre el happy path de TruekeEscrow (sin cancelTrade, refundAfterExpiry, disputeTrade, resolveDispute favorUser2, quema vía escrow, setInTransit por user2); no hay tests de disputa por terceros ni de arbitraje favorUser2 sin depósito; Exchange carece de tests de removeToken/expiración/fill tras deslistado y de `getOrdersByMaker`; Governance no cubre empates en aplicaciones ni votación fuera de ventana; Subscription no cubre renovación tras expiración ni withdraw vacío; SBTRegistry no cubre claim duplicado/proveedor inactivo; fuzz/invariantes solo existen para el Escrow legacy. Además vitest no configura coverage ni umbrales, el CI no ejecuta `forge coverage`, y la suite vitest es lenta (65.47 s; jsdom 279.60 s; setup 51.10 s), un NFR de rendimiento que empeorará en CI.
- **Evidencia:** `sc/test/TruekeMultiAsset.t.sol:166-220`; `sc/test/Exchange.t.sol:44-118`; `sc/test/EscrowInvariants.t.sol:20-294`; `sc/test/EscrowMeta.t.sol:159-217`; `web/vitest.config.ts:12-17`; `web/package.json:13`; `sc/.github/workflows/test.yml:37-40`.
- **Recomendación:** añadir tests unitarios, fuzz e invariantes para disputa por terceros (revert), expiración, quema, Exchange, Governance, Subscription y TruekeEscrow; cubrir metaCompleteOperation en E2E; configurar `@vitest/coverage-v8` y `forge coverage` con umbrales (p. ej. líneas ≥80%, ramas ≥70%); usar environment 'happy-dom'/node para tests no-DOM y agrupar archivos para acelerar.

**H-27 — Validación de tokens inconsistente entre venues** *(MEDIA; A, D)*
- **Detalle:** `Escrow.addToken` valida `extcodesize` + `symbol()` pero asume EIP-2612 (permit) para meta-txs sin validar su soporte, y no protege contra tokens fee-on-transfer/rebasing (el contrato recibe menos de `amountA` o el saldo en custodia cambia, rompiendo la contabilidad en `completeOperation`); `Exchange.addToken` no valida nada (acepta cualquier dirección); TruekeEscrow no tiene allowlist; los pragmas se mezclan (^0.8.13 vs ^0.8.20) y `MockERC20` tiene mint público (solo de prueba, pero usable en entornos compartidos).
- **Evidencia:** `sc/src/Escrow.sol:258-280,333,349-350,370-371`; `sc/src/Exchange.sol:68-74`; `sc/src/MockERC20.sol:21-23`; `sc/src/TruekeEscrow.sol:115-120`.
- **Recomendación:** validación uniforme (decimals/transfer/permit con try/catch), verificación de balance tras `transferFrom`, whitelist manual de tokens auditados con exclusión de fee-on-transfer/rebasing, allowlist consistente, pragmas unificados y mint restringido fuera de entornos de prueba.

**H-32 — Meetups: coordenadas/ubicación expuestas sin verificar parte; notificaciones sin paginación ni borrado** *(MEDIA; B)*
- **Detalle:** `listMeetups` devuelve `lat/lng/place_name` de todos los encuentros de una operación sin comprobar que el llamador sea parte (la operación es pública on-chain, pero la ubicación física de encuentro es dato sensible de privacidad). Las notificaciones se limitan a 30 (LIMIT 30 fijo) sin paginación, y solo existe marcar-todas-como-leídas (sin marcar una ni eliminar).
- **Evidencia:** `web/app/api/meetups/route.js:10-19`; `web/server/lib.js:412-414,509-516`; `web/app/api/notifications/route.js:23-32`.
- **Recomendación:** verificar con firma que el llamador sea user1/user2 antes de devolver meetups de una operación; añadir paginación a notifications y operaciones de leer/eliminar individuales.

**H-35 — user2 acordado off-chain (BD) sin vínculo on-chain: cualquiera puede completar la operación primero** *(MEDIA; D)*
- **Detalle:** `acceptOperation` registra a la contraparte en la BD y la ventana de encuentro (M7/M16) depende de ese user2, pero on-chain `completeOperation`/`metaCompleteOperation` solo exigen `user1 != msg.sender`: CUALQUIER dirección puede completar la operación antes que el user2 acordado (race/MEV), recibiendo `amountA` y dejando al contraparte legítimo sin operación. La identidad on-chain de la contraparte solo se fija al completar, no al aceptar.
- **Evidencia:** `web/server/lib.js:336-345`; `sc/src/Escrow.sol:181-217,194,340-361,344`.
- **Recomendación:** vincular on-chain la aceptación (intent EIP-712 'accept' firmado que fije user2, o registro de compromiso) y restringir complete a user2 vinculado; o documentar explícitamente el modelo 'first-come-first-served' y desactivar la promesa de contraparte acordada en la UI.

**H-37 — Dead code: componentes huérfanos, ayuda muerta, assets boilerplate** *(MEDIA; C)*
- **Detalle:** ninguna página/layout importa `ExchangePlatform`, `OrderBook`, `FloatingToolDrawer`, `UserRegistrationModal` ni `LandingPage` (solo se referencian entre sí); `CameraCaptureModal`/`BottomSheet`/`ShareTradeButton` solo aparecen en tests; `RegisterModal.tsx` es solo un contexto que hace `router.push('/register')`; `/help` es un stub de 10 líneas que ignora `help/data.ts` (481 líneas, contenido sin importar); `LandingPage` duplica la landing real inline de `app/page.tsx`; `web/public` conserva `file.svg`, `globe.svg`, `next.svg`, `vercel.svg` y `window.svg` sin referencias, y `logo.jpg` duplica `/images/truekeate-logo.jpg`.
- **Evidencia:** `web/components/ExchangePlatform.tsx:11`; `OrderBook.tsx:213`; `FloatingToolDrawer.tsx:34`; `UserRegistrationModal.tsx:8`; `LandingPage.tsx:6`; `RegisterModal.tsx:16-27`; `web/app/help/page.tsx:1-10` vs `web/app/help/data.ts:31-40`.
- **Recomendación:** eliminar o reincorporar los huérfanos; elegir una fuente única de la landing; montar `/help` con HELP_GUIDES; renombrar/eliminar `RegisterModal`; eliminar assets sin uso.

**H-38 — Flujo catálogo → trueque roto** *(MEDIA; C)*
- **Detalle:** `AssetCard` muestra el CTA 'Proponer Trueke Atómico' enlazando a `/items/[id]`, pero la página de detalle es de solo lectura: sin contacto, oferta ni creación de operación (`CreateOperationModal` solo existe en `/operations`). El visitante no puede transitar 'encontrar activo → proponer intercambio'.
- **Evidencia:** `web/components/AssetCard.tsx:126-132`; `web/app/(platform)/items/[id]/page.tsx:58-150`; `web/app/(platform)/operations/page.tsx:126-131,212-219`.
- **Recomendación:** añadir en el detalle del ítem un CTA real (abrir `CreateOperationModal` pre-cargado con el propietario) o renombrar el botón de AssetCard a 'Ver Detalle'.

**H-39 — Datos ficticios presentados como reales: mocks en Empresa/Tesorería y prefills falsos en registro/SBT** *(MEDIA; C)*
- **Detalle:** Finanzas Comerciales (ventas con fechas 2026, '$970.00', membresía '12 Meses'), Inventario (sucursal y UTM hardcoded) y Tesorería (logs con fechas 2026) son arreglos `useState` estáticos: sin API ni blockchain, sin carga/error y desaparecen al refrescar. El registro precarga `lat/lng = 10.4806/-66.1036` (Barlovento) para todos, el fallback `register()` en hooks genera email '@truekeate.com', teléfono '+584120000000' y dirección 'Barlovento…' automáticamente, y la certificación SBT usa dirección `0x2B09…472C` comentada 'Mock / Mainnet BABT' y `tokenId '1'` fijos.
- **Evidencia:** `web/app/(platform)/company/finances/page.tsx:7-35,66-90`; `.../company/inventory/page.tsx:18-29,44-47`; `.../governance/treasury/page.tsx:7-44,70-99`; `web/app/register/page.tsx:23-26`; `web/lib/hooks.ts:501-512`; `web/app/(platform)/identity/page.tsx:255-256,266`.
- **Recomendación:** conectar a `/api` y on-chain o marcar explícitamente 'demo' con estados de carga/error/vacío y fuente documentada; quitar prefills de ubicación (GPS obligatorio), eliminar el modo `register(string)` ficticio y parametrizar el proveedor SBT con verificación on-chain real; separar config dev/prod.

**H-40 — Estados de carga/error/vacío faltantes o engañosos** *(MEDIA; C)*
- **Detalle:** operations muestra 'No hay operaciones' mientras carga y traga errores de red (warn + []); campaigns muestra 'No hay campañas todavía' durante el fetch; balances solo hace `console.error` y confunde 'sin tokens autorizados' con 'sin saldo'; items/[id] usa texto plano 'Cargando artículo…' inconsistente con el skeleton de /items; dashboard no distingue carga/error de reputación y cuota.
- **Evidencia:** `web/app/(platform)/operations/page.tsx:36-39,164-189`; `.../campaigns/page.tsx:39-46,153-155`; `.../balances/page.tsx:34-41,114-137`; `.../items/[id]/page.tsx:48-54`; `web/lib/hooks.ts:99,112`.
- **Recomendación:** definir política de estados por página (loading skeleton / error con reintento / vacío con CTA) y propagar errores de hooks a la UI.

**H-41 — Navegación incompleta: empresa/socio/admin-identity inalcanzables** *(MEDIA; C)*
- **Detalle:** el Header no incluye Suites de Empresa ni Gobernanza ni `/admin/identity`; el enlace Admin apunta solo a `/add-token`; `/admin/identity` no tiene enlaces entrantes (Header, BottomNav ni UserMenu). 'Ayuda' solo aparece para invitados; BottomNav muestra 'Socios' a todos (incluso no socios) y no hay acceso móvil a Empresa.
- **Evidencia:** `web/components/Header.tsx:20-36`; `web/components/UserMenu.tsx:501-519`; `web/components/BottomNav.tsx:16-59,42-43`; `web/app/(platform)/admin/identity/page.tsx:77-321`.
- **Recomendación:** agregar rutas de Empresa, Gobernanza y Admin-Identidad al Header/UserMenu según rol; mantener Ayuda accesible autenticado; condicionar 'Socios' de BottomNav al rol.

**H-42 — Placeholder '—' en 'Intercambios completados' del detalle de ítem** *(MEDIA; C)*
- **Detalle:** 'Intercambios completados' muestra un guion fijo con el comentario `{/* rep. total como proxy */}` en producción; además la página conserva estilo legado (dark:*, azul).
- **Evidencia:** `web/app/(platform)/items/[id]/page.tsx:132,42,50,59,65`.
- **Recomendación:** implementar la métrica (getReputation/completedTradesCount o capa de datos) o eliminar la tarjeta; migrar la página al DS 2.0.

**H-58 — Mensajes de error crudos sin traducir en frontend; logs en inglés** *(BAJA; C)*
- **Detalle:** `getFriendlyError` devuelve el mensaje crudo de ethers (shortMessage/message en inglés) si el revert no está en `REVERT_TRANSLATIONS`; los `console.warn`/`error` de hooks están en inglés.
- **Evidencia:** `web/lib/escrow.ts:131-137`; `web/lib/hooks.ts:99,112,893`.
- **Recomendación:** fallback genérico en español y ampliar `REVERT_TRANSLATIONS` con los mensajes nuevos del contrato; unificar logs.

---

## 6. Plan de acción priorizado

> Responsables sugeridos: **SC** = lead de smart contracts; **BE** = backend/API; **FE** = frontend/UX; **QA** = QA/DevOps; **COM** = compliance/DPO; **OWN** = owner del producto. Esfuerzo: **S** (≤1 día), **M** (1–2 semanas), **L** (mes o más). Los Quick wins se pueden ejecutar en paralelo.

### Quick wins (S) — esta semana

| ID(s) | Acción | Responsable | Esfuerzo |
|---|---|---|---|
| H-04, H-03 | Eliminar fallbacks '123456'/código vacío del cliente y servidor; bloquear en producción | BE, FE | S |
| H-06 | Fallar en seco (throw) en producción si faltan `KYC_SECRET`/`RELAYER_PRIVATE_KEY`; eliminar credenciales de scripts; rotar contraseña PostgreSQL | OWN, BE | S |
| H-01 | Restringir `disputeOperation`/`disputeTrade` a partes + test de revert del tercero; validar deadline en `disputeTrade` | SC | S |
| H-11 | Rate limiting básico (IP/wallet) en `/api/relay`; error genérico; monitorizar saldo | BE | S |
| H-02 | Verificación mínima de firma (personal_sign de nonce) en `/api/identity/[address]` antes de devolver PII | BE | S |
| H-53, H-54 | Corregir claves de la cuenta #4 en docs; centralizar conteos de tests reales (86/59) | OWN, QA | S |
| H-39 | Marcar las páginas de Empresa/Tesorería como 'demo' y quitar prefills falsos de registro/SBT | FE | S |
| H-46, H-37 | Unificar marca 'TrueKeate'; eliminar assets/componentes huérfanos evidentes | FE | S |
| H-05 | Dejar de emitir PII en `UserRegistered` (solo hashes) | SC | S |

### Mejoras (M) — próximas 2–4 semanas

| ID(s) | Acción | Responsable | Esfuerzo |
|---|---|---|---|
| H-02, H-14 | SIWE/ECDSA con nonce en `/api/identity` y en todos los endpoints de escritura sensibles (ratings, vouches, accept, meetups/open, refresh) | BE | M |
| H-03, H-04 | Flujo KYC real: 'submitted'→'verified' con revisión y evidencias; OTP por canal con expiración; TOTP (otplib) contra el secreto | BE, COM | M |
| H-13 | Escalada de identidad vía `identityAdmin` on-chain; BD como caché de lectura | BE, SC | M |
| H-08, H-10 | Enforcement de sanciones y registro en contratos (Escrow/Exchange) + tests; gate on-chain de registro | SC | M |
| H-07 | Decidir contrato canónico (desplegar TruekeEscrow con ABI/indexer/tests, o eliminarlo) y corregir Landing | OWN, SC, BE | M |
| H-17 | BRLT con ERC20Permit (o approve tradicional) + test gasless con BRLT | SC | M |
| H-12 | Indexador: backfill generalizado + checkpoint persistente + dedup de notificaciones + UsernameUpdated | BE | M |
| H-18, H-31, H-33 | Middleware (rate limiting/headers), timeouts RPC, 500 genéricos, validación de entrada, idempotencia | BE | M |
| H-55, H-26 | E2E reproducible (playwright declarado, suite idempotente) + coverage con umbrales (vitest/forge) | QA | M |
| H-51 | CI/CD operativo (.gitlab-ci.yml o workflow en raíz) con stages y job E2E | QA | M |
| H-36, H-40, H-41 | Migrar UI al DS 2.0; política de estados; navegación por rol | FE | M |
| H-19, H-20, H-22, H-23 | Parametrizar cuotas (fail-closed), unificar deadlines, cobro automático de suscripción, quorum uniforme | SC | M |

### Roadmap (L) — próximo trimestre

| ID(s) | Acción | Responsable | Esfuerzo |
|---|---|---|---|
| H-15 | Implementar reglas de negocio M4/M12 (rubros, límites, 5 avales) en un módulo de cumplimiento; decidir alcance de subastas/encargo | OWN, BE, SC | L |
| H-25, H-16 | NFRs de contratos (Pausable, upgradeabilidad documentada, timelock) y soporte multi-red configurable | SC, FE | L |
| H-56 | Documento de NFRs (SLA 14 días disputas, RPO/RTO, monitoreo/alertas, runbooks), auditoría externa de sc/src, bug bounty, screening sanciones/AML, límites por cuenta, plan de respuesta a incidentes | OWN, COM, QA | L |
| H-49, H-08 | Mapa formal de stakeholders (moderador, DPO, couriers, peritos, almacenes, proveedores SBT/KYC) con RBAC y tooling de árbitro off-chain | OWN, BE | L |
| H-50, H-48, H-30 | Regenerar docs desde artefactos compilados; consolidar la spec en un único documento vigente; centralizar el mapeo de niveles | OWN, QA | L |
| H-43, H-44, H-45, H-59 | PWA offline completa, i18n (es/en), a11y (≥12px, aria-labels, skip-link, loading/error/not-found), métricas LCP/TTI con umbrales | FE | L |
| H-09, H-35 | Modelo de producto único de intercambio (directo vs órdenes) con expiración y vinculación on-chain de user2 | SC, OWN | L |

---

## 7. Criterios de aceptación para la v3

El proyecto se considerará **optimizado (v3)** cuando se cumplan TODOS los criterios siguientes, verificables por CI o prueba manual:

**Seguridad (bloqueantes):**
1. **C1 — Disputas:** `disputeOperation`/`disputeTrade` solo invocables por user1 o user2 registrado on-chain; existe test que demuestra el revert de un tercero; existe ventana máxima de resolución con timelock (p. ej. 14 días) y refund post-expiración aunque la operación esté Disputed.
2. **C2 — PII API:** ningún endpoint devuelve datos privados (email/phone descifrados, hashes KYC/selfie, secretos 2FA) sin prueba criptográfica de control de la wallet (firma EIP-191/712 o SIWE de un challenge); tests de seguridad para `requester=víctima` y `requester=owner`.
3. **C3 — Identidad real:** cero ocurrencias de '123456' o aceptación de códigos arbitrarios en el código; OTP enviado por canal con expiración e intentos limitados; `confirm2FA` valida TOTP contra el secreto; KYC separa 'submitted' de 'verified' y la aprobación de terceros requiere rol verificado; `verify-sbt` consulta el contrato emisor on-chain; el nivel de identidad se refleja on-chain vía `identityAdmin` (la BD es caché).
4. **C4 — PII on-chain:** `UserRegistry` almacena y emite solo hashes con salt (sin email/teléfono/dirección en claro); `UserRegistered` sin PII; grep de PII en eventos/storage sin coincidencias.
5. **C5 — Secretos:** cero secretos/credenciales en archivos versionados (gitleaks/trufflehog en CI sin hallazgos); producción falla en seco si faltan `KYC_SECRET`/`RELAYER_PRIVATE_KEY`; contraseña PostgreSQL rotada y fuera del repo; sin IDs de facturación/emails en docs versionadas.
6. **C6 — Relayer:** `/api/relay` con autenticación/rate limiting por IP y wallet, allowlist de tokens, `eth_call` de simulación antes de firmar, timeout en `tx.wait()`, monitorización de saldo y errores genéricos; las empresas (Subscription.isActive) no usan el relayer.
7. **C7 — Gasless con token nativo:** `BRLT` implementa `ERC20Permit` (o el flujo cae a `approve` tradicional) y existe test `metaCreate`/`metaComplete` con BRLT en verde.

**Arquitectura y consistencia:**
8. **C8 — Contrato canónico:** existe un único contrato de escrow de producción, desplegado por `deploy-local.sh`, con ABI generado, indexado y documentado; la Landing no promete funcionalidad no operativa; el otro escrow está eliminado o marcado experimental.
9. **C9 — Gobernanza efectiva:** las sanciones de Governance bloquean operaciones (Escrow/Exchange) con tests e2e; el arbitraje usa árbitros múltiples/multisig con timelock; SBT/BRLT gestionados por gobernanza.
10. **C10 — Registro on-chain:** `createOperation`/`metaCreateOperation` revierten para usuarios no registrados/verificados (alineado con Exchange y con la spec).

**Calidad y proceso:**
11. **C11 — QA reproducible:** `forge test` ≥ 86 en verde + fuzz; vitest 59 en verde con cobertura ≥ umbral definido (líneas ≥80%, ramas ≥70%); E2E ejecutable con playwright declarado y suite idempotente (2 ejecuciones consecutivas en verde); CI/CD operativo en el repo principal (GitLab o GitHub raíz) con jobs de contratos, web y E2E.
12. **C12 — Métricas honestas:** los conteos de tests documentados provienen de un script de verificación (nada de números estáticos); `engines` de Node ≥22.5 fijado y prerequisitos reales documentados (SQLite local / PostgreSQL prod).
13. **C13 — Documentación viva:** un único documento de requisitos vigente (spec .txt deprecado); MANUAL_TECNICO/README/GCP_DEPLOY regenerados desde artefactos y validados; DICCIONARIO_DE_DATOS sincronizado con el esquema real; mapeo de niveles centralizado en un módulo con tests.

**NFR y producto:**
14. **C14 — NFRs definidos y verificables:** documento de NFRs (SLA de disputas, RPO/RTO, monitoreo con alertas, runbooks); contratos con pausabilidad o decisión documentada de upgradeabilidad y timelock para admin; multi-red configurable por entorno (sin fallbacks locales/Anvil en producción); backups/restore probados para ambas BD.
15. **C15 — Sin datos falsos:** ninguna página muestra mocks como datos reales (Empresa/Tesorería conectadas o marcadas 'demo'); registro sin prefills ficticios; SBT verificado on-chain real.
16. **C16 — Stakeholders y flujo:** mapa de stakeholders formalizado (moderador, DPO, auditor, couriers, peritos, almacenes, proveedores) con roles implementados o decisión documentada; flujo catálogo→trueque funcional; moderador con endpoints de moderación autorizados.

---

*Informe consolidado por el sintetizador del equipo de auditoría TrueKeate (Scopes A–F). Ningún agente modificó archivos; todas las rutas citadas corresponden al estado del repositorio en la fecha de auditoría (2026-08-30). Los ítems marcados 'necesita verificación' deben confirmarse con el equipo antes de cerrar la v3.*
