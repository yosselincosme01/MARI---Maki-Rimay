/**
 * "¿Qué quieres preguntar?" — modo conversación del profesional.
 *
 * El profesional escribe (o elige) una o varias preguntas; MARI las relaciona con los videos LSP
 * validados del banco y las envía en fila a la persona.
 *
 * - Nunca genera señas ni traduce texto a LSP: solo envía videos que ya existen.
 * - Lo que no tiene video se dice claramente y se orienta a pedir interpretación.
 * - Lo escrito no sale del dispositivo.
 */
import { useId, useMemo, useState, type FormEvent } from 'react'
import { Check, Languages, ListPlus, PlayCircle, Plus, Send, X } from 'lucide-react'
import type { Banco } from '@/domain/banco/tipos'
import { catalogo, interpretar } from '@/domain/conversacion/preguntas'
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
import { tarjeta } from '@/ui/components/base/estilos'
import { useBanco, useConsulta } from '@/ui/consulta/contexto'
import { etiquetaDe } from '@/ui/consulta/recursos'

export interface PreguntarProps {
  /** Las preguntas se enviaron: el dispositivo pasa a la persona. */
  alEnviar: () => void
}

export function Preguntar({ alEnviar }: PreguntarProps) {
  const banco = useBanco()
  const { respuestas, preguntar } = useConsulta()
  const [texto, setTexto] = useState('')
  const [cola, setCola] = useState<string[]>([])
  const [sintomaElegido, setSintomaElegido] = useState<string | null>(null)
  const idCampo = useId()
  const idSintoma = useId()

  const disponibles = useMemo(() => catalogo(banco), [banco])
  const interpretacion = useMemo(() => interpretar(texto, banco), [texto, banco])
  const porAgregar = interpretacion.flatMap((i) =>
    i.preguntaId && !cola.includes(i.preguntaId) ? [i.preguntaId] : [],
  )
  const sinVideo = interpretacion.filter((i) => i.preguntaId === null)

  const texto_ = (id: string) => banco.preguntas.find((p) => p.id === id)?.texto ?? id
  const respondida = (id: string) => respuestas.some((r) => r.preguntaId === id)

  // Síntomas referidos, del más reciente al más antiguo, para asociar los detalles.
  const sintomas = useSintomas(banco)
  const hayDetalle = cola.some((id) => rol(banco, id) === 'detalle')
  const abreSintoma = cola.some((id) => rol(banco, id) === 'sintoma')
  const elegirSintoma = hayDetalle && !abreSintoma && sintomas.length > 1
  const sintoma = sintomaElegido ?? sintomas[0]?.valor

  function agregar(evento?: FormEvent) {
    evento?.preventDefault()
    if (porAgregar.length === 0) return
    setCola((actual) => [...actual, ...porAgregar])
    setTexto('')
  }

  const alternar = (id: string) =>
    setCola((actual) => (actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id]))

  function enviar() {
    if (cola.length === 0) return
    preguntar(cola, elegirSintoma ? sintoma : undefined)
    alEnviar()
  }

  return (
    <section
      aria-labelledby={`${idCampo}-titulo`}
      className={cn(tarjeta, 'flex flex-col gap-5 p-5')}
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${idCampo}-titulo`} className="text-xl">
          ¿Qué quieres preguntar?
        </h2>
        <p className="text-tinta-suave text-sm">
          Escribe una o varias preguntas, o elígelas abajo. MARI envía el video LSP validado.
        </p>
      </div>

      {/* Escribir */}
      <form onSubmit={agregar} className="flex flex-col gap-2">
        <label htmlFor={idCampo} className="sr-only">
          Pregunta para la persona
        </label>
        <div className="flex gap-2">
          <input
            id={idCampo}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta…"
            autoComplete="off"
            className="border-borde bg-superficie focus:border-marca h-12 min-w-0 flex-1 rounded-xl border px-4 text-base outline-none"
          />
          <Boton type="submit" variante="secundario" tamano="md" disabled={porAgregar.length === 0}>
            <Plus size={18} aria-hidden /> Agregar
          </Boton>
        </div>
        {texto.trim() !== '' && (
          <div aria-live="polite" className="flex flex-col gap-1.5 text-sm">
            {porAgregar.length > 0 && (
              <p className="text-tinta-suave">
                Se agregará:{' '}
                {porAgregar.map((id, i) => (
                  <span key={id} className="text-tinta font-medium">
                    {i > 0 && ' · '}
                    {texto_(id)}
                  </span>
                ))}
              </p>
            )}
            {sinVideo.map((s) => (
              <p key={s.texto} className="text-aviso flex items-start gap-1.5">
                <Languages size={16} className="mt-0.5 shrink-0" aria-hidden />
                No hay video LSP para «{s.texto}». Solicita apoyo de interpretación.
              </p>
            ))}
          </div>
        )}
      </form>

      {/* Elegir */}
      <div className="flex flex-col gap-2">
        <p className="text-tinta-suave text-xs font-semibold tracking-wide uppercase">
          Preguntas disponibles en LSP
        </p>
        <div className="flex flex-wrap gap-2">
          {disponibles.map((p) => {
            const enCola = cola.includes(p.id)
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={enCola}
                onClick={() => alternar(p.id)}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors',
                  enCola
                    ? 'border-marca bg-marca-suave text-marca'
                    : 'border-borde bg-superficie hover:border-tinta/30',
                )}
              >
                {respondida(p.id) && (
                  <Check size={14} className="text-cruz" aria-label="ya respondida" />
                )}
                {p.texto}
              </button>
            )
          })}
        </div>
      </div>

      {/* Fila de envío */}
      <div className="border-borde flex flex-col gap-3 border-t pt-4">
        <p className="text-tinta-suave flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <ListPlus size={15} aria-hidden /> Para enviar ({cola.length})
        </p>
        {cola.length === 0 ? (
          <p className="text-tinta-suave text-sm">Aún no hay preguntas en la fila.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {cola.map((id, i) => (
              <li
                key={id}
                className="bg-superficie-2 flex items-center gap-3 rounded-xl px-3 py-2.5"
              >
                <span className="bg-marca grid size-7 shrink-0 place-items-center rounded-full text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <PlayCircle size={18} className="text-marca shrink-0" aria-hidden />
                <span className="flex-1 font-medium">{texto_(id)}</span>
                <button
                  type="button"
                  onClick={() => alternar(id)}
                  aria-label={`Quitar ${texto_(id)}`}
                  className="text-tinta-suave hover:text-tinta grid size-9 place-items-center rounded-lg"
                >
                  <X size={18} aria-hidden />
                </button>
              </li>
            ))}
          </ol>
        )}

        {elegirSintoma && (
          <label htmlFor={idSintoma} className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">¿Sobre qué síntoma?</span>
            <select
              id={idSintoma}
              value={sintoma}
              onChange={(e) => setSintomaElegido(e.target.value)}
              className="border-borde bg-superficie h-11 rounded-xl border px-3"
            >
              {sintomas.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.etiqueta}
                </option>
              ))}
            </select>
          </label>
        )}

        <Boton tamano="lg" ancho="completo" disabled={cola.length === 0} onClick={enviar}>
          <Send size={20} aria-hidden />
          {cola.length <= 1
            ? 'Enviar pregunta a la persona'
            : `Enviar ${cola.length} preguntas a la persona`}
        </Boton>
        <p className="text-tinta-suave text-xs">
          MARI no genera señas ni traduce texto. Lo que escribes no sale del dispositivo.
        </p>
      </div>
    </section>
  )
}

/** Rol de una pregunta del banco en la conversación. */
function rol(banco: Banco, id: string): 'sintoma' | 'detalle' | 'simple' {
  const p = banco.preguntas.find((x) => x.id === id)
  return p?.iniciaCiclo ? 'sintoma' : p?.porCiclo ? 'detalle' : 'simple'
}

/** Síntomas referidos, del más reciente al más antiguo, con su etiqueta del banco. */
function useSintomas(banco: Banco) {
  const { respuestas } = useConsulta()
  const vistos = new Set<string>()
  return respuestas
    .filter((r) => r.ciclo !== undefined && r.sintoma === undefined && typeof r.valor === 'string')
    .reverse()
    .flatMap((r) => {
      const valor = r.valor as string
      if (vistos.has(valor)) return []
      vistos.add(valor)
      const pregunta = banco.preguntas.find((p) => p.id === r.preguntaId)
      return [{ valor, etiqueta: pregunta ? etiquetaDe(pregunta, valor) : valor }]
    })
}
