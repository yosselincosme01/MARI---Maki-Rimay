/**
 * Tipos de las señas (contrato §5.1). Viven en el dominio porque los usa la regla de decisión
 * (`decidirSena`), que es lógica pura; `application/puertos/tipos.ts` los re-exporta.
 */

export type ClaseSena = 'DOLOR' | 'TOS' | 'FIEBRE' | 'FALTA_DE_AIRE' | 'SI' | 'NO' | 'OTRA'

/** Una inferencia del modelo sobre una ventana de 30 fotogramas. */
export interface Inferencia {
  clase: ClaseSena
  /** 0..1, la más alta del softmax. */
  confianza: number
  /** Marca de tiempo de la ventana. */
  tiempoMs: number
}
