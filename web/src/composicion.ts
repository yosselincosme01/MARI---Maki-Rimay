/**
 * Raíz de composición: aquí se eligen las piezas reales de cada puerto y se conectan.
 * Es el único lugar donde la app junta dominio, aplicación e infraestructura.
 */
import { crearConsulta } from '@/application/consulta/crear-consulta'
import { crearMotor } from '@/domain/flujo/motor-banco'
import { cargarBanco } from '@/infrastructure/banco-json/cargarBanco'
import { crearGrabadorSimulado } from '@/infrastructure/simuladores/grabador-simulado'
import type { RecursosConsulta } from '@/ui/consulta/contexto'

export function crearRecursos(): RecursosConsulta {
  const modoDemo = import.meta.env.VITE_DEMO === 'true'
  const resultado = cargarBanco()
  if (!resultado.ok) return { ok: false, errores: resultado.errores, modoDemo }

  const consulta = crearConsulta({
    motor: crearMotor(resultado.banco),
    // Simulado hasta que exista el mensaje libre (LIB).
    grabador: crearGrabadorSimulado(),
    generarId: () => crypto.randomUUID(),
    ahora: () => new Date(),
  })
  return { ok: true, banco: resultado.banco, consulta, modoDemo }
}
