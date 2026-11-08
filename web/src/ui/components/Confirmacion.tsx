import { Check, CircleHelp, X } from 'lucide-react'
import type { Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { etiquetaDe, opcionDe, urlPublica } from '@/ui/consulta/recursos'
import { Barras } from './Respuestas'

interface ConfirmacionProps {
  pregunta: Pregunta
  provisional: RespuestaProvisional
  alConfirmar: () => void
  alDescartar: () => void
}

/**
 * Confirmación (CON). MARI devuelve lo que entendió con el pictograma, las barras o la zona,
 * y la persona decide:
 * - ✓ guarda la respuesta y avanza. Un segundo toque no hace nada: la consulta ya no tiene
 *   provisional (CON3).
 * - ✗ la descarta y vuelve a las opciones.
 * ✓ y ✗ se distinguen por forma, color y nombre accesible (CON2).
 */
export function Confirmacion({
  pregunta,
  provisional,
  alConfirmar,
  alDescartar,
}: ConfirmacionProps) {
  const valores = Array.isArray(provisional.valor) ? provisional.valor : [provisional.valor]
  return (
    <section aria-label="Confirmar respuesta" className="flex flex-col items-center gap-6">
      <ul className="flex flex-wrap justify-center gap-3">
        {valores.map((valor) => (
          <li key={valor}>
            <LoEntendido pregunta={pregunta} valor={valor} />
          </li>
        ))}
      </ul>
      <div className="grid w-full grid-cols-2 gap-3">
        <button
          type="button"
          onClick={alConfirmar}
          aria-label="Sí, es eso"
          className="bg-cruz grid h-24 place-items-center rounded-3xl text-white shadow-md"
        >
          <Check size={56} strokeWidth={3} aria-hidden />
        </button>
        <button
          type="button"
          onClick={alDescartar}
          aria-label="No, cambiar"
          className="bg-superficie text-alerta grid h-24 place-items-center rounded-3xl ring-2 ring-black/10"
        >
          <X size={56} strokeWidth={3} aria-hidden />
        </button>
      </div>
    </section>
  )
}

function LoEntendido({ pregunta, valor }: { pregunta: Pregunta; valor: string }) {
  const opcion = opcionDe(pregunta, valor)
  const etiqueta = etiquetaDe(pregunta, valor)
  const posicion = pregunta.opciones.findIndex((o) => o.valor === valor)

  return (
    <figure className="bg-superficie flex min-w-40 flex-col items-center gap-3 rounded-3xl p-5 shadow-md ring-1 ring-black/5">
      {opcion?.videoRespuesta ? (
        <video
          src={urlPublica(opcion.videoRespuesta)}
          className="size-40 rounded-2xl object-cover"
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : opcion?.pictograma ? (
        <img src={urlPublica(opcion.pictograma)} alt="" className="size-40 object-contain" />
      ) : pregunta.tipo === 'escala' && posicion >= 0 ? (
        <Barras llenas={posicion + 1} total={pregunta.opciones.length} />
      ) : !opcion ? (
        <CircleHelp size={72} aria-hidden className="text-tinta/60" />
      ) : null}
      <figcaption className="text-2xl font-bold">{etiqueta}</figcaption>
    </figure>
  )
}
