import { esquemaBanco } from './esquema'
import type { Banco } from './tipos'

export type ResultadoBanco = { ok: true; banco: Banco } | { ok: false; errores: string[] }

/**
 * Valida datos desconocidos contra el esquema del banco (BAN1).
 * Nunca lanza: devuelve el banco tipado o una lista de errores legibles.
 */
export function validarBanco(datos: unknown): ResultadoBanco {
  const resultado = esquemaBanco.safeParse(datos)
  if (resultado.success) return { ok: true, banco: resultado.data }
  return {
    ok: false,
    errores: resultado.error.issues.map((i) => `${ubicacion(datos, i.path)}${i.message}`),
  }
}

/** "P3 › siguiente.0.ir: " en lugar de "preguntas.4.siguiente.0.ir: ". */
function ubicacion(datos: unknown, path: readonly PropertyKey[]): string {
  if (path.length === 0) return ''
  const [raiz, indice, ...resto] = path
  if (raiz === 'preguntas' && typeof indice === 'number') {
    const id = idEn(datos, indice) ?? `pregunta ${indice + 1}`
    return resto.length ? `${id} › ${resto.map(String).join('.')}: ` : `${id}: `
  }
  return `${path.map(String).join('.')}: `
}

function idEn(datos: unknown, indice: number): string | undefined {
  if (typeof datos !== 'object' || datos === null) return undefined
  const preguntas: unknown = (datos as { preguntas?: unknown }).preguntas
  if (!Array.isArray(preguntas)) return undefined
  const pregunta: unknown = preguntas[indice]
  if (typeof pregunta !== 'object' || pregunta === null) return undefined
  const id: unknown = (pregunta as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}
