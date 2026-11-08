/**
 * De un toque en el cuerpo 3D a una zona del banco (P2).
 *
 * El modelo `human-body.glb` tiene esqueleto: cada vértice pertenece sobre todo a un hueso.
 * - Brazos, piernas, cabeza y cuello se deciden por el hueso (preciso y sin adivinar).
 * - El tronco se decide por la altura del punto y por si el toque es de frente o de espalda.
 *
 * Las alturas son del modelo (en metros, mide 1,79 m de pie). La zona es aproximada:
 * la persona la confirma con ✓ y puede corregirla con la lista.
 */

export type ZonaCuerpo =
  | 'CABEZA'
  | 'GARGANTA'
  | 'PECHO'
  | 'ABDOMEN_SUPERIOR'
  | 'ABDOMEN_INFERIOR'
  | 'ESPALDA'
  | 'BRAZOS'
  | 'PIERNAS'

export interface Toque {
  /**
   * Hueso con más peso en el punto tocado. Acepta el nombre del archivo ("upperarm01.L")
   * o el que deja three.js al cargarlo, sin puntos ("upperarm01L").
   */
  hueso: string
  /** Altura del punto en coordenadas del modelo. */
  y: number
  /** La cara tocada mira hacia atrás (el modelo mira hacia +z). */
  haciaAtras: boolean
}

/** Límites de altura del tronco, en metros del modelo. */
export const ALTURAS = {
  /** Desde aquí hacia arriba, el frente del tronco es pecho (debajo de la clavícula). */
  pecho: 1.24,
  /** Entre esto y el pecho, abdomen superior; por debajo (desde el ombligo), inferior. */
  abdomenSuperior: 1.08,
} as const

const BRAZO = /^(shoulder|upperarm|lowerarm|wrist|metacarpal|finger)/
const PIERNA = /^(upperleg|lowerleg|foot|toe)/
const CUELLO = /^neck/
const TRONCO = /^(spine|breast|pelvis|clavicle|root)/

export function zonaDelToque({ hueso, y, haciaAtras }: Toque): ZonaCuerpo {
  if (BRAZO.test(hueso)) return 'BRAZOS'
  if (PIERNA.test(hueso)) return 'PIERNAS'
  if (CUELLO.test(hueso)) return haciaAtras ? 'ESPALDA' : 'GARGANTA'
  if (TRONCO.test(hueso)) {
    if (haciaAtras) return 'ESPALDA'
    if (y >= ALTURAS.pecho) return 'PECHO'
    if (y >= ALTURAS.abdomenSuperior) return 'ABDOMEN_SUPERIOR'
    return 'ABDOMEN_INFERIOR'
  }
  // head, jaw y los músculos de la cara (oculi, orbicularis, oris, levator…).
  return 'CABEZA'
}
