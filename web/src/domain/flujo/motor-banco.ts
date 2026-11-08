/**
 * Motor del flujo real (FLU): implementa `MotorFlujo` (contrato §5.6) interpretando el banco.
 *
 * No conoce ninguna pregunta por su ID: todo sale de los datos.
 * - Empieza en la primera pregunta del grupo "flujo", en el orden del banco.
 * - `siguiente`: gana la primera regla cuyo `si` se cumple; la última es el caso por defecto.
 * - `mostrarSi`: si la configuración no lo cumple, la pregunta se salta por su regla por defecto.
 * - `ir`: ALERTA, INTERPRETACION y FIN son pasos especiales; lo demás es una pregunta.
 *
 * Ciclos (un ciclo = un síntoma):
 * - Una pregunta con `iniciaCiclo` abre el ciclo `n`, todavía sin síntoma. Con `nuevoCiclo`
 *   en la regla, `n` es el ciclo anterior + 1; si no, es 1.
 * - Su respuesta confirmada es el síntoma del ciclo.
 * - Las preguntas `porCiclo` llevan el ciclo y su síntoma. También la pregunta que puede abrir
 *   un ciclo nuevo (la que tiene una regla `nuevoCiclo`, p. ej. P6), para saber qué número sigue.
 * - Cualquier otra pregunta lleva `ciclo: null`.
 *
 * Es una función pura de (paso actual, respuesta, configuración): no guarda estado.
 * Ante un uso imposible (pregunta desconocida, respuesta de otra pregunta…) lanza un error,
 * y la consulta queda como estaba.
 */
import type { Banco, Pregunta, Regla, Respuesta } from '@/domain/banco/tipos'
import type { Ciclo, ConfigConsulta, MotorFlujo, Paso } from './motor'

export function crearMotor(banco: Banco): MotorFlujo {
  const preguntas = new Map(banco.preguntas.map((p) => [p.id, p]))
  const primera = banco.preguntas.find((p) => p.grupo === 'flujo')
  if (!primera) throw new Error('El banco no tiene preguntas del flujo.')

  function preguntaDelFlujo(id: string): Pregunta {
    const pregunta = preguntas.get(id)
    if (!pregunta) throw new Error(`Pregunta desconocida: ${id}.`)
    if (pregunta.grupo !== 'flujo') {
      throw new Error(`${id} es una repregunta: las repreguntas no pasan por el motor.`)
    }
    return pregunta
  }

  /** Recorre las preguntas ocultas por `mostrarSi` hasta una visible o un paso especial. */
  function resolverDestino(
    ir: string,
    config: ConfigConsulta,
  ): { pregunta: Pregunta } | { especial: Paso } {
    const visitadas = new Set<string>()
    let destino = ir
    for (;;) {
      if (destino === 'ALERTA') return { especial: { tipo: 'alerta' } }
      if (destino === 'INTERPRETACION') return { especial: { tipo: 'interpretacion' } }
      if (destino === 'FIN') return { especial: { tipo: 'fin' } }

      const pregunta = preguntaDelFlujo(destino)
      if (!pregunta.mostrarSi || config[pregunta.mostrarSi.config]) return { pregunta }

      if (visitadas.has(destino)) throw new Error(`Ciclo infinito al saltar ${destino}.`)
      visitadas.add(destino)
      destino = reglaPorDefecto(pregunta).ir
    }
  }

  return {
    inicio(config) {
      const resuelto = resolverDestino(primera.id, config)
      if ('especial' in resuelto) return resuelto.especial
      const destino = resuelto.pregunta
      return paso(destino, destino.iniciaCiclo ? { numero: 1 } : null)
    },

    siguiente(actual, respuesta, config) {
      if (actual.tipo !== 'pregunta') {
        throw new Error(`El flujo ya no tiene preguntas (paso "${actual.tipo}").`)
      }
      if (respuesta.preguntaId !== actual.preguntaId) {
        throw new Error(
          `La respuesta es para ${respuesta.preguntaId}, pero el paso actual es ${actual.preguntaId}.`,
        )
      }

      const pregunta = preguntaDelFlujo(actual.preguntaId)
      const regla = elegirRegla(pregunta, respuesta)
      const resuelto = resolverDestino(regla.ir, config)
      if ('especial' in resuelto) return resuelto.especial
      const destino = resuelto.pregunta

      // El síntoma del ciclo: la respuesta si la pregunta lo abre, o el que ya traía el paso.
      const sintoma = pregunta.iniciaCiclo ? String(respuesta.valor) : actual.ciclo?.sintoma

      if (destino.iniciaCiclo) {
        const numero = regla.nuevoCiclo ? (actual.ciclo?.numero ?? 0) + 1 : 1
        return paso(destino, { numero })
      }
      if (perteneceAlCiclo(destino) && actual.ciclo) {
        const ciclo: Ciclo =
          sintoma === undefined
            ? { numero: actual.ciclo.numero }
            : { numero: actual.ciclo.numero, sintoma }
        return paso(destino, ciclo)
      }
      return paso(destino, null)
    },
  }
}

function paso(pregunta: Pregunta, ciclo: Ciclo | null): Paso {
  return { tipo: 'pregunta', preguntaId: pregunta.id, ciclo }
}

function reglas(pregunta: Pregunta): Regla[] {
  const lista = pregunta.siguiente ?? []
  if (lista.length === 0) throw new Error(`${pregunta.id} no tiene reglas "siguiente".`)
  return lista
}

/** La última regla, sin `si` (el esquema lo garantiza). */
function reglaPorDefecto(pregunta: Pregunta): Regla {
  const lista = reglas(pregunta)
  return lista[lista.length - 1]!
}

function elegirRegla(pregunta: Pregunta, respuesta: Respuesta): Regla {
  const valores = Array.isArray(respuesta.valor) ? respuesta.valor : [respuesta.valor]
  const regla = reglas(pregunta).find((r) => !r.si || valores.includes(r.si.valor))
  return regla ?? reglaPorDefecto(pregunta)
}

/** P2–P5 (`porCiclo`) y la pregunta que puede abrir un ciclo nuevo (P6). */
function perteneceAlCiclo(pregunta: Pregunta): boolean {
  return pregunta.porCiclo === true || (pregunta.siguiente ?? []).some((r) => r.nuevoCiclo)
}
