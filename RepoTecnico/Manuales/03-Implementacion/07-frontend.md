# Manual Técnico 07 — Frontend (Next.js 16 App Router)

> **Alcance**: implementación real (2026-09) del frontend de TrueKeate: rutas de `web/app` (suite
> integrada con backend), barra superior única y navegación por rol (PC/móvil), contexto de
> Ethereum/MetaMask con soporte móvil (RF-16/D40), control de acceso de la suite, capa de contratos
> (ABIs) y sistema de diseño "Bóveda Digital Moderna" (RNF-08).
> **Fuentes leídas**: `web/app/**`, `web/components/*.tsx`, `web/lib/*.{ts,tsx}`, `web/e2e/*.spec.ts`,
> `web/playwright.config.ts`, `web/public/`.
> **Convención**: referencias `ruta:línea` al código real; lo no implementado o no verificable se
> marca **pendiente de confirmar**.

---

## 1. Estructura de rutas reales (App Router)

### 1.1 Árbol de páginas de la suite

| Ruta | Archivo | Contenido real |
|---|---|---|
| `/` | `web/app/page.tsx` | Landing pública (RF-14.1), funcional |
| `/suite` | `web/app/suite/layout.tsx` | Layout: `TopBar` + `SuiteGuard` + `BottomNav` |
| `/suite/dashboard` | `web/app/suite/dashboard/page.tsx` | "Mi Trueke Central": escalera D28 y accesos rápidos |
| `/suite/mercado` | `web/app/suite/mercado/page.tsx` | Catálogo de ofertas abiertas (observable con wallet) |
| `/suite/intercambio` | `web/app/suite/intercambio/page.tsx` | Crear/completar trueques (requiere Verificado/Certificado); pestañas **Activos/Histórico** y flujo de encuentro + cierre (ver §12) |
| `/suite/inventario` | `web/app/suite/inventario/page.tsx` | "💼 Mi Inventario": publicar/despublicar artículos; alta en **flotante** con imágenes referenciales (ver §13) |
| `/suite/gobernanza` | `web/app/suite/gobernanza/page.tsx` | "🏛️ Gobernanza / Socios": propuestas y votación (Socio/Owner) |
| `/suite/disputas` | `web/app/suite/disputas/page.tsx` | "⚖️ Disputas" **rediseñada** (2026-09-08): partes + votación de Socios con flotante de caso (ver §11) |
| `/suite/valor` | `web/app/suite/valor/page.tsx` | "💎 VALOR" (2026-09-09, ex Finanzas): 3 subsecciones 4.1 criptos / 4.2 reputación / 4.3 BRLT (ver §10) |
| `/suite/finanzas` | `web/app/suite/finanzas/page.tsx` | **Legado/descatalogado**: la página existe pero ya NO está en la matriz de navegación (SuiteGuard la bloquea); la suite usa `/suite/valor` |
| `/suite/admin` | `web/app/suite/admin/page.tsx` | **Sistemas · Panel del Owner** (RF-13.1) — ver manual 08-Suite-Sistemas |
| `/suite/perfil` | `web/app/suite/perfil/page.tsx` | "👤 Mi Perfil": @username, wallet completa, reputación |
| `/suite/inscripcion` | `web/app/suite/inscripcion/page.tsx` | Inscripción formal (correo/teléfono/dirección/GDPR) |
| `/suite/verificacion` | `web/app/suite/verificacion/page.tsx` | Verificación de correo (escalera D28, etapa 1) |
| `/suite/certificacion` | `web/app/suite/certificacion/page.tsx` | Certificación KYC/SBT (etapa 2) — manual 09-certificacion-sbt |
| `/help/manual` | `web/app/help/manual/page.tsx` | Sección de Ayuda con el manual (datos en `web/lib/manual-data.ts`) |

- La visibilidad de cada sección la decide la **matriz única** `web/lib/navegacion.ts` (§2.1), y el
  acceso real lo aplica `SuiteGuard` (§3) — ya **no** hay páginas placeholder de una sola Card.

