import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/ui/cn'
import { estilosBoton, type VariantesBoton } from './estilos'

export type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantesBoton

/** Botón del sistema visual. Variantes: primario, exito, secundario, fantasma, peligro. */
export function Boton({
  variante,
  tamano,
  ancho,
  className,
  type = 'button',
  ...props
}: BotonProps) {
  return (
    <button
      type={type}
      className={cn(estilosBoton({ variante, tamano, ancho }), className)}
      {...props}
    />
  )
}
