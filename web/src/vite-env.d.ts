/// <reference types="vite/client" />

/** Variables de entorno de MARI. Solo se leen como texto: 'true' activa la opción. */
interface ImportMetaEnv {
  /** Activa /recolector (M3). Nunca en la demo pública. */
  readonly VITE_RECOLECTOR?: string
  /** "presentacion" usa la cámara real y la seña la elige quien opera la demo. */
  readonly VITE_RECONOCEDOR?: string
  /** "true" reproduce los videos no validados con la etiqueta "Video no validado" (§5.5). */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
