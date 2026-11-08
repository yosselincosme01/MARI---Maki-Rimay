import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { Landing } from '@/ui/pages/Landing'
import { Paciente } from '@/ui/pages/Paciente'
import { Profesional } from '@/ui/pages/Profesional'

/**
 * Rutas de la app. Un solo dispositivo pasa de mano en mano:
 *  /             → página de presentación (landing)
 *  /app          → entrada de la demo: lleva a la vista del profesional, que inicia todo
 *  /paciente     → la persona responde las preguntas en LSP
 *  /profesional  → la consulta: preguntar, resumen en vivo e informe
 *  /recolector   → solo con VITE_RECOLECTOR=true: grabación de señas para entrenar (M3)
 */
export function crearRutas({ recolector }: { recolector: boolean }): RouteObject[] {
  const rutas: RouteObject[] = [
    { path: '/', element: <Landing /> },
    // Todo empieza con el profesional: sin pantalla de elección ni pulsación larga.
    { path: '/app', element: <Navigate to="/profesional" replace /> },
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
