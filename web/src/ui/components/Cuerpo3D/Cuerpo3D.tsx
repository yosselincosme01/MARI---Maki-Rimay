/**
 * Cuerpo 3D para P2 "¿Dónde te duele?" (CUE1).
 *
 * - Toca el cuerpo para marcar dónde duele; MARI propone la zona y la persona la confirma.
 * - Frente / Espalda con botones, arrastrando hacia los lados o con las flechas del teclado.
 * - Si WebGL o el modelo no cargan, avisa con `alFallar` y la vista usa la lista (CUE2).
 *
 * Se carga aparte (React.lazy): three.js y el modelo solo se descargan al llegar a P2.
 * Dibuja solo cuando algo cambia, sin un bucle de animación, para no gastar batería.
 */
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { urlPublica } from '@/ui/consulta/recursos'
import { zonaDelToque, type ZonaCuerpo } from './zonas'

export interface Cuerpo3DProps {
  alTocar: (zona: ZonaCuerpo) => void
  alFallar: () => void
}

const COLOR_CUERPO = 0x63b8a6 // --color-marca-claro
const COLOR_MARCA = 0xb42318 // --color-alerta
const CENTRO_Y = 0.9 // mitad de la altura del modelo (1,79 m)
const PASO_TECLADO = Math.PI / 12
/** Un arrastre más corto que esto cuenta como toque. */
const TOLERANCIA_TOQUE_PX = 8

/** El modelo se descarga una sola vez por pestaña y se reutiliza al volver a P2. */
let cargaModelo: Promise<GLTF> | null = null
function cargarModelo(): Promise<GLTF> {
  cargaModelo ??= new GLTFLoader().loadAsync(urlPublica('models/human-body.glb'))
  cargaModelo.catch(() => (cargaModelo = null))
  return cargaModelo
}

