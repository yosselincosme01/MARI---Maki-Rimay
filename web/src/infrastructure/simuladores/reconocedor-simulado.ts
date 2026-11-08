/**
 * Reconocedor SIMULADO. Se usa mientras el modelo real no cumpla M5.
 *
 * Nunca reconoce nada por sí solo: la vista paciente debe mostrar "reconocimiento pendiente"
 * y ofrecer las opciones táctiles. No se inventan respuestas ni porcentajes de confianza.
 *
 * `emitir()` existe solo para que los tests simulen una inferencia.
 */
import type { Reconocedor } from '@/application/puertos/reconocedor'
import type { EstadoCamara, Inferencia } from '@/application/puertos/tipos'

export interface ReconocedorSimulado extends Reconocedor {
  /** Solo para pruebas: entrega una inferencia a quien esté escuchando. */
  emitir(inferencia: Inferencia): void
}

export function crearReconocedorSimulado(): ReconocedorSimulado {
  const alEstado = new Set<(estado: EstadoCamara) => void>()
  const alInferencia = new Set<(inferencia: Inferencia) => void>()
  const cambiarEstado = (estado: EstadoCamara) => alEstado.forEach((cb) => cb(estado))

  return {
    async iniciar() {
      cambiarEstado('lista') // no pide la cámara
    },
    detener() {
      cambiarEstado('inactiva')
    },
    alCambiarEstado(cb) {
      alEstado.add(cb)
      return () => alEstado.delete(cb)
    },
    alInferir(cb) {
      alInferencia.add(cb)
      return () => alInferencia.delete(cb)
    },
    async detectarEnGrabacion() {
      return []
    },
    emitir(inferencia) {
      alInferencia.forEach((cb) => cb(inferencia))
    },
  }
}
