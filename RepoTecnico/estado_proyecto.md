# TrueKeate — Estado del Proyecto

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con escrow) |
| Archivo | `RepoTecnico/estado_proyecto.md` |
| Fase actual | **ENTREGADO + DESPLEGADO en GCP** + login wallet único + escudo D28 + Verificar/Certificar |
| Última actualización | Login único con la billetera; escudo de estado D28 en la barra; procesos Verificación (código correo) y Certificación (KYC) con UI |

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

## ✅ Manuales de wallet con fichas didácticas (tema 07-Wallets-y-Cuentas)

Auditados los datos reales antes de crear los contenidos (RPC `…anvil-slzlptbcla-ew.a.run.app`,
chain 31337, cuentas anvil 0–12 con claves del mnemónico estándar, contratos BRLT
`0x6f6f…48f78` / TrueKeateNFT `0x99db…612f`). 6 manuales técnicos + compendio de fichas
(`RepoTecnico/Manuales/07-Wallets-y-Cuentas/`), 7 manuales literales con fichas didácticas
("¿Qué es? · ¿Para qué sirve? · Pasos clave · Errores comunes · Consejo de seguridad"),
8 diagramas SVG, 7 PDF descargables. Temas: (1) instalar/crear wallet PC y móvil, (2) conexión
red RPC, (3) importar cuentas anvil 2–12 con usuario (Ana…Karen; cuenta 10 sin fondos),
(4) añadir token BRLT, (5) verificar NFTs de trueques, (6) firmar/autorizar/completar con la
wallet. Integrados en `/help/manual` (grupo "Tu billetera y tus cuentas", 23 manuales totales).

**Bug corregido durante la verificación**: los estáticos nuevos se copiaban con permisos 600
(root) y el contenedor corre como `node` → 500 en SVG/JSON. Fix en `web/Dockerfile`
(`COPY --chown=node:node /app/public`). Verificado en producción: SVG/PDF/manifest → 200.

## ✅ Mejoras de UX reportadas al operar (login único, escudo D28, Verificar/Certificar)

1. **Login único con la billetera**: al conectar se pide UNA firma EIP-191 que emite el token de
   sesión global (persistido en `SesionProvider` + localStorage). Las 6 páginas dejan de pedir
   autenticación propia (`useSesionAutenticada` ahora lee el token global). Sesiones persistidas en
   PostgreSQL (tabla `sesiones`, 24 h) para Cloud Run multi-instancia. Componente
   `BotonConectarLogin`.
2. **Escudo de estado D28 en la barra** (`EscudoEstado` en TopBar): INSCRITO=escudo amarillo →
   `/suite/verificacion` · VERIFICADO=verde → `/suite/certificacion` · CERTIFICADO=verde con brillo
   dorado → `/suite/perfil`.
3. **Verificación (etapa 1)**: `/kyc/init` genera código de 6 dígitos y lo envía al correo; sin
   SMTP configurado devuelve `codigoDemo` (modo demo) — página `/suite/verificacion` funcional.
4. **Certificación (etapa 2)**: `/kyc/submit` registra documento+selfie → PENDIENTE de revisión
   Owner (RF-18.4) → CERTIFICADO — página `/suite/certificacion` funcional.
5. **Propuesta de metodología** para el envío real por SMTP (Nodemailer, secretos, persistencia de
   códigos) y el KYC automático con verificador externo:
   `RepoTecnico/PROPUESTA_VERIFICACION_CERTIFICACION.md`.

