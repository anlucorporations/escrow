# Checklist de pruebas E2E — Wallet Nativa (extensión TrueKeate Wallet)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate — Wallet Nativa** (sub-proyecto chrome-extension) |
| Fecha | 2026-09-14 (rediseño de la wallet) |
| Rama | `escrow-dsh-GCP` |
| Versión de la wallet | **1.1.0** (paquete `web/public/wallet/TrueKeateWallet.zip`) |
| Web desplegada | https://truekeate-web-593453426217.europe-west1.run.app |
| Base de requerimientos | `RepoTecnico/requerimientos_wallet_nativa.md` (RF-WN-01..39, D-NW-1..7) |
| Objetivo | Validar de punta a punta la wallet nativa y su integración con la plataforma |

Convención: `TC-WN-nn` = caso de prueba. **Tipo**: `A` automático / `M` manual.
**Resultado**: ✅ pasa · ❌ falla · ⚠️ parcial. Registrar en la tabla final.

> **Rediseño (RF-WN-28..33 · D-NW-6):** la wallet se llama **TrueKeate Wallet**; el
> espacio tiene ancho fijo **480 px**; la cabecera va alineada arriba (línea 1: logo +
> título; línea 2: selector de cuenta acortada + red); las secciones son **páginas**
> completas con flecha de volver; y **conexiones, firmas y notificaciones se atienden
> dentro de la propia wallet**, sin ventanas flotantes.

> **Cobertura automatizada** (specs en `web/e2e-wallet/`, `npm run test:wallet` desde `web/`):
> - `wallet-nativa.spec.ts` → **TC-WN-01, 02, 04, 05, 06, 07, 09, 13** (popup), **39, 40**.
> - `wallet-popup.spec.ts` → **TC-WN-18..36, 38, 41..48** (inicio rediseñado: F-00..F-19 — carrusel
>   de saldo, operaciones en la ficha de balance, pestañas, pie y menú de configuración).
> - `wallet-firmas.spec.ts` → **TC-WN-10, 11, 12, 14, 15, 16** (conexión y firmas **dentro del popup**).
> - `plataforma-wallet.spec.ts` → **TC-WN-07, 10, 11, 12** (plataforma × wallet REAL:
>   descubrimiento, conexión, login, firma por acción, sesión persistente,
>   auto-reconexión, `accountsChanged`, `chainChanged` y desconexión/revocación).
>
> Estado actual: **42/42 E2E ✅**, **45/45 background ✅**, **25/25 bóveda ✅**, **78/78 web ✅**.
>
> Quedan como **manuales**: TC-WN-03 (carga real en Chrome), 08 (recuerdo de elección en
> el popup real), 17 (forma de los botones), 37 (panel lateral del navegador), 43 (permiso
> de host al añadir red), 49/50/51 (no interferencia a fondo y autobloqueo).

---

## 0. Preparación del entorno

1. **Contratos y dApp local** (opcional; la validación principal puede hacerse contra GCP):
   ```bash
   cd /home/dsh/workspace/escrow
   ./start.sh          # arranca anvil + despliega + web (:3000)
   ```
   Anvil: `http://127.0.0.1:8545`, chain **31337**.
2. **Mnemonic de prueba** (cuentas anvil, la primera es la del Owner):
   `test test test test test test test test test test test junk`
3. **Instalación de la wallet** (elegir una):
   - **Desde la plataforma** (M7): abrir `/instalar-wallet` → *Descargar wallet (.zip)* → descomprimir → `chrome://extensions` → Modo de desarrollador → *Cargar descomprimida*.
   - **Desde el repo**: `cd wallet-extension && npm i && npm run build` → cargar `wallet-extension/dist`.
4. **Extensiones del navegador** para la prueba de convivencia (TC-WN-13): tener además MetaMask (u otra wallet EIP-6963) instalada.
5. **Backend**: para login/inscripción real se usa la API desplegada (`NEXT_PUBLIC_API_URL` de la build); para pruebas locales, `backend/`.

---

## A. Instalación y detección desde la plataforma (M7 · RF-WN-26/27)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-01 | A | La web ofrece la descarga | Abrir `/instalar-wallet` | HTTP 200; botón **Descargar wallet (.zip)**; pasos de instalación visibles |
| TC-WN-02 | A | El paquete se descarga | Pulsar la descarga | `TrueKeateWallet.zip` (`application/zip`) con `manifest.json` en la raíz |
| TC-WN-03 | M | Carga en Chrome | Cargar la carpeta descomprimida | La extensión aparece como **TrueKeate Wallet 1.1.0** sin errores |
| TC-WN-04 | A | Detección en la web (sin extensión) | Abrir la portada en un perfil sin la extensión | Botón **🧩 Instalar wallet nativa** |
| TC-WN-05 | A | Detección en la web (con extensión) | Con la extensión cargada, recargar la portada | Botón **✅ Wallet nativa instalada**; el popup la detecta |
| TC-WN-06 | A | Barra de la suite | Entrar a `/suite/dashboard` | El botón de wallet nativa aparece en la barra superior (PC) |

