import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import type { Banco, Pregunta, Respuesta } from '@/domain/banco/tipos'
import { validarBanco } from '@/domain/banco/validar'
import { CIERRE, generarResumen, mostrarDato, resumenComoTexto } from './resumen'

/* ─────────────── Banco de prueba con todas las preguntas del plan ─────────────── */

const op = (...pares: [string, string][]) => pares.map(([valor, etiqueta]) => ({ valor, etiqueta }))
const SI_NO = op(['SI', 'Sí'], ['NO', 'No'])

function pregunta(id: string, texto: string, opciones: Pregunta['opciones']): Pregunta {
  return {
    id,
    grupo: id.startsWith('R-') ? 'repregunta' : 'flujo',
    texto,
    video: `videos/${id}.mp4`,
    validado: false,
    tipo: 'opciones',
    opciones,
  }
}

const banco: Banco = {
  version: 1,
  preguntas: [
    pregunta('P0', '¿Te cuesta mucho respirar o tienes dolor fuerte en el pecho?', SI_NO),
    pregunta('P1', '¿Qué sientes?', op(['DOLOR', 'Dolor'], ['TOS', 'Tos'], ['FIEBRE', 'Fiebre'])),
    pregunta(
      'P2',
      '¿Dónde te duele?',
      op(['ABDOMEN_INFERIOR', 'Abdomen inferior'], ['CABEZA', 'Cabeza']),
    ),
    pregunta(
      'P3',
      '¿Desde cuándo?',
      op(['HOY', 'Hoy'], ['AYER', 'Ayer'], ['VARIOS_DIAS', 'Varios días']),
    ),
    pregunta(
      'P4',
      '¿Qué tan fuerte es?',
      op(['LEVE', 'Leve'], ['MODERADO', 'Moderado'], ['FUERTE', 'Fuerte']),
    ),
    pregunta(
      'P5',
      '¿Ha empeorado, mejorado o sigue igual?',
      op(['EMPEORADO', 'Empeoró'], ['IGUAL', 'Igual']),
    ),
    pregunta('P7', '¿Tienes alergias?', SI_NO),
    pregunta('P8', '¿Tomas algún medicamento?', SI_NO),
    pregunta('P9', '¿Estás embarazada?', op(['SI', 'Sí'], ['NO', 'No'], ['NO_SE', 'No sé'])),
    pregunta(
      'P10',
      '¿Tienes alguna enfermedad desde hace tiempo?',
      op(['ASMA', 'Asma'], ['DIABETES', 'Diabetes']),
    ),
    pregunta('P11', '¿Quieres decir algo más o necesitas intérprete?', SI_NO),
    pregunta('R-FLEMA', '¿La tos es con flema?', SI_NO),
  ],
}

let n = 0
function r(
  preguntaId: string,
  valor: string | string[],
  extra: Partial<Respuesta> = {},
): Respuesta {
  return {
    id: `id-${++n}`,
    preguntaId,
    valor,
    origen: 'tactil',
    confirmada: true,
    hora: '2026-11-08T15:02:00.000Z',
    ...extra,
  }
}

const sinEmbarazo = { preguntarEmbarazo: false }
const resumir = (respuestas: Respuesta[], config = sinEmbarazo) =>
  generarResumen({ banco, respuestas, config })

/* ───────────────────────────────────── Tests ───────────────────────────────────── */

/** Los datos de un síntoma como texto: "Tiempo: desde ayer". */
const datosDe = (resumen: ReturnType<typeof resumir>, i = 0) =>
  resumen!.sintomas[i]!.datos.map((d) => `${d.etiqueta}: ${mostrarDato(d)}`)

