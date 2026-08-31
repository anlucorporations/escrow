'use client'

import React, { useRef, useState } from 'react'
import { triggerHaptic } from '@/lib/mobile'
import { BottomSheet } from './BottomSheet'

interface CameraCaptureModalProps {
  isOpen: boolean
  onClose: () => void
  onImageCaptured: (dataUrl: string, sha256Hash: string) => void
  title?: string
}

/**
 * Componente modular para captura de fotos de bienes físicos RWA usando la cámara móvil.
 * Calcula inmediatamente el hash SHA-256 criptográfico para certificación on-chain.
 */
export function CameraCaptureModal({
  isOpen,
  onClose,
  onImageCaptured,
  title = 'Capturar Foto Certificada',
}: CameraCaptureModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [hash, setHash] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsProcessing(true)
    triggerHaptic('medium')

    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
        setHash(hashHex)
        setIsProcessing(false)
        triggerHaptic('success')
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Error procesando imagen de la cámara:', err)
      setIsProcessing(false)
      triggerHaptic('error')
    }
  }

  const handleConfirm = () => {
    if (preview && hash) {
      triggerHaptic('success')
      onImageCaptured(preview, hash)
      onClose()
      setPreview(null)
      setHash(null)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4 text-center">
        {/* Input nativo oculto con captura directa de cámara trasera en móviles */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {!preview ? (
          <div className="p-8 border-2 border-dashed border-gold-500/50 rounded-2xl bg-background flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gold-500/20 flex items-center justify-center text-3xl text-gold-500">
              📷
            </div>
            <p className="text-sm text-navy-800/80 font-medium">
              Toma una foto clara del producto para generar su hash inmutable
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-2 px-6 py-3 bg-gold-500 text-navy-800 font-semibold text-sm rounded-xl shadow-md transition-transform active:scale-95 flex items-center gap-2"
            >
              {isProcessing ? 'Procesando Hash...' : 'Abrir Cámara del Teléfono'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden shadow-md max-h-64 mx-auto border border-gold-500/30">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob) de la cámara */}
              <img src={preview} alt="Captura" className="w-full h-full object-cover" />
            </div>

            <div className="p-3 bg-navy-800/5 rounded-xl text-left text-xs space-y-1">
              <p className="font-semibold text-navy-800">Compromiso Criptográfico SHA-256:</p>
              <p className="font-mono text-[11px] text-navy-800/70 break-all">{hash}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPreview(null)
                  setHash(null)
                  fileInputRef.current?.click()
                }}
                className="flex-1 py-3 bg-navy-800/10 text-navy-800 text-xs font-semibold rounded-xl"
              >
                Volver a Tomar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 bg-gold-500 text-navy-800 text-xs font-bold rounded-xl shadow-md"
              >
                Confirmar y Usar
              </button>
            </div>
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
