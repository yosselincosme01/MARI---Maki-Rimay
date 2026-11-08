import { describe, expect, it } from 'vitest'
import { asignarManos } from './extractor'

const mano = (x: number) => Array.from({ length: 21 }, () => ({ x, y: 0.5, z: 0, visibility: 1 }))

describe('asignarManos', () => {
  it('"Right" es la mano derecha de la persona (verificado con cámara real)', () => {
    const { manoDerecha, manoIzquierda } = asignarManos([mano(0.3)], ['Right'])
    expect(manoDerecha?.[0]?.x).toBe(0.3)
    expect(manoIzquierda).toBeNull()
  })

  it('separa las dos manos según su etiqueta, sin importar el orden', () => {
    const { manoDerecha, manoIzquierda } = asignarManos([mano(0.7), mano(0.3)], ['Left', 'Right'])
    expect(manoDerecha?.[0]?.x).toBe(0.3)
    expect(manoIzquierda?.[0]?.x).toBe(0.7)
  })

  it('con dos manos de la misma etiqueta se queda con la primera', () => {
    const { manoDerecha, manoIzquierda } = asignarManos([mano(0.1), mano(0.2)], ['Right', 'Right'])
    expect(manoDerecha?.[0]?.x).toBe(0.1)
    expect(manoIzquierda).toBeNull()
  })

  it('ignora una mano sin etiqueta y copia solo x, y, z', () => {
    expect(asignarManos([mano(0.5)], [undefined])).toEqual({
      manoDerecha: null,
      manoIzquierda: null,
    })
    expect(asignarManos([mano(0.5)], ['Left']).manoIzquierda?.[0]).toEqual({ x: 0.5, y: 0.5, z: 0 })
  })
})
