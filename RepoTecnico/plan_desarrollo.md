# TrueKeate — Plan de desarrollo consolidado

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Archivo | `RepoTecnico/plan_desarrollo.md` |
| Fecha de corte | **2026-09-09** |
| Rama | `escrow-dsh-GCP` (local; publicada en los 3 remotos) |
| HEAD | **a717efb** (`a717efbf4272b1d03361d98eea5937116f337a32`) — docs: VALOR + botón D28 + pestañas histórico + inventario flotante verificado en vivo |
| Remotos | `gitlab` (gitlab.com/anlucorporations/escrow) · `github` (github.com/anlucorporations/escrow) · `codecrypto` (gitlab.codecrypto.academy/anlucorporations/escrow) |
| Estado global | **ENTREGADO (Fases 1–5) + DESPLEGADO en GCP** + mejora continua del director activa (login wallet único, escalera D28, Verificar/Certificar, SBT, manuales, disputas v2, VALOR…) |
| Despliegue GCP al corte | API Cloud Run `truekeate-api` rev **00022-s24** · web Cloud Run `truekeate-web` rev **00028-mwk** (release-e6c61f7) |
| Fuentes de verdad | `RepoTecnico/estado_proyecto.md` · `git log` (72 commits, 2026-09-02 → 2026-09-09) · `arquitectura_tecnica.md` · `logica_trueke.md` · árbol de código `sc/`, `backend/`, `web/` |

---

## 1. Fases 0–2 — Concepto y auditoría (resumen)

No existe una "Fase 0" rotulada en el repo: el origen es el **brief del proyecto** (`escrow-TrueKeate.md` en la raíz, con copia en `RepoTecnico/escrow-TrueKeate.md` / `.txt`) y la propuesta `RepoTecnico/PROPUESTA_TRUEKEATE.md`. La documentación construida se consolidó en la rama limpia **`5020be0` "TrueKeate: rama limpia con la documentación construida (Fase 1-2)"** (2026-09-02) y la purga de heredados en **`66a72a6`**.

| Fase | Entregables (rutas reales) | Detalle |
|---|---|---|
| **F1 · Concepto / Requerimientos** | `RepoTecnico/requerimientos.md`, `diccionario_datos.md`, `entornos_globales.md` | RF-01…RF-19 (19 módulos) · RNF-01…RNF-08 (8 categorías) · RT-01…RT-05 (stack/arquitectura/estándares/setup/entornos) · restricciones R1–R13. Entrevista de aclaración completa: decisiones **D1–D41** |
| **F2 · Auditoría** | `RepoTecnico/INFORME_OPTIMIZACION_V1.md` (histórico) | `@audita`: **48 hallazgos** (5 CRITICA · 24 ALTA · 17 MEDIA · 2 BAJA); veredicto inicial "no apto para producción". Resuelto con la ronda **D12–D25** |
| F2 · Casos de uso | `RepoTecnico/casos_uso.md`, `casos_uso_v1_backup.md`, `INFORME_AUDITORIA_CASOS_USO_V1.md` (histórico), `CDU/` | **31 CU (CU-01…CU-31)** con 170 criterios testeables (72 Gherkin + 98 EARS); dudas U-01…U-13 resueltas con **D26–D31** |
| F2 · Documento técnico | `RepoTecnico/arquitectura_tecnica.md` | 10 secciones + **plan por ciclos C1–C8 (§10)**; 11 pendientes de arquitectura resueltos con **D32–D41**; estilo visual RNF-08 / activos RF-19 (`PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md`, carpeta `TrueKeate/`) |
| F2 · Coherencia | 6 lentes sobre todos los documentos | Cabeceras, CU-04/18/23/24/31, diccionario, estados del escrow, nomenclatura unificada; informes V1 marcados históricos |

---

## 2. Fase 3 — Desarrollo (ciclos C1…C11)

### 2.0 Visión general

Ciclos verticales ejecutados en `escrow-dsh-GCP` contra anvil (chain 31337). Cada ciclo: unit + fuzz + invariantes + cobertura ≥80 % líneas (gate D38). Los commits de ciclo C1–C8 se registraron el 2026-09-02 y se publicaron en los 3 remotos en el push **`0f5e521`** (cierre D11 en `8dd244d`).

| Ciclo | Commit | Fecha | Resumen (pruebas reportadas) |
|---|---|---|---|
| **C1** Setup Foundry + Escrow base | `40aa257` | 2026-09-02 | Foundry 18/18 · cobertura 94.96 % |
| **C2** SmartAccount ERC-4337 + KYC estados | `48b813a` | 2026-09-02 | Foundry 32/32 (14 nuevos) |
| **C3** BRLT + Socios + Fondo + Suscripción | `587fcd1` | 2026-09-02 | Foundry 52/52 (20 nuevos) |
| **C4** Indexador + PostgreSQL + PostGIS | `449c5f7` | 2026-09-02 | Backend 5/5 (indexador) |
| **C5** Relayer EIP-712 | `c27b895` | 2026-09-02 | Backend 7/7 + E2E anvil |
| **C6** Backend API REST | `dd071e4` | 2026-09-02 | Backend 19/19 (7 nuevos) |
| **C7** Frontend Next.js + diseño RNF-08 | `776b8fd` | 2026-09-02 | Build OK (9 páginas estáticas) |
| **C8** Cierre vertical (disputas + reputación + subastas) | `2340fac` | 2026-09-02 | Foundry 61/61 · backend 26/26 |
| **C9** *(sin rótulo de ciclo — ver §2.9)* | — | 2026-09-02 → 2026-09-07 | Entrega F4/F5 + operación GCP + suite + trueque abierto F1–F4 + P1–P3 + NFT v2 |
| **C10** Siete ajustes del director | `efa8425` | 2026-09-07 | Backend 44/44 · E2E 47/3 · Foundry 74/74 |
| **C11** Mejora continua post-entrega *(sin número oficial)* | varios | 2026-09-07 → 2026-09-09 | Ver §3 (detalle de los últimos ciclos) |

