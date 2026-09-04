# TrueKeate — Estado del Proyecto

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Archivo | `RepoTecnico/estado_proyecto.md` |
| Fase actual | **ENTREGADO + DESPLEGADO en GCP** + control de acceso + navegación PC/móvil + Panel Owner + **6 pantallas de la suite integradas** |
| Última actualización | Ciclos faltantes completados: Inventario, Intercambio, Perfil, Finanzas, Disputas y Gobernanza conectadas al backend real |

---

## Hitos completados

- [x] Extracción de requerimientos desde `escrow-TrueKeate.md` → `requerimientos.md`
  - RF: 19 módulos (RF-01 … RF-19)
  - RNF: 8 categorías (RNF-01 … RNF-08, incluida identidad visual)
  - RT: 5 grupos (stack, arquitectura, estándares, setup frontend, entornos)
  - Restricciones duras: R1–R13
- [x] Entrevista de aclaración **completa** — decisiones D1–D41
- [x] Repositorios verificados: rama `escrow-dsh-GCP` en GitHub y GitLab.com (apunta a `c9dc2d5`)
- [x] Proyecto GCP: **`truekeate-main`** reutilizado (billing vinculado, ACTIVE); `truekeate-dsh` creado y eliminado
- [x] Documentos generados en `RepoTecnico/`:
  - `requerimientos.md` (guía principal de desarrollo)
  - `diccionario_datos.md` (borrador de entidades on-chain/off-chain)
  - `entornos_globales.md` (repos, GCP, anvil, variables)
- [x] **Auditoría Fase 2 (@audita)** — `INFORME_OPTIMIZACION_V1.md`: 48 hallazgos verificados
  (5 CRITICA · 24 ALTA · 17 MEDIA · 2 BAJA); veredicto: **no apto para producción** sin cerrar
  H-01…H-05 y ronda de aclaración D12+.
- [x] **Ronda D12+ completada** (D12–D25): hallazgos críticos y altos del informe resueltos.
- [x] **Skill `asistente-proyecto` actualizada**: casos de uso bajo criterio de analista funcional
  (Gherkin/EARS + trazabilidad + testeabilidad) con auditoría de casos de uso antes de avanzar.
- [x] **Casos de uso v2**: `casos_uso.md` — 31 CU (CU-01…CU-31), 170 criterios testeables
  (72 Gherkin + 98 EARS). Backup v1: `casos_uso_v1_backup.md`. Diagramas en `CDU/` (13 PNG + 12 Mermaid).
- [x] **Auditoría de casos de uso** — `INFORME_AUDITORIA_CASOS_USO_V1.md`: dudas U-01…U-13
  resueltas con D26–D31 y aplicadas en los CU.
- [x] **Documento de Arquitectura Técnica** — `arquitectura_tecnica.md` (10 secciones, ciclos
  C1–C8); 11 pendientes de arquitectura resueltos con D32–D41.
- [x] **Estilo visual incorporado** — `PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md` → RNF-08 + activos
  `TrueKeate/` → RF-19 (D41), aplicados en `arquitectura_tecnica.md` §8/C7.
- [x] **Auditoría de coherencia (6 lentes C1–C6)** — sincronía entre documentos verificada y
  correcciones aplicadas (cabeceras, CU-04/18/23/24/31, diccionario, estados del escrow,
  nomenclatura unificada, informes marcados históricos).

- [x] **Propuesta navegación PC/móvil** — `PROPUESTA_NAVEGACION_PC_MOVIL.md`: evaluación de dos suites
  separadas vs una suite con doble presentación. **Decisión del director: Opción B** (una sola suite;
  PC ≥lg con barra superior de secciones por Tipo de Usuario + móvil con BottomNav inferior filtrada
  por rol). Implementación: `lib/navegacion.ts` (matriz única RF-14/D14/D28), `TopNavPc.tsx`,
  `BottomNav` dinámica con "Más", layout `lg:`/`hidden`, placeholders `/suite/admin`, `/suite/finanzas`,
  `/suite/disputas`. **Desplegado en GCP** (web `nav-pc-movil`) y **verificado en vivo**: PC 1366px →
  barra superior por rol + bottom oculta; móvil 393px → bottom con central hexagonal + barra PC oculta.
  Tests E2E: **21/21** (3 skipped por plataforma).

