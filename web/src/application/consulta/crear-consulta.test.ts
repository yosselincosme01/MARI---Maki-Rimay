import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Grabador } from '@/application/puertos/grabador'
import type { MotorFlujo } from '@/domain/flujo/motor'
import { crearConsulta, type StoreConsulta } from './crear-consulta'

/**
 * Motor de prueba con un camino corto:
 *   P0 (SÍ → alerta) → P1 (abre el ciclo 1) → P3 (del síntoma elegido) → fin
 */
function motorDePrueba(): MotorFlujo {
  return {
    inicio: () => ({ tipo: 'pregunta', preguntaId: 'P0', ciclo: null }),
    siguiente(actual, respuesta) {
      if (actual.tipo !== 'pregunta') throw new Error('Paso inesperado')
      switch (actual.preguntaId) {
        case 'P0':
          return respuesta.valor === 'SI'
            ? { tipo: 'alerta' }
            : { tipo: 'pregunta', preguntaId: 'P1', ciclo: { numero: 1 } }
        case 'P1':
          return {
            tipo: 'pregunta',
            preguntaId: 'P3',
            ciclo: { numero: 1, sintoma: String(respuesta.valor) },
          }
        default:
          return { tipo: 'fin' }
      }
    },
  }
}

function grabadorEspia() {
  return { grabar: vi.fn(), cancelar: vi.fn(), descartarTodo: vi.fn() } satisfies Grabador
}

let consulta: StoreConsulta
let grabador: ReturnType<typeof grabadorEspia>
let motor: MotorFlujo

beforeEach(() => {
  let n = 0
  grabador = grabadorEspia()
  motor = motorDePrueba()
  consulta = crearConsulta({
    motor,
    grabador,
    generarId: () => `id-${++n}`,
    ahora: () => new Date('2026-11-08T10:00:00.000Z'),
  })
})

/** Atajo: la persona elige una opción y la confirma con ✓. */
function responder(preguntaId: string, valor: string) {
  consulta.getState().proponer({ preguntaId, valor, origen: 'tactil' })
  consulta.getState().confirmar()
}

/** Atajo: inicia la consulta y entrega la tablet a la persona. */
function empezar() {
  consulta.getState().iniciarConsulta({ preguntarEmbarazo: false })
  consulta.getState().recibirTablet()
}

const estado = () => consulta.getState()

describe('inicio', () => {
  it('empieza inactiva y vacía', () => {
    expect(estado()).toMatchObject({ id: '', fase: 'inactiva', respuestas: [] })
  })

  it('crea una consulta vacía, con ID técnico, lista para entregar a la persona (CNS1)', () => {
    estado().iniciarConsulta({ preguntarEmbarazo: true })
    expect(estado()).toMatchObject({
      id: 'id-1',
      fase: 'entrega-paciente',
      config: { preguntarEmbarazo: true },
      preguntaActiva: 'P0',
      respuestas: [],
    })
  })

  it('no permite iniciar otra consulta sin terminar la actual', () => {
    empezar()
    expect(() => estado().iniciarConsulta({ preguntarEmbarazo: false })).toThrow(/fase "paciente"/)
  })

  it('al recibir la tablet, la persona ve la primera pregunta', () => {
    empezar()
    expect(estado().fase).toBe('paciente')
  })
})