### 2.1 C1 — Setup Foundry + Escrow base (`40aa257`)

| | |
|---|---|
| **Objetivo** | Máquina de estados del escrow: CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO; ventanas 10 min/10 min; firmas duales; cancelación solo pre-custodia (D31); marcador "ambas valoraron" (D36) |
| **Entregables clave** | `sc/src/Escrow.sol` · mocks en `sc/src/mocks/` (TKA/TKB/NFT) · proyecto Foundry (forge/anvil 1.8.1, OpenZeppelin v5.0.2, forge-std) · script de despliegue |
| **Pruebas** | Unit + fuzz **18/18** (`sc/test/Escrow.t.sol`); cobertura **94.96 % líneas** (gate D38 ✓); invariantes I1/I2/I3 |
| **Despliegue** | anvil, cuenta 0 (Owner): Escrow `0x5fbdb2…aa3` + mocks TKA/TKB/NFT |

### 2.2 C2 — SmartAccount ERC-4337 + KYC estados (`48b813a`)

| | |
|---|---|
| **Objetivo** | Wallet de identidad inspirada en ERC-4337 (D35, sin EntryPoint): ejecución por firma EIP-712 con nonce (D16); escalera INSCRITO/VERIFICADO/CERTIFICADO por merkle root (D28); recuperación social 3 guardianes / umbral 2/3 / timelock 48 h (D34) |
| **Entregables clave** | `sc/src/SmartAccount.sol` · `sc/src/SmartAccountFactory.sol` (CREATE2 one-per-owner, CU-01) · `sc/test/SmartAccount.t.sol` |
| **Pruebas** | 14 nuevos → suite **32/32**; cobertura SmartAccount 95.12 % · Factory 100 % |
| **Despliegue** | anvil: Factory + cuenta desplegada OK |

### 2.3 C3 — BRLT + SociosRegistry + Fondo + Suscripción (`587fcd1`)

| | |
|---|---|
| **Objetivo** | Economía de la plataforma: padrón de Socios con admisión por quórum ≥2/3 (D21) y propuestas económicas (D32); BRLT controlada por el registry (D6) con tope inicial 1M (D32) y 5 % al fondo (D7); fondo de valor 1 %/10 %/5 % configurable (D7); suscripción de Empresa con staking bloqueado 30 días (D33) |
| **Entregables clave** | `sc/src/SociosRegistry.sol` · `sc/src/BRLT.sol` · `sc/src/FondoDeValor.sol` · `sc/src/SuscripcionEmpresa.sol` · `sc/test/Ciclo3.t.sol` |
| **Pruebas** | 20 nuevos → suite **52/52**; cobertura líneas: BRLT 90 % · Fondo 100 % · Registry 94 % · Suscripción 82 % |
| **Despliegue** | anvil: BRLT/Fondo/Registry/Suscripcion OK |

### 2.4 C4 — Indexador + PostgreSQL + PostGIS (`449c5f7`)

| | |
|---|---|
| **Objetivo** | Capa off-chain: esquema PostgreSQL completo + listener propio de eventos (D25) con idempotencia, checkpoints y reconciliación (RNF-07.4) |
| **Entregables clave** | `backend/db/schema.sql` (14 tablas + PostGIS + enum canónico de 9 estados + escalera D28 + cifrado PII D17 + idempotencia UNIQUE) · `backend/indexador.js` · `backend/indexador-cli.js` (barrido único / `--watch`) |
| **Pruebas** | **5/5** (`backend/test/indexador.test.js`, node:test con pool en memoria): mapeo TruekeCreado→truekes, custodia→CUSTODIADO, idempotencia, barrerDesde+checkpoint, contrato desconocido |
| **Despliegue** | Esquema en PG local; la integración `mcc-postgres` real quedó pendiente de entorno GCP (D25) y fue **superada por Cloud SQL** en el despliegue GCP (ver §2.9) |

### 2.5 C5 — Relayer EIP-712 (`c27b895`)

| | |
|---|---|
| **Objetivo** | Meta-tx que asume el gas desde la cuenta 1 (RF-15.2) con las 4 protecciones anti-abuso (D16): nonce+chainId, allowlist de verificados con chequeo on-chain D28, límite diario 20/día (D29), endpoint autenticado; bloqueo 1 h tras 3 fallos/10 min (D29); health-check SLA (D15) |
| **Entregables clave** | `backend/relayer.js` |
| **Pruebas** | **7/7** (`backend/test/relayer.test.js`, provider mock): intent verificado, rechazo no-verificado, nonce repetido, chainId, límite diario, bloqueo por fallos, health |
| **Despliegue** | Integración E2E real en anvil (SmartAccount marcada VERIFICADO + meta-tx por cuenta 1 con nonce incrementado). En GCP corre dentro del servicio API (ver §2.9) |

### 2.6 C6 — Backend API REST (`dd071e4`)

