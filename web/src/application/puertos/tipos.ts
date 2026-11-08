/** Tipos compartidos por los puertos (contrato §5.1). */
import type { ClaseSena } from '@/domain/senas/tipos'

/** Definidos en el dominio porque los usa `decidirSena` (§5.3), que no puede depender de aquí. */
export type { ClaseSena, Inferencia } from '@/domain/senas/tipos'

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