describe('generarResumen', () => {
  it('sin respuestas confirmadas no genera resumen (RES4)', () => {
    expect(resumir([])).toBeNull()
  })

  it('una línea por síntoma con la plantilla y sus datos por separado (RES2)', () => {
    const resumen = resumir([
      r('P0', 'NO'),
      r('P1', 'DOLOR', { ciclo: 1 }),
      r('P2', 'ABDOMEN_INFERIOR', { ciclo: 1, sintoma: 'DOLOR', origen: 'cuerpo' }),
      r('P3', 'AYER', { ciclo: 1, sintoma: 'DOLOR' }),
      r('P4', 'FUERTE', { ciclo: 1, sintoma: 'DOLOR' }),
      r('P5', 'EMPEORADO', { ciclo: 1, sintoma: 'DOLOR' }),
    ])
    expect(resumen!.sintomas[0]!.linea).toBe(
      'Dolor en abdomen inferior desde ayer, intensidad fuerte, ha empeorado.',
    )
    expect(datosDe(resumen)).toEqual([
      'Localización: abdomen inferior',
      'Tiempo: desde ayer',
      'Intensidad: fuerte',
      'Evolución: ha empeorado',
    ])
  })

  it('varios síntomas no se mezclan: cada ciclo con sus datos', () => {
    const resumen = resumir([
      r('P1', 'TOS', { ciclo: 1 }),
      r('P3', 'VARIOS_DIAS', { ciclo: 1, sintoma: 'TOS' }),
      r('P1', 'FIEBRE', { ciclo: 2 }),
      r('P3', 'HOY', { ciclo: 2, sintoma: 'FIEBRE' }),
      r('P4', 'MODERADO', { ciclo: 2, sintoma: 'FIEBRE' }),
    ])!
    expect(resumen.sintomas.map((s) => s.linea)).toEqual([
      'Tos desde hace varios días, intensidad no especificada, evolución no especificada.',
      'Fiebre desde hoy, intensidad moderada, evolución no especificada.',
    ])
  })

  it('lo que falta queda como null ("no especificado"), nunca se completa', () => {
    const resumen = resumir([r('P1', 'FIEBRE', { ciclo: 1 })])!
    expect(resumen.sintomas[0]!.datos.every((d) => d.valor === null)).toBe(true)
    expect(resumen.alerta).toEqual({ estado: 'no-especificado', texto: 'No especificado.' })
    expect(resumen.antecedentes.map(mostrarDato)).toEqual([
      'no especificado',
      'no especificado',
      'no especificado',
    ])
  })

  it('la localización solo aparece si se preguntó (dolor) o se respondió', () => {
    expect(datosDe(resumir([r('P1', 'TOS', { ciclo: 1 })]))).not.toContainEqual(
      expect.stringMatching(/Localización/),
    )
    expect(datosDe(resumir([r('P1', 'DOLOR', { ciclo: 1 })]))[0]).toBe(
      'Localización: no especificado',
    )
  })

  it('si la persona cambió una respuesta, usa la última confirmada', () => {
    const resumen = resumir([
      r('P1', 'TOS', { ciclo: 1 }),
      r('P3', 'HOY', { ciclo: 1, sintoma: 'TOS' }),
      r('P3', 'AYER', { ciclo: 1, sintoma: 'TOS' }),
    ])!
    expect(resumen.sintomas[0]!.linea).toContain('desde ayer')
  })

  it('P0 = SÍ se informa como alerta inicial', () => {
    const resumen = resumir([r('P0', 'SI')])!
    expect(resumen.alerta.estado).toBe('si')
    expect(resumen.alerta.texto).toMatch(/^Refiere dificultad para respirar/)
    expect(resumen.sintomas).toEqual([])
  })

  it('antecedentes con nombre y valor, P9 solo si el profesional la activó', () => {
    const respuestas = [
      r('P7', 'NO'),
      r('P8', 'SI'),
      r('P9', 'NO_SE'),
      r('P10', ['ASMA', 'DIABETES']),
    ]
    expect(resumir(respuestas)!.antecedentes).toEqual([
      { etiqueta: 'Alergias', valor: 'no' },
      { etiqueta: 'Medicación habitual', valor: 'sí' },
      { etiqueta: 'Enfermedades de larga duración', valor: 'asma, diabetes' },
    ])
    expect(resumir(respuestas, { preguntarEmbarazo: true })!.antecedentes).toContainEqual({
      etiqueta: 'Embarazo',
      valor: 'no sabe',
    })
  })

  it('una repregunta aparece dentro del síntoma al que se refiere', () => {
    const resumen = resumir([
      r('P1', 'TOS', { ciclo: 1 }),
      r('R-FLEMA', 'SI', { repregunta: { sintoma: 'TOS' } }),
    ])!
    expect(resumen.sintomas[0]!.detalles).toEqual(['¿La tos es con flema? Sí.'])
    expect(resumen.otrosDatos).toEqual([])
  })

  it('una repregunta sin síntoma, o de un síntoma no referido, va a "otros datos"', () => {
    const resumen = resumir([
      r('P1', 'FIEBRE', { ciclo: 1 }),
      r('R-FLEMA', 'NO', { repregunta: {} }),
      r('R-FLEMA', 'SI', { repregunta: { sintoma: 'TOS' } }),
    ])!
    expect(resumen.sintomas[0]!.detalles).toEqual([])
    expect(resumen.otrosDatos).toEqual(['¿La tos es con flema? No.', '¿La tos es con flema? Sí.'])
  })

  it('una repregunta no altera los datos del flujo', () => {
    const resumen = resumir([
      r('P1', 'FIEBRE', { ciclo: 1 }),
      r('P3', 'HOY', { repregunta: { sintoma: 'FIEBRE' } }),
    ])!
    expect(resumen.sintomas[0]!.linea).toContain('inicio no especificado')
    expect(resumen.sintomas[0]!.detalles).toEqual(['¿Desde cuándo? Hoy.'])
  })

  it('mensaje libre: señas confirmadas y aviso para el intérprete; vacío si no hubo', () => {
    const resumen = resumir([
      r('P3', 'OTRA', { ciclo: 1, sintoma: 'DOLOR' }),
      r('P3', ['DOLOR', 'TOS'], { origen: 'mensaje-libre' }),
      r('P11', 'SI'),
    ])!
    expect(resumen.mensajeLibre).toEqual([
      'Señas confirmadas: dolor, tos.',
      'Eligió "otra / no está aquí" en: ¿Desde cuándo?.',
      'El resto del mensaje requiere revisión por un intérprete.',
    ])
    expect(resumen.pidioInterprete).toBe(true)
    expect(resumir([r('P7', 'NO')])!.mensajeLibre).toEqual([])
  })

  it('"otra" en un síntoma no se convierte en un dato inventado', () => {
    const resumen = resumir([
      r('P1', 'DOLOR', { ciclo: 1 }),
      r('P4', 'OTRA', { ciclo: 1, sintoma: 'DOLOR' }),
    ])!
    expect(resumen.sintomas[0]!.linea).toContain(
      'intensidad no está en la lista (ver mensaje libre)',
    )
  })

  it('muestra también las respuestas originales, en orden (RES3)', () => {
    const resumen = resumir([
      r('P1', 'DOLOR', { ciclo: 1, origen: 'sena' }),
      r('P2', 'CABEZA', { ciclo: 1, origen: 'cuerpo' }),
    ])!
    expect(
      resumen.originales.map(({ pregunta, respuesta, origen }) => [pregunta, respuesta, origen]),
    ).toEqual([
      ['¿Qué sientes?', 'Dolor', 'seña'],
      ['¿Dónde te duele?', 'Cabeza', 'cuerpo 3D'],
    ])
    expect(resumen.cierre).toBe(CIERRE)
  })

  it('un valor desconocido muestra el código tal cual, sin inventar un texto', () => {
    expect(resumir([r('P7', 'TALVEZ')])!.antecedentes[0]!.valor).toBe('TALVEZ')
    const zona = resumir([r('P1', 'DOLOR', { ciclo: 1 }), r('P2', 'RODILLA', { ciclo: 1 })])!
    expect(zona.sintomas[0]!.linea).toMatch(/^Dolor en RODILLA,/)
  })
})