Verificación: backend **32/32** · E2E **43 passed** (6 nuevos de escalera D28 × proyectos) ·
flujo verificación validado en vivo en GCP (register→login→kyc/init genera código→verify OK).
Desplegado en Cloud Run (`backend:login-kyc`, `web:login-escudo`).

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
- [x] **Verificación de 2 sugerencias (post-entrega)** ✅ — ver `RepoTecnico/logica_trueke.md`:
  - **S1 "inventario para todos los inscritos según nivel y reputación"** → **NO se cumple hoy** (Inventario visible solo VERIFICADO/CERTIFICADO/SOCIO/EMPRESA; publicar exige VERIFICADO/CERTIFICADO; límite por nivel INICIADO 5…SOCIO 100 sin factor reputación). Director resolvió: **mantener como está (solo Verificado+)**.
  - **S2 "en la ficha de un intercambio del mercado no hay botón para completar"** → **correcta en parte**: el Mercado lista artículos sueltos sin botón de acción; no muestra trueques en curso; el completado es automático on-chain al firmar recepción ambas partes (no existe botón "completar"). Director pidió **ver el detalle de cada ficha para acordar un intercambio**.
  - **Lógica maestra del Trueke definida por el director** (ciclo en 9 puntos) **documentada** en `RepoTecnico/logica_trueke.md` y enlazada en RF-05 de `requerimientos.md`. Decisiones confirmadas: **NFT on-chain real por ítem** y **bifurcación de cierre Recibido Conforme → valoración / No Conforme → disputa**. Estatus: **documentada, pendiente de validación final e implementación** (brechas 🔴 documentadas; no se tocó código).
- [x] **Migración al modelo de trueque abierto-publicado F1–F4** ✅ (plan aprobado por el director; ver `RepoTecnico/logica_trueke.md` §5 "Implementado"):
  - **F1 (sc)**: `sc/src/TrueKeateNFT.sol` real (mint solo plataforma + categorías ARTICULO/SERVICIO/BIEN/CRIPTO + metadatos); Escrow `vincularTrueKeateNft` (solo NFT oficial); Deploy.s.sol actualizado; 9 tests nuevos → **Foundry 71/71**.
  - **F2 (bd)**: enum `estado_escrow` + `PROPUESTO` (10 estados); enum `categoria_item`; `articulos.categoria`; `truekes.usuario_b` nullable + `descripcion_requerida`/`tipo_requerido`/`cierre_a`/`cierre_b`; tabla `puntos_favoritos`; `backend/db/migracion_trueke_abierto.sql` idempotente validada en PG local.
  - **F3 (api)**: `POST /truekes/ofertas`, `GET /truekes/ofertas` (Mercado), `POST /:id/acordar`, `POST /:id/propuesta-encuentro` (nivel D12 → reputación → A), `POST /:id/cierre` (Conforme/No Conforme); catálogo con categoría; almacenes memoria+pg; smoke pg OK → **backend 34/34**.
  - **F4 (web)**: Mercado de truekes ofertados con ficha modal + Acordar; dashboard Mis Truekes (Ofertados/Activos/Cerrados) + alta de oferta con "qué quiero recibir"; Intercambio con cierre ✓ Recibido Conforme / ✗ No Conforme (+ disputas); Inventario con categorías → **E2E 43 passed / 3 skipped**.
  - Pendientes marcados en `logica_trueke.md`: minteo automático on-chain al publicar (backend→relayer) y UI del widget de mapa + favoritos de puntos de encuentro (módulo de geolocalización).
- [x] **Pendientes P1–P3 completados y DESPLEGADOS en GCP** ✅ (orden del director):
  - **P1 minteo automático**: `api/lib/nft-minter.js` (la plataforma mintea al publicar; mint real on-chain con red, simulado sin red); `POST /catalog/articulos` persiste `nft_token_id`; `fijarNftToken` en almacenes. TrueKeateNFT real desplegado en anvil GCP (`0x638A246F0Ec8883eF68280293FFE8Cfbabe61B44`, minter=relayer cuenta 1); secreto `NFT_ADDRESS` creado; mint verificado on-chain (tokenId 1 y 2, evento ArticuloMinteado).
  - **P2 geolocalización**: router `/puntos-encuentro` (crear PostGIS, `/mios`, `/favoritos` últimos usados — punto 7, `/:id/usar`); la propuesta de encuentro registra el punto usado; web: panel de propuesta 5.1 con mapa OSM embebido + selector de favoritos + lat/lng o geolocalización + fecha/hora. Tests backend 39/39 (2 nuevos puntos + 3 minteo); E2E 43/3.
  - **P3 GCP**: migración F2 aplicada en Cloud SQL de producción (verificada: PROPUESTO, categorías, cierre, puntos_favoritos); api redesplegada (revisión 00010, minteador activo en logs) y web redesplegada (00010); verificación E2E en producción OK (registro → KYC VERIFICADO → publicar con mint real → punto PostGIS).
  - Pendiente documentado: el Escrow desplegado aún no tiene `vincularTrueKeateNft` (requiere redesplegar Escrow nuevo; se coordina aparte para no romper trueques existentes).

