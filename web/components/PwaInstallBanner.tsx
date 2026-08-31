'use client'

import React, { useState, useEffect } from 'react'
import { isPwaInstalled, isIOS, isMobile, triggerHaptic } from '@/lib/mobile'

/** Evento beforeinstallprompt (no tipado en lib.dom). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  // isIOS() es determinista: se calcula en render, sin estado.
  const isIosDevice = isIOS()

  useEffect(() => {
    // Si ya está instalada o es escritorio, no mostrar banner
    if (isPwaInstalled() || !isMobile()) return

    const dismissed = localStorage.getItem('truekeate_pwa_dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 1000 * 60 * 60 * 24 * 7) {
      return // Ocultar por 7 días si el usuario lo cerró
    }

    if (isIosDevice) {
      // Mostrar banner tras 3 segundos de navegación en iOS
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // En Android / Chromium escuchar el evento de instalación nativo
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [isIosDevice])

  const handleInstallClick = async () => {
    triggerHaptic('medium')
    if (isIosDevice) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      triggerHaptic('success')
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    triggerHaptic('light')
    setShowBanner(false)
    setShowIosGuide(false)
    localStorage.setItem('truekeate_pwa_dismissed', String(Date.now()))
  }

  if (!showBanner) return null

  return (
    <>
      {/* Banner flotante en la parte inferior sobre la barra de navegación */}
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto bg-navy-800 text-white p-4 rounded-2xl shadow-xl border border-gold-500/40 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-500 text-navy-900 flex items-center justify-center font-bold font-heading text-lg shrink-0">
            TK
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">Instalar TrueKeate</h4>
            <p className="text-xs text-slate-300">Accede como app móvil a pantalla completa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-gold-500 hover:bg-gold-600 text-navy-900 font-medium text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Guía modal específica para usuarios de iPhone / Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white text-navy-900 p-6 rounded-3xl shadow-2xl border border-gold-500/30 text-center relative safe-area-pb">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-2 text-navy-900/50 hover:text-navy-900"
            >
              ✕
            </button>
            <div className="w-12 h-12 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-gold-500">
              📲
            </div>
            <h3 className="font-heading text-lg font-bold text-navy-900 mb-2">Instalar en tu iPhone</h3>
            <p className="text-xs text-navy-900/80 mb-4 leading-relaxed">
              1. Toca el botón <strong>Compartir</strong> (ícono con flecha hacia arriba) en la barra de Safari.
              <br />
              2. Desplázate hacia abajo y selecciona <strong>&quot;Añadir a la pantalla de inicio&quot;</strong>.
            </p>
            <button
              onClick={() => {
                triggerHaptic('light')
                setShowIosGuide(false)
              }}
              className="w-full py-2.5 bg-navy-800 text-white text-xs font-semibold rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