| | |
|---|---|
| **Objetivo** | API REST con rate-limiting global (D16/RF-09.6), `/healthz` y manejo de errores; sesión por firma EIP-191 |
| **Entregables clave** | `backend/api/app.js` · `backend/api/routes/auth.js` (connect/register GDPR D17) · `routes/kyc.js` (escalera D28: códigos→VERIFICADO; documento+selfie + revisión Owner→CERTIFICADO RF-18.4) · `routes/catalog.js` (AtoA con límites por nivel D14, encargos CU-07) · `routes/truekes.js` (creación con máx 3 activos RF-14.4, custodiar, firma, valoración 1–5 D18/D36) · `routes/admin.js` (dashboard Owner RF-13.1) |
| **Pruebas** | **7/7** (supertest + almacén en memoria) → suite backend **19/19** |
| **Despliegue** | Integrado con anvil en el entorno local de ciclo; producción en GCP desde `4a3c950` (ver §2.9) |

### 2.7 C7 — Frontend Next.js 16 + sistema de diseño RNF-08 (`776b8fd`)

| | |
|---|---|
| **Objetivo** | Landing (RF-14.1) y suite por estado/rol (RF-14.2–14.8) con identidad visual "Bóveda Digital" (RNF-08) y activos de marca (RF-19); PWA instalable (D40) |
| **Entregables clave** | `web/app/` (landing + `/suite/dashboard` con escalera D28) · `web/lib/ethereum.tsx` (MetaMask provider/signer, auto-reconexión RF-16) · `web/lib/contracts.ts` + `web/lib/abis/` · `web/app/globals.css` (tokens @theme) · componentes Button/Card/BottomNav/StatusBadge · `web/public/brand` + `web/public/hero` (RF-19) |
| **Pruebas** | Build OK (9 páginas estáticas); manifest PWA instalable |
| **Despliegue** | Base del frontend desplegado en GCP desde `4a3c950` |

### 2.8 C8 — Cierre vertical: disputas + reputación + subastas (`2340fac`)

| | |
|---|---|
| **Objetivo** | Completar la vertical de confianza: bloqueo por violación (CU-17/RF-05.8), anulación con quórum ≥2/3 (D13) y ANULADO por defecto a los 5 días (D26), sanción con timelock 6 h (D21); fórmula de niveles D12/D30; subastas solo Empresa / solo Certificados (RF-17) |
| **Entregables clave** | `sc/src/Escrow.sol` ampliado (CU-17/18/19 + vinculación a SociosRegistry) · `sc/test/EscrowCiclo8.t.sol` (9 nuevos) · `backend/api/lib/reputacion.js` + `backend/api/routes/reputacion.js` (fórmula D12/D30, Oro histórico RF-07.4, penalización por inactividad D19) · `backend/api/routes/subastas.js` (mayor valor gana, desempate por nivel D27/CU-25/26) |
| **Pruebas** | Foundry **61/61** (9/9 nuevos) · backend **26/26** (7/7 C8) · total plataforma 87 tests |
| **Despliegue / push** | Rama `escrow-dsh-GCP` publicada en **GitHub, GitLab.com y gitlab.codecrypto.academy** (`0f5e521`, forced update sobre contenido heredado); **D11 resuelto** (token HTTPS global) |

### 2.9 C9 — hueco sin rótulo de ciclo (entrega + operación + suite)

En `git log` y en `estado_proyecto.md` **no existe un ciclo rotulado "C9"**: tras C8 (`2340fac`) la numeración salta al **"Ciclo 10"** (`efa8425`, 2026-09-07). El tramo intermedio quedó registrado por fases/hitos, no por número de ciclo:

| Bloque | Commits | Contenido |
|---|---|---|
| **Fase 4 — Pruebas** | `e75e69a` | Foundry 62/62, backend 26/26, E2E 18/18 (ver §4) |
| **Fase 5 — Manuales** | `c8fc77e` | @manuales: técnicos, literales, SVG, PDF, Ayuda `/help/manual` (ver §5) |
| **Entrega final + operación** | `5bfb233`, `d94c6de`, `d96ef71` | Cierre de Fases 1–5 y push `c8fc77e`; scripts `backend/scripts/reiniciar-plataforma.*` y `bootstrap-owner.*` validados en PG16+PostGIS+anvil |
| **Despliegue GCP** | `4a3c950` | Contratos en anvil remoto MCC (chain 31337) + API/web en Cloud Run (europe-west1); Cloud SQL; secretos; Dockerfiles; corrección ethers v6 `topicHash` en `backend/indexador.js`; relayer = cuenta 1 |
| **Control de acceso por estados** | `017339c` | Suite exige wallet (`web/components/SuiteGuard.tsx`); no inscrito solo catálogo; inscripción formal (RF-01.4 cambiada) |
| **Navegación PC/móvil (Opción B)** | `a1f75d3` | `web/lib/navegacion.ts` (matriz RF-14/D14/D28) + `TopNavPc`/BottomNav; verificado en vivo 21/21 E2E |
| **Panel del Owner real + 6 pantallas de suite** | `85c603b`, `00eed71` | `/suite/admin` con datos reales (RF-13.1); Inventario/Intercambio/Perfil/Finanzas/Disputas/Gobernanza integrados al backend (`almacen-pg.js`, routers `finanzas.js`, `disputas.js`, `gobernanza.js`); backend 32/32 · E2E 37 |
| **Login único + escudo D28 + Verificar/Certificar** | `677d7c4` | Sesión global EIP-191 persistida (tabla `sesiones`, 24 h); Verificación por código correo (`/kyc/init`, modo demo `codigoDemo`) y Certificación KYC (`/kyc/submit`); backend 32/32 · E2E 43 |
| **Manuales de wallet (tema 07)** | `c2157b1` | 6 técnicos + fichas en `/help/manual`; fix permisos 600 en `web/Dockerfile` (`COPY --chown=node:node`) |
| **Lógica maestra del Trueke (9 puntos)** | `276f044`, `a54d401` | Documentada en `RepoTecnico/logica_trueke.md` (S1/S2 verificadas, decisiones del director) |
| **Migración trueque abierto F1–F4** | `cd16666`, `6750c84`, `b672df7`, `e14157b`, `4132790` | F1 `sc/src/TrueKeateNFT.sol` (categorías + `vincularTrueKeateNft`) · F2 `backend/db/migracion_trueke_abierto.sql` (estado PROPUESTO, categorías, cierre, favoritos) · F3 endpoints ofertas/acordar/propuesta-encuentro/cierre · F4 Mercado/Mis Truekes/cierre Conforme-No Conforme. Foundry **71/71** · backend 34/34 · E2E 43/3 |
| **P1–P3 (minteo, geo, GCP)** | `aa8bcf7`, `a702434`, `b1c9734`, `b7ef3ad` | P1 `backend/api/lib/nft-minter.js` (mint real on-chain al publicar; TrueKeateNFT GCP `0x638A…B44`, minter=relayer) · P2 `routes/puntos-encuentro.js` + mapa OSM · P3 migración F2 en Cloud SQL + rev 00010. Backend **39/39** |
| **Fixes login único real + NFT v2** | `ad6ec0a`, `df1e00f`, `410a91d`, `42a486c`, `9243900` | Firma solo al acceder (guard); token persistente; descartar token huérfano; ciclo de vida post-trueke (reasignación en cruz + USAR/quemar `TrueKeateNFT.usar`); redeploy NFT v2 en anvil GCP (`0x6C2d…7892`). Foundry **74/74** · backend 40/40 · E2E 47/3 (verificado en `logica_trueke.md` §6) |

