Diseñar la interfaz de **TrueKeate** requiere un enfoque limpio (clean UI) que transmita seguridad y modernidad, características esenciales para una plataforma Web3. Como asistente de texto, te estructuraré un **blueprint visual y un sistema de diseño** detallado que puedes entregar a un desarrollador frontend (para usar con React/Next.js y Tailwind CSS) o a un diseñador UI para montar los wireframes en Figma.

A continuación, tienes la arquitectura visual de la plataforma.

## 1. Sistema de Diseño (Design System)

La interfaz debe reflejar los colores y formas del logotipo que hemos definido, utilizando el hexágono como elemento visual recurrente para botones o avatares, reforzando la idea de "bloque" (blockchain).

| Elemento | Descripción / Estilo |
| --- | --- |
| **Color Principal** | Azul Marino Profundo (Fondo de barras superiores, textos primarios). Transmite seguridad. |
| **Color Secundario** | Turquesa Eléctrico (Botones de acción, enlaces, hover). Transmite tecnología y fluidez. |
| **Color de Acento** | Dorado (Insignias de usuarios verificados, iconos de criptomonedas, notificaciones). |
| **Fondo General** | Blanco nieve o gris muy claro (`#F8F9FA`) para resaltar las tarjetas de los productos. |
| **Tipografía** | Sans-serif moderna (ej. *Inter* o *Montserrat*). Limpia, legible y geométrica. |
| **Formas Geométricas** | Bordes ligeramente redondeados en las tarjetas, con avatares o iconos encapsulados en hexágonos. |

---

## 2. Mapa Visual de la Pantalla Principal (Dashboard)

Así se distribuiría la pantalla principal donde los usuarios exploran los activos disponibles para trueque.

### Barra de Navegación (Header)

* **Izquierda:** Logotipo de **TrueKeate** (Isotipo de flechas + Texto).
* **Centro:** Barra de búsqueda universal amplia con un menú desplegable rápido (Filtros: Productos, Servicios, Cripto).
* **Derecha:** Botón principal de **"Conectar Wallet"** (que cambia al Avatar hexagonal del usuario y su saldo una vez conectado) y un icono de campana para notificaciones de ofertas de trueque.

### Sección Hero (Bienvenida)

* **Mensaje Central:** "El Universo del Intercambio Descentralizado".
* **Subtítulo:** "Intercambia productos, servicios y criptoactivos de forma segura con contratos inteligentes."
* **Botón de Acción (Call to Action):** Un botón turquesa grande que diga **"Acuñar Nuevo Activo (Mint)"** para incentivar a los usuarios a subir sus ofertas.

---

## 3. Componente Clave: La Tarjeta de Activo (Asset Card)

Esta es la pieza más importante de la interfaz. Cada producto o servicio tokenizado (NFT/dNFT) se mostrará en una cuadrícula (Grid) usando estas tarjetas.

* **Imagen Superior:** Fotografía del producto o ilustración representativa del servicio.
* **Insignia de Categoría:** En la esquina superior derecha de la imagen, una pequeña etiqueta que indique si es "Producto" (Azul), "Servicio" (Dorado) o "Cripto" (Turquesa).
* **Cuerpo de la Tarjeta:**
* **Título:** Texto en negrita (ej. *Laptop Dell XPS 15 - Casi Nueva* o *Consultoría Legal Web3 - 1 Hora*).
* **Propietario:** Avatar hexagonal del dueño con un check de verificación `✓` (usando el mismo check del logo de TrueKeate).
* **Sección "Busca a cambio":** Un texto sutil que indica la preferencia del dueño (ej. *Busca: Teléfono móvil, USDC, o Diseño Gráfico*).


* **Pie de la Tarjeta (Acción):** Un botón de ancho completo que diga **"Proponer Trueque"**.

---

## 4. Pantalla de Negociación (Smart Escrow UI)

Cuando un usuario hace clic en "Proponer Trueque", no pasa a un chat común, sino a una sala de intercambio respaldada por blockchain.

| Sección | Función en la Interfaz |
| --- | --- |
| **Lado Izquierdo (Tu Oferta)** | Un espacio vacío donde haces clic para seleccionar activos desde tu inventario (tu wallet) para ofrecerlos. |
| **Centro (El Intercambio)** | El isotipo de TrueKeate (las flechas circulares) animado lentamente, indicando que el contrato inteligente está a la espera. |
| **Lado Derecho (Lo que recibes)** | La tarjeta del activo que deseas obtener de la otra persona. |
| **Panel Inferior (Estado del Contrato)** | Una barra de progreso de estado: *1. Oferta Enviada -> 2. Aceptada -> 3. En Tránsito / En Ejecución -> 4. Completado (Fondos Liberados)*. |
| **Botón de Firma** | Botón prominente en la parte inferior: **"Firmar Intercambio (Gasless)"** utilizando EIP-712. |

---

## 5. Menú de Inventario Personal (Tu Bóveda)

Una sección privada accesible desde el perfil del usuario. Aquí se gestionan los tokens acuñados.