describe('responder y confirmar', () => {
  beforeEach(empezar)

  it('una respuesta propuesta queda provisional y no se guarda (CON1)', () => {
    estado().proponer({ preguntaId: 'P0', valor: 'NO', origen: 'tactil' })
    expect(estado().provisional).toEqual({ preguntaId: 'P0', valor: 'NO', origen: 'tactil' })
    expect(estado().respuestas).toHaveLength(0)
  })

  it('✓ guarda la respuesta confirmada y avanza a la siguiente pregunta', () => {
    responder('P0', 'NO')
    expect(estado().respuestas).toEqual([
      {
        id: 'id-2',
        preguntaId: 'P0',
        valor: 'NO',
        origen: 'tactil',
        confirmada: true,
        hora: '2026-11-08T10:00:00.000Z',
      },
    ])
    expect(estado()).toMatchObject({ preguntaActiva: 'P1', provisional: null })
  })

  it('un doble toque en ✓ no guarda dos veces (CON3)', () => {
    estado().proponer({ preguntaId: 'P0', valor: 'NO', origen: 'tactil' })
    estado().confirmar()
    estado().confirmar()
    expect(estado().respuestas).toHaveLength(1)
  })

  it('✗ descarta la provisional y la persona sigue en la misma pregunta (CON3)', () => {
    estado().proponer({ preguntaId: 'P0', valor: 'SI', origen: 'sena', confianza: 0.8 })
    estado().descartar()
    expect(estado()).toMatchObject({ provisional: null, preguntaActiva: 'P0', respuestas: [] })
  })

  it('no acepta una respuesta para una pregunta que no es la activa', () => {
    expect(() => estado().proponer({ preguntaId: 'P5', valor: 'IGUAL', origen: 'tactil' })).toThrow(
      /pregunta activa es "P0"/,
    )
  })

  it('las respuestas del ciclo guardan su número y su síntoma', () => {
    responder('P0', 'NO')
    responder('P1', 'FIEBRE')
    responder('P3', 'HOY')
    const [, p1, p3] = estado().respuestas
    expect(p1).toMatchObject({ preguntaId: 'P1', ciclo: 1 })
    expect(p1).not.toHaveProperty('sintoma') // el síntoma de P1 es su propio valor
    expect(p3).toMatchObject({ preguntaId: 'P3', ciclo: 1, sintoma: 'FIEBRE' })
  })

  it('si el motor falla, la consulta queda como estaba', () => {
    vi.spyOn(motor, 'siguiente').mockImplementation(() => {
      throw new Error('banco inválido')
    })
    estado().proponer({ preguntaId: 'P0', valor: 'NO', origen: 'tactil' })
    expect(() => estado().confirmar()).toThrow('banco inválido')
    expect(estado().respuestas).toHaveLength(0)
    expect(estado().provisional).not.toBeNull()
  })
})

describe('alerta P0', () => {
  it('P0 = SÍ detiene el flujo en la fase de alerta (FLU1)', () => {
    empezar()
    responder('P0', 'SI')
    expect(estado()).toMatchObject({ fase: 'alerta', preguntaActiva: null })
    expect(() => estado().proponer({ preguntaId: 'P1', valor: 'TOS', origen: 'tactil' })).toThrow()
  })

  it('desde la alerta, la tablet pasa al profesional', () => {
    empezar()
    responder('P0', 'SI')
    estado().entregarAlProfesional()
    estado().recibirTablet()
    expect(estado().fase).toBe('profesional')
  })
})

describe('profesional y repreguntas', () => {
  /** Recorre el flujo de prueba completo hasta la vista profesional. */
  function llegarAlProfesional() {
    empezar()
    responder('P0', 'NO')
    responder('P1', 'TOS')
    responder('P3', 'AYER')
    expect(estado().fase).toBe('entrega-profesional')
    estado().recibirTablet()
  }

  it('al terminar el flujo, la tablet pasa al profesional', () => {
    llegarAlProfesional()
    expect(estado().fase).toBe('profesional')
  })

  it('una repregunta vuelve a la persona y regresa al profesional con su síntoma', () => {
    llegarAlProfesional()
    const siguiente = vi.spyOn(motor, 'siguiente')

    estado().enviarRepregunta('R-FLEMA', 'TOS')
    expect(estado()).toMatchObject({ fase: 'entrega-paciente', preguntaActiva: 'R-FLEMA' })

    estado().recibirTablet()
    expect(estado().fase).toBe('repregunta')

    responder('R-FLEMA', 'SI')
    expect(estado().respuestas.at(-1)).toMatchObject({
      preguntaId: 'R-FLEMA',
      valor: 'SI',
      confirmada: true,
      repregunta: { sintoma: 'TOS' },
    })
    expect(estado()).toMatchObject({ fase: 'entrega-profesional', repreguntaActiva: null })
    expect(siguiente).not.toHaveBeenCalled() // las repreguntas no pasan por el motor
  })

  it('una repregunta sin síntoma asociado se guarda igual', () => {
    llegarAlProfesional()
    estado().enviarRepregunta('R-DOLOR-COMER')
    estado().recibirTablet()
    responder('R-DOLOR-COMER', 'NO')
    expect(estado().respuestas.at(-1)?.repregunta).toEqual({})
  })

  it('el resumen solo se abre desde la vista profesional', () => {
    empezar()
    expect(() => estado().verResumen()).toThrow()
    responder('P0', 'NO')
    responder('P1', 'TOS')
    responder('P3', 'AYER')
    estado().recibirTablet()
    estado().verResumen()
    expect(estado().fase).toBe('resumen')
  })
})

