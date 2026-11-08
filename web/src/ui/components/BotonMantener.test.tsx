import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BotonMantener } from './BotonMantener'

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function mostrar() {
  const alCompletar = vi.fn()
  render(<BotonMantener alCompletar={alCompletar}>Profesional</BotonMantener>)
  return { alCompletar, boton: screen.getByRole('button', { name: /profesional/i }) }
}

describe('BotonMantener (PRO3)', () => {
  it('se activa al mantenerlo pulsado 2 segundos', () => {
    const { alCompletar, boton } = mostrar()
    fireEvent.pointerDown(boton)
    act(() => vi.advanceTimersByTime(1999))
    expect(alCompletar).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(1))
    expect(alCompletar).toHaveBeenCalledOnce()
  })

  it('un toque corto no hace nada', () => {
    const { alCompletar, boton } = mostrar()
    fireEvent.pointerDown(boton)
    act(() => vi.advanceTimersByTime(500))
    fireEvent.pointerUp(boton)
    act(() => vi.advanceTimersByTime(5000))
    expect(alCompletar).not.toHaveBeenCalled()
  })

  it('un clic normal (sin mantener) no lo activa', () => {
    const { alCompletar, boton } = mostrar()
    fireEvent.click(boton)
    act(() => vi.advanceTimersByTime(5000))
    expect(alCompletar).not.toHaveBeenCalled()
  })

  it('se cancela si el dedo sale del botón', () => {
    const { alCompletar, boton } = mostrar()
    fireEvent.pointerDown(boton)
    fireEvent.pointerLeave(boton)
    act(() => vi.advanceTimersByTime(3000))
    expect(alCompletar).not.toHaveBeenCalled()
  })

  it('funciona con el teclado manteniendo Enter, sin repetir', () => {
    const { alCompletar, boton } = mostrar()
    fireEvent.keyDown(boton, { key: 'Enter' })
    fireEvent.keyDown(boton, { key: 'Enter', repeat: true })
    act(() => vi.advanceTimersByTime(2000))
    expect(alCompletar).toHaveBeenCalledOnce()
  })

  it('explica cómo usarlo a los lectores de pantalla', () => {
    const { boton } = mostrar()
    expect(boton).toHaveAccessibleDescription('Mantén pulsado 2 segundos')
  })
})