---

## B. Conexión y selección de billetera (C1 · cero interferencia)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-07 | A | Un solo selector, tipo popup | Pulsar **Conectar billetera e iniciar sesión** | Se abre un **modal** con las wallets detectadas; **no** hay `<select>` permanente en la página |
| TC-WN-08 | M | Elección recordada | Elegir *TrueKeate Wallet* y conectar | Conecta; la elección se conserva al recargar |
| TC-WN-09 | A | No interfiere con MetaMask | Con MetaMask + TrueKeate instaladas, elegir TrueKeate | La firma la pide **TrueKeate**; `window.ethereum` sigue siendo MetaMask; MetaMask no recibe `eth_requestAccounts`/`personal_sign` |
| TC-WN-10 | M | Login único (EIP-191) | Con una cuenta inscrita, conectar | **Una** firma `TrueKeate: iniciar sesión`; token emitido; acceso a la suite |
| TC-WN-11 | M | Firma por acción | Publicar/custodiar/valorar | Cada acción firma con la **misma** billetera conectada (una firma por acción) |
| TC-WN-12 | M | Desconexión | Menú de usuario → Desconectar | Se limpia la sesión y la autorización del sitio en la wallet |

---

## C. Identidad visual y vistas de aprobación (M1/M3/M4 · rediseño)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-13 | A | Identidad y cabecera | Abrir el popup | Ancho **480 px**; cabecera arriba con logo `logoIntegral` + título **TrueKeate Wallet**; 2.ª línea con cuenta acortada + red |
| TC-WN-14 | M | Conexión desde una dApp | Provocar una conexión | La vista **Solicitud de autorización** aparece **dentro de la wallet** (sin ventana flotante) con la dApp solicitante |
| TC-WN-15 | M | Firma desde una dApp | Provocar `personal_sign` | La vista **Solicitud de firma** aparece **dentro de la wallet** |
| TC-WN-16 | M | EIP-712 estructurado | Provocar `eth_signTypedData_v4` | Se muestran: **billetera firmante** (abreviada), **qué se firma** (dominio + primaryType), **valor** si aplica, **red** y **fecha/hora**; JSON completo en desplegable |
| TC-WN-17 | M | Botones de firma | Ver acciones de la vista de aprobación | *Aprobar/Rechazar* con forma de píldora (estilo del proyecto) dentro de la wallet |

---

## D. Wallet — inicio, operaciones y pestañas (M2.1 · rediseño 2026-09-15)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-18 | M | Inicio rediseñado | Abrir la wallet | Ancho 480 px sin márgenes; ficha de balance + barra de operaciones + ficha de pestañas; **sin** sección de actividad en el pie |
| TC-WN-19 | M | Cuenta | Cambiar de cuenta en la cabecera | La dirección del carrusel de saldo se actualiza |
| TC-WN-20 | M | Balance deslizable | Deslizar la ficha de balance | Recorre ETH y los tokens añadidos (flechas + puntos); muestra el saldo de cada moneda |
| TC-WN-21 | M | Recibir (QR) | Barra de operaciones → **Recibir** | La operación se carga **dentro de la ficha de balance**; QR + **Copiar** funcional |
| TC-WN-22 | M | Enviar | Barra de operaciones → **Enviar** | Formulario de envío en la ficha de balance; transacción firmable; flecha para volver al saldo |
| TC-WN-23 | M | Comprar (guiado) | Barra de operaciones → **Comprar** | Enlace a VALOR + QR, dentro de la ficha de balance |
| TC-WN-24 | M | Cambiar (swap) | Barra de operaciones → **Cambiar** | Formulario de swap en la ficha de balance; **Aprobar** e **Intercambiar** |
| TC-WN-25 | M | Contactos | Pestaña **Contactos** → guardar/eliminar | Libreta persistente con validación de dirección |
| TC-WN-26 | M | Redes | Menú Configuración → **Redes** → Personalizadas → **Añadir red personalizada** | Conectar redes públicas/prueba; alta de red propia (nombre, RPC, chainId, símbolo) con permiso del RPC y validación del chainId; la red **aparece listada** y se puede seleccionar |
| TC-WN-27 | M | Pestañas | Ver la ficha inferior | Pestañas **Actividades/Tokens/NFTs/Contactos** operativas |
| TC-WN-28 | M | Conexiones y pie | Pulsar el estado de la dApp y el icono de red; ver el pie | Pie **anclado al fondo** = estado + **icono de la red conectada** + Configuración/Bloquear/Desconectar; gestión de dApps |

