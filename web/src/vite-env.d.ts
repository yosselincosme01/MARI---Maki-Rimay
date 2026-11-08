/// <reference types="vite/client" />

/** Variables de entorno de MARI. Solo se leen como texto: 'true' activa la opción. */
interface ImportMetaEnv {
  /** Activa /recolector (M3). Nunca en la demo pública. */
  readonly VITE_RECOLECTOR?: string
  /** Reproduce videos no validados con su etiqueta (DEM). */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
