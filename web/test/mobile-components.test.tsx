import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { triggerHaptic, isPwaInstalled, isIOS, isMobile } from '../lib/mobile'
import { BottomSheet } from '../components/BottomSheet'
import { ShareTradeButton } from '../components/ShareTradeButton'

describe('Componentes Modulares y Utilidades Móviles (PWA)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('triggerHaptic invoca navigator.vibrate si está disponible', () => {
    const vibrateMock = vi.fn()
    Object.defineProperty(global.navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    })

    triggerHaptic('success')
    expect(vibrateMock).toHaveBeenCalledWith([40, 60, 40])

    triggerHaptic('light')
    expect(vibrateMock).toHaveBeenCalledWith(25)
  })

  it('Detección de dispositivo móvil y PWA', () => {
    expect(typeof isPwaInstalled()).toBe('boolean')
    expect(typeof isIOS()).toBe('boolean')
    expect(typeof isMobile()).toBe('boolean')
  })

  it('BottomSheet se renderiza correctamente cuando está abierto y responde al cierre', () => {
    const onClose = vi.fn()
    const { rerender } = render(
      <BottomSheet isOpen={false} onClose={onClose} title="Filtros Móviles">
        <p>Contenido del filtro</p>
      </BottomSheet>
    )

    expect(screen.queryByText('Filtros Móviles')).toBeNull()

    rerender(
      <BottomSheet isOpen={true} onClose={onClose} title="Filtros Móviles">
        <p>Contenido del filtro</p>
      </BottomSheet>
    )

    expect(screen.getByText('Filtros Móviles')).toBeDefined()
    expect(screen.getByText('Contenido del filtro')).toBeDefined()

    const closeBtn = screen.getByLabelText('Cerrar')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ShareTradeButton se renderiza y permite compartir', () => {
    render(
      <ShareTradeButton
        title="Trueke de Laptop"
        text="Intercambio seguro en TrueKeate"
        url="http://localhost:3000/items/123"
      />
    )

    const btn = screen.getByLabelText('Compartir trueke')
    expect(btn).toBeDefined()
    expect(screen.getByText('Compartir')).toBeDefined()
  })
})
