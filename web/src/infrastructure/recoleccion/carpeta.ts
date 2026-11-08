/**
 * Dónde se guardan las muestras del recolector (M3). Única excepción a "nada se guarda":
 * solo puntos normalizados de señantes voluntarios, nunca video ni datos de pacientes.
 *
 * - Chrome/Edge: se elige una carpeta una vez (File System Access API) y cada muestra se
 *   escribe ahí directamente. Se puede deshacer la última.
 * - Otros navegadores: cada muestra se descarga como archivo.
 */

/** Tipos mínimos de la File System Access API que aún no trae TypeScript. */
interface SelectorDeCarpeta {
  showDirectoryPicker?: (opciones?: {
    id?: string
    mode?: 'read' | 'readwrite'
  }) => Promise<FileSystemDirectoryHandle>
}
interface CarpetaIterable {
  keys(): AsyncIterable<string>
}

export interface Destino {
  tipo: 'carpeta' | 'descargas'
  /** Nombre visible: la carpeta elegida o "Descargas". */
  nombre: string
  /** Archivos que ya existen, para continuar la numeración. */
  listar(): Promise<string[]>
  /** Nunca sobrescribe: si el archivo ya existe, falla. */
  guardar(nombreArchivo: string, contenido: string): Promise<void>
  /** Solo en carpeta: permite deshacer la última muestra. */
  borrar?: (nombreArchivo: string) => Promise<void>
}

export const puedeElegirCarpeta = () =>
  typeof (window as Window & SelectorDeCarpeta).showDirectoryPicker === 'function'

export async function elegirCarpeta(): Promise<Destino> {
  const selector = (window as Window & SelectorDeCarpeta).showDirectoryPicker
  if (!selector) throw new Error('Este navegador no permite elegir carpetas. Usa Chrome o Edge.')
  const carpeta = await selector({ id: 'mari-recolector', mode: 'readwrite' })

  const existe = async (nombre: string) => {
    try {
      await carpeta.getFileHandle(nombre)
      return true
    } catch {
      return false
    }
  }

  return {
    tipo: 'carpeta',
    nombre: carpeta.name,
    async listar() {
      const nombres: string[] = []
      for await (const nombre of (carpeta as unknown as CarpetaIterable).keys())
        nombres.push(nombre)
      return nombres
    },
    async guardar(nombreArchivo, contenido) {
      if (await existe(nombreArchivo)) {
        throw new Error(`Ya existe ${nombreArchivo}. No se sobrescribe.`)
      }
      const archivo = await carpeta.getFileHandle(nombreArchivo, { create: true })
      const escritor = await archivo.createWritable()
      await escritor.write(contenido)
      await escritor.close()
    },
    async borrar(nombreArchivo) {
      await carpeta.removeEntry(nombreArchivo)
    },
  }
}

export function destinoDescargas(): Destino {
  return {
    tipo: 'descargas',
    nombre: 'Descargas',
    async listar() {
      return [] // no se puede leer la carpeta de descargas: la numeración empieza en la sesión
    },
    async guardar(nombreArchivo, contenido) {
      const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }))
      const enlace = Object.assign(document.createElement('a'), {
        href: url,
        download: nombreArchivo,
      })
      enlace.click()
      URL.revokeObjectURL(url)
    },
  }
}
