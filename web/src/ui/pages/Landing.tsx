import { Link } from 'react-router'
import { ArrowDown, ArrowRight, Box, BrainCircuit, CheckCheck, FileText } from 'lucide-react'
import type { ReactNode } from 'react'
import { Logo } from '@/ui/components/Logo'
import { TabletDemo } from '@/ui/landing/TabletDemo'

/**
 * Página de presentación para el jurado. Responde, en este orden:
 * ¿qué problema? → ¿cómo se ve la solución? → ¿qué tiene de nuevo?
 * → ¿es responsable? → ¿qué sigue?
 *
 * Estilo editorial: tipografía grande, espacio en blanco y líneas finas
 * en lugar de tarjetas.
 */
export function Landing() {
  return (
    <div className="bg-fondo">
      <Encabezado />
      <main>
        <Portada />
        <Principios />
        <Problema />
        <Innovacion />
        <Etica />
        <SiguientePaso />
        <Cierre />
      </main>
      <Pie />
    </div>
  )
}

/* ─────────────────────────── Piezas comunes ─────────────────────────── */

const contenedor = 'mx-auto w-full max-w-6xl px-5 sm:px-8'

function Antetitulo({ children, claro = false }: { children: ReactNode; claro?: boolean }) {
  return (
    <p
      className={`flex items-center gap-3 text-xs font-semibold tracking-[0.2em] uppercase ${
        claro ? 'text-marca-claro' : 'text-marca'
      }`}
    >
      <span className="h-px w-8 bg-current" aria-hidden />
      {children}
    </p>
  )
}

function BotonDemo({ claro = false }: { claro?: boolean }) {
  return (
    <Link
      to="/app"
      className={`group inline-flex items-center gap-3 rounded-full py-4 pr-5 pl-7 text-base font-semibold transition-colors ${
        claro ? 'text-tinta hover:bg-fondo bg-white' : 'bg-tinta hover:bg-marca-oscuro text-white'
      }`}
    >
      Probar la demo
      <span
        className={`grid size-8 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 ${
          claro ? 'bg-tinta text-white' : 'bg-marca-claro text-tinta'
        }`}
      >
        <ArrowRight size={16} aria-hidden />
      </span>
    </Link>
  )
}

/* ───────────────────────────── Secciones ───────────────────────────── */

function Encabezado() {
  return (
    <header className="bg-fondo/80 sticky top-0 z-20 backdrop-blur-md">
      <div className={`${contenedor} flex items-center justify-between py-4`}>
        <Link to="/" aria-label="MARI, inicio">
          <Logo className="h-10 w-auto sm:h-12" />
        </Link>
        <nav
          aria-label="Secciones"
          className="text-tinta/70 hidden gap-9 text-sm font-medium md:flex"
        >
          <a href="#problema" className="hover:text-tinta">
            Problema
          </a>
          <a href="#innovacion" className="hover:text-tinta">
            Innovación
          </a>
          <a href="#etica" className="hover:text-tinta">
            Ética
          </a>
          <a href="#siguiente" className="hover:text-tinta">
            Investigación
          </a>
        </nav>
        <Link
          to="/app"
          className="border-tinta/15 hover:border-tinta rounded-full border px-5 py-2 text-sm font-semibold transition-colors"
        >
          Probar demo
        </Link>
      </div>
    </header>
  )
}

