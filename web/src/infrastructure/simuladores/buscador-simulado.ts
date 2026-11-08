/**
 * Buscador SIMULADO. Devuelve siempre las sugerencias que recibe al crearse.
 * Sirve para construir la pantalla de repreguntas antes de que exista BUS.
 * Con la lista vacía se prueba el caso "sin coincidencia".
 */
import type { Buscador, Sugerencia } from '@/application/puertos/buscador'

export function crearBuscadorSimulado(sugerencias: Sugerencia[] = []): Buscador {
  return {
    async preparar() {},
    async buscar() {
      return { metodo: 'texto', sugerencias: sugerencias.slice(0, 3) }
    },
  }
}
