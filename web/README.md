# TrueKeate — Frontend Web (Ciclo 7, Fase 3)

Frontend **Next.js 16.3.4** (App Router) + **TypeScript** + **Tailwind v4** + **ethers v6**
(RT-01/D1/RT-04) con el **sistema de diseño RNF-08** ("Bóveda Digital Moderna").

## Estructura

```
web/
├─ app/
│  ├─ layout.tsx · page.tsx     # Root (EthereumProvider) + Landing pública (RF-14.1)
│  └─ suite/                    # Suite por estado/rol (RF-14.2–14.8)
│     ├─ dashboard/             # Escalera D28 + módulos según estado
│     ├─ inventario/ · intercambio/ · gobernanza/ · perfil/
├─ lib/
│  ├─ ethereum.tsx              # Context provider MetaMask (RT-04.4): provider/signer/
│  │                            #   account + auto-reconexión al refrescar (RF-16.2)
│  ├─ contracts.ts              # ABIs + direcciones (RT-04.5)
│  ├─ abis/*.json               # ABIs copiados de forge (sc/out)
│  └─ tipos.ts
├─ components/                  # Button (pill/outline/gold), Card (premium RWA),
│  │                            #   BottomNav (flotante, botón central hexagonal), StatusBadge
├─ public/
│  ├─ brand/                    # TrueKeate_logo/titulo (SVG/PNG/ICO) — RF-19
│  ├─ hero/                     # Imágenes hero de la landing — RF-19
│  └─ manifest.json             # PWA instalable (D40)
```

## Desarrollo

```bash
npm run dev      # http://localhost:3000
npm run build    # build de producción (verificado: 9 páginas estáticas)
npm start        # servir el build
```

## Sistema de diseño (RNF-08)

- **Paleta** en `globals.css` `@theme`: navy `#1a2b4c/#0a1128`, teal `#2a9d8f`, cyan `#48cae4`,
  gold `#d4af37`, lienzo `#f8f9fa`, error `#e63946`, warning `#f4a261`.
- **Componentes**: `Button` (pill-primary/outline-navy/gold-accent), `Card` (premium con borde
  dorado RWA), `BottomNav` (flotante móvil con botón central hexagonal dorado), `StatusBadge`
  (mapea estados D28/escrow a colores).
- **Landing** (RF-14.1): hero con assets, métricas, "qué es un Trueke Digital", ventajas y
  filosofía — sin autenticación.
- **Suite** (RF-14.2): barra superior con `@username ✓`, dashboard con la escalera
  INSCRITO/VERIFICADO/CERTIFICADO (D28) y módulos bloqueados/activos según estado.

## PWA (D40)

Manifest en `public/manifest.json` (instalable). En móvil la firma se delega a la wallet
(MetaMask mobile). APK nativa: mejora futura.

> Referencia: `../RepoTecnico/arquitectura_tecnica.md` §8 (frontend) y §2 (sistema de diseño).
