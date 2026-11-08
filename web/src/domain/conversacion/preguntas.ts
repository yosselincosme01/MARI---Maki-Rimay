/**
 * Modo conversación: de lo que escribe el profesional a preguntas del banco con video.
 *
 * "¿Dónde te duele? y desde cuándo" → ["¿Dónde te duele?", "¿Desde cuándo?"].
 *
 * 1. Se divide el texto en partes (por "?", " y ", comas o punto y coma).
 * 2. Si una parte dice lo mismo que una pregunta o uno de sus alias, se elige esa (así,
 *    escribir la pregunta tal cual siempre funciona, aunque sean palabras muy comunes).
 * 3. Si no, se busca con la búsqueda por palabras clave (BUS4) entre las repreguntas.
 * 4. Se usa la pregunta del FLUJO que tiene el mismo video: así el resumen sabe que "¿Dónde?"
 *    es la localización del síntoma y lo arma como tal.
 *
 * Nunca inventa: una parte sin video parecido se informa como "sin video". No es IA.
 */
import type { Banco, Pregunta } from '@/domain/banco/tipos'
import { BUSQUEDA_INICIAL, buscarPorTexto } from '@/domain/repreguntas/busqueda'

export interface Interpretacion {
  /** El trozo de texto tal como lo escribió el profesional. */
  texto: string
  /** Pregunta del banco que se enviará, o null si no hay video para ese trozo. */
  preguntaId: string | null
}

/** "¿Qué sientes?" → "que sientes": minúsculas, sin tildes ni signos. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
}

/** Divide lo escrito en preguntas sueltas. Descarta los trozos sin letras. */
export function dividirPreguntas(texto: string): string[] {
  return texto
    .split(/[?¿;,\n]|\s+y\s+|\s+e\s+/i)
    .map((t) => t.trim())
    .filter((t) => normalizar(t).length > 0)
}

/** Pregunta cuyo texto o alias dice exactamente lo mismo que el trozo. */
function coincidenciaExacta(trozo: string, banco: Banco): string | null {
  const buscado = normalizar(trozo)
  const encontrada = banco.preguntas.find((p) =>
    [p.texto, ...(p.alias ?? [])].some((frase) => normalizar(frase) === buscado),
  )
  return encontrada?.id ?? null
}

/** Preguntas que el profesional puede elegir directamente: las del flujo, sin repetir video. */
export function catalogo(banco: Banco): Pregunta[] {
  const vistos = new Set<string>()
  return banco.preguntas.filter((p) => {
    if (p.grupo !== 'flujo' || vistos.has(p.video)) return false
    vistos.add(p.video)
    return true
  })
}

/** La pregunta del flujo con el mismo video; si no hay, la repregunta misma. */
function equivalenteDelFlujo(banco: Banco, preguntaId: string): string {
  const pregunta = banco.preguntas.find((p) => p.id === preguntaId)
  const delFlujo = banco.preguntas.find((p) => p.grupo === 'flujo' && p.video === pregunta?.video)
  return delFlujo?.id ?? preguntaId
}

/** Cada trozo de lo escrito con su pregunta del banco (o null). Sin repetir preguntas. */
export function interpretar(texto: string, banco: Banco): Interpretacion[] {
  const usadas = new Set<string>()
  return dividirPreguntas(texto).flatMap((trozo) => {
    const exacta = coincidenciaExacta(trozo, banco)
    const [mejor] = exacta
      ? [{ preguntaId: exacta }]
      : buscarPorTexto(trozo, banco.preguntas, { ...BUSQUEDA_INICIAL, maximo: 1 })
    const preguntaId = mejor ? equivalenteDelFlujo(banco, mejor.preguntaId) : null
    if (preguntaId && usadas.has(preguntaId)) return []
    if (preguntaId) usadas.add(preguntaId)
    return [{ texto: trozo, preguntaId }]
  })
}
