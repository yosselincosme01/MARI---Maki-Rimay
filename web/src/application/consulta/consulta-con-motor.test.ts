import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import { validarBanco } from '@/domain/banco/validar'
import type { ConfigConsulta } from '@/domain/flujo/motor'
import { crearMotor } from '@/domain/flujo/motor-banco'
import { crearGrabadorSimulado } from '@/infrastructure/simuladores/grabador-simulado'
import { crearConsulta } from './crear-consulta'

/** Consulta (CNS) conectada al motor real (FLU) y al banco real, como en la app. */
function consultaReal(config: ConfigConsulta) {
  const resultado = validarBanco(datosBanco)
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  let n = 0
  const consulta = crearConsulta({
    motor: crearMotor(resultado.banco),
    grabador: crearGrabadorSimulado(),
    generarId: () => `id-${++n}`,
    ahora: () => new Date('2026-11-08T10:00:00.000Z'),
  })
  consulta.getState().iniciarConsulta(config)
  consulta.getState().recibirTablet()

  const responder = (...valores: string[]) => {
    for (const valor of valores) {
      const { preguntaActiva } = consulta.getState()
      if (preguntaActiva === null) throw new Error('No hay pregunta activa')
      consulta.getState().proponer({ preguntaId: preguntaActiva, valor, origen: 'tactil' })
      consulta.getState().confirmar()
    }
  }
  return { consulta, responder }
}

describe('consulta + motor real + banco real', () => {
  it('recorre las 6 preguntas y entrega la tablet al profesional', () => {
    const { consulta, responder } = consultaReal({ preguntarEmbarazo: true })
    responder('DOLOR', 'CABEZA', 'HOY', 'FUERTE', 'NO', 'NO_SE')
    const estado = consulta.getState()
    expect(estado.fase).toBe('entrega-profesional')
    expect(estado.respuestas.map((r) => r.preguntaId)).toEqual(['P1', 'P2', 'P3', 'P4', 'P7', 'P9'])
  })

  it('guarda P1–P4 con el ciclo y P2–P4 con el síntoma; P7 y P9 sin ciclo', () => {
    const { consulta, responder } = consultaReal({ preguntarEmbarazo: true })
    responder('DOLOR', 'CABEZA', 'HOY', 'FUERTE', 'SI', 'NO')
    const resumen = consulta
      .getState()
      .respuestas.map(({ preguntaId, ciclo, sintoma }) => ({ preguntaId, ciclo, sintoma }))
    expect(resumen).toEqual([
      { preguntaId: 'P1', ciclo: 1, sintoma: undefined },
      { preguntaId: 'P2', ciclo: 1, sintoma: 'DOLOR' },
      { preguntaId: 'P3', ciclo: 1, sintoma: 'DOLOR' },
      { preguntaId: 'P4', ciclo: 1, sintoma: 'DOLOR' },
      { preguntaId: 'P7', ciclo: undefined, sintoma: undefined },
      { preguntaId: 'P9', ciclo: undefined, sintoma: undefined },
    ])
  })

  it('sin P9 activada, termina después de P7', () => {
    const { consulta, responder } = consultaReal({ preguntarEmbarazo: false })
    responder('TOS', 'AYER', 'LEVE', 'NO')
    expect(consulta.getState().fase).toBe('entrega-profesional')
    expect(consulta.getState().respuestas.map((r) => r.preguntaId)).toEqual([
      'P1',
      'P3',
      'P4',
      'P7',
    ])
  })
})