describe('terminar la consulta (CNS3)', () => {
  it('borra todo y descarta las grabaciones', () => {
    empezar()
    responder('P0', 'NO')
    estado().proponer({ preguntaId: 'P1', valor: 'DOLOR', origen: 'tactil' })

    estado().terminarConsulta()

    expect(grabador.descartarTodo).toHaveBeenCalledOnce()
    expect(estado()).toMatchObject({
      id: '',
      fase: 'inactiva',
      preguntaActiva: null,
      provisional: null,
      respuestas: [],
    })
  })

  it('después de terminar, una consulta nueva empieza vacía', () => {
    empezar()
    responder('P0', 'NO')
    estado().terminarConsulta()
    estado().iniciarConsulta({ preguntarEmbarazo: false })
    expect(estado().respuestas).toEqual([])
    expect(estado().id).not.toBe('')
  })
})

describe('privacidad (CNS2)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('una consulta completa no escribe en el almacenamiento ni usa la red', () => {
    const escribir = vi.spyOn(Storage.prototype, 'setItem')
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open')

    empezar()
    responder('P0', 'NO')
    responder('P1', 'FIEBRE')
    responder('P3', 'HOY')
    estado().recibirTablet()
    estado().enviarRepregunta('R-FLEMA')
    estado().recibirTablet()
    responder('R-FLEMA', 'NO')
    estado().recibirTablet()
    estado().verResumen()
    estado().terminarConsulta()

    expect(escribir).not.toHaveBeenCalled() // localStorage y sessionStorage
    expect(fetch).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
  })
})

