import type { z } from 'zod'
import type { esquemaBanco } from './esquema'

export type Banco = z.infer<typeof esquemaBanco>
export type Pregunta = Banco['preguntas'][number]
export type Opcion = Pregunta['opciones'][number]
export type Regla = NonNullable<Pregunta['siguiente']>[number]

/** Cómo respondió la persona. */
export type Origen = 'sena' | 'tactil' | 'cuerpo' | 'mensaje-libre'

/** Respuesta que la persona aún no confirmó con ✓. Nunca llega al profesional. */
export interface RespuestaProvisional {
  preguntaId: string
  valor: string | string[]
  origen: Origen
  /** Solo si origen = 'sena'. */
  confianza?: number
}

export interface Respuesta extends RespuestaProvisional {
  id: string
  /** Nunca existe una Respuesta sin confirmar. */
  confirmada: true
  /** ISO 8601. */
  hora: string
  /** P1–P5: número de síntoma (1, 2, 3…). */
  ciclo?: number
  /** P2–P5: síntoma del ciclo, p. ej. "FIEBRE". */
  sintoma?: string
  /** Si vino de una repregunta; el profesional puede asociarla a un síntoma. */
  repregunta?: { sintoma?: string }
}
