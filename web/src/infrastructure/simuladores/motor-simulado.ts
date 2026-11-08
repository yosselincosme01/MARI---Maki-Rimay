/**
 * Motor del flujo SIMULADO. Sirve para usar las vistas antes de que exista FLU.
 *
 * Recorre un camino recto: P0 → P1 → P3 → P4 → P5 → P7 → P8 → P11 → fin.
 * - P0 = SÍ → alerta.
 * - P1 abre el ciclo 1 y su valor es el síntoma del ciclo.
 * - P11 = SÍ → interpretación.
 *
 * NO implementa P2, varios síntomas (P6), P9 ni el banco JSON: eso es el motor real (FLU).
 */
import type { MotorFlujo, Paso } from '@/domain/flujo/motor'

const CAMINO = ['P0', 'P1', 'P3', 'P4', 'P5', 'P7', 'P8', 'P11'] as const
const DEL_CICLO = new Set(['P1', 'P3', 'P4', 'P5'])

export function crearMotorSimulado(): MotorFlujo {
  return {
    inicio: () => ({ tipo: 'pregunta', preguntaId: 'P0', ciclo: null }),

    siguiente(actual, respuesta): Paso {
      if (actual.tipo !== 'pregunta') return { tipo: 'fin' }
      const id = actual.preguntaId

      if (id === 'P0' && respuesta.valor === 'SI') return { tipo: 'alerta' }
      if (id === 'P11' && respuesta.valor === 'SI') return { tipo: 'interpretacion' }

      const indice = CAMINO.indexOf(id as (typeof CAMINO)[number])
      const proxima = CAMINO[indice + 1]
      if (indice === -1 || proxima === undefined) return { tipo: 'fin' }

      if (!DEL_CICLO.has(proxima)) return { tipo: 'pregunta', preguntaId: proxima, ciclo: null }
      if (proxima === 'P1') return { tipo: 'pregunta', preguntaId: 'P1', ciclo: { numero: 1 } }

      // P3–P5: siguen en el ciclo; si venimos de P1, su respuesta define el síntoma.
      const sintoma = id === 'P1' ? String(respuesta.valor) : actual.ciclo?.sintoma
      return {
        tipo: 'pregunta',
        preguntaId: proxima,
        ciclo: sintoma === undefined ? { numero: 1 } : { numero: 1, sintoma },
      }
    },
  }
}
