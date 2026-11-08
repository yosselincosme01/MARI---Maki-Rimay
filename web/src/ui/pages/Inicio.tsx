import { Link, useNavigate } from 'react-router'
import { Hand, Stethoscope } from 'lucide-react'
import { BotonMantener } from '@/ui/components/BotonMantener'
import { Logo } from '@/ui/components/Logo'

export function Inicio() {
  const navegar = useNavigate()
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center gap-10 p-6">
      <Logo className="h-auto w-full max-w-md" />
      <nav className="grid w-full gap-4 sm:grid-cols-2" aria-label="Elegir vista">
        <Link
          to="/paciente"
          className="bg-marca rounded-boton flex min-h-32 flex-col items-center justify-center gap-3 p-6 text-xl font-semibold text-white shadow-md"
        >
          <Hand size={48} aria-hidden />
          Empezar
        </Link>
        {/* Mantener pulsado evita que la persona entre por accidente (PRO3). */}
        <BotonMantener
          alCompletar={() => void navegar('/profesional')}
          className="rounded-boton bg-superficie text-tinta border-marca-claro min-h-32 border-2 p-6 text-xl font-semibold"
        >
          <Stethoscope size={48} aria-hidden />
          Profesional
        </BotonMantener>
      </nav>
    </main>
  )
}
