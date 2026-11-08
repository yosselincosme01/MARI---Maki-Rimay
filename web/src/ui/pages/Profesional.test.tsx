import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearConsulta, type StoreConsulta } from '@/application/consulta/crear-consulta'
import datosBanco from '@/data/banco-preguntas.json'
import type { Banco } from '@/domain/banco/tipos'
import { validarBanco } from '@/domain/banco/validar'
import type { MotorFlujo } from '@/domain/flujo/motor'
import { crearMotor } from '@/domain/flujo/motor-banco'
import { crearGrabadorSimulado } from '@/infrastructure/simuladores/grabador-simulado'
import { crearMotorSimulado } from '@/infrastructure/simuladores/motor-simulado'
import { ProveedorConsulta } from '@/ui/consulta/ProveedorConsulta'
import { Profesional } from './Profesional'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function bancoReal(): Banco {
  const resultado = validarBanco(datosBanco)
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  return resultado.banco
}

/** Vista profesional con la consulta real, el banco real y los roles del banco. */
function preparar(motor?: MotorFlujo) {
  const banco = bancoReal()
  let n = 0
  const consulta = crearConsulta({
    motor: motor ?? crearMotor(banco),
    grabador: crearGrabadorSimulado(),
    generarId: () => `id-${++n}`,
    ahora: () => new Date('2026-11-08T15:00:00.000Z'),
    describir: (id) => {
      const p = banco.preguntas.find((x) => x.id === id)
      return p && { iniciaCiclo: p.iniciaCiclo, porCiclo: p.porCiclo }
    },
  })
  const router = createMemoryRouter(
    [
      { path: '/profesional', element: <Profesional /> },
      { path: '/paciente', element: <p>Vista paciente</p> },
    ],
    { initialEntries: ['/profesional'] },
  )
  render(
    <ProveedorConsulta recursos={{ ok: true, banco, consulta, modoDemo: false }}>
      <RouterProvider router={router} />
    </ProveedorConsulta>,
  )
  return { consulta, router }
}

/** La persona responde lo enviado (como desde su vista) y devuelve el dispositivo. */
function laPersonaResponde(consulta: StoreConsulta, valores: string[]) {
  const c = () => consulta.getState()
  c().recibirTablet()
  for (const valor of valores) {
    c().proponer({ preguntaId: c().preguntaActiva!, valor, origen: 'tactil' })
    c().confirmar()
  }
  c().recibirTablet()
}

const empezar = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar consulta' }))
}
const campo = () => screen.getByRole('textbox', { name: /Pregunta para la persona/ })
const enviar = () => screen.getByRole('button', { name: /^Enviar/ })

