/**
 * Resumen para el profesional (módulo RES).
 *
 * Se arma con PLANTILLA, sin IA generativa: solo usa respuestas confirmadas, nunca completa ni
 * infiere. Lo que falta queda como `null` ("no especificado"), para que se vea distinto de lo
 * que la persona sí dijo.
 *
 * Se ordena como la anamnesis de la historia clínica (síntoma, localización, tiempo,
 * intensidad, evolución), pero SIN traducir a términos clínicos lo que la persona dijo.
 *
 * Las preguntas se identifican por su ID estable del contrato (§5.0): P0 alerta, P1–P5 ciclo de
 * síntomas, P7–P10 antecedentes, P11 interpretación, grupo "repregunta". Las respuestas a
 * repreguntas se muestran junto al síntoma al que se refieren.
 */
import type { Banco, Pregunta, Respuesta } from '@/domain/banco/tipos'
import type { ConfigConsulta } from '@/domain/flujo/motor'

export const CIERRE = 'Información referida y confirmada por la persona. No constituye diagnóstico.'

/** Texto que se muestra cuando un dato es `null`. */
export const NO_ESPECIFICADO = 'no especificado'

/** Un dato con nombre. `valor: null` significa que la persona no lo dijo. */
export interface Dato {
  etiqueta: string
  valor: string | null
}

export interface SintomaResumen {
  /** "Dolor", "Fiebre"… */
  sintoma: string
  /** Una línea con la plantilla: "[síntoma] desde [inicio], intensidad [nivel], [evolución]." */
  linea: string
  /** Localización (solo si aplica), tiempo, intensidad y evolución. */
  datos: Dato[]
  /** Respuestas a repreguntas sobre este síntoma. */
  detalles: string[]
}

export interface LineaOriginal {
  /** ISO 8601, como se guardó. La interfaz decide cómo mostrarla. */
  hora: string
  pregunta: string
  respuesta: string
  origen: string
}

export interface Resumen {
  alerta: { estado: 'si' | 'no' | 'no-especificado'; texto: string }
  pidioInterprete: boolean
  sintomas: SintomaResumen[]
  antecedentes: Dato[]
  /** Vacío si no hubo mensaje libre ni respuestas "otra". */
  mensajeLibre: string[]
  /** Respuestas a repreguntas que no se asociaron a un síntoma. */
  otrosDatos: string[]
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
const INTENSIDAD: Record<string, string> = { LEVE: 'leve', MODERADO: 'moderada', FUERTE: 'fuerte' }
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
const primeraMinuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1)
const primeraMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

function crearAyudas(banco: Banco, respuestas: readonly Respuesta[]) {
  const preguntas = new Map<string, Pregunta>(banco.preguntas.map((p) => [p.id, p]))

  const etiquetaBanco = (preguntaId: string, valor: string) =>
    preguntas.get(preguntaId)?.opciones.find((o) => o.valor === valor)?.etiqueta

  /** Texto de una opción. Nunca inventa: si el banco no la conoce, muestra el código tal cual. */
  const etiqueta = (preguntaId: string, valor: string): string =>
    valor === OTRA ? 'Otra (no está en la lista)' : (etiquetaBanco(preguntaId, valor) ?? valor)

  /** Igual, en minúscula para usar dentro de una frase ("abdomen inferior"). */
  const enFrase = (preguntaId: string, valor: string): string => {
    const texto = etiquetaBanco(preguntaId, valor)
    return texto ? primeraMinuscula(texto) : valor
  }

  /** Frase de la plantilla, o la etiqueta del banco si la plantilla no la conoce. */
  const frase = (tabla: Record<string, string>, preguntaId: string, valor: string) =>
    valor === OTRA ? FUERA_DE_LISTA : (tabla[valor] ?? enFrase(preguntaId, valor))

  // El mensaje libre y las repreguntas se tratan aparte.
  const delFlujo = respuestas.filter((r) => r.origen !== 'mensaje-libre' && !r.repregunta)

  /** Última respuesta confirmada a una pregunta (y a un ciclo, si se indica). */
  const ultima = (preguntaId: string, ciclo?: number): Respuesta | undefined =>
    delFlujo.findLast(
      (r) => r.preguntaId === preguntaId && (ciclo === undefined || r.ciclo === ciclo),
    )

  /** Primer valor de la última respuesta, ya convertido en frase; null si no respondió. */
  const dato = (preguntaId: string, tabla: Record<string, string>, ciclo?: number) => {
    const r = ultima(preguntaId, ciclo)
    const v = r ? valores(r)[0] : undefined
    return v === undefined ? null : frase(tabla, preguntaId, v)
  }

  return { preguntas, etiqueta, enFrase, frase, delFlujo, ultima, dato }
}

