import { Logo } from '@/ui/components/Logo'

/** Vista del profesional. El resumen se implementa en el paso a). */
export function Profesional() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <Logo className="h-12 w-auto" />
      <p className="mt-8 text-lg">Aquí irá el resumen con las respuestas confirmadas.</p>
    </main>
  )
}
