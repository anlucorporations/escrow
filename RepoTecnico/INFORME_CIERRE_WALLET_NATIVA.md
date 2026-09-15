# Informe de cierre — Sub-proyecto Wallet Nativa (TrueKeate)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** — wallet nativa de la plataforma (extensión Chrome MV3) |
| Sub-proyecto | **Wallet Nativa** (chrome-extension) |
| Fecha de cierre | 2026-09-13 |
| Rama | `escrow-dsh-GCP` (los 3 remotos: `gitlab`, `github`, `codecrypto`) |
| Versión de la wallet | **1.1.0** (`wallet-extension/`) |
| Requerimientos | `RepoTecnico/requerimientos_wallet_nativa.md` (RF-WN-01..27, RNF-WN-01..07, RT-WN-01..05) |
| Fuente | `RepoTecnico/mejoras_chrome-extension.md` |

---

## 1. Resumen ejecutivo

La plataforma incorpora su **wallet nativa**: una extensión de Chrome que se **instala desde la
propia web**, se presenta por **EIP-6963**, se integra visualmente con TrueKeate y se usa de
forma **exclusiva** para conectar, iniciar sesión y firmar durante toda la sesión, **sin
interferir** con MetaMask ni con otras wallets.

Se pasó de la extracción de requerimientos (Fase 1) a la entrega en **6 incrementos** (C0, C1,
C2, M5, M6, M7), con **40 pruebas de navegador automatizadas en verde** y documentación de
seguimiento. Cobertura: **100% de las funciones de la wallet que el proyecto invoca**.

---

## 2. Alcance entregado

| Área | Contenido | Ciclo |
|---|---|---|
| **Nativa en el repo** | Código en `wallet-extension/` (rama `escrow-dsh-GCP`); build con Vite | C0 |
| **Identidad visual** | Activos `TrueKeate_logoIntegral.{svg,ico,webp}`, cabeceras, tema, modo oscuro | C1/M6 |
| **Popup (index)** | Fichas contraíbles: Cuenta, Balance, Gestionar saldo, Enviar, Red, Características, Configuración, Conexiones; pie fijo de desconexión | C1 |
| **Gestión de saldo** | Recibir (QR + copiar), Enviar, **Comprar** (guiado), **Cambiar** (swap ERC-20 vía router V2), Contactos | C1 |
| **Características** | **Tokens** ERC-20 reales, **NFT** (ERC-721 enumerable + metadata), **Actividad** (movimientos ERC-20) | C2 |
| **Firmas** | Cabecera de firma (logo, acción, dApp) y **EIP-712 estructurado** (firmante, qué, valor, red, fecha/hora); EIP-191 separada | C1 |
| **Modos de vista** | Panel lateral (`sidePanel`), pestaña y **flotante** (overlay con Shadow DOM), elegible y recordado | M5 |
| **Configuración** | Hub con notificaciones deslizables, modo de vista, **Redes** (Públicas/Prueba/Personalizadas + Bitcoin informativo), ayuda y **Perfil** | M6 |
| **Perfil** | Modo oscuro, respaldo de la frase, **cambio de clave de bloqueo**, **backup exportable/restaurable** de la bóveda cifrada | M6 |
| **Instalación nativa** | Paquete servido por la plataforma (`/wallet/TrueKeateWallet.zip`), popup de instalación y detección, guía `/instalar-wallet`, botones en portada y barra de la suite | M7 |

---

## 3. Cobertura de requisitos (RF-WN)