- [x] **Panel del Owner REAL (`/suite/admin`, RF-13.1)** — corrección del placeholder: el Owner
  conectado ve ahora datos operativos reales del backend (usuarios, contratos con direcciones, KPIs
  de disputas, estado de la BD, salud de relayer/indexador). Autenticación: firma EIP-191
  ("TrueKeate: iniciar sesión") → token Bearer → `GET /admin/*`. Verificado en vivo contra GCP
  (firma de la cuenta 0 → 200 en los 5 endpoints; relayer OK wallet `0x7099…79C8`).
  `web/app/suite/admin/page.tsx` + `lib/api.ts` (iniciarSesion/admin*). Protección de URL por rol
  en `SuiteGuard` (un usuario sin permiso que escriba la URL ve "No tienes acceso").

## ✅ Ciclos faltantes completados — 6 pantallas de la suite integradas

Las pantallas que quedaron como placeholder ("se completa en el Ciclo 8") se integraron con el
backend real (orden del director, 2026-09-04):

| Pantalla | Funcionalidad | Backend |
|---|---|---|
| **Inventario** `/suite/inventario` | Publica artículos AtoA (Verificado/Certificado), lista los propios, retira del mercado | `POST /catalog/articulos`, `POST /catalog/:id/despublicar` (nuevo) |
| **Intercambio** `/suite/intercambio` | Crea trueques (artículo A ⇄ B de otro), lista mis trueques, custodiar, firmar, valorar 1–5 | `GET/POST /truekes`, `custodiar`, `firma-recepcion`, `valoracion` |
| **Perfil** `/suite/perfil` | Identidad (wallet, tipo, estado D28, escalera) + reputación D12/D30 | `GET /reputacion/mi` |
| **Finanzas** `/suite/finanzas` | Saldos NFTs/criptos; BRLT y fondo SOLO Socio/Owner (D5/RF-14.7) | `GET /finanzas/mi` (nuevo) |
| **Disputas** `/suite/disputas` | Disputas donde soy parte; solicitar anulación (D13) → EN_DISPUTA | `GET/POST /disputas` (nuevo) |
| **Gobernanza** `/suite/gobernanza` | Padrón y propuestas del SociosRegistry on-chain; Socio vota (D21) | `GET /gobernanza/socios|propuestas`, `POST /gobernanza/votar` (nuevo) |

**Backend**: almacén híbrido `almacen-pg.js` persiste truekes (escrow_id sintético negativo para no
colisionar con on-chain, RNF-01.1), finanzas y disputas en PostgreSQL; routers nuevos
`finanzas.js`, `disputas.js`, `gobernanza.js` (ABI del registry corregido al struct real de 11
campos). Sesión autenticada compartida por firma EIP-191 (`useSesionAutenticada`). Protección de URL
por rol en `SuiteGuard`.

**Verificación**: backend **32/32** (5 archivos de tests) · E2E **37 passed** (12 nuevos de pantallas
× 2 proyectos) · build OK. Desplegado en Cloud Run.

## ✅ Control de acceso por estados (decisión del director, post-entrega)

El director reportó 3 problemas al usar la plataforma y ordenó corregirlos:

1. **Suite accesible sin billetera** → corregido: `/suite/**` exige wallet conectada (`SuiteGuard` en
   `web/components/SuiteGuard.tsx`); el público general solo ve la landing. Sin wallet se muestra
   "Conecta tu billetera para continuar".
2. **Wallets conectadas sin inscribir accedían a todo** → corregido: una wallet conectada SIN
   inscripción solo puede ver el **catálogo** (`/suite/mercado`, nuevo) y el resto de la suite le
   pide inscripción.
3. **Faltaba verificar la inscripción y ofrecerla** → corregido: la suite consulta el estado real
   contra el backend (`GET /auth/estado?wallet=…`); si no está inscrita, el **menú de usuario**
   (`TopBar`) muestra el botón **"Completar inscripción"** que abre `/suite/inscripcion`
   (formulario formal: correo + teléfono + dirección + consentimiento GDPR → estado INSCRITO).

Cambios de comportamiento (documentados en `requerimientos.md` RF-01.4 y `casos_uso.md` CU-01):
- **Conectar la wallet ya NO inscribe automáticamente** (antes RF-01.4 autoinscripción); la
  inscripción es **formal** (RF-01.2b/01.3, escalera D28).
- El backend persiste usuarios/inscripción/catálogo en **PostgreSQL (Cloud SQL)** con el nuevo
  almacén híbrido `backend/api/lib/almacen-pg.js` (misma interfaz; usado en `index-gcp.js` cuando
  hay `DATABASE_URL`). Antes el almacén era solo en memoria.
