import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { crearRecursos } from '@/composicion'
import { ProveedorConsulta } from '@/ui/consulta/ProveedorConsulta'
import { router } from '@/ui/router'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root en index.html')

// Una sola consulta por pestaña, solo en memoria: recargar o cerrar la borra.
const recursos = crearRecursos()

createRoot(root).render(
  <StrictMode>
    <ProveedorConsulta recursos={recursos}>
      <RouterProvider router={router} />
    </ProveedorConsulta>
  </StrictMode>,
)
