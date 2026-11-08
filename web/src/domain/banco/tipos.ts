/**
 * Tipos del banco de preguntas y de las respuestas (contrato §5.2).
 * Dueña de la carpeta: Yosselin (BAN). Los tipos del banco salen del esquema Zod (`esquema.ts`).
 */
import type { z } from 'zod'
import type { esquemaBanco } from './esquema'

export type Banco = z.infer<typeof esquemaBanco>
export type Pregunta = Banco['preguntas'][number]
export type Opcion = Pregunta['opciones'][number]
export type Regla = NonNullable<Pregunta['siguiente']>[number]

/** Por dónde llegó la respuesta. */
export type Origen = 'sena' | 'tactil' | 'cuerpo' | 'mensaje-libre'

/** Respuesta que la persona aún no confirmó. Nunca llega al profesional. */
export interface RespuestaProvisional {
  preguntaId: string
  /** Un valor cerrado del banco (p. ej. "DOLOR") o varios si la pregunta es múltiple. */
  valor: string | string[]
  origen: Origen
  /** Solo si origen = 'sena'. */
  confianza?: number
}

/** Respuesta confirmada con ✓. No existe una Respuesta sin confirmar. */
export interface Respuesta extends RespuestaProvisional {
  id: string
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
