import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Estilos de botón del sistema visual. Se usan en <Boton> y también en enlaces que deben
 * verse como botón: <Link className={estilosBoton({ variante: 'secundario' })}>.
 *
 * Tamaños pensados para tablet: el más chico mide 48 px de alto (OPC1).
 */
export const estilosBoton = cva(
  'inline-flex items-center justify-center gap-2 rounded-boton font-semibold whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        primario: 'bg-marca text-white shadow-tarjeta hover:bg-marca-oscuro',
        exito: 'bg-cruz text-white shadow-tarjeta hover:brightness-95',
        secundario:
          'border border-borde bg-superficie text-tinta shadow-tarjeta hover:border-tinta/30 hover:bg-superficie-2',
        fantasma: 'text-marca-oscuro hover:bg-marca-suave',
        peligro: 'border border-alerta/30 bg-superficie text-alerta hover:bg-alerta-suave',
      },
      tamano: {
        md: 'h-12 px-5 text-base',
        lg: 'h-14 px-6 text-lg',
        xl: 'h-18 px-8 text-xl',
      },
      ancho: {
        auto: '',
        completo: 'w-full',
      },
    },
    defaultVariants: { variante: 'primario', tamano: 'lg', ancho: 'auto' },
  },
)

export type VariantesBoton = VariantProps<typeof estilosBoton>

/** Tarjeta base: superficie blanca, borde fino y sombra mínima. */
export const tarjeta = 'rounded-tarjeta border border-borde bg-superficie shadow-tarjeta'
