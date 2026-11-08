/**
 * Repreguntar (BUS1, BUS2). El profesional escribe una pregunta con sus palabras; MARI sugiere
 * los videos LSP validados más parecidos y el profesional elige y confirma cuál enviar.
 *
 * - Nunca se elige solo: no hay sugerencia preseleccionada.
 * - Sin coincidencia: se orienta a pedir interpretación. MARI no genera señas ni traduce texto.
 * - La pregunta escrita no sale del dispositivo.
 */
import { useId, useState, type FormEvent } from 'react'
import { Check, Languages, Search, Send, TriangleAlert, X } from 'lucide-react'
import type { Sugerencia } from '@/application/puertos/buscador'
import type { Buscador } from '@/application/puertos/buscador'
import type { Pregunta } from '@/domain/banco/tipos'
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
import { tarjeta } from '@/ui/components/base/estilos'
import { useBanco, useConsulta } from '@/ui/consulta/contexto'
import { etiquetaDe } from '@/ui/consulta/recursos'

interface RepreguntarProps {
  buscador: Buscador
  alCancelar: () => void
  /** La repregunta se envió: la tablet vuelve a la persona. */
  alEnviar: () => void
}

type Resultado = { metodo: 'semantico' | 'texto'; sugerencias: Sugerencia[] }

export function Repreguntar({ buscador, alCancelar, alEnviar }: RepreguntarProps) {
  const banco = useBanco()
  const { respuestas, enviarRepregunta } = useConsulta()
  const [texto, setTexto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [elegida, setElegida] = useState<string | null>(null)
  const [sintoma, setSintoma] = useState('')
  const idCampo = useId()
  const idSintoma = useId()

  const pregunta = (id: string): Pregunta | undefined => banco.preguntas.find((p) => p.id === id)
  const sintomas = sintomasReferidos(banco.preguntas, respuestas)

  async function buscar(e: FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setBuscando(true)
    setElegida(null)
    try {
      setResultado(await buscador.buscar(texto))
    } finally {
      setBuscando(false)
    }
  }

  function enviar() {
    if (!elegida) return
    enviarRepregunta(elegida, sintoma || undefined)
    alEnviar()
  }

  return (
    <section
      aria-labelledby="repreguntar-titulo"
      className={cn(tarjeta, 'flex flex-col gap-5 p-6')}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="repreguntar-titulo" className="text-2xl">
            Repreguntar
          </h2>
          <p className="text-tinta-suave">
            Escribe tu pregunta. MARI busca entre los videos LSP validados; tú eliges cuál enviar.
          </p>
        </div>
        <Boton variante="fantasma" tamano="md" onClick={alCancelar}>
          <X size={20} aria-hidden /> Cancelar
        </Boton>
      </div>

      <form onSubmit={buscar} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor={idCampo} className="sr-only">
          Tu pregunta
        </label>
        <input
          id={idCampo}
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Por ejemplo: ¿desde cuándo tiene la fiebre?"
          autoComplete="off"
          className="border-borde focus:border-marca bg-superficie min-h-14 flex-1 rounded-xl border px-4 text-lg outline-none"
        />
        <Boton type="submit" tamano="lg" disabled={!texto.trim() || buscando}>
          <Search size={20} aria-hidden /> Buscar
        </Boton>
      </form>

      {resultado && resultado.sugerencias.length === 0 && (
        <p
          role="alert"
          className="border-aviso/30 bg-aviso-suave flex items-start gap-3 rounded-xl border p-4"
        >
          <Languages size={22} className="text-aviso shrink-0" aria-hidden />
          <span>
            <strong className="block">No hay video para esta pregunta.</strong>
            Solicite apoyo de interpretación.
          </span>
        </p>
      )}

      {resultado && resultado.sugerencias.length > 0 && (
        <fieldset className="flex flex-col gap-3">
          <legend className="text-tinta-suave mb-2 text-sm font-semibold tracking-wide uppercase">
            Videos sugeridos
          </legend>
          {resultado.sugerencias.map((s) => {
            const p = pregunta(s.preguntaId)
            if (!p) return null
            const marcada = elegida === s.preguntaId
            return (
              <label
                key={s.preguntaId}
                className={cn(
                  'border-borde flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors',
                  'hover:border-marca',
                  marcada && 'border-marca bg-marca-suave ring-marca ring-1',
                )}
              >
                <input
                  type="radio"
                  name="repregunta"
                  value={s.preguntaId}
                  checked={marcada}
                  onChange={() => setElegida(s.preguntaId)}
                  className="accent-marca size-5 shrink-0"
                />
                <span className="flex-1 text-lg font-medium">{p.texto}</span>
                <Parecido similitud={s.similitud} />
              </label>
            )
          })}
          <p className="text-tinta-suave text-sm">
            {resultado.metodo === 'texto'
              ? 'Búsqueda por palabras clave, en este dispositivo.'
              : 'Búsqueda por significado, en este dispositivo.'}
          </p>
        </fieldset>
      )}

      {resultado && resultado.sugerencias.length > 0 && sintomas.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor={idSintoma} className="font-medium">
            ¿Sobre qué síntoma? <span className="text-tinta-suave font-normal">(opcional)</span>
          </label>
          <select
            id={idSintoma}
            value={sintoma}
            onChange={(e) => setSintoma(e.target.value)}
            className="border-borde bg-superficie min-h-12 rounded-xl border px-3 text-base"
          >
            <option value="">General</option>
            {sintomas.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.etiqueta}
              </option>
            ))}
          </select>
        </div>
      )}

      {resultado && resultado.sugerencias.length > 0 && (
        <div className="border-borde flex flex-wrap items-center gap-3 border-t pt-5">
          <Boton tamano="lg" onClick={enviar} disabled={!elegida}>
            <Send size={20} aria-hidden /> Enviar a la persona
          </Boton>
          <span className="text-tinta-suave flex items-center gap-2 text-sm">
            {elegida ? (
              <>
                <Check size={16} className="text-cruz" aria-hidden /> Luego entrega el dispositivo.
              </>
            ) : (
              <>
                <TriangleAlert size={16} aria-hidden /> Elige un video para enviarlo.
              </>
            )}
          </span>
        </div>
      )}
    </section>
  )
}

function Parecido({ similitud }: { similitud: number }) {
  const [texto, tono] =
    similitud >= 0.8
      ? ['Muy parecida', 'bg-marca-suave text-marca-oscuro']
      : similitud >= 0.6
        ? ['Parecida', 'bg-superficie-2 text-tinta']
        : ['Posible', 'bg-superficie-2 text-tinta-suave']
  return (
    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', tono)}>
      {texto}
    </span>
  )
}

/** Síntomas que la persona confirmó (respuestas a la pregunta que abre cada ciclo). */
function sintomasReferidos(
  preguntas: readonly Pregunta[],
  respuestas: readonly { preguntaId: string; valor: string | string[]; repregunta?: unknown }[],
): { valor: string; etiqueta: string }[] {
  const vistos = new Map<string, string>()
  for (const r of respuestas) {
    if (r.repregunta || Array.isArray(r.valor)) continue
    const p = preguntas.find((q) => q.id === r.preguntaId)
    if (p?.iniciaCiclo && !vistos.has(r.valor)) vistos.set(r.valor, etiquetaDe(p, r.valor))
  }
  return [...vistos].map(([valor, etiqueta]) => ({ valor, etiqueta }))
}