### 2.10 C10 — Siete ajustes del director (`efa8425`, docs `c51b877`)

| | |
|---|---|
| **Objetivo** | Siete ajustes aprobados por el director (bloques de 3 preguntas; `logica_trueke.md` §7): A1 firma por acción · A2 quitar alta de trueque de Intercambio · A3 teléfono de la contraparte · A4 aceptar/rechazar encuentro + custodia automática · A5 imágenes en inventario/mercado (hasta 5) · A6 widget flotante de mapa · A7 verificación final |
| **Entregables clave** | `backend/api/lib/auth.js` (`mensajeAccion`/`validarFirmaAccion` + middleware `requiereFirmaAccion`) · `web/lib/firma.ts` + contexto de sesión · `backend/api/routes/truekes.js` (`GET /:id/contacto`, `POST /:id/encuentro/aceptar\|rechazar` con custodia automática) · imágenes en BD (`imagenes_certificadas.contenido/mime`, `GET /catalog/:id/imagen/:imagenId`) · `web/components/MapaWidget.tsx` (Leaflet solo-cliente, tiles OSM, Nominatim, favoritos) · `web/app/suite/intercambio/page.tsx` (sin alta de trueque) |
| **Pruebas** | Foundry con TrueKeateNFT v2 (`usar()`) · backend **44/44** · E2E **47 passed / 3 skipped (PC-only)** · tsc/build OK |
| **Despliegue / push** | GCP: BD migrada, API rev **00013**, web rev **00014** (rutas nuevas verificadas en vivo → 401 = existen); commit `efa8425` pusheado a **GitHub, GitLab.com y gitlab.codecrypto.academy** |

### 2.11 C11 — Mejora continua post-entrega (sin número oficial de ciclo)

Del 2026-09-07 al 2026-09-09 el trabajo posterior a C10 se registró por **bloques/commits**, no como "Ciclo 11" (rótulo que no aparece en `git log` ni en `estado_proyecto.md`). Bloques:

| Bloque | Commits | Contenido (resumen) |
|---|---|---|
| BaseOperaciones + inyección | `1368216`, `a31d74a` | `@InyectaDatos`: `RepoTecnico/BaseOperaciones/` + `scripts/inyectar_datos_operativos.mjs` (validado en PG local: 6 usuarios · 24 ítems · 30 truekes · 60 valoraciones; **no ejecutado en producción**); fix desconectar/reconectar wallet |
| 1.ª prueba en GCP | (docs) | `RepoTecnico/INFORME_PRUEBA_1.md` + evidencia `RepoTecnico/pruebas/1ra-prueba/`; hallazgos H1–H5 |
| Ajustes de UI + username + marca | `8e7d13d`, `1cb4930`, `8579ca4`, `169d345` | Barra superior única (PC), `@username` (`backend/db/migracion_username.sql`), símbolo de estado 🟡🟢🥇, marca con logo; API rev 00015/00016 · web rev 00016/00018 |
| Certificación con SBT | `c440204`, `5afeb97`, `a4a9b63` | `sc/src/TrueKeateSBT.sol` (soulbound ERC-5192, 6/6 tests) + `backend/api/lib/sbt.js` + `/suite/certificacion`; TrueKeateSBT GCP `0x8705…3638`; API rev 00017 · web rev 00019; fix esquema `imagenes_certificadas` |
| Wallet en móvil | `9cb1889`, `939bc17`, `ed5388a`, `e85ac0c` | Deep link `metamask.app.link` + provider EIP-6963 + tarjetas contextuales en `SuiteGuard`; **validado por el director en teléfono real** |
| Biblioteca de manuales + suite Sistemas | `25548ae`, `64a0f88` | @manuales 5 roles: 27 técnicos, 27 literales, 49 imágenes, 27 PDF; `/help/manual` por tópicos (26 temas / 8 tópicos); suite Sistemas en `/suite/admin`; web rev **00022** |
| **Últimos ciclos (2026-09-08/09)** | `fae6c48`, `8528107`/`3da14ae`/`9cc3966`, `3e62c52`, `a665847`/`e6c61f7` (+ docs `9458e9c`, `bce7599`, `89a4300`, `abf87d6`, `1b2e2ee`, `a717efb`) | Detallados en §3 |

