/**
 * Resumen para el profesional (módulo RES, criterios RES1–RES5).
 *
 * Se arma con PLANTILLA, sin IA generativa: solo usa respuestas confirmadas, nunca completa ni
 * infiere. Lo que falta se marca como "no especificado".
 *
 * Las preguntas se identifican por su ID estable del contrato (§5.0): P0 alerta, P1–P5 ciclo de
 * síntomas, P7–P10 antecedentes, P11 interpretación, grupo "repregunta". Los textos de las
 * opciones salen del banco (`etiqueta`); las frases de la plantilla viven aquí.
 */
import type { Banco, Pregunta, Respuesta } from '@/domain/banco/tipos'
import type { ConfigConsulta } from '@/domain/flujo/motor'

export const CIERRE = 'Información referida y confirmada por la persona. No constituye diagnóstico.'

export const NO_ESPECIFICADO = 'No especificado.'

export interface LineaOriginal {
  /** ISO 8601, como se guardó. La interfaz decide cómo mostrarla. */
  hora: string
  pregunta: string
  respuesta: string
  origen: string
}

export interface Resumen {
  alerta: string
  sintomas: string[]
  antecedentes: string[]
  repreguntas: string[]
  mensajeLibre: string[]
  originales: LineaOriginal[]
  cierre: string
}

/* ───────────────────────────── Frases de la plantilla ───────────────────────────── */

const INICIO: Record<string, string> = {
  HOY: 'hoy',
  AYER: 'ayer',
  VARIOS_DIAS: 'hace varios días',
  UNA_SEMANA_O_MAS: 'hace una semana o más',
}
const INTENSIDAD: Record<string, string> = {
  LEVE: 'leve',
  MODERADO: 'moderada',
  FUERTE: 'fuerte',
}
const EVOLUCION: Record<string, string> = {
  EMPEORADO: 'ha empeorado',
  MEJORADO: 'ha mejorado',
  IGUAL: 'sigue igual',
}
const SI_NO: Record<string, string> = { SI: 'sí', NO: 'no', NO_SE: 'no sabe', NINGUNA: 'ninguna' }

/** Señas del modelo, para el mensaje libre. */
const SENAS: Record<string, string> = {
  DOLOR: 'dolor',
  TOS: 'tos',
  FIEBRE: 'fiebre',
  FALTA_DE_AIRE: 'falta de aire',
  SI: 'sí',
  NO: 'no',
}

const ORIGEN: Record<Respuesta['origen'], string> = {
  sena: 'seña',
  tactil: 'táctil',
  cuerpo: 'cuerpo 3D',
  'mensaje-libre': 'mensaje libre',
}

const OTRA = 'OTRA'
const FUERA_DE_LISTA = 'no está en la lista (ver mensaje libre)'

/* ───────────────────────────────────── Ayudas ───────────────────────────────────── */

const valores = (r: Respuesta): string[] => (Array.isArray(r.valor) ? r.valor : [r.valor])

const primeraMinuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1)

function crearAyudas(banco: Banco, respuestas: readonly Respuesta[]) {
  const preguntas = new Map<string, Pregunta>(banco.preguntas.map((p) => [p.id, p]))

  /** Etiqueta de una opción en el banco, o undefined si el banco no la conoce. */
  const etiquetaBanco = (preguntaId: string, valor: string) =>
    preguntas.get(preguntaId)?.opciones.find((o) => o.valor === valor)?.etiqueta

  /** Texto de una opción. Nunca inventa: si el banco no la conoce, muestra el código tal cual. */
  const etiqueta = (preguntaId: string, valor: string): string =>
    valor === OTRA ? 'Otra (no está en la lista)' : (etiquetaBanco(preguntaId, valor) ?? valor)

  /** Igual, pero en minúscula para usar dentro de una frase ("abdomen inferior"). */
  const enFrase = (preguntaId: string, valor: string): string => {
    const texto = etiquetaBanco(preguntaId, valor)
    return texto ? primeraMinuscula(texto) : valor
  }

  /** Frase de la plantilla, o la etiqueta del banco si la plantilla no la conoce. */
  const frase = (tabla: Record<string, string>, preguntaId: string, valor: string) =>
    tabla[valor] ?? enFrase(preguntaId, valor)

  // El mensaje libre y las repreguntas tienen sus propias secciones.
  const delFlujo = respuestas.filter((r) => r.origen !== 'mensaje-libre' && !r.repregunta)

  /** Última respuesta confirmada a una pregunta (y a un ciclo, si se indica). */
  const ultima = (preguntaId: string, ciclo?: number): Respuesta | undefined =>
    delFlujo.findLast(
      (r) => r.preguntaId === preguntaId && (ciclo === undefined || r.ciclo === ciclo),
    )

  return { preguntas, etiqueta, enFrase, frase, delFlujo, ultima }
}

