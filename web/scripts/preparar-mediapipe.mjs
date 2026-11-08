/**
 * Deja MediaPipe listo dentro del proyecto, en public/mediapipe/:
 *   - wasm/: el motor de MediaPipe, copiado de node_modules (misma versión que package.json).
 *   - modelos/: los modelos de manos y pose, descargados una vez de Google y verificados.
 *
 * Así la app nunca descarga nada mientras se usa: nada sale del dispositivo y funciona sin
 * internet. La carpeta no se sube al repositorio (.gitignore); este script la recrea.
 *
 * Se ejecuta solo antes de `npm run dev` y `npm run build`. Si todo está, no hace nada.
 */
import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const destino = join(raiz, 'public', 'mediapipe')
const origenWasm = join(raiz, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm')

/** Archivos que carga FilesetResolver.forVisionTasks() (con y sin SIMD). */
const ARCHIVOS_WASM = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]

/** Modelos oficiales, con su huella SHA-256: si no coincide, no se usan. */
const MODELOS = [
  {
    archivo: 'hand_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
    sha256: 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1',
  },
  {
    archivo: 'pose_landmarker_lite.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
    sha256: '59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a',
  },
]

const sha256 = (datos) => createHash('sha256').update(datos).digest('hex')
const existe = (ruta) =>
  stat(ruta).then(
    () => true,
    () => false,
  )

async function copiarWasm() {
  const dir = join(destino, 'wasm')
  await mkdir(dir, { recursive: true })
  for (const archivo of ARCHIVOS_WASM) {
    const de = join(origenWasm, archivo)
    const a = join(dir, archivo)
    // Copia si falta o si cambió la versión instalada de MediaPipe.
    if ((await existe(a)) && sha256(await readFile(a)) === sha256(await readFile(de))) continue
    await copyFile(de, a)
    console.log(`  copiado wasm/${archivo}`)
  }
}

async function descargarModelos() {
  const dir = join(destino, 'modelos')
  await mkdir(dir, { recursive: true })
  for (const { archivo, url, sha256: esperado } of MODELOS) {
    const ruta = join(dir, archivo)
    if ((await existe(ruta)) && sha256(await readFile(ruta)) === esperado) continue

    console.log(`  descargando modelos/${archivo}…`)
    const respuesta = await fetch(url)
    if (!respuesta.ok) throw new Error(`No se pudo descargar ${archivo}: HTTP ${respuesta.status}`)
    const datos = Buffer.from(await respuesta.arrayBuffer())
    if (sha256(datos) !== esperado) {
      throw new Error(`La huella de ${archivo} no coincide. No se usará: puede estar alterado.`)
    }
    await writeFile(ruta, datos)
  }
}

try {
  await copiarWasm()
  await descargarModelos()
} catch (error) {
  console.error(`\n✗ MediaPipe no quedó listo: ${error.message}`)
  console.error('  Revisa tu conexión y vuelve a ejecutar: npm run mediapipe\n')
  process.exit(1)
}
