import { useEffect, useState } from 'react'
import {
  Camera,
  Check,
  Hand,
  PlayCircle,
  Repeat,
  RotateCcw,
  Search,
  ShieldCheck,
  Stethoscope,
  X,
} from 'lucide-react'

/**
 * Maqueta interactiva del flujo, para la página de presentación.
 * Muestra los 5 momentos de MARI. Avanza sola cada pocos segundos,
 * salvo que la persona prefiera menos movimiento o elija un paso.
 */
/** Orden real: 1–3 se repiten por cada pregunta; el resumen va al final. */
const PASOS = ['Pregunta', 'Responde', 'Confirma', 'Repregunta', 'Resumen'] as const

/**
 * Ejemplo ilustrativo de búsqueda semántica. Los porcentajes son de muestra;
 * en la app saldrán del modelo de embeddings que corre en el navegador.
 */
const REPREGUNTA = {
  escrita: '¿Hace cuánto tiempo tiene la fiebre?',
  coincidencias: [
    { pregunta: '¿Desde cuándo?', parecido: 86 },
    { pregunta: '¿Ha empeorado, mejorado o sigue igual?', parecido: 41 },
    { pregunta: '¿Qué tan fuerte es?', parecido: 37 },
  ],
}
type Paso = (typeof PASOS)[number]

const SINTOMAS = [
  { id: 'dolor', etiqueta: 'Dolor' },
  { id: 'tos', etiqueta: 'Tos' },
  { id: 'fiebre', etiqueta: 'Fiebre' },
  { id: 'falta-de-aire', etiqueta: 'Falta de aire' },
]

const INTERVALO_MS = 4500

export function TabletDemo() {
  const [indice, setIndice] = useState(0)
  const [automatico, setAutomatico] = useState(true)

  useEffect(() => {
    const menosMovimiento = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!automatico || menosMovimiento) return
    const id = window.setInterval(() => setIndice((i) => (i + 1) % PASOS.length), INTERVALO_MS)
    return () => window.clearInterval(id)
  }, [automatico])

  const paso = PASOS[indice] ?? 'Pregunta'

  return (
    <figure className="relative mx-auto w-full max-w-[25rem]">
      {/* Halo de color detrás del dispositivo */}
      <div
        className="from-marca-claro/40 to-cruz/20 absolute -inset-10 -z-10 rounded-full bg-gradient-to-br blur-3xl"
        aria-hidden
      />

      <div className="bg-tinta rounded-[2.75rem] p-2.5 shadow-[0_40px_80px_-30px_rgb(21_69_63/0.55)]">
        <div
          id="demo-pantalla"
          role="tabpanel"
          className="bg-fondo flex h-[30rem] flex-col overflow-hidden rounded-[2.25rem]"
        >
          <Pantalla paso={paso} />
        </div>
      </div>

      {/* Selector de pasos: barra de progreso fina + descripción del paso */}
      <div role="tablist" aria-label="Pasos de MARI" className="mt-7 grid grid-cols-5 gap-2">
        {PASOS.map((nombre, i) => (
          <button
            key={nombre}
            role="tab"
            aria-selected={i === indice}
            aria-controls="demo-pantalla"
            onClick={() => {
              setIndice(i)
              setAutomatico(false)
            }}
            className="group text-left"
          >
            <span
              className={`block h-1 rounded-full transition-colors ${
                i <= indice ? 'bg-marca' : 'bg-tinta/15 group-hover:bg-tinta/30'
              }`}
            />
            <span
              className={`mt-2 block text-[0.68rem] font-semibold tracking-tight sm:text-xs ${
                i === indice ? 'text-tinta' : 'text-tinta/45'
              }`}
            >
              {nombre}
            </span>
          </button>
        ))}
        {/* Marca que los pasos 1–3 forman un ciclo por cada pregunta */}
        <span className="text-marca col-span-3 mt-1 flex items-center gap-1.5 text-[0.68rem] font-semibold sm:text-xs">
          <span className="border-marca/50 h-2 flex-1 rounded-b-md border-x border-b" aria-hidden />
          <Repeat size={13} aria-hidden /> por cada pregunta
          <span className="border-marca/50 h-2 flex-1 rounded-b-md border-x border-b" aria-hidden />
        </span>
      </div>
      <figcaption
        className="text-tinta/70 mt-3 min-h-12 text-sm leading-relaxed"
        aria-live="polite"
      >
        {DESCRIPCIONES[paso]}
      </figcaption>
    </figure>
  )
}

const DESCRIPCIONES: Record<Paso, string> = {
  Pregunta: 'La pregunta llega en video, en Lengua de Señas Peruana.',
  Responde: 'La persona responde con señas frente a la cámara, o tocando un pictograma.',
  Confirma: 'MARI devuelve lo que entendió. La persona acepta o corrige, sin leer.',
  Repregunta:
    'Si falta un dato, el profesional escribe su pregunta y elige un video LSP validado. La tablet vuelve a la persona.',
  Resumen: 'Al final, el profesional recibe solo lo confirmado, incluidas las repreguntas.',
}

