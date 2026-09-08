# TrueKeate — Informe de la 1.ª Prueba del Proyecto (pruebas en limpio en GCP)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** (DApp Web3 de trueques con Escrow) |
| Fecha | 2026-09-08 |
| Entorno | **Producción GCP**: web `https://truekeate-web-593453426217.europe-west1.run.app` · API `https://truekeate-api-593453426217.europe-west1.run.app` · Cloud SQL `truekeate-db-dev` · anvil GCP (chain 31337) |
| Alcance | Despliegue + BD en limpio + inyección de datos operativos + **pruebas desde el navegador interno (Chromium headless)** como lo haría un usuario |
| Ejecutado por | Orden del director — trabajo en segundo plano con evidencia capturada |

---

## 1. Resumen ejecutivo

1. **Despliegue en GCP**: verificado y al día — API revisión **00013** y web revisión **00014** (Cloud Run `truekeate-*`, europe-west1), código del repo en HEAD (`a31d74a`); CORS web→api correcto; `NEXT_PUBLIC_API_URL` horneado al Cloud Run de la API.
2. **BD inicializada en limpio**: respaldo previo (`backend/scripts/backups/truekeate-pre-reset-*.json`) + `reiniciar-plataforma.sh --confirmar` → 0 filas en las 14 tablas de la plataforma (anvil intacto).
3. **Servicios probados tras el reset**: `/catalog` → `{"articulos":[]}`, `/truekes/ofertas` → `{"truekes":[]}`, web → HTTP 200.
4. **Inyección de datos ejecutada** (`scripts/inyectar_datos_operativos.mjs`): 6 usuarios perfilados, 24 ítems tokenizados con **NFT reales on-chain** (tokens 6–29), 30 truekes COMPLETADOS (10 por usuario), 60 valoraciones, y **emisión real de BRLT con quórum de Socios** (D32) distribuida 2000/2000/2000/2000/1000/1000.
5. **Pruebas de usuario desde el navegador**: login con wallet (firma EIP-191 real) para 4 personas, dashboard, inventario, finanzas y **publicación de un trueque (firma por acción → HTTP 201)** verificados. Hallazgos funcionales documentados (sección 5).

---

## 2. Preparación del entorno

| Paso | Detalle | Estado |
|---|---|---|
| Verificación de servicios GCP | Cloud Run api (rev 00013) y web (rev 00014); `/auth/estado`, `/catalog`, `/truekes/ofertas` responden | ✅ |
| Proxy Cloud SQL | `cloud-sql-proxy` hacia `truekeate-main:southamerica-east1:truekeate-db-dev` (token renovado) | ✅ |
| Respaldo | Volcado JSON de las tablas de la plataforma antes del reset | ✅ |
| Reset en limpio | `backend/scripts/reiniciar-plataforma.sh --confirmar` (TRUNCATE CASCADE + secuencias) | ✅ (0 filas) |
| Contratos anvil GCP | Escrow `0x8a93…` · BRLT `0x6f6f…` · SociosRegistry `0xb0f0…` · TrueKeateNFT v2 `0x6C2d…` (minter = cuenta 1) | ✅ |

---

## 3. Resultado de la inyección de datos (verificado en BD y cadena)

### 3.1 Base de datos (Cloud SQL `truekeate`)

| Tabla | Filas | Detalle |
|---|---|---|
| `usuarios` | 6 | 2 SOCIO/ORO/CERTIFICADO (Ana, Bruno) · 2 EMPRESA/PLATA/CERTIFICADO (EcoTech, ServiPro) · 2 PARTICULAR/BRONCE/VERIFICADO (Carlos, Diana) |
| `articulos` | 24 | 3 por socio/común · 6 por empresa (2 ARTICULO + 2 BIEN + 2 SERVICIO) — todos con `nft_token_id` real |
| `truekes` | 30 | **30 COMPLETADO** · cada usuario participa en **10** (5 como oferente + 5 como contraparte) |
| `valoraciones` | 60 | 2 por trueke · 5 dimensiones 1–5 · 0 truekes sin valorar |
| `finanzas` | 6 | BRLT 2000/2000/2000/2000/1000/1000 (coincide con saldo on-chain) |
| `kyc` | 6 | APROBADO para CERTIFICADO (2–5) · PENDIENTE para VERIFICADO (6–7) |

