/**
 * Raíz de composición: aquí se eligen las piezas reales de cada puerto y se conectan.
 * Es el único lugar donde la app junta dominio, aplicación e infraestructura.
 */
import { crearConsulta } from '@/application/consulta/crear-consulta'
import { crearMotor } from '@/domain/flujo/motor-banco'
import { cargarBanco } from '@/infrastructure/banco-json/cargarBanco'
import { crearBuscadorTexto } from '@/infrastructure/busqueda/buscador-texto'
import { crearReconocedorPresentacion } from '@/infrastructure/senas/reconocedor-presentacion'
import { crearGrabadorSimulado } from '@/infrastructure/simuladores/grabador-simulado'
import { crearReconocedorSimulado } from '@/infrastructure/simuladores/reconocedor-simulado'
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
    // Modo conversación: qué pregunta abre un síntoma y cuál es un detalle de un síntoma.
    describir: (id) => {
      const pregunta = resultado.banco.preguntas.find((p) => p.id === id)
      return pregunta && { iniciaCiclo: pregunta.iniciaCiclo, porCiclo: pregunta.porCiclo }
    },
  })
  // El modelo real reemplazará a estos adaptadores sin tocar la interfaz.
  const reconocimiento =
    import.meta.env.VITE_RECONOCEDOR === 'presentacion' ? 'presentacion' : 'simulado'
  const reconocedor =
    reconocimiento === 'presentacion' ? crearReconocedorPresentacion() : crearReconocedorSimulado()

  // Búsqueda de repreguntas por texto, en el dispositivo (BUS4).
  const buscador = crearBuscadorTexto(resultado.banco)

  return {
    ok: true,
    banco: resultado.banco,
    consulta,
    modoDemo,
    reconocedor,
    reconocimiento,
    buscador,
  }
}
