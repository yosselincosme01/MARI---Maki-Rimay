/**
 * Vista del profesional (PRO). La consulta es una CONVERSACIÓN guiada por el profesional:
 * pregunta (escribiendo o eligiendo videos LSP), la persona responde y el resumen se va armando.
 * Muestra una pantalla según la fase: iniciar, esperar a la persona, recibir el dispositivo y
 * la consulta en curso (preguntar + resumen en vivo).
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
  MessageSquareReply,
  ShieldCheck,
  Siren,
  Stethoscope,
  Trash2,
} from 'lucide-react'
import { generarResumen, resumenComoTexto } from '@/domain/resumen/resumen'
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
import { estilosBoton, tarjeta } from '@/ui/components/base/estilos'
import { PanelAviso } from '@/ui/components/base/PanelAviso'
import { Logo } from '@/ui/components/Logo'
import { useBanco, useConsulta, useRecursos } from '@/ui/consulta/contexto'
import { etiquetaDe } from '@/ui/consulta/recursos'
import { DocumentoResumen, Originales } from '@/ui/profesional/DocumentoResumen'
import { Preguntar } from '@/ui/profesional/Preguntar'

export function Profesional() {
  const recursos = useRecursos()
  if (!recursos.ok) {
    return (
      <Marco>
        <p
          role="alert"
          className={cn(tarjeta, 'border-alerta/30 bg-alerta-suave text-alerta p-5 font-semibold')}
        >
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
  // Con llaves: en Chromium reciente scrollTo devuelve una promesa, y un efecto que devuelve
  // algo que no es una función rompe React ("destroy is not a function").
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [fase])
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
    case 'resumen':
      return <ConsultaEnCurso />
  }
}

/* ─────────────────────────────── Piezas comunes ─────────────────────────────── */

function Marco({ children, ancho = 'max-w-4xl' }: { children: ReactNode; ancho?: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-borde bg-superficie/90 sticky top-0 z-20 border-b backdrop-blur">
        <div
          className={cn('mx-auto flex h-16 items-center justify-between gap-4 px-4 sm:px-6', ancho)}
        >
          <Logo className="h-9 w-auto" />
          <span className="bg-superficie-2 text-tinta-suave flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
            <Stethoscope size={16} aria-hidden /> Vista del profesional
          </span>
        </div>
      </header>
      <main className={cn('mx-auto flex w-full flex-1 flex-col gap-6 px-4 py-8 sm:px-6', ancho)}>
        {children}
      </main>
      <footer className="border-borde border-t">
        <p
          className={cn(
            'text-tinta-suave mx-auto flex items-start gap-2 px-4 py-4 text-sm sm:px-6',
            ancho,
          )}
        >
          <ShieldCheck size={18} className="text-marca shrink-0" aria-hidden />
          MARI no conserva datos: todo se borra al terminar la consulta, recargar o cerrar la
          página.
        </p>
      </footer>
    </div>
  )
}

/** Encabezado de las pantallas de trabajo (revisión y resumen). */
function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-3xl">{titulo}</h1>
      <p className="text-tinta-suave">{texto}</p>
    </div>
  )
}

/* ─────────────────────────────── Pantallas ─────────────────────────────── */

function IniciarConsulta() {
  const { iniciarConversacion } = useConsulta()
  return (
    <Marco>
      <section className="flex flex-1 items-center justify-center">
        <div className={cn(tarjeta, 'flex w-full max-w-lg flex-col gap-6 p-8')}>
          <div className="bg-marca-suave text-marca grid size-14 place-items-center rounded-2xl">
            <Stethoscope size={28} strokeWidth={1.75} aria-hidden />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl">Nueva consulta</h1>
            <p className="text-tinta-suave">
              Pregunta a la persona con videos en Lengua de Señas Peruana. Sus respuestas
              confirmadas forman el resumen para tu informe.
            </p>
          </div>
          <Boton
            tamano="xl"
            ancho="completo"
            onClick={() => iniciarConversacion({ preguntarEmbarazo: false })}
          >
            Iniciar consulta
          </Boton>
        </div>
      </section>
    </Marco>
  )
}