- CORS habilitado en la API (`web` → `api`, origen configurado por `CORS_ORIGEN`).

Verificación en GCP (2026-09-03, en vivo): sin wallet → guard bloquea; wallet no inscrita → pide
inscripción; catálogo visible; `register` persiste en Cloud SQL (estado INSCRITO) y `GET
/auth/estado` lo confirma; el Owner (cuenta 0) figura CERTIFICADO/SOCIO. Tests: backend 28/28,
E2E Playwright **20/20** (9 casos landing/suite × 2 proyectos + 2 de control de acceso nuevos).

## ✅ Despliegue en GCP (2026-09-03)

| Componente | Recurso | URL / detalle |
|---|---|---|
| **Contratos** | Anvil remoto MCC (chain 31337, `mcc-foundry-anvil-slzlptbcla-ew`) | Escrow `0x8a93…e5d8` · Factory `0x4091…d849` · BRLT `0x6f6f…f78` · Fondo `0xca8c…8b9` · Registry `0xb0f0…e21b` · Suscripción `0x5fea…c4ae` · TKA/TKB/NFT (owner = cuenta 0) |
| **API backend** | Cloud Run `truekeate-api` (europe-west1) | https://truekeate-api-593453426217.europe-west1.run.app (healthz 200; relayer = cuenta 1 `0x7099…79C8`; indexador activo sobre Cloud SQL) |
| **Frontend web** | Cloud Run `truekeate-web` (europe-west1) | https://truekeate-web-593453426217.europe-west1.run.app (landing, /suite/dashboard, /help/manual → 200) |
| **BD off-chain** | Cloud SQL `truekeate-db-dev` (PG15, southamerica-east1) | Esquema TrueKeate aplicado (14 tablas + extensiones) junto a tablas preexistentes del proyecto; secreto `DATABASE_URL` apunta vía socket `/cloudsql` |
| **Secretos** | Secret Manager `truekeate-main` | `RPC_URL` (anvil remoto), `DATABASE_URL`, `RELAYER_PRIVATE_KEY` (**v3 = cuenta 1**, corregido), `KYC_SECRET` |
| **Imágenes** | Artifact Registry `truekeate-repo` (southamerica-east1) | `backend:latest`/`backend:fix-indexador`, `web:latest` |

**Bootstrap del Owner en GCP ejecutado** ✅: BD registra cuenta 0 como `CERTIFICADO/SOCIO/ORO` con SmartAccount `0xDb35…6AA`; `esSocio=true` on-chain (tx `0x7196…f2`).

**Correcciones aplicadas durante el despliegue**:
- ethers v6: `f.format('sighash')` devolvía el nombre del evento en vez del topic hash → `f.topicHash` en `backend/indexador.js:196` (bug latente no cubierto por tests con mock; verificado en vivo contra anvil remoto: barrido Escrow OK, 1 evento procesado).
- Secreto `RELAYER_PRIVATE_KEY` apuntaba a la cuenta 0 → corregido a la **cuenta 1** (RF-15.2).
- `backend/contratos.json` y `web/lib/contracts.ts` actualizados con las direcciones del despliegue remoto.
- Dockerfiles creados (`backend/Dockerfile`, `web/Dockerfile` con Next standalone) + entrypoint `backend/api/index-gcp.js`.

**Notas de operación**: el indexador corre dentro del servicio API (barrido periódico); con `min-instances=0` queda inactivo si no hay tráfico — para indexado continuo usar `--min-instances=1` o un job dedicado.

## ✅ Cierre de la Fase 4 — Pruebas

| Suit de pruebas | Resultado | Cobertura / detalle |
|---|---|---|
| **Foundry (smart contracts)** | **62/62 verdes** | 61 unit/fuzz + 1 suite de invariantes handler-based |
| Invariantes (EscrowInvariants) | **5/5** | I1 conservación de activos · I2 sin cancelación con custodia · I4 anulaciones resueltas en plazo · I5 sanción solo tras timelock · I7 completado requiere firmas + valoración |
| **Backend (Node, node:test)** | **26/26 verdes** | indexador 5/5 · relayer 7/7 · API 7/7 · ciclo8 7/7 |
| **Frontend E2E (Playwright)** | **18/18 verdes** | 9 casos × 2 proyectos (chromium + mobile-chrome Pixel 5, RNF-02.3) |
| Cobertura Forge (gate D38 ≥80 %) | **OK — 89.55 % líneas** (497/555) | Escrow 95.19 % · SmartAccount 95.12 % · Factory 100 % · BRLT 90 % · Fondo 100 % · Registry 94.03 % · Suscripción 81.82 % · Handler invariantes 100 % |

