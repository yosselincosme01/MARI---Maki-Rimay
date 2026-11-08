/** Tipos compartidos por los puertos (contrato §5.1). */

export type ClaseSena = 'DOLOR' | 'TOS' | 'FIEBRE' | 'FALTA_DE_AIRE' | 'SI' | 'NO' | 'OTRA'

/** Una inferencia del modelo sobre una ventana de 30 fotogramas. */
export interface Inferencia {
  clase: ClaseSena
  /** 0..1, la más alta del softmax. */
  confianza: number
  /** Marca de tiempo de la ventana. */
  tiempoMs: number
}

/** Una seña ya decidida dentro de una grabación (mensaje libre). Nunca es OTRA. */
export interface Deteccion {
  clase: Exclude<ClaseSena, 'OTRA'>
  inicioMs: number
  finMs: number
  /** Promedio de las inferencias que la sostienen. */
  confianza: number
}

export type EstadoCamara =
  | 'inactiva'
  | 'esperando-permiso'
  | 'denegada'
  | 'sin-camara'
  | 'ocupada'
  | 'cargando-modelo'
  | 'lista'
  | 'error'
