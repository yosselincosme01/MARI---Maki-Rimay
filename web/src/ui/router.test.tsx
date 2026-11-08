import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Inicio } from '@/ui/pages/Inicio'
import { crearRutas } from '@/ui/router'

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

describe('ruta /recolector (M3)', () => {
  const tieneRecolector = (recolector: boolean) =>
    crearRutas({ recolector }).some((ruta) => ruta.path === '/recolector')

  it('no existe sin VITE_RECOLECTOR=true', () => {
    expect(tieneRecolector(false)).toBe(false)
    expect(import.meta.env.VITE_RECOLECTOR).not.toBe('true') // los tests corren sin la variable
  })

  it('existe solo cuando se activa', () => {
    expect(tieneRecolector(true)).toBe(true)
  })
})