### 1.2 Layout raíz (web/app/layout.tsx)

- Fuentes `next/font/google` `Geist`/`Geist_Mono` como variables `--font-geist-sans/mono`
  (`web/app/layout.tsx:7-15`); metadatos con icono `/brand/TrueKeate_logo.ico`, manifest PWA y
  `themeColor` (`web/app/layout.tsx:17-24`).
- `<EthereumProvider>` envuelve `<SesionProvider>` y toda la app (`web/app/layout.tsx:33-35`); el
  proveedor de sesión (`SesionProvider`) se define en `web/lib/sesion.tsx:76-77`.

### 1.3 Landing pública (web/app/page.tsx)

- Hero con marca (`/brand/TrueKeate_logo.svg`), titular y estadísticas; secciones "¿Qué es un Trueke
  Digital?", Filosofía y CTA a `/suite/dashboard` (estructura estable del manual anterior:
  `page.tsx:12-151`). La **única** ruta pública: `/suite/**` queda detrás del guard (§3).

---

## 2. Navegación única por rol (PC/móvil)

### 2.1 Matriz de secciones — `web/lib/navegacion.ts`

- `Seccion = { href, label, icono, central?, descripcion? }` (`navegacion.ts:9-16`); contexto de
  visibilidad `{ tipo, nivel, estado, esOwner }` (`navegacion.ts:22-28`) con reglas derivadas
  (`ES_EMPRESA/SOCIO/CERTIFICADO/VERIFICADO`, `navegacion.ts:30-34`).
- **Fuente única** de qué ve cada usuario: cada sección declara `visible(ctx)`
  (`SECCIONES`, `navegacion.ts:37-107`). Ejemplos: Dashboard y Mercado siempre; Intercambio e
  Inventario exigen `ES_VERIFICADO`; Gobernanza solo `SOCIO`; Disputas `CERTIFICADO|SOCIO`; **Valor
  (`/suite/valor`) visible para todo inscrito** (el contenido de gestión se restringe dentro de la
  página, `navegacion.ts:82-90`); **Sistemas (`/suite/admin`) solo si `esOwner === true`**
  (dueño on-chain del SociosRegistry; los Socios ya NO lo ven, `navegacion.ts:92-99`). Finanzas ya
  no forma parte de la matriz.
- `seccionesPara(ctx)` filtra y ordena (`navegacion.ts:110-112`);
  `seccionesParaMovil(ctx, max=5)` garantiza la **central** (Intercambio) y agrupa el excedente en
  "Más" (`navegacion.ts:118-134`).

### 2.2 PC (≥lg): barra superior ÚNICA — `web/components/TopBar.tsx`

Decisión del director (2026-09): la antigua fila de secciones (`TopNavPc`) y el menú de usuario se
**unificaron en una sola barra** `[marca] · [secciones] · [usuario]` (`TopBar.tsx:5-11,83-285`).

#### 2.2.1 Marca = logo + título (`TopBar.tsx:87-108`)

- Enlace a `/suite/dashboard` con **dos imágenes**: `TrueKeate_logo.svg` (h-7) y `TrueKeate_titulo.svg`
  (oculta en pantallas <sm; h-[18px]/lg:h-[22px]); al ser monocromas negras se invierten con
  `brightness-0 invert` sobre la barra navy (`TopBar.tsx:93-107`).

#### 2.2.2 Secciones SOLO iconos con tooltip (`TopBar.tsx:110-156`)

- `<nav>` visible solo `lg:flex`, con un `<Link>` por sección: **solo el icono** (emoji) en botón
  circular `h-9 w-9`; el **título aparece como tooltip** (`title`) y `aria-label`; activo =
  fondo `bg-gold-500 text-navy-900`, inactivo `text-white/75` (`TopBar.tsx:140-154`).
- Sin wallet: texto "Conecta tu billetera…" (`TopBar.tsx:117-120`); conectada sin inscribir: solo el
  icono 🛒 Mercado + aviso (`TopBar.tsx:121-138`).

