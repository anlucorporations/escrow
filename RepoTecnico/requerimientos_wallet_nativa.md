# TrueKeate — Requerimientos de la Wallet Nativa (chrome-extension)

| Campo | Valor |
|---|---|
| Proyecto | **TrueKeate** — wallet nativa de la plataforma (extensión Chrome MV3) |
| Fuente | `RepoTecnico/mejoras_chrome-extension.md` (23 líneas, 7 bloques) |
| Fecha de extracción | 2026-09-13 |
| Rama de trabajo | `escrow-dsh-GCP` |
| Estado | **Fase 1 completada** — decisiones D-NW-1..D-NW-4 tomadas; listo para C0/C1 |
| Principio rector | La extensión es **nativa de la plataforma** y se ve/instala como parte de ella. **No se modifica la lógica** funcional (firma, RPC, bóveda, EIP-1193/6963/712) ni la del proyecto: los cambios son de interfaz y de integración. |

> Trazabilidad: `[M#]` = bloque numerado del documento fuente. `RF-WN` = requerimiento
> funcional, `RNF-WN` = no funcional, `RT-WN` = restricción técnica.

---

## 1. Requerimientos funcionales

### A. Identidad visual (M1)

- **RF-WN-01 · Identidad en toda la extensión** `[M1]`: aplicar la **entidad visual del
  proyecto** a **todo** el frontend de la extensión (popup/index, conexión, firmas,
  configuración, perfil, ayuda): títulos, paleta, tipografías, radios, gradientes e iconos.
- **RF-WN-02 · Activos de marca** `[M1][M2.1.1][M3]`: usar los activos de TrueKeate
  (logo/título y `iconoIntegral.ico` en las páginas de firma) en cabeceras, estados y
  ventanas de aprobación.

### B. Popup / index (M2.1)

- **RF-WN-03 · Fichas contraíbles** `[M2.1]`: el index organiza sus secciones en **fichas
  contraíbles** (colapsables, estado recordado).
- **RF-WN-04 · Barra superior** `[M2.1.1]`: icono + título de TrueKeate.
- **RF-WN-05 · Gestión de cuentas** `[M2.1.2]`: sección superior con el **nombre de la
  cuenta en uso** y un control para **desplegar/cambiar** entre las demás cuentas.
- **RF-WN-06 · Balance** `[M2.1.3]`: sección de saldo con **ETH como principal** y
  **flechas laterales** para cambiar entre los tokens agregados; debe **ocupar todo el
  ancho** disponible de la billetera.
- **RF-WN-07 · Gestión de saldo** `[M2.1.4]`: accesos de **Recibir** (QR de la dirección),
  **Enviar** (formulario), **Comprar** (formulario de compra de cripto), **Cambiar**
  (intercambio) y **Contactos** (direcciones guardadas).
- **RF-WN-08 · Red** `[M2.1.5]`: sección que muestra la **red actual conectada** y un botón
  de acceso a la **gestión de redes**.
- **RF-WN-09 · Características** `[M2.1.6]`: sección con pestañas:
  - **Tokens**: listado de tokens con sus saldos.
  - **DeFi**: (alcance por definir).
  - **NFT**: colección de NFTs que posee la billetera.
  - **Actividad**: listado/resumen de movimientos con opción de ver el **detalle**.
- **RF-WN-10 · Desconexión (pie fijo)** `[M2.1.7]`: sección **siempre en el pie** con la
  **dApp conectada**, un **icono de estado de conexión**, un **icono de bloquear** y un
  **icono de desconexión**.

### C. Páginas de firma (M3, M4)

- **RF-WN-11 · Cabecera de firma** `[M3]`: identificación de TrueKeate (`iconoIntegral.ico`),
  **título de la acción** («Solicitud de firma», «Solicitud de autorización», …) y
  **dirección de la dApp**.
- **RF-WN-12 · Botones de aceptar/rechazar** `[M3]`: con la **misma forma/estilo** que los
  botones del proyecto.
