/**
 * Interfaz del motor del flujo (contrato §5.6).
 * Yosselin la implementa (FLU); la consulta (CNS) la consume.
 * Aquí solo está el "enchufe": cómo se le pregunta al motor qué viene después.
 */
import type { Respuesta } from '@/domain/banco/tipos'

/** Lo que el profesional configura al iniciar la consulta. */
export interface ConfigConsulta {
  /** Activa P9 (embarazo) mediante `mostrarSi` en el banco. */
  preguntarEmbarazo: boolean
}

/** Síntoma que se está describiendo (P1 abre un ciclo; P2–P5 pertenecen a él). */
export interface Ciclo {
  numero: number
  sintoma?: string
}

/** Lo que el motor decide que viene a continuación. */
export type Paso =
  | { tipo: 'pregunta'; preguntaId: string; ciclo: Ciclo | null }
  | { tipo: 'alerta' } // P0 = SÍ: "Avisa al personal ahora"
  | { tipo: 'interpretacion' } // P11 = SÍ: orientar a solicitar interpretación
  | { tipo: 'fin' } // terminó el flujo: entregar la tablet al profesional

export interface MotorFlujo {
  /** Primer paso de una consulta nueva. */
  inicio(config: ConfigConsulta): Paso
  /** Paso siguiente, a partir del actual y de la respuesta recién confirmada. */
  siguiente(actual: Paso, respuesta: Respuesta, config: ConfigConsulta): Paso
}
