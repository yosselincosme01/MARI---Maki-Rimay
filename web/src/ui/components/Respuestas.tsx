import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { Camera, Check, CircleHelp, List, PersonStanding } from 'lucide-react'
import type { Opcion, Origen, Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { VALOR_OTRA } from '@/domain/banco/esquema'
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
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
 * - Con pictograma: tarjetas con la imagen grande, para responder casi sin leer.
 * - Sin pictograma: filas de texto compactas.
 * - "escala": la intensidad se distingue por la cantidad de barras, no solo por color (OPC2).
 * - "cuerpo": cuerpo 3D (CUE1), con la lista de zonas como respaldo y alternativa (CUE2).
 * La respuesta queda provisional: la persona la confirma después con ✓.
 */
export function Respuestas({ pregunta, alResponder }: RespuestasProps) {
  const origen: Origen = pregunta.tipo === 'cuerpo' ? 'cuerpo' : 'tactil'
  const proponer = (valor: string | string[]) =>
    alResponder({ preguntaId: pregunta.id, valor, origen })

  return (
    <div className="flex flex-col gap-3">
      {pregunta.multiple ? (
        <OpcionesMultiples opciones={pregunta.opciones} alListo={proponer} />
      ) : pregunta.tipo === 'escala' ? (
        <Escala opciones={pregunta.opciones} alElegir={proponer} />
      ) : pregunta.tipo === 'cuerpo' ? (
        <RespuestaCuerpo opciones={pregunta.opciones} alElegir={proponer} />
      ) : (
        <GrillaOpciones opciones={pregunta.opciones} alElegir={proponer} />
      )}

      {pregunta.permiteOtra && (
        <Boton variante="secundario" tamano="lg" onClick={() => proponer(VALOR_OTRA)}>
          <CircleHelp size={22} aria-hidden /> {ETIQUETA_OTRA}
        </Boton>
      )}

      {pregunta.tipo === 'sena' && (
        <p className="text-tinta-suave mt-1 flex items-center gap-2 text-sm">
          <Camera size={16} aria-hidden /> Responder con señas estará disponible pronto.
        </p>
      )}
    </div>
  )
}

function GrillaOpciones({
  opciones,
  alElegir,
  elegidas,
}: {
  opciones: Opcion[]
  alElegir: (valor: string) => void
  elegidas?: string[]
}) {
  const conImagen = opciones.some((o) => o.pictograma)
  return (
    <div className={cn('grid gap-3', conImagen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
      {opciones.map((o) => (
        <BotonOpcion
          key={o.valor}
          opcion={o}
          conImagen={conImagen}
          seleccionada={elegidas?.includes(o.valor)}
          onClick={() => alElegir(o.valor)}
        />
      ))}
    </div>
  )
}

function BotonOpcion({
  opcion,
  conImagen,
  onClick,
  seleccionada,
}: {
  opcion: Opcion
  conImagen: boolean
  onClick: () => void
  seleccionada?: boolean | undefined
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionada}
      className={cn(
        'rounded-tarjeta border-borde bg-superficie text-tinta shadow-tarjeta relative flex items-center border font-medium transition-colors',
        'hover:border-marca hover:bg-marca-suave/50',
        conImagen ? 'min-h-36 flex-col justify-center gap-2 p-4' : 'min-h-20 gap-3 px-5 text-left',
        seleccionada && 'border-marca bg-marca-suave ring-marca ring-1',
      )}
    >
      {opcion.pictograma && (
        <img src={urlPublica(opcion.pictograma)} alt="" className="size-20 object-contain" />
      )}
      <span className="text-lg">{opcion.etiqueta}</span>
      {seleccionada && (
        <Check
          size={20}
          strokeWidth={2.5}
          aria-hidden
          className="bg-marca absolute top-2.5 right-2.5 rounded-full p-0.5 text-white"
        />
      )}
    </button>
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
    <Boton variante="fantasma" tamano="md" onClick={() => setModo(modo === '3d' ? 'lista' : '3d')}>
      {modo === '3d' ? <List size={20} aria-hidden /> : <PersonStanding size={20} aria-hidden />}
      {modo === '3d' ? 'Elegir de una lista' : 'Ver el cuerpo en 3D'}
    </Boton>
  )

  if (modo === 'lista') {
    return (
      <div className="flex flex-col gap-3">
        <GrillaOpciones opciones={opciones} alElegir={alElegir} />
        {hayWebGL() && cambiar}
      </div>
    )
  }

  const valores = new Set(opciones.map((o) => o.valor))
  return (
    <div className="flex flex-col gap-2">
      <Suspense
        fallback={
          <p className="rounded-tarjeta border-borde bg-superficie text-tinta-suave grid aspect-[3/4] place-items-center border">
            Cargando cuerpo 3D…
          </p>
        }
      >
        <Cuerpo3D
          alTocar={(zona) => valores.has(zona) && alElegir(zona)}
          alFallar={() => setModo('lista')}
        />
      </Suspense>
      {cambiar}
    </div>
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
          className="rounded-tarjeta border-borde bg-superficie text-tinta shadow-tarjeta hover:border-marca hover:bg-marca-suave/50 flex min-h-40 flex-col items-center justify-end gap-4 border p-4 text-lg font-medium transition-colors"
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
          className={cn('w-3.5 rounded-sm', i < llenas ? 'bg-marca' : 'bg-superficie-2')}
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
      <p className="text-tinta-suave text-sm">Puedes elegir más de una.</p>
      <GrillaOpciones opciones={opciones} alElegir={alternar} elegidas={elegidas} />
      <Boton
        tamano="lg"
        ancho="completo"
        disabled={elegidas.length === 0}
        onClick={() => alListo(elegidas)}
      >
        Listo
      </Boton>
    </div>
  )
}