type Ayudas = ReturnType<typeof crearAyudas>

/* ───────────────────────────────────── Secciones ───────────────────────────────────── */

function alerta({ ultima }: Ayudas): Resumen['alerta'] {
  const p0 = ultima('P0')
  if (!p0) return { estado: 'no-especificado', texto: 'No especificado.' }
  return valores(p0)[0] === 'SI'
    ? {
        estado: 'si',
        texto:
          'Refiere dificultad para respirar o dolor fuerte en el pecho. Se le indicó avisar al personal.',
      }
    : { estado: 'no', texto: 'No refiere dificultad para respirar ni dolor fuerte en el pecho.' }
}

/** Texto de una repregunta respondida: "¿La tos es con flema? Sí." */
function detalle(a: Ayudas, r: Respuesta): string {
  const texto = a.preguntas.get(r.preguntaId)?.texto ?? r.preguntaId
  const respuesta = valores(r)
    .map((v) => (v === OTRA ? FUERA_DE_LISTA : a.enFrase(r.preguntaId, v)))
    .join(', ')
  return `${texto} ${primeraMayuscula(respuesta)}.`
}

function sintomas(a: Ayudas, respuestas: readonly Respuesta[]): SintomaResumen[] {
  const numeros = [
    ...new Set(
      a.delFlujo
        .filter((r) => r.preguntaId === 'P1' && r.ciclo !== undefined)
        .map((r) => r.ciclo as number),
    ),
  ]
  const repreguntas = respuestas.filter((r) => r.repregunta?.sintoma)

  return numeros.map((n) => {
    const p1 = a.ultima('P1', n)
    const valorSintoma = p1 ? valores(p1)[0] : undefined
    const sintoma =
      valorSintoma === OTRA
        ? 'Otro síntoma (no está en la lista)'
        : a.etiqueta('P1', valorSintoma ?? '')

    const p2 = a.ultima('P2', n)
    const localizacion = p2
      ? valores(p2)
          .map((v) => (v === OTRA ? 'zona que no está en la lista' : a.enFrase('P2', v)))
          .join(' y ')
      : null
    const tiempo = a.dato('P3', INICIO, n)
    const intensidad = a.dato('P4', INTENSIDAD, n)
    const evolucion = a.dato('P5', EVOLUCION, n)

    // La localización solo aplica si se preguntó (P2 va después de DOLOR) o si se respondió.
    const datos: Dato[] = [
      ...(p2 || valorSintoma === 'DOLOR'
        ? [{ etiqueta: 'Localización', valor: localizacion }]
        : []),
      { etiqueta: 'Tiempo', valor: tiempo === null ? null : `desde ${tiempo}` },
      { etiqueta: 'Intensidad', valor: intensidad },
      { etiqueta: 'Evolución', valor: evolucion },
    ]

    const linea = [
      `${sintoma}${localizacion ? ` en ${localizacion}` : ''}`,
      tiempo === null ? ', inicio no especificado' : ` desde ${tiempo}`,
      `, ${intensidad === null ? 'intensidad no especificada' : `intensidad ${intensidad}`}`,
      `, ${evolucion ?? 'evolución no especificada'}.`,
    ].join('')

    return {
      sintoma,
      linea,
      datos,
      detalles: repreguntas
        .filter((r) => r.repregunta?.sintoma === valorSintoma)
        .map((r) => detalle(a, r)),
    }
  })
}

function antecedentes(a: Ayudas, config: ConfigConsulta, banco: Banco): Dato[] {
  const lista: Dato[] = [
    { etiqueta: 'Alergias', valor: a.dato('P7', SI_NO) },
    { etiqueta: 'Medicación habitual', valor: a.dato('P8', SI_NO) },
  ]
  // P9 aparece si el profesional la activó o si la preguntó durante la conversación.
  if (config.preguntarEmbarazo || a.ultima('P9')) {
    lista.push({ etiqueta: 'Embarazo', valor: a.dato('P9', SI_NO) })
  }

  // P10 es opcional en el MVP: solo aparece si el banco la incluye o si fue respondida.
  const p10 = a.ultima('P10')
  if (p10 || banco.preguntas.some((p) => p.id === 'P10')) {
    lista.push({
      etiqueta: 'Enfermedades de larga duración',
      valor: p10
        ? valores(p10)
            .map((v) => (v === OTRA ? 'otra' : a.frase(SI_NO, 'P10', v)))
            .join(', ')
        : null,
    })
  }
  return lista
}

