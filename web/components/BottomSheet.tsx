'use client'

import React, { useEffect } from 'react'
import { triggerHaptic } from '@/lib/mobile'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  maxHeight?: string
}

/**
 * Componente modular BottomSheet (Hoja Deslizable Inferior).
 * Proporciona modales táctiles ergonómicos en móviles (Thumb Zone).
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  maxHeight = 'max-h-[85vh]',
}: BottomSheetProps) {
  useEffect(() => {
    if (isOpen) {
      triggerHaptic('light')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Backdrop para cerrar al tocar afuera */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Contenedor de la Hoja Inferior */}
      <div
        className={`relative z-10 w-full max-w-lg bg-[#FAF8F5] text-[#2D2A26] rounded-t-3xl shadow-2xl border-t border-[#D4A373]/30 overflow-hidden flex flex-col ${maxHeight} animate-in slide-in-from-bottom duration-300 safe-area-pb`}
      >
        {/* Barra superior / Indicador de arrastre */}
        <div className="flex flex-col items-center pt-3 pb-2 px-6 cursor-grab active:cursor-grabbing border-b border-[#2D2A26]/5">
          <div className="w-12 h-1.5 bg-[#D4A373]/60 rounded-full mb-2" />
          {title && (
            <div className="w-full flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-[#2D2A26] tracking-wide">{title}</h3>
              <button
                onClick={() => {
                  triggerHaptic('light')
                  onClose()
                }}
                className="p-1.5 rounded-full text-[#2D2A26]/60 hover:text-[#2D2A26] hover:bg-[#2D2A26]/5 transition-colors"
                aria-label="Cerrar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Cuerpo del contenido con scroll independiente */}
        <div className="p-6 overflow-y-auto overscroll-contain flex-1">{children}</div>
      </div>
    </div>
  )
}
