import { Check, CircleHelp, X } from 'lucide-react'
import type { Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { Boton } from '@/ui/components/base/Boton'
import { tarjeta } from '@/ui/components/base/estilos'
import { etiquetaDe, opcionDe, urlPublica } from '@/ui/consulta/recursos'
import { Simbolo } from './simbolos/Simbolo'
import { simboloDe } from './simbolos/simbolos'

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
 * ✓ y ✗ se distinguen por forma, color e ícono, y su texto es también su nombre accesible (CON2).
 */
export function Confirmacion({
  pregunta,
  provisional,
  alConfirmar,
  alDescartar,
}: ConfirmacionProps) {
  const valores = Array.isArray(provisional.valor) ? provisional.valor : [provisional.valor]
  return (
    <section aria-label="Confirmar respuesta" className={`${tarjeta} flex flex-col gap-6 p-6`}>
      <h2 className="text-center text-xl">¿Es correcto?</h2>
      <ul className="flex flex-wrap justify-center gap-4">
        {valores.map((valor) => (
          <li key={valor}>
            <LoEntendido pregunta={pregunta} valor={valor} />
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        {/* Ícono grande arriba y texto debajo: se entiende sin leer y el texto siempre cabe. */}
        <Boton variante="exito" tamano="xl" className={botonDecision} onClick={alConfirmar}>
          <Check size={40} strokeWidth={2.5} aria-hidden /> Sí, es correcto
        </Boton>
        <Boton variante="secundario" tamano="xl" className={botonDecision} onClick={alDescartar}>
          <X size={40} strokeWidth={2.5} aria-hidden className="text-alerta" /> No, cambiar
        </Boton>
      </div>
    </section>
  )
}

const botonDecision = 'h-auto min-h-28 flex-col gap-2 px-3 py-4 text-lg whitespace-normal'

/** Lo que MARI entendió, con el mismo símbolo que la opción elegida (o el video de la seña). */
function LoEntendido({ pregunta, valor }: { pregunta: Pregunta; valor: string }) {
  const opcion = opcionDe(pregunta, valor)
  const etiqueta = etiquetaDe(pregunta, valor)
  const simbolo = simboloDe(pregunta, valor)

  return (
    <figure className="flex min-w-44 flex-col items-center gap-3">
      <div className="bg-marca-suave grid size-40 place-items-center rounded-2xl">
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
        ) : simbolo ? (
          <Simbolo simbolo={simbolo} tamano="lg" />
        ) : (
          <CircleHelp size={64} strokeWidth={1.5} aria-hidden className="text-tinta-suave" />
        )}
      </div>
      <figcaption className="font-display text-2xl font-semibold">{etiqueta}</figcaption>
    </figure>
  )
}