function Pantalla({ paso }: { paso: Paso }) {
  switch (paso) {
    case 'Pregunta':
      return (
        <>
          <video
            className="min-h-0 w-full flex-1 bg-black object-cover"
            src="/videos/preguntas/01-que-sientes.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Pregunta ¿Qué sientes? en Lengua de Señas Peruana"
          />
          <div className="flex items-center justify-between gap-3 p-4">
            <span className="text-tinta/50 text-xs font-semibold tracking-wider whitespace-nowrap uppercase">
              Pregunta 2 de 11
            </span>
            <span className="bg-marca grid size-14 place-items-center rounded-full text-white shadow-md">
              <RotateCcw size={24} aria-label="Repetir video" />
            </span>
            <span className="bg-superficie grid size-14 place-items-center rounded-full ring-1 ring-black/10">
              <Camera size={24} aria-label="Responder con la cámara" />
            </span>
          </div>
        </>
      )
    case 'Responde':
      return (
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="bg-tinta relative grid flex-1 place-items-center rounded-2xl text-white/80">
            <span className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-semibold">
              <i className="size-2.5 animate-pulse rounded-full bg-red-500" /> Cámara
            </span>
            <div className="border-marca-claro grid size-36 place-items-center rounded-3xl border-4 border-dashed">
              <Hand size={64} aria-hidden />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {SINTOMAS.map((s) => (
              <Pictograma key={s.id} id={s.id} etiqueta={s.etiqueta} />
            ))}
          </div>
          <p className="text-tinta/70 text-center text-sm">Con señas, o tocando un dibujo.</p>
        </div>
      )
    case 'Confirma':
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
          <div className="bg-superficie rounded-3xl p-4 shadow-md ring-1 ring-black/5">
            <img src="/pictogramas/dolor.png" alt="Dolor" className="size-40" />
          </div>
          <div className="grid w-full grid-cols-2 gap-3">
            <span className="bg-cruz grid h-20 place-items-center rounded-3xl text-white">
              <Check size={44} strokeWidth={3} aria-label="Sí, es eso" />
            </span>
            <span className="bg-superficie text-alerta grid h-20 place-items-center rounded-3xl ring-2 ring-black/10">
              <X size={44} strokeWidth={3} aria-label="No, cambiar" />
            </span>
          </div>
          <p className="text-tinta/70 text-center text-sm">La persona confirma. Sin leer.</p>
        </div>
      )
    case 'Resumen':
      return (
        <div className="flex flex-1 flex-col p-5 text-sm">
          <p className="text-marca flex items-center gap-2 font-semibold">
            <Stethoscope size={18} aria-hidden /> Para el profesional
          </p>
          <h4 className="mt-3 font-bold">Alerta inicial</h4>
          <p className="mt-1">No refiere dificultad para respirar ni dolor fuerte en el pecho.</p>
          <h4 className="mt-3 font-bold">Síntomas referidos</h4>
          <p className="mt-1">
            Dolor en abdomen bajo derecho desde ayer, intensidad fuerte, ha empeorado.
          </p>
          <p className="mt-1">Fiebre, inicio no especificado, intensidad media, sigue igual.</p>
          <h4 className="mt-3 font-bold">Antecedentes</h4>
          <p className="mt-1">Alergias: no. Medicamentos: no especificado.</p>
          <h4 className="mt-3 font-bold">Repreguntas</h4>
          <p className="mt-1">¿Desde cuándo? (fiebre): hoy.</p>
          <p className="text-tinta/60 mt-auto border-t border-black/10 pt-3 text-xs">
            Información referida y confirmada por la persona. No constituye diagnóstico.
          </p>
        </div>
      )
    case 'Repregunta':
      return (
        <div className="flex flex-1 flex-col p-5 text-sm">
          <p className="text-marca flex items-center gap-2 font-semibold">
            <Stethoscope size={18} aria-hidden /> El profesional pregunta
          </p>
          <p className="bg-superficie mt-3 flex items-center gap-2 rounded-2xl px-4 py-3 ring-1 ring-black/10">
            <Search size={16} className="text-tinta/50 shrink-0" aria-hidden />
            {REPREGUNTA.escrita}
          </p>
          <p className="text-tinta/60 mt-4 text-xs font-semibold tracking-wide uppercase">
            Videos LSP validados más parecidos
          </p>
          <ul className="mt-2 space-y-2">
            {REPREGUNTA.coincidencias.map((c, i) => (
              <li
                key={c.pregunta}
                className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 ${
                  i === 0 ? 'bg-marca text-white' : 'bg-superficie ring-1 ring-black/10'
                }`}
              >
                <PlayCircle size={22} className="shrink-0" aria-hidden />
                <span className="flex-1 font-medium">{c.pregunta}</span>
                <span className="text-xs font-semibold opacity-75">{c.parecido}%</span>
              </li>
            ))}
          </ul>
          <p className="text-tinta/70 mt-auto flex items-start gap-2 border-t border-black/10 pt-3 text-xs">
            <ShieldCheck size={16} className="text-marca shrink-0" aria-hidden />
            Nunca genera señas. Si no hay un video parecido: solicitar intérprete.
          </p>
        </div>
      )
  }
}

function Pictograma({ id, etiqueta }: { id: string; etiqueta: string }) {
  return (
    <span className="bg-superficie flex flex-col items-center rounded-2xl p-1.5 ring-1 ring-black/10">
      <img src={`/pictogramas/${id}.png`} alt={etiqueta} className="aspect-square w-full" />
      <span className="text-tinta/60 mt-0.5 text-[0.65rem] leading-tight">{etiqueta}</span>
    </span>
  )
}
