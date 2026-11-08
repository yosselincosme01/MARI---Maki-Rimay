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
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
import { estilosBoton, tarjeta } from '@/ui/components/base/estilos'
import { PanelAviso } from '@/ui/components/base/PanelAviso'
import { Logo } from '@/ui/components/Logo'
import { useBanco, useConsulta, useRecursos } from '@/ui/consulta/contexto'

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
    <div className="flex min-h-dvh flex-col">
      <header className="border-borde bg-superficie/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo className="h-9 w-auto" />
          <span className="bg-superficie-2 text-tinta-suave flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium">
            <Stethoscope size={16} aria-hidden /> Vista del profesional
          </span>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer className="border-borde border-t">
        <p className="text-tinta-suave mx-auto flex max-w-4xl items-start gap-2 px-4 py-4 text-sm sm:px-6">
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
      <section className="flex flex-1 items-center justify-center">
        <div className={cn(tarjeta, 'flex w-full max-w-lg flex-col gap-6 p-8')}>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl">Nueva consulta</h1>
            <p className="text-tinta-suave">
              Configura la consulta y entrega la tablet a la persona.
            </p>
          </div>
          <label className="border-borde hover:border-marca has-[:checked]:border-marca has-[:checked]:bg-marca-suave flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border p-4 transition-colors">
            <input
              type="checkbox"
              className="accent-marca size-6 shrink-0"
              checked={preguntarEmbarazo}
              onChange={(e) => setPreguntarEmbarazo(e.target.checked)}
            />
            <span className="flex flex-col">
              <span className="font-medium">Preguntar por embarazo (P9)</span>
              <span className="text-tinta-suave text-sm">Actívalo solo si corresponde.</span>
            </span>
          </label>
          <Boton
            tamano="xl"
            ancho="completo"
            onClick={() => {
              iniciarConsulta({ preguntarEmbarazo })
              void navegar('/paciente')
            }}
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
        texto="Las respuestas aparecerán aquí cuando te devuelva la tablet."
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
          Tomar la tablet
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
          Recibir la tablet
        </Boton>
      </PanelAviso>
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
      <Encabezado
        titulo="Revisión de respuestas"
        texto="Solo lo que la persona confirmó. Los datos faltantes aparecen resaltados."
      />
      <Avisos respuestas={respuestas} />
      {resumen ? (
        <Secciones resumen={resumen} resaltarFaltantes />
      ) : (
        <p className={cn(tarjeta, 'text-tinta-suave p-5')}>
          No hay respuestas confirmadas. No se genera resumen.
        </p>
      )}

      <Acciones>
        <Boton tamano="lg" onClick={verResumen} disabled={!resumen}>
          <FileText size={20} aria-hidden /> Ver resumen
        </Boton>
        <div className="flex flex-col">
          <Boton variante="secundario" tamano="lg" disabled aria-describedby="repreguntar-pronto">
            <MessageCircleQuestion size={20} aria-hidden /> Repreguntar
          </Boton>
          <span id="repreguntar-pronto" className="text-tinta-suave mt-1 text-xs">
            Disponible pronto (búsqueda de repreguntas)
          </span>
        </div>
        <TerminarConsulta />
      </Acciones>
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
      <Encabezado
        titulo="Resumen de la consulta"
        texto="Generado con una plantilla fija a partir de lo confirmado. No usa IA generativa."
      />
      <Avisos respuestas={respuestas} />
      {resumen ? (
        <>
          <Secciones resumen={resumen} />
          <Originales resumen={resumen} />
          <p className="text-tinta-suave border-borde border-l-4 pl-4 font-medium">
            {resumen.cierre}
          </p>
        </>
      ) : (
        <p className={cn(tarjeta, 'text-tinta-suave p-5')}>No hay respuestas confirmadas.</p>
      )}

      <Acciones>
        <Boton variante="secundario" tamano="lg" onClick={copiar} disabled={!resumen}>
          <Copy size={20} aria-hidden /> Copiar resumen
        </Boton>
        <TerminarConsulta />
      </Acciones>
      {copiado === 'si' && (
        <p
          role="status"
          className="border-cruz/30 bg-cruz/5 flex items-start gap-2 rounded-xl border p-4 text-sm"
        >
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
      className="border-alerta/30 bg-alerta-suave flex flex-wrap items-center gap-3 rounded-xl border p-3"
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
          className="border-alerta/30 bg-alerta-suave text-alerta flex items-center gap-3 rounded-xl border p-4 font-semibold"
        >
          <Siren size={22} aria-hidden /> Alerta inicial: refiere dificultad para respirar o dolor
          fuerte en el pecho.
        </p>
      )}
      {interprete && (
        <p className="border-marca/20 bg-marca-suave flex items-center gap-3 rounded-xl border p-4 font-semibold">
          <Hand size={22} className="text-marca" aria-hidden /> Pidió apoyo de interpretación.
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
    <div className={cn(tarjeta, 'divide-borde divide-y')}>
      {secciones.map(([titulo, lineas]) => (
        <section
          key={titulo}
          aria-labelledby={`seccion-${titulo}`}
          className="grid gap-2 p-5 sm:grid-cols-[12rem_1fr] sm:gap-6"
        >
          <h2
            id={`seccion-${titulo}`}
            className="text-tinta-suave font-sans text-sm font-semibold tracking-wide uppercase sm:pt-1"
          >
            {titulo}
          </h2>
          <ul className="space-y-1.5">
            {lineas.map((linea, i) =>
              resaltarFaltantes && esFaltante(linea) ? (
                <li
                  key={i}
                  className="bg-aviso-suave border-aviso/25 flex items-start gap-2 rounded-lg border px-3 py-1.5"
                >
                  <TriangleAlert size={18} className="text-aviso mt-0.5 shrink-0" aria-hidden />
                  <span>
                    <span className="sr-only">Falta un dato: </span>
                    {linea}
                  </span>
                </li>
              ) : (
                <li key={i} className="py-1">
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
    <details className={cn(tarjeta, 'group p-5')}>
      <summary className="cursor-pointer font-semibold">
        Respuestas originales ({resumen.originales.length})
      </summary>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-tinta-suave border-borde border-b">
          <tr>
            <th className="py-2 pr-3 font-medium">Hora</th>
            <th className="py-2 pr-3 font-medium">Pregunta</th>
            <th className="py-2 pr-3 font-medium">Respuesta</th>
            <th className="py-2 font-medium">Cómo</th>
          </tr>
        </thead>
        <tbody className="divide-borde divide-y">
          {resumen.originales.map((o, i) => (
            <tr key={i}>
              <td className="py-2 pr-3 tabular-nums">{horaCorta(o.hora)}</td>
              <td className="py-2 pr-3">{o.pregunta}</td>
              <td className="py-2 pr-3 font-medium">{o.respuesta}</td>
              <td className="text-tinta-suave py-2">{o.origen}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  )
}
