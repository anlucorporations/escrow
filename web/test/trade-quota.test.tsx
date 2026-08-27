import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { TradeQuotaBanner } from '../components/TradeQuotaBanner'

describe('TradeQuotaBanner Component', () => {
  it('renders trade quota without crashing', () => {
    render(<TradeQuotaBanner />)
    expect(screen.getByText(/Capacidad de Truekes/i)).toBeDefined()
  })
})
