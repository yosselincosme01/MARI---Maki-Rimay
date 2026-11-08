import type { ReactNode } from 'react'
import { ContextoConsulta, type RecursosConsulta } from './contexto'

export function ProveedorConsulta({
  recursos,
  children,
}: {
  recursos: RecursosConsulta
  children: ReactNode
}) {
  return <ContextoConsulta.Provider value={recursos}>{children}</ContextoConsulta.Provider>
}