#### 2.2.3 Menú de usuario: @username·nivel y tipo·medalla (`TopBar.tsx:158-283`)

- Botón del menú: **solo** `👤` + **emoji de estado** minimalista (INSCRITO 🟡 · VERIFICADO 🟢 ·
  CERTIFICADO 🥇, `TopBar.tsx:29-33,180-188`).
- Desplegable (`w-72`, cierra al hacer clic fuera, `TopBar.tsx:54-60,191-280`):
  - Título: `@username` **· nivel D12** (dorado) (`TopBar.tsx:199-205`); sin username → wallet corta
    `0x1234…abcd` (`TopBar.tsx:42-44,66-70`).
  - Subtítulo: `tipo` **· medalla de reputación** (🥉/🥈/🥇 con etiqueta, `TopBar.tsx:36-40,206-210`).
  - Acciones: "Completar inscripción" si no inscrito (`TopBar.tsx:218-244`), Mi perfil,
    Gobernanza/Socios, Ayuda/Manuales y **"⏻ Desconectar billetera"** (desconecta + cierra sesión,
    `TopBar.tsx:268-277`).

### 2.3 Móvil (<lg): barra inferior flotante — `web/components/BottomNav.tsx`

- Fija y flotante (`fixed bottom-4`, `z-40`, `bg-white/80 backdrop-blur-[12px]`, `rounded-modal`,
  `lg:hidden`) (`BottomNav.tsx:44-47`), con ranuras rellenas por rol desde `seccionesParaMovil`
  (`BottomNav.tsx:28-36`).
- **Botón central hexagonal** dorado (Intercambio, `-translate-y-4`, gradiente `#d4af37→#f3e5ab→#c5a065`,
  `BottomNav.tsx:49-61`); ranura "⋯ Más" para el excedente (`BottomNav.tsx:77-105`).
- Sin wallet/no inscrito solo muestra Mercado (`BottomNav.tsx:33-36`).

---

## 3. Control de acceso de la suite — `SuiteGuard` y sesión

### 3.1 Guard de la suite (`web/components/SuiteGuard.tsx`)

Reglas del director (`SuiteGuard.tsx:3-13`):

1. **Sin billetera** → `PantallaConectar` (la suite es privada; solo la landing es pública).
2. **Conectada pero no inscrita** → solo `/suite/mercado` y `/suite/inscripcion`
   (`RUTAS_SIN_INSCRIPCION`, `SuiteGuard.tsx:27`); el resto muestra `PantallaRequiereInscripcion`.
3. **Inscrita** → **login único**: sin token de sesión se muestra `PantallaIniciarSesion` (una sola
   firma, nunca por página) (`SuiteGuard.tsx:176-177`); con token, se valida la URL contra
   `seccionesPara(usuario)` + rutas de proceso `/suite/verificacion` y `/suite/certificacion`
   (`SuiteGuard.tsx:181-193`); si no coincide → `PantallaSinPermiso` (`:199-218`).

### 3.2 Tarjetas de conexión según dispositivo (`SuiteGuard.tsx:29-87`)

- `errorConexion === 'app_movil'` (móvil sin extensión): tarjeta con **dos vías**: botón
  "📲 Abrir en la app de MetaMask" (deep link, §4.3) o pasos del **navegador interno** de la wallet
  con la URL del host actual (`SuiteGuard.tsx:49-68`).
- `errorConexion === 'sin_wallet'` (escritorio sin extensión): tarjeta para instalar la extensión
  (`SuiteGuard.tsx:69-77`).

### 3.3 Sesión y login único — `web/lib/sesion.tsx`

- `EstadoAcceso` = `sinWallet | verificando | conectadoNoInscrito | { inscrito, usuario }`
  (`sesion.tsx:40-44`); `refrescar(wallet?)` consulta `GET /auth/estado` con la wallet **explícita**
  (evita depender del estado de React, `sesion.tsx:93-119`); `autenticar()` firma EIP-191 el mensaje
  `'TrueKeate: iniciar sesión'` contra `POST /auth/session` y guarda el **token global**
  (`sesion.tsx:147-180`); `inscribir()` llama `POST /auth/register` (`sesion.tsx:187-197`).
