/**
 * Extractor de puntos con MediaPipe Tasks Vision (contrato §5.3).
 *
 * Traduce una imagen de la cámara a un `FotogramaCrudo` del dominio. La normalización NO se
 * hace aquí: está en domain/senas/normalizar.ts, para que sea la misma en /recolector y en la app.
 *
 * Los archivos de MediaPipe se sirven desde public/mediapipe (ver scripts/preparar-mediapipe.mjs):
 * nada se descarga de internet mientras se usa.
 */
import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'
import type { FotogramaCrudo, Punto } from '@/domain/senas/normalizar'

const BASE = `${import.meta.env.BASE_URL}mediapipe`

/** Si los hombros se ven poco (fuera de cuadro o tapados), el fotograma no sirve. */
const VISIBILIDAD_MINIMA_HOMBROS = 0.5

export type Delegado = 'GPU' | 'CPU'

export interface Extractor {
  /** GPU si el dispositivo lo permite; si no, CPU. Se guarda en cada muestra. */
  readonly delegado: Delegado
  /** Extrae los puntos de un fotograma. `tiempoMs` debe ir en aumento. */
  extraer(imagen: HTMLVideoElement, tiempoMs: number): FotogramaCrudo
  cerrar(): void
}

const copiar = (p: NormalizedLandmark): Punto => ({ x: p.x, y: p.y, z: p.z })

/**
 * Decide qué mano es cuál a partir de la etiqueta de MediaPipe ("Left" / "Right").
 *
 * Con la imagen SIN espejar que entrega la cámara, la etiqueta coincide con la mano real
 * de la persona. Verificado con cámara real el 2026-11-08: al levantar la mano derecha,
 * MediaPipe la etiqueta "Right". No invertir.
 *
 * Si MediaPipe detecta dos manos con la misma etiqueta, se queda con la primera.
 */
export function asignarManos(
  manos: readonly (readonly NormalizedLandmark[])[],
  etiquetas: readonly (string | undefined)[],
): { manoDerecha: Punto[] | null; manoIzquierda: Punto[] | null } {
  let manoDerecha: Punto[] | null = null
  let manoIzquierda: Punto[] | null = null
  manos.forEach((puntos, i) => {
    if (etiquetas[i] === 'Right') manoDerecha ??= puntos.map(copiar)
    else if (etiquetas[i] === 'Left') manoIzquierda ??= puntos.map(copiar)
  })
  return { manoDerecha, manoIzquierda }
}

export async function crearExtractor(): Promise<Extractor> {
  const archivos = await FilesetResolver.forVisionTasks(`${BASE}/wasm`)

  const crear = (delegate: Delegado) =>
    Promise.all([
      HandLandmarker.createFromOptions(archivos, {
        baseOptions: { modelAssetPath: `${BASE}/modelos/hand_landmarker.task`, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
      }),
      PoseLandmarker.createFromOptions(archivos, {
        baseOptions: { modelAssetPath: `${BASE}/modelos/pose_landmarker_lite.task`, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      }),
    ])

  let delegado: Delegado = 'GPU'
  let manos: HandLandmarker
  let pose: PoseLandmarker
  try {
    ;[manos, pose] = await crear('GPU')
  } catch {
    delegado = 'CPU' // tablets o navegadores sin WebGL2
    ;[manos, pose] = await crear('CPU')
  }

  let ultimoTiempo = -1

  return {
    delegado,

    extraer(video, tiempoMs) {
      // MediaPipe exige marcas de tiempo estrictamente crecientes.
      const tiempo = Math.max(tiempoMs, ultimoTiempo + 1)
      ultimoTiempo = tiempo

      const resultadoManos = manos.detectForVideo(video, tiempo)
      const resultadoPose = pose.detectForVideo(video, tiempo)

      const { manoDerecha, manoIzquierda } = asignarManos(
        resultadoManos.landmarks,
        resultadoManos.handedness.map((categorias) => categorias[0]?.categoryName),
      )

      const cuerpo = resultadoPose.landmarks[0]
      const hombrosVisibles =
        cuerpo !== undefined &&
        [11, 12].every((i) => (cuerpo[i]?.visibility ?? 0) >= VISIBILIDAD_MINIMA_HOMBROS)

      return {
        aspecto: video.videoWidth / video.videoHeight,
        manoDerecha,
        manoIzquierda,
        pose: hombrosVisibles ? cuerpo.map(copiar) : null,
      }
    },

    cerrar() {
      manos.close()
      pose.close()
    },
  }
}