* **Pestañas de Navegación:** Activos Disponibles, Trueques en Proceso, Historial Completado.
* **Panel de Acuñación (Minting):** Un formulario de un solo paso donde el usuario sube fotos, título, descripción y selecciona si es un objeto físico o un servicio. Al darle a "Tokenizar", se ejecuta la transacción en la red.

Esta estructura prioriza la claridad, separa visualmente las acciones del usuario de las acciones del contrato inteligente, y utiliza la identidad de marca de TrueKeate para generar confianza en un entorno de finanzas descentralizadas.

Para estructurar la navegación de TrueKeate con un enfoque moderno y preparado para Web3, la mejor práctica es unificar el marcado, los estilos y la lógica en un componente de React. Utilizaremos **Tailwind CSS** para los estilos (aplicando los design tokens que definimos) y **Ethers.js v6** para la lógica de conexión de la wallet.

Este enfoque es ideal para integrarlo directamente en un entorno con Next.js (App Router).

Aquí tienes el código del componente funcional.

### 1. El Componente de Navegación (React + Tailwind + Ethers)

Crea un archivo llamado `Navbar.tsx` (o `.jsx`) dentro de tu carpeta de componentes.

```tsx
'use client';

import { useState } from 'react';
import { BrowserProvider } from 'ethers';

export default function Navbar() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Lógica JS para conectar la Wallet con Ethers.js v6
  const connectWallet = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        setIsConnecting(true);
        // Inicializamos el proveedor de Ethers v6
        const provider = new BrowserProvider(window.ethereum);
        
        // Solicitamos acceso a la cuenta
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        
        setWalletAddress(address);
      } catch (error) {
        console.error("Error al conectar la wallet:", error);
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert('Por favor, instala MetaMask u otra wallet Web3.');
    }
  };

  // Función para formatear la dirección (ej. 0x1234...5678)
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <nav className="w-full bg-[#0a1128] text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo (Isotipo + Logotipo) */}
          <div className="flex-shrink-0 flex items-center gap-3 cursor-pointer">
            {/* Hexágono simulado para el isotipo */}
            <div className="w-10 h-10 border-2 border-[#00E5FF] rounded-lg flex items-center justify-center transform rotate-45">
              <div className="transform -rotate-45 text-[#00E5FF] font-bold text-xl">
                ⇄
              </div>
            </div>
            <span className="font-bold text-2xl tracking-tight">
              TrueKeat<span className="text-[#00E5FF]">☑</span>
            </span>
          </div>

          {/* Barra de Búsqueda y Filtros */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full flex items-center">
              <select className="absolute left-0 bg-gray-800 text-sm text-gray-300 h-full rounded-l-md border-r border-gray-600 px-3 focus:outline-none focus:ring-1 focus:ring-[#00E5FF]">
                <option value="all">Todo</option>
                <option value="products">Productos</option>
                <option value="services">Servicios</option>
                <option value="crypto">Cripto</option>
              </select>
              <input 
                type="text" 
                placeholder="Busca un producto o servicio..." 
                className="w-full pl-28 pr-10 py-2.5 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all"
              />
              <svg className="w-5 h-5 absolute right-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
          </div>

          {/* Acciones del Usuario (Conectar Wallet) */}
          <div className="flex items-center gap-4">
            <button className="hidden md:block text-gray-300 hover:text-[#00E5FF] transition-colors">
              Explorar
            </button>
            
            {walletAddress ? (
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2">
                <div className="w-2 h-2 rounded-full bg-[#00E5FF] animate-pulse"></div>
                <span className="text-sm font-medium text-[#00E5FF]">
                  {formatAddress(walletAddress)}
                </span>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-[#00E5FF] to-[#00b3cc] hover:from-[#00b3cc] hover:to-[#008ba3] text-[#0a1128] font-bold py-2.5 px-6 rounded-md shadow-lg shadow-[#00E5FF]/20 transition-all duration-300 disabled:opacity-70 flex items-center gap-2"
              >
                {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}

```

### Explicación de la Arquitectura

* **Estilos (CSS vía Tailwind):** Se utilizan clases utilitarias para aplicar la paleta de colores. El fondo principal es `#0a1128` (azul marino oscuro), y los detalles de interacción están en `#00E5FF` (turquesa). Se han añadido efectos de sombra (`shadow-[#00E5FF]/20`) y transiciones suaves (`transition-all duration-300`) para darle un aspecto moderno y profesional.
* **Lógica (JS vía React State):** Manejamos dos estados principales: `walletAddress` para guardar la clave pública del usuario y `isConnecting` para la experiencia de usuario (UX) mientras firma el acceso en MetaMask.
* **Integración Web3:** Instanciamos `BrowserProvider` de `ethers`, lo que permite que el botón escuche al objeto `window.ethereum` inyectado por la billetera del navegador, solicitando los permisos de conexión y obteniendo la dirección, lista para usarse posteriormente en firmas EIP-712 o interacciones de contratos.
