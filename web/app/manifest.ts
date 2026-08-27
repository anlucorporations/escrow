import type { MetadataRoute } from 'next'

/** M13 — Manifest PWA de TrueKeate (Mobile-First Standalone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TrueKeate — Mercado Web3 & Trueke RWA',
    short_name: 'TrueKeate',
    description: 'Intercambio seguro de bienes, servicios y tokens en Web3',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#FAF8F5',
    theme_color: '#2D2A26',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.ico', sizes: '256x256', type: 'image/x-icon' },
    ],
  }
}