- **RF-WN-13 · EIP-712 estructurado** `[M4, M4.1]`: la descripción del mensaje tipado debe
  estructurarse con: **billetera firmante** (reducida), **qué se firma** (descripción),
  **valor de la transacción** (si aplica) y **fecha y hora** de la firma.

### D. Modos de visualización (M5)

- **RF-WN-14 · Modo pestaña** `[M5]`: la billetera puede abrirse como **pestaña** del navegador.
- **RF-WN-15 · Modo panel lateral** `[M5]`: como **panel lateral** de la pestaña donde está la dApp.
- **RF-WN-16 · Modo flotante** `[M5]`: como **elemento flotante** sobre la página.
- **RF-WN-17 · Elección recordada** `[M5]`: el modo se elige en **Configuración** y se recuerda.

### E. Configuración (M6)

- **RF-WN-18 · Página de configuración** `[M6, M6.1]`: muestra **solo accesos** a: notificaciones,
  modo de vista, redes, ayuda y perfil.
- **RF-WN-19 · Notificaciones** `[M6.1, M6.1.1]`: área con **fichas deslizables** que resumen
  las notificaciones **no leídas**.
- **RF-WN-20 · Modo de vista** `[M6.1]`: área para elegir **panel / pestaña / flotante**.
- **RF-WN-21 · Red actual** `[M6.1]`: área con la **información básica de la red conectada** y
  acceso a la página de configuración de redes.
- **RF-WN-22 · Página de redes** `[M6.1.2]`: tres pestañas — **Redes públicas**, **Redes de
  prueba** y **Redes personalizadas** — con las redes más conocidas de **Ethereum, Bitcoin y
  Base** y las principales **testnets**; listado y posibilidad de **conectarse**; ocupa todo el
  ancho disponible.
- **RF-WN-23 · Ayuda** `[M6.1, M6.1.3]`: acceso a la **página de ayuda** de la billetera.
- **RF-WN-24 · Perfil** `[M6.1, M6.1.4]`: información básica del perfil actual + acceso a su
  **página de configuración**.
- **RF-WN-25 · Página de perfil** `[M6.1.4]`: cambio de **clave de bloqueo**, **respaldo del
  mnemonic**, **cifrado del mnemonic**, **backup de la billetera**, **modo dark**, etc.

### F. Nativa de la plataforma (M7)

- **RF-WN-26 · Instalación desde la plataforma** `[M7]`: al ser **nativa**, el usuario puede
  **instalarla desde la barra de navegación del proyecto**.
- **RF-WN-27 · Detección y estado** (derivado de `[M7]`): la web detecta si la extensión está
  instalada y muestra su estado (instalada / no instalada / actualizable).

---

## 2. Requerimientos no funcionales

- **RNF-WN-01 · Sin cambios de lógica** `[M1]`: la lógica de firma, RPC, bóveda y estándares
  (EIP-1193/6963/712) **no se modifica**; el alcance es presentación e integración.
- **RNF-WN-02 · Consistencia visual** `[M1]`: alineada con `RNF-08` del proyecto (paleta, radios,
  gradientes, tipografías).
- **RNF-WN-03 · Rendimiento**: el panel debe abrir y renderizar con fluidez; imágenes/iconos
  optimizados.
- **RNF-WN-04 · Accesibilidad**: contraste, foco visible, navegación por teclado y roles ARIA en
  fichas, pestañas y modales.
- **RNF-WN-05 · Idioma**: textos en **español**, coherentes con la plataforma.
- **RNF-WN-06 · Seguridad**: nunca exponer ni registrar mnemonic/clave; el cifrado de la bóveda
  y el autobloqueo se conservan.
- **RNF-WN-07 · Compatibilidad**: Chrome/Chromium (MV3) y Edge.

---

## 3. Restricciones técnicas

- **RT-WN-01**: los cambios se limitan a UI/integración; si una sección nueva necesita datos de
  lectura, se añaden **métodos RPC de solo lectura** sin tocar los existentes.
