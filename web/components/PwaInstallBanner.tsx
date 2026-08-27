'use client'

import React, { useState, useEffect } from 'react'
import { isPwaInstalled, isIOS, isMobile, triggerHaptic } from '@/lib/mobile'

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [isIosDevice, setIsIosDevice] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

  useEffect(() => {
    // Si ya está instalada o es escritorio, no mostrar banner
    if (isPwaInstalled() || !isMobile()) return

    const dismissed = localStorage.getItem('truekeate_pwa_dismissed')
    if (dismissed && Date.now() - Number(dismissed) < 1000 * 60 * 60 * 24 * 7) {
      return // Ocultar por 7 días si el usuario lo cerró
    }

    if (isIOS()) {
      setIsIosDevice(true)
      // Mostrar banner tras 3 segundos de navegación en iOS
      const timer = setTimeout(() => setShowBanner(true), 3000)
      return () => clearTimeout(timer)
    }

    // En Android / Chromium escuchar el evento de instalación nativo
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
  }, [])

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
      <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto bg-[#2D2A26] text-[#FAF8F5] p-4 rounded-2xl shadow-xl border border-[#D4A373]/40 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#D4A373] text-[#2D2A26] flex items-center justify-center font-bold font-serif text-lg shrink-0">
            TK
          </div>
          <div>
            <h4 className="font-serif font-bold text-sm text-[#FAF8F5]">Instalar TrueKeate</h4>
            <p className="text-xs text-[#FAF8F5]/70">Accede como app móvil a pantalla completa</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="px-3 py-1.5 bg-[#D4A373] hover:bg-[#c59263] text-[#2D2A26] font-medium text-xs rounded-xl shadow-xs transition-colors shrink-0"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-[#FAF8F5]/50 hover:text-[#FAF8F5] transition-colors"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Guía modal específica para usuarios de iPhone / Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#FAF8F5] text-[#2D2A26] p-6 rounded-3xl shadow-2xl border border-[#D4A373]/30 text-center relative safe-area-pb">
            <button
              onClick={() => setShowIosGuide(false)}
              className="absolute top-4 right-4 p-2 text-[#2D2A26]/50 hover:text-[#2D2A26]"
            >
              ✕
            </button>
            <div className="w-12 h-12 bg-[#D4A373]/20 rounded-full flex items-center justify-center mx-auto mb-3 text-[#D4A373]">
              📲
            </div>
            <h3 className="font-serif text-lg font-bold text-[#2D2A26] mb-2">Instalar en tu iPhone</h3>
            <p className="text-xs text-[#2D2A26]/80 mb-4 leading-relaxed">
              1. Toca el botón <strong>Compartir</strong> (ícono con flecha hacia arriba) en la barra de Safari.
              <br />
              2. Desplázate hacia abajo y selecciona <strong>"Añadir a la pantalla de inicio"</strong>.
            </p>
            <button
              onClick={() => {
                triggerHaptic('light')
                setShowIosGuide(false)
              }}
              className="w-full py-2.5 bg-[#2D2A26] text-[#FAF8F5] text-xs font-semibold rounded-xl"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  )
}
