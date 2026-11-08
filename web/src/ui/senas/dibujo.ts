/**
 * Dibujo de los puntos de MediaPipe sobre un lienzo. Lo usan el recolector y la cámara de la
 * vista paciente.
 */
import { PUNTOS_POSE, type FotogramaCrudo, type Punto } from '@/domain/senas/normalizar'

/**
 * Las 21 uniones de los puntos de una mano (igual que HandLandmarker.HAND_CONNECTIONS).
 * Se copian aquí para no cargar MediaPipe solo para dibujar líneas.
 */
export const CONEXIONES_MANO: readonly { start: number; end: number }[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20],
].map(([start, end]) => ({ start: start!, end: end! }))

/** Dibuja manos y pose sobre el lienzo, en coordenadas de la imagen. */
export function dibujarPuntos(
  c: HTMLCanvasElement,
  f: FotogramaCrudo,
  ancho: number,
  alto: number,
) {
  const ctx = c.getContext('2d')
  if (!ctx) return
  c.width = ancho
  c.height = alto
  ctx.clearRect(0, 0, ancho, alto)
  const px = (p: Punto) => [p.x * ancho, p.y * alto] as const

  const mano = (puntos: readonly Punto[] | null, color: string) => {
    if (!puntos) return
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    for (const { start, end } of CONEXIONES_MANO) {
      const a = puntos[start]
      const b = puntos[end]
      if (!a || !b) continue
      ctx.beginPath()
      ctx.moveTo(...px(a))
      ctx.lineTo(...px(b))
      ctx.stroke()
    }
    ctx.fillStyle = color
    for (const p of puntos) {
      ctx.beginPath()
      ctx.arc(...px(p), 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (f.pose) {
    const puntos = PUNTOS_POSE.map(({ indice }) => f.pose?.[indice])
    ctx.fillStyle = '#ffffff'
    for (const p of puntos) {
      if (!p) continue
      ctx.beginPath()
      ctx.arc(...px(p), 6, 0, Math.PI * 2)
      ctx.fill()
    }
    const [izq, der] = [f.pose[11], f.pose[12]]
    if (izq && der) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(...px(izq))
      ctx.lineTo(...px(der))
      ctx.stroke()
    }
  }
  mano(f.manoDerecha, '#07817e')
  mano(f.manoIzquierda, '#f4a86a')
}
