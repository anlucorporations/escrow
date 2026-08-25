'use client'

import { useEffect } from 'react'

/** M13 — Registra el service worker (PWA) en el navegador. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('SW registration failed:', err)
    })
  }, [])

  return null
}