---

## 3. Ciclos de mejora continua post-entrega (últimos, 2026-09-08/09)

> Fecha de corte del documento: 2026-09-09 · HEAD `a717efb`. Todos verificados en vivo en GCP y empujados a los 3 remotos.

### 3.1 Regla del punto de encuentro — `fae6c48` (2026-09-08)

| | |
|---|---|
| **Objetivo** | Quién propone el punto de encuentro = la parte de **MAYOR nivel D12** y, a igual nivel, la de **MAYOR reputación** (trueques COMPLETADOS); la contraparte solo aprueba o rechaza |
| **Decisión del director** | Regla directa del director (verificado S1/S2 en `logica_trueke.md`); se aplica solo en el rol `propone` |
| **Archivos** | `backend/api/routes/truekes.js` (helper `quienProponeEncuentro`, `GET /truekes/:id/encuentro/rol`, validación 403 en `propuesta-encuentro`) · `web/app/suite/intercambio/page.tsx` (panel solo para `propone`; la otra parte ve "esperando propuesta" y acepta/rechaza) |
| **Pruebas** | Verificación en vivo GCP: `encuentro/rol` → Ana=propone, Bruno=aprueba; intento de Bruno → **403**; propuesta de Ana → `encuentroEstado PROPUESTO` ✅. Fix en prod: ALTER TABLE idempotente de `encuentro_propuesto_por`/`encuentro_estado` (migración incompleta) |
| **Despliegue** | API rev **truekeate-api-00018-hxk** · web rev **truekeate-web-00023-ltm** (release-fae6c48), 100 % serving |

### 3.2 Flujo de disputas v2 + flotante de votación — `8528107` + `3da14ae` + `9cc3966` (2026-09-09)

| | |
|---|---|
| **Objetivo** | Flujo afinado del director (6 puntos): disputa nace solo del cierre ✗ No Conforme (motivo + fotos) → REPORTADA; contraparte conforme → justificativo en 3 días (si no carga → ANULA a favor del reclamante) o No Conforme → votación directa; EN_VOTACION notifica a TODOS los socios (padrón on-chain SociosRegistry, fallback BD); socio parte no vota (**403 `socio_involucrado`**); veredicto por mayoría simple (1 voto/socio): ANULAR → trueke ANULADO (devolución NFTs), VALIDO → COMPLETADO (liberación en cruz); sin votos en 5 días o empate → ANULA; notificación in-app (campana) |
| **Decisión del director** | Regla de 6 puntos del director; luego pidió que la votación de Socios se abra en un **flotante (modal)** con las evidencias de ambas partes y zoom (`3da14ae`); fix de ruta relativa de evidencia (`9cc3966`, `ImagenProtegida` antepone API_URL) |
| **Archivos** | `backend/db/migracion_disputas_v2.sql` (columnas `justificativo_vence_at`/`votacion_vence_at`/`veredicto`/`resuelta_en` + tablas `evidencias_disputa`, `votos_disputa`, `notificaciones`) · `backend/api/lib/flujo-disputas.js` (motor: padrón, vencimientos, veredictos, notificaciones) · `backend/api/routes/disputas.js` · `backend/api/routes/notificaciones.js` · `web/app/suite/disputas/page.tsx` (rediseño por rol + votación con pruebas) · modal de disputa en `/suite/intercambio` · `web/components/CampanaNotificaciones.tsx` (TopBar) · `web/components/ImagenProtegida.tsx` |
| **Pruebas** | Tests API **24/24** (3 nuevos del flujo) · tsc OK · build web OK · **verificación en vivo GCP 10/10 pasos** (trueke 91: No Conforme con 2 fotos → justificativo → EN_VOTACION → 403 socio_involucrado → Owner vota VALIDO → RESUELTA/VALIDO → COMPLETADO + notificación) · capturas `RepoTecnico/pruebas/1ra-prueba/disputas-flujo.png` y `flotante-votacion.png` |
| **Despliegue** | API rev **truekeate-api-00019-xjf** · web rev **truekeate-web-00024-gkk** (release-8528107); ajuste flotante → web rev **truekeate-web-00026-fch** (release-9cc3966) |

### 3.3 Endurecimiento: Sistemas SOLO Owner — `3e62c52` (2026-09-09)

| | |
|---|---|
| **Objetivo** | El icono "Sistemas" (`/suite/admin`) se mostraba a TODO tipo SOCIO y el backend admitía `tipo === 'SOCIO'` en rutas `/admin/*` sin validar. Corrección: solo el **Owner real** (dueño on-chain del SociosRegistry, `owner()` = `0xf39F…2266` en GCP) accede a Sistemas |
| **Decisión del director** | Hallazgo reportado al operar → endurecer por **identidad on-chain**, no por "tipo" |
| **Archivos** | `backend/api/lib/es-owner.js` (detector on-chain `owner()` del registry; sin red → `OWNER_WALLET` o BD rol OWNER; caché 30 s) + middleware `requiereOwner` · todas las rutas `backend/api/routes/admin.js` (`/admin/usuarios\|contratos\|kpis\|db\|infra`, `/admin/owner` público) · `/auth/estado` y `/auth/session` exponen `esOwner` · `web/lib/navegacion.ts` (Sistemas `visible: esOwner === true`) · `web/components/TopBar.tsx`, `BottomNav.tsx`, `SuiteGuard.tsx` · `web/app/suite/admin/page.tsx` |
| **Pruebas** | Backend **25/25** (nuevo: SOCIO no-owner → 403 en las 5 rutas admin; `/admin/owner` público) · E2E `suite.spec` **11/11** (SOCIO no ve Sistemas; Owner sí; SOCIO bloqueado por URL) · verificación en vivo GCP (Ana `esOwner:false` → 403; Owner → 200) · capturas `sistemas-owner.png`, `sistemas-socio-bloqueado.png` |
| **Despliegue** | API rev **truekeate-api-00020-lx5** · web rev **truekeate-web-00027-8r5** (release-3e62c52), 100 % serving |

