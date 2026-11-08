import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'
import { Hand, ShieldCheck, Stethoscope } from 'lucide-react'
import { cn } from '@/ui/cn'
import { tarjeta } from '@/ui/components/base/estilos'
import { BotonMantener } from '@/ui/components/BotonMantener'
import { Logo } from '@/ui/components/Logo'

/** Pantalla de inicio de la tablet: el profesional inicia la consulta; la persona continúa. */
export function Inicio() {
  const navegar = useNavigate()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-borde bg-superficie border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo className="h-9 w-auto" />
          <span className="text-tinta-suave hidden text-sm sm:block">
            Consulta externa en Lengua de Señas Peruana
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-3xl sm:text-4xl">¿Quién usa la tablet?</h1>
          <p className="text-tinta-suave text-lg">
            El profesional inicia la consulta y luego entrega la tablet a la persona.
          </p>
        </div>

        <nav className="grid gap-4 sm:grid-cols-2" aria-label="Elegir vista">
          {/* Mantener pulsado evita que la persona entre por accidente (PRO3). */}
          <BotonMantener
            alCompletar={() => void navegar('/profesional')}
            className={cn(tarjeta, opcion, 'text-tinta-suave')}
          >
            <Contenido
              icono={<Stethoscope size={32} strokeWidth={1.75} aria-hidden />}
              titulo="Profesional de salud"
              texto="Inicia la consulta y revisa el resumen."
            />
          </BotonMantener>
          <Link to="/paciente" className={cn(tarjeta, opcion)}>
            <Contenido
              icono={<Hand size={32} strokeWidth={1.75} aria-hidden />}
              titulo="Empezar como paciente"
              texto="Si el profesional ya te entregó la tablet."
            />
          </Link>
        </nav>

        <p className="text-tinta-suave flex items-center justify-center gap-2 text-sm">
          <ShieldCheck size={18} className="text-marca shrink-0" aria-hidden />
          MARI no guarda datos: todo se borra al terminar la consulta.
        </p>
      </main>
    </div>
  )
}

const opcion =
  'flex min-h-56 flex-col items-center justify-center gap-4 p-6 text-center transition-colors hover:border-marca'

function Contenido({ icono, titulo, texto }: { icono: ReactNode; titulo: string; texto: string }) {
  return (
    <span className="flex flex-col items-center gap-3">
      <span className="bg-marca-suave text-marca grid size-16 place-items-center rounded-full">
        {icono}
      </span>
      <span className="font-display text-tinta text-xl font-semibold">{titulo}</span>
      <span className="text-tinta-suave text-base font-normal">{texto}</span>
    </span>
  )
}