- **RT-WN-02**: los permisos MV3 nuevos (p. ej. `sidePanel`) deben declararse en el manifest y
  justificarse.
- **RT-WN-03**: **Tokens, NFT, DeFi, Actividad y Comprar** dependen de fuentes externas
  (indexador/API/proveedor on-ramp). Definir por ciclo: real vs. placeholder/lectura.
- **RT-WN-04**: **Bitcoin** no es compatible con la superficie **EIP-1193** actual (modelo UTXO);
  requiere decisión de alcance (listado informativo vs. soporte real).
- **RT-WN-05**: empaquetado y versionado del entregable (v1.2+), firma del paquete y canal de
  instalación.

---

## 4. Matriz de trazabilidad (fuente → requerimientos)

| Fuente | Requerimientos |
|---|---|
| M1 | RF-WN-01, RF-WN-02, RNF-WN-01, RNF-WN-02 |
| M2.1 | RF-WN-03 |
| M2.1.1 | RF-WN-04 |
| M2.1.2 | RF-WN-05 |
| M2.1.3 | RF-WN-06 |
| M2.1.4 | RF-WN-07 |
| M2.1.5 | RF-WN-08 |
| M2.1.6 | RF-WN-09, RT-WN-03 |
| M2.1.7 | RF-WN-10 |
| M3 | RF-WN-11, RF-WN-12 |
| M4 | RF-WN-13 |
| M5 | RF-WN-14, RF-WN-15, RF-WN-16, RF-WN-17, RT-WN-02 |
| M6 | RF-WN-18, RF-WN-20, RF-WN-21, RF-WN-23, RF-WN-24 |
| M6.1.1 | RF-WN-19 |
| M6.1.2 | RF-WN-22, RT-WN-04 |
| M6.1.4 | RF-WN-25 |
| M7 | RF-WN-26, RF-WN-27, RT-WN-05 |

---

## 5. Análisis de brecha (estado actual → requerido)

| Área | Estado actual (v1.1.0) | Brecha |
|---|---|---|
| M1 identidad | Tema base portado (`src/theme.css`); el popup aún muestra «CodeCrypto Wallet» | Falta aplicar a **todo** el frontend (títulos, iconos, config, firma) |
| M2 popup | Cuenta actual + selector, `ChainManager`, `TransferSection` (solo envío), `LogsPanel` | **No** hay fichas contraíbles, balance multi-token, QR, comprar, cambiar, contactos, pestañas ni pie de desconexión |
| M3 firma | `Connect.tsx` y `Notification.tsx` funcionan con estilo propio | Falta cabecera de identidad, título de acción, dApp y botones estilo proyecto |
| M4 EIP-712 | Se firma EIP-712 con aprobación | Falta la **descripción estructurada** (billetera, qué, valor, fecha/hora) |
| M5 modos | Solo popup (`default_popup`) | No hay pestaña, panel lateral ni flotante |
| M6 config | No existe página de configuración | Falta todo (notificaciones, vista, redes, ayuda, perfil) |
| M7 nativa | La web solo menciona la wallet; no hay enlace de instalación | Falta instalación desde la barra de navegación y detección |

### Dependencias que hoy no existen en la extensión
`eth_call` selectivo para tokens (existe en v1.1), `eth_getLogs`/indexador para **Actividad**,
API de **NFT/DeFi**, proveedor **on-ramp** para **Comprar**, almacén de **contactos**.

---

## 6. Supuestos y dependencias

1. La lógica de `background.ts`, `vault.ts`, `inject.ts` y `content-script.ts` es **intocable**
   salvo añadir métodos de lectura.
2. La identidad visual de referencia es `web/app/globals.css` (RNF-08) y los activos en
   `TrueKeate/`.
3. El objetivo de distribución sigue siendo **académico/local** salvo nueva decisión.

---

## 7. Ambigüedades y preguntas abiertas

### 7.1 Decisiones del director (2026-09-13)

