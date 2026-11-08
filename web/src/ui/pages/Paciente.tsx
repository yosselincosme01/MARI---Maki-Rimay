import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Hand,
  HandHelping,
  Siren,
  Stethoscope,
  TabletSmartphone,
  TriangleAlert,
} from 'lucide-react'
import { cn } from '@/ui/cn'
import { Boton } from '@/ui/components/base/Boton'
import { PanelAviso } from '@/ui/components/base/PanelAviso'
import { estilosBoton, tarjeta } from '@/ui/components/base/estilos'
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
      return (
        <Aviso
          icono={<TabletSmartphone size={44} strokeWidth={1.75} aria-hidden />}
          titulo="No hay una consulta en curso"
          texto="El profesional inicia la consulta desde su vista y te entrega el dispositivo."
        >
          <Link to="/app" className={estilosBoton({ variante: 'secundario', tamano: 'lg' })}>
            Volver al inicio
          </Link>
        </Aviso>
      )
    case 'entrega-paciente':
      return (
        <Aviso
          icono={<Hand size={44} strokeWidth={1.75} aria-hidden />}
          titulo="Entregue el dispositivo a la persona"
          texto="Las preguntas aparecerán en Lengua de Señas Peruana."
        >
          <Boton tamano="xl" ancho="completo" onClick={consulta.recibirTablet}>
            Ya tengo el dispositivo
          </Boton>
        </Aviso>
      )
    case 'paciente':
    case 'repregunta':
      return <PreguntaActiva />
    case 'alerta':
      return <Alerta alEntregar={consulta.entregarAlProfesional} />
    case 'entrega-profesional':
      return (
        <Aviso
          icono={<Stethoscope size={44} strokeWidth={1.75} aria-hidden />}
          titulo="Entregue el dispositivo al profesional"
          texto="Terminaste. Gracias por tus respuestas."
        >
          <Boton
            tamano="xl"
            ancho="completo"
            onClick={() => {
              consulta.recibirTablet()
              void navegar('/profesional')
            }}
          >
            Soy el profesional
          </Boton>
        </Aviso>
      )
    case 'profesional':
    case 'resumen':
      return (
        <Aviso
          icono={<Stethoscope size={44} strokeWidth={1.75} aria-hidden />}
          titulo="El profesional tiene el dispositivo"
        >
          <Link
            to="/profesional"
            className={estilosBoton({ variante: 'secundario', tamano: 'lg' })}
          >
            Ir a la vista del profesional
          </Link>
        </Aviso>
      )
  }
}

/** Estructura de la vista: barra superior fija y contenido centrado. */
function Marco({ children, contexto }: { children: ReactNode; contexto?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-borde bg-superficie/90 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo className="h-9 w-auto" />
          {contexto}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  )
}

function PreguntaActiva() {
  const banco = useBanco()
  const modoDemo = useModoDemo()
  const { fase, preguntaActiva, provisional, respuestas, proponer, confirmar, descartar } =
    useConsulta()
  const { reconocedor, modo } = useReconocimiento()
  // Se recuerda entre preguntas: si la persona activó la cámara, sigue activa.
  const [camaraActiva, setCamaraActiva] = useState(false)
  const pregunta = banco.preguntas.find((p) => p.id === preguntaActiva)
  const esRepregunta = fase === 'repregunta'
  const numero = respuestas.filter((r) => !r.repregunta).length + 1

  if (!pregunta) {
    return (
      <Marco>
        <p role="alert" className="text-alerta font-semibold">
          La pregunta {preguntaActiva} no está en el banco.
        </p>
      </Marco>
    )
  }

  return (
    <Marco
      contexto={
        <span className="bg-marca-suave text-marca-oscuro rounded-full px-3 py-1 text-sm font-semibold">
          {esRepregunta ? 'Pregunta del profesional' : `Pregunta ${numero}`}
        </span>
      }
    >
      {/* Tablet horizontal: video | respuesta. En móvil se apilan (PAC3). */}
      <div className="grid flex-1 grid-cols-1 items-start gap-6 md:grid-cols-2 lg:gap-10">
        <section aria-labelledby="pregunta" className="flex flex-col gap-4">
          <h1 id="pregunta" className="text-2xl sm:text-3xl">
            {pregunta.texto}
          </h1>
          <VideoLSP
            key={pregunta.id}
            video={pregunta.video}
            validado={pregunta.validado}
            texto={pregunta.texto}
            modoDemo={modoDemo}
          />
        </section>
        <section aria-label="Tu respuesta" className="flex flex-col gap-4 md:pt-12">
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

/** Pantalla centrada dentro de la estructura de la vista paciente. */
function Aviso(props: Parameters<typeof PanelAviso>[0]) {
  return (
    <Marco>
      <PanelAviso {...props} />
    </Marco>
  )
}

/** P0 = SÍ: el flujo se detiene. MARI no asigna prioridades (FLU1). */
function Alerta({ alEntregar }: { alEntregar: () => void }) {
  return (
    <Aviso
      rol="alert"
      tono="alerta"
      icono={<Siren size={44} strokeWidth={1.75} aria-hidden />}
      titulo="Avisa al personal ahora"
    >
      <p className="text-tinta flex items-center gap-3 text-lg">
        <HandHelping size={32} aria-hidden /> Levanta la mano o muestra esta pantalla.
      </p>
      <Boton variante="secundario" tamano="lg" ancho="completo" onClick={alEntregar}>
        Entregar al profesional
      </Boton>
    </Aviso>
  )
}

function BancoInvalido({ errores }: { errores: string[] }) {
  return (
    <Marco>
      <section
        role="alert"
        className={cn(tarjeta, 'border-alerta/30 bg-alerta-suave flex flex-col gap-4 p-6')}
      >
        <h1 className="text-alerta flex items-center gap-2 text-2xl">
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
