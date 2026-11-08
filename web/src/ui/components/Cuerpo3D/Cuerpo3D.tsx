/**
 * Cuerpo 3D para P2 "¿Dónde te duele?" (CUE1).
 *
 * - Toca el cuerpo para marcar dónde duele: queda un punto naranja y se elige la zona.
 *   La persona puede corregir tocando otra vez o desde la lista, y luego revisa su respuesta.
 * - Girar: arrastrando, con los botones ↺ ↻, Frente / Espalda o las flechas del teclado.
 * - Acercar y alejar con + / −.
 * - Si WebGL o el modelo no cargan, avisa con `alFallar` y la vista usa solo la lista (CUE2).
 *
 * Se carga aparte (React.lazy): three.js y el modelo solo se descargan al llegar a P2.
 * Dibuja solo cuando algo cambia, sin un bucle de animación, para no gastar batería.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js'
import { Hand, Minus, Move, Plus, RotateCcw, RotateCw } from 'lucide-react'
import { cn } from '@/ui/cn'
import { urlPublica } from '@/ui/consulta/recursos'
import { zonaDelToque, type ZonaCuerpo } from './zonas'

export interface Cuerpo3DProps {
  /**
   * Zona elegida ahora (por toque o desde la lista). Si no es la del último toque, el punto
   * se oculta: ya no representa la respuesta.
   */
  zona: string | null
  alTocar: (zona: ZonaCuerpo) => void
  alFallar: () => void
}

const COLOR_CUERPO = 0xb9ded3 // verde menta claro, mate
const COLOR_MARCA = 0xe8743b // naranja: se distingue del cuerpo y del verde de la marca
const COLOR_BASE = 0xe2eeeb
const COLOR_ARO = 0xc9dcd7
const CENTRO_Y = 0.9 // mitad de la altura del modelo (1,79 m)
const PASO_GIRO = Math.PI / 4
const PASO_TECLADO = Math.PI / 12
const DISTANCIA = { inicial: 3.9, minima: 2.3, maxima: 4.8, paso: 0.5 }
/** Un arrastre más corto que esto cuenta como toque. */
const TOLERANCIA_TOQUE_PX = 8

/** El modelo se descarga una sola vez por pestaña y se reutiliza al volver a P2. */
let cargaModelo: Promise<GLTF> | null = null
function cargarModelo(): Promise<GLTF> {
  cargaModelo ??= new GLTFLoader().loadAsync(urlPublica('models/human-body.glb'))
  cargaModelo.catch(() => (cargaModelo = null))
  return cargaModelo
}

interface Controles {
  girar: (angulo: number, relativo?: boolean) => void
  acercar: (pasos: number) => void
  ocultarMarca: () => void
}

const SIN_CONTROLES: Controles = { girar: () => {}, acercar: () => {}, ocultarMarca: () => {} }

