import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { crearConsulta, type StoreConsulta } from '@/application/consulta/crear-consulta'
import datosBanco from '@/data/banco-preguntas.json'
import { validarBanco } from '@/domain/banco/validar'
import { crearMotor } from '@/domain/flujo/motor-banco'
import { crearBuscadorTexto } from '@/infrastructure/busqueda/buscador-texto'
import { crearGrabadorSimulado } from '@/infrastructure/simuladores/grabador-simulado'
import { ProveedorConsulta } from '@/ui/consulta/ProveedorConsulta'
import { Profesional } from '@/ui/pages/Profesional'

afterEach(cleanup)

/** Vista profesional con el banco, el motor y el buscador reales. */
function preparar() {
  const resultado = validarBanco(datosBanco)
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  const banco = resultado.banco
  let n = 0
  const consulta = crearConsulta({
    motor: crearMotor(banco),
    grabador: crearGrabadorSimulado(),
    generarId: () => `id-${++n}`,
    ahora: () => new Date('2026-11-08T15:00:00.000Z'),
  })
  const router = createMemoryRouter(
    [
      { path: '/profesional', element: <Profesional /> },
      { path: '/paciente', element: <p>Vista paciente</p> },
    ],
    { initialEntries: ['/profesional'] },
  )
  render(
    <ProveedorConsulta
      recursos={{ ok: true, banco, consulta, modoDemo: false, buscador: crearBuscadorTexto(banco) }}
    >
      <RouterProvider router={router} />
    </ProveedorConsulta>,
  )
  return { consulta, router }
}

/** La persona responde el flujo (P1 = FIEBRE) y devuelve la tablet al profesional. */
function responderFlujo(consulta: StoreConsulta) {
  const c = () => consulta.getState()
  c().iniciarConsulta({ preguntarEmbarazo: false })
  c().recibirTablet()
  for (const valor of ['FIEBRE', 'AYER', 'LEVE', 'NO']) {
    c().proponer({ preguntaId: c().preguntaActiva!, valor, origen: 'tactil' })
    c().confirmar()
  }
  c().recibirTablet()
}

async function abrirRepreguntar(texto: string) {
  await userEvent.click(await screen.findByRole('button', { name: /Repreguntar/ }))
  await userEvent.type(screen.getByRole('textbox', { name: 'Tu pregunta' }), texto)
  await userEvent.click(screen.getByRole('button', { name: /Buscar/ }))
}

describe('Repreguntar (BUS)', () => {
  it('con buscador, "Repreguntar" está habilitado', async () => {
    const { consulta } = preparar()
    responderFlujo(consulta)
    expect(await screen.findByRole('button', { name: /Repreguntar/ })).toBeEnabled()
  })

  it('sugiere videos validados y no envía nada hasta que el profesional elige (BUS1, BUS2)', async () => {
    const { consulta } = preparar()
    responderFlujo(consulta)
    await abrirRepreguntar('¿Desde cuándo tiene la fiebre?')

    const opciones = screen.getAllByRole('radio')
    expect(opciones.length).toBeGreaterThan(0)
    expect(opciones.length).toBeLessThanOrEqual(3)
    expect(opciones.every((o) => !(o as HTMLInputElement).checked)).toBe(true)
    expect(screen.getByRole('button', { name: /Enviar a la persona/ })).toBeDisabled()
    expect(screen.getByText(/palabras clave, en este dispositivo/)).toBeInTheDocument()
    expect(consulta.getState().fase).toBe('profesional')
  })

  it('envía la repregunta elegida, asociada al síntoma, y la tablet vuelve a la persona', async () => {
    const { consulta, router } = preparar()
    responderFlujo(consulta)
    await abrirRepreguntar('¿Desde cuándo tiene la fiebre?')

    await userEvent.click(screen.getByRole('radio', { name: /¿Desde cuándo\?/ }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /síntoma/ }), 'FIEBRE')
    await userEvent.click(screen.getByRole('button', { name: /Enviar a la persona/ }))

    expect(consulta.getState()).toMatchObject({
      fase: 'entrega-paciente',
      preguntaActiva: 'R-DESDE-CUANDO',
      repreguntaActiva: { preguntaId: 'R-DESDE-CUANDO', sintoma: 'FIEBRE' },
    })
    expect(router.state.location.pathname).toBe('/paciente')
  })

  it('la respuesta a la repregunta aparece en la revisión', async () => {
    const { consulta } = preparar()
    responderFlujo(consulta)
    const c = () => consulta.getState()
    c().enviarRepregunta('R-DESDE-CUANDO', 'FIEBRE')
    c().recibirTablet()
    c().proponer({ preguntaId: 'R-DESDE-CUANDO', valor: 'HOY', origen: 'tactil' })
    c().confirmar()
    c().recibirTablet()

    expect(c().respuestas.at(-1)).toMatchObject({
      preguntaId: 'R-DESDE-CUANDO',
      repregunta: { sintoma: 'FIEBRE' },
    })
    expect(await screen.findByText(/¿Desde cuándo\? Hoy/)).toBeInTheDocument()
  })

  it('sin coincidencia orienta a pedir interpretación', async () => {
    const { consulta } = preparar()
    responderFlujo(consulta)
    await abrirRepreguntar('¿La tos es con flema?')
    expect(screen.getByRole('alert')).toHaveTextContent(/Solicite apoyo de interpretación/)
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('cancelar vuelve a las acciones de la revisión', async () => {
    const { consulta } = preparar()
    responderFlujo(consulta)
    await userEvent.click(await screen.findByRole('button', { name: /Repreguntar/ }))
    await userEvent.click(screen.getByRole('button', { name: /Cancelar/ }))
    expect(screen.getByRole('button', { name: /Ver resumen/ })).toBeVisible()
  })
})
