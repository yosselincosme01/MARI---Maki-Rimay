import type { Deteccion, EstadoCamara, Inferencia } from './tipos'

/** Reconocimiento de señas (contrato §5.1). Emmy implementa; Yosselin consume en la vista paciente. */
export interface Reconocedor {
  /** Pide la cámara (sin audio) y empieza a inferir. Solo al pulsar "Activar cámara". */
  iniciar(video: HTMLVideoElement): Promise<void>
  /** Detiene la inferencia y apaga las pistas de la cámara. */
  detener(): void
  /** Devuelve una función para dejar de escuchar. */
  alCambiarEstado(cb: (estado: EstadoCamara) => void): () => void
  /** Inferencias crudas. Quien consume aplica decidirSena (§5.3). */
  alInferir(cb: (inferencia: Inferencia) => void): () => void
  /** Mensaje libre: recorre la grabación con ventana deslizante y aplica decidirSena. */
  detectarEnGrabacion(grabacion: Blob): Promise<Deteccion[]>
}
