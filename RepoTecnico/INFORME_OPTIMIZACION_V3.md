# Informe de Optimización V3 — TrueKeate

> Auditoría de 6 scopes (A–F) + síntesis — repositorio `escrow` (TrueKeate/escrow), HEAD `d54a1e2` (2026-08-30).
> Evidencia verificada ruta:línea. Hallazgos consolidados por ID único H-01…H-71 (68 tras deduplicar 108 brutos).

---

## 1. Resumen ejecutivo

**Veredicto: NO apto para producción.** El núcleo crítico de V2 permanece íntegro: los **6 hallazgos CRÍTICOS** (H-01 disputa secuestrable, H-02 fuga de PII vía `?requester=`, H-03 KYC auto-aprobable, H-04 OTP/2FA ficticios, H-05 PII en claro on-chain, H-06 secretos versionados) **siguen presentes y verificados en código** por los scopes A, B, D y F. No hubo commits correctivos desde V2 (los últimos 15 commits son UI/Docs/E2E); el commit `0e8fa64` *"fix(indexer): sync user2 on OperationDisputed"* **institucionaliza el defecto H-01 en la capa off-chain** (registra al disputante tercero como `user2` en BD).

**Nº de hallazgos por severidad (68 consolidados):**

| Severidad | Nº | De V2 que persisten | Nuevos en V3 |
|---|---|---|---|
| CRITICA | 7 | 6 (H-01…H-06) | 1 (H-65) |
| ALTA | 20 | 17 | 3 (H-60, H-67, H-68) |
| MEDIA | 36 | 29 | 7 (H-61, H-62, H-63, H-64, H-70, H-71, +H-16→conflicto) |
| BAJA | 5 | 4 | 1 (H-66) |
| **Total** | **68** | **56** | **12** |

**Comparativa con V2 — qué se corrigió y qué sigue:**

- ✅ **CORREGIDO — H-55(a):** `playwright ^1.62.1` ya declarado en `web/package.json:39` (commit `d54a1e2`); la suite UI (A–C) ahora **ejecuta y pasa 54/54** (A16/B22/C16), cuando en V2 moría con `ERR_MODULE_NOT_FOUND`.
- 🟡 **PARCIALMENTE CORREGIDO — H-41:** UserMenu desktop ya incluye Empresa/Gobernanza/Admin role-gated; pero `/admin/identity` sigue sin enlaces entrantes, *Ayuda* solo visible para invitados y BottomNav móvil sin Empresa.
- 🟡 **MEJORA PARCIAL — H-54/QA:** Governance ya cubre empate, quorum y votación fuera de ventana en tests; las métricas de docs siguen desactualizadas.
- 🟡 **MITIGACIÓN PARCIAL que NO cubre el vector principal:** (a) `resolveDispute` añadió `require(user2!=0)` (Escrow.sol:431-434, TruekeEscrow.sol:270), pero el tercero disputador ya es `user2` → puede recibir `tokenA` sin depósito (H-01 intacto); (b) el flag `isOwner` ya no se acepta del cliente y se deriva del contrato (route.js:37), pero la dirección del owner es pública → la fuga vía `?requester=<owner>` persiste (H-02 intacto).
- ❌ **SIGUE PENDIENTE (sin cambios desde V2):** todo lo demás — contrato huérfano TruekeEscrow (H-07), sanciones sin enforcement (H-08), triple venue de swap (H-09), relayer abierto (H-11), indexador sin backfill (H-12), identidad partida BD/cadena (H-13), NFRs backend/contratos (H-18/H-25/H-56), BRLT sin permit (H-17), etc.

**Riesgo agravante nuevo:** la documentación declara *"Producción / Staging Ready"* (REGISTRO:5) y *"100% Cumplido + 350% (Superado con Excelencia)"* (INFORME_CUMPLIMIENTO:5,17-25) mientras persisten los 6 críticos — riesgo RGPD/Habeas Data real si esa declaración autoriza un despliegue productivo (H-65).

---

## 2. Metodología

- **Equipo:** 6 agentes auditores en paralelo + 1 sintetizador (este informe).
  - **Scope A — On-chain/contratos:** 12 contratos `sc/src`, 9 suites `sc/test`, scripts de despliegue (`deploy-local.{sh,py,ps1}`), `web/scripts/indexer.mjs`, `web/app/api/relay/route.ts`, `git log`.
  - **Scope B — Backend/API/datos:** rutas API, `web/server/lib.js`, `db.js`, seed, E2E (lectura-only + verificación de V2).
  - **Scope C — Frontend/UX/UI:** páginas, componentes, estilos, PWA, i18n, a11y, dead code.
  - **Scope D — Seguridad/cripto:** EIP-712, permits, cifrado AES-256-GCM, PII, claves/secretos, control de acceso.
  - **Scope E — Negocio/proceso/stakeholders:** docs vs código, requisitos funcionales, NFRs, cumplimiento M1–M16, roles.
  - **Scope F — QA con ejecución:** `forge test`, `tsc --noEmit`, `lint`, `vitest`, E2E UI (A–C) y suite de contratos (D).
- **Modo:** lectura-only (A–E) + ejecución de métricas (F); sin modificación de archivos del repo.
- **Fecha / alcance:** 2026-08-30, HEAD `d54a1e2`; repo GitLab `gitlab.com/anlucorporations/escrow` (espejo GitHub público) + `sc/` Foundry.
- **Continuidad con V2:** se contrastó cada hallazgo del `INFORME_OPTIMIZACION_V2.md` contra el estado actual (verificado en código con `ruta:línea`). Los que persisten se marcan **[V2→]**; los detectados ahora **[NUEVO]**. Los que requieren entorno (p. ej. origen real de la credencial PostgreSQL) se marcan *"necesita verificación"*.
- **Deduplicación:** 108 hallazgos brutos → **68 IDs únicos** (H-01…H-71). Las discrepancias de severidad entre agentes se marcan **"en conflicto"** con veredicto de síntesis (9 casos: H-01, H-07, H-10, H-16, H-26, H-51, H-53, H-55, H-65).
- **Límites:** no se añadió ningún hallazgo que no figure en los informes A–F; lo no verificable se indica explícitamente.

---

## 3. Estado de calidad actual (métricas reales — Scope F)

| Métrica | Resultado V3 | V2 | Estado |
|---|---|---|---|
| `forge test` | **86/86 PASS** (9 suites, 6 fuzz ×256, 216.91 ms) | 86/86 | ✅ verde |
| `npx tsc --noEmit` | **0 errores** | 0 | ✅ verde |
| `npm run lint` | **0 problemas** (1 warning baseline-browser-mapping) | — | ✅ verde |
| `vitest` | **59/59 PASS** en 13 archivos, **15.94 s** | 59/59 en 65.47 s | ✅ verde y ~4× más rápido |
| `run-e2e.mjs` (UI A–C) | **54/54** (A 16 / B 22 / C 16), exit 0 | moría con `ERR_MODULE_NOT_FOUND` | ✅ **CORREGIDO (H-55a)** |
| `contracts-test.mjs` (D) | **FATAL en D3** *"Already a socio"*, exit 2 | 21/22 (D7 fallando) | ❌ **empeoró (H-55b)** |
| Cobertura vitest / forge | **NO configurada** (sin `@vitest/coverage-v8`, `vitest.config.ts` sin coverage, CI sin `forge coverage`) | idem | ❌ H-26 |

**Lectura QA:** suites unitarias verdes y estables, pero **sin cobertura ni gate de seguridad**; el E2E es reproducible solo parcialmente (UI sí, contratos no) y **consagra los flujos inseguros como checks verdes** (B7 valida contacto con `'123456'`, B10 KYC auto-aprobado; C3 no cubre el vector `requester=owner`).

---

## 4. Tabla consolidada de hallazgos por severidad

Leyenda: **[V2→]** persistente de V2 · **[V2→~]** parcialmente corregido · **[NUEVO]** detectado en V3 · *(conflicto)* severidad discutida entre agentes, veredicto en la fila.

### CRITICA (7)

| ID | Área | Título |
|---|---|---|
| H-01 | Arbitraje / Escrow | Disputa secuestrable por terceros (robo sin depósito + DoS); **nuevo vector `setInTransit`** *(conflicto A/F: CRITICA vs D: ALTA → **CRITICA**)* [V2→] |
| H-02 | API / Privacidad | Fuga de PII descifrada vía `GET /api/identity/[address]?requester=` sin autenticación (vector `requester=víctima` y `requester=owner` público) [V2→] |
| H-03 | API / KYC | KYC auto-aprobable a 'certificado' sin firma ni rol; `verify-sbt` sin consulta on-chain [V2→] |
| H-04 | Identidad / 2FA | OTP/2FA ficticios: vacío / '123456' / cualquier 6 caracteres aprueba; TOTP nunca validado [V2→] |
| H-05 | Smart Contracts / Privacidad | PII en claro on-chain en UserRegistry (storage, eventos y view pública); hashes sin salt [V2→] |
| H-06 | Secretos / Configuración | Secretos versionados en 7 archivos; **nuevo:** `deploy-local.py` escribe las 10 claves privadas de Anvil en `deployment-info.txt` [V2→] |
| H-65 | Cumplimiento / RGPD-KYC | Docs declaran "Producción Ready" y "100% + 350% Cumplido" con 6 críticos vigentes *(conflicto E: CRITICA vs D: MEDIA → **CRITICA**)* [NUEVO] |

