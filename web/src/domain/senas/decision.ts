/**
 * Regla de decisión de señas (DEC, contrato §5.3).
 *
 * Función pura que usan la vista paciente (SEN) y el mensaje libre (LIB). **Nunca confirma**:
 * solo propone una clase; la persona la confirma con ✓. Si devuelve null, la vista ofrece las
 * opciones táctiles.
 */
import type { ClaseSena, Inferencia } from './tipos'

export interface ParametrosDecision {
  /** Confianza mínima de cada inferencia, de 0 a 1. Se acepta si es igual al umbral. */
  umbral: number
  /** Cuántas inferencias seguidas deben coincidir (las más recientes). */
  seguidas: number
}

/** Valores iniciales del plan, a ajustar con el reporte del modelo (M5). */
export const PARAMETROS_INICIALES: ParametrosDecision = { umbral: 0.7, seguidas: 3 }

/**
 * Propone una clase si las últimas `seguidas` inferencias son de la misma clase y cada una
 * alcanza el umbral. Devuelve null en otro caso, o si esa clase es OTRA.
 *
 * @param historial Inferencias en orden de llegada (la más reciente al final).
 */
export function decidirSena(
  historial: readonly Inferencia[],
  parametros: ParametrosDecision,
): Exclude<ClaseSena, 'OTRA'> | null {
  const { umbral, seguidas } = parametros
  if (!Number.isInteger(seguidas) || seguidas < 1) {
    throw new RangeError(`"seguidas" debe ser un entero mayor que 0 (es ${seguidas}).`)
  }
  if (!(umbral >= 0 && umbral <= 1)) {
    throw new RangeError(`"umbral" debe estar entre 0 y 1 (es ${umbral}).`)
  }
  if (historial.length < seguidas) return null

  const ultimas = historial.slice(-seguidas)
  const clase = ultimas[0]!.clase
  const coinciden = ultimas.every((i) => i.clase === clase && i.confianza >= umbral)
  if (!coinciden || clase === 'OTRA') return null
  return clase
}
