/** Búsqueda de repreguntas (contrato §5.1). Yosselin implementa (BUS). */

export interface Sugerencia {
  /** Siempre una pregunta del grupo "repregunta". */
  preguntaId: string
  /** 0..1 */
  similitud: number
}

export interface Buscador {
  /** Carga el modelo. Si falla, el adaptador cambia solo al respaldo por texto. */
  preparar(): Promise<void>
  /** Máximo 3 sugerencias, ordenadas, ya filtradas por el umbral. Vacío = sin coincidencia. */
  buscar(texto: string): Promise<{ metodo: 'semantico' | 'texto'; sugerencias: Sugerencia[] }>
}