export default function Cuerpo3D({ zona, alTocar, alFallar }: Cuerpo3DProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const controles = useRef<Controles>(SIN_CONTROLES)
  const ultimaTocada = useRef<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [deEspalda, setDeEspalda] = useState(false)
  const [zoom, setZoom] = useState<{ puedeAcercar: boolean; puedeAlejar: boolean }>({
    puedeAcercar: true,
    puedeAlejar: true,
  })

  // Las funciones de las props cambian en cada render; la escena se monta una sola vez.
  const alTocarRef = useRef(alTocar)
  const alFallarRef = useRef(alFallar)
  useEffect(() => {
    alTocarRef.current = alTocar
    alFallarRef.current = alFallar
  })

  // Si la zona cambió desde la lista (o se borró), el punto ya no corresponde.
  useEffect(() => {
    if (zona !== ultimaTocada.current) {
      ultimaTocada.current = null
      controles.current.ocultarMarca()
    }
  }, [zona])

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
    escena.add(new THREE.HemisphereLight(0xffffff, 0x9fb9b2, 2.3))
    const luz = new THREE.DirectionalLight(0xffffff, 1.5)
    luz.position.set(1.5, 3, 4)
    escena.add(luz)

    const camara = new THREE.PerspectiveCamera(30, 1, 0.1, 20)
    let distancia = DISTANCIA.inicial
    const ubicarCamara = () => {
      camara.position.set(0, CENTRO_Y, distancia)
      camara.lookAt(0, CENTRO_Y, 0)
    }
    ubicarCamara()

    // El cuerpo gira dentro de un pivote; el modelo conserva sus coordenadas originales.
    const pivote = new THREE.Group()
    escena.add(pivote)

    // Base circular bajo los pies: da suelo y profundidad.
    const base = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 64),
      new THREE.MeshStandardMaterial({ color: COLOR_BASE, roughness: 1 }),
    )
    const aro = new THREE.Mesh(
      new THREE.RingGeometry(0.42, 0.44, 64),
      new THREE.MeshBasicMaterial({ color: COLOR_ARO }),
    )
    for (const disco of [base, aro]) {
      disco.rotation.x = -Math.PI / 2
      disco.position.y = 0.002
      escena.add(disco)
    }

    const marca = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 24, 16),
      new THREE.MeshBasicMaterial({ color: COLOR_MARCA, depthTest: false }),
    )
    marca.renderOrder = 1
    marca.visible = false
    pivote.add(marca)

    let modelo: THREE.Object3D | null = null
    let activo = true
    const dibujar = () => renderer.render(escena, camara)

    let anchoActual = -1
    const ajustarTamano = () => {
      // Todo el ancho de la tarjeta; el alto no pasa del 46 % de la pantalla (cabe en tablet).
      const { width } = div.getBoundingClientRect()
      // Cambiar el alto del lienzo vuelve a avisar al observador: solo se redibuja si cambió el
      // ancho (si no, el navegador avisa "ResizeObserver loop").
      if (Math.round(width) === anchoActual) return
      anchoActual = Math.round(width)
      const alto = Math.round(Math.min(width * 1.05, window.innerHeight * 0.46))
      renderer.setSize(width, alto, false)
      // Ancho en % (no en px): así el lienzo nunca empuja a su contenedor a crecer.
      Object.assign(renderer.domElement.style, { width: '100%', height: `${alto}px` })
      camara.aspect = width / alto
      camara.updateProjectionMatrix()
      dibujar()
    }
    const observador = new ResizeObserver(() => requestAnimationFrame(ajustarTamano))
    observador.observe(div)

    controles.current = {
      girar(angulo, relativo = false) {
        pivote.rotation.y = relativo ? pivote.rotation.y + angulo : angulo
        const vuelta = ((pivote.rotation.y % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
        setDeEspalda(vuelta > Math.PI / 2 && vuelta < (3 * Math.PI) / 2)
        dibujar()
      },
      acercar(pasos) {
        distancia = THREE.MathUtils.clamp(
          distancia - pasos * DISTANCIA.paso,
          DISTANCIA.minima,
          DISTANCIA.maxima,
        )
        setZoom({
          puedeAcercar: distancia > DISTANCIA.minima,
          puedeAlejar: distancia < DISTANCIA.maxima,
        })
        ubicarCamara()
        dibujar()
      },
      ocultarMarca() {
        marca.visible = false
        dibujar()
      },
    }

    cargarModelo()
      .then((gltf) => {
        if (!activo) return
        modelo = gltf.scene
        modelo.traverse((objeto) => {
          if (objeto instanceof THREE.Mesh) {
            objeto.material = new THREE.MeshStandardMaterial({
              color: COLOR_CUERPO,
              roughness: 0.75,
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
      controles.current.girar((e.clientX - inicio.ultimoX) * 0.01, true)
      inicio.ultimoX = e.clientX
    }
    const alSubir = (e: PointerEvent) => {
      if (!inicio) return
      const distanciaArrastre = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y)
      inicio = null
      if (distanciaArrastre > TOLERANCIA_TOQUE_PX || !modelo) return

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
      const tocada = zonaDelToque({ hueso, y: enModelo.y, haciaAtras: golpe.face.normal.z < 0 })

      marca.position.copy(pivote.worldToLocal(golpe.point.clone()))
      marca.visible = true
      dibujar()
      ultimaTocada.current = tocada
      alTocarRef.current(tocada)
    }
    lienzo.addEventListener('pointerdown', alBajar)
    lienzo.addEventListener('pointermove', alMover)
    lienzo.addEventListener('pointerup', alSubir)
    lienzo.addEventListener('pointercancel', () => (inicio = null))

    return () => {
      activo = false
      observador.disconnect()
      if (modelo) pivote.remove(modelo) // el modelo se reutiliza: no se libera
      for (const malla of [marca, base, aro]) {
        malla.geometry.dispose()
        malla.material.dispose()
      }
      renderer.dispose()
      lienzo.remove()
      controles.current = SIN_CONTROLES
    }
  }, [])

  return (
    <div className="flex flex-col">
      <div className="border-borde flex items-center justify-between gap-3 border-b px-4 py-3">
        <span className="flex items-center gap-2 font-medium">
          <Hand size={20} className="text-marca" aria-hidden /> Señala dónde te duele
        </span>
        <span className="border-borde text-tinta-suave rounded-md border px-2 py-0.5 text-sm">
          {deEspalda ? 'Espalda' : 'Frente'}
        </span>
      </div>

      <div className="relative bg-gradient-to-b from-[#f6faf9] to-[#e4efec]">
        <div
          ref={contenedor}
          role="img"
          aria-label="Cuerpo en 3D. Toca dónde te duele. Usa las flechas para girarlo."
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') controles.current.girar(-PASO_TECLADO, true)
            if (e.key === 'ArrowRight') controles.current.girar(PASO_TECLADO, true)
            if (e.key === '+') controles.current.acercar(1)
            if (e.key === '-') controles.current.acercar(-1)
          }}
          className="min-h-72 w-full"
        />
        {cargando && (
          <p className="text-tinta-suave absolute inset-0 grid place-items-center">
            Cargando cuerpo 3D…
          </p>
        )}
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          <BotonIcono
            etiqueta="Acercar"
            disabled={!zoom.puedeAcercar}
            onClick={() => controles.current.acercar(1)}
          >
            <Plus size={20} aria-hidden />
          </BotonIcono>
          <BotonIcono
            etiqueta="Alejar"
            disabled={!zoom.puedeAlejar}
            onClick={() => controles.current.acercar(-1)}
          >
            <Minus size={20} aria-hidden />
          </BotonIcono>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 bg-[#e4efec] px-4 pt-1 pb-3">
        <div className="flex items-center gap-2">
          <BotonIcono
            etiqueta="Girar a la izquierda"
            onClick={() => controles.current.girar(-PASO_GIRO, true)}
          >
            <RotateCcw size={20} aria-hidden />
          </BotonIcono>
          <div role="group" aria-label="Vista del cuerpo" className="flex gap-1">
            <BotonVista activo={!deEspalda} onClick={() => controles.current.girar(0)}>
              Frente
            </BotonVista>
            <BotonVista activo={deEspalda} onClick={() => controles.current.girar(Math.PI)}>
              Espalda
            </BotonVista>
          </div>
          <BotonIcono
            etiqueta="Girar a la derecha"
            onClick={() => controles.current.girar(PASO_GIRO, true)}
          >
            <RotateCw size={20} aria-hidden />
          </BotonIcono>
        </div>
        <p className="text-tinta-suave flex items-center gap-1.5 text-sm">
          <Move size={14} aria-hidden /> Arrastra para girar · Toca el cuerpo para marcar
        </p>
      </div>
    </div>
  )
}

function BotonIcono({
  etiqueta,
  onClick,
  disabled,
  children,
}: {
  etiqueta: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onClick}
      disabled={disabled}
      className="border-borde bg-superficie text-tinta shadow-tarjeta hover:border-marca grid size-12 place-items-center rounded-xl border transition-colors disabled:opacity-40"
    >
      {children}
    </button>
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
      className={cn(
        'h-12 min-w-24 rounded-xl border px-4 text-base font-semibold transition-colors',
        activo
          ? 'border-marca bg-marca-suave text-marca-oscuro'
          : 'border-borde bg-superficie text-tinta-suave hover:text-tinta',
      )}
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