### 3.4 VALOR + ajustes de suite con Stripe — `a665847` / `e6c61f7` (2026-09-09, último ciclo al corte)

| | |
|---|---|
| **Objetivo** | 4 bloques: (1) **botón de escalera D28** en Perfil y menú de usuario (Iniciar verificación / Iniciar certificación / aviso de identidad completa); (2) **Intercambio por pestañas** Activos / Histórico; (3) **Inventario** con alta de elemento en flotante + imágenes referenciales (1–5); (4) **Finanzas → VALOR** (`/suite/valor`): 4.1 criptos del socio (Recargar/Retirar/Convertir ETH⇄BRLT **siempre contra la plataforma, sin P2P**; tasa interna 1 ETH ≈ 3000 BRLT, `TASA_ETH_BRLT`), 4.2 reputación D12/D30 + trueques sin valorar con valoración inline + últimos 10 valorados (tabla `valoraciones`), 4.3 BRLT con **Stripe Checkout alojado** + webhook que acredita (Empresa/SOCIO/Owner) |
| **Decisión del director** | Finanzas con cripto solo contra la plataforma; BRLT recargable con fiat real vía Stripe (claves test en Secret Manager); `e6c61f7` = fix del JOIN de valoraciones (`titulo_a/b` no son columnas de `truekes`) |
| **Archivos** | `backend/db/migracion_valor.sql` (tablas `movimientos_valor`, `movimientos_brlt`) · `backend/api/routes/valor.js` (+ webhook Stripe que acredita BRLT; secretos `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_KEY` en web) · `backend/api/routes/truekes.js` (persistencia de valoraciones) · `web/app/suite/valor/page.tsx` + redirección `/suite/finanzas` → `/suite/valor` · `web/app/suite/inventario/page.tsx` (flotante + imágenes) · `web/app/suite/intercambio/page.tsx` (pestañas) · `web/app/suite/perfil/page.tsx` y menú de usuario (botón D28) |
| **Pruebas** | Backend **27/27** (nuevos: criptos/BRLT por rol, checkout demo, webhook que acredita) · E2E **21 passed** (`suite.spec` 11/11 + `suite-pantallas` 7/7 + `suite-escalera` 3/3) · tsc y build OK · verificación en vivo GCP (Ana SOCIO recarga/convierte/checkout Stripe real/retira; Carlos PARTICULAR → 403 y UI solo lectura) · capturas `valor-owner.png`, `valor-particular.png` |
| **Despliegue** | API rev **truekeate-api-00022-s24** · web rev **truekeate-web-00028-mwk** (release-e6c61f7), 100 % serving · HEAD del repo = `a717efb` (docs de esta verificación) |

---

## 4. Fase 4 — Pruebas (resumen global)

### 4.1 Cierre de Fase 4 (commit `e75e69a`, 2026-09-02 — registrado en `estado_proyecto.md`)

| Suit | Resultado | Detalle |
|---|---|---|
| **Foundry (smart contracts)** | **62/62** | 61 unit/fuzz + 1 suite de invariantes handler-based (`sc/test/invariantes/EscrowInvariants.t.sol`, **5/5**: I1 conservación · I2 sin cancelación con custodia · I4 anulaciones en plazo · I5 sanción solo tras timelock · I7 completado requiere firmas + valoración) |
| **Backend (node:test)** | **26/26** | indexador 5/5 · relayer 7/7 · API 7/7 · ciclo8 7/7 |
| **Frontend E2E (Playwright)** | **18/18** | 9 casos × 2 proyectos (chromium + mobile-chrome Pixel 5, RNF-02.3) |
| Cobertura Forge (gate D38 ≥80 %) | **89.55 % líneas** (497/555) | Escrow 95.19 % · SmartAccount 95.12 % · Factory 100 % · BRLT 90 % · Fondo 100 % · Registry 94.03 % · Suscripción 81.82 % · Handler 100 % |

### 4.2 Evolución posterior y estado al corte 2026-09-09 (verificado en código)

| Suit | Serie reportada (hito → nº) | Estado del árbol al corte |
|---|---|---|
| **Foundry** | 62/62 (F4) → **71/71** (F1 NFT) → **74/74** (ciclo vida NFT §6 de `logica_trueke.md`) → +6 TrueKeateSBT → **≈80/80** | `sc/test/`: **79 funciones unit/fuzz** (Escrow 18 · SmartAccount 14 · Ciclo3 20 · EscrowCiclo8 9 · TrueKeateNft 12 · TrueKeateSBT 6) + **5 invariantes** = ≈80 checks. *(forge no disponible en el entorno de redacción para re-ejecutar; recuento estático de `sc/test/`)* |
| **Backend** | 26/26 (F4) → 34/34 (F3 trueque abierto) → 39/39 (P1/P2) → 40/40 (§6) → **44/44** (C10) | Suite completa ejecutada en esta sesión (`node --test test/*.test.js`, 8 archivos): **50 tests — 47 OK / 3 dependientes de entorno** (en `test/suite-integracion.test.js` esperan `403 solo_owner` y reciben `404`: requieren la variante GCP con BD/owner resuelto; sin `DATABASE_URL` el enrutado de `/admin/*` difiere). Los ciclos finales reportan su sub-suite: **24/24** (disputas v2) → **25/25** (Sistemas) → **27/27** (VALOR) |
| **Frontend E2E** | 18/18 (F4/F5) → 21/21 (nav, 3 skipped por plataforma) → 37 (6 pantallas) → **43/3** (login/KYC) → **47 passed / 3 skipped** (C10, PC-only) → **21 passed** en sub-suites VALOR (11+7+3) | 6 specs en `web/e2e/`: `suite.spec` (12), `suite-pantallas` (7), `suite-escalera` (3), `landing` (4), `login-unico` (2), `desconectar-reconectar` (1) — ejecutados por proyecto (chromium + mobile); requieren navegador Playwright + servidor `npm run start` (no re-ejecutados en esta sesión) |

