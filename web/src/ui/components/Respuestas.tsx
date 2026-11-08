import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { Camera, Check, CircleHelp, List, PersonStanding } from 'lucide-react'
import type { Opcion, Origen, Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { VALOR_OTRA } from '@/domain/banco/esquema'
import { ETIQUETA_OTRA, urlPublica } from '@/ui/consulta/recursos'
import type { Cuerpo3DProps } from './Cuerpo3D/Cuerpo3D'

/** three.js y el modelo se descargan solo al llegar a P2. Si la descarga falla, se usa la lista. */
const Cuerpo3D = lazy<ComponentType<Cuerpo3DProps>>(() =>
  import('./Cuerpo3D/Cuerpo3D').catch(() => ({ default: FalloDeCarga })),
)

function FalloDeCarga({ alFallar }: Cuerpo3DProps) {
  useEffect(alFallar, [alFallar])
  return null
}

let webGL: boolean | undefined
function hayWebGL(): boolean {
  if (webGL === undefined) {
    try {
      const lienzo = document.createElement('canvas')
      webGL = Boolean(lienzo.getContext('webgl2') ?? lienzo.getContext('webgl'))
    } catch {
      webGL = false
    }
  }
  return webGL
}

interface RespuestasProps {
  pregunta: Pregunta
  alResponder: (respuesta: RespuestaProvisional) => void
}

/**
 * Respuestas táctiles (OPC). Cada opción sale del banco y produce un valor permitido.
 * - "sena" y "opciones": botones con pictograma.
 * - "escala": la intensidad se distingue por la cantidad de barras, no solo por color (OPC2).
 * - "cuerpo": cuerpo 3D (CUE1), con la lista de zonas como respaldo y alternativa (CUE2).
 * La respuesta queda provisional: la persona la confirma después con ✓.
 */
export function Respuestas({ pregunta, alResponder }: RespuestasProps) {
  const origen: Origen = pregunta.tipo === 'cuerpo' ? 'cuerpo' : 'tactil'
  const proponer = (valor: string | string[]) =>
    alResponder({ preguntaId: pregunta.id, valor, origen })

  return (
    <div className="flex flex-col gap-4">
      {pregunta.tipo === 'sena' && (
        <p className="text-tinta/70 flex items-center gap-2 text-sm">
          <Camera size={20} aria-hidden /> Responder con señas: reconocimiento pendiente. Toca una
          opción.
        </p>
      )}

      {pregunta.multiple ? (
        <OpcionesMultiples opciones={pregunta.opciones} alListo={proponer} />
      ) : pregunta.tipo === 'escala' ? (
        <Escala opciones={pregunta.opciones} alElegir={proponer} />
      ) : pregunta.tipo === 'cuerpo' ? (
        <RespuestaCuerpo opciones={pregunta.opciones} alElegir={proponer} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {pregunta.opciones.map((o) => (
            <BotonOpcion key={o.valor} opcion={o} onClick={() => proponer(o.valor)} />
          ))}
        </div>
      )}

      {pregunta.permiteOtra && (
        <button
          type="button"
          onClick={() => proponer(VALOR_OTRA)}
          className="text-tinta rounded-boton bg-superficie flex min-h-14 items-center justify-center gap-2 border-2 border-dashed border-black/20 font-semibold"
        >
          <CircleHelp size={26} aria-hidden /> {ETIQUETA_OTRA}
        </button>
      )}
    </div>
  )
}

/**
 * P2: el cuerpo 3D si el dispositivo puede mostrarlo; si no, o si la persona lo prefiere,
 * la lista de zonas. La lista sirve también para teclado y lectores de pantalla.
 */
function RespuestaCuerpo({
  opciones,
  alElegir,
}: {
  opciones: Opcion[]
  alElegir: (valor: string) => void
}) {
  const [modo, setModo] = useState<'3d' | 'lista'>(() => (hayWebGL() ? '3d' : 'lista'))
  const cambiar = (
    <button
      type="button"
      onClick={() => setModo(modo === '3d' ? 'lista' : '3d')}
      className="text-marca flex min-h-12 items-center justify-center gap-2 font-semibold underline"
    >
      {modo === '3d' ? <List size={22} aria-hidden /> : <PersonStanding size={22} aria-hidden />}
      {modo === '3d' ? 'Elegir de una lista' : 'Ver el cuerpo en 3D'}
    </button>
  )

  if (modo === 'lista') {
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          {opciones.map((o) => (
            <BotonOpcion key={o.valor} opcion={o} onClick={() => alElegir(o.valor)} />
          ))}
        </div>
        {hayWebGL() && cambiar}
      </div>
    )
  }

  const valores = new Set(opciones.map((o) => o.valor))
  return (
    <div className="flex flex-col gap-3">
      <Suspense fallback={<p className="text-tinta/70 py-24 text-center">Cargando cuerpo 3D…</p>}>
        <Cuerpo3D
          alTocar={(zona) => valores.has(zona) && alElegir(zona)}
          alFallar={() => setModo('lista')}
        />
      </Suspense>
      {cambiar}
    </div>
  )
}

function BotonOpcion({
  opcion,
  onClick,
  seleccionada,
}: {
  opcion: Opcion
  onClick: () => void
  seleccionada?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionada}
      className={`rounded-boton bg-superficie text-tinta flex min-h-20 flex-col items-center justify-center gap-2 p-3 text-lg font-semibold shadow-sm ring-2 transition ${
        seleccionada ? 'ring-marca bg-marca/10' : 'hover:ring-marca-claro ring-black/10'
      }`}
    >
      {opcion.pictograma && (
        <img src={urlPublica(opcion.pictograma)} alt="" className="size-20 object-contain" />
      )}
      <span className="flex items-center gap-1.5">
        {seleccionada && <Check size={20} strokeWidth={3} aria-hidden />}
        {opcion.etiqueta}
      </span>
    </button>
  )
}

function Escala({ opciones, alElegir }: { opciones: Opcion[]; alElegir: (valor: string) => void }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}
    >
      {opciones.map((o, i) => (
        <button
          key={o.valor}
          type="button"
          onClick={() => alElegir(o.valor)}
          className="rounded-boton bg-superficie text-tinta hover:ring-marca-claro flex min-h-36 flex-col items-center justify-end gap-3 p-3 text-lg font-semibold shadow-sm ring-2 ring-black/10"
        >
          <Barras llenas={i + 1} total={opciones.length} />
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

/** Barras de altura creciente: "leve" llena 1, "fuerte" llena todas. */
export function Barras({ llenas, total }: { llenas: number; total: number }) {
  return (
    <span className="flex h-16 items-end gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`w-4 rounded-full ${i < llenas ? 'bg-marca' : 'bg-black/10'}`}
          style={{ height: `${((i + 1) / total) * 100}%` }}
        />
      ))}
    </span>
  )
}

function OpcionesMultiples({
  opciones,
  alListo,
}: {
  opciones: Opcion[]
  alListo: (valores: string[]) => void
}) {
  const [elegidas, setElegidas] = useState<string[]>([])
  const alternar = (valor: string) =>
    setElegidas((actual) =>
      actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor],
    )
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        {opciones.map((o) => (
          <BotonOpcion
            key={o.valor}
            opcion={o}
            seleccionada={elegidas.includes(o.valor)}
            onClick={() => alternar(o.valor)}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={elegidas.length === 0}
        onClick={() => alListo(elegidas)}
        className="bg-marca rounded-boton min-h-14 font-semibold text-white disabled:opacity-40"
      >
        Listo
      </button>
    </div>
  )
}
