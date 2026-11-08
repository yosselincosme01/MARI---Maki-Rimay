import { describe, expect, it } from 'vitest'
import { DECISION_INICIAL, decidirSena } from './decision'

type Clase = 'DOLOR' | 'TOS' | 'SI' | 'OTRA'
const inf = (clase: Clase, confianza = 0.9) => ({ clase, confianza })

describe('decidirSena (DEC1)', () => {
  it('propone la seña cuando las 3 últimas coinciden y superan 0,70', () => {
    expect(decidirSena([inf('DOLOR'), inf('DOLOR'), inf('DOLOR')])).toBe('DOLOR')
  })

  it('solo mira las últimas: lo anterior no importa', () => {
    expect(decidirSena([inf('TOS'), inf('OTRA'), inf('SI'), inf('SI'), inf('SI')])).toBe('SI')
  })

  it('con menos inferencias de las necesarias no propone nada', () => {
    expect(decidirSena([inf('DOLOR'), inf('DOLOR')])).toBeNull()
  })

  it('si la clase cambia a mitad, no propone nada', () => {
    expect(decidirSena([inf('DOLOR'), inf('TOS'), inf('DOLOR')])).toBeNull()
  })

  it('el umbral es inclusivo: 0,70 alcanza; 0,69 no', () => {
    expect(decidirSena([inf('TOS', 0.7), inf('TOS', 0.7), inf('TOS', 0.7)])).toBe('TOS')
    expect(decidirSena([inf('TOS', 0.9), inf('TOS', 0.69), inf('TOS', 0.9)])).toBeNull()
  })

  it('nunca propone OTRA, aunque sea segura', () => {
    expect(decidirSena([inf('OTRA', 1), inf('OTRA', 1), inf('OTRA', 1)])).toBeNull()
  })

  it('con el historial vacío no propone nada', () => {
    expect(decidirSena([])).toBeNull()
  })

  it('acepta otros parámetros', () => {
    expect(decidirSena([inf('SI', 0.6)], { umbral: 0.5, seguidas: 1 })).toBe('SI')
    expect(DECISION_INICIAL).toEqual({ umbral: 0.7, seguidas: 3 })
  })
})