## Próximos pasos

1. **✅ Proyecto ENTREGADO** — Fases 1–5 completadas y publicadas en los 3 repos (rama `escrow-dsh-GCP`).
2. Operación (solo por orden del director): `backend/scripts/reiniciar-plataforma.sh --confirmar` (reset BD off-chain sin tocar anvil) y `backend/scripts/bootstrap-owner.sh --confirmar` (Owner CERTIFICADO/SOCIO) — ver `RepoTecnico/Manuales/04-Despliegue/02-reinicio-y-bootstrap.md`.
3. **✅ Migración trueque abierto F1–F4 implementada y pendientes P1–P3 desplegados en GCP** (commits locales `cd16666`, `6750c84`, `b672df7`, `e14157b`, `4132790`, `aa8bcf7`, `a702434`, `b1c9734` en `escrow-dsh-GCP`). Siguiente por decisión del director: push de los nuevos commits y, opcionalmente, redesplegar el Escrow nuevo con `vincularTrueKeateNft` (coordinando trueques existentes).
4. Mejoras futuras opcionales (fuera de alcance): APK nativa (D40), integración con `mcc-postgres` real en GCP (D25), auditoría externa de seguridad previa a producción (D24), integración del 1 % de trueques al FondoDeValor (D7, marcado "pendiente de confirmar" en manuales), root merkle real del KYC para la escalera on-chain del Owner (D28).
5. Los commits se crean localmente en `escrow-dsh-GCP`; el push a GitHub/GitLab se hace solo por orden del director (`/push`).

## Bug fix — Desconectar billetera y reconectar con OTRA wallet (reporte del director)

**Reporte**: "al usar el botón Desconectar del menú de usuario no desconecta y al tratar de conectarme con otra wallet el proyecto queda con la wallet anterior".

**Causa raíz (3 fallas)**:
1. `desconectar()` limpiaba el estado local pero NO revocaba el permiso `eth_accounts` en MetaMask (`wallet_revokePermissions`): el siguiente `eth_requestAccounts` devolvía la cuenta ANTERIOR sin mostrar el selector → imposible elegir otra wallet.
2. `conectar()` no garantizaba provider/signer frescos para la cuenta recién elegida.
3. El login único (`BotonConectarLogin` → `refrescar()`/`autenticar()`) dependía del estado de React, que aún no reflejaba la cuenta recién conectada → la firma se saltaba (en MetaMask real el popup daba tiempo a vaciar el estado; en reconexión inmediata no).

**Fix** (`web/lib/ethereum.tsx`, `web/lib/sesion.tsx`, `web/components/BotonConectarLogin.tsx`):
- `desconectar()` ahora llama `wallet_revokePermissions({eth_accounts:{}})` (con fallback silencioso si la wallet no lo soporta), limpia provider y persiste la desconexión.
- `fijarCuenta(cuentas, bp?)` fija SIEMPRE provider+signer frescos; `conectar()` crea un `BrowserProvider` nuevo por conexión.
- `autenticar()` firma con un provider/signer FRESCO creado en el momento (firma con la wallet activa en MetaMask, sin depender del estado).
- `refrescar(wallet?)` acepta la wallet explícita recién conectada; la guardia anti-carrera solo aplica a refrescos implícitos (evita restaurar la sesión de una wallet que ya no está conectada).

**Pruebas**: nuevo E2E `web/e2e/desconectar-reconectar.spec.ts` (desconectar limpia estado+permiso, la recarga no revive la wallet anterior, reconectar elige la wallet nueva y el token queda ligado a ella). Suite E2E completa de regresión ejecutada.

## Ciclo 10 — Siete ajustes aprobados por el director (implementados, pendiente push/despliegue)

Decisión del director (bloques de 3 preguntas) e implementación, ver `RepoTecnico/logica_trueke.md` §7:

