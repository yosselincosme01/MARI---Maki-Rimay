/**
 * Buscador de repreguntas por texto (BUS, respaldo BUS4). Implementa el puerto `Buscador`.
 *
 * Todo ocurre en el dispositivo: la pregunta escrita no sale de la tablet. Informa
 * `metodo: 'texto'` para que la interfaz no lo presente como IA.
 * Cuando exista la búsqueda por significado (Transformers.js), ese adaptador usará este como
 * respaldo si el modelo no carga.
 */
import type { Buscador } from '@/application/puertos/buscador'
import type { Banco } from '@/domain/banco/tipos'
import {
  BUSQUEDA_INICIAL,
  buscarPorTexto,
  type OpcionesBusqueda,
} from '@/domain/repreguntas/busqueda'

export function crearBuscadorTexto(
  banco: Banco,
  opciones: OpcionesBusqueda = BUSQUEDA_INICIAL,
): Buscador {
  return {
    async preparar() {
      // Nada que descargar.
    },
    async buscar(texto) {
      return { metodo: 'texto', sugerencias: buscarPorTexto(texto, banco.preguntas, opciones) }
    },
  }
}
