import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EstadoCamara, Inferencia } from '@/application/puertos/tipos'
import { crearReconocedorPresentacion, estadoPorError } from './reconocedor-presentacion'

// MediaPipe no corre en jsdom: se reemplaza el extractor por uno falso.
const cerrarExtractor = vi.fn()
vi.mock('./extractor', () => ({
  crearExtractor: async () => ({
    delegado: 'CPU',
    extraer: () => ({ aspecto: 4 / 3, manoDerecha: null, manoIzquierda: null, pose: null }),
    cerrar: cerrarExtractor,
  }),
}))

const detenerPista = vi.fn()
const flujoFalso = { getTracks: () => [{ stop: detenerPista }] } as unknown as MediaStream

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn().mockResolvedValue(flujoFalso) },
  })
})
afterEach(() => vi.clearAllMocks())

function preparar() {
  const reconocedor = crearReconocedorPresentacion()
  const estados: EstadoCamara[] = []
  const inferencias: Inferencia[] = []
  reconocedor.alCambiarEstado((e) => estados.push(e))
  reconocedor.alInferir((i) => inferencias.push(i))
  return { reconocedor, estados, inferencias, video: document.createElement('video') }
}

const teclear = (key: string, extra: KeyboardEventInit = {}) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key, ...extra }))

describe('reconocedor en modo presentación', () => {
  it('pide la cámara sin audio y pasa por los estados hasta "lista"', async () => {
    const { reconocedor, estados, video } = preparar()
    await reconocedor.iniciar(video)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: false }),
    )
    expect(estados).toEqual(['esperando-permiso', 'cargando-modelo', 'lista'])
    reconocedor.detener()
  })

  it('la tecla del operador produce las inferencias que exige la regla de decisión', async () => {
    const { reconocedor, inferencias, video } = preparar()
    await reconocedor.iniciar(video)
    teclear('1')
    expect(inferencias.map((i) => i.clase)).toEqual(['DOLOR', 'DOLOR', 'DOLOR'])
    teclear('6')
    expect(inferencias.at(-1)?.clase).toBe('NO')
    reconocedor.detener()
  })

  it('ignora otras teclas, la repetición y lo que se escribe en un campo', async () => {
    const { reconocedor, inferencias, video } = preparar()
    await reconocedor.iniciar(video)
    teclear('a')
    teclear('1', { repeat: true })
    const campo = document.body.appendChild(document.createElement('input'))
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))
    expect(inferencias).toEqual([])
    campo.remove()
    reconocedor.detener()
  })

  it('al detener apaga la cámara, cierra MediaPipe y deja de escuchar teclas', async () => {
    const { reconocedor, estados, inferencias, video } = preparar()
    await reconocedor.iniciar(video)
    reconocedor.detener()
    expect(detenerPista).toHaveBeenCalled()
    expect(cerrarExtractor).toHaveBeenCalled()
    expect(video.srcObject).toBeNull()
    expect(estados.at(-1)).toBe('inactiva')
    teclear('1')
    expect(inferencias).toEqual([])
  })

  it('si se detiene mientras espera el permiso, no deja la cámara encendida', async () => {
    const { reconocedor, estados, video } = preparar()
    const iniciando = reconocedor.iniciar(video)
    reconocedor.detener() // como hace React StrictMode al montar dos veces
    await iniciando
    expect(detenerPista).toHaveBeenCalled()
    expect(estados).not.toContain('lista')
  })

  it('un permiso denegado se informa como estado, sin romper', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(
      new DOMException('no', 'NotAllowedError'),
    )
    const { reconocedor, estados, video } = preparar()
    await reconocedor.iniciar(video)
    expect(estados.at(-1)).toBe('denegada')
  })
})

describe('estadoPorError (M7)', () => {
  it('traduce cada error de la cámara a un estado', () => {
    const error = (nombre: string) => new DOMException('x', nombre)
    expect(estadoPorError(error('NotAllowedError'))).toBe('denegada')
    expect(estadoPorError(error('NotFoundError'))).toBe('sin-camara')
    expect(estadoPorError(error('NotReadableError'))).toBe('ocupada')
    expect(estadoPorError(new Error('otro'))).toBe('error')
  })
})