- `BotonConectarLogin` (`web/components/BotonConectarLogin.tsx`) encadena: conectar wallet →
  `refrescar(cuenta)` → si está inscrito, `autenticar()` (una firma).
- El token de sesión persiste (backend `sesiones` con expiración 24 h — ver Manual 06) para que el
  login único no se repita al navegar entre secciones.

---

## 4. Contexto de Ethereum / wallet (web/lib/ethereum.tsx)

### 4.1 Estado expuesto

`EstadoEthereum` incluye `account`, `provider`, `signer`, `conectando`, `conectado = Boolean(account)`,
`conectar()`, `desconectar()`, `errorConexion` (`'sin_wallet' | 'app_movil' | null`),
`abrirEnAppWallet()` y `esMovil` (detección por user-agent) (`ethereum.tsx:34-56,229-246`).

### 4.2 EIP-6963 (wallets que se anuncian por evento)

- `aguardarProveedor6963(1200)`: escucha `eip6963:announceProvider` y emite
  `eip6963:requestProvider`; adopta el primer provider anunciado si no hay `window.ethereum`
  (`ethereum.tsx:60-75`). Un `useEffect` global hace lo mismo al arrancar (`ethereum.tsx:126-138`).
- `conectar()` usa ese provider anunciado antes de rendirse; si no hay ninguno fija
  `errorConexion = esMovil ? 'app_movil' : 'sin_wallet'` (`ethereum.tsx:166-181`).

### 4.3 Conexión en móvil: deep link a la app de la wallet

- `abrirEnAppWallet()` navega a `https://metamask.app.link/dapp/<host>` usando
  `window.location.host` (fallback hardcodeado del Cloud Run) (`ethereum.tsx:201-206`). Así la dApp se
  abre dentro del **navegador interno de MetaMask**, que sí inyecta `window.ethereum` (RF-16/D40).
  Detalle operativo en `07-Wallets-y-Cuentas/09-conexion-wallet-movil.md`.
- WalletConnect universal queda documentado como mejora futura (requiere projectId) —
  `RepoTecnico/estado_proyecto.md:493-500`.

### 4.4 Auto-reconexión y cambios en vivo

- Al montar restaura la cuenta de `localStorage` (`truekeate.account`) creando un `BrowserProvider`
  nuevo (`ethereum.tsx:141-154`); escucha `accountsChanged` y actualiza cuenta/signer
  (`ethereum.tsx:157-164`); `fijarCuenta` siempre crea provider/signer frescos (`ethereum.tsx:92-122`).

### 4.5 Desconexión real (revocación de permisos)

- `desconectar()` limpia estado y `localStorage` y además pide a MetaMask
  `wallet_revokePermissions({ eth_accounts })` para que el siguiente `eth_requestAccounts` muestre el
  selector (fix "reconectar con OTRA wallet") (`ethereum.tsx:208-227`).

---

## 5. Capa de contratos (web/lib/contracts.ts)

- `DIRECCIONES` mapea 5 contratos con override `NEXT_PUBLIC_*` (Escrow, SmartAccountFactory, BRLT,
  SociosRegistry, SuscripcionEmpresa) apuntando al despliegue GCP anvil 31337
  (`contracts.ts:20-30`). En producción el Panel del Owner las muestra vía `GET /admin/contratos`
  (RF-13.1); el frontend no lee on-chain todavía.
- `cargarAbis()` importa los ABIs de `web/lib/abis/<Nombre>.json` (`contracts.ts:39-52`) pero **no es
  invocado por ninguna página/componente** (verificado con búsqueda en `web/app` y `web/components`):
  el registro `contratos` queda vacío en runtime → helpers listos, integración **pendiente de confirmar**.

---

## 6. Componentes de UI (RNF-08.4)

### 6.1 Button / Card / StatusBadge

