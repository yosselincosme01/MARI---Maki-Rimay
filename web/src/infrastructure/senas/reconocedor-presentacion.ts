/**
 * Reconocedor en MODO PRESENTACIÓN (prototipo "Mago de Oz").
 *
 * La cámara y MediaPipe son REALES: se ven los puntos de las manos en vivo. La seña la decide
 * quien opera la demo con el teclado, mientras el modelo de reconocimiento está en
 * entrenamiento. La interfaz debe mostrar "Reconocimiento simulado (demo)".
 *
 * Implementa el mismo puerto que usará el modelo real: cuando exista, solo se cambia el
 * adaptador en `composicion.ts`.
 *
 * Teclas: 1 Dolor · 2 Tos · 3 Fiebre · 4 Falta de aire · 5 Sí · 6 No
 */
import type { Reconocedor } from '@/application/puertos/reconocedor'
import type { ClaseSena, EstadoCamara, Inferencia } from '@/application/puertos/tipos'
import type { FotogramaCrudo } from '@/domain/senas/normalizar'
import { DECISION_INICIAL } from '@/domain/senas/decision'
import type { Extractor } from './extractor'

export const TECLAS_PRESENTACION: Readonly<Record<string, ClaseSena>> = {
  '1': 'DOLOR',
  '2': 'TOS',
  '3': 'FIEBRE',
  '4': 'FALTA_DE_AIRE',
  '5': 'SI',
  '6': 'NO',
}

/** Traduce el error de getUserMedia a un estado de cámara que la interfaz sabe mostrar (M7). */
export function estadoPorError(error: unknown): EstadoCamara {
  const nombre = error instanceof DOMException ? error.name : ''
  if (nombre === 'NotAllowedError' || nombre === 'SecurityError') return 'denegada'
  if (nombre === 'NotFoundError' || nombre === 'OverconstrainedError') return 'sin-camara'
  if (nombre === 'NotReadableError' || nombre === 'AbortError') return 'ocupada'
  return 'error'
}

export function crearReconocedorPresentacion(): Reconocedor {
  const alEstado = new Set<(estado: EstadoCamara) => void>()
  const alInferencia = new Set<(inferencia: Inferencia) => void>()
  const alPuntos = new Set<(fotograma: FotogramaCrudo) => void>()

  /** Cada iniciar() abre una sesión; detener() la invalida (StrictMode monta dos veces). */
  let sesion = 0
  let flujo: MediaStream | null = null
  let video: HTMLVideoElement | null = null
  let extractor: Extractor | null = null
  let cuadro: number | undefined

  const cambiarEstado = (estado: EstadoCamara) => alEstado.forEach((cb) => cb(estado))

  function alTeclear(evento: KeyboardEvent) {
    if (evento.repeat || (evento.target as HTMLElement | null)?.closest?.('input, textarea')) return
    const clase = TECLAS_PRESENTACION[evento.key]
    if (!clase) return
    // Se emiten las inferencias que exige la regla de decisión, como haría el modelo.
    const ahora = performance.now()
    for (let i = 0; i < DECISION_INICIAL.seguidas; i++) {
      const inferencia: Inferencia = { clase, confianza: 1, tiempoMs: ahora + i }
      alInferencia.forEach((cb) => cb(inferencia))
    }
  }

  function liberar() {
    window.removeEventListener('keydown', alTeclear)
    if (cuadro !== undefined) cancelAnimationFrame(cuadro)
    cuadro = undefined
    extractor?.cerrar()
    extractor = null
    flujo?.getTracks().forEach((pista) => pista.stop()) // apaga la luz de la cámara
    flujo = null
    if (video) video.srcObject = null
    video = null
  }

  return {
    async iniciar(elemento) {
      liberar()
      const mia = ++sesion
      const vigente = () => mia === sesion
      try {
        cambiarEstado('esperando-permiso')
        const nuevoFlujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (!vigente()) {
          nuevoFlujo.getTracks().forEach((pista) => pista.stop())
          return
        }
        flujo = nuevoFlujo
        video = elemento
        elemento.srcObject = nuevoFlujo
        await elemento.play()

        cambiarEstado('cargando-modelo')
        // Carga diferida: MediaPipe solo se descarga cuando se activa la cámara.
        const { crearExtractor } = await import('./extractor')
        const nuevo = await crearExtractor()
        if (!vigente()) {
          nuevo.cerrar()
          return
        }
        extractor = nuevo
        window.addEventListener('keydown', alTeclear)
        cambiarEstado('lista')

        let ultimoTiempo = -1
        const bucle = () => {
          if (!vigente() || !extractor || !video) return
          if (video.currentTime !== ultimoTiempo && video.videoWidth > 0) {
            ultimoTiempo = video.currentTime
            const fotograma = extractor.extraer(video, performance.now())
            alPuntos.forEach((cb) => cb(fotograma))
          }
          cuadro = requestAnimationFrame(bucle)
        }
        cuadro = requestAnimationFrame(bucle)
      } catch (error) {
        if (!vigente()) return
        liberar()
        cambiarEstado(estadoPorError(error))
      }
    },

    detener() {
      sesion++
      liberar()
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
    alFotograma(cb) {
      alPuntos.add(cb)
      return () => alPuntos.delete(cb)
    },

    async detectarEnGrabacion() {
      return [] // el mensaje libre no forma parte del modo presentación
    },
  }
}
