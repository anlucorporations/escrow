import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { ReputationBadge } from '../components/ReputationBadge'

describe('ReputationBadge Component', () => {
  it('renders badge without crashing', () => {
    render(<ReputationBadge showDetails />)
    expect(screen.getByText(/Rango/i)).toBeDefined()
  })
})
