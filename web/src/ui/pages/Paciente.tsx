import { Logo } from '@/ui/components/Logo'

/** Vista del paciente. El flujo guiado se implementa en el paso a). */
export function Paciente() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Logo className="h-12 w-auto" />
      <p className="mt-8 text-lg">Aquí irá el flujo guiado de preguntas en LSP.</p>
    </main>
  )
}
