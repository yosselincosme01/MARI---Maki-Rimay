import { createBrowserRouter } from 'react-router'
import { Inicio } from '@/ui/pages/Inicio'
import { Landing } from '@/ui/pages/Landing'
import { Paciente } from '@/ui/pages/Paciente'
import { Profesional } from '@/ui/pages/Profesional'

/**
 * Rutas de la app. Un solo dispositivo pasa de mano en mano:
 *  /             → página de presentación (landing)
 *  /app          → inicio de la demo; el profesional inicia la sesión
 *  /paciente     → flujo guiado de preguntas en LSP
 *  /profesional  → resumen, repreguntas y avisos
 */
export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/app', element: <Inicio /> },
  { path: '/paciente', element: <Paciente /> },
  { path: '/profesional', element: <Profesional /> },
])
