import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import type { Banco, Respuesta } from '@/domain/banco/tipos'
import { validarBanco } from '@/domain/banco/validar'
import type { ConfigConsulta, MotorFlujo, Paso } from './motor'
import { crearMotor } from './motor-banco'

const SIN_EMBARAZO: ConfigConsulta = { preguntarEmbarazo: false }
const CON_EMBARAZO: ConfigConsulta = { preguntarEmbarazo: true }

function validado(datos: unknown): Banco {
  const resultado = validarBanco(datos)
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  return resultado.banco
}

function respuesta(preguntaId: string, valor: string | string[]): Respuesta {
  return { id: 'r', preguntaId, valor, origen: 'tactil', confirmada: true, hora: '' }
}

/** Responde en orden y devuelve cada paso, empezando por el inicial. */
function recorrer(motor: MotorFlujo, config: ConfigConsulta, valores: (string | string[])[]) {
  const pasos: Paso[] = [motor.inicio(config)]
  for (const valor of valores) {
    const actual = pasos[pasos.length - 1]!
    if (actual.tipo !== 'pregunta') throw new Error(`El flujo terminó en "${actual.tipo}"`)
    pasos.push(motor.siguiente(actual, respuesta(actual.preguntaId, valor), config))
  }
  return pasos
}

const ids = (pasos: Paso[]) => pasos.map((p) => (p.tipo === 'pregunta' ? p.preguntaId : p.tipo))

const SI_NO = [
  { valor: 'SI', etiqueta: 'Sí' },
  { valor: 'NO', etiqueta: 'No' },
]

function q(id: string, extra: Record<string, unknown>) {
  return {
    id,
    grupo: 'flujo',
    texto: id,
    video: `videos/${id}.mp4`,
    validado: false,
    tipo: 'sena',
    opciones: SI_NO,
    ...extra,
  }
}

/** Banco completo del plan (P0–P11, sin P-OPC), para cubrir ramas que el banco real aún no tiene. */
const bancoCompleto = validado({
  version: 1,
  preguntas: [
    q('P0', { siguiente: [{ si: { valor: 'SI' }, ir: 'ALERTA' }, { ir: 'P1' }] }),
    q('P1', {
      opciones: [
        { valor: 'DOLOR', etiqueta: 'Dolor' },
        { valor: 'TOS', etiqueta: 'Tos' },
        { valor: 'FIEBRE', etiqueta: 'Fiebre' },
      ],
      permiteOtra: true,
      iniciaCiclo: true,
      siguiente: [{ si: { valor: 'DOLOR' }, ir: 'P2' }, { ir: 'P3' }],
    }),
    q('P2', {
      tipo: 'cuerpo',
      opciones: [{ valor: 'CABEZA', etiqueta: 'Cabeza' }],
      porCiclo: true,
      siguiente: [{ ir: 'P3' }],
    }),
    q('P3', {
      tipo: 'opciones',
      opciones: [{ valor: 'HOY', etiqueta: 'Hoy' }],
      porCiclo: true,
      siguiente: [{ ir: 'P6' }],
    }),
    q('P6', { siguiente: [{ si: { valor: 'SI' }, ir: 'P1', nuevoCiclo: true }, { ir: 'P7' }] }),
    q('P7', { siguiente: [{ ir: 'P9' }] }),
    q('P9', {
      tipo: 'opciones',
      mostrarSi: { config: 'preguntarEmbarazo' },
      siguiente: [{ ir: 'P10' }],
    }),
    q('P10', {
      tipo: 'opciones',
      multiple: true,
      opciones: [
        { valor: 'ASMA', etiqueta: 'Asma' },
        { valor: 'DIABETES', etiqueta: 'Diabetes' },
        { valor: 'NINGUNA', etiqueta: 'Ninguna' },
      ],
      siguiente: [{ si: { valor: 'ASMA' }, ir: 'P11' }, { ir: 'FIN' }],
    }),
    q('P11', { siguiente: [{ si: { valor: 'SI' }, ir: 'INTERPRETACION' }, { ir: 'FIN' }] }),
    {
      id: 'R-FLEMA',
      grupo: 'repregunta',
      texto: '¿La tos es con flema?',
      video: 'videos/r-flema.mp4',
      validado: false,
      tipo: 'sena',
      opciones: SI_NO,
      alias: ['flema'],
    },
  ],
})

