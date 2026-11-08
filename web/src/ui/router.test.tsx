import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Inicio } from '@/ui/pages/Inicio'

describe('Inicio', () => {
  it('muestra el logo y las dos entradas', () => {
    const router = createMemoryRouter([{ path: '/', element: <Inicio /> }])
    render(<RouterProvider router={router} />)
    expect(screen.getByAltText(/MARI/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /empezar/i })).toHaveAttribute('href', '/paciente')
    expect(screen.getByRole('link', { name: /profesional/i })).toHaveAttribute(
      'href',
      '/profesional',
    )
  })
})
