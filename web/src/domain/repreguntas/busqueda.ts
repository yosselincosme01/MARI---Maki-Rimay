/**
 * Búsqueda de repreguntas por texto (BUS4).
 *
 * El profesional escribe su pregunta con sus palabras y aquí se comparan esas palabras con el
 * texto y los `alias` de cada repregunta del banco. No es IA: normaliza el texto (minúsculas,
 * sin tildes ni signos, sin palabras vacías), recorta cada palabra a su raíz y cuenta
 * coincidencias. Es el respaldo de la búsqueda por significado y también funciona sola.
 *
 * Función pura: no conoce la interfaz ni el navegador.
 */
import type { Pregunta } from '@/domain/banco/tipos'

export interface Coincidencia {
  preguntaId: string
  /** 0 a 1. */
  similitud: number
}

export interface OpcionesBusqueda {
  /** Similitud mínima para sugerir. */
  umbral: number
  /** Cuántas sugerencias como máximo. */
  maximo: number
}

export const BUSQUEDA_INICIAL: OpcionesBusqueda = { umbral: 0.45, maximo: 3 }

/** Palabras que no ayudan a distinguir una pregunta de otra. */
const VACIAS = new Set(
  (
    'a al ante con de del el en es esta este esto la las le les lo los me mi mis o por ' +
    'para que se si su sus te tu un una unos unas usted y ya ha has hay tiene tienes tenia tener ' +
    'siente sientes esta estas ser fue muy algo alguna algun'
  ).split(' '),
)

/** "¿Desde cuándo tiene fiebre?" → ["desde", "cuand", "fiebr"] */
export function raices(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // tildes y diéresis
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((p) => p.length > 1 && !VACIAS.has(p))
    .map((p) => (p.length > 5 ? p.slice(0, 5) : p))
}

/**
 * Qué tanto se parece la consulta a una frase: pesa más que la frase quede cubierta
 * (las palabras de la frase aparecen en la consulta) que el resto de la consulta.
 */
function parecido(consulta: Set<string>, frase: string): number {
  const deFrase = new Set(raices(frase))
  if (deFrase.size === 0 || consulta.size === 0) return 0
  let comunes = 0
  for (const r of deFrase) if (consulta.has(r)) comunes++
  if (comunes === 0) return 0
  return 0.6 * (comunes / deFrase.size) + 0.4 * (comunes / consulta.size)
}

/**
 * Las repreguntas más parecidas al texto, ordenadas y ya filtradas por el umbral.
 * Una lista vacía significa "no hay video para esta pregunta".
 */
export function buscarPorTexto(
  texto: string,
  preguntas: readonly Pregunta[],
  { umbral, maximo }: OpcionesBusqueda = BUSQUEDA_INICIAL,
): Coincidencia[] {
  const consulta = new Set(raices(texto))
  if (consulta.size === 0) return []

  return preguntas
    .filter((p) => p.grupo === 'repregunta')
    .map((p) => ({
      preguntaId: p.id,
      similitud: Math.max(...[p.texto, ...(p.alias ?? [])].map((f) => parecido(consulta, f))),
    }))
    .filter((c) => c.similitud >= umbral)
    .sort((a, b) => b.similitud - a.similitud)
    .slice(0, maximo)
    .map((c) => ({ ...c, similitud: Math.round(c.similitud * 100) / 100 }))
}
