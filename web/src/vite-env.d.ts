/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" reproduce los videos no validados con la etiqueta "Video no validado" (§5.5). */
  readonly VITE_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
