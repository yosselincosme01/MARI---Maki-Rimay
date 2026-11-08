/**
 * Formato de una muestra de entrenamiento (criterios M2 y M3).
 *
 * Una muestra = una repetición de una seña hecha por un señante voluntario, guardada como
 * puntos normalizados. NUNCA contiene video ni el nombre de la persona: solo su código.
 */
import type { ClaseSena } from '@/application/puertos/tipos'
import { DIMENSION_FOTOGRAMA, VERSION_ENTRADA } from '@/domain/senas/normalizar'

/** Clases del modelo, en el orden en que se muestran en el recolector. */
export const CLASES: readonly ClaseSena[] = [
  'DOLOR',
  'TOS',
  'FIEBRE',
  'FALTA_DE_AIRE',
  'SI',
  'NO',
  'OTRA',
]

/** Repeticiones sugeridas por seña y por persona (M2). */
export const REPETICIONES_OBJETIVO = 30

/** Código del señante: P01, P02… Nunca un nombre. */
export const esCodigoSenante = (codigo: string) => /^P\d{2}$/.test(codigo)

/** CLASE_P03_rep012.json */
export function nombreArchivo(clase: ClaseSena, senante: string, repeticion: number): string {
  return `${clase}_${senante}_rep${String(repeticion).padStart(3, '0')}.json`
}

/**
 * Siguiente número de repetición para una seña y un señante, mirando los archivos que ya
 * existen. Continúa después del mayor, así una sesión interrumpida no sobrescribe nada.
 */
export function siguienteRepeticion(
  nombresExistentes: readonly string[],
  clase: ClaseSena,
  senante: string,
): number {
  return Math.max(0, ...repeticiones(nombresExistentes, clase, senante)) + 1
}

/** Cuántas repeticiones hay de una seña para un señante. */
export function contarRepeticiones(
  nombresExistentes: readonly string[],
  clase: ClaseSena,
  senante: string,
): number {
  return repeticiones(nombresExistentes, clase, senante).length
}

function repeticiones(nombres: readonly string[], clase: ClaseSena, senante: string): number[] {
  const patron = new RegExp(`^${clase}_${senante}_rep(\\d{3})\\.json$`)
  return nombres.flatMap((nombre) => {
    const numero = patron.exec(nombre)?.[1]
    return numero ? [Number(numero)] : []
  })
}

export interface Muestra {
  formato: 'mari-muestra'
  versionEntrada: string
  clase: ClaseSena
  senante: string
  repeticion: number
  /** Solo el día, sin hora. */
  fecha: string
  dimension: number
  /** 30 fotogramas × 142 números. */
  fotogramas: number[][]
  captura: {
    duracionMs: number
    fotogramasValidos: number
    fotogramasTotales: number
    delegado: 'GPU' | 'CPU'
  }
}

/** Redondeo a 5 decimales: archivos más livianos, error mil veces menor que el de MediaPipe. */
const redondear = (valor: number) => Math.round(valor * 1e5) / 1e5 || 0 // || 0 evita "-0"

export function crearMuestra(datos: {
  clase: ClaseSena
  senante: string
  repeticion: number
  fecha: Date
  fotogramas: readonly (readonly number[])[]
  captura: Muestra['captura']
}): Muestra {
  if (!esCodigoSenante(datos.senante)) {
    throw new Error(`Código de señante inválido: "${datos.senante}". Usa P01, P02…`)
  }
  return {
    formato: 'mari-muestra',
    versionEntrada: VERSION_ENTRADA,
    clase: datos.clase,
    senante: datos.senante,
    repeticion: datos.repeticion,
    fecha: datos.fecha.toISOString().slice(0, 10),
    dimension: DIMENSION_FOTOGRAMA,
    fotogramas: datos.fotogramas.map((fila) => fila.map(redondear)),
    captura: { ...datos.captura },
  }
}