function mensajeLibre(a: Ayudas, respuestas: readonly Respuesta[]): string[] {
  const senas = respuestas
    .filter((r) => r.origen === 'mensaje-libre')
    .flatMap(valores)
    .map((v) => SENAS[v] ?? v)
  const eligioOtra = a.delFlujo.filter((r) => valores(r).includes(OTRA))

  const lineas: string[] = []
  if (senas.length > 0) lineas.push(`Señas confirmadas: ${[...new Set(senas)].join(', ')}.`)
  if (eligioOtra.length > 0) {
    const donde = eligioOtra.map((r) => a.preguntas.get(r.preguntaId)?.texto ?? r.preguntaId)
    lineas.push(`Eligió "otra / no está aquí" en: ${donde.join(' · ')}.`)
  }
  if (lineas.length > 0) lineas.push('El resto del mensaje requiere revisión por un intérprete.')
  return lineas
}

/** Repreguntas sin síntoma asociado, o cuyo síntoma no se refirió en el flujo. */
function otrosDatos(a: Ayudas, respuestas: readonly Respuesta[], referidos: Set<string>) {
  return respuestas
    .filter(
      (r) =>
        r.repregunta &&
        (r.repregunta.sintoma === undefined || !referidos.has(r.repregunta.sintoma)),
    )
    .map((r) => detalle(a, r))
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
  const p11 = a.ultima('P11')
  const referidos = new Set(a.delFlujo.filter((r) => r.preguntaId === 'P1').flatMap(valores))
  return {
    alerta: alerta(a),
    pidioInterprete: p11 !== undefined && valores(p11)[0] === 'SI',
    sintomas: sintomas(a, respuestas),
    antecedentes: antecedentes(a, config, banco),
    mensajeLibre: mensajeLibre(a, respuestas),
    otrosDatos: otrosDatos(a, respuestas, referidos),
    originales: originales(a, respuestas),
    cierre: CIERRE,
  }
}

/** Valor para mostrar: el dato o "no especificado". */
export const mostrarDato = (d: Dato) => d.valor ?? NO_ESPECIFICADO

const dosCifras = (n: number) => String(n).padStart(2, '0')

/** Hora local HH:MM. */
export const horaCorta = (iso: string) => {
  const f = new Date(iso)
  return `${dosCifras(f.getHours())}:${dosCifras(f.getMinutes())}`
}

/** Fecha y hora local "08/11/2026 15:08" para el encabezado. */
export const fechaHora = (f: Date) =>
  `${dosCifras(f.getDate())}/${dosCifras(f.getMonth() + 1)}/${f.getFullYear()} ${dosCifras(f.getHours())}:${dosCifras(f.getMinutes())}`

/** Texto plano para "Copiar" (RES4). Las secciones vacías no aparecen. */
export function resumenComoTexto(resumen: Resumen, generado: Date = new Date()): string {
  const partes = [
    'RESUMEN PRE-CONSULTA · MARI',
    `Generado: ${fechaHora(generado)}`,
    '',
    `Alerta inicial: ${resumen.alerta.texto}`,
    ...(resumen.pidioInterprete ? ['Apoyo de interpretación: solicitado.'] : []),
    '',
    'SÍNTOMAS REFERIDOS',
    ...(resumen.sintomas.length === 0
      ? ['• No especificado.']
      : resumen.sintomas.flatMap((s) => [`• ${s.linea}`, ...s.detalles.map((d) => `    - ${d}`)])),
    '',
    'ANTECEDENTES',
    ...resumen.antecedentes.map((d) => `• ${d.etiqueta}: ${mostrarDato(d)}.`),
  ]
  if (resumen.mensajeLibre.length > 0) {
    partes.push('', 'MENSAJE LIBRE EN LSP', ...resumen.mensajeLibre.map((l) => `• ${l}`))
  }
  if (resumen.otrosDatos.length > 0) {
    partes.push('', 'OTROS DATOS REFERIDOS', ...resumen.otrosDatos.map((l) => `• ${l}`))
  }
  partes.push(
    '',
    'RESPUESTAS ORIGINALES',
    ...resumen.originales.map(
      (o) => `${horaCorta(o.hora)}  ${o.pregunta} — ${o.respuesta} (${o.origen})`,
    ),
    '',
    resumen.cierre,
  )
  return partes.join('\n')
}