describe('resumenComoTexto', () => {
  const generado = new Date(2026, 10, 8, 15, 8)

  it('encabezado, secciones en orden y cierre fijo al final; sin sección "Repreguntas"', () => {
    const texto = resumenComoTexto(
      resumir([
        r('P0', 'NO'),
        r('P1', 'TOS', { ciclo: 1 }),
        r('R-FLEMA', 'SI', { repregunta: { sintoma: 'TOS' } }),
      ])!,
      generado,
    )
    expect(texto).toMatch(/^RESUMEN PRE-CONSULTA · MARI\nGenerado: 08\/11\/2026 15:08/)
    const orden = [
      'Alerta inicial:',
      'SÍNTOMAS REFERIDOS',
      'ANTECEDENTES',
      'RESPUESTAS ORIGINALES',
    ].map((s) => texto.indexOf(s))
    expect(orden.every((i) => i >= 0)).toBe(true)
    expect([...orden].sort((x, y) => x - y)).toEqual(orden)
    expect(texto).toContain('    - ¿La tos es con flema? Sí.')
    expect(texto).not.toMatch(/REPREGUNTAS/)
    expect(texto.trimEnd().endsWith(CIERRE)).toBe(true)
  })

  it('las secciones vacías no aparecen', () => {
    const texto = resumenComoTexto(resumir([r('P7', 'NO')])!, generado)
    expect(texto).not.toMatch(/MENSAJE LIBRE|OTROS DATOS|interpretación/)
  })
})

describe('con el banco real', () => {
  it('usa las etiquetas del banco de Yosselin', () => {
    const validado = validarBanco(datosBanco)
    if (!validado.ok) throw new Error(validado.errores.join('\n'))
    const resumen = generarResumen({
      banco: validado.banco,
      config: sinEmbarazo,
      respuestas: [
        r('P1', 'DOLOR', { ciclo: 1 }),
        r('P2', 'ABDOMEN_INFERIOR', { ciclo: 1, sintoma: 'DOLOR' }),
        r('P3', 'UNA_SEMANA_O_MAS', { ciclo: 1, sintoma: 'DOLOR' }),
        r('P4', 'LEVE', { ciclo: 1, sintoma: 'DOLOR' }),
      ],
    })!
    expect(resumen.sintomas[0]!.linea).toBe(
      'Dolor en abdomen inferior desde hace una semana o más, intensidad leve, evolución no especificada.',
    )
  })
})
