/**
 * Vista del profesional (PRO). Muestra una pantalla según la fase de la consulta:
 * iniciar, esperar a la persona, recibir la tablet, revisar respuestas y ver el resumen.
 *
 * Solo muestra respuestas CONFIRMADAS (PRO1). El texto sale del resumen con plantilla (RES).
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Hand,
  MessageCircleQuestion,
  ShieldCheck,
  Siren,
  Stethoscope,
  Trash2,
} from 'lucide-react'
import { generarResumen, resumenComoTexto } from '@/domain/resumen/resumen'
import { Logo } from '@/ui/components/Logo'
import { useBanco, useConsulta, useRecursos } from '@/ui/consulta/contexto'
import { DocumentoResumen, Originales } from '@/ui/profesional/DocumentoResumen'

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
  // Cada pantalla nueva empieza arriba (si no, el resumen se abriría a mitad de página).
  useEffect(() => window.scrollTo({ top: 0 }), [fase])
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

function Marco({ children, ancho = 'max-w-4xl' }: { children: ReactNode; ancho?: string }) {
  return (
    <main className={`mx-auto flex min-h-dvh w-full ${ancho} flex-col gap-6 p-4 sm:p-6 lg:p-8`}>
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
  'bg-marca hover:bg-marca-oscuro rounded-boton flex min-h-14 items-center justify-center gap-2 px-6 font-semibold whitespace-nowrap text-white disabled:opacity-40 [&>svg]:shrink-0'
const botonSecundario =
  'bg-superficie rounded-boton text-tinta flex min-h-14 items-center justify-center gap-2 px-6 font-semibold whitespace-nowrap ring-2 ring-black/10 hover:ring-marca disabled:opacity-40 [&>svg]:shrink-0'

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
  const [generado] = useState(() => new Date())
  const resumen = generarResumen({ banco, respuestas, config })

  return (
    <Marco>
      <div>
        <h1 className="text-3xl font-bold">Revisión de respuestas</h1>
        <p className="text-tinta/70 mt-1">
          Lo resaltado no fue especificado por la persona: puedes repreguntar antes de cerrar.
        </p>
      </div>
      {resumen ? (
        <DocumentoResumen resumen={resumen} generado={generado} resaltarFaltantes />
      ) : (
        <p className="bg-superficie rounded-2xl p-5 ring-1 ring-black/10">
          No hay respuestas confirmadas. No se genera resumen.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-3">
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

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null

/** Resumen final: el documento a la izquierda y las acciones a la derecha (o arriba en tablet). */
function ResumenFinal() {
  const banco = useBanco()
  const { respuestas, config } = useConsulta()
  const [generado] = useState(() => new Date())
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)
  const resumen = generarResumen({ banco, respuestas, config })

  if (!resumen) {
    return (
      <Marco>
        <p>No hay respuestas confirmadas.</p>
        <TerminarConsulta />
      </Marco>
    )
  }

  async function conPdf(accion: (pdf: Blob, nombre: string) => void) {
    if (!resumen) return
    setOcupado(true)
    try {
      const { cargarLogo, crearPdfResumen, nombreArchivoPdf } =
        await import('@/infrastructure/exportacion/resumen-pdf')
      const pdf = await crearPdfResumen(resumen, { generado, logo: await cargarLogo() })
      accion(pdf, nombreArchivoPdf(generado))
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo generar el PDF. Usa "Copiar texto".' })
    } finally {
      setOcupado(false)
    }
  }

  function descargar() {
    void conPdf((pdf, nombre) => {
      const url = URL.createObjectURL(pdf)
      Object.assign(document.createElement('a'), { href: url, download: nombre }).click()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
      setAviso({
        tipo: 'ok',
        texto: `Descargado ${nombre}. El archivo quedó en este dispositivo, fuera de MARI: guárdalo según las normas del establecimiento.`,
      })
    })
  }

  function verPdf() {
    // La pestaña se abre ya, dentro del clic, para que el navegador no la bloquee.
    const pestana = window.open('', '_blank')
    void conPdf((pdf) => {
      const url = URL.createObjectURL(pdf)
      if (pestana) pestana.location.href = url
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    })
  }

  async function copiar() {
    if (!resumen) return
    try {
      await navigator.clipboard.writeText(resumenComoTexto(resumen, generado))
      setAviso({
        tipo: 'ok',
        texto:
          'Copiado. El texto quedó en el portapapeles de este dispositivo, fuera de MARI: bórralo cuando ya no lo necesites.',
      })
    } catch {
      setAviso({ tipo: 'error', texto: 'No se pudo copiar. Usa "Descargar PDF".' })
    }
  }

  return (
    <Marco ancho="max-w-6xl">
      <div>
        <h1 className="text-3xl font-bold">Resumen de la consulta</h1>
        <p className="text-tinta/70 mt-1">Listo para el informe médico.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
        <aside
          aria-label="Acciones del resumen"
          className="bg-superficie space-y-3 rounded-2xl p-4 ring-1 ring-black/5 lg:sticky lg:top-6 lg:order-2"
        >
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button type="button" className={botonPrincipal} onClick={descargar} disabled={ocupado}>
              <Download size={20} aria-hidden /> Descargar PDF
            </button>
            <button type="button" className={botonSecundario} onClick={verPdf} disabled={ocupado}>
              <ExternalLink size={20} aria-hidden /> Ver PDF
            </button>
            <button type="button" className={botonSecundario} onClick={copiar}>
              <Copy size={20} aria-hidden /> Copiar texto
            </button>
            <TerminarConsulta />
          </div>
          {aviso && (
            <p
              role={aviso.tipo === 'ok' ? 'status' : 'alert'}
              className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
                aviso.tipo === 'ok' ? 'bg-cruz/10' : 'bg-alerta/10 text-alerta'
              }`}
            >
              {aviso.tipo === 'ok' && (
                <ClipboardCheck size={18} className="text-cruz shrink-0" aria-hidden />
              )}
              {aviso.texto}
            </p>
          )}
        </aside>

        <div className="space-y-4 lg:order-1">
          <DocumentoResumen resumen={resumen} generado={generado} />
          <Originales resumen={resumen} />
        </div>
      </div>
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
      className="bg-alerta/10 col-span-full flex flex-wrap items-center gap-3 rounded-2xl p-3"
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
