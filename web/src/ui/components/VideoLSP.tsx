import { useRef, useState } from 'react'
import { Pause, Play, RotateCcw, TriangleAlert, VideoOff } from 'lucide-react'
import { urlPublica } from '@/ui/consulta/recursos'

interface VideoLSPProps {
  /** Ruta relativa a public/, tal como viene del banco. */
  video: string
  /** Validado por una persona competente en LSP. */
  validado: boolean
  /** La pregunta escrita: nombre accesible y respaldo si el video no se muestra. */
  texto: string
  /** VITE_DEMO=true: los videos no validados se reproducen con una etiqueta (DEM1). */
  modoDemo: boolean
}

/**
 * Reproductor de la pregunta en LSP (VID, PAC2).
 * - Reproducir, pausar y repetir con botones grandes.
 * - Un video ausente o no validado se muestra como "video pendiente", salvo en modo demo.
 * Los videos no tienen audio: se reproducen silenciados y en bucle.
 */
export function VideoLSP({ video, validado, texto, modoDemo }: VideoLSPProps) {
  const [fallo, setFallo] = useState(false)
  if (fallo || (!validado && !modoDemo)) return <VideoPendiente texto={texto} />
  return (
    <Reproductor
      key={video}
      video={video}
      texto={texto}
      noValidado={!validado}
      alFallar={() => setFallo(true)}
    />
  )
}

function Reproductor({
  video,
  texto,
  noValidado,
  alFallar,
}: {
  video: string
  texto: string
  noValidado: boolean
  alFallar: () => void
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [reproduciendo, setReproduciendo] = useState(true)

  const reproducir = () => {
    // play() devuelve una promesa que falla si el navegador bloquea la reproducción.
    void ref.current?.play()?.catch(() => setReproduciendo(false))
  }
  const alternar = () => {
    const v = ref.current
    if (!v) return
    if (v.paused) reproducir()
    else v.pause()
  }
  const repetir = () => {
    const v = ref.current
    if (!v) return
    v.currentTime = 0
    reproducir()
  }

  return (
    <figure className="flex flex-col gap-3">
      <div className="bg-tinta relative overflow-hidden rounded-3xl">
        <video
          ref={ref}
          src={urlPublica(video)}
          aria-label={`Pregunta "${texto}" en Lengua de Señas Peruana`}
          className="aspect-[4/3] w-full object-contain"
          autoPlay
          muted
          loop
          playsInline
          onPlay={() => setReproduciendo(true)}
          onPause={() => setReproduciendo(false)}
          onError={alFallar}
        />
        {noValidado && (
          <span className="bg-alerta absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold text-white shadow">
            <TriangleAlert size={16} aria-hidden /> Video no validado
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={alternar}
          className="bg-superficie text-tinta rounded-boton flex min-h-14 items-center justify-center gap-2 font-semibold shadow-sm ring-1 ring-black/10"
        >
          {reproduciendo ? <Pause size={28} aria-hidden /> : <Play size={28} aria-hidden />}
          {reproduciendo ? 'Pausar' : 'Reproducir'}
        </button>
        <button
          type="button"
          onClick={repetir}
          className="bg-marca rounded-boton flex min-h-14 items-center justify-center gap-2 font-semibold text-white shadow-sm"
        >
          <RotateCcw size={28} aria-hidden /> Repetir
        </button>
      </div>
    </figure>
  )
}

function VideoPendiente({ texto }: { texto: string }) {
  return (
    <figure
      role="img"
      aria-label={`Video pendiente: ${texto}`}
      className="bg-superficie text-tinta/70 border-marca-claro flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border-4 border-dashed p-6 text-center"
    >
      <VideoOff size={56} aria-hidden />
      <span className="text-lg font-semibold">Video pendiente</span>
    </figure>
  )
}