describe('motor con el banco real (6 preguntas)', () => {
  const motor = crearMotor(validado(datosBanco))

  it('empieza en P1 abriendo el ciclo 1, sin síntoma todavía', () => {
    expect(motor.inicio(SIN_EMBARAZO)).toEqual({
      tipo: 'pregunta',
      preguntaId: 'P1',
      ciclo: { numero: 1 },
    })
  })

  it('DOLOR pasa por P2 y P2–P4 llevan el síntoma del ciclo', () => {
    const pasos = recorrer(motor, SIN_EMBARAZO, ['DOLOR', 'CABEZA', 'HOY', 'FUERTE', 'NO'])
    expect(ids(pasos)).toEqual(['P1', 'P2', 'P3', 'P4', 'P7', 'fin'])
    const ciclo = { numero: 1, sintoma: 'DOLOR' }
    expect(pasos.slice(1, 4)).toEqual([
      { tipo: 'pregunta', preguntaId: 'P2', ciclo },
      { tipo: 'pregunta', preguntaId: 'P3', ciclo },
      { tipo: 'pregunta', preguntaId: 'P4', ciclo },
    ])
  })

  it('otro síntoma salta P2', () => {
    const pasos = recorrer(motor, SIN_EMBARAZO, ['FIEBRE', 'AYER', 'LEVE', 'SI'])
    expect(ids(pasos)).toEqual(['P1', 'P3', 'P4', 'P7', 'fin'])
    expect(pasos[1]).toMatchObject({ ciclo: { numero: 1, sintoma: 'FIEBRE' } })
  })

  it('"otra" en P1 sigue la regla por defecto y guarda OTRA como síntoma', () => {
    const pasos = recorrer(motor, SIN_EMBARAZO, ['OTRA'])
    expect(pasos[1]).toEqual({
      tipo: 'pregunta',
      preguntaId: 'P3',
      ciclo: { numero: 1, sintoma: 'OTRA' },
    })
  })

  it('las preguntas fuera del ciclo (P7, P9) llevan ciclo null', () => {
    const pasos = recorrer(motor, CON_EMBARAZO, ['TOS', 'HOY', 'LEVE', 'NO'])
    expect(pasos.slice(-2)).toEqual([
      { tipo: 'pregunta', preguntaId: 'P7', ciclo: null },
      { tipo: 'pregunta', preguntaId: 'P9', ciclo: null },
    ])
  })

  it('P9 solo aparece si el profesional la activa', () => {
    const sin = recorrer(motor, SIN_EMBARAZO, ['TOS', 'HOY', 'LEVE', 'NO'])
    expect(ids(sin)).toEqual(['P1', 'P3', 'P4', 'P7', 'fin'])
    const con = recorrer(motor, CON_EMBARAZO, ['TOS', 'HOY', 'LEVE', 'NO', 'NO_SE'])
    expect(ids(con)).toEqual(['P1', 'P3', 'P4', 'P7', 'P9', 'fin'])
  })
})