/* ───────────────────────────────────── Secciones ───────────────────────────────────── */

type Ayudas = ReturnType<typeof crearAyudas>

function alerta({ ultima }: Ayudas): string {
  const p0 = ultima('P0')
  if (!p0) return NO_ESPECIFICADO
  return valores(p0)[0] === 'SI'
    ? 'Refiere dificultad para respirar o dolor fuerte en el pecho. Se le indicó avisar al personal.'
    : 'No refiere dificultad para respirar ni dolor fuerte en el pecho.'
}

/** Una línea por ciclo: "[síntoma] desde [inicio], intensidad [nivel], [evolución]." */
function sintomas(a: Ayudas): string[] {
  const ciclos = a.delFlujo.filter((r) => r.preguntaId === 'P1' && r.ciclo !== undefined)
  const numeros = [...new Set(ciclos.map((r) => r.ciclo as number))]
  if (numeros.length === 0) return [NO_ESPECIFICADO]

  return numeros.map((n) => {
    const p1 = a.ultima('P1', n)
    const valorSintoma = p1 ? valores(p1)[0] : undefined
    const sintoma =
      valorSintoma === undefined
        ? 'Síntoma no especificado'
        : valorSintoma === OTRA
          ? `Otro síntoma que ${FUERA_DE_LISTA}`
          : a.etiqueta('P1', valorSintoma)

    const p2 = a.ultima('P2', n)
    const zona = p2
      ? ` en ${valores(p2)
          .map((v) => (v === OTRA ? 'una zona que no está en la lista' : a.enFrase('P2', v)))
          .join(' y ')}`
      : ''

    const campo = (
      preguntaId: string,
      tabla: Record<string, string>,
      presente: (texto: string) => string,
      ausente: string,
      fuera: string,
    ) => {
      const r = a.ultima(preguntaId, n)
      const v = r ? valores(r)[0] : undefined
      if (v === undefined) return ausente
      if (v === OTRA) return fuera
      return presente(a.frase(tabla, preguntaId, v))
    }

    const inicio = campo(
      'P3',
      INICIO,
      (t) => ` desde ${t}`,
      ', inicio no especificado',
      `, inicio que ${FUERA_DE_LISTA}`,
    )
    const intensidad = campo(
      'P4',
      INTENSIDAD,
      (t) => `intensidad ${t}`,
      'intensidad no especificada',
      `intensidad que ${FUERA_DE_LISTA}`,
    )
    const evolucion = campo(
      'P5',
      EVOLUCION,
      (t) => t,
      'evolución no especificada',
      `evolución que ${FUERA_DE_LISTA}`,
    )
    return `${sintoma}${zona}${inicio}, ${intensidad}, ${evolucion}.`
  })
}

function antecedentes(a: Ayudas, config: ConfigConsulta, banco: Banco): string[] {
  const simple = (preguntaId: string) => {
    const r = a.ultima(preguntaId)
    if (!r) return 'no especificado'
    const v = valores(r)[0] as string
    return v === OTRA ? FUERA_DE_LISTA : a.frase(SI_NO, preguntaId, v)
  }

  const lineas = [`Alergias: ${simple('P7')}.`, `Medicamentos: ${simple('P8')}.`]
  if (config.preguntarEmbarazo) lineas.push(`Embarazo: ${simple('P9')}.`)

  // P10 es opcional en el MVP: solo aparece si el banco la incluye o si fue respondida.
  const p10 = a.ultima('P10')
  if (p10 || banco.preguntas.some((p) => p.id === 'P10')) {
    const texto = p10
      ? valores(p10)
          .map((v) => (v === OTRA ? 'otra' : a.frase(SI_NO, 'P10', v)))
          .join(', ')
      : 'no especificado'
    lineas.push(`Enfermedades de larga duración: ${texto}.`)
  }
  return lineas
}

