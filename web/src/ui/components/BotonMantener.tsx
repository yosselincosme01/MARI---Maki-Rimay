/**
 * Botón que se activa al MANTENERLO pulsado (criterio PRO3).
 *
 * Evita que la persona entre por accidente a la vista profesional en una tablet compartida.
 * No es una medida de seguridad: cualquiera que lo mantenga pulsado entra.
 *
 * Funciona con dedo, ratón y teclado (Enter o Espacio sostenidos). Un anillo muestra el avance.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface BotonMantenerProps {
  alCompletar: () => void
  children: ReactNode
  /** Tiempo que hay que mantenerlo pulsado. */
  duracionMs?: number
  className?: string
}

export function BotonMantener({
  alCompletar,
  children,
  duracionMs = 2000,
  className = '',
}: BotonMantenerProps) {
  const [avance, setAvance] = useState(0) // 0 a 1
  const inicio = useRef<number | null>(null)
  const temporizador = useRef<number | undefined>(undefined)
  const cuadro = useRef<number | undefined>(undefined)
  const ayuda = useId()

  function detener() {
    inicio.current = null
    window.clearTimeout(temporizador.current)
    if (cuadro.current !== undefined) cancelAnimationFrame(cuadro.current)
    setAvance(0)
  }

  function empezar() {
    if (inicio.current !== null) return // ya se está manteniendo
    inicio.current = performance.now()
    temporizador.current = window.setTimeout(() => {
      detener()
      alCompletar()
    }, duracionMs)
    const animar = () => {
      if (inicio.current === null) return
      setAvance(Math.min(1, (performance.now() - inicio.current) / duracionMs))
      cuadro.current = requestAnimationFrame(animar)
    }
    cuadro.current = requestAnimationFrame(animar)
  }

  // Si el componente desaparece a mitad, no debe quedar un temporizador vivo.
  useEffect(
    () => () => {
      window.clearTimeout(temporizador.current)
      if (cuadro.current !== undefined) cancelAnimationFrame(cuadro.current)
    },
    [],
  )

  const esTeclaDeAccion = (tecla: string) => tecla === 'Enter' || tecla === ' '

  return (
    <button
      type="button"
      aria-describedby={ayuda}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        empezar()
      }}
      onPointerUp={detener}
      onPointerCancel={detener}
      onPointerLeave={detener}
      onKeyDown={(e) => {
        if (!esTeclaDeAccion(e.key)) return
        e.preventDefault() // evita el clic inmediato del teclado
        if (!e.repeat) empezar()
      }}
      onKeyUp={(e) => esTeclaDeAccion(e.key) && detener()}
      onBlur={detener}
      onContextMenu={(e) => e.preventDefault()} // pulsación larga en móvil no abre menú
      className={`relative overflow-hidden select-none ${className}`}
    >
      <span
        aria-hidden
        className="bg-marca/20 absolute inset-y-0 left-0"
        style={{ width: `${avance * 100}%` }}
      />
      <span className="relative flex flex-col items-center gap-3">{children}</span>
      <span id={ayuda} className="relative mt-2 block text-sm font-normal opacity-70">
        Mantén pulsado {duracionMs / 1000} segundos
      </span>
    </button>
  )
}
