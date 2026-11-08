/**
 * Conexión entre React y la consulta (CNS).
 *
 * La consulta es un store de Zustand sin React. Se crea una sola vez al arrancar la app
 * (ver `src/composicion.ts`) y llega a las pantallas por este contexto.
 */
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { Consulta, StoreConsulta } from '@/application/consulta/crear-consulta'
import type { Banco } from '@/domain/banco/tipos'

export type RecursosConsulta =
  | { ok: true; banco: Banco; consulta: StoreConsulta; modoDemo: boolean }
  /** El banco no es válido: la interfaz muestra los errores y no inicia la consulta (BAN1). */
  | { ok: false; errores: string[]; modoDemo: boolean }

export const ContextoConsulta = createContext<RecursosConsulta | null>(null)

export function useRecursos(): RecursosConsulta {
  const recursos = useContext(ContextoConsulta)
  if (!recursos) throw new Error('Falta <ProveedorConsulta> alrededor de la app.')
  return recursos
}

function useRecursosValidos() {
  const recursos = useRecursos()
  if (!recursos.ok) throw new Error('El banco de preguntas no es válido.')
  return recursos
}

export function useBanco(): Banco {
  return useRecursosValidos().banco
}

/** Estado y casos de uso de la consulta. La pantalla se actualiza con cada cambio. */
export function useConsulta(): Consulta {
  return useStore(useRecursosValidos().consulta)
}

export function useModoDemo(): boolean {
  return useRecursos().modoDemo
}