### 3.2 On-chain (anvil GCP, bloque 267)

- **BRLT**: emisión real por propuesta `EMITIR_BRLT` nº 0 (10527 BRLT, 5 % → FondoDeValor) aprobada con quórum (Owner + 2 nuevos Socios) y distribuida: `0x3C44…` 2000 · `0x90F7…` 2000 · `0x15d3…` 2000 · `0x9965…` 2000 · `0x976E…` 1000 · `0x14dC…` 1000.
- **TrueKeateNFT**: 24 NFT reales minteados (tokens **6–29**) y alineados con la BD:
  Ana 6–8 · Bruno 9–11 · EcoTech 12–17 · ServiPro 18–23 · Carlos 24–26 · Diana 27–29. (Token 5 = “Bicicleta” de pruebas anterior, intacto.)
- **SociosRegistry**: 3 socios on-chain (Owner + Ana + Bruno), admitidos por `admitirSocioDirecto`.

### 3.3 API (verificación en vivo)

- `GET /catalog` → 24 artículos con dueño/categoría/token.
- `GET /truekes/ofertas` → ofertas PROPUESTO (2 creadas durante las pruebas, ver hallazgo H4).
- `POST /auth/session` con firma EIP-191 real → 200 + token (sesión 24 h en `sesiones`).

---

## 4. Pruebas desde el navegador interno (como lo haría un usuario)

Navegador: **Chromium headless interno** (`chromium_headless_shell`, build 1234 de Playwright) con `LD_LIBRARY_PATH` de las librerías ya extraídas y `FONTCONFIG_FILE` propio; wallet simulada EIP-1193 con **firmas EIP-191 reales** de las cuentas anvil (sin extensiones ni instalaciones). Cada paso pulsa los botones reales de la web desplegada.

| # | Paso (botón/función probada) | Resultado | Evidencia |
|---|---|---|---|
| 1 | **Landing pública** — título y hero | ✅ | `01-landing.png` |
| 2 | **“🔗 Conectar MetaMask e iniciar sesión”** (Ana, cuenta 2) → firma única EIP-191 → `POST /auth/session` 200 → suite | ✅ | `02-dashboard-ana.png` |
| 3 | Login Bruno (cuenta 3) · EcoTech (cuenta 4) · Carlos (cuenta 6) | ✅ ×3 | capturas 08–14 |
| 4 | **Dashboard “Mi Trueke Central”** — escalera CERTIFICADO 3/3, módulos, contadores de truekes | ✅ | `02-dashboard-ana.png` |
| 5 | **Inventario (Ana)** — 3 ítems tokenizados listados (Olympus/vinilos/MacBook) | ✅ | `05-inventario-ana.png` |
| 6 | **Finanzas (Ana)** — saldo “2.000 BRLT” + Fondo | ✅ | `04-finanzas-ana.png` |
| 7 | **“🚀 Publicar en el Mercado”** (Ana, formulario de oferta) — firma por acción → **HTTP 201** (`POST /truekes/ofertas`, oferta PROPUESTO id 92, escrow sintético −32) | ✅ (201 confirmado en red) | `06-oferta-publicada.png` |
| 8 | **Mercado** — la API devuelve las ofertas (200); el listado UI tardó en renderizar en varias tomas headless (ver H2) | ⚠️ parcial | `07-mercado*.png` |
| 9 | **Perfil (Ana)** — reputación cargada: PUNTAJE 50/100 · NIVEL COMUN · 🥈 PLATA · TRUEQUES EFECTIVOS 5 · APELACIONES 0 (ver H1) | ✅ con hallazgos | `03-perfil-ana.png` |
| 10 | **Intercambio (Bruno)** — sección con historial/activos | ✅ | `09-intercambio-bruno.png` |
| 11 | Intersticial **“Iniciar sesión (una firma)”** al recargar secciones — confirmado y superado con un clic (comportamiento por diseño, H3) | ✅ | — |