**Nota de trazabilidad**: los números de cada ciclo/entrega son los registrados en `estado_proyecto.md` en el momento del hito; la columna "estado del árbol" refleja el recuento real del código a 2026-09-09. Hallazgos corregidos durante F4 (ninguno funcional): fuentes DejaVu/fontconfig en headless y locator de la escalera D28 en strict mode.

---

## 5. Fase 5 — Manuales (@manuales, `c8fc77e` + ampliaciones)

Workflow de 5 roles sobre el código real (`sc/`, `backend/`, `web/`). Estado al corte: **27 técnicos, 27 literales, 49 imágenes SVG, 27 PDF** y biblioteca por tópicos en la plataforma.

| Rol | Entregable (rutas reales) | Detalle |
|---|---|---|
| 🔧 TÉCNICO | `RepoTecnico/Manuales/**` — **27 manuales .md** | 8 temas (01-Tecnologia, 02-Dependencias, 03-Implementacion, 04-Despliegue, 05-Diccionario-de-Datos, 06-Diagrama-Relacional, 07-Wallets-y-Cuentas, 08-Suite-Sistemas). Jerarquía `##/###/####` con referencias `ruta:línea` al código; discrepancias reales marcadas como observación o "pendiente de confirmar" |
| ✍️ LITERARIO | `docs/Manuales/**` — **27 manuales de usuario** (+README) | Mismo árbol; lenguaje sencillo, "Empezar en 5 minutos", pasos numerados, marcadores `<!-- GENERAR_IMAGEN -->` + bloques mermaid |
| 🎨 CREATIVO | `docs/imagenes/` — **49 SVG** | Paleta "Bóveda Digital" de `web/app/globals.css` (navy/teal/cyan/gold/crimson/coral): estados-escrow, escalera D28, flujo-truque, arquitectura, glosarios, infografías |
| 📄 ASISTENTE PDF | `docs/Manuales/pdf/` — **27 PDF A4** (+HTML en `pdf/html/` + `web/scripts/generar-pdfs.mjs`) | Portada TrueKeate, índice navegable, avisos por color, SVG embebidos, "Página X de Y" (Playwright + fontconfig) |
| 🧩 INTEGRADOR | **Ayuda en plataforma** | `/help/manual` → biblioteca por **tópicos → temas (26 temas / 8 tópicos)** con imagen y descarga PDF: `web/app/help/manual/page.tsx` + `web/lib/manual-data.ts` · suite Sistemas: `/suite/admin` "Sistemas · Panel del Owner" + **Biblioteca de Sistemas** (solo Owner, PDF técnicos) vía `web/lib/sistemas-data.ts` · footer de la landing con enlace "📖 Ayuda · Manuales TrueKeate" |

**Verificaciones**: build Next.js OK (prerenderizado estático) · imágenes/PDF referenciados existen (0 rotos) · E2E 18/18 tras la integración · ampliación final (commit `25548ae`): técnicos 27 (certificación SBT, wallet móvil, grupo 08), literales 27, imágenes 49, PDF 27; desplegado **web rev 00022** y verificado 200 en ayuda/estáticos. Bug corregido: permisos 600 en estáticos → `COPY --chown=node:node` en `web/Dockerfile`.

---

## 6. Pendientes futuros (verificado en `estado_proyecto.md` — Pendientes / Próximos pasos)