- **A1 — Firma por acción (seguridad, punto 2)**: cada operación sensible pide firma EIP-191 de la wallet con mensaje `TrueKeate: <acción> (ts=…)` y ventana de 5 min anti-replay. Backend: `auth.js` (`mensajeAccion`, `validarFirmaAccion`, middleware `requiereFirmaAccion`) aplicado a publicar/retirar artículo, oferta, crear/acordar/custodiar/firmar recepción/valorar/cerrar trueque, proponer encuentro, aceptar/rechazar encuentro y USAR NFT. Web: `lib/firma.ts` + `firmarAccion` del contexto de sesión; todos los botones de esas acciones firman antes de llamar.
- **A2 — Quitar alta de trueque de Intercambio (punto 3)**: el formulario "Nuevo trueque" se eliminó de `/suite/intercambio`; el alta vive solo en la Central de Truekes (Mi Trueke / dashboard). E2E verifica 0 títulos "Nuevo trueque" en la sección.
- **A3 — Teléfono de la contraparte (punto 5)**: `GET /truekes/:id/contacto` solo para las partes; se oculta tras COMPLETADO/ANULADO/BLOQUEADO. Web: `ContactoContraparte` en la ficha (solo trueques activos).
- **A4 — Aceptar/rechazar propuesta de encuentro + custodia automática (puntos 6 y 7)**: `POST /truekes/:id/encuentro/aceptar` (estado → CUSTODIADO con custodia automática de ambos NFT) y `…/rechazar`. En la ficha, quien recibe la propuesta solo acepta o rechaza; al aceptar ambos NFT quedan custodiados en el escrow y se liberan al cerrar el trueke.
- **A5 — Imágenes en inventario/mercado (punto 1)**: hasta 5 imágenes por artículo (base64 → BD `imagenes_certificadas.contenido/mime`, servidas por `GET /catalog/:id/imagen/:imagenId`; Cloud Run FS inmutable). Miniaturas en Inventario y Mercado; galería en la ficha de mercado.
- **A6 — Widget flotante de mapa (punto 4)**: `web/components/MapaWidget.tsx` (Leaflet solo-cliente vía `next/dynamic`, tiles OSM, pin arrastrable, búsqueda Nominatim, favoritos) que se abre desde la ficha del trueque; al confirmar incrusta lat/lng/dirección en el formulario de la propuesta.
- **A7 — Verificación final**: Foundry (con TrueKeateNFT v2 `0x6C2d…7892` en anvil GCP con `usar()`), backend 44/44, E2E 47 passed / 3 skipped (PC-only). **Estado final: DESPLEGADO y publicado** ✅ (orden del director): commit `efa8425` pusheado a GitHub, GitLab.com y gitlab.codecrypto.academy; en GCP: BD migrada, TrueKeateNFT v2 con `usar()` (`0x6C2d…7892`), API desplegada (revisión 00013; rutas nuevas verificadas en vivo: `/truekes/:id/encuentro/aceptar|rechazar` y `/truekes/:id/contacto` responden 401 → existen) y web desplegada (revisión 00014; widget `Señalar en el mapa` presente en el bundle servido).

## @InyectaDatos — BaseOperaciones + script de inyección (2026-09-08)

Orden del director: inyectar un historial operativo coherente con las cuentas 2–7 del anvil
(2 Socios ORO/CERT 2000 BRLT · 2 Empresas PLATA/CERT 2000 BRLT con 2 art + 2 bienes + 2
servicios tokenizados · 2 Comunes BRONCE/VERIF 1000 BRLT · 10 trueques realizados por cada
usuario con valoraciones variadas). Entregado y **validado** (2 ejecuciones idempotentes en
PostgreSQL local con el esquema real: 6 usuarios · 24 ítems · 30 truekes COMPLETADOS = 10 por
usuario · 60 valoraciones; matriz permutada 15 pares × 2 sentidos):

- `RepoTecnico/BaseOperaciones/` — documentación de la inyección (`estructura_datos.md`,
  `casos_uso_inyeccion.md`, `cuentas_anvil.md`, `estado_inyeccion.md`).
