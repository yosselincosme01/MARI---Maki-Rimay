/**
 * /recolector — solo para el equipo y señantes voluntarios (nunca para pacientes).
 * Solo existe con VITE_RECOLECTOR=true (criterio M3).
 *
 * Paso 2: vista de prueba del extractor. La captura de muestras se agrega en el paso 3.
 */
import { VistaPuntos } from '@/ui/components/VistaPuntos'

export default function Recolector() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <p className="text-marca text-xs font-semibold tracking-[0.2em] uppercase">
          Solo equipo · no usar con pacientes
        </p>
        <h1 className="mt-2 text-3xl font-bold">Recolector de señas</h1>
        <p className="text-tinta/70 mt-2">
          Comprueba la captura: levanta la mano <strong>derecha</strong> y verifica que se marque
          "Mano derecha". Los hombros deben verse siempre.
        </p>
      </header>
      <VistaPuntos />
    </main>
  )
}