describe('Vista profesional · conversación', () => {
  it('la consulta empieza con el profesional, sin preguntas ni flujo fijo', async () => {
    const { consulta, router } = preparar()
    await empezar()
    expect(consulta.getState()).toMatchObject({ fase: 'profesional', respuestas: [] })
    expect(router.state.location.pathname).toBe('/profesional')
    expect(screen.getByRole('heading', { name: 'Consulta en curso' })).toBeInTheDocument()
    expect(screen.getByText('Aún no hay respuestas')).toBeInTheDocument()
  })

  it('escribir la pregunta tal cual la agrega y la envía a la persona', async () => {
    const { consulta, router } = preparar()
    await empezar()
    await userEvent.type(campo(), '¿Qué sientes?')
    expect(screen.getByText(/Se agregará/)).toHaveTextContent('¿Qué sientes?')
    await userEvent.keyboard('{Enter}')
    expect(enviar()).toHaveTextContent('Enviar pregunta a la persona')
    await userEvent.click(enviar())
    expect(consulta.getState()).toMatchObject({ fase: 'entrega-paciente', preguntaActiva: 'P1' })
    expect(router.state.location.pathname).toBe('/paciente')
  })

  it('varias preguntas en un solo texto quedan en fila, en orden', async () => {
    const { consulta } = preparar()
    await empezar()
    await userEvent.type(campo(), '¿Dónde te duele? y desde cuándo{Enter}')
    const fila = screen.getByRole('list')
    expect(
      within(fila)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([
      expect.stringContaining('¿Dónde te duele?'),
      expect.stringContaining('¿Desde cuándo?'),
    ])
    await userEvent.click(enviar())
    expect(consulta.getState().envio?.preguntas).toEqual(['P2', 'P3'])
  })

  it('también se puede elegir una pregunta disponible sin escribir', async () => {
    const { consulta } = preparar()
    await empezar()
    const alergias = screen.getByRole('button', { name: '¿Tienes alergias?' })
    await userEvent.click(alergias)
    expect(alergias).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(enviar())
    expect(consulta.getState().preguntaActiva).toBe('P7')
  })

  it('lo que no tiene video lo dice y orienta a interpretación, sin enviar nada', async () => {
    preparar()
    await empezar()
    await userEvent.type(campo(), '¿Toma pastillas para la presión?')
    expect(screen.getByText(/No hay video LSP para/)).toHaveTextContent(/interpretación/)
    expect(screen.getByRole('button', { name: /Agregar/ })).toBeDisabled()
    expect(enviar()).toBeDisabled()
  })

  it('al volver, muestra lo nuevo y el resumen en vivo con lo que falta resaltado', async () => {
    const { consulta } = preparar()
    await empezar()
    consulta.getState().preguntar(['P1', 'P2', 'P3'])
    laPersonaResponde(consulta, ['DOLOR', 'ABDOMEN_INFERIOR', 'AYER'])

    // Se anuncia a lectores de pantalla (role=status) al volver el dispositivo.
    const region = await screen.findByRole('status', { name: 'Respuestas nuevas' })
    expect(region).toHaveTextContent('Dolor')
    expect(region).toHaveTextContent('Abdomen inferior')
    expect(region).toHaveTextContent('Ayer')
    expect(screen.getByText(/^Dolor en abdomen inferior desde ayer/)).toBeInTheDocument()
    const valorDe = (etiqueta: string) => screen.getAllByText(etiqueta)[0]!.nextElementSibling
    expect(valorDe('Intensidad')).toHaveTextContent('Falta un dato: no especificado')
    // La pregunta ya respondida queda marcada en las disponibles.
    expect(
      screen.getByRole('button', { name: /ya respondida.*¿Qué sientes\?/ }),
    ).toBeInTheDocument()
  })

  it('con dos síntomas, el profesional elige a cuál van los detalles', async () => {
    const { consulta } = preparar()
    await empezar()
    consulta.getState().preguntar(['P1'])
    laPersonaResponde(consulta, ['DOLOR'])
    consulta.getState().preguntar(['P1'])
    laPersonaResponde(consulta, ['TOS'])

    await userEvent.click(await screen.findByRole('button', { name: /¿Desde cuándo\?/ }))
    const selector = screen.getByRole('combobox', { name: /Sobre qué síntoma/ })
    expect(selector).toHaveValue('TOS') // por defecto, el último referido
    await userEvent.selectOptions(selector, 'DOLOR')
    await userEvent.click(enviar())
    laPersonaResponde(consulta, ['HOY'])
    expect(consulta.getState().respuestas.at(-1)).toMatchObject({ ciclo: 1, sintoma: 'DOLOR' })
  })

  it('descargar el PDF y copiar avisan que salen de MARI (RES4)', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } })
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }),
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { consulta } = preparar()
    await empezar()
    consulta.getState().preguntar(['P1'])
    laPersonaResponde(consulta, ['TOS'])

    await userEvent.click(await screen.findByRole('button', { name: /Copiar texto/ }))
    expect(escribir).toHaveBeenCalledWith(expect.stringContaining('SÍNTOMAS REFERIDOS'))
    await userEvent.click(screen.getByRole('button', { name: /Descargar PDF/ }))
    expect(await screen.findByText(/Descargado resumen-mari-.*fuera de MARI/)).toBeInTheDocument()
  })

  it('sin respuestas, el informe no se puede generar (RES4)', async () => {
    preparar()
    await empezar()
    expect(screen.getByRole('button', { name: /Descargar PDF/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Copiar texto/ })).toBeDisabled()
  })

  it('terminar pide confirmación y luego borra todo', async () => {
    const { consulta } = preparar()
    await empezar()
    consulta.getState().preguntar(['P1'])
    laPersonaResponde(consulta, ['TOS'])

    await userEvent.click(await screen.findByRole('button', { name: /Terminar consulta/ }))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }),
    )
    expect(consulta.getState().respuestas).toHaveLength(1)
    await userEvent.click(screen.getByRole('button', { name: /Terminar consulta/ }))
    await userEvent.click(screen.getByRole('button', { name: /Sí, terminar y borrar/ }))
    expect(consulta.getState()).toMatchObject({ fase: 'inactiva', respuestas: [] })
    expect(screen.getByRole('heading', { name: 'Nueva consulta' })).toBeInTheDocument()
  })

  it('mientras la persona responde, no se ven sus respuestas', async () => {
    const { consulta } = preparar()
    await empezar()
    consulta.getState().preguntar(['P1'])
    expect(await screen.findByText(/La persona está respondiendo/)).toBeInTheDocument()
  })

  it('P0 = SÍ en el flujo guiado: el profesional ve la alerta y toma el dispositivo', async () => {
    const { consulta } = preparar(crearMotorSimulado())
    consulta.getState().iniciarConsulta({ preguntarEmbarazo: false })
    consulta.getState().recibirTablet()
    consulta.getState().proponer({ preguntaId: 'P0', valor: 'SI', origen: 'tactil' })
    consulta.getState().confirmar()
    expect(await screen.findByRole('alert')).toHaveTextContent(/dificultad para respirar/)
    await userEvent.click(screen.getByRole('button', { name: /Tomar/ }))
    expect(consulta.getState().fase).toBe('profesional')
  })
})