| # | Pendiente | Evidencia / origen | Estado |
|---|---|---|---|
| 1 | **Escrow con `vincularTrueKeateNft`** desplegado (redesplegar Escrow nuevo con el NFT oficial; coordinar trueques existentes para no romperlos) | `estado_proyecto.md`:345 y 351; `logica_trueke.md` §5 F1 | Pendiente de decisión/coordinación del director |
| 2 | **Veredicto / liquidación on-chain del escrow**: el flujo de disputas v2 (`8528107`) resuelve hoy el veredicto en BD off-chain (`flujo-disputas.js`, `migracion_disputas_v2.sql`); el `Escrow.sol` conserva la vía on-chain (CU-18 anulación con quórum D13/D26, CU-19 sanción con timelock) sin sincronizar con el flujo | `estado_proyecto.md`:542–585; `sc/test/EscrowCiclo8.t.sol` | Sincronización on-chain del veredicto pendiente |
| 3 | **Fondo 1 % de trueques → FondoDeValor** (D7; marcado "pendiente de confirmar" en manuales) | `estado_proyecto.md`:352; D7 en tabla de decisiones | Fuera de alcance / opcional |
| 4 | **Stripe: Payouts reales + webhook firmado + pasar a live** (hoy claves de test en Secret Manager; retiro = registro con desembolso real documentado) | `estado_proyecto.md`:613–648 (§3.4) | Mejora para producción real |
| 5 | **UI de Subastas, Encargos y Campañas**: el router `/subastas` existe (C8, sin pantalla — no hay `/suite/subastas` en `web/app/suite/`); encargos (CU-07) y campañas (RF-04/RF-18.2, C8 planeado) sin UI | `web/app/suite/` (13 páginas, sin subastas); `arquitectura_tecnica.md` §10 C6/C8; `requerimientos.md` RF-04.3 | Pendiente por decisión del director |
| 6 | **WalletConnect universal** (requiere projectId de cloud.walletconnect.com) | `estado_proyecto.md`:500 y 508 | Mejora futura opcional |
| 7 | **APK nativa** (D40: hoy PWA instalable) | `estado_proyecto.md`:352; D40 | Mejora futura opcional |
| 8 | **Auditoría externa de seguridad** previa a producción | `estado_proyecto.md`:352; D24 | Fuera de alcance |
| 9 | **Root merkle real del KYC** para la escalera on-chain del Owner (hoy estados on-chain por merkle root D28) | `estado_proyecto.md`:352; D28 | Fuera de alcance |
| 10 | Otros documentados: SMTP real para códigos de verificación (hoy `codigoDemo`, `PROPUESTA_VERIFICACION_CERTIFICACION.md`), KYC automático con verificador externo, inyección de datos operativos **no ejecutada en producción** (requiere orden + respaldo), `imagenes_certificadas.firma_ecdsa` NOT NULL sin persistir (hallazgo BaseOperaciones) | `estado_proyecto.md`:89, 92, 384–410; `BaseOperaciones/estado_inyeccion.md` | Opcionales / por orden del director |

**Operación** (solo por orden del director): `backend/scripts/reiniciar-plataforma.sh --confirmar` (reset BD off-chain sin tocar anvil) y `backend/scripts/bootstrap-owner.sh --confirmar` (Owner CERTIFICADO/SOCIO). Los commits se crean localmente en `escrow-dsh-GCP`; el push a los 3 remotos se hace solo por orden del director.

---

## 7. Línea de tiempo consolidada (commits → hitos)

| Fecha | Commit(s) | Hito |
|---|---|---|
| 2026-09-02 | `5020be0`, `66a72a6` | Rama limpia con documentación de Fases 1–2 |
| 2026-09-02 | `40aa257`…`2340fac` | **Fase 3**: ciclos C1–C8 (setup/Escrow → cierre vertical) |
| 2026-09-02 | `0f5e521`, `8dd244d` | Push C1–C8 a los 3 remotos; D11 resuelto |
| 2026-09-02 | `e75e69a` | **Fase 4** — Pruebas (62/26/18) |
| 2026-09-03 | `c8fc77e`, `5bfb233` | **Fase 5** — Manuales + entrega final (push 3 remotos) |
| 2026-09-03 | `d94c6de`, `d96ef71`, `4a3c950` | Scripts de operación validados + **despliegue GCP** (anvil MCC + Cloud Run + Cloud SQL) |
| 2026-09-03/04 | `017339c`, `a1f75d3`, `85c603b`, `00eed71`, `677d7c4` | Control de acceso · navegación Opción B · Panel Owner · 6 pantallas de suite · login único + escudo D28 + Verificar/Certificar |
| 2026-09-05 | `c2157b1`, `276f044`, `a54d401`, `cd16666`…`4132790` | Manuales wallet · lógica maestra (9 puntos) · **migración trueque abierto F1–F4** |
| 2026-09-06 | `aa8bcf7`, `a702434`, `b1c9734`, `b7ef3ad` | **P1–P3**: minteo automático + geolocalización + despliegue GCP |
| 2026-09-07 | `ad6ec0a`…`9243900`, `efa8425`, `c51b877` | Fixes login real · NFT v2 (usar) · **Ciclo 10** (siete ajustes) desplegado (API 00013 / web 00014) |
| 2026-09-08 | `1368216`, `a31d74a`, `8e7d13d`…`25548ae`, `fae6c48` | BaseOperaciones + 1.ª prueba · ajustes UI (API 00015–00016 / web 00016–00022) · SBT (00017/00019) · móvil · biblioteca manuales + Sistemas (00022) · **regla de encuentro** (00018/00023) |
| 2026-09-09 | `8528107`…`9cc3966`, `3e62c52`, `a665847`/`e6c61f7`/`a717efb` | **Disputas v2 + flotante** (00019/00024→00026) · **Sistemas solo Owner** (00020/00027) · **VALOR + suite** (00022/00028) — HEAD `a717efb` |

---

## 8. Fuentes y trazabilidad de este documento

- `RepoTecnico/estado_proyecto.md` — hitos, ciclos, despliegues, decisiones D1–D41, pendientes (fuente principal).
- `git log` de la rama `escrow-dsh-GCP` (72 commits, 2026-09-02 → 2026-09-09; HEAD `a717efb`; remotos gitlab/github/codecrypto) — fechas y hashes verificados.
- `RepoTecnico/arquitectura_tecnica.md` §10 — plan original C1–C8.
- `RepoTecnico/logica_trueke.md` §5–§7 — migración trueque abierto, ciclo de vida NFT y ciclo 10.
- Árbol de código (`sc/src|test`, `backend/api|db|scripts|test`, `web/app|components|lib|e2e`) — rutas de entregables y recuentos de pruebas verificados a 2026-09-09 (Foundry 79 unit/fuzz + 5 invariantes; backend 50 tests en `node --test` local: 47 OK + 3 dependientes de entorno; 6 specs E2E).
