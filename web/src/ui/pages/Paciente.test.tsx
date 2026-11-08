import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearConsulta } from '@/application/consulta/crear-consulta'
import datosBanco from '@/data/banco-preguntas.json'
import { validarBanco } from '@/domain/banco/validar'
import { crearMotor } from '@/domain/flujo/motor-banco'
import { crearGrabadorSimulado } from '@/infrastructure/simuladores/grabador-simulado'
import type { RecursosConsulta } from '@/ui/consulta/contexto'
import { ProveedorConsulta } from '@/ui/consulta/ProveedorConsulta'
import { Paciente } from './Paciente'

beforeEach(() => {
  // jsdom no reproduce video.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  // jsdom no tiene WebGL: P2 usa la lista de zonas, que es el respaldo del cuerpo 3D (CUE2).
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

// Vitest corre sin `globals`, así que Testing Library no limpia sola entre tests.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/**
 * Consulta real con el banco real. `validado: false` simula videos aún sin validar,
 * para probar "video pendiente" y el modo demo.
 */
function recursosReales({
  modoDemo = false,
  validado,
}: { modoDemo?: boolean; validado?: boolean } = {}): RecursosConsulta & { ok: true } {
  const datos =
    validado === undefined
      ? datosBanco
      : { ...datosBanco, preguntas: datosBanco.preguntas.map((p) => ({ ...p, validado })) }
  const resultado = validarBanco(datos)
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  let n = 0
  const consulta = crearConsulta({
    motor: crearMotor(resultado.banco),
    grabador: crearGrabadorSimulado(),
    generarId: () => `id-${++n}`,
    ahora: () => new Date('2026-11-08T10:00:00.000Z'),
  })
  return { ok: true, banco: resultado.banco, consulta, modoDemo }
}

function mostrar(recursos: RecursosConsulta) {
  const router = createMemoryRouter(
    [
      { path: '/paciente', element: <Paciente /> },
      { path: '/profesional', element: <p>Vista profesional</p> },
    ],
    { initialEntries: ['/paciente'] },
  )
  render(
    <ProveedorConsulta recursos={recursos}>
      <RouterProvider router={router} />
    </ProveedorConsulta>,
  )
  return userEvent.setup()
}

/** Inicia la consulta de prueba y recibe la tablet. */
async function empezar(usuario: ReturnType<typeof userEvent.setup>) {
  await usuario.click(screen.getByRole('button', { name: 'Iniciar consulta' }))
  expect(screen.getByRole('heading', { name: 'Entregue la tablet a la persona' })).toBeVisible()
  await usuario.click(screen.getByRole('button', { name: 'Ya tengo la tablet' }))
}

async function responder(usuario: ReturnType<typeof userEvent.setup>, opcion: string) {
  await usuario.click(screen.getByRole('button', { name: opcion }))
  await usuario.click(screen.getByRole('button', { name: 'Sí, es eso' }))
}

describe('Vista paciente', () => {
  it('sin consulta, ofrece el inicio de prueba', () => {
    mostrar(recursosReales())
    expect(screen.getByRole('heading', { name: 'No hay una consulta en curso' })).toBeVisible()
  })

  it('recorre las 6 preguntas por toque y entrega la tablet al profesional', async () => {
    const recursos = recursosReales()
    const usuario = mostrar(recursos)
    await usuario.click(screen.getByRole('checkbox', { name: /embarazo/ }))
    await empezar(usuario)

    expect(screen.getByRole('heading', { name: '¿Qué sientes?' })).toBeVisible()
    await responder(usuario, 'Dolor')
    expect(screen.getByRole('heading', { name: '¿Dónde te duele?' })).toBeVisible()
    await responder(usuario, 'Cabeza')
    expect(screen.getByRole('heading', { name: '¿Desde cuándo?' })).toBeVisible()
    await responder(usuario, 'Hoy')
    expect(screen.getByRole('heading', { name: '¿Qué tan fuerte es?' })).toBeVisible()
    await responder(usuario, 'Fuerte')
    expect(screen.getByRole('heading', { name: '¿Tienes alergias?' })).toBeVisible()
    await responder(usuario, 'No')
    expect(screen.getByRole('heading', { name: '¿Estás embarazada?' })).toBeVisible()
    await responder(usuario, 'No sé')

    expect(screen.getByRole('heading', { name: 'Entregue la tablet al profesional' })).toBeVisible()
    const respuestas = recursos.consulta.getState().respuestas
    expect(respuestas.map((r) => [r.preguntaId, r.valor, r.origen])).toEqual([
      ['P1', 'DOLOR', 'tactil'],
      ['P2', 'CABEZA', 'cuerpo'],
      ['P3', 'HOY', 'tactil'],
      ['P4', 'FUERTE', 'tactil'],
      ['P7', 'NO', 'tactil'],
      ['P9', 'NO_SE', 'tactil'],
    ])

    await usuario.click(screen.getByRole('button', { name: 'Soy el profesional' }))
    expect(screen.getByText('Vista profesional')).toBeVisible()
    expect(recursos.consulta.getState().fase).toBe('profesional')
  })

  it('una respuesta queda provisional hasta ✓; ✗ la descarta y vuelve a las opciones', async () => {
    const recursos = recursosReales()
    const usuario = mostrar(recursos)
    await empezar(usuario)

    await usuario.click(screen.getByRole('button', { name: 'Tos' }))
    const confirmar = screen.getByRole('region', { name: 'Confirmar respuesta' })
    expect(confirmar).toHaveTextContent('Tos')
    expect(recursos.consulta.getState().respuestas).toEqual([])

    await usuario.click(screen.getByRole('button', { name: 'No, cambiar' }))
    expect(screen.getByRole('button', { name: 'Tos' })).toBeVisible()
    expect(screen.getByRole('heading', { name: '¿Qué sientes?' })).toBeVisible()
    expect(recursos.consulta.getState().provisional).toBeNull()
  })

  it('un doble toque en ✓ guarda una sola respuesta', async () => {
    const recursos = recursosReales()
    const usuario = mostrar(recursos)
    await empezar(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Fiebre' }))
    await usuario.dblClick(screen.getByRole('button', { name: 'Sí, es eso' }))
    expect(recursos.consulta.getState().respuestas).toHaveLength(1)
    expect(screen.getByRole('heading', { name: '¿Desde cuándo?' })).toBeVisible()
  })

  it('"otra / no está aquí" se confirma como OTRA', async () => {
    const recursos = recursosReales()
    const usuario = mostrar(recursos)
    await empezar(usuario)
    await responder(usuario, 'Otra / no está aquí')
    expect(recursos.consulta.getState().respuestas[0]).toMatchObject({ valor: 'OTRA' })
  })

  it('un video validado se reproduce sin etiqueta, aun sin modo demo', async () => {
    const usuario = mostrar(recursosReales())
    await empezar(usuario)
    expect(document.querySelector('video')).toHaveAttribute(
      'src',
      '/videos/preguntas/01-que-sientes.mp4',
    )
    expect(screen.queryByText('Video no validado')).toBeNull()
  })

  it('sin modo demo, un video no validado aparece como "video pendiente"', async () => {
    const usuario = mostrar(recursosReales({ validado: false }))
    await empezar(usuario)
    expect(screen.getByRole('img', { name: /Video pendiente/ })).toBeVisible()
    expect(document.querySelector('video')).toBeNull()
  })

  it('en modo demo, un video no validado se reproduce con la etiqueta "Video no validado"', async () => {
    const usuario = mostrar(recursosReales({ modoDemo: true, validado: false }))
    await empezar(usuario)
    const video = document.querySelector('video')
    expect(video).not.toBeNull()
    expect(video).toHaveAttribute('src', '/videos/preguntas/01-que-sientes.mp4')
    expect(screen.getByText('Video no validado')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Repetir' })).toBeVisible()
  })

  it('con un banco inválido muestra los errores y no permite iniciar', () => {
    mostrar({ ok: false, errores: ['P2 › video: requerido'], modoDemo: false })
    expect(screen.getByRole('alert')).toHaveTextContent('P2 › video: requerido')
    expect(screen.queryByRole('button', { name: 'Iniciar consulta' })).toBeNull()
  })
})
