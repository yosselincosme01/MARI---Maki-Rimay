import { describe, expect, it } from 'vitest'
import { decidirSena, PARAMETROS_INICIALES } from './decision'
import type { ClaseSena, Inferencia } from './tipos'

/** Crea inferencias seguidas: inf(['TOS', 0.9], ['TOS', 0.8]). */
function inf(...pares: [ClaseSena, number][]): Inferencia[] {
  return pares.map(([clase, confianza], i) => ({ clase, confianza, tiempoMs: i * 100 }))
}

const P = PARAMETROS_INICIALES // umbral 0.70, 3 seguidas

describe('decidirSena', () => {
  it('usa los valores iniciales del plan: umbral 0,70 y 3 seguidas', () => {
    expect(PARAMETROS_INICIALES).toEqual({ umbral: 0.7, seguidas: 3 })
  })

  it('propone la clase si las 3 últimas coinciden y superan el umbral', () => {
    expect(decidirSena(inf(['TOS', 0.9], ['TOS', 0.85], ['TOS', 0.8]), P)).toBe('TOS')
  })

  it('acepta una confianza exactamente igual al umbral', () => {
    expect(decidirSena(inf(['SI', 0.7], ['SI', 0.7], ['SI', 0.7]), P)).toBe('SI')
  })

  it('rechaza si una sola inferencia queda por debajo del umbral', () => {
    expect(decidirSena(inf(['SI', 0.9], ['SI', 0.69], ['SI', 0.9]), P)).toBeNull()
  })

  it('devuelve null con el historial vacío', () => {
    expect(decidirSena([], P)).toBeNull()
  })

  it('devuelve null con menos inferencias de las necesarias', () => {
    expect(decidirSena(inf(['DOLOR', 0.99], ['DOLOR', 0.99]), P)).toBeNull()
  })

  it('devuelve null si la clase cambia a mitad', () => {
    expect(decidirSena(inf(['DOLOR', 0.9], ['FIEBRE', 0.9], ['DOLOR', 0.9]), P)).toBeNull()
  })

  it('solo mira las más recientes: un cambio antiguo no importa', () => {
    const historial = inf(['NO', 0.95], ['FIEBRE', 0.9], ['FIEBRE', 0.9], ['FIEBRE', 0.9])
    expect(decidirSena(historial, P)).toBe('FIEBRE')
  })

  it('un cambio reciente anula una racha anterior', () => {
    const historial = inf(['FIEBRE', 0.9], ['FIEBRE', 0.9], ['FIEBRE', 0.9], ['TOS', 0.9])
    expect(decidirSena(historial, P)).toBeNull()
  })

  it('nunca propone OTRA, aunque coincida con alta confianza', () => {
    expect(decidirSena(inf(['OTRA', 0.99], ['OTRA', 0.99], ['OTRA', 0.99]), P)).toBeNull()
  })

  it('respeta otros parámetros', () => {
    const historial = inf(['FALTA_DE_AIRE', 0.6])
    expect(decidirSena(historial, { umbral: 0.5, seguidas: 1 })).toBe('FALTA_DE_AIRE')
    expect(decidirSena(historial, { umbral: 0.65, seguidas: 1 })).toBeNull()
  })

  it('rechaza parámetros imposibles', () => {
    expect(() => decidirSena([], { umbral: 0.7, seguidas: 0 })).toThrow(RangeError)
    expect(() => decidirSena([], { umbral: 0.7, seguidas: 2.5 })).toThrow(RangeError)
    expect(() => decidirSena([], { umbral: 1.2, seguidas: 3 })).toThrow(RangeError)
    expect(() => decidirSena([], { umbral: Number.NaN, seguidas: 3 })).toThrow(RangeError)
  })
})
