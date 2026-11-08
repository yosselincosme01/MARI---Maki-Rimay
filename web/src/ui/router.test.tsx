import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Inicio } from '@/ui/pages/Inicio'
import { crearRutas } from '@/ui/router'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Inicio', () => {
  it('muestra el logo y las dos entradas', () => {
    const router = createMemoryRouter([{ path: '/', element: <Inicio /> }])
    render(<RouterProvider router={router} />)
    expect(screen.getByAltText(/MARI/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /empezar/i })).toHaveAttribute('href', '/paciente')
    expect(screen.getByRole('button', { name: /profesional/i })).toBeInTheDocument()
  })

  it('a la vista profesional se entra manteniendo pulsado (PRO3)', () => {
    vi.useFakeTimers()
    const router = createMemoryRouter([
      { path: '/', element: <Inicio /> },
      { path: '/profesional', element: <p>Vista profesional</p> },
    ])
    render(<RouterProvider router={router} />)
    const boton = screen.getByRole('button', { name: /profesional/i })

    fireEvent.click(boton) // un toque normal no basta
    expect(router.state.location.pathname).toBe('/')

    fireEvent.pointerDown(boton)
    act(() => vi.advanceTimersByTime(2000))
    expect(router.state.location.pathname).toBe('/profesional')
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