### ALTA (20)

| ID | Área | Título |
|---|---|---|
| H-07 | Arquitectura / Integración | TruekeEscrow huérfano (sin deploy/ABI/indexer); dos escrows con semántica divergente *(conflicto A: ALTA vs E: MEDIA → **ALTA**)* [V2→] |
| H-08 | Gobernanza / Enforcement | Sanciones sin consumidores; árbitro único=owner; **nuevo:** `removeSanction` sin votación ni quorum [V2→] |
| H-09 | Exchange / Tokens | Triple venue de swap con reglas inconsistentes; `fillOrder` sin re-chequeo de allowlist ni expiración (H-27 sin corregir) [V2→] |
| H-10 | Registro / Identidad | No registrados pueden operar en Escrow; H-35 (race de user2) sin vínculo on-chain *(conflicto A: ALTA vs E: MEDIA → **ALTA**)* [V2→] |
| H-11 | Relayer / API | Relayer abierto: sin auth/rate-limit/allowlist/staticCall/timeout; gas drenable; H-53: dos claves distintas [V2→] |
| H-12 | Indexador / Datos | Sin backfill (Governance/SBT/Subscription), sin cursor persistente, notificaciones duplicadas; **nuevo:** sin listener de `UsernameUpdated` ni `CredentialRevoked` pese a prometerlo su cabecera [V2→] |
| H-13 | Identidad off/on-chain | Nivel KYC/identidad solo en BD; `identityAdmin` on-chain nunca invocado; estado partido BD vs cadena [V2→] |
| H-14 | Autorización / API | Endpoints de escritura sin firma de posesión; **nuevo:** `closeMeetup` sin ningún control (ni siquiera address) [V2→] |
| H-15 | Requisitos funcionales | Reglas de la spec no implementadas (límites rubros/artículos, 3%, penalización inactividad, 5 avales); subastas/encargo sin código [V2→] |
| H-17 | Meta-tx / BRLT | BRLT sin ERC20Permit: gasless con el token nativo revierte; **nuevo:** BRLT ni siquiera está en la allowlist del despliegue [V2→] |
| H-18 | NFRs backend | Sin middleware/rate limiting/headers de seguridad, sin audit log, 500s que filtran `err.message` [V2→] |
| H-26 | QA / Cobertura | Cobertura inexistente y flujos críticos sin tests (disputa por terceros, expiración, quema, Exchange, BRLT-gasless) *(conflicto A: MEDIA vs F: ALTA → **ALTA**, evidencia de ejecución)* [V2→] |
| H-50 | Documentación vs código | MANUAL_TECNICO, README, CLAUDE.md, GCP_DEPLOY e INFORME_CUMPLIMIENTO desalineados con el código real [V2→] |
| H-51 | CI/CD | CI/CD no operativo (workflow en `sc/.github`, sin `.gitlab-ci.yml` en raíz); **nuevo detalle:** job web fija Node 20 incompatible con `node:sqlite` (≥22.5) *(conflicto E: ALTA vs F: MEDIA → **ALTA**)* [V2→] |
| H-53 | Claves / Configuración | Tres 'claves del relayer' distintas; el despliegue documentado configura la **clave del OWNER** como `RELAYER_PRIVATE_KEY` *(conflicto D: ALTA vs E: MEDIA → **ALTA**)* [V2→] |
| H-55 | QA / E2E | H-55(a) **CORREGIDO** (playwright); H-55(b) **empeoró**: suite D FATAL 'Already a socio', no idempotente *(conflicto E: MEDIA vs F: ALTA → **ALTA**, verificado por ejecución)* [V2→~] |
| H-56 | NFRs de proceso | Sin SLA, monitoreo/alertas, backups/DR, auditoría externa, bug bounty, AML/OFAC ni plan de incidentes [V2→] |
| H-60 | Autorización / Campañas | `approveCampaign`: único control de rol on-chain falsificable (approver del body sin firma) + default `GOVERNANCE=address(0)` [NUEVO] |
| H-67 | Proceso / Seguimiento | No existe proceso de seguimiento: V2 sin commitear, ningún issue/backlog referencia H-01…H-59, sin responsables [NUEVO] |
| H-68 | QA / E2E | La suite E2E consagra los flujos inseguros como checks verdes (B7 '123456', B10 KYC auto-aprobado; C3 sin vector owner) [NUEVO] |

### MEDIA (36)

| ID | Área | Título |
|---|---|---|
| H-16 | Configuración / Multi-red | DApp y relayer fijados a Anvil 31337/127.0.0.1 sin multi-red configurable *(conflicto C: ALTA vs B/D/E: MEDIA → **MEDIA**, mayoría 3/4)* [V2→] |
| H-19 | Cuotas / Escrow | Cuotas hardcodeadas (1/3), fail-open silencioso (catch vacío), contador asimétrico (contraparte ilimitada) [V2→] |
| H-20 | Deadlines / Escrow | Semántica de deadline divergente entre escrows y sin ventana máxima de vigencia (deadline=0 congela fondos) [V2→] |
| H-21 | TruekeEscrow / Quema | `autoBurnService` aplicado a ambas patas + fallback silencioso a transferencia (rompe garantía de quema) [V2→] |
| H-22 | Subscription / Negocio | Suscripción sin cobro automático, `withdraw` total del fondo, `isActive/businessFlag` sin consumidores [V2→] |
| H-23 | Gobernanza / Quorum | Admisión de Socio sin quorum (yes>no), ventanas fijas no configurables, solicitudes simultáneas [V2→] |
| H-24 | Eventos / Auditoría | `mintMore` sin evento; refund indistinguible de cancelación (TradeCancelled idéntico) [V2→] |
| H-25 | NFRs de contratos | Sin Pausable, sin upgradeabilidad ni timelock; foundry.toml mínimo; views O(n) abusables [V2→] |
| H-28 | Rendimiento / DDL | `initSchema()` ejecuta el DDL completo en cada request (26+ call sites) [V2→] |
| H-29 | Contrato de API | Rutas duplicadas, camelCase vs snake_case sin documentar, `UserProfile` desalineado [V2→] |
| H-30 | Identidad / Niveles (UI) | `IdentityStatusBanner` siempre muestra 'Nivel 1'; mapeos de nivel divergentes (1/2/3 vs 0/1/2) [V2→] |
| H-31 | Validación de entrada | Paginación sin validar (NaN/negativos) y LIKE sin escapar comodines [V2→] |
| H-32 | Privacidad / Meetups | lat/lng/place_name expuestos a cualquier llamador; notificaciones sin paginación [V2→] |
| H-33 | Idempotencia | Endpoints de creación sin idempotencia: reintentos duplican registros [V2→] |
| H-34 | Datos / Seed | Seed escribe email/phone en claro (vs cifrado del sistema) y puebla 3 tablas huérfanas sin API [V2→] |
| H-36 | Design System (UI) | Conviven 4 sistemas visuales (legacy dark/azul, ámbar/stone, índigo/púrpura, DS 2.0); hex sueltos y clases en conflicto [V2→] |
| H-37 | Dead code (UI) | Componentes huérfanos (ExchangePlatform, OrderBook, FloatingToolDrawer, UserRegistrationModal, LandingPage), help/data.ts de 481 líneas sin usar [V2→] |
| H-38 | Flujo de producto (UX) | Flujo catálogo→trueque roto: CTA 'Proponer Trueke Atómico' lleva a detalle sin ninguna acción [V2→] |
| H-39 | Datos demo (UX) | Mocks como datos reales (Empresa/Tesorería 2026, prefills Barlovento, SBT mock) y CIDs IPFS falsos mostrados como certificados [V2→] |
| H-40 | Estados de UI (UX) | Estados de carga/error/vacío ausentes o engañosos; sin loading/error/not-found [V2→] |
| H-41 | Navegación (UX) | UserMenu parcialmente corregido; `/admin/identity` inalcanzable, 'Ayuda' solo invitados, BottomNav sin Empresa y 'Socios' visible a todos [V2→~] |
| H-42 | UX / Detalle de ítem | Placeholder '—' en 'Intercambios completados' con comentario proxy; estilo legado [V2→] |
| H-43 | PWA / Offline | PWA offline incompleta (3 URLs precacheadas), 3 colores de tema, manifest sin PNG 192/512 [V2→] |
| H-44 | i18n | Sin estrategia i18n: `lang='es'` fijo y fechas `toLocale*` sin locale explícito [V2→] |
| H-45 | Accesibilidad | Textos 8–11px, icon-only sin aria-label, sin skip-link ni loading/error/not-found [V2→] |
| H-46 | Marca / Copy | Marca inconsistente 'TrueKeat' vs 'TrueKeate' en metadata, componentes y copy [V2→] |
| H-47 | Privacidad / UX | Operaciones de todos visibles por defecto; 'Solo mi actividad' solo cubre user1 [V2→] |
| H-49 | Stakeholders | Faltan soporte/moderador, DPO, auditor externo, couriers, peritos, almacenes, proveedores SBT/KYC, operador exchange y tesorería del relayer [V2→] |
| H-52 | IPFS / Almacenamiento | IPFS simulado: CID falso sin pinning, pese a PINATA_JWT/IPFS_KEY en la matriz de secretos [V2→] |
| H-54 | Documentación / Métricas | Conteos de tests inconsistentes (74/40/36 vs 86/59 reales) y prerequisitos contradictorios (Node v20 vs ≥22.5; PG 15 vs 18 vs SQLite) [V2→] |
| H-61 | Privacidad / Ubicación | `PUT /users/[address]/location` sin firma (PII manipulable) y `verifyContactChannels` sobrescribe datos cifrados (data-loss) [NUEVO] |
| H-62 | Acceso / Producto | La landing promete mercado público pero todo (platform) está tras AccessGate: invitados chocan con 'Acceso Reservado' (dead-end de conversión) [NUEVO] |
| H-63 | Copy / Promesas | La landing viva promete 'Meta-transacciones sin gas' y 'reembolsos garantizados' que el sistema no cumple (H-17/H-01) [NUEVO] |
| H-64 | Criptografía / Operación | `decryptField` fail-open silencioso y sin procedimiento de rotación/versionado de KYC_SECRET (rotar la clave vuelve ilegible toda la PII) [NUEVO] |
| H-70 | Cumplimiento M1–M16 | Cumplimiento parcial: M6 (ERC-4337) y M14 (GCP) ausentes; M2/M4/M5/M8/M9/M10/M11/M12/M13/M15 con brechas; solo M1/M3/M7/M16 completos [NUEVO] |
| H-71 | Documentación / Manuales | Manuales duplicados byte-idénticos en `dos/` y `docs/`; MANUAL_USUARIO desactualizado (registro de 1 campo vs formulario real de 8) [NUEVO] |

