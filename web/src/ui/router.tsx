import { createBrowserRouter, type RouteObject } from 'react-router'
import { Inicio } from '@/ui/pages/Inicio'
import { Landing } from '@/ui/pages/Landing'
import { Paciente } from '@/ui/pages/Paciente'
import { Profesional } from '@/ui/pages/Profesional'

/**
 * Rutas de la app. Un solo dispositivo pasa de mano en mano:
 *  /             → página de presentación (landing)
 *  /app          → inicio de la demo; el profesional inicia la consulta
 *  /paciente     → flujo guiado de preguntas en LSP
 *  /profesional  → resumen, repreguntas y avisos
 *  /recolector   → solo con VITE_RECOLECTOR=true: grabación de señas para entrenar (M3)
 */
export function crearRutas({ recolector }: { recolector: boolean }): RouteObject[] {
  const rutas: RouteObject[] = [
    { path: '/', element: <Landing /> },
    { path: '/app', element: <Inicio /> },
    { path: '/paciente', element: <Paciente /> },
    { path: '/profesional', element: <Profesional /> },
  ]
  if (recolector) {
    // Carga diferida: MediaPipe solo se descarga al abrir esta ruta.
    rutas.push({
      path: '/recolector',
      lazy: async () => ({ Component: (await import('@/ui/pages/Recolector')).default }),
    })
  }
  return rutas
}

export const router = createBrowserRouter(
  crearRutas({ recolector: import.meta.env.VITE_RECOLECTOR === 'true' }),
)
