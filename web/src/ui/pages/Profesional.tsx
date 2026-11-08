/**
 * Vista del profesional (PRO). Muestra una pantalla según la fase de la consulta:
 * iniciar, esperar a la persona, recibir la tablet, revisar respuestas y ver el resumen.
 *
 * Solo muestra respuestas CONFIRMADAS (PRO1). El texto sale del resumen con plantilla (RES).
 */
import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ClipboardCheck,
  Copy,
  FileText,
  Hand,
  MessageCircleQuestion,
  ShieldCheck,
  Siren,
  Stethoscope,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import type { Respuesta } from '@/domain/banco/tipos'
import { generarResumen, horaCorta, resumenComoTexto, type Resumen } from '@/domain/resumen/resumen'
import { Logo } from '@/ui/components/Logo'
import { useBanco, useConsulta, useRecursos } from '@/ui/consulta/contexto'

export function Profesional() {
  const recursos = useRecursos()
  if (!recursos.ok) {
    return (
      <Marco>
        <p role="alert" className="text-alerta font-semibold">
          El banco de preguntas tiene errores: no se puede iniciar una consulta.
        </p>
      </Marco>
    )
  }
  return <SegunFase />
}

function SegunFase() {
  const { fase } = useConsulta()
  switch (fase) {
    case 'inactiva':
      return <IniciarConsulta />
    case 'entrega-paciente':
    case 'paciente':
    case 'repregunta':
      return <ConLaPersona />
    case 'alerta':
      return <AlertaRecibida />
    case 'entrega-profesional':
      return <RecibirTablet />
    case 'profesional':
      return <Revision />
    case 'resumen':
      return <ResumenFinal />
  }
}

/* ─────────────────────────────── Piezas comunes ─────────────────────────────── */

function Marco({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <Logo className="h-10 w-auto" />
        <span className="text-tinta/60 flex items-center gap-2 text-sm font-semibold">
          <Stethoscope size={18} aria-hidden /> Vista del profesional
        </span>
      </header>
      {children}
      <p className="text-tinta/60 mt-auto flex items-start gap-2 pt-6 text-sm">
        <ShieldCheck size={18} className="text-marca shrink-0" aria-hidden />
        MARI no conserva datos: todo se borra al terminar la consulta, recargar o cerrar la página.
      </p>
    </main>
  )
}

const botonPrincipal =
  'bg-marca hover:bg-marca-oscuro rounded-boton flex min-h-14 items-center justify-center gap-2 px-6 font-semibold text-white disabled:opacity-40'
const botonSecundario =
  'bg-superficie rounded-boton text-tinta flex min-h-14 items-center justify-center gap-2 px-6 font-semibold ring-2 ring-black/10 hover:ring-marca disabled:opacity-40'

/** Respuestas que marcan una alerta o un pedido, para destacarlos arriba. */
const respondio = (respuestas: Respuesta[], preguntaId: string, valor: string) =>
  respuestas.some((r) => r.preguntaId === preguntaId && r.valor === valor)

/* ─────────────────────────────── Pantallas ─────────────────────────────── */

function IniciarConsulta() {
  const { iniciarConsulta } = useConsulta()
  const navegar = useNavigate()
  const [preguntarEmbarazo, setPreguntarEmbarazo] = useState(false)

  return (
    <Marco>
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <h1 className="text-3xl font-bold">Nueva consulta</h1>
        <label className="flex min-h-12 items-center gap-3">
          <input
            type="checkbox"
            className="accent-marca size-6"
            checked={preguntarEmbarazo}
            onChange={(e) => setPreguntarEmbarazo(e.target.checked)}
          />
          Preguntar por embarazo (P9)
        </label>
        <button
          type="button"
          className={botonPrincipal}
          onClick={() => {
            iniciarConsulta({ preguntarEmbarazo })
            void navegar('/paciente')
          }}
        >
          Iniciar consulta
        </button>
      </section>
    </Marco>
  )
}

function ConLaPersona() {
  return (
    <Marco>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Hand size={72} className="text-marca" aria-hidden />
        <h1 className="text-3xl font-bold">La persona está respondiendo</h1>
        <p className="text-tinta/70 max-w-md">
          Las respuestas aparecerán aquí cuando te devuelva la tablet.
        </p>
        <Link to="/paciente" className="text-marca text-lg font-semibold underline">
          Ir a la vista de la persona
        </Link>
      </section>
    </Marco>
  )
}