- `Button` (`web/components/Button.tsx`): variantes `pill-primary` (gradiente navy→teal), `outline-navy`
  y `gold-accent` (gradiente dorado); `active:scale-95` (`Button.tsx:12-34`).
- `Card` (`web/components/Card.tsx`): variantes `premium` (borde dorado) y `destacada`
  (borde gradiente navy→teal→gold).
- `StatusBadge` (`web/components/StatusBadge.tsx`): `tonoDeEstado` mapea estados D28/escrow a 7 tonos
  (VERIFICADO→teal, CERTIFICADO/COMPLETADO→gold, RECHAZADO/BLOQUEADO/ANULADO→crimson, …).

### 6.2 Navegación y guard

- `TopBar`, `BottomNav`, `SuiteGuard`, `BotonConectarLogin` — descritos en §2-§3.
- Componentes añadidos 2026-09-08/09: `ImagenProtegida` (imagen con `Authorization: Bearer` via
  `fetch` + `URL.createObjectURL`; usada en Disputas/evidencias, ver §11),
  `SubirFotos` (selector de 1..N fotos a base64, usado en disputas y en el flotante del
  Inventario), `CampanaNotificaciones` (campana in-app en la TopBar, ver §15),
  `MapaWidget` (puntos de encuentro en Intercambio), `KycPendientesOwner` (ver manual 09),
  `StatusBadge`.

---

## 7. Sistema de diseño "Bóveda Digital Moderna" (RNF-08)

- Tokens de color en `:root` (`web/app/globals.css:12-26`): `--navy-900: #0a1128`, `--navy-800: #1a2b4c`,
  `--teal-500: #2a9d8f`, `--cyan-400: #48cae4`, `--gold-500/300/600`, `--smoke`, `--crimson`,
  `--coral`; gradientes en `globals.css:27-30`.
- Mapeo Tailwind v4 con `@theme inline` (`globals.css:42-63`): `--color-*`, radios
  `--radius-pill: 9999px`, `--radius-card: 16px`, `--radius-modal: 24px` y fuentes `--font-sans/
  --font-display`; `body` sobre `--smoke` (`globals.css:65-70`).
- Utilidades propias: `.gradient-cta`, `.gradient-gold`, `.text-gradient-gold`, `.card-premium`,
  `.anim-check-draw` + `@keyframes checkDraw` (checkmark del `TrueKeat☑`) (`globals.css:72-100`).

---

## 8. Pruebas E2E (Playwright)

### 8.1 Configuración (`web/playwright.config.ts`)

- `testDir: ./e2e`, 2 proyectos `chromium` y `mobile-chrome` (Pixel 5); `baseURL` `http://127.0.0.1:3000`
  con `BASE_URL` sobrescribible; `webServer` con `npm run start` (`playwright.config.ts:9-28`).

### 8.2 Suites E2E actuales (`web/e2e/*.spec.ts`)

| Spec | Cubre |
|---|---|
| `landing.spec.ts` | Hero, métricas, ventajas y CTA de la landing (RF-14.1) |
| `suite.spec.ts` | Barra superior, escalera D28, módulos por estado y navegación inferior |
| `suite-escalera.spec.ts` | Escalera D28 en la suite |
| `suite-pantallas.spec.ts` | Pantallas de la suite (contenido por sección) |
| `login-unico.spec.ts` | Login único: la firma se pide solo al acceder, el token persiste |
| `desconectar-reconectar.spec.ts` | Desconexión real y reconexión con OTRA wallet |

Registro de ejecuciones en producción (E2E 4/4 del flujo SBT, suites de navegación, validación móvil
real) en `RepoTecnico/estado_proyecto.md:442-507`.

---

## 9. Limitaciones y pendientes observados (2026-09)

1. **`cargarAbis()` sin invocar**: el registro `contratos` del frontend queda vacío en runtime
   (`web/lib/contracts.ts:39-52`); no hay lecturas on-chain desde el navegador todavía.
