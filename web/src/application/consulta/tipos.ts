/** Estado y casos de uso de la consulta en curso (contrato §5.4). Emmy implementa (CNS). */
import type { Respuesta, RespuestaProvisional } from '@/domain/banco/tipos'
import type { Ciclo, ConfigConsulta } from '@/domain/flujo/motor'

/**
 * En qué momento está la tablet.
 *
 * Transiciones (una acción en otra fase lanza un error: es un fallo de la interfaz):
 *
 * | Acción                                 | Desde                            | Hacia                                       |
 * | -------------------------------------- | -------------------------------- | ------------------------------------------- |
 * | iniciarConsulta                        | inactiva                         | entrega-paciente                            |
 * | recibirTablet                          | entrega-paciente                 | paciente, o repregunta si hay una pendiente |
 * | recibirTablet                          | entrega-profesional              | profesional                                 |
 * | confirmar (motor → pregunta)           | paciente                         | paciente (siguiente pregunta)               |
 * | confirmar (motor → alerta)             | paciente                         | alerta                                      |
 * | confirmar (motor → interpretación/fin) | paciente                         | entrega-profesional                         |
 * | confirmar                              | repregunta                       | entrega-profesional (sin pasar por el motor) |
 * | entregarAlProfesional                  | paciente, alerta, repregunta     | entrega-profesional                         |
 * | enviarRepregunta                       | profesional                      | entrega-paciente                            |
 * | verResumen                             | profesional                      | resumen                                     |
 * | terminarConsulta                       | cualquiera                       | inactiva (todo vacío)                       |
 *
 * Excepción: `confirmar` sin respuesta provisional no hace nada (doble toque, CON3).
 */
export type Fase =
  | 'inactiva'
  | 'entrega-paciente' // "Entregue la tablet a la persona"
  | 'paciente'
  | 'alerta' // P0 = SÍ
  | 'entrega-profesional'
  | 'profesional'
  | 'repregunta' // la tablet volvió al paciente por una repregunta
  | 'resumen'

export interface EstadoConsulta {
  /** Técnico y temporal, sin datos personales. */
  id: string
  fase: Fase
  config: ConfigConsulta
  preguntaActiva: string | null
  ciclo: Ciclo | null
  /** Repregunta enviada por el profesional que la persona aún no responde. */
  repreguntaActiva: { preguntaId: string; sintoma?: string } | null
  /** Modo conversación: preguntas que el profesional envió en fila y cuál va. */
  envio: Envio | null
  /** Modo conversación: IDs de las respuestas del último envío, para mostrarlas como nuevas. */
  ultimoLote: string[]
  provisional: RespuestaProvisional | null
  respuestas: Respuesta[]
}

/**
 * Modo conversación: el profesional envía varias preguntas del banco en fila. La persona las
 * responde seguidas y el dispositivo vuelve al profesional solo al final.
 */
export interface Envio {
  preguntas: string[]
  /** Posición de la pregunta activa dentro de `preguntas`. */
  indice: number
  /** Síntoma al que se asocian las preguntas de detalle. Si falta, el último referido. */
  sintoma?: string
}

export interface CasosDeUso {
  iniciarConsulta(config: ConfigConsulta): void
  /** Modo conversación: el profesional tiene el dispositivo y pregunta lo que necesita. */
  iniciarConversacion(config: ConfigConsulta): void
  /** Modo conversación: envía preguntas del banco en fila a la persona. */
  preguntar(preguntaIds: string[], sintoma?: string): void
  /** Sale de la pantalla de entrega: la persona o el profesional ya tiene la tablet. */
  recibirTablet(): void
  /** Queda provisional hasta ✓. */
  proponer(respuesta: RespuestaProvisional): void
  /** ✓: guarda y avanza con el motor. */
  confirmar(): void
  /** ✗: borra la provisional. */
  descartar(): void
  entregarAlProfesional(): void
  enviarRepregunta(preguntaId: string, sintoma?: string): void
  verResumen(): void
  /** Borra todo y llama a Grabador.descartarTodo(). */
  terminarConsulta(): void
}
