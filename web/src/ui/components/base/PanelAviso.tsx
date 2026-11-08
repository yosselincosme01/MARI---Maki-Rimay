import type { ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { tarjeta } from './estilos'

interface PanelAvisoProps {
  icono: ReactNode
  titulo: string
  texto?: string | undefined
  children?: ReactNode
  tono?: 'marca' | 'alerta'
  rol?: 'alert'
}

/**
 * Pantalla centrada con un mensaje y, si hace falta, una acción: entregas de tablet, esperas y
 * alertas. La comparten la vista paciente y la profesional para que se vean igual.
 */
export function PanelAviso({
  icono,
  titulo,
  texto,
  children,
  tono = 'marca',
  rol,
}: PanelAvisoProps) {
  return (
    <section role={rol} className="flex flex-1 items-center justify-center">
      <div
        className={cn(
          tarjeta,
          'flex w-full max-w-lg flex-col items-center gap-6 p-8 text-center sm:p-10',
          tono === 'alerta' && 'border-alerta/30 bg-alerta-suave',
        )}
      >
        <div
          className={cn(
            'grid size-24 place-items-center rounded-full',
            tono === 'alerta' ? 'bg-alerta text-white' : 'bg-marca-suave text-marca',
          )}
        >
          {icono}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className={cn('text-3xl', tono === 'alerta' && 'text-alerta')}>{titulo}</h1>
          {texto && <p className="text-tinta-suave text-lg">{texto}</p>}
        </div>
        {children}
      </div>
    </section>
  )
}