Detalle E2E (9 casos × 2 proyectos):
- Landing pública RF-14.1: hero + título + CTA → suite, métricas, ventajas (3 casos).
- Suite RF-14.2: barra superior `@usuario` (RNF-08.4), escalera D28 (INSCRITO → VERIFICADO → CERTIFICADO), módulos atenuados para Inscrito (RF-14.3), botón Conectar MetaMask sin sesión (RF-16), navegación móvil hexagonal (5 casos).
- Entorno de ejecución: Chromium headless con librerías del sistema extraídas + fontconfig/DejaVu (fuentes del sistema indisponibles en el sandbox); servidor `npm run start` en :3000 (reuseExistingServer).

**Hallazgos corregidos durante Fase 4** (ninguno funcional):
- E2E fallaba por fonts del sistema ausentes en el entorno headless → resuelto instalando fuentes DejaVu + fontconfig (no es defecto de la app).
- Locator de la escalera D28 en strict mode (texto `INSCRITO` presente en escalón y badge) → acotado a `getByRole("list")` (práctica Playwright).

## ✅ Cierre de la Fase 5 — Manuales (@manuales)

Workflow de 10 agentes en 5 roles sobre el código real (`sc/`, `backend/`, `web/`):

| Rol | Entregable | Detalle |
|---|---|---|
| 🔧 TÉCNICO (×4) | `RepoTecnico/Manuales/**` — **16 manuales técnicos** | 01-Tecnologia (plataforma, stack Web3/backend/frontend), 02-Dependencias (versiones exactas), 03-Implementacion (contratos, identidad, finanzas, indexador, relayer, API, frontend, pruebas), 04-Despliegue, 05-Diccionario-de-Datos (14 tablas + enum 9 estados), 06-Diagrama-Relacional. Jerarquía `##/###/####` con referencias `ruta:línea` al código real; discrepancias reales detectadas marcadas como observación o "pendiente de confirmar" |
| ✍️ LITERARIO (×3) | `docs/Manuales/**` — **16 manuales de usuario** | Mismo árbol que los técnicos; lenguaje sencillo, apartado "Empezar en 5 minutos", pasos numerados, ejemplos cotidianos y 37 marcadores `<!-- GENERAR_IMAGEN -->` + bloques mermaid |
| 🎨 CREATIVO | `docs/imagenes/` — **33 SVG** | Diagramas con la paleta "Bóveda Digital" leída de `web/app/globals.css` (navy/teal/cyan/gold/crimson/coral): estados-escrow (9 estados), escalera-verificacion (D28), flujo-truque, arquitectura, glosarios, etc. |
| 📄 ASISTENTE PDF | `docs/Manuales/pdf/` — **16 PDF** (+16 HTML en `pdf/html/` + `README.md` + `web/scripts/generar-pdfs.mjs`) | A4 con portada TrueKeate, índice navegable, avisos codificados por color, 37 SVG embebidos y headers/footers "Página X de Y" (Playwright Chromium con fontconfig) |
| 🧩 INTEGRADOR | Ayuda en plataforma: `web/app/help/manual/page.tsx` + `web/lib/manual-data.ts` (16 manuales, 6 grupos) | `/help/manual` con acordeones `<details>`, 33 imágenes desde `/manual/imagenes/`, 16 enlaces PDF `/manual/pdf/`; footer de la landing `/` con enlace "📖 Ayuda · Manuales TrueKeate" (sin romper textos ni rutas existentes) |

**Verificaciones**: build Next.js OK (`○ /help/manual` prerenderizado estático); E2E Playwright **18/18** tras la integración (footer añadido no rompe `landing.spec.ts`); todas las imágenes y PDF referenciados existen en `web/public/manual/` (0 rotas); corrección aplicada: marcador `flujo-trueque.svg` → `flujo-truque.svg` (nombre real del archivo) en 2 literales.

## ✅ Cierre de la Fase 2 — Documentación sincronizada

