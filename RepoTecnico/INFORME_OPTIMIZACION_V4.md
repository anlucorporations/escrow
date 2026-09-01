# INFORME DE OPTIMIZACIÓN V4 — TrueKeate / Escrow-DeepSeek

**Proyecto:** `/home/dsh/workspace/escrow-deepseek`
**Tipo:** Auditoría integral (3 fases, 7 lentes) con verificación adversarial por dimensión
**Fecha:** Sesión de auditoría V4
**Precedido por:** INFORME_OPTIMIZACION_V2.md, INFORME_OPTIMIZACION_V3.md

---

## 1) Resumen ejecutivo — Veredicto

**Veredicto: NO APTO PARA PRODUCCIÓN CON DATOS REALES. Apto únicamente como demo funcional/entorno de preview.**

La plataforma está **funcionalmente completa** (59/59 tests, typecheck OK, build standalone OK, despliegue GCP verificado) y muestra buenas prácticas on-chain en partes (ReentrancyGuard/Ownable, firma EIP-712 para meta-transacciones, SafeERC20 en Escrow/Exchange). Sin embargo, la verificación adversarial de las 7 dimensiones confirmó **24 hallazgos consolidados: 7 CRÍTICOS, 8 ALTOS, 7 MEDIOS, 2 BAJOS**, con 0 falsos positivos entre los hallazgos supervivientes.

Los hallazgos CRÍTICOS bloquean la puesta en producción con usuarios y fondos reales:

1. **La verificación de identidad es forjable de punta a punta** (H-01): códigos OTP vacíos o de 6 caracteres, 2FA que nunca valida TOTP y KYC auto-aprobado sin gate de entorno. Cualquiera puede marcarse "verificado/certificado", desbloqueando trueques ilimitados y la capacidad de avalar.
2. **Fuga de PII descifrada vía IDOR** (H-02): `GET /api/identity/[address]` entrega email/teléfono en claro de cualquier usuario sin prueba de propiedad de la wallet.
3. **PII en claro on-chain** (H-03): `UserRegistry` almacena y emite email/teléfono/dirección en la blockchain pública e inmutable, violando el propio brief (solo hash/merkle root) e imposibilitando el derecho al olvido (GDPR Art. 17).
4. **El flujo de disputas puede perder fondos** (H-04): un tercero arbitrario puede quedar registrado como contraparte y recibir el depósito sin haber depositado nada; el árbitro (EOA único) resuelve unilateralmente; no existe el cierre bilateral "irregular/no efectivo" que exige el brief.
5. **Las reglas centrales de niveles del brief no existen en el código** (H-05): umbrales inventados (3.5/3, 4.2/25) que ignoran apelaciones, rubros, 3%, inactividad y límites por rol; conviven 4 taxonomías paralelas sin reconciliar.
6. **El indexador se autodestruye a los 30 minutos** (H-06): Cloud Run Job de un solo disparo sin scheduler ni checkpoint; toda la capa off-chain (operaciones, reputación, notificaciones, roles) se desincroniza hasta re-ejecución manual, sin monitoreo ni alertas.
7. **Deseos centrales del brief ausentes** (H-07): ERC-4337/Smart Accounts/merkle root no implementados y sustituidos por un mecanismo SBT que el brief no pide.

**Criterio de aceptación para V5:** cerrar los 7 CRÍTICOS con tests que demuestren el rechazo (códigos incorrectos, no-aprobación automática en producción, no-exposición de PII, no-pérdida de fondos en disputa, sincronización continua del indexador) antes de considerar producción con datos reales.

---

## 2) Metodología (3 fases, 7 lentes)

**Fase 1 — REVISAR:** 7 revisores en paralelo, uno por lente, sobre el código real del repositorio (lectura-only, evidencia `ruta:línea`, máximo 12 hallazgos por lente).

