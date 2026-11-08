/**
 * /recolector — solo para el equipo y señantes voluntarios (nunca para pacientes).
 * Solo existe con VITE_RECOLECTOR=true (criterio M3).
 *
 * Graba repeticiones de cada seña como puntos normalizados (sin video) y las guarda como
 * CLASE_P03_rep012.json en la carpeta elegida (ml/data/landmarks/).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Circle, FolderOpen, Undo2 } from 'lucide-react'
import type { ClaseSena } from '@/application/puertos/tipos'
import { cerrarCaptura } from '@/application/recoleccion/captura'
import {
  CLASES,
  REPETICIONES_OBJETIVO,
  contarRepeticiones,
  crearMuestra,
  esCodigoSenante,
  nombreArchivo,
  siguienteRepeticion,
} from '@/application/recoleccion/muestra'
import type { FotogramaCrudo } from '@/domain/senas/normalizar'
import {
  destinoDescargas,
  elegirCarpeta,
  puedeElegirCarpeta,
  type Destino,
} from '@/infrastructure/recoleccion/carpeta'
import type { Delegado, Extractor } from '@/infrastructure/senas/extractor'
import { VistaPuntos } from '@/ui/components/VistaPuntos'

const ETIQUETAS: Record<ClaseSena, string> = {
  DOLOR: 'Dolor',
  TOS: 'Tos',
  FIEBRE: 'Fiebre',
  FALTA_DE_AIRE: 'Falta de aire',
  SI: 'Sí',
  NO: 'No',
  OTRA: 'Otra',
}

const DURACIONES_MS = [1500, 2000, 2500, 3000]
const SEGUNDOS_CUENTA = 3

type Fase =
  | { tipo: 'espera' }
  | { tipo: 'cuenta'; segundos: number }
  | { tipo: 'grabando'; inicio: number }
  | { tipo: 'guardando' }

type Aviso = { tipo: 'ok' | 'error'; texto: string } | null

export default function Recolector() {
  const [consentimiento, setConsentimiento] = useState(false)
  const [senante, setSenante] = useState('')
  const [destino, setDestino] = useState<Destino | null>(null)
  const [existentes, setExistentes] = useState<string[]>([])
  const [clase, setClase] = useState<ClaseSena>('DOLOR')
  const [duracionMs, setDuracionMs] = useState(2000)
  const [delegado, setDelegado] = useState<Delegado | null>(null)
  const [fase, setFase] = useState<Fase>({ tipo: 'espera' })
  const [aviso, setAviso] = useState<Aviso>(null)
  const [ultima, setUltima] = useState<string | null>(null)

  /** Fotogramas de la repetición en curso. Una ref: no debe provocar renders por fotograma. */
  const grabados = useRef<{ tiempoMs: number; crudo: FotogramaCrudo }[]>([])
  const grabando = useRef(false)
  const temporizadores = useRef<number[]>([])

  useEffect(
    () => () => temporizadores.current.forEach((t) => window.clearTimeout(t)), // al salir
    [],
  )

  const codigoValido = esCodigoSenante(senante)
  const puedeGrabar =
    consentimiento &&
    codigoValido &&
    destino !== null &&
    delegado !== null &&
    fase.tipo === 'espera'

  const alFotograma = useCallback((crudo: FotogramaCrudo, tiempoMs: number) => {
    if (grabando.current) grabados.current.push({ tiempoMs, crudo })
  }, [])

  const alListo = useCallback((extractor: Extractor) => setDelegado(extractor.delegado), [])

  async function elegirDestino() {
    try {
      const elegido = puedeElegirCarpeta() ? await elegirCarpeta() : destinoDescargas()
      setExistentes(await elegido.listar())
      setDestino(elegido)
      setAviso(null)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return // canceló
      setAviso({ tipo: 'error', texto: (error as Error).message })
    }
  }

  const grabar = useCallback(async () => {
    if (!puedeGrabar || !destino || !delegado) return
    setAviso(null)
    // Los temporizadores se guardan para cancelarlos si se sale de la página.
    const esperar = (ms: number) =>
      new Promise<void>((listo) => temporizadores.current.push(window.setTimeout(listo, ms)))

    for (let s = SEGUNDOS_CUENTA; s > 0; s--) {
      setFase({ tipo: 'cuenta', segundos: s })
      await esperar(1000)
    }

    grabados.current = []
    grabando.current = true
    setFase({ tipo: 'grabando', inicio: performance.now() })
    await esperar(duracionMs)
    grabando.current = false
    setFase({ tipo: 'guardando' })

    const resultado = cerrarCaptura(grabados.current)
    grabados.current = []
    if (resultado.tipo === 'descartada') {
      setAviso({ tipo: 'error', texto: `Muestra descartada: ${resultado.motivo}` })
      setFase({ tipo: 'espera' })
      return
    }

    const repeticion = siguienteRepeticion(existentes, clase, senante)
    const nombre = nombreArchivo(clase, senante, repeticion)
    const muestra = crearMuestra({
      clase,
      senante,
      repeticion,
      fecha: new Date(),
      fotogramas: resultado.fotogramas,
      captura: {
        duracionMs,
        fotogramasValidos: resultado.validos,
        fotogramasTotales: resultado.totales,
        delegado,
      },
    })
    try {
      await destino.guardar(nombre, JSON.stringify(muestra))
      setExistentes((lista) => [...lista, nombre])
      setUltima(nombre)
      setAviso({
        tipo: 'ok',
        texto: `Guardada ${nombre} (${resultado.validos} de ${resultado.totales} fotogramas válidos).`,
      })
    } catch (error) {
      setAviso({ tipo: 'error', texto: `No se pudo guardar: ${(error as Error).message}` })
    }
    setFase({ tipo: 'espera' })
  }, [puedeGrabar, destino, delegado, duracionMs, existentes, clase, senante])

  // Barra espaciadora: quien opera puede grabar sin buscar el botón.
  useEffect(() => {
    const alTeclear = (evento: KeyboardEvent) => {
      const escribiendo = (evento.target as HTMLElement).closest('input, select, textarea')
      if (evento.code === 'Space' && !escribiendo) {
        evento.preventDefault()
        void grabar()
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [grabar])

  async function deshacer() {
    if (!ultima || !destino?.borrar) return
    try {
      await destino.borrar(ultima)
      setExistentes((lista) => lista.filter((n) => n !== ultima))
      setAviso({ tipo: 'ok', texto: `Se borró ${ultima}.` })
      setUltima(null)
    } catch (error) {
      setAviso({ tipo: 'error', texto: `No se pudo borrar: ${(error as Error).message}` })
    }
  }

  const ocupado = fase.tipo !== 'espera'

  return (
    <main className="mx-auto grid max-w-6xl gap-8 p-6 lg:grid-cols-[1.3fr_1fr]">
      <header className="lg:col-span-2">
        <p className="text-alerta text-xs font-semibold tracking-[0.2em] uppercase">
          Solo equipo · no usar con pacientes
        </p>
        <h1 className="mt-2 text-3xl font-bold">Recolector de señas</h1>
        <p className="text-tinta/70 mt-2 max-w-3xl">
          Se guardan solo puntos normalizados, nunca video. Los hombros deben verse siempre. Para
          <strong> Otra</strong>, graba reposo, transiciones y señas que no estén en la lista.
        </p>
      </header>

      <VistaPuntos
        alFotograma={alFotograma}
        alListo={alListo}
        superposicion={<Superposicion fase={fase} duracionMs={duracionMs} />}
      />

      <section className="space-y-6" aria-label="Configuración de la grabación">
        <fieldset disabled={ocupado} className="space-y-3">
          <legend className="font-semibold">1. Persona señante</legend>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={consentimiento}
              onChange={(e) => setConsentimiento(e.target.checked)}
              className="accent-marca mt-1 size-5"
            />
            <span>La persona leyó y firmó el consentimiento informado.</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium">Código (nunca el nombre)</span>
            <input
              value={senante}
              onChange={(e) => setSenante(e.target.value.toUpperCase().trim())}
              placeholder="P01"
              maxLength={3}
              aria-invalid={senante !== '' && !codigoValido}
              className="bg-superficie aria-[invalid=true]:ring-alerta mt-1 block w-28 rounded-xl px-3 py-2 font-mono text-lg ring-1 ring-black/15"
            />
          </label>
        </fieldset>

        <fieldset disabled={ocupado} className="space-y-2">
          <legend className="font-semibold">2. Dónde guardar</legend>
          <button
            onClick={elegirDestino}
            className="bg-superficie hover:ring-marca flex min-h-12 items-center gap-2 rounded-xl px-4 py-2 ring-1 ring-black/15"
          >
            <FolderOpen size={20} aria-hidden />
            {destino
              ? `Carpeta: ${destino.nombre}`
              : puedeElegirCarpeta()
                ? 'Elegir carpeta (ml/data/landmarks)'
                : 'Guardar en Descargas'}
          </button>
          {destino?.tipo === 'descargas' && (
            <p className="text-tinta/60 text-sm">
              Este navegador no permite elegir carpeta: cada muestra se descargará. Mejor usa
              Chrome.
            </p>
          )}
        </fieldset>

        <fieldset disabled={ocupado} className="space-y-3">
          <legend className="font-semibold">3. Seña</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {CLASES.map((c) => {
              const hechas = codigoValido ? contarRepeticiones(existentes, c, senante) : 0
              return (
                <button
                  key={c}
                  onClick={() => setClase(c)}
                  aria-pressed={c === clase}
                  className={`min-h-12 rounded-xl px-3 py-2 text-left ring-1 transition-colors ${
                    c === clase ? 'bg-marca ring-marca text-white' : 'bg-superficie ring-black/15'
                  }`}
                >
                  <span className="block font-semibold">{ETIQUETAS[c]}</span>
                  <span className="text-xs opacity-75">
                    {hechas} / {REPETICIONES_OBJETIVO}
                  </span>
                </button>
              )
            })}
          </div>
          <label className="flex items-center gap-3 text-sm">
            Duración
            <select
              value={duracionMs}
              onChange={(e) => setDuracionMs(Number(e.target.value))}
              className="bg-superficie rounded-lg px-2 py-1 ring-1 ring-black/15"
            >
              {DURACIONES_MS.map((ms) => (
                <option key={ms} value={ms}>
                  {ms / 1000} s
                </option>
              ))}
            </select>
          </label>
        </fieldset>

        <div className="space-y-3">
          <button
            onClick={() => void grabar()}
            disabled={!puedeGrabar}
            className="bg-alerta flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-lg font-semibold text-white disabled:opacity-40"
          >
            <Circle size={18} fill="currentColor" aria-hidden /> Grabar {ETIQUETAS[clase]}
            <kbd className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs">espacio</kbd>
          </button>
          {!puedeGrabar && fase.tipo === 'espera' && (
            <p className="text-tinta/60 text-sm">
              Falta:{' '}
              {[
                !consentimiento && 'consentimiento',
                !codigoValido && 'código P01',
                !destino && 'carpeta',
                !delegado && 'activar la cámara',
              ]
                .filter(Boolean)
                .join(', ')}
              .
            </p>
          )}
          {aviso && (
            <p
              role={aviso.tipo === 'error' ? 'alert' : 'status'}
              className={`rounded-xl px-4 py-3 text-sm ${
                aviso.tipo === 'ok' ? 'bg-cruz/10 text-tinta' : 'bg-alerta/10 text-alerta'
              }`}
            >
              {aviso.texto}
            </p>
          )}
          {ultima && destino?.borrar && fase.tipo === 'espera' && (
            <button
              onClick={deshacer}
              className="text-tinta/70 hover:text-tinta flex items-center gap-1 text-sm"
            >
              <Undo2 size={16} aria-hidden /> Deshacer {ultima}
            </button>
          )}
        </div>
      </section>
    </main>
  )
}

/** Cuenta regresiva y aviso de grabación sobre la cámara. */
function Superposicion({ fase, duracionMs }: { fase: Fase; duracionMs: number }) {
  if (fase.tipo === 'cuenta') {
    return (
      <div
        className="pointer-events-none absolute inset-0 grid place-items-center bg-black/30"
        aria-live="assertive"
      >
        <span className="text-9xl font-extrabold text-white drop-shadow-lg">{fase.segundos}</span>
      </div>
    )
  }
  if (fase.tipo === 'grabando') {
    return (
      <div className="pointer-events-none absolute inset-x-0 top-0 p-4" aria-live="assertive">
        <span className="bg-alerta inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-semibold text-white">
          <span className="size-2.5 animate-pulse rounded-full bg-white" /> Grabando
        </span>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/30">
          <div
            className="bg-alerta h-full origin-left"
            style={{ animation: `llenar ${duracionMs}ms linear forwards` }}
          />
        </div>
      </div>
    )
  }
  return null
}