| # | Pregunta | Decisión |
|---|---|---|
| **D-NW-1** | Ubicación e instalación | El código de la extensión **se incorpora al repo del proyecto** como `wallet-extension/` (rama `escrow-dsh-GCP`) y se publica **paquete desempaquetado/firmado**; la web ofrece la instalación desde su barra de navegación. |
| **D-NW-2** | Datos externos | **Tokens reales**, **Actividad real** y **NFT real**; **DeFi** y **Comprar** quedan como **placeholder** en esta iteración (ciclo posterior). |
| **D-NW-3** | Bitcoin y modos de vista | Modos **panel lateral (`chrome.sidePanel`) + pestaña + flotante**; **Bitcoin solo listado informativo** (el núcleo sigue siendo EVM/EIP-1193). |
| **D-NW-4** | Activos y ayuda | Usar **`TrueKeate/TrueKeate_logoIntegral.{ico,svg,webp}`** como identidad (incluidas las páginas de firma); la **ayuda** reutiliza el manual del proyecto (`/help/manual`). |
| **D-NW-5** | Nombre del producto | Se **mantiene «CodeCrypto Wallet»** como nombre del producto (manifest y EIP-6963 intactos); lo que cambia es la **identidad visual** (TrueKeate). |

### 7.2 Preguntas originales (resueltas)

1. **Nativa / ubicación / instalación** `[M7]`: ¿el código de la extensión pasa a vivir en el
   repo del proyecto (p. ej. `wallet-extension/` en `escrow-dsh-GCP`) o se mantiene en su repo
   separado y la web solo publica la instalación? ¿La instalación es desde **Chrome Web Store**,
   **paquete firmado autoalojado** o **desempaquetada desde el repo**?
2. **Datos externos** `[M2.1.6][M2.1.4]`: de **Tokens, NFT, DeFi, Actividad y Comprar**, ¿cuáles
   entran **reales** en esta iteración y cuáles como **placeholder/lectura**? ¿Qué proveedor
   (indexador propio, Alchemy/Infura, on-ramp)?
3. **Bitcoin y modos de vista** `[M6.1.2][M5]`: ¿Bitcoin es **solo listado/selección informativa**
   o **soporte real** de direcciones/firma? ¿El modo **flotante** es un panel inyectado por
   content script en la página de la dApp, y el **panel lateral** usa `chrome.sidePanel`
   (requiere permiso nuevo)?
4. **Activos y ayuda** `[M3][M6.1.3]`: ¿existe/creamos `iconoIntegral.ico`? ¿La página de ayuda
   de la billetera es la sección de Ayuda del proyecto (`/help/manual`) o una propia?

---

## 8. Plan propuesto por ciclos verticales (borrador — pendiente de aprobación)

| Ciclo | Contenido | Cubre | Depende de |
|---|---|---|---|
| **C0 · Preparación** | Ubicar/versionar la extensión en la rama; base visual; build v1.2; plan aprobado | RT-WN-05 | Pregunta 1 |
| **C1 · Popup** | Identidad visual + fichas contraíbles + cuentas + balance + gestión de saldo + red (sin datos externos) | M1, M2.1–M2.1.5 | C0 |
| **C2 · Características** | Pestañas Tokens/DeFi/NFT/Actividad + pie de desconexión | M2.1.6, M2.1.7 | Pregunta 2 |
| **C3 · Firmas** | Cabecera de firma + EIP-712 estructurado + botones estilo proyecto | M3, M4 | C1 |
| **C4 · Vista y configuración** | Modos pestaña/panel/flotante + Settings + redes/notificaciones/ayuda/perfil | M5, M6 | Preguntas 3 y 4 |
| **C5 · Nativa** | Instalación desde la barra de navegación + detección + empaquetado | M7 | Pregunta 1 |
| **C6 · Opcionales** | NFT/DeFi/Comprar reales y endurecimiento | M2.1.4, M2.1.6 | Pregunta 2 |

---

## 9. Próximo paso

