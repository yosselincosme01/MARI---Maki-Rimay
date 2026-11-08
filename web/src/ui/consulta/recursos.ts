import type { Opcion, Pregunta } from '@/domain/banco/tipos'
import { VALOR_OTRA } from '@/domain/banco/esquema'

/** Las rutas del banco son relativas a public/. */
export function urlPublica(ruta: string): string {
  return import.meta.env.BASE_URL + ruta
}

export const ETIQUETA_OTRA = 'Otra / no está aquí'

export function opcionDe(pregunta: Pregunta, valor: string): Opcion | undefined {
  return pregunta.opciones.find((o) => o.valor === valor)
}

/** Texto de un valor para mostrarlo: "DOLOR" → "Dolor", "OTRA" → "Otra / no está aquí". */
export function etiquetaDe(pregunta: Pregunta, valor: string): string {
  if (valor === VALOR_OTRA) return ETIQUETA_OTRA
  return opcionDe(pregunta, valor)?.etiqueta ?? valor
}