describe('modo conversación (el profesional pregunta)', () => {
  /** Roles como en el banco: P1 abre un síntoma; P2–P4 son detalles; P7 es simple. */
  const ROLES: Record<string, { iniciaCiclo?: boolean; porCiclo?: boolean }> = {
    P1: { iniciaCiclo: true },
    P2: { porCiclo: true },
    P3: { porCiclo: true },
    P4: { porCiclo: true },
    P7: {},
  }
  let conversacion: StoreConsulta
  let grabadorConv: ReturnType<typeof grabadorEspia>

  beforeEach(() => {
    let n = 0
    grabadorConv = grabadorEspia()
    conversacion = crearConsulta({
      motor: motorDePrueba(),
      grabador: grabadorConv,
      generarId: () => `c-${++n}`,
      ahora: () => new Date('2026-11-08T10:00:00.000Z'),
      describir: (id) => ROLES[id],
    })
  })

  const c = () => conversacion.getState()
  /** El profesional envía preguntas; la persona recibe el dispositivo y responde en orden. */
  function conversar(preguntas: string[], valores: string[], sintoma?: string) {
    c().preguntar(preguntas, sintoma)
    c().recibirTablet()
    for (const valor of valores) {
      const preguntaId = c().preguntaActiva
      if (!preguntaId) throw new Error('no hay pregunta activa')
      c().proponer({ preguntaId, valor, origen: 'tactil' })
      c().confirmar()
    }
    c().recibirTablet() // el profesional recibe el dispositivo
  }

  it('empieza con el profesional, sin preguntas ni flujo fijo', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    expect(c()).toMatchObject({ fase: 'profesional', preguntaActiva: null, respuestas: [] })
  })

  it('varias preguntas en fila: la persona las responde seguidas y devuelve el dispositivo una vez', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    c().preguntar(['P1', 'P3'])
    expect(c()).toMatchObject({ fase: 'entrega-paciente', preguntaActiva: 'P1' })
    c().recibirTablet()
    expect(c().fase).toBe('repregunta')

    c().proponer({ preguntaId: 'P1', valor: 'DOLOR', origen: 'sena' })
    c().confirmar()
    expect(c()).toMatchObject({ fase: 'repregunta', preguntaActiva: 'P3', envio: { indice: 1 } })

    c().proponer({ preguntaId: 'P3', valor: 'AYER', origen: 'tactil' })
    c().confirmar()
    expect(c()).toMatchObject({ fase: 'entrega-profesional', preguntaActiva: null, envio: null })
  })

  it('"¿Qué sientes?" abre un síntoma y los detalles van al último referido', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    conversar(['P1'], ['DOLOR'])
    conversar(['P2', 'P3'], ['ABDOMEN_INFERIOR', 'AYER'])
    conversar(['P1', 'P4'], ['FIEBRE', 'MODERADO'])
    const r = c().respuestas
    expect(
      r.map(({ preguntaId, valor, ciclo, sintoma }) => [preguntaId, valor, ciclo, sintoma]),
    ).toEqual([
      ['P1', 'DOLOR', 1, undefined],
      ['P2', 'ABDOMEN_INFERIOR', 1, 'DOLOR'],
      ['P3', 'AYER', 1, 'DOLOR'],
      ['P1', 'FIEBRE', 2, undefined],
      ['P4', 'MODERADO', 2, 'FIEBRE'],
    ])
    // Son respuestas del flujo, no "repreguntas": el resumen las arma como síntomas.
    expect(r.every((x) => x.repregunta === undefined)).toBe(true)
  })

  it('el profesional puede asociar los detalles a otro síntoma', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    conversar(['P1'], ['DOLOR'])
    conversar(['P1'], ['FIEBRE'])
    conversar(['P3'], ['HOY'], 'DOLOR')
    expect(c().respuestas.at(-1)).toMatchObject({ preguntaId: 'P3', ciclo: 1, sintoma: 'DOLOR' })
  })

  it('un detalle sin síntoma referido y una pregunta simple quedan sin ciclo', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    conversar(['P3', 'P7'], ['HOY', 'NO'])
    expect(c().respuestas.map((x) => x.ciclo)).toEqual([undefined, undefined])
  })

  it('solo el profesional envía preguntas, y nunca una lista vacía', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    expect(() => c().preguntar([])).toThrow(/No hay preguntas/)
    c().preguntar(['P1'])
    expect(() => c().preguntar(['P3'])).toThrow(/fase "entrega-paciente"/)
  })

  it('terminar borra la conversación y las grabaciones', () => {
    c().iniciarConversacion({ preguntarEmbarazo: false })
    conversar(['P1'], ['TOS'])
    c().terminarConsulta()
    expect(c()).toMatchObject({ fase: 'inactiva', respuestas: [], envio: null })
    expect(grabadorConv.descartarTodo).toHaveBeenCalledOnce()
  })
})

describe('modo conversación: último lote', () => {
  it('recuerda las respuestas del último envío y lo reinicia en el siguiente', () => {
    let n = 0
    const consulta = crearConsulta({
      motor: motorDePrueba(),
      grabador: grabadorEspia(),
      generarId: () => `l-${++n}`,
      ahora: () => new Date('2026-11-08T10:00:00.000Z'),
      describir: (id) => (id === 'P1' ? { iniciaCiclo: true } : { porCiclo: true }),
    })
    const c = () => consulta.getState()
    const responder = (preguntas: string[], valores: string[]) => {
      c().preguntar(preguntas)
      c().recibirTablet()
      valores.forEach((valor) => {
        c().proponer({ preguntaId: c().preguntaActiva!, valor, origen: 'tactil' })
        c().confirmar()
      })
      c().recibirTablet()
    }
    c().iniciarConversacion({ preguntarEmbarazo: false })
    responder(['P1'], ['TOS'])
    expect(c().ultimoLote).toEqual([c().respuestas[0]!.id])
    responder(['P3', 'P4'], ['HOY', 'LEVE'])
    expect(c().ultimoLote).toEqual(
      c()
        .respuestas.slice(1)
        .map((r) => r.id),
    )
  })
})