| RF | Descripción | Estado | Dónde |
|---|---|---|---|
| 01 | Identidad visual en toda la extensión | ✅ | `theme.css`, `App/Connect/Notification` |
| 02 | Activos de marca (`logoIntegral`) | ✅ | `public/brand/`, cabeceras |
| 03 | Páginas de sección con flecha de volver | ✅ | `components/Pagina.tsx`, `App.tsx` (rediseño) |
| 04 | Cabecera de dos líneas: logo + **TrueKeate Wallet** · cuenta + red | ✅ | `App.tsx` (`.tk-header`) |
| 05 | Gestión de cuentas | ✅ | `App.tsx` (página Cuenta + selector de cabecera) |
| 06 | Balance multi-token con flechas | ✅ (ETH + aviso de C2) | `App.tsx` |
| 07 | Recibir/Enviar/Comprar/Cambiar/Contactos | ✅ | `RecibirQR`, `TransferSection`, `Comprar`, `Cambiar`, `Contactos` |
| 08 | Sección de red | ✅ | `ChainManager` |
| 09 | Pestañas Tokens/DeFi/NFT/Actividad | ✅ (DeFi placeholder D-NW-2) | `Caracteristicas`, `Tokens`, `NFT`, `Actividad` |
| 10 | Pie fijo: dApp + estado + bloqueo + desconexión | ✅ | `App.tsx` + `wallet_getConnectedSites`/`wallet_disconnectSite` |
| 11 | Cabecera de aprobación (logo, acción, dApp) | ✅ | `components/Aprobacion.tsx` (dentro de la wallet) |
| 12 | Botones aceptar/rechazar estilo proyecto | ✅ | `Aprobacion.tsx` (píldora, dentro de la wallet) |
| 13 | EIP-712 estructurado | ✅ | `Notification.tsx` (`describirEip712`) |
| 14-16 | Modos pestaña / panel / flotante | ✅ | `Configuracion.tsx`, `floating.ts`, `manifest.ts` |
| 17 | Modo recordado | ✅ | `codecrypto_view_mode` |
| 18-25 | Configuración, notificaciones, redes, ayuda, perfil y su página | ✅ | `Configuracion`, `Notificaciones`, `Redes`, `Perfil` |
| 26 | Instalación desde la barra de navegación | ✅ | `InstalarWallet.tsx`, `TopBar`, portada, `/instalar-wallet` |
| 27 | Detección de la extensión | ✅ | detección EIP-6963 en `InstalarWallet` |

**RNF-WN-01..07** (sin cambios de lógica, consistencia visual, accesibilidad, español,
seguridad de la bóveda, compatibilidad): cumplidos; los métodos de bóveda son **solo-extensión**
y el mnemonic nunca se guarda en claro.
**RT-WN-01..05** (solo UI/lectura, permisos justificados, datos externos acotados, Bitcoin no
EVM, versionado/empaquetado): aplicados.

---

## 4. Decisiones del director (D-NW)

| # | Decisión |
|---|---|
| D-NW-1 | La extensión pasa a ser **nativa** del repo (`wallet-extension/`) y se publica **paquete desempaquetado** servido por la plataforma |
| D-NW-2 | **Tokens, Actividad y NFT reales**; DeFi y Comprar como **placeholder/guiado** |
| D-NW-3 | Modos **panel lateral + pestaña + flotante**; **Bitcoin solo informativo** (núcleo EVM) |
| D-NW-4 | Identidad con **`TrueKeate_logoIntegral`**; ayuda = manual del proyecto (`/help/manual`) |
| D-NW-5 | Se **mantiene «CodeCrypto Wallet»** como nombre de producto (manifest/EIP-6963 intactos) |
| D-NW-6 | **Rediseño (supersede D-NW-5):** el nombre visible es **«TrueKeate Wallet»** (manifest, EIP-6963, cabecera y páginas); se conserva el `rdns` `io.codecrypto.wallet`. Espacio fijo de **480 px**, cabecera alineada arriba, secciones como **páginas** con flecha de volver y **aprobaciones dentro de la wallet** (RF-WN-28..33) |

---

## 5. Correcciones relevantes durante el desarrollo

1. **Selección de billetera** en la plataforma: de `select` permanente a **popup** con todas las
   wallets EIP-6963, elección recordada y aplicada a login y firmas.
2. **Firma con la wallet conectada**: `autenticar()`/`firmarAccion()` resolvían de una closure
   obsoleta o de la primera cuenta; ahora resuelven el **proveedor activo** en el momento de la
   firma y firman con la **cuenta conectada**.
3. **Cero interferencia**: la app **no sobrescribe `window.ethereum`** ni toca otras wallets.
4. **Guard «solo extensión»**: distinguía por `sender.tab` (también presente en la propia
   extensión abierta en pestaña); ahora distingue por **origen** `chrome-extension://`,
   manteniendo bloqueadas a las dApps.
