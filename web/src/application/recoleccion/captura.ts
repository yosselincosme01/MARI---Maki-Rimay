/**
 * Convierte lo grabado durante una repetición en los 30 fotogramas de una muestra.
 *
 * Usa EXACTAMENTE la normalización y el remuestreo del dominio: lo mismo que verá el
 * reconocedor en la app. Si no, el modelo aprendería con datos distintos.
 *
 * No exige que haya manos: la clase OTRA incluye el reposo (manos abajo, fuera de cuadro).
 */
import { normalizarFotograma, remuestrear, type FotogramaCrudo } from '@/domain/senas/normalizar'

/** Una muestra se descarta si menos de la mitad de los fotogramas tienen los hombros visibles. */
export const PROPORCION_MINIMA_VALIDOS = 0.5

export type ResultadoCaptura =
  | { tipo: 'valida'; fotogramas: number[][]; validos: number; totales: number }
  | { tipo: 'descartada'; motivo: string; validos: number; totales: number }

export function cerrarCaptura(
  grabados: readonly { tiempoMs: number; crudo: FotogramaCrudo }[],
): ResultadoCaptura {
  const totales = grabados.length
  const normalizados = grabados.flatMap(({ tiempoMs, crudo }) => {
    const vector = normalizarFotograma(crudo)
    return vector ? [{ tiempoMs, vector }] : []
  })
  const validos = normalizados.length

  if (totales === 0) {
    return { tipo: 'descartada', motivo: 'No llegaron fotogramas de la cámara.', validos, totales }
  }
  if (validos / totales < PROPORCION_MINIMA_VALIDOS) {
    return {
      tipo: 'descartada',
      motivo: 'No se vieron los hombros en la mayor parte de la grabación.',
      validos,
      totales,
    }
  }
  const fotogramas = remuestrear(normalizados)
  if (!fotogramas) {
    return {
      tipo: 'descartada',
      motivo: `Muy pocos fotogramas (${validos}): el equipo procesa lento. Cierra otras pestañas, mejora la luz o elige una duración mayor.`,
      validos,
      totales,
    }
  }
  return { tipo: 'valida', fotogramas, validos, totales }
}