2. **Estados de la escalera por página**: `dashboard` muestra módulos atenuados por estado; la
   verdad del estado la aplica el backend (`/auth/estado`, `/kyc/status`) — el frontend no decide.
3. **WalletConnect universal** (mobile, fuera de MetaMask): documentado como mejora futura con
   projectId (`estado_proyecto.md:500`).
4. **Tooltip/`title`**: en táctil (tablet en modo ≥lg) el tooltip de iconos no se muestra de forma
   nativa — la accesibilidad por `aria-label` está presente; mejora pendiente de confirmar.
5. **Service worker/PWA offline**: manifest presente (`web/public/manifest.json`); instalabilidad
   completa (offline) **pendiente de confirmar** (no se observó service worker).

---

## 10. VALOR — página `/suite/valor` (ex Finanzas, 2026-09-09)

### 10.1 Vista general y restricción de rol en la UI

- Archivo `web/app/suite/valor/page.tsx` (553 líneas). Consume `GET /valor/mi` (cliente `valorMi`,
  `web/lib/api.ts:262-265`). Cabecera con 3 saldos (ETH · Reputación · BRLT); el **rol** y las
  banderas `criptosHabilitado`/`brltHabilitado` (Empresa/SOCIO/Owner) vienen del backend
  (`page.tsx:82-83,277-299`).
- **Restricción de rol en UI**: VALOR es visible para todo inscrito, pero el contenido de gestión
  (4.1 y 4.3) se muestra **solo** si `gestiona`/`brltHabilitado`; si no, aparece la nota "La gestión
  de criptos/BRLT es de Empresas, Socios y el Owner" y el saldo se muestra como "—"
  (`page.tsx:314-319,488-492`).

### 10.2 Subsección 4.1 · Criptos (recargar/retirar/convertir ETH ⇄ BRLT)

- Card "4.1 · Criptos" (`page.tsx:304-360`): botones ⬆️ Recargar ETH, ⬇️ Retirar ETH,
  ⇄ ETH → BRLT y ⇄ BRLT → ETH (cliente `recargarCripto`/`retirarCripto`/`convertirCripto`,
  `api.ts:267-290`). Tasa mostrada: `datos.tasaEthBrlt` (1 ETH ≈ N BRLT, `page.tsx:354-357`).
- Los movimientos son **siempre con la plataforma** como contraparte (texto de cabecera
  `page.tsx:240-244`; backend `routes/valor.js` — Manual 06 §14).

### 10.3 Subsección 4.2 · Reputación y valoraciones pendientes

- Card "4.2 · Reputación" (`page.tsx:365-478`): puntaje D12/D30, media de valoraciones y trueques
  completados (`page.tsx:367-380`).
- **Trueques sin valorar** (`pendientesValoracion`): lista con botón "⭐ Valorar 1–5" que abre un
  selector inline de las 5 dimensiones (Aceptación/Honestidad/Seguridad/Confiabilidad/Compromiso)
  y firma la acción "valorar trueque" antes de llamar `valorarTrueke` → `POST /truekes/:id/valoracion`
  (`page.tsx:193-227,382-440`; backend persiste en `valoraciones` — Manual 06 §17).
- **Últimos 10 trueques valorados** (`ultimasValoraciones`): tabla con promedio ★
  (`page.tsx:442-477`).
- Movimientos recientes (`datos.movimientos`, ≤10) al pie (`page.tsx:534-548`).

### 10.4 Subsección 4.3 · BRLT con Stripe (solo Empresa/Socio/Owner)

- Card "4.3 · BRLT" (`page.tsx:483-531`): botones "💳 Comprar con Stripe" (abre `checkoutBrlt` →
  `POST /valor/brlt/checkout`, `api.ts:283-287`; si devuelve `url`, abre Stripe Checkout en otra
  pestaña; si es demo `stripe_no_configurado`, informa el movimiento registrado,
  `page.tsx:142-168`) y "⬇️ Retirar BRLT" (`retirarBrlt`, `api.ts:288-290`). Nota del desembolso
  fiat real por **Stripe Payouts** (`page.tsx:525-528`). Quien no gestiona BRLT ve la nota de
  restricción (`page.tsx:488-492`).