Responder el **bloque de preguntas** de la §7 (las 3 primeras desbloquean C0/C1). Con las
respuestas se cierra la Fase 1 y se aprueba el plan de ciclos.

---

## 16. Rediseño: navegación por páginas y aprobaciones dentro de la wallet (2026-09-14)

Instrucción del director (revisión de la extensión):

- **RF-WN-28 · Aprobaciones en el mismo espacio**: confirmaciones, autorizaciones, firmas y
  notificaciones se muestran **dentro de la wallet** (mismo espacio y forma que la página
  principal). Se **eliminan las ventanas flotantes** independientes que abría el background
  (`chrome.windows.create` de `notification.html`/`connect.html`).
- **RF-WN-29 · Secciones como páginas**: cada sección es una **página propia** que ocupa todo el
  espacio de la billetera, invocada desde el inicio y con **flecha para volver al inicio**.
- **RF-WN-30 · Título**: el título de la billetera es **TrueKeate Wallet**.
- **RF-WN-31 · Header en dos líneas**: línea 1 = **icono + título** (sin subtítulo); línea 2 =
  **selector de cuentas** (dirección resumida, no completa) + **nombre de la red** conectada.
  Alineado a la parte superior.
- **RF-WN-32 · Cuerpo**: contiene las diferentes páginas.
- **RF-WN-33 · Espacio fijo de 480 px**; en móvil se muestra como **pestaña flotante** del navegador.

**Decisión D-NW-6** (sustituye a D-NW-5): el nombre visible pasa a **TrueKeate Wallet** en la
interfaz (se mantiene el `rdns` `io.codecrypto.wallet` para no invalidar la elección guardada).

Estado: **implementado** (rediseño de App: header, Inicio + `Pagina`, `Aprobacion` en el popup y
background sin ventanas de aprobación).

---

## 17. Rediseño del inicio y del pie (instrucción del director, 2026-09-15)

- **RF-WN-34 · Pie (footer)**: contiene **solo** el **estado de la dApp** conectada y tres
  botones tipo icono: **Configuración** (menú desplegable), **Bloquear** y **Desconectar**.
  Se **elimina la sección de actividades** del pie (la actividad vive ahora en una pestaña).
  El estado de la dApp abre la página de Conexiones.
- **RF-WN-35 · Ancho y páginas**: la billetera mantiene **480 px fijos**; las páginas abarcan
  **todo el espacio disponible** de la wallet, **sin márgenes** exteriores.
- **RF-WN-36 · Ficha de balance deslizable**: la ficha superior es un **carrusel** (gesto de
  deslizar + flechas + puntos) que recorre las **monedas de la billetera** (ETH + tokens ERC-20
  añadidos con su saldo real).
- **RF-WN-37 · Barra de operaciones**: debajo de la ficha de balance hay una barra con iconos de
  **Enviar, Recibir, Cambiar y Comprar**. La página de cada operación **se carga dentro de la
  ficha de balance**, con flecha para volver al saldo.
- **RF-WN-38 · Ficha con pestañas**: debajo de la barra de operaciones, una ficha con pestañas
  **Actividades, Tokens, NFTs y Contactos**.
- **RF-WN-39 · Menú Configuración**: el botón desplegable del pie contiene los iconos de
  **Perfil, Redes y Ayuda**, más **Notificaciones** y **Modo de vista** (y la acción de reinicio
  por seguridad).

**Decisión D-NW-7** (sustituye el inicio de secciones de RF-WN-29): el inicio pasa de un menú de
11 secciones a una sola página con carrusel de saldo, barra de operaciones y ficha de pestañas.
Las páginas de Perfil/Redes/Conexiones se siguen abriendo a pantalla completa.

Estado: **implementado**. Notificaciones y Modo de vista se recuperaron en el menú del pie
(decisión del director). Única nota de alcance: la página *Características* (pestañas
Tokens/DeFi/NFT/Actividad) queda sin acceso directo porque su contenido vive ahora en la ficha de
pestañas del inicio; el código se conserva.
