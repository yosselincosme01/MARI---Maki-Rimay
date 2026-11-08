/**
 * Responder con señas frente a la cámara (SEN en la vista paciente).
 *
 * Escucha las inferencias del `Reconocedor` y aplica `decidirSena()`. Si la seña es una opción
 * de la pregunta, la PROPONE: la persona la confirma con ✓ como cualquier otra respuesta.
 * Mientras se confirma, no escucha (una seña que se cuele no cambia la respuesta).
 *
 * La cámara se enciende solo al pulsar "Activar cámara" y se apaga al salir (M7).
 */
import { useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, FlaskConical, Hand, LoaderCircle, RotateCcw } from 'lucide-react'
import type { Reconocedor } from '@/application/puertos/reconocedor'
import type { EstadoCamara, Inferencia } from '@/application/puertos/tipos'
import type { Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { decidirSena } from '@/domain/senas/decision'
import { dibujarPuntos } from '@/ui/senas/dibujo'

export interface CamaraSenasProps {
  reconocedor: Reconocedor
  pregunta: Pregunta
  alResponder: (respuesta: RespuestaProvisional) => void
  /** false mientras la persona confirma: no se proponen señas nuevas. */
  escuchando: boolean
  /** La activación se recuerda entre preguntas, así no hay que activarla cada vez. */
  activa: boolean
  alActivar: () => void
  alApagar: () => void
  /** Modo presentación: muestra que el reconocimiento es simulado. */
  simulado: boolean
}

const PROBLEMAS: Partial<Record<EstadoCamara, string>> = {
  denegada: 'No hay permiso para usar la cámara.',
  'sin-camara': 'No se encontró una cámara.',
  ocupada: 'La cámara está ocupada por otra aplicación.',
  error: 'No se pudo encender la cámara.',
}

export function CamaraSenas(props: CamaraSenasProps) {
  const { reconocedor, pregunta, activa, alActivar, alApagar, simulado } = props
  const video = useRef<HTMLVideoElement>(null)
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [estado, setEstado] = useState<EstadoCamara>('inactiva')
  /** El aviso pertenece a una pregunta: al pasar a otra, deja de mostrarse solo. */
  const [aviso, setAviso] = useState<{ preguntaId: string; texto: string } | null>(null)

  // Los callbacks cambian en cada render; el efecto de escucha usa siempre los últimos.
  const ultimos = useRef(props)
  useEffect(() => {
    ultimos.current = props
  })

  // Encender y apagar la cámara.
  useEffect(() => {
    const v = video.current
    if (!activa || !v) return
    const dejarEstado = reconocedor.alCambiarEstado(setEstado)
    const dejarPuntos = reconocedor.alFotograma?.((f) => {
      const c = lienzo.current
      if (c && v.videoWidth > 0) dibujarPuntos(c, f, v.videoWidth, v.videoHeight)
    })
    void reconocedor.iniciar(v)
    return () => {
      dejarEstado()
      dejarPuntos?.()
      reconocedor.detener()
      setEstado('inactiva')
    }
  }, [activa, reconocedor])

  // Escuchar señas para la pregunta actual. El historial empieza vacío en cada pregunta.
  useEffect(() => {
    if (!activa) return
    let historial: Inferencia[] = []
    return reconocedor.alInferir((inferencia) => {
      const { escuchando, pregunta: p, alResponder } = ultimos.current
      if (!escuchando) return
      historial = [...historial.slice(-9), inferencia]
      const clase = decidirSena(historial)
      if (!clase) return
      historial = []
      if (p.opciones.some((o) => o.valor === clase)) {
        setAviso(null)
        alResponder({ preguntaId: p.id, valor: clase, origen: 'sena' })
      } else {
        setAviso({ preguntaId: p.id, texto: 'Esa seña no es una respuesta de esta pregunta.' })
      }
    })
  }, [activa, reconocedor, pregunta.id])

  const problema = PROBLEMAS[estado]

  return (
    <section
      aria-label="Responder con señas"
      // Mientras se confirma, la cámara se achica (sin apagarse) para que ✓ y ✗ queden a la vista.
      className={`flex flex-col gap-2 transition-all ${props.escuchando ? 'w-full' : 'w-40 self-end'}`}
    >
      <div className="bg-tinta relative aspect-[4/3] w-full overflow-hidden rounded-3xl">
        {/* Se muestra como espejo, más natural para quien hace la seña. */}
        <video
          ref={video}
          muted
          playsInline
          className="absolute inset-0 size-full -scale-x-100 object-cover"
        />
        <canvas
          ref={lienzo}
          aria-hidden
          className="absolute inset-0 size-full -scale-x-100 object-cover"
        />

        {simulado && activa && (
          <span className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white">
            <FlaskConical size={14} aria-hidden />{' '}
            {props.escuchando ? 'Reconocimiento simulado (demo)' : 'Demo'}
          </span>
        )}

        <div
          className="absolute inset-0 grid place-items-center p-4 text-center text-white"
          role="status"
        >
          {!activa ? (
            <button
              type="button"
              onClick={alActivar}
              className="bg-marca hover:bg-marca-oscuro flex min-h-16 items-center gap-3 rounded-full px-7 text-lg font-semibold shadow-lg"
            >
              <Camera size={28} aria-hidden /> Activar cámara
            </button>
          ) : estado === 'esperando-permiso' ? (
            <p className="flex items-center gap-2 rounded-2xl bg-black/50 px-4 py-2">
              <Camera size={22} aria-hidden /> Permite usar la cámara
            </p>
          ) : estado === 'cargando-modelo' ? (
            <p className="flex items-center gap-2 rounded-2xl bg-black/50 px-4 py-2">
              <LoaderCircle className="animate-spin" size={22} aria-hidden /> Preparando…
            </p>
          ) : problema ? (
            <div className="space-y-3 rounded-2xl bg-black/60 p-4">
              <CameraOff size={40} className="mx-auto" aria-hidden />
              <p>{problema}</p>
              <p className="text-sm opacity-80">Responde tocando una opción.</p>
              <button
                type="button"
                onClick={alApagar}
                className="inline-flex items-center gap-1 underline"
              >
                <RotateCcw size={16} aria-hidden /> Volver a intentar
              </button>
            </div>
          ) : null}
        </div>

        {activa && estado === 'lista' && props.escuchando && (
          <p className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/60 to-transparent p-3 font-semibold text-white">
            <Hand size={22} aria-hidden /> Haz tu seña
          </p>
        )}
      </div>

      {activa && props.escuchando && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p role="status" className="text-alerta font-medium">
            {aviso?.preguntaId === pregunta.id ? aviso.texto : null}
          </p>
          <button
            type="button"
            onClick={alApagar}
            className="text-tinta-suave hover:text-tinta flex items-center gap-1"
          >
            <CameraOff size={16} aria-hidden /> Apagar cámara
          </button>
        </div>
      )}
    </section>
  )
}
