import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Landing } from '@/ui/pages/Landing'

describe('Landing', () => {
  it('tiene un solo h1 y lleva a la demo', () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <Landing /> }])} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const enlaces = screen.getAllByRole('link', { name: /probar/i })
    expect(enlaces.length).toBeGreaterThan(0)
    enlaces.forEach((enlace) => expect(enlace).toHaveAttribute('href', '/app'))
  })
})