function ConLaPersona() {
  return (
    <Marco>
      <PanelAviso
        icono={<Hand size={44} strokeWidth={1.75} aria-hidden />}
        titulo="La persona está respondiendo"
        texto="Las respuestas aparecerán aquí cuando te devuelva el dispositivo."
      >
        <Link to="/paciente" className={estilosBoton({ variante: 'secundario', tamano: 'lg' })}>
          Ir a la vista de la persona
        </Link>
      </PanelAviso>
    </Marco>
  )
}

/** P0 = SÍ: la persona pidió avisar al personal. MARI no clasifica urgencias. */
function AlertaRecibida() {
  const { entregarAlProfesional, recibirTablet } = useConsulta()
  return (
    <Marco>
      <PanelAviso
        rol="alert"
        tono="alerta"
        icono={<Siren size={44} strokeWidth={1.75} aria-hidden />}
        titulo="La persona refiere dificultad para respirar o dolor fuerte en el pecho"
        texto="MARI detuvo las preguntas. No clasifica urgencias."
      >
        <Boton
          tamano="xl"
          ancho="completo"
          onClick={() => {
            entregarAlProfesional()
            recibirTablet()
          }}
        >
          Tomar el dispositivo
        </Boton>
      </PanelAviso>
    </Marco>
  )
}

function RecibirTablet() {
  const { recibirTablet } = useConsulta()
  return (
    <Marco>
      <PanelAviso
        icono={<Stethoscope size={44} strokeWidth={1.75} aria-hidden />}
        titulo="La persona terminó de responder"
      >
        <Boton tamano="xl" ancho="completo" onClick={recibirTablet}>
          Recibir el dispositivo
        </Boton>
      </PanelAviso>
    </Marco>
  )
}

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null

/**
 * Consulta en curso: a la izquierda, preguntar; a la derecha, el resumen en vivo con lo que
 * falta resaltado y las acciones del informe (PDF, copiar). Lo recién respondido va arriba.
 */