export default function Cuerpo3D({ alTocar, alFallar }: Cuerpo3DProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const girar = useRef<(angulo: number, relativo?: boolean) => void>(() => {})
  const [cargando, setCargando] = useState(true)
  const [deEspalda, setDeEspalda] = useState(false)

  // Las funciones de las props cambian en cada render; la escena se monta una sola vez.
  const alTocarRef = useRef(alTocar)
  const alFallarRef = useRef(alFallar)
  useEffect(() => {
    alTocarRef.current = alTocar
    alFallarRef.current = alFallar
  })

  useEffect(() => {
    const div = contenedor.current
    if (!div) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      alFallarRef.current()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.style.touchAction = 'none' // el arrastre gira el cuerpo, no la página
    renderer.domElement.style.display = 'block'
    div.appendChild(renderer.domElement)

    const escena = new THREE.Scene()
    escena.add(new THREE.HemisphereLight(0xffffff, 0x8aa7a0, 2.2))
    const luz = new THREE.DirectionalLight(0xffffff, 1.6)
    luz.position.set(1.5, 3, 4)
    escena.add(luz)

    const camara = new THREE.PerspectiveCamera(30, 3 / 4, 0.1, 20)
    camara.position.set(0, CENTRO_Y, 3.9)
    camara.lookAt(0, CENTRO_Y, 0)

    // El cuerpo gira dentro de un pivote; el modelo conserva sus coordenadas originales.
    const pivote = new THREE.Group()
    escena.add(pivote)
    const marca = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 24, 16),
      new THREE.MeshBasicMaterial({ color: COLOR_MARCA, depthTest: false }),
    )
    marca.renderOrder = 1
    marca.visible = false
    pivote.add(marca)

    let modelo: THREE.Object3D | null = null
    let activo = true
    const dibujar = () => renderer.render(escena, camara)

    const ajustarTamano = () => {
      // Proporción 3:4, sin pasar del 58 % del alto de la pantalla (cabe en una tablet).
      const { width } = div.getBoundingClientRect()
      const alto = Math.min((width * 4) / 3, window.innerHeight * 0.58)
      const ancho = (alto * 3) / 4
      renderer.setSize(ancho, alto, false)
      Object.assign(renderer.domElement.style, {
        width: `${ancho}px`,
        height: `${alto}px`,
        margin: '0 auto',
      })
      dibujar()
    }
    const observador = new ResizeObserver(ajustarTamano)
    observador.observe(div)

    girar.current = (angulo, relativo = false) => {
      pivote.rotation.y = relativo ? pivote.rotation.y + angulo : angulo
      const vuelta = ((pivote.rotation.y % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      setDeEspalda(vuelta > Math.PI / 2 && vuelta < (3 * Math.PI) / 2)
      dibujar()
    }

    cargarModelo()
      .then((gltf) => {
        if (!activo) return
        modelo = gltf.scene
        modelo.traverse((objeto) => {
          if (objeto instanceof THREE.Mesh) {
            objeto.material = new THREE.MeshStandardMaterial({
              color: COLOR_CUERPO,
              roughness: 0.85,
            })
          }
        })
        pivote.add(modelo)
        setCargando(false)
        dibujar()
      })
      .catch(() => activo && alFallarRef.current())

    // Toque o arrastre con el mismo puntero (dedo, ratón o lápiz).
    const lienzo = renderer.domElement
    let inicio: { x: number; y: number; ultimoX: number } | null = null
    const raycaster = new THREE.Raycaster()

    const alBajar = (e: PointerEvent) => {
      inicio = { x: e.clientX, y: e.clientY, ultimoX: e.clientX }
      lienzo.setPointerCapture(e.pointerId)
    }
    const alMover = (e: PointerEvent) => {
      if (!inicio) return
      girar.current((e.clientX - inicio.ultimoX) * 0.01, true)
      inicio.ultimoX = e.clientX
    }
    const alSubir = (e: PointerEvent) => {
      if (!inicio) return
      const distancia = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y)
      inicio = null
      if (distancia > TOLERANCIA_TOQUE_PX || !modelo) return

      const caja = lienzo.getBoundingClientRect()
      const puntero = new THREE.Vector2(
        ((e.clientX - caja.left) / caja.width) * 2 - 1,
        -((e.clientY - caja.top) / caja.height) * 2 + 1,
      )
      raycaster.setFromCamera(puntero, camara)
      const golpe = raycaster.intersectObject(modelo, true).find((g) => g.face)
      if (!golpe?.face || !(golpe.object instanceof THREE.SkinnedMesh)) return

      const hueso = huesoDominante(golpe.object, golpe.face.a)
      const enModelo = modelo.worldToLocal(golpe.point.clone())
      const zona = zonaDelToque({ hueso, y: enModelo.y, haciaAtras: golpe.face.normal.z < 0 })

      marca.position.copy(pivote.worldToLocal(golpe.point.clone()))
      marca.visible = true
      dibujar()
      alTocarRef.current(zona)
    }
    lienzo.addEventListener('pointerdown', alBajar)
    lienzo.addEventListener('pointermove', alMover)
    lienzo.addEventListener('pointerup', alSubir)
    lienzo.addEventListener('pointercancel', () => (inicio = null))

    return () => {
      activo = false
      observador.disconnect()
      if (modelo) pivote.remove(modelo) // el modelo se reutiliza: no se libera
      marca.geometry.dispose()
      marca.material.dispose()
      renderer.dispose()
      lienzo.remove()
      girar.current = () => {}
    }
  }, [])

  return (
    <div className="rounded-tarjeta border-borde bg-superficie shadow-tarjeta relative overflow-hidden border">
      {/* Control segmentado sobre el lienzo: ahorra alto en la tablet. */}
      <div
        role="group"
        aria-label="Vista del cuerpo"
        className="bg-superficie-2 absolute top-3 left-1/2 z-10 grid -translate-x-1/2 grid-cols-2 gap-1 rounded-xl p-1"
      >
        <BotonVista activo={!deEspalda} onClick={() => girar.current(0)}>
          Frente
        </BotonVista>
        <BotonVista activo={deEspalda} onClick={() => girar.current(Math.PI)}>
          Espalda
        </BotonVista>
      </div>
      <div
        ref={contenedor}
        role="img"
        aria-label="Cuerpo en 3D. Toca dónde te duele. Usa las flechas para girarlo."
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') girar.current(-PASO_TECLADO, true)
          if (e.key === 'ArrowRight') girar.current(PASO_TECLADO, true)
        }}
        className="relative min-h-80 w-full pt-16"
      >
        {cargando && (
          <p className="text-tinta-suave absolute inset-0 grid place-items-center">
            Cargando cuerpo 3D…
          </p>
        )}
      </div>
      <p className="text-tinta-suave pb-3 text-center text-sm">
        Toca dónde te duele. Arrastra para girar.
      </p>
    </div>
  )
}

function BotonVista({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={`h-11 min-w-28 rounded-lg px-4 text-base font-semibold transition-colors ${
        activo ? 'bg-superficie text-tinta shadow-tarjeta' : 'text-tinta-suave hover:text-tinta'
      }`}
    >
      {children}
    </button>
  )
}

/** Nombre del hueso con más peso en un vértice de la malla. */
function huesoDominante(malla: THREE.SkinnedMesh, vertice: number): string {
  const indices = malla.geometry.getAttribute('skinIndex')
  const pesos = malla.geometry.getAttribute('skinWeight')
  let mayor = 0
  for (let k = 1; k < 4; k++) {
    if (pesos.getComponent(vertice, k) > pesos.getComponent(vertice, mayor)) mayor = k
  }
  return malla.skeleton.bones[indices.getComponent(vertice, mayor)]?.name ?? ''
}