function Portada() {
  return (
    <section aria-labelledby="portada-titulo" className="relative overflow-hidden">
      {/* Fondo: degradado suave con los colores de la marca */}
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_80%_10%,rgb(99_184_166/0.25),transparent_60%),radial-gradient(40rem_30rem_at_0%_100%,rgb(57_169_126/0.12),transparent_60%)]"
        aria-hidden
      />
      <div
        className={`${contenedor} grid items-center gap-16 pt-14 pb-24 lg:grid-cols-[1.1fr_1fr] lg:pt-20`}
      >
        <div>
          <Antetitulo>Prototipo de investigación · Hackathon FACI 2026</Antetitulo>
          <h1
            id="portada-titulo"
            className="mt-7 text-[2.75rem] leading-[1.05] font-extrabold sm:text-6xl lg:text-7xl"
          >
            La consulta médica también{' '}
            <span className="from-marca to-cruz bg-gradient-to-r bg-clip-text text-transparent">
              habla en señas.
            </span>
          </h1>
          <p className="text-tinta/75 mt-7 max-w-md text-lg leading-relaxed sm:text-xl">
            Personas sordas usuarias de LSP cuentan qué sienten antes de su consulta. Sin leer, sin
            intérprete presente, sin nube.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <BotonDemo />
            <a
              href="#problema"
              className="text-tinta/70 hover:text-tinta inline-flex items-center gap-2 font-semibold"
            >
              Conocer más <ArrowDown size={18} aria-hidden />
            </a>
          </div>
        </div>
        <TabletDemo />
      </div>
    </section>
  )
}

