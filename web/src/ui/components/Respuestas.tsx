import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react'
import { ArrowRight, Camera, Check, CircleHelp, Eraser, Hand } from 'lucide-react'
import type { Opcion, Origen, Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { VALOR_OTRA } from '@/domain/banco/esquema'
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
import { ETIQUETA_OTRA } from '@/ui/consulta/recursos'
import type { Cuerpo3DProps } from './Cuerpo3D/Cuerpo3D'
import { Barras, SiluetaZona, Simbolo } from './simbolos/Simbolo'
import { simboloDe } from './simbolos/simbolos'

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
  /** Hay cámara para responder con señas: las opciones táctiles son la alternativa. */
  conCamara?: boolean
}

/**
 * Respuestas táctiles (OPC). Cada opción sale del banco y produce un valor permitido.
 * Toda opción lleva un símbolo (pictograma, silueta, días o barras) para quien no lee;
 * el texto acompaña y es el nombre accesible del botón.
 * - "escala": la intensidad se distingue por la cantidad de barras, no solo por color (OPC2).
 * - "cuerpo": cuerpo 3D (CUE1), con la lista de zonas como respaldo y alternativa (CUE2).
 * La respuesta queda provisional: la persona la confirma después con ✓.
 */
export function Respuestas({ pregunta, alResponder, conCamara = false }: RespuestasProps) {
  const origen: Origen = pregunta.tipo === 'cuerpo' ? 'cuerpo' : 'tactil'
  const proponer = (valor: string | string[]) =>
    alResponder({ preguntaId: pregunta.id, valor, origen })

  return (
    <div className="flex flex-col gap-3">
      {pregunta.multiple ? (
        <OpcionesMultiples pregunta={pregunta} alListo={proponer} />
      ) : pregunta.tipo === 'escala' ? (
        <Escala opciones={pregunta.opciones} alElegir={proponer} />
      ) : pregunta.tipo === 'cuerpo' ? (
        <RespuestaCuerpo pregunta={pregunta} alElegir={proponer} />
      ) : (
        <GrillaOpciones pregunta={pregunta} alElegir={proponer} />
      )}

      {pregunta.permiteOtra && (
        <Boton
          variante="secundario"
          tamano="lg"
          className="h-auto min-h-16 py-2"
          onClick={() => proponer(VALOR_OTRA)}
        >
          <CircleHelp size={36} strokeWidth={1.75} aria-hidden className="text-tinta-suave" />
          {ETIQUETA_OTRA}
        </Boton>
      )}

      {pregunta.tipo === 'sena' && (
        <p className="text-tinta-suave mt-1 flex items-center gap-2 text-sm">
          {conCamara ? (
            <>
              <Hand size={16} aria-hidden /> O toca una opción.
            </>
          ) : (
            <>
              <Camera size={16} aria-hidden /> Responder con señas estará disponible pronto.
            </>
          )}
        </p>
      )}
    </div>
  )
}

function GrillaOpciones({
  pregunta,
  alElegir,
  elegidas,
}: {
  pregunta: Pregunta
  alElegir: (valor: string) => void
  elegidas?: string[]
}) {
  const { opciones } = pregunta
  return (
    <div
      className={cn(
        'grid gap-3',
        opciones.length > 4 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2',
      )}
    >
      {opciones.map((o) => (
        <BotonOpcion
          key={o.valor}
          pregunta={pregunta}
          opcion={o}
          seleccionada={elegidas?.includes(o.valor)}
          onClick={() => alElegir(o.valor)}
        />
      ))}
    </div>
  )
}