Todos los documentos de la Fase 2 quedaron **coherentes entre sí** tras la auditoría de coherencia
(6 lentes) y las correcciones aplicadas: `requerimientos.md` (RF-01…RF-19, RNF-01…RNF-08,
RT-01…RT-05, D1–D41, estilo visual RNF-08 y activos RF-19), `diccionario_datos.md` (enum canónico
de 9 estados del escrow, decisiones D23/D26/D28/D32/D33/D34 aplicadas), `casos_uso.md` (31 CU con
criterios Gherkin/EARS alineados), `arquitectura_tecnica.md` (secciones 1–10, ciclos C1–C8),
`estado_proyecto.md` y los informes V1 marcados como históricos con seguimiento.

## Decisiones registradas (D1–D41)

| ID | Decisión |
|---|---|
| D1 | **Next.js 16** |
| D2 | Publicación **solo AtoA** (se omite "Artículo por Rubro") |
| D3 | **Sistema unificado** niveles + medallas |
| D4 | Mapeo: **Bronce=Iniciado, Plata=Común, Oro=Frecuente, Socio=votación** |
| D5 | Finanzas de usuario: **NFTs/Criptos/BRLT** (BRLT solo Socios y Owner) |
| D6 | BRLT **emitida desde el inicio**, contrato de Socios |
| D7 | Fondo de valor: **1% trueque + 10% suscripciones + 5% emisión BRLT**, configurable por Owner |
| D8 | Repos: rama `escrow-dsh-GCP` en GitHub y GitLab.com |
| D9 | Proyecto GCP `truekeate-dsh` creado (ID minúsculas) |
| D10 | **Reutilizar `truekeate-main`**; `truekeate-dsh` eliminado |
| D11 | Acceso `gitlab.codecrypto.academy` se resuelve luego |
| D12 | **Fórmula de niveles aprobada** (H-01): `0,5·rep + 0,3·vol + 0,2·(1−ratioAp)`; umbrales 0–25 / 26–50 / 51–75 / ≥76+votación |
| D13 | **Anulación escrow**: quórum Socios ≥2/3, máx **5 días** (H-05) |
| D14 | **Verificado para truequear** (H-09); límites 5 / 50 por nivel (H-10) |
| D15 | **Relayer**: operador + 2 instancias + fondo financia gas + SLA ≥99% (H-02) |
| D16 | **4 protecciones anti-abuso relayer** (H-03): nonce, allowlist verificados, límite diario, rate-limiting |
| D17 | **GDPR + backup**: consentimiento, retención 24 meses, cifrado en reposo de PII, RPO≤24h/RTO≤48h (H-04) |
| D18 | **Valoración escala 1–5** (H-06) |
| D19 | **Definiciones operativas** (H-07/H-08): alta disponibilidad 10 pub/5 usr/30d; 3% en 90d; inactividad 180d → degradación |
| D20 | **Módulo Subastas** (H-12): solo Empresas crean; solo Certificados participan con prioridad por nivel |
| D21 | **Gobernanza** (H-20): quórum 2/3 un voto por Socio; sanciones on-chain con timelock 6h |
| D22 | **Arquitectura gas** (H-29): Smart Account ERC-4337 (identidad) + relayer propio EIP-712 (gas) |
| D23 | **Evidencia imágenes** (H-27): raíz merkle anclada on-chain + IPFS con pinning propio |
| D24 | **Roles operativos** (H-21…H-26): RF-18 asignados al Owner/equipo + auditoría externa Fase 4 |
| D25 | **Indexador/DB** (H-16/H-44): listener Node.js propio + reusar mcc-postgres |
| D26 | **Escrow sin quórum** (U-01): ANULADO por defecto a los 5 días, NFTs devueltos a ambas partes |
| D27 | **Subastas** (U-02): gana el mayor valor; empate → mayor nivel |
| D28 | **Escalera estados** (U-03): Inscrito → Verificado (códigos correo+teléfono) → Certificado (KYC completo) |
| D29 | **Meta-tx** (U-07): 20 transacciones/día; 3 fallos en 10 min → bloqueo 1 h |
| D30 | **Fórmula nivel** (U-11…13): insumos normalizados 0–100; recálculo mensual |
| D31 | **Cancelación** (U-05): unilateral solo pre-custodia; post-custodia solo anulación con quórum |
| D32 | **BRLT** (arquitectura): emisión con quórum 2/3; tope inicial 1M BRLT |
| D33 | **Suscripción** (H-45): staking bloqueado 30 días; plan 100 BRLT/mes configurable |
| D34 | **Recuperación social** (arquitectura): 3 guardianes, umbral 2/3, timelock 48 h |
| D35 | **EntryPoint**: NO se usa el estándar; Smart Account inspirada en 4337 + relayer propio |
| D36 | **Valoraciones off-chain** (5 renglones 1–5) + marcador on-chain "ambas valoraron" |
| D37 | **Proveedores open source**: OSM+Nominatim, OSRM, Nodemailer+SMTP, Kubo propio |
| D38 | **Cobertura**: forge coverage ≥80% líneas como gate por ciclo |
| D39 | **Fallback relayer**: modo degradado (usuario paga gas) + reembolso BRLT si caída del operador |
| D40 | **PWA instalable** en Fase 3; APK nativa como mejora futura |
| D41 | **Entorno visual aprobado**: PROPUESTA_ENTORNO_VISUAL_TRUEKEAT.md → RNF-08 + assets TrueKeate/ → RF-19 |