5. **Ventana de firma**: separación **EIP-191** vs **EIP-712**.
6. **Rediseño de la wallet (D-NW-6)**: las aprobaciones se atienden **dentro del popup**
   (se eliminaron las 4 ventanas flotantes de `background.ts`), la identidad pasa a
   **TrueKeate Wallet**, el espacio es de **480 px** y las secciones son páginas con
   flecha de volver.

---

## 6. Pruebas y evidencia

### Suite automatizada (navegador, extensión real)
`web/e2e-wallet/` — **40 tests, 40/40 en verde** (`npm run test:wallet`):

| Spec | Tests | Cobertura |
|---|---|---|
| `wallet-nativa.spec.ts` | 8 | Instalación/detección (M7), modal de selección, no interferencia, identidad, modos flotante |
| `wallet-popup.spec.ts` | 19 | **Inicio rediseñado (F-00..F-18)**: carrusel de saldo (ETH + tokens), barra de operaciones Enviar/Recibir/Cambiar/Comprar **dentro de la ficha de balance**, pestañas Actividades/Tokens/NFTs/Contactos, pie (estado + Configuración/Bloquear/Desconectar), menú Perfil/Redes/Ayuda y la página de Perfil |
| `wallet-firmas.spec.ts` | 5 | Conexión, `eth_accounts`, `personal_sign`, **EIP-712 estructurado**, rechazo `4001` — todo aprobado **dentro de la wallet** |
| `plataforma-wallet.spec.ts` | 8 | **Plataforma × wallet real**: descubrimiento, conexión, login, firma por acción, sesión, `accountsChanged`, `chainChanged`, desconexión/revocación |

Evidencia en vivo de la suite: **`40 passed (1.7m)`**. El backend se simula con `page.route`
(sin escrituras reales); la wallet y las firmas son reales. Además: `background` **45/45**,
`vault` **25/25** y frontend **78/78**.

### Checklist y pendiente manual
`RepoTecnico/pruebas/checklist_wallet_nativa.md` (51 casos) e `INFORME_WALLET_NATIVA.md`.
Automatizados ~43; quedan **manuales** (navegador real): TC-WN-03 (carga en Chrome), 08
(recuerdo en el popup real), 17 (forma de botones), 37 (panel lateral nativo), 43 (permiso de
host al añadir red), 49/50/51 (no interferencia a fondo y autobloqueo).

---

## 7. Despliegues (Cloud Run `truekeate-web`)

| Rev. | Hito |
|---|---|
| 00038-xqf | M7 · instalación nativa desde la web |
| 00039-nsb | M5 · modos de vista (paquete actualizado) |
| 00040-cpx | M6 · Configuración/Redes/Perfil |
| 00041-m64 | Cierre M6 · clave y backup |
| 00042-6z6 | Comprar / Cambiar |
| 00043-fjr | Paquete con guard corregido + EIP-191/712 |

URL: `https://truekeate-web-593453426217.europe-west1.run.app` · paquete:
`/wallet/TrueKeateWallet.zip` · guía: `/instalar-wallet`.

---

## 8. Limitaciones conocidas

1. **Carga de la extensión**: local (desempaquetada); la publicación en Chrome Web Store es un
   ciclo posterior.
2. **DeFi** y **Comprar** sin proveedor externo: se ofrecen como placeholder/guiado (D-NW-2).
3. **Bitcoin**: solo listado informativo (no EVM).
4. **Cambiar** (swap) requiere que el usuario indique un **router Uniswap V2**; no se fijan
   routers por red.
5. **NFT/Tokens/Actividad**: sin indexador externo, dependen de las colecciones/tokens que el
   usuario añade y del rango de bloques configurado.
6. **Verificación manual pendiente** de los 8 casos del checklist que requieren el navegador
   del director.

---

## 9. Conclusión

El sub-proyecto **Wallet Nativa** se da por **cerrado**: los 27 requerimientos funcionales están
implementados, la plataforma usa la wallet de forma exclusiva y sin interferencias, y la
interacción está cubierta por **40 pruebas de navegador** con la extensión real. Queda como
único pendiente la **validación manual** de los casos que el entorno no puede automatizar y el
registro en `INFORME_WALLET_NATIVA.md`.
