/**
 * Cámara con los puntos de MediaPipe dibujados encima.
 * La usa /recolector y servirá para revisar la calidad de la captura.
 *
 * La imagen se MUESTRA espejada (como un espejo, más natural para quien señala),
 * pero los datos se extraen de la imagen sin espejar.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, CameraOff, LoaderCircle } from 'lucide-react'
import type { FotogramaCrudo } from '@/domain/senas/normalizar'
import { crearExtractor, type Extractor } from '@/infrastructure/senas/extractor'
import { dibujarPuntos } from '@/ui/senas/dibujo'

type Estado =
  | { tipo: 'apagada' }
  | { tipo: 'iniciando'; mensaje: string }
  | { tipo: 'lista' }
  | { tipo: 'error'; mensaje: string }

export interface VistaPuntosProps {
  /** Se llama con cada fotograma extraído: aquí se conecta la grabación de muestras. */
  alFotograma?: (fotograma: FotogramaCrudo, tiempoMs: number) => void
  /** Se llama cuando el extractor está listo, con el delegado usado (GPU/CPU). */
  alListo?: (extractor: Extractor) => void
  /** Contenido sobre la cámara cuando está lista (p. ej. la cuenta regresiva). */
  superposicion?: ReactNode
}

export function VistaPuntos({ alFotograma, alListo, superposicion }: VistaPuntosProps) {
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [estado, setEstado] = useState<Estado>({ tipo: 'apagada' })
  const [ultimo, setUltimo] = useState<FotogramaCrudo | null>(null)
  const [fps, setFps] = useState(0)

  // Las funciones de props cambian en cada render; se guardan en una ref para el bucle.
  const callbacks = useRef({ alFotograma, alListo })
  useEffect(() => {
    callbacks.current = { alFotograma, alListo }
  })

  const [encendida, setEncendida] = useState(false)

  useEffect(() => {
    const elementoVideo = video.current
    const elementoLienzo = lienzo.current
    if (!encendida || !elementoVideo || !elementoLienzo) return
    // Constantes con tipo no nulo: las funciones internas las usan sin comprobar de nuevo.
    const v: HTMLVideoElement = elementoVideo
    const c: HTMLCanvasElement = elementoLienzo
    let cancelado = false
    let flujo: MediaStream | null = null
    let extractor: Extractor | null = null
    let cuadro = 0

    async function iniciar() {
      try {
        setEstado({ tipo: 'iniciando', mensaje: 'Esperando permiso de cámara…' })
        flujo = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelado) return
        v.srcObject = flujo
        await v.play()

        setEstado({ tipo: 'iniciando', mensaje: 'Cargando MediaPipe…' })
        extractor = await crearExtractor()
        if (cancelado) return
        callbacks.current.alListo?.(extractor)
        setEstado({ tipo: 'lista' })
        bucle()
      } catch (error) {
        if (cancelado) return
        const nombre = error instanceof DOMException ? error.name : ''
        setEstado({
          tipo: 'error',
          mensaje:
            nombre === 'NotAllowedError'
              ? 'Permiso de cámara denegado. Actívalo en el navegador.'
              : nombre === 'NotFoundError'
                ? 'No se encontró una cámara.'
                : nombre === 'NotReadableError'
                  ? 'La cámara está ocupada por otra aplicación.'
                  : `No se pudo iniciar: ${error instanceof Error ? error.message : String(error)}`,
        })
      }
    }

    let ultimoVideo = -1
    let contados = 0
    let inicioConteo = performance.now()

    function bucle() {
      if (cancelado || !extractor) return
      // Solo procesa cuando la cámara entregó un fotograma nuevo.
      if (v.currentTime !== ultimoVideo && v.videoWidth > 0) {
        ultimoVideo = v.currentTime
        const tiempo = performance.now()
        const fotograma = extractor.extraer(v, tiempo)
        dibujarPuntos(c, fotograma, v.videoWidth, v.videoHeight)
        callbacks.current.alFotograma?.(fotograma, tiempo)
        setUltimo(fotograma)

        contados++
        if (tiempo - inicioConteo >= 1000) {
          setFps(Math.round((contados * 1000) / (tiempo - inicioConteo)))
          contados = 0
          inicioConteo = tiempo
        }
      }
      cuadro = requestAnimationFrame(bucle)
    }

    iniciar()
    return () => {
      cancelado = true
      cancelAnimationFrame(cuadro)
      extractor?.cerrar()
      flujo?.getTracks().forEach((pista) => pista.stop()) // apaga la luz de la cámara
      v.srcObject = null
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height) // borra los últimos puntos dibujados
      setEstado({ tipo: 'apagada' })
      setUltimo(null)
    }
  }, [encendida])

  return (
    <section className="space-y-3">
      <div className="bg-tinta relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
        <video
          ref={video}
          className="absolute inset-0 size-full -scale-x-100 object-cover"
          muted
          playsInline
        />
        <canvas
          ref={lienzo}
          className="absolute inset-0 size-full -scale-x-100 object-cover"
          aria-hidden
        />

        {estado.tipo === 'lista' && superposicion}
        {estado.tipo !== 'lista' && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
            {estado.tipo === 'apagada' && (
              <button
                onClick={() => setEncendida(true)}
                className="bg-marca hover:bg-marca-oscuro flex min-h-12 items-center gap-2 rounded-full px-6 py-3 font-semibold"
              >
                <Camera size={22} aria-hidden /> Activar cámara
              </button>
            )}
            {estado.tipo === 'iniciando' && (
              <p className="flex items-center gap-2" role="status">
                <LoaderCircle className="animate-spin" size={22} aria-hidden /> {estado.mensaje}
              </p>
            )}
            {estado.tipo === 'error' && (
              <div role="alert" className="space-y-3">
                <p>{estado.mensaje}</p>
                <button onClick={() => setEncendida(false)} className="underline">
                  Volver a intentar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {estado.tipo === 'lista' && (
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium" role="status">
          <Indicador ok={ultimo?.pose != null} texto="Hombros visibles" />
          <Indicador ok={ultimo?.manoDerecha != null} texto="Mano derecha" color="bg-marca" />
          <Indicador
            ok={ultimo?.manoIzquierda != null}
            texto="Mano izquierda"
            color="bg-[#f4a86a]"
          />
          <span className="text-tinta/60 ml-auto">{fps} fps</span>
          <button
            onClick={() => setEncendida(false)}
            className="text-tinta/70 hover:text-tinta flex items-center gap-1"
          >
            <CameraOff size={16} aria-hidden /> Apagar
          </button>
        </div>
      )}
    </section>
  )
}

function Indicador({
  ok,
  texto,
  color = 'bg-white',
}: {
  ok: boolean
  texto: string
  color?: string
}) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 ring-1 ${
        ok ? 'ring-cruz bg-cruz/10' : 'opacity-60 ring-black/10'
      }`}
    >
      <span className={`size-2.5 rounded-full ring-1 ring-black/20 ${color}`} aria-hidden />
      {texto} {ok ? '✓' : '✗'}
    </span>
  )
}
