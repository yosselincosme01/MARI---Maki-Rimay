import { describe, expect, it } from 'vitest'
import {
  DIMENSION_FOTOGRAMA,
  FOTOGRAMAS_POR_MUESTRA,
  normalizarFotograma,
  remuestrear,
  type FotogramaCrudo,
  type Punto,
} from './normalizar'

/** Índices dentro del vector (ver la disposición en normalizar.ts). */
const PRESENCIA_DERECHA = 126
const PRESENCIA_IZQUIERDA = 127
const POSE = 128 // nariz (x, y), hombro izq (x, y), hombro der (x, y)…

const p = (x: number, y: number, z = 0): Punto => ({ x, y, z })

/** Pose de 33 puntos con hombros en (0.4, 0.5) y (0.6, 0.5) y nariz arriba al centro. */
function poseBase(): Punto[] {
  const pose = Array.from({ length: 33 }, () => p(0.5, 0.5))
  pose[0] = p(0.5, 0.3)
  pose[11] = p(0.6, 0.5) // hombro izquierdo de la persona (a la derecha en la imagen)
  pose[12] = p(0.4, 0.5)
  return pose
}

/** Mano de 21 puntos, todos en la misma posición (basta para probar la normalización). */
const mano = (x: number, y: number, z = 0): Punto[] => Array.from({ length: 21 }, () => p(x, y, z))

function fotograma(cambios: Partial<FotogramaCrudo> = {}): FotogramaCrudo {
  return { aspecto: 1, manoDerecha: null, manoIzquierda: null, pose: poseBase(), ...cambios }
}

/** Aplica la misma traslación y escala a todos los puntos: la persona se mueve o se acerca. */
function mover(f: FotogramaCrudo, dx: number, dy: number, factor: number): FotogramaCrudo {
  const t = (q: Punto) =>
    p(0.5 + (q.x - 0.5) * factor + dx, 0.5 + (q.y - 0.5) * factor + dy, q.z * factor)
  return {
    ...f,
    pose: f.pose?.map(t) ?? null,
    manoDerecha: f.manoDerecha?.map(t) ?? null,
    manoIzquierda: f.manoIzquierda?.map(t) ?? null,
  }
}

describe('normalizarFotograma', () => {
  it(`produce un vector de ${DIMENSION_FOTOGRAMA} números`, () => {
    expect(DIMENSION_FOTOGRAMA).toBe(142)
    expect(normalizarFotograma(fotograma())).toHaveLength(142)
  })

  it('pone el origen entre los hombros y usa su distancia como unidad', () => {
    const v = normalizarFotograma(fotograma())!
    // hombro izquierdo y derecho quedan a media unidad del centro, a la misma altura
    expect(v.slice(POSE + 2, POSE + 6)).toEqual([0.5, 0, -0.5, 0])
    // la nariz queda centrada, una unidad arriba (0.2 / 0.2)
    expect(v[POSE]).toBeCloseTo(0)
    expect(v[POSE + 1]).toBeCloseTo(-1)
  })

  it('da el mismo resultado si la persona se mueve en la imagen o se acerca a la cámara', () => {
    const base = fotograma({ manoDerecha: mano(0.45, 0.4, 0.02) })
    const original = normalizarFotograma(base)!
    for (const [dx, dy, factor] of [
      [0.1, -0.05, 1],
      [0, 0, 1.6],
      [-0.08, 0.1, 0.7],
    ] as const) {
      const movido = normalizarFotograma(mover(base, dx, dy, factor))!
      movido.forEach((valor, i) => expect(valor).toBeCloseTo(original[i]!, 6))
    }
  })

  it('corrige el aspecto de la imagen para no deformar las distancias', () => {
    // En 16:9 la misma persona ocupa menos "x" normalizada: hombros a 0.45 y 0.55.
    const pose = poseBase()
    pose[11] = p(0.5 + 0.1 * (9 / 16), 0.5)
    pose[12] = p(0.5 - 0.1 * (9 / 16), 0.5)
    pose[0] = p(0.5, 0.3)
    const ancho = normalizarFotograma(fotograma({ aspecto: 16 / 9, pose }))!
    const cuadrado = normalizarFotograma(fotograma())!
    // La nariz sigue a la misma distancia relativa de los hombros.
    expect(ancho[POSE + 1]).toBeCloseTo(cuadrado[POSE + 1]!)
  })

  it('una mano ausente son ceros con su indicador en 0', () => {
    const v = normalizarFotograma(fotograma({ manoIzquierda: mano(0.55, 0.45) }))!
    expect(v.slice(0, 63).every((x) => x === 0)).toBe(true) // derecha ausente
    expect(v[PRESENCIA_DERECHA]).toBe(0)
    expect(v[PRESENCIA_IZQUIERDA]).toBe(1)
    expect(v.slice(63, 126).some((x) => x !== 0)).toBe(true)
  })

  it('una mano con puntos incompletos se trata como ausente', () => {
    const v = normalizarFotograma(fotograma({ manoDerecha: mano(0.4, 0.4).slice(0, 10) }))!
    expect(v[PRESENCIA_DERECHA]).toBe(0)
  })

  it('sin pose o sin hombros no se puede normalizar', () => {
    expect(normalizarFotograma(fotograma({ pose: null }))).toBeNull()
    expect(normalizarFotograma(fotograma({ pose: poseBase().slice(0, 11) }))).toBeNull()
  })

  it('si los hombros están en el mismo punto, descarta el fotograma', () => {
    const pose = poseBase()
    pose[11] = p(0.5, 0.5)
    pose[12] = p(0.5, 0.5)
    expect(normalizarFotograma(fotograma({ pose }))).toBeNull()
  })
})

describe('remuestrear', () => {
  /** Fotogramas cuyo vector es [su número], para ver cuál se eligió. */
  const grabacion = (tiempos: number[]) => tiempos.map((tiempoMs, i) => ({ tiempoMs, vector: [i] }))

  it(`siempre devuelve ${FOTOGRAMAS_POR_MUESTRA} fotogramas, sin importar cuántos haya`, () => {
    for (const cantidad of [15, 30, 47, 120]) {
      const r = remuestrear(grabacion(Array.from({ length: cantidad }, (_, i) => i * 33)))
      expect(r).toHaveLength(30)
    }
  })

  it('conserva el primero y el último, y reparte el resto de forma pareja', () => {
    const r = remuestrear(grabacion([0, 100, 200, 300, 400]), 3, 2)!
    expect(r.map((v) => v[0])).toEqual([0, 2, 4])
  })

  it('elige el fotograma más cercano cuando la cámara tiene saltos', () => {
    const r = remuestrear(grabacion([0, 10, 20, 390, 400]), 3, 2)!
    expect(r.map((v) => v[0])).toEqual([0, 2, 4]) // 200 ms está más cerca de 20 que de 390
  })

  it('ordena por tiempo aunque los fotogramas lleguen desordenados', () => {
    const r = remuestrear([...grabacion([0, 100, 200])].reverse(), 3, 2)!
    expect(r.map((v) => v[0])).toEqual([0, 1, 2])
  })

  it('descarta la muestra si hay muy pocos fotogramas válidos', () => {
    expect(remuestrear(grabacion(Array.from({ length: 14 }, (_, i) => i * 33)))).toBeNull()
    expect(remuestrear([])).toBeNull()
  })

  it('devuelve copias: modificar el resultado no altera la grabación', () => {
    const original = grabacion([0, 100])
    const r = remuestrear(original, 2, 2)!
    r[0]![0] = 99
    expect(original[0]!.vector[0]).toBe(0)
  })
})
