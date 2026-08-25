import type { MetadataRoute } from 'next'

/** M13 — Manifest PWA de TrueKeate. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'TrueKeate — Escrow & Exchange',
    short_name: 'TrueKeate',
    description: 'Intercambio seguro de tokens, bienes y servicios entre pares',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.ico', sizes: '256x256', type: 'image/x-icon' },
    ],
  }
}