## Pendientes

- [ ] Acceso SSH a `gitlab.codecrypto.academy` (D11 — pospuesto)
- [x] **Ciclo 1 — Setup Foundry + Escrow base** ✅
  - [x] Instalar Foundry (forge/anvil 1.8.1)
  - [x] Proyecto Foundry en `sc/` + OpenZeppelin v5.0.2 + forge-std
  - [x] `Escrow.sol` base: CREADO/ACTIVO → CUSTODIADO → APERTURA → COMPLETADO (ventanas 10 min/10 min, firmas duales, cancelación pre-custodia D31, marcador de valoración D36)
  - [x] Tests unit + fuzz: **18/18 verdes**; cobertura **94.96 % líneas** (gate D38 ≥80 % OK); invariantes I1/I2/I3 cubiertos
  - [x] Despliegue en anvil (cuenta 0 Owner): Escrow `0x5fbdb2…aa3` + mocks TKA/TKB/NFT
- [x] **Ciclo 2 — SmartAccount ERC-4337 + KYC estados** ✅
  - [x] `SmartAccount.sol`: wallet de identidad ERC-4337 inspirada (D35, sin EntryPoint), ejecución por firma EIP-712 con nonce (D16), escalera INSCRITO/VERIFICADO/CERTIFICADO por merkle root (D28, RF-01.7), recuperación social 3 guardianes / umbral 2/3 / timelock 48h (D34)
  - [x] `SmartAccountFactory.sol`: despliegue CREATE2 one-per-owner (CU-01)
  - [x] Tests: 14 nuevos (32/32 totales verdes); cobertura SmartAccount 95.12%, Factory 100%
  - [x] Despliegue anvil verificado: Factory + cuenta desplegada OK
- [x] **Ciclo 3 — BRLT + Suscripciones + Fondo** ✅
  - [x] `SociosRegistry.sol`: padrón de Socios + votación de admisión con quórum ≥2/3 (D21, CU-03) + propuestas económicas (emisión/tope BRLT) con quórum 2/3 (D32)
  - [x] `BRLT.sol`: ERC-20 BorloTokens controlado por el registry (D6), tope inicial 1M (D32), registro con propósito, 5% al fondo (D7)
  - [x] `FondoDeValor.sol`: fondo de operación (D7), porcentajes 1%/10%/5% configurables por Owner, retiros para operación (D15)
  - [x] `SuscripcionEmpresa.sol`: staking bloqueado 30 días, plan 100 BRLT/mes configurable (D33), 10% al fondo (D7), cancelación con devolución (CU-24)
  - [x] Tests: 20 nuevos (52/52 totales verdes); cobertura líneas: BRLT 90%, Fondo 100%, Registry 94%, Suscripción 82%
  - [x] Despliegue anvil verificado: BRLT/Fondo/Registry/Suscripcion OK
- [x] **Ciclo 4 — Indexador + PostgreSQL + PostGIS** ✅
  - [x] `backend/db/schema.sql`: esquema PostgreSQL completo (14 tablas + PostGIS + enum canónico 9 estados + escalera D28 + cifrado PII D17 + idempotencia UNIQUE)
  - [x] `backend/indexador.js`: listener Node.js propio (D25) — idempotencia (tx_hash/log_index/entidad), checkpoints por contrato, reconciliación, métricas de lag
  - [x] `backend/indexador-cli.js`: barrido único / modo servicio --watch
  - [x] Tests: 5/5 (node:test, pool en memoria): mapeo TruekeCreado→truekes, custodia→CUSTODIADO, idempotencia, barrerDesde+checkpoint, contrato desconocido
  - [ ] Integración con `mcc-postgres` real (pendiente de entorno GCP — D25)