describe('motor con el banco completo del plan', () => {
  const motor = crearMotor(bancoCompleto)

  it('P0 = SÍ lleva a la alerta y detiene el flujo', () => {
    expect(ids(recorrer(motor, SIN_EMBARAZO, ['SI']))).toEqual(['P0', 'alerta'])
  })

  it('P0 = NO entra al ciclo 1; P0 no lleva ciclo', () => {
    const pasos = recorrer(motor, SIN_EMBARAZO, ['NO'])
    expect(pasos).toEqual([
      { tipo: 'pregunta', preguntaId: 'P0', ciclo: null },
      { tipo: 'pregunta', preguntaId: 'P1', ciclo: { numero: 1 } },
    ])
  })

  it('dos síntomas con P6: cada uno en su ciclo, sin mezclarse', () => {
    const pasos = recorrer(motor, SIN_EMBARAZO, [
      'NO', // P0
      'DOLOR', // P1 → ciclo 1
      'CABEZA', // P2
      'HOY', // P3
      'SI', // P6 → nuevo ciclo
      'FIEBRE', // P1 → ciclo 2
      'HOY', // P3
      'NO', // P6
    ])
    expect(ids(pasos)).toEqual(['P0', 'P1', 'P2', 'P3', 'P6', 'P1', 'P3', 'P6', 'P7'])
    expect(pasos.map((p) => (p.tipo === 'pregunta' ? p.ciclo : null))).toEqual([
      null,
      { numero: 1 },
      { numero: 1, sintoma: 'DOLOR' },
      { numero: 1, sintoma: 'DOLOR' },
      { numero: 1, sintoma: 'DOLOR' },
      { numero: 2 },
      { numero: 2, sintoma: 'FIEBRE' },
      { numero: 2, sintoma: 'FIEBRE' },
      null,
    ])
  })

  it('tres síntomas numeran los ciclos 1, 2 y 3', () => {
    const pasos = recorrer(motor, SIN_EMBARAZO, [
      'NO',
      'TOS',
      'HOY',
      'SI',
      'FIEBRE',
      'HOY',
      'SI',
      'DOLOR',
    ])
    expect(pasos[pasos.length - 1]).toEqual({
      tipo: 'pregunta',
      preguntaId: 'P2',
      ciclo: { numero: 3, sintoma: 'DOLOR' },
    })
  })

  it('una pregunta oculta por mostrarSi se salta por su regla por defecto', () => {
    const base = ['NO', 'TOS', 'HOY', 'NO', 'NO']
    expect(ids(recorrer(motor, SIN_EMBARAZO, base)).slice(-2)).toEqual(['P7', 'P10'])
    expect(ids(recorrer(motor, CON_EMBARAZO, base)).slice(-2)).toEqual(['P7', 'P9'])
  })

  it('en una pregunta múltiple, la condición se cumple si el valor está entre los elegidos', () => {
    const hasta10 = ['NO', 'TOS', 'HOY', 'NO', 'NO']
    expect(ids(recorrer(motor, SIN_EMBARAZO, [...hasta10, ['DIABETES']])).at(-1)).toBe('fin')
    expect(ids(recorrer(motor, SIN_EMBARAZO, [...hasta10, ['DIABETES', 'ASMA']])).at(-1)).toBe(
      'P11',
    )
  })

  it('P11 = SÍ orienta a interpretación; NO termina', () => {
    const hasta11 = ['NO', 'TOS', 'HOY', 'NO', 'NO', ['ASMA']]
    expect(ids(recorrer(motor, SIN_EMBARAZO, [...hasta11, 'SI'])).at(-1)).toBe('interpretacion')
    expect(ids(recorrer(motor, SIN_EMBARAZO, [...hasta11, 'NO'])).at(-1)).toBe('fin')
  })
})

describe('motor: usos imposibles lanzan un error', () => {
  const motor = crearMotor(bancoCompleto)
  const enP0: Paso = { tipo: 'pregunta', preguntaId: 'P0', ciclo: null }

  it('pedir el siguiente de un paso que no es pregunta', () => {
    expect(() => motor.siguiente({ tipo: 'fin' }, respuesta('P0', 'NO'), SIN_EMBARAZO)).toThrow(
      /ya no tiene preguntas/,
    )
  })

  it('una respuesta que no es de la pregunta actual', () => {
    expect(() => motor.siguiente(enP0, respuesta('P1', 'TOS'), SIN_EMBARAZO)).toThrow(
      /La respuesta es para P1/,
    )
  })

  it('una pregunta que no está en el banco', () => {
    const paso: Paso = { tipo: 'pregunta', preguntaId: 'P99', ciclo: null }
    expect(() => motor.siguiente(paso, respuesta('P99', 'SI'), SIN_EMBARAZO)).toThrow(
      /Pregunta desconocida: P99/,
    )
  })

  it('una repregunta: no pasa por el motor', () => {
    const paso: Paso = { tipo: 'pregunta', preguntaId: 'R-FLEMA', ciclo: null }
    expect(() => motor.siguiente(paso, respuesta('R-FLEMA', 'SI'), SIN_EMBARAZO)).toThrow(
      /repregunta/,
    )
  })
})