### BAJA (5)

| ID | Área | Título |
|---|---|---|
| H-48 | Especificación / Marca | Spec duplicada y contradictoria (.txt vs .md), Next.js 14 vs 16, tres taxonomías de niveles, marca 'TrueKeat' [V2→] |
| H-57 | Meta-tx / EIP-712 | Intención EIP-712 sin `validUntil` y nonce único compartido entre create/complete [V2→] |
| H-58 | Errores (UX) | Mensajes de error crudos sin traducir y logs en inglés [V2→] |
| H-59 | UI (n/d) | Persiste según Scope C **sin detalle nuevo en V3** (ver V2) [V2→] |
| H-66 | API / Autorización | Endpoints de identidad de escritura sin prueba de posesión; secreto TOTP devuelto en claro y sobrescrito en cada setup [NUEVO] |

> Notas de consolidación: H-27 (validación de tokens) y H-35 (race de user2) son hallazgos V2 integrados en H-09 y H-10 respectivamente. H-55(a) se da por cerrado con evidencia de ejecución (F); H-55(b) se mantiene abierto y agravado.

---

## 5. Detalle por categoría

### (a) Ambigüedades

- **H-20 — Semántica de deadline divergente y sin ventana máxima** [V2→]. `Escrow.cancelOperation` cancela en cualquier momento (364-380) y `refundAfterExpiry` exige `deadline!=0` (388), mientras `TruekeEscrow.cancelTrade` exige estado Pending (209-213) e InTransit bloquea la cancelación; `deadline=0` (sin expiración) congela fondos indefinidamente. *Evidencia:* `sc/src/Escrow.sol:364-401; sc/src/TruekeEscrow.sol:209-232`. *Recomendación:* unificar reglas cancelación/refund entre ambos escrows, documentar `deadline==0` vs expiración en la UI y fijar ventana máxima de vigencia on-chain.
- **H-29 — Contratos de API ambiguos** [V2→]. (a) `POST /api/users/[address]` y `/refresh` son idénticos (refreshTrustLevel); (b) `GET /api/operation/[id]` (camelCase on-chain) vs `GET /api/operations/[id]` (snake_case BD) sin documentar; (c) `UserProfile` declara `identificationLevel` pero la API no lo devuelve → el cliente muestra niveles incorrectos. *Evidencia:* `web/app/api/users/[address]/route.js:49-60` vs `refresh/route.js:9-20`; `operation/[id]/route.ts:26-37` vs `operations/[id]/route.js:13-17`; `web/lib/items.ts:46-49`. *Recomendación:* eliminar la ruta duplicada, unificar naming, alinear `UserProfile` y documentar con OpenAPI.
- **H-30 — Mapeos de nivel divergentes (1/2/3 vs 0/1/2)** [V2→]. `IdentityStatusBanner` usa escala 1/2/3 (`level>=3` Certificado) y `useTradeQuota`/admin usan el enum on-chain 0/1/2 → un usuario on-chain Certificado (2) ve 'Nivel 1' en el banner pero 'Ilimitados' en la cuota. *Evidencia:* `web/components/IdentityStatusBanner.tsx:14,25-31`; `web/lib/hooks.ts:956-963`; `web/app/(platform)/admin/identity/page.tsx:106-111`. *Recomendación:* devolver `identificationLevel` consistente desde la API y centralizar el mapeo enum→string en un módulo único.
- **H-47 — Política de visibilidad de operaciones sin definir** [V2→]. La lista muestra TODAS las operaciones con montos/direcciones; el checkbox 'Solo mi actividad' filtra solo `op.user1`, dejando fuera al user2. *Evidencia:* `web/app/(platform)/operations/page.tsx:75-94,151-161`. *Recomendación:* decidir la política (privada → filtrar user1 OR user2; pública → avisar y ocultar montos a terceros).
- **H-48 — Spec duplicada y contradictoria** [V2→]. `.txt:36` dice que ningún usuario paga gas vs `.md:37-38` que solo los particulares; 'Next.js 14' declarado vs Next.js 16 real (package.json:21); taxonomías Iniciado/Común/Frecuente/Socio vs Inscrito/Verificado/Certificado; marca 'TrueKeat' (DICCIONARIO_DE_DATOS.md:3). *Recomendación:* consolidar en un único documento vigente, una sola taxonomía con mapping on-chain, unificar marca.
- **H-59 — Hallazgo UI persistente sin detalle nuevo** [V2→]. El Scope C confirma que H-59 sigue presente pero no aporta evidencia nueva en V3; su severidad/detalle deben re-verificarse contra V2. *Recomendación:* re-auditar este ítem puntual en V4 o cerrarlo con evidencia.
- **H-62 — ¿Catálogo público o privado?** [NUEVO]. La landing ofrece 'Explorar Catálogo' y presenta el marketplace como público, pero `(platform)/layout.tsx` envuelve TODAS las páginas (incluido /items) en AccessGate (conectar+registrar): el invitado choca con 'Acceso Reservado'. *Evidencia:* `web/app/(platform)/layout.tsx:1-4`; `web/components/AccessGate.tsx:68-183`; `web/app/page.tsx:67-83`. *Recomendación:* decidir la política: lectura pública de /items sin wallet (acciones gated) o ajustar el copy a 'Suite privada' con explicación del registro; medir conversión del funnel.
- **H-63 — Promesas de producto que el sistema no cumple** [NUEVO]. La landing afirma 'Meta-transacciones sin gas' y 'reembolsos garantizados tras vencimiento', pero H-17 verifica que el gasless con BRLT revierte (sin ERC20Permit) y H-01 que una disputa bloquea el refund. *Evidencia:* `web/app/page.tsx:160-161`; `sc/src/BRLT.sol:15-27`; `sc/src/Escrow.sol:406-438`. *Recomendación:* alinear el copy con la funcionalidad real (o corregir contratos: ERC20Permit, ventana de resolución) y revisar copy vs tests en CI.
- **H-70 — Matriz M1–M16 sin criterios oficiales** [NUEVO]. Cumplimiento parcial no documentado como matriz: M6 (ERC-4337) y M14 (GCP) ausentes; M2/M4/M5/M8/M9/M10/M11/M12/M13/M15 con brechas; solo M1/M3/M7/M16 completos. *Evidencia:* `web/server/lib.js:318-409 (M7), 509-516 (M15), 534-582 (M16)`; `sc/src/Subscription.sol:48-78 (M9)`; `web/lib/ipfs.ts:34-51 (M8)`; grep `entrypoint|4337|bundler` = 0 (M6); `RepoTecnico/GCP_DEPLOY.md:97,107 (M14)`. *Recomendación:* publicar matriz M1-M16 oficial con estado y criterios de aceptación por módulo; priorizar M6/M14 como bloqueantes de producción.

### (b) Inconsistencias

