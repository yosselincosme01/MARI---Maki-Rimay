/**
 * Símbolos de las respuestas, dibujados en SVG: no dependen de archivos ni de internet.
 * Son decorativos para lectores de pantalla (aria-hidden): el nombre accesible lo da el texto
 * del botón. Para quien no lee, el símbolo es lo que comunica.
 */
import { CircleHelp } from 'lucide-react'
import { cn } from '@/ui/cn'
import { urlPublica } from '@/ui/consulta/recursos'
import type { TipoSimbolo, Zona } from './simbolos'

type Tamano = 'md' | 'lg'

const ALTO: Record<Tamano, string> = { md: 'h-20', lg: 'h-32' }

export function Simbolo({ simbolo, tamano = 'md' }: { simbolo: TipoSimbolo; tamano?: Tamano }) {
  switch (simbolo.tipo) {
    case 'pictograma':
      return (
        <img
          src={urlPublica(simbolo.ruta)}
          alt=""
          className={cn(ALTO[tamano], 'aspect-square object-contain')}
        />
      )
    case 'zona':
      // La figura es alta y angosta: un poco más grande que los pictogramas para que se lea.
      return <SiluetaZona zona={simbolo.zona} className={tamano === 'md' ? 'h-24' : 'h-36'} />
    case 'dias':
      return (
        <DiasMarcados
          marcados={simbolo.marcados}
          mas={simbolo.mas}
          className={tamano === 'md' ? 'h-10' : 'h-16'}
        />
      )
    case 'escala':
      return <Barras llenas={simbolo.nivel} total={simbolo.total} grande={tamano === 'lg'} />
    case 'duda':
      return (
        <CircleHelp
          aria-hidden
          strokeWidth={1.75}
          className={cn(ALTO[tamano], 'text-tinta-suave w-auto')}
        />
      )
  }
}

/* ─────────────────────────────── Silueta con la zona ─────────────────────────────── */

/** Gris de las partes no marcadas: con contraste suficiente para ver la figura completa. */
const BASE = '#bccac7'
const MARCA = 'var(--color-marca)'

/**
 * Figura humana por partes. De frente tiene cara; de espalda (zona ESPALDA) no tiene cara y
 * se pinta todo el tronco: así se distingue sin leer. "Otra zona" lleva un signo de pregunta.
 */
export function SiluetaZona({ zona, className }: { zona: Zona; className?: string }) {
  const deEspalda = zona === 'ESPALDA'
  const color = (...zonas: Zona[]) => (zonas.includes(zona) ? MARCA : BASE)
  const tronco = deEspalda ? MARCA : undefined

  return (
    <svg viewBox="0 0 64 128" className={cn('w-auto', className)} aria-hidden>
      {/* brazos */}
      <rect x="7" y="31" width="9" height="40" rx="4.5" fill={color('BRAZOS')} />
      <rect x="48" y="31" width="9" height="40" rx="4.5" fill={color('BRAZOS')} />
      {/* piernas */}
      <rect x="19" y="70" width="12" height="52" rx="5" fill={color('PIERNAS')} />
      <rect x="33" y="70" width="12" height="52" rx="5" fill={color('PIERNAS')} />
      {/* tronco: pecho, abdomen superior e inferior */}
      <rect x="18" y="29" width="28" height="17" rx="6" fill={tronco ?? color('PECHO')} />
      <rect
        x="19"
        y="47.5"
        width="26"
        height="10"
        rx="2"
        fill={tronco ?? color('ABDOMEN_SUPERIOR')}
      />
      <rect
        x="19"
        y="59"
        width="26"
        height="11"
        rx="4"
        fill={tronco ?? color('ABDOMEN_INFERIOR')}
      />
      {/* cuello y cabeza */}
      <rect x="27.5" y="22" width="9" height="7" rx="2" fill={color('GARGANTA')} />
      <circle cx="32" cy="12.5" r="10" fill={color('CABEZA')} />
      {deEspalda ? (
        // Pelo: de espalda no se ve la cara.
        <path
          d="M22.5 11a9.5 9.5 0 0 1 19 0v3h-19z"
          fill="var(--color-tinta-suave)"
          opacity="0.55"
        />
      ) : (
        <g fill="var(--color-tinta)">
          <circle cx="28.3" cy="11.5" r="1.4" />
          <circle cx="35.7" cy="11.5" r="1.4" />
          <path
            d="M28.5 16.2q3.5 2.6 7 0"
            stroke="var(--color-tinta)"
            strokeWidth="1.3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      )}
      {zona === 'OTRA_ZONA' && (
        <g>
          <circle cx="52" cy="14" r="10" fill={MARCA} />
          <text
            x="52"
            y="18.5"
            textAnchor="middle"
            fontSize="14"
            fontWeight="700"
            fill="white"
            fontFamily="sans-serif"
          >
            ?
          </text>
        </g>
      )}
    </svg>
  )
}

/* ─────────────────────────────── Días marcados ─────────────────────────────── */

/**
 * Una semana como fila de 7 días; hoy es el último. Se marcan hacia atrás los días que dura
 * el síntoma: hoy = 1, ayer = 2, varios días = 4, una semana o más = 7 y una flecha.
 */
export function DiasMarcados({
  marcados,
  mas = false,
  className,
}: {
  marcados: number
  mas?: boolean
  className?: string
}) {
  const ancho = 13
  const paso = 16
  const inicio = 18
  return (
    <svg viewBox="0 0 132 30" className={cn('w-auto', className)} aria-hidden>
      {mas && (
        <path
          d="M14 15H3m0 0l5-5m-5 5l5 5"
          stroke={MARCA}
          strokeWidth="2.6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {Array.from({ length: 7 }, (_, i) => {
        const marcado = i >= 7 - marcados
        const esHoy = i === 6
        return (
          <rect
            key={i}
            x={inicio + i * paso}
            y={esHoy ? 3 : 6}
            width={ancho}
            height={esHoy ? 24 : 18}
            rx="3"
            fill={marcado ? MARCA : BASE}
            opacity={marcado || esHoy ? 1 : 0.7}
          />
        )
      })}
    </svg>
  )
}

/* ─────────────────────────────── Barras de intensidad ─────────────────────────────── */

/** Barras de altura creciente: "leve" llena 1, "fuerte" llena todas. */
export function Barras({
  llenas,
  total,
  grande = false,
}: {
  llenas: number
  total: number
  grande?: boolean
}) {
  return (
    <span className={cn('flex items-end gap-1.5', grande ? 'h-24' : 'h-16')} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'rounded-sm',
            grande ? 'w-5' : 'w-3.5',
            i < llenas ? 'bg-marca' : 'bg-superficie-2',
          )}
          style={{ height: `${((i + 1) / total) * 100}%` }}
        />
      ))}
    </span>
  )
}
