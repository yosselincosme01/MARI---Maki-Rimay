/**
 * Normalización de puntos para el modelo de señas (contrato §5.3, versión v1).
 *
 * El MISMO código se usa en /recolector (para entrenar) y en el reconocedor (en la app).
 * Cualquier cambio aquí cambia la entrada del modelo: se crea una versión nueva (v2)
 * y se avisa a la otra programadora.
 *
 * Es TypeScript puro: no conoce MediaPipe ni el navegador. El extractor
 * (infrastructure/senas) traduce el resultado de MediaPipe a `FotogramaCrudo`.
 */

export const VERSION_ENTRADA = 'v1'

/** Fotogramas por muestra que recibe el modelo. */
export const FOTOGRAMAS_POR_MUESTRA = 30

/** Puntos de la pose que se usan, con el índice de MediaPipe Pose (33 puntos). */
export const PUNTOS_POSE = [
  { indice: 0, nombre: 'nariz' },
  { indice: 11, nombre: 'hombro izquierdo' },
  { indice: 12, nombre: 'hombro derecho' },
  { indice: 13, nombre: 'codo izquierdo' },
  { indice: 14, nombre: 'codo derecho' },
  { indice: 15, nombre: 'muñeca izquierda' },
  { indice: 16, nombre: 'muñeca derecha' },
] as const

const HOMBRO_IZQUIERDO = 11
const HOMBRO_DERECHO = 12
const PUNTOS_MANO = 21

/**
 * Disposición del vector de un fotograma (F = 142):
 *   [  0 – 62 ]  mano derecha: 21 puntos × (x, y, z)
 *   [ 63 – 125]  mano izquierda: 21 puntos × (x, y, z)
 *   [126]        1 si se detectó la mano derecha, si no 0
 *   [127]        1 si se detectó la mano izquierda, si no 0
 *   [128 – 141]  pose: 7 puntos de PUNTOS_POSE × (x, y)
 */
export const DIMENSION_FOTOGRAMA = PUNTOS_MANO * 3 * 2 + 2 + PUNTOS_POSE.length * 2

/** Un punto en coordenadas de MediaPipe: x e y de 0 a 1 respecto a la imagen. */
export interface Punto {
  x: number
  y: number
  z: number
}

/** Lo que el extractor entrega por cada fotograma de la cámara. */
export interface FotogramaCrudo {
  /** Ancho / alto de la imagen, para no deformar las distancias. */
  aspecto: number
  /** 21 puntos por mano, o null si no se detectó. */
  manoDerecha: readonly Punto[] | null
  manoIzquierda: readonly Punto[] | null
  /** 33 puntos de pose, o null si no se detectó el cuerpo. */
  pose: readonly Punto[] | null
}

/** Si los hombros están casi en el mismo punto, la escala no es confiable. */
const ESCALA_MINIMA = 1e-3

/**
 * Convierte un fotograma crudo en el vector de F números que entra al modelo.
 * Devuelve null si no se ven los dos hombros: sin ellos no hay origen ni escala.
 */
export function normalizarFotograma(fotograma: FotogramaCrudo): number[] | null {
  const { aspecto, pose } = fotograma
  const hombroIzq = pose?.[HOMBRO_IZQUIERDO]
  const hombroDer = pose?.[HOMBRO_DERECHO]
  if (!pose || !hombroIzq || !hombroDer) return null

  // x se multiplica por el aspecto para que una unidad mida lo mismo en ambos ejes.
  const origenX = ((hombroIzq.x + hombroDer.x) / 2) * aspecto
  const origenY = (hombroIzq.y + hombroDer.y) / 2
  const escala = Math.hypot((hombroIzq.x - hombroDer.x) * aspecto, hombroIzq.y - hombroDer.y)
  if (escala < ESCALA_MINIMA) return null

  const x = (p: Punto) => (p.x * aspecto - origenX) / escala
  const y = (p: Punto) => (p.y - origenY) / escala

  const mano = (puntos: readonly Punto[] | null): number[] =>
    puntos && puntos.length === PUNTOS_MANO
      ? puntos.flatMap((p) => [x(p), y(p), p.z / escala])
      : new Array<number>(PUNTOS_MANO * 3).fill(0)

  const presente = (puntos: readonly Punto[] | null) =>
    puntos && puntos.length === PUNTOS_MANO ? 1 : 0

  const vector = [
    ...mano(fotograma.manoDerecha),
    ...mano(fotograma.manoIzquierda),
    presente(fotograma.manoDerecha),
    presente(fotograma.manoIzquierda),
  ]
  for (const { indice } of PUNTOS_POSE) {
    const p = pose[indice]
    vector.push(p ? x(p) : 0, p ? y(p) : 0)
  }
  return vector
}

/** Un fotograma ya normalizado, con su marca de tiempo. */
export interface FotogramaNormalizado {
  tiempoMs: number
  vector: number[]
}

/**
 * Convierte una grabación de cualquier duración y velocidad en exactamente `n` fotogramas,
 * repartidos de forma pareja en el tiempo. Toma el fotograma más cercano (no promedia),
 * para no mezclar una mano presente con una ausente.
 *
 * Devuelve null si hay menos de `minimo` fotogramas válidos: la muestra se descarta.
 */
export function remuestrear(
  fotogramas: readonly FotogramaNormalizado[],
  n: number = FOTOGRAMAS_POR_MUESTRA,
  minimo: number = Math.ceil(FOTOGRAMAS_POR_MUESTRA / 2),
): number[][] | null {
  if (fotogramas.length < minimo || fotogramas.length === 0) return null
  const ordenados = [...fotogramas].sort((a, b) => a.tiempoMs - b.tiempoMs)
  const inicio = ordenados[0]!.tiempoMs
  const fin = ordenados[ordenados.length - 1]!.tiempoMs
  const paso = n > 1 ? (fin - inicio) / (n - 1) : 0

  const resultado: number[][] = []
  let j = 0
  for (let i = 0; i < n; i++) {
    const objetivo = inicio + i * paso
    // Avanza mientras el siguiente fotograma esté más cerca del tiempo objetivo.
    while (
      j + 1 < ordenados.length &&
      Math.abs(ordenados[j + 1]!.tiempoMs - objetivo) <= Math.abs(ordenados[j]!.tiempoMs - objetivo)
    ) {
      j++
    }
    resultado.push([...ordenados[j]!.vector])
  }
  return resultado
}