- **H-07 — TruekeEscrow huérfano vs promesa de la Landing** [V2→] *(conflicto A: ALTA vs E: MEDIA → ALTA)*. Ningún script despliega TruekeEscrow (`deploy-local.sh:91-105`, `py:96-109`); `generate-contracts.mjs:27-36` no genera su ABI; `web/lib/contracts.ts` solo exporta ESCROW_*; el indexador no tiene handlers; la Landing afirma 'fondos bloqueados en TruekeEscrow.sol' (LandingPage.tsx:108). *Recomendación:* decidir el contrato canónico (integrar completo o eliminar/marcar experimental), corregir la Landing y unificar semántica de disputas/deadline/allowlist.
- **H-09 — Triple venue de swap con reglas inconsistentes** [V2→]. Escrow (cuotas/arbitraje/meta-tx/allowlist), Exchange (libro de órdenes sin expiración ni arbitraje) y TruekeEscrow (multi-activo sin allowlist ni cuotas); `fillOrder` (127-140) no re-chequea allowlist tras `removeToken` ni expiración; H-27: `addToken` no valida nada (Exchange.sol:68-74) y Escrow solo extcodesize+symbol() sin chequear EIP-2612 ni fee-on-transfer. *Evidencia:* `sc/src/Exchange.sol:15-25,68-74,127-140`; `sc/src/Escrow.sol:258-280`; `sc/src/MockERC20.sol:21-23`. *Recomendación:* modelo único de intercambio, expiración de órdenes, validación uniforme de tokens (decimals/transfer/permit con try-catch, balance tras transferFrom) y pragmas unificados.
- **H-10 — Spec exige registro; el contrato no lo exige** [V2→] *(conflicto A: ALTA vs E: MEDIA → ALTA)*. `escrow-TrueKeate.md:27` exige 'solo usuarios inscritos y verificados', pero `Escrow.createOperation/completeOperation/meta*` no exigen registro (a diferencia de `Exchange.onlyRegisteredUser`, 52-55); un wallet no registrado obtiene nivel 0 y cuota de Inscrito (UserRegistry.sol:218-220); H-35: `completeOperation` solo exige `user1 != msg.sender` (Escrow.sol:194,344) → cualquiera completa antes que el user2 acordado (race/MEV). *Recomendación:* gate on-chain de registro/nivel mínimo, vínculo on-chain de la contraparte (intent EIP-712 'accept'), restringir complete a ese user2, tests de revert.
- **H-13 — Identidad partida BD vs cadena** [V2→]. `submitKyc`/`verifyContactChannels`/`confirm2FA`/`verifyThirdPartySBT` mutan el nivel solo en PostgreSQL (lib.js:635,673,710,733); `identityAdmin`/`setIdentificationLevel` solo existen en el ABI (contracts.ts:1306); el indexador conserva el nivel previo con CASE (indexer.mjs:111-114) → la BD puede decir 'certificado' mientras on-chain dice 'inscrito'; cuotas on-chain vs avales/UI BD. *Recomendación:* el backend valida y luego llama a `setIdentificationLevel` vía identityAdmin on-chain (o indexa emisiones SBT reales); la BD como caché de lectura.
- **H-15 — Reglas de negocio de la spec vs código** [V2→]. Límites de rubros/artículos, 3% del rubro, penalización por inactividad >5%, 5 avales (M12) y subastas/encargo no existen en código; `computeTrustLevel` usa umbrales genéricos (3.5/3 y 4.2/25); `createVouch` solo exige kyc_status. *Evidencia:* `web/server/lib.js:13-16,35-45,428-448`; `escrow-TrueKeate.md:5,28-33`; `PROPUESTA_TRUEKEATE.md:68-77,142-145`; grep 'subasta|auction|encargo' = 0. *Recomendación:* módulo de cumplimiento único por nivel; decidir formalmente el alcance de subastas/encargo.
- **H-34 — Seed escribe PII en claro** [V2→]. `seed-platform-data.mjs:293-338` inserta `email/phone` en claro y fija `email_verified/phone_verified=1` sin OTP, mientras el sistema cifra con `encryptField` (lib.js:100-101) → los usuarios sembrados rompen la lectura uniforme; `company_stores`, `company_finances` y `platform_treasury_logs` solo se pueblan por seed, sin API. *Recomendación:* cifrar en el seed reutilizando helpers (o eliminarlo de producción); decidir el destino de las 3 tablas huérfanas.
- **H-36 — 4 sistemas visuales conviviendo** [V2→]. Tokens DS 2.0 en globals.css vs estilo legacy dark:*/azul (operations, items/new, balances, campaigns), paleta amber/stone (identity, admin, company), índigo/púrpura/olive en AccessGate (71,83,95-108), clases en conflicto `text-navy-900 text-white` (dashboard:173,188) y hex sueltos (#2A9D8F, #1A2B4C, #D4AF37). *Recomendación:* migrar todo al DS 2.0 con tokens @theme y lint que prohíba hex sueltos y clases de color en conflicto.
- **H-41 — Navegación inconsistente** [V2→~]. Mejora: UserMenu desktop role-gated (419-518). Pendiente: `/admin/identity` sin enlaces entrantes; 'Ayuda' solo invitados (Header:32-36); BottomNav móvil muestra 'Socios' a todos y sin Empresa (42-43,16-59). *Recomendación:* enlazar /admin/identity para isOwner, Ayuda accesible autenticado, role-gate 'Socios' y acceso móvil a Empresa.
- **H-46 — Marca 'TrueKeat' vs 'TrueKeate'** [V2→]. `layout.tsx:22,28`, `BrandLogo.tsx:16,34,46,63,74`, `register/page.tsx:146,220,430`, `OperationCard.tsx:208,213`, `RateOperationModal.tsx:89`, `IdentityStatusBanner.tsx:40` usan 'TrueKeat'; manifest/footer usan 'TrueKeate'. *Recomendación:* unificar 'TrueKeate' y verificación de copy en CI (grep TrueKeat).
- **H-50 — Documentación desalineada con el código** [V2→]. `MANUAL_TECNICO.md:95` documenta `resolveDispute(operationId, favorUser1, recipient)` pero Escrow.sol:422 tiene 2 parámetros; `:112` documenta `register(username)` pero UserRegistry.sol:78 tiene 8; `README.md:57` enlaza `RepoTecno/ACCOUNTS.md` inexistente; `CLAUDE.md:75,90` referencian `test_Increment`/`Counter.s.sol` inexistentes; `GCP_DEPLOY.md:97` CMD `node web/server.js` (archivo inexistente) y `:107` mapea mal `--set-secrets`; `INFORME_CUMPLIMIENTO.md:66-70` asigna cuentas 4,5 como Comerciantes vs deploy-local.sh:44-55 (3,4 Empresas; 1,2 Socios). *Recomendación:* regenerar docs desde ABIs/firmas reales, corregir rutas, validar GCP_DEPLOY con despliegue real.
- **H-53 — Tres 'claves del relayer' y colisión de roles** [V2→] *(conflicto D: ALTA vs E: MEDIA → ALTA)*. REGISTRO:236 documenta `0x47e179ec…060a0007` (clave NO estándar); `route.ts:19` usa el fallback `0x47e179ec…34926a` (cuenta #4 = Empresa 2 según deploy-local.sh:49); `deploy-local.sh:220`/`ps1:227`/`MANUAL_TECNICO.md:210` escriben `RELAYER_PRIVATE_KEY` con la clave de la cuenta #0 (**el OWNER**) → el relayer posee la clave del owner (addToken/setArbiter/setUserRegistry/mint BRLT) si se sigue la configuración documentada. *Recomendación:* wallet de relayer dedicada con saldo limitado, eliminar claves privadas de docs, corregir el REGISTRO, escaneo CI.
- **H-54 — Métricas y prerequisitos contradictorios** [V2→]. REGISTRO:79,83 (74 forge/40 vitest) e INFORME_CUMPLIMIENTO:25,184 (36) vs reales 86/59; REGISTRO:45 exige Node v20.x y README:108 dice 18+, pero `db.js:14` usa `node:sqlite` (≥22.5); PostgreSQL 15 vs 18 vs SQLite. *Recomendación:* script de verificación que parse la salida de forge/vitest, `engines: node >=22.5`, documentar dualidad SQLite/PostgreSQL, versionar esquema SQL.
- **H-65 — Docs de cumplimiento vs realidad** [NUEVO] *(conflicto E: CRITICA vs D: MEDIA → CRITICA)*. `INFORME_CUMPLIMIENTO.md:5,17-25` declara "100% Cumplido + 350% (Superado con Excelencia)" y `REGISTRO:5` "Producción / Staging Ready" mientras persisten PII on-chain (UserRegistry.sol:104-118), KYC auto-aprobable (lib.js:596-600,630-637), 2FA ficticio, fuga PII API y secretos versionados; la 'POLÍTICA DE SEGURIDAD ABSOLUTA' (REGISTRO:219-221) es violada por el propio repo. *Recomendación:* detener la declaración de 'Producción Ready', regenerar el cumplimiento desde evidencia real (tests + auditoría externa de sc/src), añadir sección RGPD/Habeas Data con DPO y matriz de datos personales.
- **H-71 — Manuales duplicados y desactualizados** [NUEVO]. `dos/MANUAL_TECNICO.md` y `dos/MANUAL_USUARIO.md` son byte-idénticos a `docs/`; `MANUAL_USUARIO.md:43-50` describe un registro de 1 campo vs el formulario real de 8 (register/page.tsx:18-26,111-118; UserRegistry.sol:78-87); no cubre el encuentro M16 ni roles Empresa/Socio/Árbitro. *Recomendación:* eliminar la copia `dos/`, regenerar el manual de usuario con el flujo real y crear MANUAL_OPERACIONES.

### (c) NFRs faltantes

- **H-12 — Indexador: resiliencia de datos** [V2→]. Backfill solo para Escrow/UserRegistry (indexer.mjs:340-436); Governance/SBT/Subscription solo en vivo (490-578); `START_BLOCK=0` sin checkpoint (58) y `createNotification()` sin deduplicación (71-82) → notificaciones duplicadas en cada arranque; **nuevo:** la cabecera (8-9) promete listeners de `UsernameUpdated` y `CredentialRevoked` que NO existen → SBT revocado on-chain (TruekeSBT.revoke, 81-92) deja al usuario 'certificado' en BD indefinidamente (updateSBTInfo 145-158 sin contraparte). *Recomendación:* backfill generalizado con checkpoint por contrato (tabla indexer_state), deduplicación (ref+type+user), listeners de UsernameUpdated/CredentialRevoked y cabecera sincronizada con la cobertura real.
- **H-16 — Multi-red configurable** [V2→] *(conflicto C: ALTA vs B/D/E: MEDIA → MEDIA)*. `ethereum.tsx:77-80` valida contra 31337n y `:145-179` fuerza switch/add 'Anvil Localhost' 127.0.0.1:8545; fallbacks locales en relay (route.ts:17), operation/[id] (route.ts:7), identity (route.js:19) y stats (route.ts:13); /api/stats trunca a 500 sin flag. *Recomendación:* parametrizar por entorno (NEXT_PUBLIC_CHAIN_ID/RPC_URL, direcciones por red), bloquear fallbacks locales en producción e indicador de red incorrecta en UI.
- **H-18 — NFRs backend** [V2→]. Sin `web/middleware.*`, sin cabeceras (next.config.ts:3-6), sin rate limiting (grep rateLimit/helmet/CSP = 0), sin audit_log, 500s que filtran `err.message` (items:23, ratings:27, vouches:19, notifications:19,31, campaigns:17,33, users/[address]:45,59, kyc:31, identity:42,63, relay:102-105), proveedores RPC sin timeout. *Recomendación:* middleware global (rate limiting por IP/wallet + headers CSP/HSTS), timeouts/reintentos RPC, tabla audit_log y 500s genéricos.
- **H-25 — NFRs de contratos** [V2→]. Ningún contrato usa Pausable ni proxies (grep = 0); owner único sin timelock para addToken/setArbiter/mint BRLT/withdraw Subscription/nombrar socios; foundry.toml mínimo (1-14); views O(n) abusables (Exchange.getOrdersByMaker 181-197, Escrow.getOperations 468-481, UserRegistry.getRegisteredWalletsPaged 231-246, SBTRegistry.hasValidIdentity 122-131). *Recomendación:* definir NFRs explícitos (pausa de emergencia, decisión de upgradeabilidad, timelock/multisig admin, límites de iteración, perfiles de gas).
- **H-28 — DDL en cada request** [V2→]. `await initSchema()` en 26 call sites; `db.js:268-354` re-ejecuta esquema/índices/ALTER por request con ruido 'ALTER_FAILED' (76-84). *Recomendación:* inicialización única (módulo singleton con promesa compartida o script de deploy) y migraciones versionadas.
- **H-31 — Validación de entrada** [V2→]. `Number('abc')→NaN` pasa por Math.min (items/route.js:18-19, ratings:18-19) rompiendo SQL; limit negativo = 'sin límite' en SQLite; `q` concatena `%/_` sin escape (lib.js:258-261); relayer hace BigInt() sin validar tipos (route.ts:64-80). *Recomendación:* validar limit/offset ≥0 con tope (400), escapar comodines, validar tipos antes de construir la tx.
- **H-33 — Idempotencia** [V2→]. `createItem` (lib.js:204), `createCampaign` (463) y `createMeetup` (386) generan UUID nuevo por POST → reintentos duplican; solo ratings (db.js:155) y vouches (176) protegidos. *Recomendación:* cabecera Idempotency-Key o deduplicación por hash del payload firmado (la firma de items ya existe), índices únicos.
- **H-40 — Estados de UI** [V2→]. 'No hay operaciones' durante la carga sin try/catch (operations/page.tsx:34-53,164-189); 'No hay campañas todavía.' durante fetch (campaigns:39-46,154); balances solo console.error (34-41); sin loading.tsx/error.tsx/not-found.tsx (glob = 0). *Recomendación:* política de estados por página (skeleton/error con reintento/vacío con CTA) y archivos de estado a nivel app con DS 2.0.
- **H-43 — PWA offline** [V2→]. `sw.js:3,18-36` precachea solo 3 URLs sin fallback de navegación; colores divergentes (manifest #FAF8F5/#2D2A26, layout #F8F9FA, globals #F8F9FA); manifest sin PNG 192/512 (solo icon.svg) — riesgo de instalabilidad Chrome. *Necesita verificación:* criterios de Chrome con SVG 'any'. *Recomendación:* precachear app-shell real, fallback offline, unificar colores y generar PNG 192/512 + maskable.
- **H-44 — i18n** [V2→]. Sin framework i18n; `lang='es'` fijo (layout.tsx:47); fechas con `toLocale*` sin locale (OperationCard:265-272, items/[id]:76, campaigns:174, UserMenu:165) → mezcla de idiomas/formato. *Recomendación:* RNF de i18n (es/en), strings centralizados, `Intl.DateTimeFormat('es-VE')` explícito.
- **H-45 — Accesibilidad** [V2→]. text-[8px] (BottomNav:76), 9-10px en globals.css (332,365-381,427), 9-11px en IdentityStatusBanner (51-89), text-[10px] (socio-voting:195, landing:144); botón icon-only sin aria-label (CreateOperationModal:106-113); sin skip-link ni focus visible; estados solo por color/emoji. *Recomendación:* tamaños ≥12px, aria-label, skip-link, focus-visible, loading/error/not-found con DS 2.0, contraste+iconos.
- **H-56 — NFRs de proceso/operación** [V2→]. SLA de 14 días para disputas solo como recomendación (sin DISPUTE_RESOLUTION_WINDOW en Escrow.sol:406-422); sin monitoreo/alertas (README:14-26 llama 'monitoreo' a abrir consolas); backups solo flags de Cloud SQL sin procedimiento SQLite; sin auditoría externa, bug bounty, screening OFAC/AML ni runbooks. *Recomendación:* documento de NFRs (SLA/RPO/RTO, monitoreo con alertas, runbooks), timeout de disputas on-chain, política de backup/restore, auditoría externa de sc/src antes de mainnet, bug bounty y screening de sanciones.
- **H-64 — Criptografía operativa** [NUEVO]. `decryptField` (lib.js:612-621) captura cualquier error y devuelve '' en silencio → PII 'vacía' enmascarando corrupción; formato `iv:tag:data` sin versión de clave → rotar KYC_SECRET vuelve ilegible toda la PII sin migración; `kycKey()` deriva con sha256 simple sin KDF (596-600). *Recomendación:* fail-closed o señalización de corrupción, versión de clave en el formato (v1:iv:tag:data) con re-cifrado, KDF con salt (HKDF/scrypt), runbook de rotación.

### (d) Stakeholders faltantes

- **H-49 — Matriz de stakeholders incompleta** [V2→]. grep 'moderador|moderator' en web/ = 0: no hay rol de soporte/moderación (banear, retirar artículos, resolver off-chain), ni manual ni endpoints; couriers/peritos/almacenes/DPO solo en un diagrama; proveedores SBT/KYC (BABT, WorldID) sin rol modelado; Exchange.sol sin operador; sin definición de quién financia la tesorería del relayer; el árbitro solo actúa on-chain (onlyArbiter, Escrow.sol:422) sin tooling off-chain (listar disputas, historial). *Recomendación:* formalizar matriz de stakeholders con responsabilidades y RBAC (soporte/moderación, DPO/cumplimiento, auditor, courier, perito, almacén, proveedores SBT/KYC), endpoints off-chain para árbitros y financiación del relayer definida.

### (e) Otros

#### Seguridad de contratos

- **H-01 — Disputa secuestrable + vector setInTransit** [V2→] *(conflicto A/F: CRITICA vs D: ALTA → CRITICA; D documenta mitigación parcial que no cubre el vector)*. `disputeOperation` (Escrow.sol:406-419) no restringe msg.sender: cualquier dirección disputa y, si user2==0, queda registrada como user2 (413-415); `resolveDispute(favorUser1=false)` (422-448) transfiere amountA al tercero sin depósito; disputar congela sin ventana máxima. **Nuevo vector:** `TruekeEscrow.setInTransit` (161-180) invocable por cualquiera: registra al atacante como user2, bloquea cancelTrade (solo Pending, 209-213) y, si deadline==0, hace el refund imposible (exige deadline!=0, 232) → fondos secuestrados. `disputeTrade` (244-259) omite el chequeo de deadline (a diferencia de setInTransit:168/completeTrade:191): disputa post-expiración bloquea el refund. El test Escrow.t.sol:268-280 enshrinea el comportamiento; el indexador cementa al tercero como user2 en BD (indexer.mjs:237-251, commit 0e8fa64). *Recomendación:* restringir dispute/setInTransit a user1/user2 registrado, validar deadline en disputeTrade, refund tras expiry aunque esté Disputed/InTransit, ventana máxima con timelock y árbitros múltiples, tests de revert de tercero y corregir el handler del indexador.
- **H-05 — PII en claro on-chain** [V2→]. `register()` almacena email/phone/physicalAddress en claro (UserRegistry.sol:22-36,104-118) y `UserRegistered` los emite íntegros (126-138); `getUserProfile` (222-224) view pública devuelve toda la PII; `emailHashToWallet/phoneHashToWallet` con keccak256 sin salt (95-96) → fuerza bruta trivial; el indexador re-cifra los mismos valores al insertar (indexer.mjs:100-101) evidenciando que la fuga está en el contrato. *Recomendación:* solo hashes con salt y coordenadas aproximadas on-chain, sin PII en eventos, purgar/redeploy si se usó con PII real, conectar la escalada vía identityAdmin.
- **H-08 — Sanciones y gobernanza desconectadas** [V2→]. `sanctioned`/`isSanctioned` solo en Governance.sol (42,224-237): ningún otro contrato los consulta → el sancionado sigue operando; árbitro único fijado por owner (deploy-local.sh:133); `TruekeSBT.revoke` onlyOwner pese a docstring 'Owner/Gobernanza' (14,81); `BRLT.mint` onlyOwner (19-21); **nuevo detalle:** `removeSanction` (230-233) lo ejecuta un único socio sin votación ni quorum. *Recomendación:* conectar Governance al arbitraje (multisig con timelock), bloquear operaciones para sanctioned con tests, mover mint/revoke a gobernanza con votación, votación para removeSanction.
- **H-17 — BRLT sin ERC20Permit + fuera de allowlist** [V2→]. `BRLT` hereda solo ERC20+Ownable (15-27); `_applyPermit` fuerza `IERC20Permit(token).permit` (166-177) → gasless con BRLT revierte; `addToken` (258-280) no valida permit; los tests usan MockERC20 con permit (TruekeMultiAsset.t.sol:55) enmascarando el bug; **nuevo:** los scripts de despliegue NO añaden BRLT a la allowlist (deploy-local.sh:129-131, py:132-134) → el token nativo es inusable en truekes/órdenes; H-57 relacionado: sin validUntil y nonce compartido. *Recomendación:* BRLT con ERC20Permit (o fallback a approve detectando soporte), validar permit en addToken, añadir BRLT a la allowlist, test meta con BRLT real.
- **H-19 — Cuotas fail-open y contador asimétrico** [V2→]. `_checkActiveTradeQuota` hardcodea 1/3 (303-316), catch vacío fail-open (314); `completeOperation`/`metaCompleteOperation` chequean la cuota del completador sin incrementarla (198,347) y `activeTradesCount` solo cuenta creaciones (123) → contraparte ilimitada; niveles dispares (UserRegistry.sol:16-20 vs docs). *Recomendación:* cuotas parametrizables con setters/eventos, política fail-closed, semántica de 'operación activa' e incremento del contador de ambas partes.
- **H-21 — Quema en ambas patas + fallback silencioso** [V2→]. `completeTrade` aplica autoBurnService a las dos liquidaciones (TruekeEscrow.sol:199-200); `_transferOutAsset` captura el revert de consumeAndBurn y cae a transferencia normal (301-304), rompiendo la garantía de quema documentada. *Recomendación:* quemar solo la pata del proveedor y revertir si consumeAndBurn falla (o documentar el fallback), con tests de ambos caminos.
- **H-22 — Suscripción sin cobro automático** [V2→]. `subscribe()` manual (48-65) contradice M9 'cobro mensual automático'; `withdraw()` drena el fondo completo (73-78) dejando paidUntil vigente sin respaldo; grep isActive/businessFlag/paidUntil = solo Subscription.sol. *Recomendación:* cobro pull/keeper por periodo, contabilidad de meses devengados, gate de empresa con suscripción vencida.
- **H-23 — Quorum de Socios** [V2→]. `resolveSocioApplication` aprueba con yes>no sin quorum (161) mientras `executeProposal` exige quorum (222); ventanas fijas 3/5 días (53-54); `applyForSocio` permite solicitudes simultáneas (103-132). *Recomendación:* quorum uniforme configurable, ventana por propuesta, `require !hasPendingApplication`.
- **H-24 — Eventos de auditoría incompletos** [V2→]. `mintMore` sin evento (TruekeService.sol:115-123); `refundAfterExpiry` emite TradeCancelled idéntico a cancelTrade (TruekeEscrow.sol:220,239); indexador no procesa TruekeEscrow ni CredentialRevoked. *Recomendación:* eventos dedicados (ServiceMinted, TradeExpired/Refunded con motivo y actor) y cobertura documentada del indexador.

#### Seguridad de API y datos

- **H-02 — Fuga de PII vía ?requester=** [V2→]. `GET /api/identity/[address]` toma `requester` del query sin verificar firma (route.js:34); `isSelf = requester === target` (lib.js:753-754) devuelve email/phone descifrados (784-785), document_hash/selfie_hash/2FA (788-793) tanto para isSelf como isOwner; vector trivial `requester=<víctima>`; isOwner derivado del contrato (route.js:37) pero la dirección es pública → `requester=<owner>` también filtra; el E2E C3 (run-e2e.mjs:423-428) no cubre estos vectores; tests enshrinean la fuga (identity.test.ts:115-120). *Recomendación:* prueba criptográfica de control de la wallet (SIWE o firma EIP-191/712 con challenge+timestamp verificada con ethers.verifyMessage), requester como sugerencia, tests de seguridad.
- **H-03 — KYC auto-aprobable** [V2→]. PUT /api/users/[address]/kyc público (route.js:11-29): `submitKyc` fija 'verified'/'certificado' directo en BD (lib.js:630-638); la página admin usa el mismo endpoint público (admin/identity/page.tsx:139-140); `verifyThirdPartySBT` con firma OPCIONAL (724) y sin balanceOf/ownerOf on-chain. *Recomendación:* firma ECDSA obligatoria, separar kyc_submitted/kyc_verified con aprobación por rol, verificar SBT contra el emisor on-chain, nunca auto-otorgar 'certificado'.
- **H-04 — OTP/2FA ficticios** [V2→]. `verifyContactChannels` acepta vacío/'123456'/6 caracteres (lib.js:655-656) y marca verificado (665-668); `confirm2FA` valida solo formato (702-704) sin TOTP contra two_factor_secret (setup2FASecret nunca se consume); frontend envía '123456' por defecto (identity/page.tsx:181-182) y muestra 'verificado ✓' (235); tests enshrinean (run-e2e.mjs:306-322, identity.test.ts:43-44, test-local-db.mjs:69-73). *Recomendación:* eliminar fallbacks cliente/servidor (bloquear por NODE_ENV), OTP reales con expiración/intentos, TOTP con otplib, firma de wallet para mutar verificación.
- **H-06 — Secretos versionados** [V2→]. Contraseña PG 'KeLuDa.2324' (SUPERUSER anlucorporations) en 7 archivos trackeados (create-truekeate-db.mjs:10,27; setup-pg-user.mjs:6,13,17,26; test-local-db.mjs:5,16; init-pg.js:5,21; deploy-local.sh:221; ps1:228; py:235); relayer default = clave pública de la cuenta #4 de Anvil (route.ts:18-19); KYC_SECRET fallback 'truekeate-dev-secret-…' (lib.js:598); **nuevo:** deploy-local.py genera deployment-info.txt con las 10 claves privadas (271-328; .gitignore:2 lo excluye pero es archivo local de alto riesgo); además sh/py escriben RELAYER_PRIVATE_KEY=clave de la cuenta #0 → dos 'claves del relayer' en runtime. *Necesita verificación:* si la credencial PG corresponde a staging/producción. *Recomendación:* eliminar credenciales de archivos versionados (rotar PG, git filter-repo/BFG), solo env/Secret Manager, fallo en seco en producción, eliminar deployment-info.txt con claves, gitleaks/trufflehog en CI.
- **H-11 — Relayer abierto** [V2→]. POST /api/relay ejecuta cualquier intent firmado pagando gas del relayer sin auth/rate-limit/allowlist/staticCall/timeout en tx.wait() (route.ts:52-107, 81,97); BigInt(amountA) sin validar (71-74); errores crudos (102-105); intents single-use → front-run/reintento quema gas; regla 'las empresas pagan su gas' sin implementar. *Recomendación:* rate limiting por IP/wallet, allowlist de tokens/montos, staticCall + gas estimado, timeouts con backoff, alertas de saldo, errores genéricos, política de gas para empresas.
- **H-14 — Endpoints de escritura sin firma + closeMeetup** [V2→]. Sin firma ECDSA en ratings (lib.js:103-120), vouches (429-448), operations/[id]/accept (336-345), meetups/[id]/open (534-582), users/[address]/refresh y notifications; **nuevo:** `POST /meetups/[id]/close` (route.js:9-18) no recibe NI address: un anónimo completa el encuentro de otros (lib.js:584-590), rompiendo la ventana M16. *Recomendación:* firma ECDSA del actor sobre payload canónico con nonce/timestamp en todos los endpoints de escritura; closeMeetup exige address+firma de una parte.
- **H-32 — Meetups y notificaciones** [V2→]. `GET /api/meetups?operationId=` devuelve lat/lng/place_name sin verificar que el llamador sea parte (route.js:10-23; lib.js:412-414); notificaciones LIMIT 30 fijas sin paginación (lib.js:511) y POST /notifications permite marcar las de cualquiera (route.js:23-32). *Recomendación:* verificar membrecía con firma antes de devolver meetups; paginar notificaciones con operaciones individuales autorizadas.
- **H-60 — approveCampaign falsificable** [NUEVO]. Único endpoint con rol on-chain (Governance.isSocio), pero `approver` viene del body sin firma (route.js:14-24): cualquiera aprueba usando la dirección de un Socio conocido (lib.js:483-496); default `NEXT_PUBLIC_GOVERNANCE_ADDRESS = address(0)` (route.js:11) convierte el chequeo en no-op en entornos no configurados. *Recomendación:* firma ECDSA del approver sobre campaignId+timestamp (o sesión autenticada) y fallo en seco si GOVERNANCE no está configurado.
- **H-61 — Ubicación manipulable + data-loss en verificación** [NUEVO]. `PUT /api/users/[address]/location` (route.js:9-18) permite fijar lat/lng de CUALQUIER dirección sin firma ni validación de rangos (lib.js:417-422) → manipulación de la regla de 10 km (369-382); `verifyContactChannels` sobrescribe SIEMPRE los cifrados con `encryptField(email||'')` (662-663), a diferencia de submitKyc que conserva (632-633) → una llamada sin email/phone borra la PII cifrada (data-loss). *Recomendación:* firma ECDSA del address y validación de rangos en PUT location; conservar valores cifrados existentes en verifyContactChannels.
- **H-66 — Identidad: escrituras sin posesión + secreto TOTP en claro** [NUEVO]. `accept_terms` marca terms_accepted de cualquier address (route.js:56-58); `/users/[address]/refresh` recalcula trust_level/last_active de cualquiera; `setup2FASecret` devuelve el secreto TOTP y otpauthUri en claro (lib.js:689-690) y lo sobrescribe en cada llamada (686) → griefing del 2FA de la víctima. *Recomendación:* firma ECDSA/EIP-712 en todos los endpoints de escritura de identidad; devolver el secreto TOTP una sola vez en el alta; proteger el setup contra sobrescritura no autorizada.

#### Frontend y UX

- **H-37 — Dead code** [V2→]. ExchangePlatform, OrderBook, FloatingToolDrawer, UserRegistrationModal y LandingPage sin importadores (solo se referencian entre sí); /help es stub de 10 líneas que ignora help/data.ts (HELP_GUIDES, 481 líneas); assets boilerplate sin referencias (file/globe/next/vercel/window.svg, logo.jpg duplicado); LandingPage.tsx:108 aún afirma 'fondos bloqueados en TruekeEscrow.sol' (falsedad, H-07). *Recomendación:* eliminar/reincorporar los 5 huérfanos, montar /help con HELP_GUIDES, limpiar assets y revisar el claim de TruekeEscrow.
- **H-38 — Flujo catálogo→trueque roto** [V2→]. CTA 'Proponer Trueke Atómico' (AssetCard.tsx:126-132) enlaza a /items/[id] de solo lectura sin contacto ni oferta; CreateOperationModal solo existe en /operations (212-219). *Recomendación:* CTA real en el detalle (modal pre-cargado con propietario/token) o renombrar a 'Ver Detalle'.
- **H-39 — Datos ficticios como reales** [V2→]. Finanzas Comerciales/Inventario/Tesorería estáticos con fechas 2026 y membresías (finances/page.tsx:7-35, inventory:18-29, treasury:7-44); prefills Barlovento 10.4806/-66.1036 (register/page.tsx:23-26) y fallback de registro '@truekeate.com'/'+584120000000' (hooks.ts:505-507); SBT mock 0x2B09…472C y tokenId '1' (identity/page.tsx:255-256); CIDs IPFS falsos 'Qm…' mostrados como certificados con '✓ imagen certificada — SHA-256 + firma ECDSA' (items/new:166-169, items/[id]:82-88, ipfs.ts:34-51) que devuelven 404 en ipfs.io. *Recomendación:* conectar Empresa/Tesorería a API/on-chain o marcar 'demo'; quitar prefills ficticios; pinning real o marcar 'hash local'.
- **H-42 — Detalle de ítem con proxy** [V2→]. 'Intercambios completados' muestra '—' con comentario '{/* rep. total como proxy */}' (items/[id]/page.tsx:132) y toda la página en estilo legado dark:/azul (42,50,59,61,65-146). *Recomendación:* métrica real (getReputation/completedTradesCount) o eliminar la tarjeta; migrar al DS 2.0.
- **H-57 — EIP-712 sin validUntil, nonce compartido** [V2→]. Typehash de create/complete sin validUntil (Escrow.sol:66-70): la firma del intent no expira; `metaNonces` único compartido (72-73,155,196): ejecutar un intent invalida el otro; el cliente lee el nonce justo antes de firmar (relay.ts:108,149) sin reserva. *Recomendación:* validUntil en los typehash (verificado contra block.timestamp) y/o nonces por tipo; documentar la semántica de expiración.
- **H-58 — Errores crudos** [V2→]. `getFriendlyError` devuelve el mensaje crudo de ethers si no está en REVERT_TRANSLATIONS (escrow.ts:131-137); console.warn/error en inglés (hooks.ts:99,112,893,977). *Recomendación:* fallback genérico en español, ampliar REVERT_TRANSLATIONS, unificar idioma de logs.

#### QA y proceso

- **H-26 — Cobertura inexistente** [V2→] *(conflicto A: MEDIA vs F: ALTA → ALTA)*. Sin coverage en vitest.config.ts (12-17) ni @vitest/coverage-v8 ni forge coverage en CI; flujos sin cubrir (verificados por ejecución): disputa por terceros (H-01), requester=owner (H-02), cancel/refund/dispute de TruekeEscrow (TruekeMultiAsset.t.sol:65-200 solo happy path), removeToken/expiración de Exchange (5 tests), renew/withdraw de Subscription, claim duplicado en SBTRegistry. Mejora: Governance ya cubre empate/quorum/ventana. *Recomendación:* @vitest/coverage-v8 y forge coverage con umbrales (≥80% líneas, ≥70% ramas) y tests de los flujos listados.
- **H-51 — CI/CD no operativo** [V2→] *(conflicto E: ALTA vs F: MEDIA → ALTA)*. Workflow solo en `sc/.github/workflows/test.yml` (GitHub Actions no lo descubre desde subcarpeta); sin .github/ ni .gitlab-ci.yml en raíz; **nuevo detalle:** el job web fija `node-version: 20` (test.yml:54) pero `db.js:14` importa `node:sqlite` (≥22.5) → el pipeline no podría ser verde; sin jobs E2E ni cobertura; package.json sin engines. *Recomendación:* .gitlab-ci.yml en raíz (forge test+coverage, lint/typecheck/vitest con umbrales, job E2E con anvil+web+BD, job gitleaks) o mover el workflow; node ≥22.5.
- **H-52 — IPFS simulado** [V2→]. `uploadToIPFS` construye 'Qm'+44 hex sin subir ni pinning (ipfs.ts:30-51; el comentario de Pinata en :32 es solo promesa); REGISTRO:217 mantiene PINATA_JWT/IPFS_KEY sin consumidores. *Recomendación:* pinning real (Pinata/web3.storage) o eliminar la promesa; librería oficial CIDv0; marcar 'hash local' en UI; retirar secretos IPFS no usados.
- **H-55 — E2E: (a) corregido, (b) empeorado** [V2→~] *(conflicto E: MEDIA vs F: ALTA → ALTA)*. (a) CORREGIDO: playwright declarado (package.json:39) e instalado; run-e2e 54/54, exit 0. (b) FATAL: contracts-test.mjs muere en D3 'Already a socio' (estado on-chain persistente; deploy-local.sh solo setSocio a cuentas 0,1,2; la cuenta 'free' quedó socio de corridas previas); muta estado y depende de BD persistente (D7 solo tolera ops sin valorar, D8 necesita operaciones activas); un fallo FATAL no escribe report-d.json (371-377). *Recomendación:* suite D idempotente (cuentas frescas por run, BD aislada, teardown), report-d.json también en FATAL, job de CI con servicios levantados; script npm 'test:e2e' documentado.
- **H-67 — Sin proceso de seguimiento** [NUEVO]. INFORME_OPTIMIZACION_V2.md está sin commitear (git status `??`); el único commit post-auditoría es d54a1e2 (solo H-55a); ningún documento/issue referencia H-01…H-59; no hay backlog ni responsables. *Recomendación:* commitear el V2, crear backlog versionado (estado Abierto/En progreso/Corregido/Verificado) o issues en GitLab, asignar responsables, job CI que falle con críticos abiertos.
- **H-68 — E2E consagra los flujos inseguros** [NUEVO]. run-e2e.mjs reporta en verde '✓ B7 verificación contacto (123456)' y '✓ B10 KYC enviado (cifrado AES)' → el harness valida como esperado el bypass OTP (H-04) y el KYC auto-aprobado (H-03); C3 solo cubre tercero≠target≠owner (425-428) y nunca `requester=owner`; sin checks de disputa por terceros. Corregir la seguridad romperá estos checks si no se actualizan los criterios. *Recomendación:* B7 debe esperar rechazo de '123456', B10 verificación con rol, y añadir checks de seguridad (requester=owner → 401/403, tercero disputa → revert, KYC sin firma → 401); vincular el E2E a los criterios C1-C3 del V2.

---

## 6. Plan de acción priorizado

### ⚡ Quick wins (esfuerzo S — 1ª iteración, cierran o reducen críticos)

| # | Hallazgo | Acción concreta | Responsable sugerido |
|---|---|---|---|
| QW-1 | H-04 | Eliminar fallbacks '123456'/vacío en cliente (identity/page.tsx:181-182) y servidor (lib.js:655-656); bloquear por NODE_ENV=production | Backend + Frontend |
| QW-2 | H-05 | On-chain solo hashes con salt; `UserRegistered` sin PII (UserRegistry.sol:22-36,126-138) | Smart Contracts |
| QW-3 | H-01 | Restringir `disputeOperation`/`disputeTrade`/`setInTransit` a user1/user2 + test de revert de tercero (S) | Smart Contracts |
| QW-4 | H-02 | Firma EIP-191/712 del `requester` (ethers.verifyMessage) antes de devolver PII + tests requester=víctima/owner | Backend |
| QW-5 | H-03 | Separar kyc_submitted/kyc_verified; firma obligatoria; nunca auto-otorgar 'certificado' | Backend |
| QW-6 | H-06 | Eliminar secretos de los 7 archivos versionados; fallar en seco si faltan KYC_SECRET/RELAYER_PRIVATE_KEY; borrar generación de deployment-info.txt con claves | DevOps/Seguridad |
| QW-7 | H-66 | Firma en accept_terms/refresh; secreto TOTP una sola vez en el alta | Backend |
| QW-8 | H-60 | Firma ECDSA del approver y quitar default address(0) de GOVERNANCE | Backend |
| QW-9 | H-61 | Firma + rangos en PUT location; conservar cifrados en verifyContactChannels | Backend |
| QW-10 | H-46 | Unificar marca 'TrueKeate' + grep TrueKeat en CI | Frontend |
| QW-11 | H-31 | Validar limit/offset ≥0 y escapar %/_ en búsquedas | Backend |
| QW-12 | H-55(b) | Hacer la suite D idempotente (cuentas frescas, teardown, reporte en FATAL) | QA |

### 🚀 Mejoras (esfuerzo M — 2ª iteración)

| # | Hallazgo | Acción concreta | Responsable sugerido |
|---|---|---|---|
| M-1 | H-17 | BRLT con ERC20Permit (o fallback a approve) + añadir BRLT a la allowlist de deploy + test meta con BRLT real | Smart Contracts |
| M-2 | H-11 | Relayer: rate limiting por IP/wallet, allowlist de tokens, staticCall + gas estimado, timeouts, alertas de saldo, errores genéricos | Backend |
| M-3 | H-14 | Firma ECDSA en TODOS los endpoints de escritura; closeMeetup con address+firma | Backend |
| M-4 | H-13 | Escalada de identidad vía `setUserIdentificationLevel` on-chain; BD como caché de lectura | Backend + Smart Contracts |
| M-5 | H-08 | Conectar `sanctioned` a Escrow/Exchange/TruekeSBT; arbitraje multisig con timelock; votación para removeSanction | Smart Contracts |
| M-6 | H-10 | Gate on-chain de registro/nivel en create/complete; vínculo on-chain de user2 (intent 'accept'); tests de revert | Smart Contracts |
| M-7 | H-18 | Middleware global (rate limit + headers), audit_log, 500s genéricos, timeouts RPC | Backend |
| M-8 | H-26 | @vitest/coverage-v8 + forge coverage con umbrales (≥80/≥70) y tests de disputa por terceros, TruekeEscrow completo, Exchange removeToken/expiración | QA |
| M-9 | H-68 | Actualizar criterios E2E a seguridad (B7 rechazo '123456', B10 con rol, checks requester=owner y tercero→revert) | QA |
| M-10 | H-51 | .gitlab-ci.yml en raíz (forge+coverage, lint/typecheck/vitest, E2E, gitleaks) y Node ≥22.5 | DevOps |
| M-11 | H-67 | Commitear V2, crear backlog versionado H-01…H-71 con responsables y estados | PM/Gobernanza |
| M-12 | H-16 | Multi-red por entorno (NEXT_PUBLIC_CHAIN_ID/RPC_URL), bloquear fallbacks locales en producción | Frontend + Backend |
| M-13 | H-19 | Cuotas parametrizables con política fail-closed y contador de ambas partes | Smart Contracts |
| M-14 | H-57 | validUntil en typehash y/o nonces por tipo | Smart Contracts |
| M-15 | H-36/H-37/H-38/H-39/H-40 | Migrar UI al DS 2.0, eliminar dead code, arreglar flujo catálogo→trueque, marcar datos demo, estados de carga/error/vacío | Frontend |
| M-16 | H-62/H-63 | Decidir visibilidad del catálogo y alinear el copy de la landing con la funcionalidad real | Producto + Frontend |
| M-17 | H-49 | Matriz de stakeholders con RBAC; endpoints off-chain para árbitros; financiación del relayer | Producto + Backend |
| M-18 | H-64 | Formato de clave versionado (v1:iv:tag:data), KDF con salt y runbook de rotación de KYC_SECRET | Seguridad |

### 🗺️ Roadmap (esfuerzo L — 3ª iteración / siguientes versiones)

| # | Hallazgo | Acción concreta | Responsable sugerido |
|---|---|---|---|
| R-1 | H-25 | NFRs de contratos: Pausable/circuit breaker, decisión de upgradeabilidad (proxies), timelock/multisig admin, límites de iteración en views | Smart Contracts |
| R-2 | H-07 | Decidir contrato canónico: integrar TruekeEscrow completo (deploy, ABI, indexer con backfill, tests) o eliminarlo/marcarlo experimental; corregir Landing | Arquitectura |
| R-3 | H-09 | Modelo único de intercambio con expiración de órdenes y validación uniforme de tokens | Smart Contracts |
| R-4 | H-15 | Módulo de cumplimiento por nivel (rubros, artículos, 3%, 5 avales); decisión de alcance de subastas/encargo | Producto |
| R-5 | H-56 | Documento de NFRs (SLA 14 días, RPO/RTO, monitoreo con alertas, backups/DR, runbooks), auditoría externa de sc/src, bug bounty, AML/OFAC | Seguridad + Operaciones |
| R-6 | H-65 | Regenerar INFORME_CUMPLIMIENTO con evidencia real; sección RGPD/Habeas Data con DPO y matriz de datos personales; estado 'Development only' hasta cerrar críticos | Cumplimiento |
| R-7 | H-70 | Matriz M1–M16 oficial con criterios; implementar M6 (KYC real/ERC-4337) y M14 (despliegue GCP validado) | Producto + DevOps |
| R-8 | H-22 | Cobro automático de suscripción (pull/keeper), contabilidad por periodo, gates de empresa | Smart Contracts |
| R-9 | H-52 | IPFS/pinning real (Pinata/web3.storage) o eliminar la promesa; retirar secretos no usados | Backend |
| R-10 | H-50/H-71 | Regenerar toda la documentación desde artefactos reales; eliminar duplicados; GCP_DEPLOY validado con despliegue real | Docs/DevOps |

---

## 7. Criterios de aceptación para la siguiente versión (V4)

El repo se considerará listo para re-auditoría V4 cuando se cumplan **todos** los criterios verificables:

1. **C1 — Críticos cerrados:** H-01…H-06 y H-65 marcados como Corregido con test de regresión (test de revert de tercero en disputa/setInTransit; tests de seguridad requester=víctima y requester=owner; KYC sin firma → 401; '123456' rechazado en cliente y servidor; PII fuera de eventos on-chain; 0 secretos en archivos trackeados).
2. **C2 — Secretos:** ninguna credencial/clave en archivos versionados (verificable con gitleaks/trufflehog en CI); fallo en seco en producción ante KYC_SECRET/RELAYER_PRIVATE_KEY ausentes; sin generación de deployment-info.txt con claves.
3. **C3 — Autorización:** firma ECDSA/EIP-712 verificada en todos los endpoints de escritura y en toda lectura de datos privados; `requester` tratado solo como sugerencia.
4. **C4 — Identidad:** la BD es caché de lectura del estado on-chain (escalada vía identityAdmin); sin divergencias 'certificado' en BD vs 'inscrito' on-chain.
5. **C5 — Cobertura:** `vitest --coverage` y `forge coverage` con umbrales (líneas ≥80%, ramas ≥70%) y flujos críticos (disputa por terceros, TruekeEscrow completo, Exchange removeToken/expiración) cubiertos.
6. **C6 — E2E reproducible:** run-e2e (UI) y contracts-test (contratos) verdes en 2 ejecuciones consecutivas sobre despliegue limpio, con criterios de seguridad actualizados (sin '123456' ni KYC auto-aprobado como checks verdes).
7. **C7 — CI/CD operativo:** pipeline en la raíz (`.gitlab-ci.yml` o `.github/workflows/`) que ejecuta forge test+coverage, tsc, lint, vitest y E2E con Node ≥22.5, y falla ante críticos abiertos.
8. **C8 — Documentación alineada:** MANUAL_TECNICO/USUARIO/OPERACIONES regenerados desde ABIs y firmas reales; REGISTRO/INFORME_CUMPLIMIENTO sin declaraciones de 'Producción Ready' ni '100% Cumplido' mientras haya críticos abiertos; una sola fuente de spec y de manuales.
9. **C9 — Multi-red:** la app y el relayer operan con configuración por entorno (chainId/RPC/direcciones) y bloquean fallbacks locales/Anvil en producción.
10. **C10 — NFRs documentados:** documento de NFRs (SLA de disputas con ventana on-chain, monitoreo con alertas, backups/restore, runbooks) y matriz de stakeholders con responsables.

> **Definición de fin de V3:** este informe queda commiteado en el repo (H-67) y cada hallazgo H-01…H-71 recibe responsable y estado en el backlog antes de iniciar los Quick wins QW-1…QW-12.
