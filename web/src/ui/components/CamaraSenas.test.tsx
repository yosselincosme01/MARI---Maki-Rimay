import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Pregunta, RespuestaProvisional } from '@/domain/banco/tipos'
import { crearReconocedorSimulado } from '@/infrastructure/simuladores/reconocedor-simulado'
import { CamaraSenas } from './CamaraSenas'

afterEach(cleanup)

const pregunta = (id: string, valores: string[]): Pregunta => ({
  id,
  grupo: 'flujo',
  texto: id,
  video: `videos/${id}.mp4`,
  validado: false,
  tipo: 'sena',
  opciones: valores.map((valor) => ({ valor, etiqueta: valor })),
})
const P1 = pregunta('P1', ['DOLOR', 'TOS', 'FIEBRE', 'FALTA_DE_AIRE'])
const P7 = pregunta('P7', ['SI', 'NO'])

/** Envuelve la cámara con el estado de activación, como lo hace la vista paciente. */
function mostrar({ preguntaInicial = P1, escuchando = true } = {}) {
  const reconocedor = crearReconocedorSimulado()
  const alResponder = vi.fn<(r: RespuestaProvisional) => void>()
  let cambiarPregunta: (p: Pregunta) => void = () => {}
  function Prueba() {
    const [activa, setActiva] = useState(false)
    const [p, setP] = useState(preguntaInicial)
    cambiarPregunta = setP
    return (
      <CamaraSenas
        reconocedor={reconocedor}
        pregunta={p}
        alResponder={alResponder}
        escuchando={escuchando}
        activa={activa}
        alActivar={() => setActiva(true)}
        alApagar={() => setActiva(false)}
        simulado
      />
    )
  }
  render(<Prueba />)
  const sena = (clase: 'DOLOR' | 'TOS' | 'SI' | 'NO', veces = 3) =>
    act(() => {
      for (let i = 0; i < veces; i++) reconocedor.emitir({ clase, confianza: 0.9, tiempoMs: i })
    })
  return {
    reconocedor,
    alResponder,
    sena,
    cambiarPregunta: (p: Pregunta) => act(() => cambiarPregunta(p)),
  }
}

describe('CamaraSenas (SEN)', () => {
  it('la cámara solo se enciende al pulsar "Activar cámara" (M7)', async () => {
    const { reconocedor } = mostrar()
    const iniciar = vi.spyOn(reconocedor, 'iniciar')
    expect(iniciar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    expect(iniciar).toHaveBeenCalledOnce()
    expect(await screen.findByText('Haz tu seña')).toBeInTheDocument()
  })

  it('en modo presentación avisa que el reconocimiento es simulado', async () => {
    mostrar()
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    expect(screen.getByText('Reconocimiento simulado (demo)')).toBeInTheDocument()
  })

  it('una seña reconocida que es opción de la pregunta se PROPONE, con origen "seña"', async () => {
    const { alResponder, sena } = mostrar()
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    sena('DOLOR')
    expect(alResponder).toHaveBeenCalledWith({ preguntaId: 'P1', valor: 'DOLOR', origen: 'sena' })
  })

  it('no propone con menos inferencias que las que pide la regla de decisión', async () => {
    const { alResponder, sena } = mostrar()
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    sena('DOLOR', 2)
    expect(alResponder).not.toHaveBeenCalled()
  })

  it('una seña que no es opción de la pregunta no responde y avisa', async () => {
    const { alResponder, sena } = mostrar({ preguntaInicial: P7 })
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    sena('TOS')
    expect(alResponder).not.toHaveBeenCalled()
    expect(screen.getByText(/no es una respuesta de esta pregunta/)).toBeInTheDocument()
  })

  it('el aviso desaparece al pasar a otra pregunta y la cámara sigue activa', async () => {
    const { alResponder, sena, cambiarPregunta } = mostrar({ preguntaInicial: P7 })
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    sena('TOS')
    cambiarPregunta(P1)
    expect(screen.queryByText(/no es una respuesta/)).toBeNull()
    sena('TOS')
    expect(alResponder).toHaveBeenCalledWith({ preguntaId: 'P1', valor: 'TOS', origen: 'sena' })
  })

  it('mientras la persona confirma, no escucha señas nuevas', async () => {
    const { alResponder, sena } = mostrar({ escuchando: false })
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    sena('DOLOR')
    expect(alResponder).not.toHaveBeenCalled()
  })

  it('"Apagar cámara" la apaga', async () => {
    const { reconocedor } = mostrar()
    const detener = vi.spyOn(reconocedor, 'detener')
    await userEvent.click(screen.getByRole('button', { name: /Activar cámara/ }))
    await userEvent.click(screen.getByRole('button', { name: /Apagar cámara/ }))
    expect(detener).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Activar cámara/ })).toBeInTheDocument()
  })
})