/** P0 = SÍ: la persona pidió avisar al personal. MARI no clasifica urgencias. */
function AlertaRecibida() {
  const { entregarAlProfesional, recibirTablet } = useConsulta()
  return (
    <Marco>
      <section
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
      >
        <Siren size={72} className="text-alerta" aria-hidden />
        <h1 className="text-alerta text-3xl font-bold">
          La persona refiere dificultad para respirar o dolor fuerte en el pecho
        </h1>
        <p className="text-tinta/70 max-w-md">MARI detuvo las preguntas. No clasifica urgencias.</p>
        <button
          type="button"
          className={botonPrincipal}
          onClick={() => {
            entregarAlProfesional()
            recibirTablet()
          }}
        >
          Tomar la tablet
        </button>
      </section>
    </Marco>
  )
}

function RecibirTablet() {
  const { recibirTablet } = useConsulta()
  return (
    <Marco>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Stethoscope size={72} className="text-marca" aria-hidden />
        <h1 className="text-3xl font-bold">La persona terminó de responder</h1>
        <button type="button" className={botonPrincipal} onClick={recibirTablet}>
          Recibir la tablet
        </button>
      </section>
    </Marco>
  )
}

/** Revisión de respuestas confirmadas, con los faltantes resaltados (PRO1, PRO2). */
function Revision() {
  const banco = useBanco()
  const { respuestas, config, verResumen } = useConsulta()
  const resumen = generarResumen({ banco, respuestas, config })

  return (
    <Marco>
      <h1 className="text-3xl font-bold">Revisión de respuestas</h1>
      <Avisos respuestas={respuestas} />
      {resumen ? (
        <Secciones resumen={resumen} resaltarFaltantes />
      ) : (
        <p className="bg-superficie rounded-2xl p-5 ring-1 ring-black/10">
          No hay respuestas confirmadas. No se genera resumen.
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col">
          <button
            type="button"
            className={botonSecundario}
            disabled
            aria-describedby="repreguntar-pronto"
          >
            <MessageCircleQuestion size={20} aria-hidden /> Repreguntar
          </button>
          <span id="repreguntar-pronto" className="text-tinta/60 mt-1 text-xs">
            Disponible pronto (búsqueda de repreguntas)
          </span>
        </div>
        <button type="button" className={botonPrincipal} onClick={verResumen} disabled={!resumen}>
          <FileText size={20} aria-hidden /> Ver resumen
        </button>
        <TerminarConsulta />
      </div>
    </Marco>
  )
}

function ResumenFinal() {
  const banco = useBanco()
  const { respuestas, config } = useConsulta()
  const resumen = generarResumen({ banco, respuestas, config })
  const [copiado, setCopiado] = useState<'no' | 'si' | 'error'>('no')

  async function copiar() {
    if (!resumen) return
    try {
      await navigator.clipboard.writeText(resumenComoTexto(resumen))
      setCopiado('si')
    } catch {
      setCopiado('error')
    }
  }

  return (
    <Marco>
      <h1 className="text-3xl font-bold">Resumen de la consulta</h1>
      <Avisos respuestas={respuestas} />
      {resumen ? (
        <>
          <Secciones resumen={resumen} />
          <Originales resumen={resumen} />
          <p className="border-t border-black/10 pt-4 font-semibold">{resumen.cierre}</p>
        </>
      ) : (
        <p>No hay respuestas confirmadas.</p>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" className={botonSecundario} onClick={copiar} disabled={!resumen}>
          <Copy size={20} aria-hidden /> Copiar resumen
        </button>
        <TerminarConsulta />
      </div>
      {copiado === 'si' && (
        <p role="status" className="bg-cruz/10 flex items-start gap-2 rounded-2xl p-4 text-sm">
          <ClipboardCheck size={20} className="text-cruz shrink-0" aria-hidden />
          Copiado. El texto quedó en el portapapeles de este dispositivo, fuera de MARI: bórralo
          cuando ya no lo necesites.
        </p>
      )}
      {copiado === 'error' && (
        <p role="alert" className="text-alerta text-sm">
          No se pudo copiar. Selecciona el texto y cópialo manualmente.
        </p>
      )}
    </Marco>
  )
}

/** Terminar pide confirmación: después no hay forma de recuperar nada. */
function TerminarConsulta() {
  const { terminarConsulta } = useConsulta()
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <button type="button" className={botonSecundario} onClick={() => setConfirmando(true)}>
        <Trash2 size={20} aria-hidden /> Terminar consulta
      </button>
    )
  }
  return (
    <div
      role="alertdialog"
      aria-labelledby="terminar-titulo"
      className="bg-alerta/10 flex flex-wrap items-center gap-3 rounded-2xl p-3"
    >
      <p id="terminar-titulo" className="font-semibold">
        Se borrarán todas las respuestas. ¿Terminar?
      </p>
      <button
        type="button"
        className="bg-alerta rounded-boton min-h-12 px-5 font-semibold text-white"
        onClick={terminarConsulta}
      >
        Sí, terminar y borrar
      </button>
      <button
        type="button"
        className="min-h-12 px-4 font-semibold underline"
        onClick={() => setConfirmando(false)}
      >
        Cancelar
      </button>
    </div>
  )
}

/* ─────────────────────────────── Contenido del resumen ─────────────────────────────── */

function Avisos({ respuestas }: { respuestas: Respuesta[] }) {
  const alerta = respondio(respuestas, 'P0', 'SI')
  const interprete = respondio(respuestas, 'P11', 'SI')
  if (!alerta && !interprete) return null
  return (
    <div className="space-y-2">
      {alerta && (
        <p
          role="alert"
          className="bg-alerta flex items-center gap-2 rounded-2xl p-4 font-semibold text-white"
        >
          <Siren size={22} aria-hidden /> Alerta inicial: refiere dificultad para respirar o dolor
          fuerte en el pecho.
        </p>
      )}
      {interprete && (
        <p className="bg-marca/10 flex items-center gap-2 rounded-2xl p-4 font-semibold">
          <Hand size={22} aria-hidden /> Pidió apoyo de interpretación.
        </p>
      )}
    </div>
  )
}

const esFaltante = (linea: string) => /no especificad/i.test(linea)

function Secciones({
  resumen,
  resaltarFaltantes = false,
}: {
  resumen: Resumen
  resaltarFaltantes?: boolean
}) {
  const secciones: [string, string[]][] = [
    ['Alerta inicial', [resumen.alerta]],
    ['Síntomas referidos', resumen.sintomas],
    ['Antecedentes', resumen.antecedentes],
    ['Repreguntas', resumen.repreguntas],
    ['Mensaje libre en LSP', resumen.mensajeLibre],
  ]
  return (
    <div className="space-y-5">
      {secciones.map(([titulo, lineas]) => (
        <section key={titulo} aria-labelledby={`seccion-${titulo}`}>
          <h2
            id={`seccion-${titulo}`}
            className="text-marca text-sm font-bold tracking-wide uppercase"
          >
            {titulo}
          </h2>
          <ul className="mt-2 space-y-1.5">
            {lineas.map((linea, i) =>
              resaltarFaltantes && esFaltante(linea) ? (
                <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-100 px-3 py-1.5">
                  <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden />
                  <span>
                    <span className="sr-only">Falta un dato: </span>
                    {linea}
                  </span>
                </li>
              ) : (
                <li key={i} className="px-3 py-1">
                  {linea}
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

/** Respuestas tal como se confirmaron (RES3). */
function Originales({ resumen }: { resumen: Resumen }) {
  return (
    <details className="bg-superficie rounded-2xl p-4 ring-1 ring-black/10">
      <summary className="cursor-pointer font-semibold">
        Respuestas originales ({resumen.originales.length})
      </summary>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-tinta/60">
          <tr>
            <th className="py-1 pr-3 font-medium">Hora</th>
            <th className="py-1 pr-3 font-medium">Pregunta</th>
            <th className="py-1 pr-3 font-medium">Respuesta</th>
            <th className="py-1 font-medium">Cómo</th>
          </tr>
        </thead>
        <tbody>
          {resumen.originales.map((o, i) => (
            <tr key={i} className="border-t border-black/5">
              <td className="py-1.5 pr-3 tabular-nums">{horaCorta(o.hora)}</td>
              <td className="py-1.5 pr-3">{o.pregunta}</td>
              <td className="py-1.5 pr-3 font-medium">{o.respuesta}</td>
              <td className="py-1.5">{o.origen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
