/** Grabación del mensaje libre (contrato §5.1). Emmy implementa (LIB). */
export interface Grabador {
  /** Graba sin audio hasta maxSeg. El Blob vive solo en memoria. */
  grabar(maxSeg: number, alProgreso?: (seg: number) => void): Promise<Blob>
  cancelar(): void
  /** Libera todos los Blob y URLs creadas. Lo llama terminarConsulta. */
  descartarTodo(): void
}
