import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Hand, HandHelping, Siren, Stethoscope, TriangleAlert } from 'lucide-react'
import { CamaraSenas } from '@/ui/components/CamaraSenas'
import { Confirmacion } from '@/ui/components/Confirmacion'
import { Logo } from '@/ui/components/Logo'
import { Respuestas } from '@/ui/components/Respuestas'
import { VideoLSP } from '@/ui/components/VideoLSP'
import {
  useBanco,
  useConsulta,
  useModoDemo,
  useReconocimiento,
  useRecursos,
} from '@/ui/consulta/contexto'

/**
 * Vista del paciente (PAC). Muestra una sola cosa a la vez según la fase de la consulta:
 * pantallas de entrega de la tablet, la pregunta activa, la confirmación o la alerta.
 * Nunca muestra datos del profesional (PAC1).
 */
export function Paciente() {
  const recursos = useRecursos()
  if (!recursos.ok) return <BancoInvalido errores={recursos.errores} />
  return <FlujoPaciente />
}

function FlujoPaciente() {
  const consulta = useConsulta()
  const navegar = useNavigate()

  switch (consulta.fase) {
    case 'inactiva':
      return <SinConsulta />
    case 'entrega-paciente':
      return (
        <Entrega
          icono={<Hand size={96} aria-hidden />}
          titulo="Entregue la tablet a la persona"
          accion="Ya tengo la tablet"
          alRecibir={consulta.recibirTablet}
        />
      )
    case 'paciente':
    case 'repregunta':
      return <PreguntaActiva />
    case 'alerta':
      return <Alerta alEntregar={consulta.entregarAlProfesional} />
    case 'entrega-profesional':
      return (
        <Entrega
          icono={<Stethoscope size={96} aria-hidden />}
          titulo="Entregue la tablet al profesional"
          accion="Soy el profesional"
          alRecibir={() => {
            consulta.recibirTablet()
            void navegar('/profesional')
          }}
        />
      )
    case 'profesional':
    case 'resumen':
      return <ConElProfesional />
  }
}

function Marco({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <Logo className="h-10 w-auto self-start" />
      {children}
    </main>
  )
}

function PreguntaActiva() {
  const banco = useBanco()
  const modoDemo = useModoDemo()
  const { preguntaActiva, provisional, proponer, confirmar, descartar } = useConsulta()
  const { reconocedor, modo } = useReconocimiento()
  // Se recuerda entre preguntas: si la persona activó la cámara, sigue activa.
  const [camaraActiva, setCamaraActiva] = useState(false)
  const pregunta = banco.preguntas.find((p) => p.id === preguntaActiva)

  if (!pregunta) {
    return (
      <Marco>
        <p role="alert" className="text-alerta text-lg font-semibold">
          La pregunta {preguntaActiva} no está en el banco.
        </p>
      </Marco>
    )
  }

  return (
    <Marco>
      {/* Tablet horizontal: video | respuesta. En móvil se apilan (PAC3). */}
      <div className="grid flex-1 items-start gap-6 md:grid-cols-2">
        <section aria-labelledby="pregunta" className="flex flex-col gap-3">
          <VideoLSP
            key={pregunta.id}
            video={pregunta.video}
            validado={pregunta.validado}
            texto={pregunta.texto}
            modoDemo={modoDemo}
          />
          <h1 id="pregunta" className="text-2xl font-bold sm:text-3xl">
            {pregunta.texto}
          </h1>
        </section>
        <section aria-label="Tu respuesta" className="flex flex-col gap-4">
          {pregunta.tipo === 'sena' && reconocedor && modo !== 'simulado' && (
            <CamaraSenas
              reconocedor={reconocedor}
              pregunta={pregunta}
              alResponder={proponer}
              escuchando={provisional === null}
              activa={camaraActiva}
              alActivar={() => setCamaraActiva(true)}
              alApagar={() => setCamaraActiva(false)}
              simulado={modo === 'presentacion'}
            />
          )}
          {provisional ? (
            <Confirmacion
              pregunta={pregunta}
              provisional={provisional}
              alConfirmar={confirmar}
              alDescartar={descartar}
            />
          ) : (
            <Respuestas
              pregunta={pregunta}
              alResponder={proponer}
              conCamara={pregunta.tipo === 'sena' && modo !== 'simulado'}
            />
          )}
        </section>
      </div>
    </Marco>
  )
}