- `scripts/inyectar_datos_operativos.mjs` — script controlado (confirmación interactiva,
  `--dry-run`, `--yes`, `--solo-bd`): persiste usuarios/kyc/artículos/truekes/valoraciones/
  finanzas en PostgreSQL; opcionalmente mint REAL de los 24 NFT (TrueKeateNFT GCP) y emisión
  REAL de BRLT con quórum de Socios (D32) con distribución 2000/2000/2000/2000/1000/1000.
- **NO ejecutado en producción** (decisión del director: solo generar el script; requiere
  orden explícita + respaldo previo `reiniciar-plataforma.sh --respaldo`).

Hallazgo documentado: `imagenes_certificadas.firma_ecdsa` es NOT NULL y el router actual no la
persiste → la inyección omite imágenes (pendiente de confirmar en producción).

### Push 2026-09-08 (orden del director)

Commit de documentación + scripts (`BaseOperaciones/`, `scripts/`, `.gitignore`,
`estado_proyecto.md`) publicado en **GitHub**, **GitLab.com** y **gitlab.codecrypto.academy**
(rama `escrow-dsh-GCP`). Excluidos del repo por seguridad/herencia: `REGISTRO_*_CLAVES.md`
(claves), `backend/scripts/backups/` (respaldos de BD) y los scripts de la raíz heredados de la
rama antigua (`deploy-local.*`, `accounts.sh`, `setup.sh`, `start/stop*`, `verify-setup.sh`).

## 1.ª PRUEBA DEL PROYECTO (2026-09-08) — ejecutada en GCP

Orden del director (trabajo en segundo plano): desplegar en GCP, BD en limpio, servicios probados,
inyección de datos y **pruebas desde el navegador interno (Chromium headless)** como usuario.
Resumen: despliegue verificado al día (API 00013 / web 00014) · BD reseteada con respaldo previo ·
inyección ejecutada (6 usuarios, 24 ítems con NFT reales 6–29, 30 truekes = 10 por usuario,
60 valoraciones, BRLT 2000/2000/2000/2000/1000/1000 emitido con quórum) · login con firma real de
4 personas, inventario/finanzas/dashboard y publicación de trueque (201) verificados en el navegador.
Documento completo con hallazgos: `RepoTecnico/INFORME_PRUEBA_1.md` (evidencia en
`RepoTecnico/pruebas/1ra-prueba/`). Hallazgos: H1 (reputación cuenta solo parte A + nivel calculado
no perfil), H2 (listado de Mercado lento en headless), H3 (firma única al recargar), H4 (permite
ofertar dos veces el mismo artículo), H5 (mensaje de éxito transitorio).

## Ajustes de UI del director (2026-09-08) — desplegados y publicados

Ajustes implementados, probados en navegador (local y GCP) y desplegados en producción:
1. **PC**: barra superior ÚNICA (secciones + menú de usuario en `TopBar`); se eliminó `TopNavPc`.
2. **Menú de usuario**: muestra `@username` (columna `usuarios.username` + migración
   `backend/db/migracion_username.sql`; API `/auth/*` lo expone sin PII; registro lo deriva del correo).
3. **Símbolo de estado minimalista** junto al username: INSCRITO 🟡 · VERIFICADO 🟢 · CERTIFICADO 🥇
   (sustituye al escudo; misma navegación por estado).
4. **Marca**: icono de logo (`TrueKeate_logo.svg`) + logotipo `TrueKeat☑` (sin glifo ⇄).

Despliegue GCP: commit `8e7d13d` pusheado a GitHub/GitLab.com/gitlab.codecrypto.academy; imágenes
`backend:release-8e7d13d` y `web:release-8e7d13d` → Cloud Run **truekeate-api rev 00015** y
**truekeate-web rev 00016** (europe-west1). Verificado en vivo: `/auth/estado` devuelve
`username`, catálogo 24 artículos, y en el navegador la barra única muestra `🥇 👤 @ana.lopez`,
las secciones por rol y la marca con logo. Captura: `RepoTecnico/pruebas/1ra-prueba/ui-gcp-produccion.png`.

### Ajuste menú de usuario (2026-09-08, desplegado)

