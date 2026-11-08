/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import { zonaDelToque, type ZonaCuerpo } from './zonas'

const frente = (hueso: string, y = 1.3) => zonaDelToque({ hueso, y, haciaAtras: false })
const atras = (hueso: string, y = 1.3) => zonaDelToque({ hueso, y, haciaAtras: true })

describe('zonaDelToque', () => {
  it('brazos y manos, con el nombre del archivo o el de three.js', () => {
    for (const h of ['upperarm01.L', 'lowerarm02R', 'wrist.L', 'finger3-2.R', 'shoulder01L']) {
      expect(frente(h)).toBe('BRAZOS')
    }
  })

  it('piernas y pies', () => {
    for (const h of ['upperleg01.R', 'lowerleg02L', 'foot.L', 'toe1-2R']) {
      expect(frente(h, 0.5)).toBe('PIERNAS')
    }
  })

  it('cabeza y cara', () => {
    for (const h of ['head', 'jaw', 'oculi01.L', 'orbicularis03R', 'oris05']) {
      expect(frente(h, 1.65)).toBe('CABEZA')
    }
  })

  it('el cuello es garganta de frente y espalda por detrás', () => {
    expect(frente('neck01', 1.52)).toBe('GARGANTA')
    expect(atras('neck01', 1.52)).toBe('ESPALDA')
  })

  it('el frente del tronco se divide por altura', () => {
    expect(frente('breast.L', 1.32)).toBe('PECHO')
    expect(frente('spine02', 1.24)).toBe('PECHO')
    expect(frente('spine03', 1.15)).toBe('ABDOMEN_SUPERIOR')
    expect(frente('spine03', 1.08)).toBe('ABDOMEN_SUPERIOR')
    expect(frente('spine04', 1.0)).toBe('ABDOMEN_INFERIOR')
    expect(frente('pelvis.R', 0.95)).toBe('ABDOMEN_INFERIOR')
  })

  it('todo el tronco por detrás es espalda', () => {
    for (const [h, y] of [
      ['spine01', 1.4],
      ['spine04', 1.0],
      ['pelvis.L', 0.92],
    ] as const) {
      expect(atras(h, y)).toBe('ESPALDA')
    }
  })
})

describe('zonaDelToque sobre el modelo real (human-body.glb)', () => {
  const conteo = contarZonasDelModelo()

  it('cada zona del banco (salvo "otra zona") se puede tocar en el modelo', () => {
    const p2 = datosBanco.preguntas.find((p) => p.id === 'P2')!
    const zonas = p2.opciones.map((o) => o.valor).filter((v) => v !== 'OTRA_ZONA')
    for (const zona of zonas) {
      expect(conteo[zona as ZonaCuerpo] ?? 0, zona).toBeGreaterThan(200)
    }
  })

  it('no produce zonas que el banco no tenga', () => {
    const p2 = datosBanco.preguntas.find((p) => p.id === 'P2')!
    const valores = new Set(p2.opciones.map((o) => o.valor))
    expect(Object.keys(conteo).filter((z) => !valores.has(z))).toEqual([])
  })
})

/**
 * Lee el GLB (formato binario de glTF) sin three.js y clasifica cada vértice del cuerpo
 * con su hueso dominante, su altura y su normal: así se comprueban las reglas sobre la malla real.
 */
function contarZonasDelModelo(): Partial<Record<ZonaCuerpo, number>> {
  const archivo = readFileSync(join(process.cwd(), 'public/models/human-body.glb'))
  const largoJson = archivo.readUInt32LE(12)
  const gltf = JSON.parse(archivo.subarray(20, 20 + largoJson).toString()) as Gltf
  const binario = archivo.subarray(20 + largoJson + 8)

  const huesos = gltf.skins[0]!.joints.map((i) => gltf.nodes[i]!.name)
  const cuerpo = gltf.meshes[0]!.primitives[0]!.attributes
  const leer = (indice: number | undefined) => leerAccesor(gltf, binario, indice)
  const posiciones = leer(cuerpo.POSITION)
  const normales = leer(cuerpo.NORMAL)
  const juntas = leer(cuerpo.JOINTS_0)
  const pesos = leer(cuerpo.WEIGHTS_0)

  const conteo: Partial<Record<ZonaCuerpo, number>> = {}
  posiciones.forEach((p, i) => {
    const w = pesos[i]!
    const mayor = w.indexOf(Math.max(...w))
    const zona = zonaDelToque({
      hueso: huesos[juntas[i]![mayor]!]!,
      y: p[1]!,
      haciaAtras: normales[i]![2]! < 0,
    })
    conteo[zona] = (conteo[zona] ?? 0) + 1
  })
  return conteo
}

interface Gltf {
  nodes: { name: string }[]
  skins: { joints: number[] }[]
  meshes: { primitives: { attributes: Record<string, number> }[] }[]
  accessors: {
    bufferView: number
    byteOffset?: number
    componentType: number
    count: number
    type: string
  }[]
  bufferViews: { byteOffset?: number; byteStride?: number }[]
}

function leerAccesor(gltf: Gltf, binario: Buffer, indice: number | undefined): number[][] {
  const accesor = gltf.accessors[indice!]!
  const vista = gltf.bufferViews[accesor.bufferView]!
  const componentes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accesor.type]!
  const tamano = { 5121: 1, 5123: 2, 5126: 4 }[accesor.componentType]!
  const paso = vista.byteStride ?? componentes * tamano
  const inicio = (vista.byteOffset ?? 0) + (accesor.byteOffset ?? 0)
  const leerUno = (o: number) =>
    tamano === 4 ? binario.readFloatLE(o) : tamano === 2 ? binario.readUInt16LE(o) : binario[o]!
  return Array.from({ length: accesor.count }, (_, i) =>
    Array.from({ length: componentes }, (_, k) => leerUno(inicio + i * paso + k * tamano)),
  )
}