function BotonOpcion({
  pregunta,
  opcion,
  onClick,
  seleccionada,
}: {
  pregunta: Pregunta
  opcion: Opcion
  onClick: () => void
  seleccionada?: boolean | undefined
}) {
  const simbolo = simboloDe(pregunta, opcion.valor)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={seleccionada}
      className={cn(
        'rounded-tarjeta border-borde bg-superficie text-tinta shadow-tarjeta relative flex min-h-36 flex-col items-center justify-center gap-2 border p-4 font-medium transition-colors',
        'hover:border-marca hover:bg-marca-suave/50',
        seleccionada && 'border-marca bg-marca-suave ring-marca ring-1',
      )}
    >
      {simbolo && <Simbolo simbolo={simbolo} />}
      <span className="text-center text-lg leading-tight">{opcion.etiqueta}</span>
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
 * P2 "¿Dónde te duele?": el cuerpo 3D y la lista de zonas, sincronizados.
 * - Tocar el cuerpo o una zona de la lista solo ELIGE; "Revisar respuesta" la propone y
 *   lleva a la confirmación. Así la persona puede corregir antes.
 * - Sin WebGL (o si el modelo no carga) queda solo la lista (CUE2). La lista también sirve
 *   para teclado y lectores de pantalla.
 */
function RespuestaCuerpo({
  pregunta,
  alElegir,
}: {
  pregunta: Pregunta
  alElegir: (valor: string) => void
}) {
  const [con3D, setCon3D] = useState(hayWebGL)
  const [elegida, setElegida] = useState<string | null>(null)
  const valores = new Set(pregunta.opciones.map((o) => o.valor))
  const opcionElegida = pregunta.opciones.find((o) => o.valor === elegida)

  return (
    <div className="flex flex-col gap-4">
      {con3D && (
        <div className="rounded-tarjeta border-borde bg-superficie shadow-tarjeta overflow-hidden border">
          <Suspense
            fallback={
              <p className="text-tinta-suave grid min-h-96 place-items-center">
                Cargando cuerpo 3D…
              </p>
            }
          >
            <Cuerpo3D
              zona={elegida}
              alTocar={(zona) => valores.has(zona) && setElegida(zona)}
              alFallar={() => setCon3D(false)}
            />
          </Suspense>
          <div
            className="flex flex-col items-center gap-1 px-4 py-3 text-center"
            aria-live="polite"
          >
            {opcionElegida ? (
              <span className="flex items-center gap-2 text-lg font-semibold">
                <span className="size-3 rounded-full bg-[#e8743b]" aria-hidden />
                {opcionElegida.etiqueta}
              </span>
            ) : (
              <span className="text-tinta-suave">Toca el cuerpo o elige una zona de la lista.</span>
            )}
            <span className="text-tinta-suave text-xs">
              La zona es aproximada: revísala antes de enviar. Derecha e izquierda corresponden a tu
              cuerpo.
            </span>
          </div>
        </div>
      )}

      <ListaZonas pregunta={pregunta} elegida={elegida} alElegir={setElegida} />

      <div className="border-borde flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Boton
          variante="fantasma"
          tamano="md"
          className="px-3"
          disabled={!elegida}
          onClick={() => setElegida(null)}
        >
          <Eraser size={18} aria-hidden /> Borrar selección
        </Boton>
        <Boton
          tamano="lg"
          className="ml-auto"
          disabled={!elegida}
          onClick={() => elegida && alElegir(elegida)}
        >
          Revisar respuesta <ArrowRight size={20} aria-hidden />
        </Boton>
      </div>
    </div>
  )
}

/** Zonas en dos columnas compactas, cada una con su silueta (para quien no lee). */
function ListaZonas({
  pregunta,
  elegida,
  alElegir,
}: {
  pregunta: Pregunta
  elegida: string | null
  alElegir: (valor: string) => void
}) {
  return (
    <div role="group" aria-label="Zonas del cuerpo" className="grid grid-cols-2 gap-2">
      {pregunta.opciones.map((o) => {
        const simbolo = simboloDe(pregunta, o.valor)
        const marcada = elegida === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={marcada}
            onClick={() => alElegir(o.valor)}
            className={cn(
              'border-borde bg-superficie text-tinta flex min-h-16 items-center gap-3 rounded-xl border px-3 text-left font-medium transition-colors',
              'hover:border-marca',
              marcada && 'border-marca bg-marca-suave ring-marca ring-1',
            )}
          >
            {simbolo?.tipo === 'zona' && <SiluetaZona zona={simbolo.zona} className="h-12" />}
            <span className="flex-1 leading-tight">{o.etiqueta}</span>
            {marcada && <Check size={20} strokeWidth={2.5} className="text-marca" aria-hidden />}
          </button>
        )
      })}
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

function OpcionesMultiples({
  pregunta,
  alListo,
}: {
  pregunta: Pregunta
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
      <GrillaOpciones pregunta={pregunta} alElegir={alternar} elegidas={elegidas} />
      <Boton
        tamano="lg"
        ancho="completo"
        disabled={elegidas.length === 0}
        onClick={() => alListo(elegidas)}
      >
        <Check size={22} aria-hidden /> Listo
      </Boton>
    </div>
  )
}
