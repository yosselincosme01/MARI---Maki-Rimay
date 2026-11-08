/**
 * Regla de decisión de señas (contrato §5.3, módulo DEC).
 *
 * Propone una seña solo si las últimas `seguidas` inferencias son la MISMA clase y todas
 * superan el umbral. Así un parpadeo del modelo no se convierte en una respuesta.
 *
 * Nunca confirma: solo propone. La persona confirma con ✓.
 * La usan el reconocimiento en vivo (SEN) y el mensaje libre (LIB).
 *
 * Es genérica en la clase para no depender de la capa de aplicación: acepta cualquier
 * `{ clase, confianza }`, como las `Inferencia` del puerto `Reconocedor`.
 */

export interface ParametrosDecision {
  /** Confianza mínima, de 0 a 1. Inicial: 0,70. */
  umbral: number
  /** Cuántas inferencias seguidas deben coincidir. Inicial: 3. */
  seguidas: number
}

export const DECISION_INICIAL: ParametrosDecision = { umbral: 0.7, seguidas: 3 }

/** La clase "otra" nunca se propone: significa "no es una seña del vocabulario". */
const OTRA = 'OTRA'

export function decidirSena<C extends string>(
  historial: readonly { clase: C; confianza: number }[],
  { umbral, seguidas }: ParametrosDecision = DECISION_INICIAL,
): Exclude<C, 'OTRA'> | null {
  const necesarias = Math.max(1, Math.floor(seguidas))
  if (historial.length < necesarias) return null

  const ultimas = historial.slice(-necesarias)
  const clase = ultimas[0]!.clase
  const todasIguales = ultimas.every((i) => i.clase === clase)
  const todasSeguras = ultimas.every((i) => i.confianza >= umbral)

  if (!todasIguales || !todasSeguras || clase === OTRA) return null
  return clase as Exclude<C, 'OTRA'>
}
