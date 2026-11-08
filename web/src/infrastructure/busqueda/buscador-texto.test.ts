import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import { validarBanco } from '@/domain/banco/validar'
import { crearBuscadorTexto } from './buscador-texto'

const resultado = validarBanco(datosBanco)
if (!resultado.ok) throw new Error(resultado.errores.join('\n'))

describe('crearBuscadorTexto', () => {
  const buscador = crearBuscadorTexto(resultado.banco)

  it('cumple el puerto: prepara sin errores y busca por texto', async () => {
    await expect(buscador.preparar()).resolves.toBeUndefined()
    const { metodo, sugerencias } = await buscador.buscar('¿Desde cuándo tiene fiebre?')
    expect(metodo).toBe('texto')
    expect(sugerencias[0]).toMatchObject({ preguntaId: 'R-DESDE-CUANDO' })
  })

  it('sin coincidencia devuelve una lista vacía', async () => {
    expect(await buscador.buscar('¿La tos es con flema?')).toEqual({
      metodo: 'texto',
      sugerencias: [],
    })
  })
})