/** Franja fina de principios, separados por puntos. Sin cajas. */
function Principios() {
  const items = [
    'Lengua de Señas Peruana',
    'IA en el dispositivo',
    'Sin nube',
    'Se borra al terminar',
  ]
  return (
    <div className="border-tinta/10 border-y">
      <ul
        className={`${contenedor} text-tinta/60 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-6 text-sm font-medium sm:justify-between`}
      >
        {items.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <span className="bg-cruz size-1.5 rounded-full" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Problema() {
  const puntos = [
    'No siempre hay intérprete de LSP en la consulta.',
    'El castellano escrito es segunda lengua para muchas personas sordas.',
    'Un síntoma mal entendido al inicio afecta toda la atención.',
  ]
  return (
    <section id="problema" aria-labelledby="problema-titulo" className="py-24 sm:py-32">
      <div className={`${contenedor} grid gap-14 lg:grid-cols-2`}>
        <div>
          <Antetitulo>El problema</Antetitulo>
          <h2 id="problema-titulo" className="mt-6 text-4xl leading-tight font-bold sm:text-5xl">
            Sin intérprete, la consulta empieza a ciegas.
          </h2>
        </div>
        <ol className="lg:pt-12">
          {puntos.map((punto, i) => (
            <li key={punto} className="border-tinta/10 flex gap-6 border-t py-6 last:border-b">
              <span className="font-display text-marca w-8 shrink-0 text-sm font-bold">
                0{i + 1}
              </span>
              <p className="text-xl leading-snug font-medium">{punto}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Innovacion() {
  const items = [
    {
      icono: <BrainCircuit size={28} strokeWidth={1.5} />,
      titulo: 'Reconoce señas en el dispositivo',
      texto: 'MediaPipe y una red neuronal GRU, ejecutadas en el navegador.',
    },
    {
      icono: <CheckCheck size={28} strokeWidth={1.5} />,
      titulo: 'Nada sin confirmar',
      texto: 'Cada respuesta vuelve como seña o pictograma, para aceptar o corregir.',
    },
    {
      icono: <Box size={28} strokeWidth={1.5} />,
      titulo: 'Cuerpo 3D',
      texto: 'La persona señala dónde le duele, en lugar de describirlo.',
    },
    {
      icono: <FileText size={28} strokeWidth={1.5} />,
      titulo: 'Resumen que no inventa',
      texto: 'Plantilla fija con lo confirmado. Lo demás, "no especificado".',
    },
  ]
  return (
    <section
      id="innovacion"
      aria-labelledby="innovacion-titulo"
      className="bg-white py-24 sm:py-32"
    >
      <div className={contenedor}>
        <Antetitulo>Qué la hace distinta</Antetitulo>
        <h2
          id="innovacion-titulo"
          className="mt-6 max-w-3xl text-4xl leading-tight font-bold sm:text-5xl"
        >
          Tecnología al servicio de la lengua de la persona.
        </h2>
        <ul className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.titulo} className="border-marca border-t-2 pt-6">
              <span className="text-marca" aria-hidden>
                {item.icono}
              </span>
              <h3 className="mt-5 text-lg font-bold">{item.titulo}</h3>
              <p className="text-tinta/65 mt-2 leading-relaxed">{item.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Etica() {
  const limites = [
    'No diagnostica',
    'No hace triaje',
    'No traduce LSP libre',
    'No reemplaza intérpretes',
  ]
  return (
    <section
      id="etica"
      aria-labelledby="etica-titulo"
      className="bg-tinta py-24 text-white sm:py-32"
    >
      <div className={contenedor}>
        <Antetitulo claro>Ética y privacidad</Antetitulo>
        <h2
          id="etica-titulo"
          className="mt-6 max-w-4xl text-4xl leading-tight font-bold sm:text-6xl"
        >
          Apoya la consulta. <span className="text-marca-claro">No la reemplaza.</span>
        </h2>
        <ul className="mt-14 grid border-t border-white/15 sm:grid-cols-2 lg:grid-cols-4">
          {limites.map((limite) => (
            <li
              key={limite}
              className="border-b border-white/15 py-6 text-lg font-medium sm:pr-6 lg:border-b-0"
            >
              {limite}
            </li>
          ))}
        </ul>
        <p className="mt-10 max-w-2xl text-lg leading-relaxed text-white/70">
          Todo ocurre en el dispositivo y se borra al terminar la sesión. Si la persona refiere
          dificultad para respirar o dolor fuerte en el pecho, MARI pide avisar al personal y se
          detiene.
        </p>
      </div>
    </section>
  )
}

function SiguientePaso() {
  const pasos = [
    'Validar señas y pictogramas con la comunidad sorda e intérpretes LSP.',
    'Revisar el banco de preguntas con profesionales de salud.',
    'Piloto en consulta externa de primer nivel.',
  ]
  return (
    <section id="siguiente" aria-labelledby="siguiente-titulo" className="py-24 sm:py-32">
      <div className={contenedor}>
        <Antetitulo>Lo que sigue</Antetitulo>
        <h2 id="siguiente-titulo" className="mt-6 text-4xl leading-tight font-bold sm:text-5xl">
          De prototipo a investigación.
        </h2>
        {/* Línea de tiempo: horizontal en pantallas grandes, vertical en celular */}
        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          <span
            className="bg-tinta/15 absolute top-0 bottom-0 left-[0.6875rem] w-px md:top-[0.6875rem] md:right-0 md:bottom-auto md:left-0 md:h-px md:w-full"
            aria-hidden
          />
          {pasos.map((paso, i) => (
            <li key={paso} className="relative pl-12 md:pt-12 md:pl-0">
              <span
                className="border-marca bg-fondo absolute top-0 left-0 grid size-6 place-items-center rounded-full border-2"
                aria-hidden
              >
                <span className="bg-marca size-2 rounded-full" />
              </span>
              <p className="font-display text-marca text-sm font-bold">Fase {i + 1}</p>
              <p className="mt-2 text-xl leading-snug font-medium">{paso}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Cierre() {
  return (
    <section
      aria-labelledby="cierre-titulo"
      className="from-marca to-marca-oscuro relative overflow-hidden bg-gradient-to-br py-24 text-center text-white sm:py-32"
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_0%,rgb(255_255_255/0.15),transparent)]"
        aria-hidden
      />
      <div className={`${contenedor} relative`}>
        <h2
          id="cierre-titulo"
          className="mx-auto max-w-3xl text-4xl leading-tight font-bold sm:text-6xl"
        >
          Mira cómo se siente una consulta accesible.
        </h2>
        <div className="mt-10 flex justify-center">
          <BotonDemo claro />
        </div>
      </div>
    </section>
  )
}

function Pie() {
  return (
    <footer className="py-10">
      <div
        className={`${contenedor} text-tinta/55 flex flex-col items-center justify-between gap-5 text-xs leading-relaxed sm:flex-row`}
      >
        <Logo className="h-9 w-auto" />
        <p className="text-center sm:text-right">
          Prototipo de investigación · Hackathon FACI 2026 · No constituye diagnóstico.
          <br />
          Pictogramas: Sergio Palao, ARASAAC (arasaac.org), CC BY-NC-SA, Gobierno de Aragón.
        </p>
      </div>
    </footer>
  )
}
