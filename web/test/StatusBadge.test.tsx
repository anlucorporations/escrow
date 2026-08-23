import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from '@/components/StatusBadge'
import { OperationStatus } from '@/lib/escrow'

describe('StatusBadge', () => {
  it('muestra "Activa" para operaciones activas', () => {
    render(<StatusBadge status={OperationStatus.Active} />)
    expect(screen.getByText('Activa')).toBeInTheDocument()
  })

  it('muestra "Completada" para operaciones completadas', () => {
    render(<StatusBadge status={OperationStatus.Completed} />)
    expect(screen.getByText('Completada')).toBeInTheDocument()
  })

  it('muestra "Cancelada" para operaciones canceladas', () => {
    render(<StatusBadge status={OperationStatus.Cancelled} />)
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
  })

  it('muestra "En disputa" para operaciones en disputa', () => {
    render(<StatusBadge status={OperationStatus.Disputed} />)
    expect(screen.getByText('En disputa')).toBeInTheDocument()
  })

  it('muestra "Vencida" en lugar de "Activa" cuando expiró', () => {
    render(<StatusBadge status={OperationStatus.Active} expired />)
    expect(screen.getByText('Vencida')).toBeInTheDocument()
    expect(screen.queryByText('Activa')).not.toBeInTheDocument()
  })
})