- [x] **Ciclo 5 — Relayer EIP-712** ✅
  - [x] `backend/relayer.js`: relayer que envía meta-tx asumiendo el gas (RF-09.2) desde la cuenta 1 (RF-15.2); 4 protecciones D16 (nonce+chainId, allowlist de verificados con chequeo on-chain D28, límite diario 20/día D29, endpoint autenticado — rate-limit en C6); bloqueo 1h tras 3 fallos/10 min (D29); health-check SLA (D15)
  - [x] Tests: 7/7 (node:test con provider mock): intent verificado, rechazo no-verificado, nonce repetido, chainId, límite diario, bloqueo por fallos, health
  - [x] Integración E2E real en anvil: SmartAccount marcada VERIFICADO (D28) + meta-tx enviada por cuenta 1 con nonce incrementado ✅
- [x] **Ciclo 6 — Backend API REST** ✅
  - [x] `api/app.js`: Express con rate-limiting global (D16/RF-09.6), /healthz, manejo de errores
  - [x] `api/routes/auth.js`: connect (inscripción RF-01.4), register (GDPR D17), session por firma EIP-191
  - [x] `api/routes/kyc.js`: escalera D28 (códigos→VERIFICADO; documento+selfie + revisión Owner→CERTIFICADO, RF-18.4)
  - [x] `api/routes/catalog.js`: publicaciones AtoA con límites por nivel (D14/RF-04.2), encargos (CU-07)
  - [x] `api/routes/truekes.js`: creación (Verificado, máx 3 activos RF-14.4), custodiar, firma, valoración 1-5 (D18/D36)
  - [x] `api/routes/admin.js`: dashboard Owner (RF-13.1): usuarios, contratos, KPIs disputas, db, infra/health
  - [x] Tests: 7/7 (supertest + almacén en memoria); suite backend **19/19**
- [x] **Ciclo 7 — Frontend suite + landing** ✅
  - [x] Next.js 16.3.4 + TypeScript + Tailwind v4 + ethers v6 (D1/RT-04)
  - [x] `lib/ethereum.tsx`: context provider MetaMask (RT-04.4): provider/signer/account + auto-reconexión (RF-16.2)
  - [x] `lib/contracts.ts`: ABIs de los 6 contratos + direcciones anvil (RT-04.5)
  - [x] Sistema de diseño RNF-08 en `globals.css`: tokens @theme (paleta Bóveda Digital, gradientes, curvas) + componentes Button/Card/BottomNav/StatusBadge
  - [x] Landing (RF-14.1) con assets hero + logo/título (RF-19)
  - [x] Suite por estado/rol (RF-14.2-14.8): dashboard con escalera D28 + 4 módulos
  - [x] Assets de marca copiados a `web/public/brand` y `web/public/hero` (RF-19)
  - [x] Manifest PWA instalable (D40); build OK (9 páginas estáticas)
- [x] **Ciclo 8 — Cierre vertical: disputas + reputación + subastas** ✅
  - [x] `Escrow.sol` ampliado: CU-17 bloqueo (RF-05.8), CU-18 anulación con quórum ≥2/3 (D13) y ANULADO por defecto a los 5 días (D26), CU-19 sanción con timelock 6h (D21); vinculación a SociosRegistry; 9/9 tests nuevos (suite Foundry 61/61)
  - [x] `api/lib/reputacion.js` + router `/reputacion`: fórmula D12/D30 (insumos 0–100, recálculo mensual), Oro histórico (RF-07.4), penalización inactividad (D19/CU-21)
  - [x] Router `/subastas`: solo Empresa crea (RF-17.1), solo Certificado puja (RF-17.2), mayor valor gana con desempate por nivel (D27/CU-25/26)
  - [x] Tests: 7/7 C8 (suite backend **26/26**; suite Foundry **61/61**; total plataforma 87 tests)