---

## 11. Disputas rediseñada — `/suite/disputas` con flotante de votación (2026-09-08)

- Archivo `web/app/suite/disputas/page.tsx` (837 líneas). Flujo mostrado:
  `✗ No Conforme (motivo + fotos) → justificativo del conforme → votación de Socios → veredicto
  (ANULAR o VALIDO)` (`page.tsx:4-13,262-276`). Consume `misDisputas`, `padronDisputas`,
  `votacionesDisputas`, `detalleDisputa`, `cargarJustificativo`, `declararNoConforme`,
  `votarDisputa` y `urlEvidenciaDisputa` (`api.ts:541-576`; `page.tsx:17-31`).
- **Dos secciones**:
  - **Mis disputas** (`page.tsx:312-540`): rol por wallet (`miRol` → reclamante/contraparte/socio,
    `page.tsx:84-90`); detalle expandible con evidencias de ambas partes (`abrirDetalle`,
    `page.tsx:182-201`); formularios: "cargar justificativo" (fotos con `SubirFotos`) y
    "declarar No Conforme" (motivo + fotos) (`page.tsx:203-234,399-477`).
  - **Votación de Socios** (`page.tsx:542-615`, visible solo si la wallet está en el padrón):
    tarjetas con conteo `n ANULAR · m VALIDO`, vencimiento y botón **"📂 Ver caso y votar"**.
- **Flotante de votación** (`page.tsx:628-807`): modal `casoAbierto` que muestra el motivo del
  reclamo, las **evidencias de AMBAS partes** (reclamo vs. justificativo, grid de miniaturas con
  `ImagenProtegida`), estado de votos, y en la barra inferior sticky los botones
  **"🗳️ ANULAR — devolución total"** (crimson) y **"🗳️ VALIDO — completar trueke"** (teal) →
  `votar()` (`page.tsx:237-256`). Guardas de la UI: parte del trueke no vota, 1 voto por Socio,
  estado RESUELTA muestra el veredicto (`page.tsx:758-802`).
- **Zoom de evidencia** (`evidenciaZoom`, `page.tsx:809-834`): clic en una miniatura abre la imagen
  a pantalla completa (`ImagenProtegida`, z-[60]).
- **Componentes**: `ImagenProtegida` (`web/components/ImagenProtegida.tsx`, 55 líneas: descarga con
  `Bearer` y `objectURL`; el backend solo sirve la imagen a parte o Socio —
  `routes/disputas.js:197-210`) y `SubirFotos` (`web/components/SubirFotos.tsx`, 108 líneas: hasta
  `max` fotos convertidas a `{ data, mime }` base64).
- El aviso de Socios resume las reglas del director (1 voto por Socio, involucrados no votan —
  punto 4, `page.tsx:303-310`).

---

## 12. Intercambio — pestañas Activos / Histórico (2026-09-09)

- `web/app/suite/intercambio/page.tsx` (929 líneas). Los **estados terminales van a Histórico**:
  lista `ESTADOS_ACTIVOS = [CREADO, ACTIVO, CUSTODIADO, APERTURA, EN_DISPUTA, RESOLUCION_SOCIOS]`
  y terminales COMPLETADO/ANULADO/BLOQUEADO (`page.tsx:47-51`).
- Estado `pestana: "activos" | "historico"` (`page.tsx:315-316`) y **pestañas** "🔄 Activos (n)" /
  "🕘 Histórico (n)" (`page.tsx:547-585`); la lista muestra las de la pestaña activa
  (`page.tsx:606-620`).
- El resto del flujo (sin cambios): propuesta de encuentro con widget flotante de mapa
  (`page.tsx:88-211`), aceptar/rechazar (`page.tsx:451-463,704-738`), cierre ✓ Conforme / ✗ No
  Conforme con **formulario de disputa en modal** (motivo + fotos, `page.tsx:372-445,851-…`),
  valoración inline (`page.tsx:480-…`) y "usar NFT" de lo recibido.

