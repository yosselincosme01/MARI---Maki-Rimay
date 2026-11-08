/**
 * Grabador SIMULADO. No usa la cámara: devuelve un video vacío.
 * Lleva la cuenta de lo "grabado" para poder comprobar que descartarTodo lo borra.
 */
import type { Grabador } from '@/application/puertos/grabador'

export interface GrabadorSimulado extends Grabador {
  /** Cuántas grabaciones hay en memoria (solo para pruebas). */
  readonly cantidad: number
}

export function crearGrabadorSimulado(): GrabadorSimulado {
  let grabaciones: Blob[] = []
  return {
    get cantidad() {
      return grabaciones.length
    },
    async grabar(_maxSeg, alProgreso) {
      alProgreso?.(0)
      const grabacion = new Blob([], { type: 'video/webm' })
      grabaciones.push(grabacion)
      return grabacion
    },
    cancelar() {},
    descartarTodo() {
      grabaciones = []
    },
  }
}