function ConsultaEnCurso() {
  const banco = useBanco()
  const navegar = useNavigate()
  const { respuestas, config, ultimoLote } = useConsulta()
  const [generado] = useState(() => new Date())
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ocupado, setOcupado] = useState(false)
  const resumen = generarResumen({ banco, respuestas, config })

  const nuevas = respuestas.filter((r) => ultimoLote.includes(r.id))

  async function conPdf(accion: (pdf: Blob, nombre: string) => void) {
    if (!resumen) return
    setOcupado(true)
    try {
      const { cargarLogo, crearPdfResumen, nombreArchivoPdf } =
        await import('@/infrastructure/exportacion/resumen-pdf')
      const pdf = await crearPdfResumen(resumen, { generado: new Date(), logo: await cargarLogo() })
      accion(pdf, nombreArchivoPdf(new Date()))
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
      await navigator.clipboard.writeText(resumenComoTexto(resumen, new Date()))
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
    <Marco ancho="max-w-7xl">
      <Encabezado
        titulo="Consulta en curso"
        texto="Pregunta en LSP y revisa el resumen a medida que la persona responde."
      />

      {nuevas.length > 0 && (
        <section
          aria-label="Respuestas nuevas"
          role="status"
          className="border-marca/30 bg-marca-suave rounded-tarjeta flex flex-col gap-2 border p-4"
        >
          <p className="text-marca flex items-center gap-2 font-semibold">
            <MessageSquareReply size={18} aria-hidden /> La persona respondió
          </p>
          <ul className="flex flex-col gap-1">
            {nuevas.map((r) => {
              const pregunta = banco.preguntas.find((p) => p.id === r.preguntaId)
              const valores = Array.isArray(r.valor) ? r.valor : [r.valor]
              return (
                <li key={r.id} className="flex flex-wrap gap-x-2">
                  <span className="text-tinta-suave">{pregunta?.texto ?? r.preguntaId}</span>
                  <span className="font-semibold">
                    {pregunta
                      ? valores.map((v) => etiquetaDe(pregunta, v)).join(', ')
                      : valores.join(', ')}
                  </span>
                  <span className="text-tinta-suave text-sm">
                    ({r.origen === 'sena' ? 'seña' : r.origen === 'cuerpo' ? 'cuerpo 3D' : 'táctil'}
                    )
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-24">
          <Preguntar alEnviar={() => void navegar('/paciente')} />
        </div>

        <section aria-labelledby="titulo-resumen" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="titulo-resumen" className="text-xl">
              Resumen
            </h2>
            <div className="flex flex-wrap gap-2">
              <Boton tamano="md" onClick={descargar} disabled={ocupado || !resumen}>
                <Download size={18} aria-hidden /> Descargar PDF
              </Boton>
              <Boton
                variante="secundario"
                tamano="md"
                onClick={verPdf}
                disabled={ocupado || !resumen}
              >
                <ExternalLink size={18} aria-hidden /> Ver PDF
              </Boton>
              <Boton variante="secundario" tamano="md" onClick={copiar} disabled={!resumen}>
                <Copy size={18} aria-hidden /> Copiar texto
              </Boton>
            </div>
          </div>

          {aviso && (
            <p
              role={aviso.tipo === 'ok' ? 'status' : 'alert'}
              className={cn(
                'flex items-start gap-2 rounded-xl border p-3 text-sm',
                aviso.tipo === 'ok'
                  ? 'border-cruz/30 bg-cruz/5'
                  : 'border-alerta/30 bg-alerta-suave text-alerta',
              )}
            >
              {aviso.tipo === 'ok' && (
                <ClipboardCheck size={18} className="text-cruz shrink-0" aria-hidden />
              )}
              {aviso.texto}
            </p>
          )}

          {resumen ? (
            <>
              <DocumentoResumen resumen={resumen} generado={generado} resaltarFaltantes />
              <Originales resumen={resumen} />
            </>
          ) : (
            <div className={cn(tarjeta, 'flex flex-col items-center gap-3 p-10 text-center')}>
              <FileText size={36} strokeWidth={1.5} className="text-tinta-suave" aria-hidden />
              <p className="text-lg font-medium">Aún no hay respuestas</p>
              <p className="text-tinta-suave max-w-sm">
                El resumen se armará aquí a medida que la persona responda. Empieza, por ejemplo,
                con «¿Qué sientes?».
              </p>
            </div>
          )}
        </section>
      </div>

      <Acciones>
        <span />
        <TerminarConsulta />
      </Acciones>
    </Marco>
  )
}

/** Barra de acciones al pie del contenido; "Terminar" queda a la derecha, separada. */
function Acciones({ children }: { children: ReactNode }) {
  return (
    <div className="border-borde flex flex-wrap items-start gap-3 border-t pt-6 [&>*:last-child]:ml-auto">
      {children}
    </div>
  )
}

/** Terminar pide confirmación: después no hay forma de recuperar nada. */
function TerminarConsulta() {
  const { terminarConsulta } = useConsulta()
  const [confirmando, setConfirmando] = useState(false)

  if (!confirmando) {
    return (
      <Boton variante="peligro" tamano="lg" onClick={() => setConfirmando(true)}>
        <Trash2 size={20} aria-hidden /> Terminar consulta
      </Boton>
    )
  }
  return (
    <div
      role="alertdialog"
      aria-labelledby="terminar-titulo"
      className="border-alerta/30 bg-alerta-suave col-span-full flex flex-wrap items-center gap-3 rounded-xl border p-3"
    >
      <p id="terminar-titulo" className="px-1 font-semibold">
        Se borrarán todas las respuestas. ¿Terminar?
      </p>
      <Boton
        tamano="md"
        className="bg-alerta hover:bg-alerta hover:brightness-95"
        onClick={terminarConsulta}
      >
        Sí, terminar y borrar
      </Boton>
      <Boton variante="fantasma" tamano="md" onClick={() => setConfirmando(false)}>
        Cancelar
      </Boton>
    </div>
  )
}