---

## 13. Inventario — alta en flotante con imágenes referenciales (2026-09-09)

- `web/app/suite/inventario/page.tsx` (421 líneas). El alta de un nuevo elemento ocurre en un
  **flotante (modal)** (`flotanteAbierto`, `page.tsx:48-49,276-…`) que incluye las **imágenes
  referenciales (1–5)** (`imagenesSel`, `page.tsx:54,89-…`; conversión a `{ data, mime }` y
  previews `page.tsx:362-393`).
- El envío llama `publicarArticulo(token, { …, imagenes })` con firma de acción
  (`page.tsx:117`); el backend valida `imagenes` (≤5, `{ data, mime }`) y guarda cada una con
  `guardarImagenArticulo` (`backend/api/routes/catalog.js:20-52`; URLs `/catalog/:id/imagen/:imgId`
  expuestas en `catalog.js:81-99`).
- Las tarjetas del listado muestran las imágenes referenciales si existen
  (`page.tsx:243-250`); el Mercado las exhibe también (`web/app/suite/mercado/page.tsx:79-81,229,
  269`).

---

## 14. Botón D28 en Perfil y menú (TopBar) — 2026-09-09

- **Perfil** (`web/app/suite/perfil/page.tsx`, 367 líneas): escalera D28 con el peldaño actual
  (`pasosD28`, `page.tsx:19-20,162-164,220-244`) y **acción según el estado**:
  INSCRITO → botón "🛡️ Iniciar verificación (D28)" (`page.tsx:250-255`); VERIFICADO → botón
  "🪪 Iniciar certificación (KYC)" (`page.tsx:262-264`); CERTIFICADO → mensaje de identidad
  certificada (`page.tsx:269`).
- **TopBar** (`web/components/TopBar.tsx`, 311 líneas): zona derecha con campana +
  menú de usuario (`TopBar.tsx:160-175`). Dentro del desplegable, accesos directos de la escalera
  D28 según el estado: "🛡️ Iniciar verificación (D28)" para INSCRITO y "🪪 Iniciar certificación
  (KYC)" para VERIFICADO (`TopBar.tsx:256-275`); el botón de usuario muestra el emoji del estado
  (🟡/🟢/🥇, `TopBar.tsx:29-33,184-190`).
- Las secciones de la barra se calculan con `seccionesPara({ tipo, nivel, estado, esOwner })`
  (`TopBar.tsx:75-81`): el icono 🛠️ Sistemas **solo aparece si la wallet es el Owner** (ver
  Manual 08); lo mismo aplica el guard por URL (`web/components/SuiteGuard.tsx:179-194`).

---

## 15. Campana de notificaciones — `CampanaNotificaciones` (2026-09-08)

- Componente `web/components/CampanaNotificaciones.tsx` (178 líneas), montado en la zona derecha de
  la TopBar (`web/components/TopBar.tsx:173`).
- Consulta `GET /notificaciones` (`misNotificaciones`, `api.ts:585-588`) **al montar y cada 30 s**
  (`CampanaNotificaciones.tsx:44-62`); badge de no leídas (`noLeidas`, `:112-116`) y desplegable con
  los avisos (máx. 12) con icono por tipo (`ICONO_TIPO`, `:12-18`), link según referencia
  (`rutaDe`: disputa → `/suite/disputas`, trueke → `/suite/intercambio`, `:31-35`), y acciones
  "marcar una leída" (clic) y "Marcar todas leídas" (`:79-99,143-163`). Pie con acceso directo
  "Ir a Disputas →" (`:167-173`).
- Tipos servidos por el backend: `DISPUTA_REPORTADA`, `PEDIDO_JUSTIFICATIVO`, `VOTACION_ABIERTA`,
  `VEREDICTO`, `SISTEMA` (tabla `notificaciones`, `backend/db/schema.sql:241-251`; ver Manual 06
  §15).