- Botón del menú: SOLO 👤 + emoji de estado (INSCRITO 🟡 · VERIFICADO 🟢 · CERTIFICADO 🥇).
- Desplegable: título `@username · nivel (D12)` y subtítulo `tipo · medalla de reputación`.
- Se eliminó el componente EscudoEstado; la API pública expone `medalla`.
- Despliegue GCP: API rev 00016 · web rev 00018 (imágenes release-169d345). Verificado en
  navegador: `👤🥇 @ana.lopez·SOCIO SOCIO🥇ORO` y `👤🟢 @carlos.mendoza·COMUN PARTICULAR🥉BRONCE`.

## Certificación con SBT (/suite/certificacion) — implementado (2026-09)

Orden del director (@asistenteProyecto) + bloque de decisiones: SBT nativo TrueKeateSBT ·
chequeo on-chain (allowlist configurable) · auto-certificación · imágenes reales si no hay SBT.
Implementado:
- Contrato `sc/src/TrueKeateSBT.sol` (soulbound ERC-721/ERC-5192, 1 SBT por wallet, minter
  plataforma) + `sc/test/TrueKeateSBT.t.sol` (6/6).
- Backend: `api/lib/sbt.js` (detectarSbt/mintSbtNativo), rutas `/kyc/sbt`, `/kyc/auto-certificar`,
  `/kyc/submit` (imágenes DNI/selfie base64), `/kyc/pendientes` y `/kyc/review` (Owner) con mint
  del SBT nativo al aprobar; migración `db/migracion_sbt.sql` (kyc via_sbt/sbt_* e imágenes,
  enum KYC_DNI/KYC_SELFIE, firma opcional).
- Web: `/suite/certificacion` (verifica SBT → certifica automático o pide subir DNI+selfie con
  preview) y componente `KycPendientesOwner` en el Panel del Owner (aprobar/rechazar).
- Verificaciones: Foundry 6/6 nuevos · backend 21/21 · build web OK.
- Doc: `RepoTecnico/PROPUESTA_CERTIFICACION_SBT.md`.
Pendiente (orden del director): aplicar migración BD, desplegar TrueKeateSBT en anvil GCP,
registrar en contratos.json/secreto, redesplegar api+web y push.

### Despliegue certificación SBT (2026-09-08) — en producción

Aplicado: migración `db/migracion_sbt.sql` en Cloud SQL (cols kyc, enum KYC_DNI/SELFIE,
firma opcional) · TrueKeateSBT desplegado en anvil GCP `0x870526b7973b56163a6997bB7C886F5E4EA53638`
(minter cuenta 1) y registrado en `backend/contratos.json` · Cloud Run **api rev 00017** y
**web rev 00019** (imágenes release-c440204). E2E en producción (Carlos): sin SBT → pide
DNI+selfie; mint SBT nativo #1; detección y **auto-certificación → CERTIFICADO** (kyc via_sbt).
Capturas: `RepoTecnico/pruebas/1ra-prueba/sbt-*.png`. Commit `c440204` en los 3 repos.

### Prueba del flujo Owner (KYC con imágenes) — 2026-09-08 ✅

- **Hallazgo corregido**: la BD de producción tenía `imagenes_certificadas` sin las columnas
  `contenido` y `mime` (esquema antiguo) → la subida de imágenes KYC fallaba (500). Se añadieron
  vía `migracion_sbt.sql` (idempotente) y se aplicó en Cloud SQL (afecta también a las imágenes
  de artículos A5).
- **Pruebas en producción**: (a) usuaria sin SBT (Gisela temporal) sube DNI+selfie por la UI →
  “KYC enviado” (PENDIENTE) con imágenes persistidas (tipo KYC_DNI/KYC_SELFIE, mime, binario);
  (b) **Owner** desde `/suite/admin` (cuenta 0, bootstrap previo) ve la sección “KYC pendientes”
  con vistas de imagen y **aprueba** → CERTIFICADO + mint del SBT nativo (Diana quedó CERTIFICADO
  con sbtDe=2; Carlos CERTIFICADO vía auto-SBT con sbtDe=1). API: submit 200 + review 200.
- Capturas: `RepoTecnico/pruebas/1ra-prueba/owner-01..04*.png` + JSON de resultados.