function Entrega({
  icono,
  titulo,
  accion,
  alRecibir,
}: {
  icono: ReactNode
  titulo: string
  accion: string
  alRecibir: () => void
}) {
  return (
    <Marco>
      <section className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="bg-marca grid size-44 place-items-center rounded-full text-white shadow-lg">
          {icono}
        </div>
        <h1 className="text-3xl font-bold sm:text-4xl">{titulo}</h1>
        <button
          type="button"
          onClick={alRecibir}
          className="bg-marca rounded-boton min-h-16 w-full max-w-sm px-8 text-xl font-semibold text-white shadow-md"
        >
          {accion}
        </button>
      </section>
    </Marco>
  )
}

/** P0 = SÍ: el flujo se detiene. MARI no asigna prioridades (FLU1). */
function Alerta({ alEntregar }: { alEntregar: () => void }) {
  return (
    <Marco>
      <section
        role="alert"
        className="flex flex-1 flex-col items-center justify-center gap-8 text-center"
      >
        <div className="bg-alerta grid size-44 place-items-center rounded-full text-white shadow-lg">
          <Siren size={96} aria-hidden />
        </div>
        <h1 className="text-alerta text-4xl font-bold">Avisa al personal ahora</h1>
        <div className="flex items-center gap-3 text-xl">
          <HandHelping size={40} aria-hidden /> Levanta la mano o muestra esta pantalla.
        </div>
        <button
          type="button"
          onClick={alEntregar}
          className="bg-superficie rounded-boton text-tinta min-h-14 px-8 font-semibold ring-2 ring-black/10"
        >
          Entregar al profesional
        </button>
      </section>
    </Marco>
  )
}

/**
 * Sin consulta. La inicia el profesional desde su vista (PRO, Emmy).
 * Mientras esa vista no exista, aquí hay un inicio de prueba para recorrer el flujo.
 */
function SinConsulta() {
  const { iniciarConsulta } = useConsulta()
  const [preguntarEmbarazo, setPreguntarEmbarazo] = useState(false)
  return (
    <Marco>
      <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6">
        <h1 className="text-3xl font-bold">No hay una consulta en curso</h1>
        <p className="text-tinta/80">El profesional inicia la consulta y entrega la tablet.</p>
        <div className="bg-superficie flex flex-col gap-4 rounded-3xl p-5 ring-1 ring-black/10">
          <p className="text-tinta/70 text-sm font-semibold uppercase">
            Inicio de prueba (temporal)
          </p>
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
            onClick={() => iniciarConsulta({ preguntarEmbarazo })}
            className="bg-marca rounded-boton min-h-14 font-semibold text-white"
          >
            Iniciar consulta
          </button>
        </div>
      </section>
    </Marco>
  )
}

function ConElProfesional() {
  return (
    <Marco>
      <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <Stethoscope size={72} aria-hidden className="text-marca" />
        <h1 className="text-3xl font-bold">La tablet la tiene el profesional</h1>
        <Link to="/profesional" className="text-marca text-lg font-semibold underline">
          Ir a la vista del profesional
        </Link>
      </section>
    </Marco>
  )
}

function BancoInvalido({ errores }: { errores: string[] }) {
  return (
    <Marco>
      <section role="alert" className="flex flex-col gap-4">
        <h1 className="text-alerta flex items-center gap-2 text-2xl font-bold">
          <TriangleAlert aria-hidden /> El banco de preguntas tiene errores
        </h1>
        <p>No se puede iniciar una consulta hasta corregirlos:</p>
        <ul className="list-disc pl-6 font-mono text-sm">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>
    </Marco>
  )
}
