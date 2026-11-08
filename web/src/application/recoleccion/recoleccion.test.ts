import { describe, expect, it } from 'vitest'
import type { FotogramaCrudo, Punto } from '@/domain/senas/normalizar'
import { cerrarCaptura } from './captura'
import {
  CLASES,
  crearMuestra,
  contarRepeticiones,
  esCodigoSenante,
  nombreArchivo,
  siguienteRepeticion,
} from './muestra'

const p = (x: number, y: number): Punto => ({ x, y, z: 0 })

/** Fotograma con hombros visibles (o sin pose si `conHombros` es false). */
function crudo(conHombros = true, conMano = true): FotogramaCrudo {
  const pose = Array.from({ length: 33 }, () => p(0.5, 0.5))
  pose[11] = p(0.6, 0.5)
  pose[12] = p(0.4, 0.5)
  return {
    aspecto: 4 / 3,
    pose: conHombros ? pose : null,
    manoDerecha: conMano ? Array.from({ length: 21 }, () => p(0.45, 0.4)) : null,
    manoIzquierda: null,
  }
}

/** Grabación de `n` fotogramas a ~30 fps. */
const grabacion = (n: number, f: (i: number) => FotogramaCrudo = () => crudo()) =>
  Array.from({ length: n }, (_, i) => ({ tiempoMs: i * 33, crudo: f(i) }))

describe('muestra: nombres y códigos', () => {
  it('tiene las 7 clases del contrato', () => {
    expect(CLASES).toEqual(['DOLOR', 'TOS', 'FIEBRE', 'FALTA_DE_AIRE', 'SI', 'NO', 'OTRA'])
  })

  it('el código del señante es P + dos dígitos, nunca un nombre', () => {
    expect(esCodigoSenante('P03')).toBe(true)
    for (const invalido of ['p03', 'P3', 'P003', 'Ana', '', 'P0A']) {
      expect(esCodigoSenante(invalido)).toBe(false)
    }
  })

  it('arma el nombre CLASE_P03_rep012.json', () => {
    expect(nombreArchivo('FALTA_DE_AIRE', 'P03', 12)).toBe('FALTA_DE_AIRE_P03_rep012.json')
  })

  it('continúa la numeración después de la mayor existente, por seña y señante', () => {
    const existentes = [
      'DOLOR_P03_rep001.json',
      'DOLOR_P03_rep007.json',
      'DOLOR_P04_rep020.json', // otra persona
      'TOS_P03_rep015.json', // otra seña
      'notas.txt',
    ]
    expect(siguienteRepeticion(existentes, 'DOLOR', 'P03')).toBe(8)
    expect(siguienteRepeticion(existentes, 'FIEBRE', 'P03')).toBe(1)
  })

  it('cuenta las repeticiones de una seña y un señante', () => {
    const existentes = ['SI_P01_rep001.json', 'SI_P01_rep002.json', 'SI_P02_rep001.json']
    expect(contarRepeticiones(existentes, 'SI', 'P01')).toBe(2)
    expect(contarRepeticiones(existentes, 'NO', 'P01')).toBe(0)
  })

  it('no confunde SI con señas que empiezan igual', () => {
    expect(siguienteRepeticion(['SI_P01_rep004.json'], 'SI', 'P01')).toBe(5)
    expect(siguienteRepeticion(['SI_P01_rep004.json'], 'NO', 'P01')).toBe(1)
  })
})

describe('muestra: contenido', () => {
  const base = {
    clase: 'DOLOR' as const,
    senante: 'P03',
    repeticion: 1,
    fecha: new Date('2026-11-08T15:42:10Z'),
    fotogramas: [[0.123456789, -0.000001, 1]],
    captura: {
      duracionMs: 2000,
      fotogramasValidos: 50,
      fotogramasTotales: 60,
      delegado: 'GPU' as const,
    },
  }

  it('guarda versión, dimensión y solo el día, sin hora', () => {
    const muestra = crearMuestra(base)
    expect(muestra).toMatchObject({
      formato: 'mari-muestra',
      versionEntrada: 'v1',
      dimension: 142,
      fecha: '2026-11-08',
    })
  })

  it('redondea a 5 decimales y no deja "-0"', () => {
    const [fila] = crearMuestra(base).fotogramas
    expect(fila).toEqual([0.12346, 0, 1])
    expect(Object.is(fila?.[1], -0)).toBe(false)
  })

  it('no contiene datos personales ni video', () => {
    const texto = JSON.stringify(crearMuestra(base))
    expect(Object.keys(crearMuestra(base)).sort()).toEqual([
      'captura',
      'clase',
      'dimension',
      'fecha',
      'formato',
      'fotogramas',
      'repeticion',
      'senante',
      'versionEntrada',
    ])
    expect(texto).not.toMatch(/video|blob|nombre/i)
  })

  it('rechaza un código de señante inválido', () => {
    expect(() => crearMuestra({ ...base, senante: 'María' })).toThrow(/inválido/)
  })
})

describe('cerrarCaptura', () => {
  it('una grabación buena da exactamente 30 fotogramas de 142 números', () => {
    const r = cerrarCaptura(grabacion(60))
    expect(r.tipo).toBe('valida')
    if (r.tipo !== 'valida') return
    expect(r.fotogramas).toHaveLength(30)
    expect(r.fotogramas.every((f) => f.length === 142)).toBe(true)
    expect(r).toMatchObject({ validos: 60, totales: 60 })
  })

  it('acepta la clase OTRA en reposo, sin manos', () => {
    expect(cerrarCaptura(grabacion(60, () => crudo(true, false))).tipo).toBe('valida')
  })

  it('descarta si la mayor parte no tiene hombros visibles', () => {
    const r = cerrarCaptura(grabacion(60, (i) => crudo(i < 20)))
    expect(r).toMatchObject({ tipo: 'descartada', validos: 20, totales: 60 })
    expect(r.tipo === 'descartada' && r.motivo).toMatch(/hombros/)
  })

  it('descarta si la cámara entregó muy pocos fotogramas', () => {
    const r = cerrarCaptura(grabacion(10))
    expect(r.tipo === 'descartada' && r.motivo).toMatch(/pocos fotogramas/)
  })

  it('descarta si no llegó nada', () => {
    expect(cerrarCaptura([]).tipo).toBe('descartada')
  })
})