- [x] **Push realizado en los 3 repos** ✅: rama `escrow-dsh-GCP` en `0f5e521` publicada en **GitHub**, **GitLab.com** y **gitlab.codecrypto.academy** (token HTTPS configurado globalmente; contenido heredado reemplazado por lo construido con forced update)
- [x] **D11 resuelto**: acceso a `gitlab.codecrypto.academy` habilitado vía token (credential helper global)
- [x] **Fase 4 — Pruebas completadas** ✅: Foundry 62/62 (unit/fuzz + invariantes), backend 26/26, E2E Playwright 18/18 (chromium + mobile-chrome); cobertura Forge ≥80 % (D38) verificada
- [x] **Push e75e69a (Fase 4) en los 3 repos** ✅: rama `escrow-dsh-GCP` publicada en **GitHub**, **GitLab.com** y **gitlab.codecrypto.academy**
- [x] **Fase 5 — Manuales completados (@manuales)** ✅: 16 manuales técnicos (`RepoTecnico/Manuales/`), 16 manuales de usuario (`docs/Manuales/`), 33 SVG (`docs/imagenes/`), 16 PDF (`docs/Manuales/pdf/`) y Ayuda integrada en `/help/manual` (web). E2E 18/18 y build OK tras integración.
- [x] **Entrega final ✅** — Proyecto TrueKeate completado (Fases 1–5) y confirmado por el director; push de cierre `c8fc77e` en **GitHub**, **GitLab.com** y **gitlab.codecrypto.academy** (rama `escrow-dsh-GCP`).
- [x] **Verificación de cuentas (post-entrega)** ✅:
  - Cuenta 0 `0xf39F…2266` = **Owner/deployer**: todas las txs de `run-latest.json` firmadas desde ella (RF-15.1); `owner()` on-chain = cuenta 0.
  - Cuenta 1 `0x7099…79C8` = **Relayer + gastos de la plataforma** (RF-15.2, `relayer.js`, test de integración).
  - Hueco detectado y cerrado: el Owner NO quedaba CERTIFICADO/SOCIO en la plataforma → nuevos scripts de operación.
- [x] **Scripts de operación (producción)** ✅:
  - `backend/scripts/reiniciar-plataforma.sh` (+ `.mjs`): reset total de la BD off-chain (TRUNCATE CASCADE de las 14 tablas) **sin tocar anvil**; exige `--confirmar` + confirmación `BORRAR`; `--check` diagnóstico y `--respaldo` (pg_dump). Solo se ejecuta por orden del director.
  - `backend/scripts/bootstrap-owner.sh` (+ `.mjs`): registra al Owner (cuenta 0) en BD como CERTIFICADO + tipo/nivel SOCIO + GDPR, lo admite como Socio on-chain (`admitirSocioDirecto`) y opcionalmente despliega su SmartAccount (`--smart-account`).
  - Doc: `RepoTecnico/Manuales/04-Despliegue/02-reinicio-y-bootstrap.md` (enlazado desde el manual de despliegue).
- [x] **Scripts VALIDADOS en entorno de pruebas real** ✅ (PostgreSQL 16 + PostGIS 3.4 locales en `/tmp/pgroot` + anvil 31337):
  - `reiniciar-plataforma.mjs --check`: 14/14 tablas detectadas con conteos, sin borrar.
  - `reiniciar-plataforma.sh --confirmar`: TRUNCATE CASCADE → 0 filas en las 14 tablas; secuencias reiniciadas (INSERT siguiente = id 1); esquema, extensiones postgis/pgcrypto y anvil intactos.
  - `bootstrap-owner.mjs`: Owner (cuenta 0 `0xf39F…2266`) verificado como dueño on-chain del SociosRegistry; relayer verificado como cuenta 1 (`0x7099…79C8`); BD registra `CERTIFICADO + SOCIO/SOCIO/ORO + GDPR`; `admitirSocioDirecto` on-chain ejecutado (`esSocio=true`, totalSocios=1); con `--smart-account` desplegó la SmartAccount del Owner (`0x925A…f0B`) y la registró en BD.
  - Flujo completo producción (sembrar datos → reiniciar → bootstrap) ejecutado con anvil vivo: OK.

## Próximos pasos

1. **✅ Proyecto ENTREGADO** — Fases 1–5 completadas y publicadas en los 3 repos (rama `escrow-dsh-GCP`).
2. Operación (solo por orden del director): `backend/scripts/reiniciar-plataforma.sh --confirmar` (reset BD off-chain sin tocar anvil) y `backend/scripts/bootstrap-owner.sh --confirmar` (Owner CERTIFICADO/SOCIO) — ver `RepoTecnico/Manuales/04-Despliegue/02-reinicio-y-bootstrap.md`.
3. Mejoras futuras opcionales (fuera de alcance): APK nativa (D40), integración con `mcc-postgres` real en GCP (D25), auditoría externa de seguridad previa a producción (D24), integración del 1 % de trueques al FondoDeValor (D7, marcado "pendiente de confirmar" en manuales), root merkle real del KYC para la escalera on-chain del Owner (D28).
4. Los commits se crean localmente en `escrow-dsh-GCP`; el push a GitHub/GitLab se hace solo por orden del director (`/push`).