**Fase 2 — VERIFICAR (adversarial por dimensión):** 7 verificadores contrastaron los hallazgos del revisor contra el código con `read`/`grep`. Resultado: **0 falsos positivos puros** entre los supervivientes; se corrigieron imprecisiones puntuales (p. ej. PostGIS sí se habilita en `setup-gcp-db.mjs:37` pero la regla de 10 km usa haversine en JS; el fallback del relayer usa clave privada de Anvil #4, no pública, protegida con `envOrThrow`) y se aplicaron deduplicaciones por causa raíz dentro de cada dimensión (84 candidatos → 69 hallazgos verificados). Regla aplicada: ante la duda, descartar.

**Fase 3 — SINTETIZAR (este informe):** deduplicación cruzada entre las 7 dimensiones por causa raíz común (69 → 24 hallazgos únicos H-01…H-24), asignación de IDs, priorización por severidad y plan de acción. Solo se consolidan hallazgos presentes en los informes verificados; no se añade ninguno nuevo.

| Lente | Enfoque |
|---|---|
| R1 | Ambigüedad y testabilidad (criterios vagos no medibles ni verificables) |
| R2 | Consistencia (docs vs código, estados, versiones, requisitos sin hito) |
| R3 | Completitud RNF (ISO 25010: fiabilidad, observabilidad, seguridad, cumplimiento) |
| R4 | Stakeholders (actores ausentes o sin rol: verificador, árbitro, soporte, moderación, logística, tesorería) |
| R5 | Trazabilidad con el brief (deseos perdidos y requisitos inventados) |
| R6 | Riesgos técnicos (SPOF, escala, despliegue GCP, indexador, IPFS, relayer) |
| R7 | Seguridad y legal (PII/GDPR, IDOR, control de acceso, tokens, claves) |

---

## 3) Estado de calidad (métricas verificadas)

| Métrica | Resultado | Verificación |
|---|---|---|
| Tests unitarios (vitest) | **59/59 OK** | `web/scripts/e2e/REPORTE.md:4`; CI `sc/.github/workflows/test.yml` |
| Typecheck (tsc) | **OK** | CI job web (Lint/Typecheck/Unit tests/Build) |
| Build standalone (Next.js) | **OK** | CI job web + `web/next.config.ts` (output standalone) |
| Despliegue GCP | **Verificado** | `deploy-gcp.sh` (web + indexador + Cloud SQL), `deploy-contracts-gcp.sh` |

**Matices verificados que matizan las métricas:**

- El **59/59 no cuantifica criterios cubiertos**: `vitest.config.ts:12-17` no declara coverage ni thresholds y el CI ejecuta `forge test`/`vitest` sin paso de cobertura (H-24). Flujos de negocio centrales (openMeetup, createMeetup, createVouch/5 avales, penalización por inactividad, límites de artículos, rama de 10 km sin ubicación) **no tienen tests** (grep en `web/test` = 0).
- La suite **E2E Playwright** existe (`web/scripts/e2e/run-e2e.mjs`) pero **no corre en el CI** (solo lint/typecheck/vitest/build), por lo que regresiones de integración pasan desapercibidas.
- Los tests existentes codifican la implementación actual (p. ej. `truekeate.test.ts:26-28` fija que empresa con 0/0 operaciones = 'frecuente'; `identity.test.ts:38-63` solo prueba el camino feliz con '123456'), no criterios del brief.

---

## 4) Tabla por severidad (24 hallazgos consolidados H-01…H-24)

### CRÍTICA (7)

| ID | Hallazgo (título corto) | Área | Origen (dimensión) |
|---|---|---|---|
| **H-01** | Cadena de verificación de identidad forjable: OTP vacío/6 chars, 2FA sin TOTP, KYC auto-aprobado sin gate de producción, firma SBT opcional | Identidad/Verificación | R1-C, R3-C, R4-C, R7-C |
| **H-02** | IDOR en `/api/identity/[address]`: fuga de PII descifrada (email/teléfono, hashes doc/selfie, 2FA) sin prueba de propiedad de la wallet | API / Confidencialidad | R3-C, R7-C |
| **H-03** | PII en claro on-chain: `UserRegistry` almacena y emite email/phone/physicalAddress en struct y eventos; lectura pública paginada | Contratos / GDPR | R7-C |
| **H-04** | Flujo de disputas roto: tercero arbitrario registrado como contraparte (puede ganar fondos sin depositar), árbitro EOA único unilateral, sin cierre bilateral "irregular/no efectivo", solo se transfiere una pata | Disputas/Custodia | R2-C, R4-C, R7-A |
| **H-05** | Reglas de niveles del brief no implementadas: umbrales inventados (3.5/3, 4.2/25), sin apelaciones/rubros/3%/inactividad, 'frecuente' incondicional, 4 taxonomías paralelas | Niveles/Confianza | R1-A, R2-A, R4-M, R5-C |
| **H-06** | Indexador no apto para producción: Cloud Run Job 30 min sin scheduler ni reintentos, sin checkpoint (re-escaneo bloque 0, notificaciones duplicadas, eventos perdidos), cobertura declarada vs real, sin monitoreo/health/alertas | Indexador/GCP | R2-A, R3-A, R6-C |
| **H-07** | ERC-4337/Smart Accounts/merkle root ausentes: deseo central del brief sustituido por SBT sin trazabilidad | Trazabilidad brief | R5-C |

### ALTA (8)

| ID | Hallazgo (título corto) | Área | Origen |
|---|---|---|---|
| **H-08** | TruekeEscrow (escrow multi-activo) es un contrato huérfano: la Landing lo promociona, nada lo despliega/indexa/expone; semántica de estados/deadline divergente | Arquitectura/Integración | R2-A |
| **H-09** | `UserRegistry` on-chain nunca se alimenta desde la web: KYC/2FA/SBT escriben solo en PostgreSQL; `recordTradeOutcome` sin callers; la cuota del Escrow (1/3/∞) lee un contrato desactualizado | Identidad/Reputación (BD vs cadena) | R2-A |
| **H-10** | Escrituras off-chain sin firma: valoraciones (suplantación del rater + auto-dealing con mint libre), meetups y vouches aceptan la identidad del cliente sin prueba; la reputación (núcleo del brief) es manipulable | Seguridad/Integridad | R3-A, R7-A |
| **H-11** | Gate de acceso y avales sin enforcement: AccessGate concede todo con solo inscribirse (Nivel 1), `Escrow.sol` no valida registro en create/complete, y la regla "5 avales = aceptación" es solo un comentario sin código | Acceso/Registro | R1-A, R5-A |
| **H-12** | Relayer `/api/relay` sin autenticación ni rate-limit (DoS de gas y del nodo compartido), carrera de nonces con `--max-instances=2`, `tx.wait()` sin timeout ni idempotencia | Relayer/Operación | R3-A, R4-A, R6-A |
| **H-13** | Infraestructura SPOF: un único RPC_URL sin fallback/retry/caché (indexador, relayer, APIs y bundle del cliente), nodo Foundry compartido cuyo reset invalida direcciones, `/api/stats` sin caché (hasta 8 eth_call), fail-open a localhost, Cloud SQL db-f1-micro sin timeouts, footgun de imagen AR vs gcr.io | Infraestructura/RPC/BD | R3-M, R6-A, R7-M |
| **H-14** | Gobernanza de claves y roles: `identityAdmin` único puede fijar identidad/reputación de todos, tesorería (BRLT + depósitos de Socios) retirable en su totalidad por un solo owner, aprobación de campañas falsificable (approver del body, sin firma), ruta `--preview` con claves Anvil públicas hacia el nodo remoto compartido | Custodia/Claves | R4-A, R7-A |
| **H-15** | Sanciones de Governance sin efecto operativo: `isSanctioned` no se consulta en ningún contrato, API ni UI; el brief exige bloquear el intercambio ante violación de norma | Moderación/Sanciones | R4-A |

### MEDIA (7)

| ID | Hallazgo (título corto) | Área | Origen |
|---|---|---|---|
| **H-16** | Deseos perdidos: subastas (empresas), 'encargo' (particulares), publicaciones AtoA ("qué quiero recibir"), regla de 10 km sin PostGIS (haversine JS), establecimientos de retiro/delivery sin flujo real ni aprobación de Socios | Trazabilidad brief | R2-M, R5-A/M |
| **H-17** | Requisitos inventados sin base en el brief: Exchange.sol (libro de órdenes), tokenización RWA/SBT/vouchers (TruekeRWA/TruekeService/TruekeSBT) y 2FA TOTP, todos desplegados/indexados sin autorización trazable | Trazabilidad brief | R5-M/B |
| **H-18** | Reglas de encuentro M7 sin aplicar: ventana implementada como ±10 min (permite abrir ANTES de la hora, hora del cliente), sin gating por nivel ni "zonas registradas", rama sin ubicación acepta con distanceKm=null, sin ruta "cómo llegar" en móvil | Encuentros/Geolocalización | R1-M, R5-M |
| **H-19** | Gobernanza con parámetros arbitrarios: ventanas 3/5 días, quórum 2, "mayoría simple" (1 voto aprueba la admisión de Socio), motivación ≥10 chars, sin criterio fuente; TruekeEscrow/Governance aceptan tokens arbitrarios sin verificar retornos (allowlist ausente) | Gobernanza/Contratos | R1-M, R7-M |
| **H-20** | Estados y sincronización BD-cadena rotos: disputa reembolsada se registra 'Completed' (cadena, indexador y UI); `SocioSet(flag=false)` sigue marcando role='socio'; suscripción siempre 'mensual'/'active' sin expirar pese a soportar 1-12 meses | Estados/Indexador | R2-M |
| **H-21** | Documentación desactualizada: brief dice Next.js 14 (código 16), pragmas mixtos ^0.8.13/^0.8.20, README raíz documenta la DApp legacy ERC20, INFORME_CUMPLIMIENTO declara 6 contratos cuando se despliegan 14 y contracts.ts exporta 11 ABIs | Documentación | R2-M |
| **H-22** | Seguridad perimetral y accesibilidad: sin Content-Security-Policy ni security headers (no hay `headers()` ni `middleware.ts`), accesibilidad sin objetivo WCAG ni tests axe, indicadores de foco débiles (outline-none), `<img>` sin dimensiones | Seguridad Web/UX | R3-M |

### BAJA (2)

| ID | Hallazgo (título corto) | Área | Origen |
|---|---|---|---|
| **H-23** | Gobernanza de datos de producción ausente: backups de Cloud SQL sin runbook de restauración/RPO/RTO ni prueba, PII sin cumplimiento RGPD (sin política de privacidad, consentimiento auditable, borrado/exportación), PII en logs (username + coordenadas UTM del indexador) | Datos/Cumplimiento | R3-M, R7-M |
| **H-24** | Calidad de pruebas y mantenibilidad: sin cobertura ni umbrales en CI, E2E fuera del CI, LandingPage.tsx muerto con métricas inventadas, IPFS simulado (pseudo-CIDs deterministas, PINATA_JWT nunca se lee, URLs 404) | Testing/Mantenibilidad | R1-B, R3-M |

---

## 5) Hallazgos críticos detallados (evidencia + recomendación)

### H-01 — CRÍTICA · Identidad/Verificación: la cadena "usuario verificado" es completamente forjable

**Evidencia:** `web/server/lib.js:655-679` (`verifyContactChannels` acepta `!emailCode || emailCode === "123456" || emailCode.length === 6`, en cualquier entorno); `:697-717` (`confirm2FA` solo valida `/^\d{6}$/`; el secreto `two_factor_secret` se genera y cifra en `setup2FASecret` `:682-694` pero **nunca se valida ningún código TOTP contra él** — grep global confirma; sin librería otplib en `web/package.json`); `:633-641` (`submitKyc` fija `kyc_status='verified'` e `identification_level='certificado'` incondicionalmente pese al comentario "en demo se auto-aprueba" — sin rama por NODE_ENV); `:720-751` (`verifyThirdPartySBT` hace la firma de posesión **opcional** `if (signature)` y nunca consulta `SBTRegistry` on-chain). Rutas sin autenticación: `web/app/api/identity/verify-contact/route.js:8-22`, `web/app/api/identity/2fa/route.js:10-34`, `web/app/api/identity/verify-sbt/route.js:8-22`, `web/app/api/users/[address]/kyc/route.js:11-29` (además SOBRESCRIBE email/teléfono cifrados de la víctima). El frontend envía '123456' por defecto (`web/app/(platform)/identity/page.tsx:181-182`). Impacto real: Verificado→3 trueques activos, Certificado→ilimitados (`web/lib/hooks.ts:956-963`), y `kyc_status='verified'` es requisito para avalar (`lib.js:437`). Tests: `web/test/identity.test.ts:38-63` solo camino feliz con '123456', sin casos negativos. *(Consolidado de R1-C, R3-C, R4-C, R7-C — 4 dimensiones convergen en la misma causa raíz: no existe actor verificador ni validación criptográfica.)*

**Recomendación:** (1) OTP reales de un solo uso con expiración y rate-limiting; (2) validación TOTP real contra el secreto (otplib) antes de habilitar 2FA; (3) separar `kyc_submitted` (auto-reporte) de `kyc_verified` (aprobación por un rol verificador real) y gatear todo comportamiento demo con `NODE_ENV==='production'` explícito, nunca por comentario; (4) firma ECDSA del titular (EIP-191/712 con challenge) en TODOS los endpoints de identidad; (5) verificar tenencia del SBT contra el contrato (balanceOf/ownerOf); (6) tests que demuestren el rechazo de códigos vacíos/incorrectos y la no-aprobación automática en producción.

### H-02 — CRÍTICA · API/Confidencialidad: IDOR en `/api/identity/[address]` filtra PII descifrada

**Evidencia:** `web/app/api/identity/[address]/route.js:34` toma `requester` del query string sin verificar firma ni posesión de la wallet; `web/server/lib.js:754-757` (`isSelf = requester === target`, comparación de strings) y `:783-797` devuelven email/teléfono **descifrados** (`decryptField` AES-256-GCM, `lib.js:615-624`), `document_hash`, `selfie_hash` y estado 2FA. Basta `GET /api/identity/0xVictim?requester=0xVictim`. Además `isOwner` deriva de `escrow.owner()` (dirección pública on-chain, `route.js:14-27`), con lo que `requester=<owner>` expone la PII de todos los usuarios. Contraste: `web/app/api/items/route.js:33-39` sí exige firma ECDSA. *(Consolidado de R3-C y R7-C.)*

**Recomendación:** exigir prueba criptográfica de propiedad de la wallet (firma EIP-712/ECDSA sobre `{targetAddress, timestamp}`, verificada con `verifyMessage` — patrón ya existente en `lib.js:288`); eliminar el acceso "owner" por dirección pública; rate-limiting y auditoría de accesos a PII; proteger también el POST (accept_terms) con firma.

### H-03 — CRÍTICA · Contratos/GDPR: PII en claro on-chain en `UserRegistry`

**Evidencia:** `sc/src/UserRegistry.sol:104-118` almacena `email`, `phone` y `physicalAddress` como strings en el struct `UserProfile` (solo la unicidad se hashea); `:126-138` el evento `UserRegistered` los **emite en claro** en el log de la blockchain; `:222-224` y `:231-246` (`getUserProfile` y `getRegisteredWalletsPaged`, públicos) permiten leer el perfil completo de todos los usuarios. La blockchain es pública e inmutable: el derecho al olvido (GDPR Art. 17) es imposible. Contradice el propio brief, que exige subir solo un hash/Merkle root del KYC cifrado "sin revelar la identidad real". `scripts/deploy-contracts-gcp.sh:157` registra al superadmin con email/teléfono/dirección en claro. *(R7-C.)*

**Recomendación:** rediseñar el registro on-chain para subir solo hashes (email/phone) o un Merkle root del KYC cifrado; eliminar email/phone/physicalAddress del struct y de los eventos; si ya hay datos desplegados, plan de retiro/rotación del contrato y notificación a los afectados.

### H-04 — CRÍTICA · Disputas/Custodia: el flujo de arbitraje contradice el brief y puede perder fondos

**Evidencia:** `sc/src/Escrow.sol:406-419` y `sc/src/TruekeEscrow.sol:244-259` (`disputeTrade`/`disputeOperation` sin restricción de llamador; `:413-415` y `:253-255`: si `user2==0`, el **disputador arbitrario queda registrado como contraparte on-chain** — el indexador lo cementa en BD, `web/scripts/indexer.mjs:247-251`); `TruekeEscrow.sol:161-180` (`setInTransit` hace lo mismo y mueve a InTransit sin depósito, bloqueando la cancelación: `cancelTrade` solo Pending, `:209-221`; con `deadline==0` los fondos quedan retenidos indefinidamente, `refundAfterExpiry` revierte, `:224-240`); resolución por **un único árbitro EOA** (`onlyArbiter`, `setArbiter` soloOwner, `:98-110`) sin votación de Socios ni apelación — el brief asigna a los Socios el rol de mediadores (Governance no tiene funciones de disputas); `resolveDispute` solo transfiere una pata (`Escrow.sol:438`; `TruekeEscrow.sol:277`) y **no verifica que user2 haya depositado**; el Escrow legacy ni siquiera recibe tokenB (va directo user2→user1 en `completeOperation`, `Escrow.sol:349-350`). No existe estado ni acción de cierre bilateral "irregular/no efectivo" con devolución a ambos (brief:45). Además `TruekeEscrow.disputeTrade` omite el chequeo de deadline del legacy (`Escrow.sol:411`). *(Consolidado de R2-C, R4-C y R7-A — mismo mecanismo `disputeTrade`/`setInTransit`.)*

**Recomendación:** restringir `disputeOperation`/`disputeTrade`/`setInTransit` a user1/user2 o a quien ya depositó (o a un rol courier autorizado); resolver disputas por votación de Socios (Governance) o multisig con timelock y ventana de resolución; implementar el cierre "irregular/no efectivo" con devolución bilateral de ambas patas y autorización de ambas partes; exigir depósito de la contraparte antes de resolver a su favor; exigir `deadline != 0` o mecanismo de escape; corregir los handlers del indexador.

### H-05 — CRÍTICA · Niveles/Confianza: las reglas centrales del brief no existen; umbrales inventados y 4 taxonomías paralelas

**Evidencia:** `escrow-TrueKeate.md:29-33` define Iniciado/Común/Frecuente/Socio por "combinación de valor": reputación + volumen de transacciones efectivas + **volumen de intercambios en apelación**, con reglas cuantitativas (3% del rubro, máx 5/20 rubros, 50 artículos, penalización por inactividad >5%). La implementación: `web/server/lib.js:14-17` (`LEVEL_RULES` con umbrales **inventados** 3.5/3 y 4.2/25, sin apelaciones) y `:36-46` (`computeTrustLevel`: `isBusiness` → 'frecuente' incondicional antes de evaluar umbrales — empresa con 0/0 = Frecuente, codificado en `web/test/truekeate.test.ts:26-28`; `isSocio` por flag); `:180-228` (`validateItem`/`createItem` sin límite de artículos/rubros por owner); 'rubro' no existe en la lógica de negocio (solo labels UI); no hay rutina de penalización por inactividad (`last_active_at` solo se actualiza). Conviven 4 ejes sin mapeo: `trust_level` (db.js:149), `identification_level` (370), `role` (382) y `reputation_rank/completed_trades` (383-385), más la escala on-chain del Escrow (Inscrito=0→1, Verificado=1→3, Certificado=2→ilimitado, `Escrow.sol:303-316`) y el sistema Bronce/Plata/Oro de `UserRegistry.sol:158-174` (50/1000 completados, efectividad 80%/90%), sin reconciliar. *(Consolidado de R1-A×2, R2-A, R4-M, R5-C; elevado a CRÍTICA porque sustituye íntegramente las reglas detalladas del brief por umbrales no documentados que gatean operaciones.)*

**Recomendación:** definir formalmente la fórmula de niveles (pesos de reputación, transacciones efectivas y apelaciones con rangos) como decisión de producto aprobada y documentada; implementarla con tests de casos límite; decidir 'rubro' (taxonomía), el denominador del 3%, la duración/fórmula de la penalización por inactividad y los límites por rol (5 particular / >5 empresa / 20 rubros / 50 artículos) con enforcement; reconciliar o eliminar los sistemas on-chain paralelos (Bronce/Plata/Oro, cuota por identification_level).

### H-06 — CRÍTICA · Indexador/GCP: la capa off-chain se desincroniza indefinidamente

**Evidencia:** `deploy-gcp.sh:232-245` crea el indexador como **Cloud Run Job** con `--task-timeout=30m` y `--max-retries=0`, de ejecución **manual** (`gcloud run jobs execute`); no existe Cloud Scheduler/cron en el repo (el único match es el paquete npm 'scheduler' de React). El proceso es un listener de larga duración (`indexer.mjs:595-597`): a los 30 min muere y no hay relanzamiento; operaciones, reputación, notificaciones, roles de socio y suscripciones quedan congelados hasta re-ejecución manual. `START_BLOCK=0` (`indexer.mjs:68`) fuerza re-escaneo desde el bloque 0 en cada arranque (`backfillLogs`, `:289-325`) solo para Escrow/UserRegistry (`:336-448`); Governance/SBTRegistry/TruekeSBT/Subscription solo tienen listeners en vivo (`:505-593`) → **eventos perdidos si el job estuvo caído**; cada arranque re-ejecuta `createNotification` sin deduplicación (`:81-92`). La cabecera promete indexar TruekeRWA/TruekeService/multi-asset y `CredentialRevoked`, pero solo sincroniza 6 contratos y maneja únicamente `CredentialIssued` (`:352-595`). No hay `/api/health`, ni Cloud Monitoring/uptime checks/alertas (la "verificación post-despliegue" son dos curls puntuales, `deploy-gcp.sh:250-257`); logs `console.log` no estructurados. *(Consolidado de R2-A, R3-A y R6-C — tres dimensiones convergen en la misma causa raíz.)*

**Recomendación:** convertir el indexador en Cloud Run Service persistente (o Job vía Cloud Scheduler cada pocos minutos); separar backfill (job puntual) de streaming (servicio) con `last_synced_block` persistido por contrato en BD; generalizar el backfill a todos los contratos y registrar los listeners faltantes (CredentialRevoked, UsernameUpdated); deduplicar notificaciones (unique ref+type+user); añadir `/api/health` (BD+RPC), uptime checks y alertas (job parado, 5xx, saldo del relayer, backlog); logging estructurado JSON.

### H-07 — CRÍTICA · Trazabilidad brief: ERC-4337/Smart Accounts/merkle root ausentes (sustituidos por SBT)

**Evidencia:** el brief (escrow-TrueKeate.md:42) exige registro con correo/teléfono, despliegue de un Smart Account (ERC-4337) con recuperación social/KYC y un hash de validación (merkle root) on-chain que certifique la verificación sin revelar identidad. La implementación registra EOAs (`UserRegistry.sol:78-139`, `msg.sender`) y cifra KYC en PostgreSQL (AES-256-GCM), sin EntryPoint/bundler/Smart Account, recuperación social ni merkle root (grep '4337|EntryPoint|SmartAccount|merkle' en sc/ y web/ = 0 en código). La certificación se sustituyó por el SBT `TruekeSBT`, que el brief no menciona (ver H-17). *(R5-C, con confirmación de la brecha ya señalada en INFORME_OPTIMIZACION_V3.md:146.)*

**Recomendación:** implementar ERC-4337 (Smart Account + entrypoint + bundler) con recuperación social/KYC y comprometer un merkle root del estado de verificación en el Smart Account, o registrar formalmente con el cliente una decisión de alcance documentada que reemplace el mecanismo (el SBT actual no cumple el requisito).

---

### Resumen de los hallazgos ALTA (evidencia y recomendación abreviadas)

- **H-08 — TruekeEscrow huérfano (R2-A):** la Landing promete "fondos y activos bloqueados en TruekeEscrow.sol" (`web/components/LandingPage.tsx:108`), pero `deploy-local.sh:91-105` y `deploy-contracts-gcp.sh` no lo despliegan, `generate-contracts.mjs:27-36` no genera su ABI, `contracts.ts` no exporta `TRUEKE_ESCROW_ADDRESS` (11 ABIs) y el indexador no lo escucha; la web opera con el Escrow legacy. Dos escrows con semántica divergente (estados, cancelación bloqueada en InTransit, deadline=0 que congela fondos). **Recomendación:** decidir el contrato canónico (integrarlo completo o eliminarlo/marcarlo experimental), corregir la Landing y unificar semántica.
- **H-09 — UserRegistry on-chain nunca alimentado (R2-A):** KYC/2FA/SBT escriben `identification_level` solo en BD (`lib.js:638,676,713`; `indexer.mjs:155-168`); `UserRegistry.setUserIdentificationLevel` solo se invoca desde `deploy-local.sh:138-196` (cuentas demo); `recordTradeOutcome` solo aparece en tests (`UserRegistry.t.sol:253-262`); el indexador escucha `ReputationUpdated` (`:489-502`) que nunca se emite. Resultado: usuario 'certificado' en BD limitado a 1 trade por la cuota on-chain (`Escrow.sol:303-316`); contradice "la blockchain es la única fuente de verdad" (brief:14). **Recomendación:** relayer/identityAdmin que llame a ambos contratos tras KYC/cierre/disputa, o documentar identidad/reputación como off-chain y eliminar la lectura on-chain de la cuota.
- **H-10 — Escrituras off-chain sin firma (R3-A, R7-A):** solo `/api/items` verifica firma ECDSA (`route.js:31-41`). `POST /api/ratings` toma `rater` del body (`route.js:35-44`; `validateRating` confía en rater/operationId de cliente, `lib.js:104-121`); con `MockERC20.mint()` público (`MockERC20.sol:21-23`) un atacante crea/completa operaciones entre wallets propias y se auto-otorga 5/5, subiendo de nivel; `POST /api/meetups` (`route.js:29-40`) y `POST /api/vouches` (`route.js:27-30`; solo exige `kyc_status`, evadible vía H-01) idem. **Recomendación:** firma EIP-712 sobre `{action, operationId, nonce, timestamp}` verificada en servidor para toda escritura que cambie reputación; restringir mint de tokens de prueba.
- **H-11 — Gate de acceso y 5 avales sin enforcement (R1-A, R5-A):** `AccessGate.tsx:185-186` concede la suite completa con solo Inscrito (Nivel 1); `Escrow.sol` no valida registro en `createOperation`/`completeOperation`/`meta*` (un wallet no registrado opera con cuota 1); `createVouch` (`lib.js:429-449`) inserta sin contar y ningún endpoint/contrato exige el respaldo de 5 avales (el comentario "5 avales = aceptación de operación" no tiene código). **Recomendación:** gate on-chain de registro/nivel mínimo (alinear con `Exchange.onlyRegisteredUser`) y exigir `count(vouches)>=5` para que un particular opere, con tests de revert.
- **H-12 — Relayer sin control y no idempotente (R3-A, R4-A, R6-A):** `POST /api/relay` (`route.ts:68-122`) es público: cada request hace broadcast inmediato del wallet del relayer (ethers v6) — firmas basura revierten pero queman gas del relayer y saturan el nodo compartido; sin rate-limit ni presupuesto ni tesorería definida (R4: rol 'operador de red' sin palancas). Con `--max-instances=2` (`deploy-gcp.sh:204`) y estado por instancia (`route.ts:24-36`), dos requests concurrentes firman con el mismo nonce (sin NonceManager); `tx.wait()` sin timeout (`route.ts:97,113`) rompe el flujo gasless y no hay tabla de txs en vuelo. **Recomendación:** rate-limit por IP/wallet, `eth_call` de simulación ANTES del broadcast, NonceManager o cola/lock en BD, devolver txHash y persistir pending→confirmed con re-subida, alertas de saldo del relayer.
- **H-13 — Infraestructura SPOF (R3-M, R6-A, R7-M):** un único `RPC_URL` en indexador (`indexer.mjs:61,348`), relayer (`route.ts:28-33`), stats (`route.ts:13-14`), operation (`route.ts:7-8`), identity (`route.js:19-20`) y aprobación de campañas; sin FallbackProvider/retry/caché; `NEXT_PUBLIC_RPC_URL` inlineado en el bundle del cliente (`deploy-gcp.sh:188,219`). Nodo Foundry/Anvil compartido con otros proyectos sin snapshot/load-state; un reset invalida las direcciones desplegadas (REPORTE.md:61). Fallback `|| http://127.0.0.1:8545` en 3 puntos sin fail-fast (a diferencia de BD/secretos) → degradación silenciosa. `/api/stats` hace hasta 8 eth_call por visita sin caché; Cloud SQL `db-f1-micro` (`deploy-gcp.sh:114`) con pool sin timeouts; footgun: imagen del indexador en Artifact Registry southamerica-east1 vs job que referencia `gcr.io/...` por defecto (`cloudbuild-indexer.yaml:14` vs `deploy-gcp.sh:46,234`). **Recomendación:** capa RPC multi-endpoint con failover/retry, proxy de lectura vía /api (no RPC en bundle), snapshot periódico del nodo, cachear /api/stats (TTL) o leer estadísticas de la BD del indexador, subir tier de Cloud SQL con pool dimensionado y timeouts, unificar referencia de imagen y validarla antes de crear el job.
- **H-14 — Gobernanza de claves y roles (R4-A, R7-A):** `identityAdmin` único (`UserRegistry.sol:45-46,65-68,72-75`) fija niveles de identidad y `recordTradeOutcome` de cualquiera sin gobernanza; `Subscription.withdraw` retira TODO el balance BRLT con soloOwner (`Subscription.sol:73-78`) y el depósito de Socios va directo a `treasuryAddress` fijada por owner (`Governance.sol:51,167-168`); `approveCampaign` usa el approver del body y solo consulta `gov.isSocio` (view pública) — cualquier llamador pasa la dirección de un Socio conocido, con `GOVERNANCE` default `address(0)` (`route.js:10-24`); la ruta `--preview` (`deploy-gcp.sh:172`) despliega en el nodo remoto compartido con `--allow-anvil-keys` (`deploy-contracts-gcp.sh:94-106`) — si `OWNER_PRIVATE_KEY` es la clave Anvil #0 (pública y documentada en REGISTRO_REPOSITORIOS:232-234), cualquiera controla Escrow/BRLT/Governance y los fondos del preview. **Recomendación:** multisig o aprobación por Governance para identidad/reputación y gastos del fondo; separar identityAdmin/owner/tesorería; firma ECDSA del approver sobre campaignId+timestamp y registro on-chain de aprobaciones; prohibir claves Anvil en el nodo remoto y verificar post-despliegue que el owner no sea una dirección Anvil conocida.
- **H-15 — Sanciones sin efecto (R4-A):** `Governance.sol:42` guarda `sanctioned` y `isSanctioned` (`:235-237`) existe, pero **ningún contrato, API ni UI lo consulta** (grep solo en Governance.sol, tests y ABI): un usuario sancionado sigue creando operaciones y completando trueques; `removeSanction` la ejecuta un solo Socio sin votación. **Recomendación:** integrar `isSanctioned` como gate en Escrow/TruekeEscrow/Exchange y en las APIs (crear/aceptar/meetups/campañas); exigir votación para removeSanction; endpoints de moderación.

---

## 6) RNF faltantes (ISO 25010)

| Categoría | RNF faltante | Hallazgo |
|---|---|---|
| **Fiabilidad** | Disponibilidad del indexador (scheduler/streaming, checkpoint, alertas); RPO/RTO y runbook de restauración de BD; failover de RPC; retry/backoff en consumidores | H-06, H-13, H-23 |
| **Seguridad** | Confidencialidad: PII off-chain descifrada y on-chain en claro; autenticidad: firma en escrituras off-chain e identidad; integridad: tokens con allowlist y retornos verificados; no repudio: auditoría de accesos a PII; headers/CSP; rate-limiting global | H-01…H-04, H-10, H-12, H-14, H-19, H-22 |
| **Eficiencia/Rendimiento** | Caché en /api/stats; dimensionado de Cloud SQL (tier, pool, timeouts); presupuesto de recursos del entorno local ("sin comprometer los recursos de la pc") sin métricas | H-13 |
| **Usabilidad (medible)** | Métricas UX: LCP/CLS, tamaños de bundle, viewports soportados, tiempos de carga; "amigable", "colores vividos", "navegación intuitiva" sin definición operativa | R1-M (UX), R3-M |
| **Accesibilidad** | Objetivo WCAG 2.1 AA, tests axe en CI, foco visible (outline-none), imágenes con dimensiones | H-22 |
| **Mantenibilidad** | Cobertura de código con umbrales en CI; E2E en el pipeline; componente muerto (LandingPage) y métricas hardcodeadas; IPFS real o declaración de demo | H-24 |
| **Portabilidad** | Referencia de imagen del indexador unificada (AR vs gcr.io); versiones de toolchain documentadas (Next 16, Solidity ^0.8.20) | H-13, H-21 |
| **Cumplimiento** | RGPD: política de privacidad, consentimiento auditable, exportación/borrado de PII, retención mínima; screening AML/OFAC en onboarding; logs sin PII (UTM/username) | H-23, R4-M |

---

## 7) Stakeholders faltantes (sin rol, sin endpoints o sin custodia definida)

| Stakeholder | Estado verificado | Hallazgo |
|---|---|---|
| **Verificador de identidad / DPO** | No existe: KYC auto-certificable, OTP/2FA ficticios, SBT sin verificación on-chain | H-01 |
| **Árbitros / Socios mediadores** | El brief les asigna la mediación; en cadena resuelve un árbitro EOA único, sin votación ni tooling (listar disputas, evidencias, historial) | H-04 |
| **Soporte al usuario** | Sin rol, columna ni endpoints (recuperación de cuentas, incidencias, apelaciones); `/help` es estático | R4-M |
| **Moderación** | Sanciones on-chain sin efecto; sin endpoints para retirar artículos/bloquear cuentas | H-15 |
| **Auditor externo** | No hay auditoría externa de `sc/src`; eventos incompletos para trazabilidad (mintMore sin evento; refund emite TradeCancelled indistinguible) | R4-M |
| **Compliance / regulación** | Sin screening AML/OFAC en onboarding; sin página de privacidad ni derecho al olvido (imposible además por PII on-chain) | H-03, H-23 |
| **Custodia de claves (identityAdmin/tesorería)** | Una sola EOA fija identidad/reputación de todos; el fondo de operaciones (BRLT + depósitos de Socios) es retirable en su totalidad por un owner | H-14 |
| **Operador de red (relayer)** | Endpoint público sin tesorería ni mecanismo de financiación definido; costo de gas es riesgo continuo | H-12 |
| **Recepción/Entrega (logística/courier/establecimientos)** | `setInTransit`/`closeMeetup` sin actor definido ni verificación; 'delivery' es un token mock en tests | H-04, H-16 |
| **Usuario final por nivel** | El rol se reduce a "Inscrito = acceso completo"; restricciones por nivel (verificación, rubros, 3%, avales) sin implementar; columna `role` nunca poblada | H-05, H-11 |

---

## 8) Plan de acción

### Quick wins (S — esfuerzo pequeño, alto impacto inmediato)

| # | Acción | Responsable | Esfuerzo |
|---|---|---|---|
| Q1 | **Cerrar el IDOR H-02**: exigir firma ECDSA (verifyMessage, patrón ya existente) en `/api/identity/[address]` y quitar el acceso "owner" por dirección pública | Backend/Seguridad | S |
| Q2 | **Gate de producción en identidad (H-01)**: rechazar códigos vacíos/'123456' y desactivar auto-aprobación KYC con `NODE_ENV==='production'` (fail-fast, no comentarios) | Backend | S |
| Q3 | **CSP y security headers** en `next.config.ts` (frame-ancestors 'none', HSTS, X-Content-Type-Options, Referrer-Policy) | Frontend/Seguridad | S |
| Q4 | **Rate-limiting básico** en `/api/relay` y endpoints de escritura (por IP y por wallet) | Backend/DevOps | S |
| Q5 | **Fail-fast de RPC**: `requireSecret('RPC_URL')` en producción en vez de `|| http://127.0.0.1:8545` (indexador, identity, operation) | Backend/DevOps | S |
| Q6 | **Checkpoint + dedup del indexador (H-06)**: persistir `last_synced_block` en BD, deduplicar notificaciones, añadir `/api/health` (BD+RPC) | Backend | S |
| Q7 | **Redactar logs del indexador (H-23)**: eliminar username + coordenadas UTM y la URL del RPC | Backend/DevOps | S |
| Q8 | **Cerrar `closeMeetup` (H-04)**: exigir pertenencia a la operación y firma; unificar la referencia de imagen del indexador (AR vs gcr.io) | Backend/DevOps | S |
| Q9 | **Cobertura mínima en CI (H-24)**: configurar @vitest/coverage-v8 con umbrales iniciales (≥70% líneas) y correr la suite E2E Playwright en el pipeline | DevOps/QA | S |

### Mejoras (M — esfuerzo medio)

| # | Acción | Responsable | Esfuerzo |
|---|---|---|---|
| M1 | **Firma EIP-712 en escrituras off-chain (H-10)**: ratings/meetups/vouches con `{action, operationId, nonce, timestamp}`; restringir mint de MockERC20 (solo owner/faucet) | Backend | M |
| M2 | **TOTP real + OTP de un solo uso (H-01)**: otplib, expiración, rate-limit; separar `kyc_submitted` de `kyc_verified` con rol verificador | Backend | M |
| M3 | **Rediseñar PII on-chain (H-03)**: hashes/merkle root en UserRegistry, eliminar datos en claro de struct y eventos; plan de retiro del contrato actual | Smart Contracts | M |
| M4 | **Endurecer disputas (H-04)**: restringir dispute/setInTransit a las partes o a quien depositó; exigir depósito antes de resolver a favor de user2; estado 'Refunded' para reembolsos (cadena+indexador+UI) | Smart Contracts + Backend | M |
| M5 | **Allowlist de tokens + SafeERC20 (H-19)** en TruekeEscrow y Governance; verificar retornos de transferFrom/transfer; quórum mínimo >1 | Smart Contracts | M |
| M6 | **Sanciones operativas (H-15)**: integrar `isSanctioned` como gate en contratos y APIs | Smart Contracts + Backend | M |
| M7 | **Relayer seguro (H-12)**: simulación eth_call antes del broadcast, NonceManager o cola en BD, persistencia pending→confirmed, alertas de saldo | Backend/DevOps | M |
| M8 | **Unificar estado de sincronización (H-20)**: SocioSet según flag, suscripción con months/paidUntil reales y status activo/inactivo | Backend | M |
| M9 | **Actualizar documentación (H-21)**: brief/README/INFORME_CUMPLIMIENTO a Next 16, React 19, ethers v6, Solidity ^0.8.20, 14 contratos/11 ABIs | Documentación | M |
| M10 | **Reglas M7 (H-18)**: definir ventana (¿[hora, hora+10m]?), fuente de confianza de la hora en servidor, comportamiento sin ubicación y gating por nivel/zona, con tests de openMeetup/createMeetup | Backend | M |

### Roadmap (L — esfuerzo grande, hitos de producto)

| # | Acción | Responsable | Esfuerzo |
|---|---|---|---|
| R1 | **Implementar reglas de niveles del brief (H-05)**: fórmula documentada (reputación + transacciones efectivas + apelaciones), taxonomía de 'rubro', 3%, penalización por inactividad, límites por rol; reconciliar/eliminar sistemas on-chain paralelos | Producto + Backend + Smart Contracts | L |
| R2 | **ERC-4337 / Smart Accounts + merkle root (H-07)** o decisión de alcance formal con el cliente | Producto + Smart Contracts | L |
| R3 | **Arbitraje por votación de Socios / multisig con timelock (H-04)** y tooling off-chain para árbitros (evidencias firmadas) | Smart Contracts + Backend | L |
| R4 | **Resolver TruekeEscrow (H-08)**: integrarlo al deploy/ABI/indexador/tests o retirarlo; unificar semántica de estados/deadline/cancelación con el Escrow legacy | Smart Contracts + Backend | L |
| R5 | **Infraestructura resiliente (H-13)**: RPC con failover, snapshot del nodo compartido + SLA, proxy de lectura, Cloud SQL dimensionado, monitoreo completo | DevOps | L |
| R6 | **Deseos perdidos (H-16)**: subastas, encargo, publicaciones AtoA, PostGIS real (ST_DWithin) con dirección de inscripción, establecimientos con aprobación de Socios, flujo de delivery | Producto + Backend | L |
| R7 | **RGPD completo (H-03, H-23)**: política de privacidad, consentimiento auditable, exportación/borrado de PII, retención, screening AML/OFAC, rotación de KYC_SECRET con prueba de restauración | Compliance + Backend | L |
| R8 | **IPFS real (H-24)**: pinning con PINATA_JWT desde Secret Manager y verificación de disponibilidad, o declarar la certificación local-only | Backend | L |
| R9 | **Auditoría externa de `sc/src`** y auditoría de seguridad off-chain antes del lanzamiento | Seguridad | L |

**Criterios de aceptación para V5 (producción):** (1) los 7 CRÍTICOS cerrados con tests de rechazo verificables; (2) cobertura ≥80% líneas / ≥70% ramas en CI con los flujos de negocio del brief cubiertos; (3) E2E en el pipeline; (4) runbook de restauración probado y RPO/RTO definidos; (5) dueño y financiación de la tesorería del relayer definidos; (6) matriz de trazabilidad brief→código con hitos por requisito pendiente.
