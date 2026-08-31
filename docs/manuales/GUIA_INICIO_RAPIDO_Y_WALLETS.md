# 🚀 Guía de Inicio Rápido, Configuración de Wallets y PWA Móvil — TrueKeat

Bienvenido a **TrueKeat**, la plataforma descentralizada Web3 para el intercambio seguro y atómico de criptoactivos, bienes físicos tokenizados (RWA) y vouchers de servicios entre pares.

Esta guía contiene las instrucciones oficiales paso a paso para:
1. Crear e instalar tu billetera Web3 (MetaMask en navegador y aplicación móvil).
2. Configurar la red blockchain e importar los tokens de la plataforma.
3. Instalar la aplicación móvil PWA en Android e iOS.
4. Conectarte a TrueKeat y realizar tus primeras operaciones.

---

## 1. Creación e Instalación de tu Billetera Web3 (MetaMask)

Para interactuar con los contratos inteligentes de TrueKeat necesitas una billetera Web3 compatible con EVM (Ethereum Virtual Machine). Recomendamos **MetaMask**.

### 1.1 MetaMask para Navegadores de Escritorio (Chrome, Brave, Firefox, Edge)

```
+-------------------------------------------------------------------------+
|                  FLUJO METAMASK ESCRITORIO (NAVEGADOR)                  |
|                                                                         |
|  [ Extensión Chrome/Brave/Firefox ]                                     |
|              │                                                          |
|      ┌───────┴───────────────────────┐                                  |
|      ▼                               ▼                                  |
|  [ Crear Nueva Cartera ]    [ Importar Cartera ]                        |
|      │                               │                                  |
|      ├─> Password Local              ├─> Frase Semilla (12 palabras)    |
|      ├─> Respaldar Frase Semilla     └─> o Clave Privada (0x...)        |
|      └─> Confirmar Palabras                                             |
+-------------------------------------------------------------------------+
```

