# TrueKeate — Frontend Web

Frontend **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4** +
**ethers v6**, con el **sistema de diseño RNF-08** («Bóveda Digital Moderna»).

Integra la **wallet nativa** de TrueKeate (`../wallet-extension/`): la detecta por **EIP-6963**,
la ofrece en un **popup de selección**, la usa de forma **exclusiva** para el login y las firmas,
y permite **instalarla** desde la propia plataforma.

## Estructura

```
web/
├─ app/
│  ├─ layout.tsx · page.tsx     # Root (EthereumProvider) + Landing pública (RF-14.1)
│  ├─ instalar-wallet/          # Guía de instalación de la wallet nativa (M7)
│  ├─ help/manual/              # Biblioteca de manuales
│  └─ suite/                    # Suite por estado/rol (RF-14.2–14.8)
│     ├─ dashboard/ · mercado/ · intercambio/ · inventario/ · subastas/
│     ├─ disputas/ · gobernanza/ · valor/ · perfil/ · admin/
│     └─ inscripcion/ · verificacion/ · certificacion/
├─ lib/
│  ├─ ethereum.tsx              # Provider EIP-1193/EIP-6963: proveedor activo (wallet
│  │                            #   elegida), auto-reconexión (RF-16.2) y eventos
│  ├─ contracts.ts · abis/*     # ABIs + direcciones
│  ├─ tipos.ts · navegacion.ts  # Matriz única de secciones por rol (RF-14)
│  └─ sesion.tsx · firma.ts     # Login único + firma por acción (EIP-191)
├─ components/
│  ├─ ConnectButton.tsx         # Popup de selección de billetera + login
│  ├─ InstalarWallet.tsx        # Instalación/detección de la wallet nativa (M7)
│  ├─ TopBar.tsx · BottomNav.tsx · SuiteGuard.tsx
│  └─ Button/Card/StatusBadge (RNF-08) · MapaWidget · SubirFotos · CampanaNotificaciones
├─ e2e/                         # E2E de la plataforma (Playwright: Chromium + Pixel 5)
├─ e2e-wallet/                  # E2E plataforma × wallet nativa REAL (Playwright)
├─ test/                        # Pruebas unitarias (vitest + testing-library)
├─ playwright.wallet.config.ts  # Config de la suite de la wallet nativa
└─ public/
   ├─ brand/ · hero/            # Activos de marca e imágenes (RF-19)
   ├─ wallet/                    # Paquete descargable de la wallet (TrueKeateWallet.zip)
   └─ manifest.json             # PWA instalable (D40)
```

## Desarrollo

```bash
npm run dev            # http://localhost:3000
npm run build          # build de producción (Next.js standalone)
npm start              # servir el build
npm test               # pruebas unitarias (vitest + testing-library)
npm run test:wallet    # E2E plataforma × wallet nativa (40 tests, requiere
                       #   ../wallet-extension/dist construido)
npx playwright test    # E2E de la plataforma (Chromium + Pixel 5)
```

## Integración de la wallet nativa

- **Descubrimiento**: `lib/ethereum.tsx` escucha **EIP-6963** y lista todas las wallets
  detectadas (MetaMask, Rabby, Backpack, TrueKeate Wallet…), incluida la legacy de
  `window.ethereum`.
- **Selección**: `ConnectButton` abre un **popup** con las billeteras; la elección se guarda y
  gobierna el login y **cada firma** de la sesión. No hay `select` permanente en la página.
- **Sin interferencia**: la app **no sobrescribe `window.ethereum`** ni toca otras wallets.
- **Instalación**: `/instalar-wallet` ofrece la descarga y los pasos; `InstalarWallet` muestra el
  estado (instalada / no instalada) y está en la portada y en la barra de la suite.

## Sistema de diseño (RNF-08)

- **Paleta** en `globals.css`: navy `#1a2b4c/#0a1128`, teal `#2a9d8f`, cyan `#48cae4`,
  gold `#d4af37`, lienzo `#f8f9fa`, error `#e63946`, warning `#f4a261`.
- **Componentes**: `Button` (pill-primary/outline-navy/gold-accent), `Card` (premium RWA),
  `BottomNav` (flotante móvil con botón central hexagonal), `StatusBadge`.
- **Suite**: barra superior con `@username`, dashboard con la escalera D28
  (INSCRITO/VERIFICADO/CERTIFICADO) y módulos atenuados según estado.

## PWA (D40)

Manifest en `public/manifest.json` (instalable). En móvil la firma se delega a una wallet; la
wallet nativa es de escritorio (extensión).

> Referencia: `../RepoTecnico/arquitectura_tecnica.md`, `../RepoTecnico/requerimientos_wallet_nativa.md`
> y `../RepoTecnico/INFORME_CIERRE_WALLET_NATIVA.md`.
