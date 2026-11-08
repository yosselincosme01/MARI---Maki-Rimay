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
})

function bancoReal(): Banco {
  const resultado = validarBanco(datosBanco)
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  return resultado.banco
}

/** Consulta con el banco real y, por defecto, el motor real de Yosselin. */
function preparar(motor?: MotorFlujo) {
  const banco = bancoReal()
  let n = 0
  const consulta = crearConsulta({
    motor: motor ?? crearMotor(banco),
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
    <ProveedorConsulta recursos={{ ok: true, banco, consulta, modoDemo: false }}>
      <RouterProvider router={router} />
    </ProveedorConsulta>,
  )
  return { consulta, router }
}

/** La persona responde con toques (como lo haría desde su vista) y devuelve la tablet. */
function responderTodo(consulta: StoreConsulta, valores: string[]) {
  const c = () => consulta.getState()
  c().iniciarConsulta({ preguntarEmbarazo: false })
  c().recibirTablet()
  for (const valor of valores) {
    const preguntaId = c().preguntaActiva
    if (!preguntaId) break
    c().proponer({ preguntaId, valor, origen: 'tactil' })
    c().confirmar()
  }
}

describe('Vista profesional (PRO)', () => {
  it('inicia la consulta con la opción de P9 y lleva a la vista de la persona', async () => {
    const { consulta, router } = preparar()
    await userEvent.click(screen.getByLabelText(/embarazo/i))
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar consulta' }))
    expect(consulta.getState()).toMatchObject({
      fase: 'entrega-paciente',
      config: { preguntarEmbarazo: true },
    })
    expect(router.state.location.pathname).toBe('/paciente')
  })

  it('mientras la persona responde, no muestra sus respuestas', async () => {
    const { consulta } = preparar()
    consulta.getState().iniciarConsulta({ preguntarEmbarazo: false })
    consulta.getState().recibirTablet()
    consulta.getState().proponer({ preguntaId: 'P1', valor: 'DOLOR', origen: 'tactil' })
    consulta.getState().confirmar()
    expect(await screen.findByText('La persona está respondiendo')).toBeInTheDocument()
    expect(screen.queryByText(/Dolor/)).not.toBeInTheDocument()
  })

  it('al recibir la tablet, revisa solo lo confirmado y resalta lo que falta (PRO1)', async () => {
    const { consulta } = preparar()
    // P1 Dolor → P2 abdomen inferior → P3 ayer → P4 fuerte → P7 no → fin. P5 aún no está en el banco.
    responderTodo(consulta, ['DOLOR', 'ABDOMEN_INFERIOR', 'AYER', 'FUERTE', 'NO'])
    expect(await screen.findByText('La persona terminó de responder')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Recibir la tablet' }))

    expect(screen.getByRole('heading', { name: 'Revisión de respuestas' })).toBeInTheDocument()
    const sintoma = screen.getByText(
      'Dolor en abdomen inferior desde ayer, intensidad fuerte, evolución no especificada.',
    )
    expect(sintoma).toBeInTheDocument()
    // Cada dato junto a su nombre; el que falta se resalta, el dicho no.
    const valorDe = (etiqueta: string) => screen.getAllByText(etiqueta)[0]!.nextElementSibling
    expect(valorDe('Evolución')).toHaveTextContent('Falta un dato: no especificado')
    expect(valorDe('Intensidad')).toHaveTextContent(/^fuerte$/)
    expect(valorDe('Alergias')).toHaveTextContent(/^no$/)
  })

  it('ofrece Repreguntar (pronto), Ver resumen y Terminar consulta (PRO2)', async () => {
    const { consulta } = preparar()
    responderTodo(consulta, ['TOS', 'HOY', 'LEVE', 'NO'])
    consulta.getState().recibirTablet()
    expect(await screen.findByRole('button', { name: /Repreguntar/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Ver resumen/ })).toBeEnabled()
    expect(screen.getByRole('button', { name: /Terminar consulta/ })).toBeEnabled()
    expect(screen.getByText(/MARI no conserva datos/)).toBeInTheDocument()
  })

  it('el resumen tiene sus secciones, las originales y el cierre; sin "Repreguntas" (RES1–RES3)', async () => {
    const { consulta } = preparar()
    responderTodo(consulta, ['FIEBRE', 'HOY', 'MODERADO', 'SI'])
    consulta.getState().recibirTablet()
    await userEvent.click(await screen.findByRole('button', { name: /Ver resumen/ }))

    for (const seccion of ['Alerta inicial', 'Síntomas referidos', 'Antecedentes']) {
      expect(screen.getByRole('heading', { name: seccion })).toBeInTheDocument()
    }
    // Las secciones vacías no aparecen; las repreguntas van dentro de su síntoma.
    expect(screen.queryByRole('heading', { name: /Repreguntas|Mensaje libre/ })).toBeNull()
    expect(
      screen.getByText('Síntomas referidos', { selector: 'dt' }).nextElementSibling,
    ).toHaveTextContent('1')
    expect(screen.getByText(/Respuestas originales \(4\)/)).toBeInTheDocument()
    expect(screen.getAllByText(/No constituye diagnóstico/).length).toBeGreaterThan(0)
  })

  it('copiar texto avisa que el portapapeles queda fuera de MARI (RES4)', async () => {
    const escribir = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: escribir } })
    const { consulta } = preparar()
    responderTodo(consulta, ['TOS', 'HOY', 'LEVE', 'NO'])
    consulta.getState().recibirTablet()
    consulta.getState().verResumen()

    await userEvent.click(await screen.findByRole('button', { name: /Copiar texto/ }))
    expect(escribir).toHaveBeenCalledWith(expect.stringContaining('SÍNTOMAS REFERIDOS'))
    expect(screen.getByRole('status')).toHaveTextContent(/fuera de MARI/)
    vi.unstubAllGlobals()
  })

  it('descargar PDF genera el archivo sin datos personales en el nombre y avisa', async () => {
    const crearUrl = vi.fn(() => 'blob:resumen')
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: crearUrl, revokeObjectURL: vi.fn() }),
    )
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const { consulta } = preparar()
    responderTodo(consulta, ['TOS', 'HOY', 'LEVE', 'NO'])
    consulta.getState().recibirTablet()
    consulta.getState().verResumen()

    await userEvent.click(await screen.findByRole('button', { name: /Descargar PDF/ }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      /Descargado resumen-mari-\d{8}-\d{4}\.pdf.*fuera de MARI/,
    )
    const [pdf] = crearUrl.mock.calls[0] as unknown as [Blob]
    expect(pdf.type).toBe('application/pdf')
    expect(clic).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('terminar pide confirmación y luego borra todo', async () => {
    const { consulta } = preparar()
    responderTodo(consulta, ['TOS', 'HOY', 'LEVE', 'NO'])
    consulta.getState().recibirTablet()

    await userEvent.click(await screen.findByRole('button', { name: /Terminar consulta/ }))
    const dialogo = screen.getByRole('alertdialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Cancelar' }))
    expect(consulta.getState().respuestas).not.toHaveLength(0)

    await userEvent.click(screen.getByRole('button', { name: /Terminar consulta/ }))
    await userEvent.click(screen.getByRole('button', { name: /Sí, terminar y borrar/ }))
    expect(consulta.getState()).toMatchObject({ fase: 'inactiva', respuestas: [] })
    expect(screen.getByRole('heading', { name: 'Nueva consulta' })).toBeInTheDocument()
  })

  it('P0 = SÍ: el profesional ve la alerta, toma la tablet y la alerta sigue destacada', async () => {
    // El banco real todavía no tiene P0: se usa el motor simulado, que sí la tiene.
    const { consulta } = preparar(crearMotorSimulado())
    responderTodo(consulta, ['SI'])
    expect(await screen.findByRole('alert')).toHaveTextContent(/dificultad para respirar/)

    await userEvent.click(screen.getByRole('button', { name: 'Tomar la tablet' }))
    expect(consulta.getState().fase).toBe('profesional')
    expect(screen.getByText('Sí: avisar al personal')).toBeInTheDocument()
  })

  it('sin respuestas confirmadas no se genera resumen (RES4)', async () => {
    const { consulta } = preparar()
    consulta.getState().iniciarConsulta({ preguntarEmbarazo: false })
    consulta.getState().recibirTablet()
    consulta.getState().entregarAlProfesional()
    consulta.getState().recibirTablet()
    expect(await screen.findByText(/No hay respuestas confirmadas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Ver resumen/ })).toBeDisabled()
  })
})