---

## E. Tokens reales (C2)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-29 | M | Añadir token | Características → Tokens → dirección ERC-20 → **Añadir** | Aparece símbolo/nombre y **saldo real** de la cuenta |
| TC-WN-30 | M | Validación | Añadir una dirección inválida o repetida | Mensaje claro; no se añade |
| TC-WN-31 | M | Quitar token | 🗑️ en la fila del token | El token desaparece y no reaparece tras recargar |

## F. NFT (C2)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-32 | M | Añadir colección | Características → NFT → colección ERC-721 enumerable | Se listan los NFTs con imagen/nombre/tokenId |
| TC-WN-33 | M | Colección sin Enumerable | Añadir una ERC-721 sin Enumerable | Muestra el balance y el aviso de que no se pueden listar |
| TC-WN-34 | M | Colección sin saldo | Añadir colección donde la cuenta tiene 0 | Muestra `0 NFT` |

## G. Actividad (C2)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-35 | M | Movimientos | Características → Actividad (haber transferido ERC-20) | Lista entradas/salidas con token y valor |
| TC-WN-36 | M | Detalle | Pulsar un movimiento | Detalle con hash, token, de/para, valor, bloque |

---

## H. Modos de vista (M5)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-37 | M | Panel lateral | Configuración → **Panel lateral** | Se abre el panel lateral con la UI de la wallet |
| TC-WN-38 | M | Pestaña | Configuración → **Pestaña** | Se abre `index.html` en una pestaña nueva |
| TC-WN-39 | A | Flotante | Configuración → **Flotante**; abrir una dApp | Aparece el botón 🔐 y el panel flotante; al cambiar a otro modo desaparece |
| TC-WN-40 | A | Modo recordado | Cerrar y reabrir el popup | El modo elegido sigue seleccionado |

## I. Configuración (M6)

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-41 | M | Notificaciones | Menú Configuración → Notificaciones | **Lista completa** (vertical) con icono por tipo, texto, hora y origen; contador de no leídas; **marcar como leídas** |
| TC-WN-42 | M | Redes (3 pestañas) | Configuración → Red → Gestionar redes | Pestañas **Públicas / Prueba / Personalizadas**; Ethereum, Base, Polygon, Arbitrum, Optimism, Sepolia, Base Sepolia; **Bitcoin solo informativo** |
| TC-WN-43 | M | Conectar red | Conectar una red pública | Pide permiso del RPC y la deja activa |
| TC-WN-44 | M | Ayuda | Configuración → Ayuda | Abre la ayuda de la plataforma |
| TC-WN-45 | M | Perfil: modo oscuro | Perfil → Modo oscuro | Toda la UI cambia a oscuro y se recuerda |
| TC-WN-46 | M | Perfil: respaldo | Perfil → Mostrar frase (bóveda desbloqueada) | Muestra la frase con aviso; ocultar funciona |
| TC-WN-47 | M | Perfil: cambio de clave | Perfil → cambiar clave (actual + nueva) | Clave actual errónea → error; correcta → **✅ clave actualizada** y sigue desbloqueada |
| TC-WN-48 | M | Backup/restaurar | Descargar backup (.json) → restaurar con la clave | Descarga el JSON cifrado; restaurar con clave válida funciona; con clave errónea, error |

---

## J. No interferencia y seguridad

| ID | Tipo | Objetivo | Pasos | Resultado esperado |
|---|---|---|---|---|
| TC-WN-49 | M | No escribe `window.ethereum` | Consola en la dApp tras elegir TrueKeate | `window.ethereum.isMetaMask === true`; la app no lo sobrescribe |
| TC-WN-50 | M | Métodos de bóveda solo-extensión | Intentar `wallet_createVault`/`revealMnemonic` desde una dApp | Rechazado (no invocable por dApps) |
| TC-WN-51 | M | Autobloqueo | Dejar la wallet 15 min | La bóveda se bloquea y pide clave para firmar |

---

## Registro de resultados

| ID | Resultado | Evidencia (captura/log) | Observaciones |
|---|---|---|---|
| TC-WN-01 | | | |
| … | | | |

**Criterio de aceptación:** ✅ en TC-WN-01..12 (instalación/conexión/firma), TC-WN-21..28
(popup/gestión), TC-WN-29..36 (datos reales), TC-WN-37..40 (modos), TC-WN-41..48
(configuración) y TC-WN-49..51 (seguridad). Un ❌ en cualquiera de esos es bloqueante.

---

## Evidencia sugerida
Guardar capturas en `RepoTecnico/pruebas/wallet-nativa/` con el nombre `TC-WN-nn.png`
y adjuntar el informe `RepoTecnico/pruebas/INFORME_WALLET_NATIVA.md` con el resumen
(X/Y ✅, fallos y causa/solución).