function repreguntas(a: Ayudas, respuestas: readonly Respuesta[]): string[] {
  const lineas = respuestas
    .filter((r) => r.repregunta)
    .map((r) => {
      const texto = a.preguntas.get(r.preguntaId)?.texto ?? r.preguntaId
      const sobre = r.repregunta?.sintoma ? ` (sobre ${a.enFrase('P1', r.repregunta.sintoma)})` : ''
      const respuesta = valores(r)
        .map((v) => (v === OTRA ? FUERA_DE_LISTA : a.enFrase(r.preguntaId, v)))
        .join(', ')
      return `${texto}${sobre}: ${respuesta}.`
    })
  return lineas.length > 0 ? lineas : ['Sin repreguntas.']
}

function mensajeLibre(a: Ayudas, respuestas: readonly Respuesta[]): string[] {
  const lineas: string[] = []

  const senas = respuestas
    .filter((r) => r.origen === 'mensaje-libre')
    .flatMap(valores)
    .map((v) => SENAS[v] ?? primeraMinuscula(v))
  const eligioOtra = a.delFlujo.filter((r) => valores(r).includes(OTRA))

  if (senas.length > 0) lineas.push(`Señas confirmadas: ${[...new Set(senas)].join(', ')}.`)
  if (eligioOtra.length > 0) {
    const donde = eligioOtra.map((r) => a.preguntas.get(r.preguntaId)?.texto ?? r.preguntaId)
    lineas.push(`Eligió "otra / no está aquí" en: ${donde.join(' · ')}.`)
  }
  if (senas.length > 0 || eligioOtra.length > 0) {
    lineas.push('El resto del mensaje requiere revisión por un intérprete.')
  }

  const p11 = a.ultima('P11')
  if (p11 && valores(p11)[0] === 'SI') lineas.push('Pidió apoyo de interpretación.')

  return lineas.length > 0 ? lineas : ['Sin mensaje libre.']
}

function originales(a: Ayudas, respuestas: readonly Respuesta[]): LineaOriginal[] {
  return respuestas.map((r) => ({
    hora: r.hora,
    pregunta: a.preguntas.get(r.preguntaId)?.texto ?? r.preguntaId,
    respuesta: valores(r)
      .map((v) => (r.origen === 'mensaje-libre' ? (SENAS[v] ?? v) : a.etiqueta(r.preguntaId, v)))
      .join(', '),
    origen: ORIGEN[r.origen],
  }))
}

/* ───────────────────────────────────── API ───────────────────────────────────── */

/**
 * Arma el resumen. Devuelve null si no hay respuestas confirmadas (RES4): no se genera un
 * resumen vacío que parezca información.
 */
export function generarResumen(datos: {
  banco: Banco
  respuestas: readonly Respuesta[]
  config: ConfigConsulta
}): Resumen | null {
  const { banco, respuestas, config } = datos
  if (respuestas.length === 0) return null
  const a = crearAyudas(banco, respuestas)
  return {
    alerta: alerta(a),
    sintomas: sintomas(a),
    antecedentes: antecedentes(a, config, banco),
    repreguntas: repreguntas(a, respuestas),
    mensajeLibre: mensajeLibre(a, respuestas),
    originales: originales(a, respuestas),
    cierre: CIERRE,
  }
}

/** Hora local HH:MM para mostrar. */
export const horaCorta = (iso: string) => {
  const fecha = new Date(iso)
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`
}

/** Texto plano para "Copiar" (RES4). */
export function resumenComoTexto(resumen: Resumen): string {
  const lista = (lineas: string[]) => lineas.map((l) => `• ${l}`).join('\n')
  return [
    'ALERTA INICIAL',
    resumen.alerta,
    '',
    'SÍNTOMAS REFERIDOS',
    lista(resumen.sintomas),
    '',
    'ANTECEDENTES',
    lista(resumen.antecedentes),
    '',
    'REPREGUNTAS',
    lista(resumen.repreguntas),
    '',
    'MENSAJE LIBRE EN LSP',
    lista(resumen.mensajeLibre),
    '',
    'RESPUESTAS ORIGINALES',
    ...resumen.originales.map(
      (o) => `${horaCorta(o.hora)}  ${o.pregunta} → ${o.respuesta} (${o.origen})`,
    ),
    '',
    resumen.cierre,
  ].join('\n')
}
