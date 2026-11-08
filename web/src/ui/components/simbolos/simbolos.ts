/**
 * Qué símbolo acompaña a cada respuesta, para personas que no leen.
 *
 * Toda opción de respuesta debe entenderse sin texto. Si la opción del banco trae pictograma
 * se usa ese; si no, se dibuja un símbolo según su valor (los valores son cerrados, §5.2):
 * - zonas del cuerpo → silueta con la zona pintada;
 * - tiempo → días marcados en una semana;
 * - "no sé" y "otra" → signo de pregunta;
 * - escala → barras crecientes.
 */
import type { Opcion, Pregunta } from '@/domain/banco/tipos'

export const ZONAS = [
  'CABEZA',
  'GARGANTA',
  'PECHO',
  'ABDOMEN_SUPERIOR',
  'ABDOMEN_INFERIOR',
  'ESPALDA',
  'BRAZOS',
  'PIERNAS',
  'OTRA_ZONA',
] as const
export type Zona = (typeof ZONAS)[number]

/** Días que se marcan en la semana para cada respuesta de tiempo (P3). */
export const DIAS: Record<string, { marcados: number; mas?: boolean }> = {
  HOY: { marcados: 1 },
  AYER: { marcados: 2 },
  VARIOS_DIAS: { marcados: 4 },
  UNA_SEMANA_O_MAS: { marcados: 7, mas: true },
}

/** Valores que se representan con un signo de pregunta. */
export const DUDA = new Set(['NO_SE', 'OTRA'])

export type TipoSimbolo =
  | { tipo: 'pictograma'; ruta: string }
  | { tipo: 'zona'; zona: Zona }
  | { tipo: 'dias'; marcados: number; mas: boolean }
  | { tipo: 'escala'; nivel: number; total: number }
  | { tipo: 'duda' }

const esZona = (valor: string): valor is Zona => (ZONAS as readonly string[]).includes(valor)

/** El símbolo de un valor de una pregunta, o null si no tiene (no debería pasar). */
export function simboloDe(pregunta: Pregunta, valor: string): TipoSimbolo | null {
  const opcion: Opcion | undefined = pregunta.opciones.find((o) => o.valor === valor)
  if (opcion?.pictograma) return { tipo: 'pictograma', ruta: opcion.pictograma }
  if (pregunta.tipo === 'escala' && opcion) {
    return {
      tipo: 'escala',
      nivel: pregunta.opciones.indexOf(opcion) + 1,
      total: pregunta.opciones.length,
    }
  }
  if (esZona(valor)) return { tipo: 'zona', zona: valor }
  const dias = DIAS[valor]
  if (dias) return { tipo: 'dias', marcados: dias.marcados, mas: dias.mas ?? false }
  if (DUDA.has(valor)) return { tipo: 'duda' }
  return null
}
