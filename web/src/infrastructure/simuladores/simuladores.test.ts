import { describe, expect, it, vi } from 'vitest'
import { crearConsulta } from '@/application/consulta/crear-consulta'
import { crearBuscadorSimulado } from './buscador-simulado'
import { crearGrabadorSimulado } from './grabador-simulado'
import { crearMotorSimulado } from './motor-simulado'
import { crearReconocedorSimulado } from './reconocedor-simulado'

/** Consulta real conectada a los simuladores, como la usarán las vistas. */
function consultaSimulada() {
  let n = 0
  const grabador = crearGrabadorSimulado()
  const consulta = crearConsulta({
    motor: crearMotorSimulado(),
    grabador,
    generarId: () => `id-${++n}`,
    ahora: () => new Date('2026-11-08T10:00:00.000Z'),
  })
  const responder = (valor: string) => {
    const { preguntaActiva } = consulta.getState()
    if (preguntaActiva === null) throw new Error('No hay pregunta activa')
    consulta.getState().proponer({ preguntaId: preguntaActiva, valor, origen: 'tactil' })
    consulta.getState().confirmar()
  }
  consulta.getState().iniciarConsulta({ preguntarEmbarazo: false })
  consulta.getState().recibirTablet()
  return { consulta, grabador, responder }
}

describe('motor simulado + consulta', () => {
  it('recorre el camino completo y entrega la tablet al profesional', () => {
    const { consulta, responder } = consultaSimulada()
    const vistas: string[] = []
    for (const valor of ['NO', 'TOS', 'AYER', 'LEVE', 'IGUAL', 'NO', 'NO', 'NO']) {
      vistas.push(consulta.getState().preguntaActiva ?? '-')
      responder(valor)
    }
    expect(vistas).toEqual(['P0', 'P1', 'P3', 'P4', 'P5', 'P7', 'P8', 'P11'])
    expect(consulta.getState().fase).toBe('entrega-profesional')
  })

  it('P3–P5 quedan asociadas al síntoma elegido en P1', () => {
    const { consulta, responder } = consultaSimulada()
    for (const valor of ['NO', 'FIEBRE', 'HOY', 'FUERTE', 'EMPEORADO']) responder(valor)
    const ciclo = consulta.getState().respuestas.filter((r) => r.ciclo === 1)
    expect(ciclo.map((r) => [r.preguntaId, r.sintoma])).toEqual([
      ['P1', undefined],
      ['P3', 'FIEBRE'],
      ['P4', 'FIEBRE'],
      ['P5', 'FIEBRE'],
    ])
  })

  it('P0 = SÍ lleva a la alerta', () => {
    const { consulta, responder } = consultaSimulada()
    responder('SI')
    expect(consulta.getState().fase).toBe('alerta')
  })

  it('P11 = SÍ termina el flujo para orientar a interpretación', () => {
    const { consulta, responder } = consultaSimulada()
    for (const valor of ['NO', 'TOS', 'AYER', 'LEVE', 'IGUAL', 'NO', 'NO', 'SI']) responder(valor)
    expect(consulta.getState().fase).toBe('entrega-profesional')
    expect(consulta.getState().respuestas.at(-1)).toMatchObject({ preguntaId: 'P11', valor: 'SI' })
  })
})

describe('grabador simulado', () => {
  it('terminar la consulta borra las grabaciones', async () => {
    const { consulta, grabador } = consultaSimulada()
    await grabador.grabar(60)
    expect(grabador.cantidad).toBe(1)
    consulta.getState().terminarConsulta()
    expect(grabador.cantidad).toBe(0)
  })
})

describe('reconocedor simulado', () => {
  it('no reconoce nada por sí solo', async () => {
    const reconocedor = crearReconocedorSimulado()
    const alInferir = vi.fn()
    reconocedor.alInferir(alInferir)
    await reconocedor.iniciar({} as HTMLVideoElement)
    expect(alInferir).not.toHaveBeenCalled()
    expect(await reconocedor.detectarEnGrabacion(new Blob())).toEqual([])
  })

  it('emitir() entrega la inferencia y se puede dejar de escuchar', () => {
    const reconocedor = crearReconocedorSimulado()
    const alInferir = vi.fn()
    const dejar = reconocedor.alInferir(alInferir)
    reconocedor.emitir({ clase: 'DOLOR', confianza: 0.9, tiempoMs: 0 })
    dejar()
    reconocedor.emitir({ clase: 'TOS', confianza: 0.9, tiempoMs: 1 })
    expect(alInferir).toHaveBeenCalledOnce()
  })
})

describe('buscador simulado', () => {
  it('devuelve como máximo 3 sugerencias, o ninguna', async () => {
    const lleno = crearBuscadorSimulado(
      ['R-A', 'R-B', 'R-C', 'R-D'].map((preguntaId) => ({ preguntaId, similitud: 0.8 })),
    )
    expect((await lleno.buscar('x')).sugerencias).toHaveLength(3)
    expect((await crearBuscadorSimulado().buscar('x')).sugerencias).toEqual([])
  })
})