1. **Descarga Oficial**:
   * Dirígete al sitio web oficial [metamask.io](https://metamask.io) o a la tienda de extensiones de tu navegador (Chrome Web Store, Firefox Add-ons).
   * Pulsa **Añadir a Chrome / Instalar extensión**.
2. **Crear una Cartera Nueva**:
   * Al abrirse la pestaña de bienvenida, selecciona **Crear una cartera nueva**.
   * Acepta los términos de uso y define una contraseña local segura (mínimo 10 caracteres con letras, números y símbolos).
3. **Copia de Seguridad de la Frase Secreta de Recuperación (Seed Phrase)**:
   * Haz clic en **Proteger mi cartera**.
   * Revela las **12 palabras secretas**.
   * **⚠️ REGLA DE ORO**: Anota estas 12 palabras en un papel físico en orden estricto (1 al 12) y guárdalas en un lugar seguro. Nunca las compartas con nadie ni tomes capturas de pantalla digitales.
   * Confirma la frase en MetaMask seleccionando las palabras en el orden correcto.
4. **¡Listo!**: Tu billetera estará activa con una dirección pública que inicia en `0x...`.

---

### 1.2 MetaMask Mobile (iOS / Android)

1. **Instalación**:
   * Busca **MetaMask** en Google Play Store (Android) o Apple App Store (iOS).
2. **Configuración**:
   * Selecciona **Crear nueva cartera** y configura desbloqueo biométrico (Face ID o Huella dactilar).
   * O bien, selecciona **Importar con frase secreta** si ya tienes una cartera previa.
3. **Navegador Web3 Incorporado**:
   * MetaMask Mobile incluye un navegador Web3 en su menú lateral/inferior. Puedes ingresar `http://localhost:3000` (o la IP local de tu servidor) para usar TrueKeat directamente desde la app.

---

### 1.3 Importación de Cuentas de Prueba de Anvil (Desarrollo Local)

Si estás probando la plataforma en el entorno local de desarrollo (Anvil), puedes importar una de las cuentas pre-fondeadas:

1. Abre MetaMask y haz clic en el selector de cuentas (círculo superior).
2. Selecciona **Añadir cuenta o billetera de hardware** -> **Importar cuenta**.
3. Selecciona tipo **Clave privada** e introduce una de las claves de prueba (ej. Cuenta 5 - Carlos):
   ```text
   0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba
   ```
4. Haz clic en **Importar**. La cuenta aparecerá con saldo en ETH de prueba.

---

## 2. Configuración de Red RPC y Tokens ERC-20

### 2.1 Agregar la Red Local Anvil a MetaMask

```
                    ┌──────────────────────────────┐
                    │  Ajustes de Red en MetaMask  │
                    ├──────────────────────────────┤
                    │ Nombre: Anvil Localhost      │
                    │ RPC URL: http://127.0.0.1:8545│
                    │ Chain ID: 31337              │
                    │ Símbolo: ETH                 │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    [ Conectado a TrueKeat EVM ]
```

1. En MetaMask, haz clic en el selector de redes (arriba a la izquierda) y pulsa **Añadir red** -> **Añadir una red manualmente**.
2. Rellena los datos de la red:
   * **Nombre de la red**: `Anvil Localhost` (o `TrueKeat Dev`)
   * **Nueva dirección URL de RPC**: `http://127.0.0.1:8545` *(En móvil usar la IP LAN de tu PC, ej. `http://192.168.1.100:8545`)*
   * **Identificador de cadena (Chain ID)**: `31337`
   * **Símbolo de moneda**: `ETH`
   * **URL del explorador de bloques**: *(Dejar en blanco)*
3. Guarda los cambios y cambia a la nueva red.

---

### 2.2 Importación de Tokens de Prueba (TKA, TKB, USDT, BRLT, DELIVERY)

Para ver tus balances en MetaMask:
1. Ve a la pestaña **Tokens / Activos** y haz clic en **Importar tokens**.
2. Selecciona la pestaña **Token personalizado** y pega la dirección de cada contrato:

| Token | Símbolo | Dirección del Contrato (Anvil Local) | Decimales | Uso en TrueKeat |
| :--- | :---: | :--- | :---: | :--- |
| **Token A** | `TKA` | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` | 18 | Truekes y Swaps de prueba |
| **Token B** | `TKB` | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` | 18 | Truekes y Swaps de prueba |
| **USDT Mock** | `USDT` | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` | 6 | Moneda de referencia USD |
| **Barlovento Token** | `BRLT` | `0xa513E6E4b8f2a923D98304ec87F64353C4D5C853` | 18 | Moneda comunitaria & Suscripciones |
| **Delivery Token** | `DELIVERY` | `0x0165878A594ca255338adfa4d48449f69242Eb8F` | 18 | Vouchers de flete y logística |

3. Pulsa **Siguiente** -> **Importar** para cada uno.

---

## 3. Instalación de TrueKeat como App Móvil (PWA)

TrueKeat es una **Progressive Web App (PWA)** que ofrece experiencia de aplicación nativa a pantalla completa con soporte táctil, barra de navegación flotante y respuesta háptica.

```
                  ┌─────────────────────────────────────┐
                  │    INSTALACIÓN DE TRUEKEAT PWA      │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
        [ Android (Chrome) ]                     [ iOS (Safari) ]
                 │                                       │
        ├─> Banner flotante "Instalar"          ├─> Botón Compartir (⎋)
        ├─> O Menú ⋮ -> "Instalar app"          ├─> "Añadir a pantalla de inicio"
        └─> Ícono en Launcher nativo            └─> Ícono en Home Screen
```

### 3.1 Instalación en Android (Google Chrome / Brave)
1. Abre Google Chrome y navega a [**`http://localhost:3000`**](http://localhost:3000).
2. Verás el banner inferior: **"Instalar TrueKeat — Accede como app móvil a pantalla completa"**.
3. Pulsa **Instalar** y confirma en el diálogo del sistema operativo.
4. El icono de TrueKeat se agregará a tu pantalla de inicio y menú de aplicaciones.

### 3.2 Instalación en iOS (Apple Safari en iPhone / iPad)
1. Abre Safari y carga la dirección de TrueKeat.
2. Toca el botón central de **Compartir** (icono de cuadro con flecha hacia arriba `⎋` o `↑`) en la barra inferior.
3. Desplázate hacia abajo y selecciona **"Añadir a la pantalla de inicio"** (`+`).
4. Confirma el nombre "TrueKeat" y pulsa **Añadir** (esquina superior derecha).
5. La aplicación se abrirá sin barras de navegador, en modo nativo a pantalla completa.

---

## 4. Primeros Pasos en TrueKeat

Una vez instalada tu billetera y la PWA:

1. **Conectar Billetera**: En la esquina superior derecha, presiona **⚡ Conectar Wallet**.
2. **Inscripción On-Chain**: Si tu billetera es nueva, la plataforma te guiará automáticamente a [`/register`](http://localhost:3000/register) para registrar tu `@username` público y detectar tu ubicación GPS.
3. **Explorar el Catálogo**: Navega por [`/items`](http://localhost:3000/items) para ver los bienes RWA y servicios publicados en Barlovento.
4. **Proponer tu Primer Trueque**: Haz clic en **Proponer Trueke Atómico** para abrir una custodia bilateral segura.
