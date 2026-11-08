/**
 * Tipos de las respuestas (contrato §5.2).
 * Dueña de la carpeta: Yosselin (BAN). Aquí solo van los tipos que ya fija el contrato;
 * el esquema Zod del banco se agrega en esta misma carpeta.
 */

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