> Los scripts de prueba quedan en `web/prueba-1-navegador.mjs`, `web/flujo-usuario.mjs`, `web/cerrar.mjs` y `web/final-verif.mjs` (evidencia JSON en `RepoTecnico/pruebas/1ra-prueba/*.json`).

---

## 5. Hallazgos de la 1.ª prueba (bugs / mejoras detectados)

- **H1 — `/reputacion/mi` cuenta solo la parte “A” y muestra nivel calculado, no el perfil**: el router filtra con `t.parteB` (campo inexistente; el real es `usuario_b`) → “Trueques efectivos” muestra 5 (no 10) para Ana/Bruno. Además la medalla/nivel mostrados en Perfil son los **calculados por la fórmula D12** (50/100 → COMUN/PLATA) y no el perfil almacenado (SOCIO/ORO), y la “reputación media” es 0 porque `renglones` nunca se persiste en `truekes`. Impacto: el Perfil no refleja la identidad ORO/SOCIO inyectada.
- **H2 — Listado del Mercado**: la API responde 200 con las ofertas, pero en varias tomas headless la UI quedó en “Cargando mercado…” (render/estado). Requiere revisión (posible carrera con el intersticial de sesión o render condicional).
- **H3 — Firma única por sesión**: al recargar una sección aparece de nuevo “Iniciar sesión (una firma)”; un clic lo resuelve. Comportamiento por diseño del login único (la sesión vía token no se restaura automáticamente tras recarga en el flujo probado).
- **H4 — Duplicación de ofertas**: durante las corridas de prueba se crearon **2 ofertas PROPUESTO con el mismo artículo** (MacBook, ids 91 y 92): el backend no impide ofertar dos veces el mismo artículo `disponible`. Conviene validar “1 oferta activa por artículo”.
- **H5 — Mensaje de éxito**: tras “Publicar en el Mercado” el POST responde 201, pero el texto de éxito no fue asertivo en la UI dentro de la ventana esperada (posible aviso transitorio); se recomienda persistir el mensaje (toast) hasta la siguiente navegación.
- **Nota**: la inyección on-chain se alineó a tokens 6–29 tras detectar que el token 5 ya existía (“Bicicleta” de pruebas previas); el script admite `REUTILIZAR_TOKEN_ID_BASE` para no duplicar mints. También se corrigió en el script: propósito bytes32 ≤ 32 y **autocommit por sentencia** (evita rollbacks silenciosos por cortes de conexión al usar un pool remoto con BEGIN/COMMIT).

---

## 6. Veredicto

La plataforma quedó **desplegada, con BD limpia, datos operativos inyectados (BD + cadena) y los flujos principales probados desde el navegador** (login con firma real, suite por rol, inventario, finanzas y publicación de trueques con firma por acción → 201). Se detectaron **4 hallazgos funcionales** (H1–H4) que conviene corregir antes de la siguiente ronda; ninguno impide la operación básica de la plataforma.

## 7. Reproducción

```bash
# Entorno
source /home/dsh/workspace/gcp-env.sh   # RPC_URL, secretos
# Reset (con respaldo previo) — solo bajo orden del director
bash backend/scripts/reiniciar-plataforma.sh --confirmar --respaldo
# Inyección (BD + on-chain con claves reales del anvil GCP)
DATABASE_URL="postgresql://app:***@127.0.0.1:5433/truekeate" \
  node scripts/inyectar_datos_operativos.mjs --yes
# Pruebas de navegador (Chromium headless interno)
cd web && LD_LIBRARY_PATH=/tmp/playwright-libs/extracted/usr/lib/x86_64-linux-gnu \
  FONTCONFIG_FILE=/tmp/fonts-config/fonts.conf node prueba-1-navegador.mjs
```
