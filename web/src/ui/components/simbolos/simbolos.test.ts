import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import { VALOR_OTRA } from '@/domain/banco/esquema'
import { validarBanco } from '@/domain/banco/validar'
import { simboloDe } from './simbolos'

const resultado = validarBanco(datosBanco)
if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
const preguntas = resultado.banco.preguntas
const pregunta = (id: string) => preguntas.find((p) => p.id === id)!

describe('símbolos de las respuestas', () => {
  it('toda opción de toda pregunta tiene un símbolo, para quien no lee', () => {
    const sinSimbolo = preguntas.flatMap((p) =>
      [...p.opciones.map((o) => o.valor), ...(p.permiteOtra ? [VALOR_OTRA] : [])]
        .filter((valor) => simboloDe(p, valor) === null)
        .map((valor) => `${p.id}: ${valor}`),
    )
    expect(sinSimbolo).toEqual([])
  })

  it('usa el pictograma del banco cuando existe', () => {
    expect(simboloDe(pregunta('P1'), 'DOLOR')).toEqual({
      tipo: 'pictograma',
      ruta: 'pictogramas/dolor.png',
    })
  })

  it('las zonas del cuerpo se dibujan con la silueta', () => {
    expect(simboloDe(pregunta('P2'), 'ESPALDA')).toEqual({ tipo: 'zona', zona: 'ESPALDA' })
    expect(simboloDe(pregunta('P2'), 'OTRA_ZONA')).toEqual({ tipo: 'zona', zona: 'OTRA_ZONA' })
  })

  it('el tiempo marca más días cuanto más dura', () => {
    const marcados = ['HOY', 'AYER', 'VARIOS_DIAS', 'UNA_SEMANA_O_MAS'].map((v) => {
      const s = simboloDe(pregunta('P3'), v)
      return s?.tipo === 'dias' ? s.marcados : null
    })
    expect(marcados).toEqual([1, 2, 4, 7])
    expect(simboloDe(pregunta('P3'), 'UNA_SEMANA_O_MAS')).toMatchObject({ mas: true })
  })

  it('la escala usa barras crecientes según su posición', () => {
    expect(simboloDe(pregunta('P4'), 'MODERADO')).toEqual({ tipo: 'escala', nivel: 2, total: 3 })
  })

  it('"no sé" y "otra" usan el signo de pregunta', () => {
    expect(simboloDe(pregunta('P9'), 'NO_SE')).toEqual({ tipo: 'duda' })
    expect(simboloDe(pregunta('P1'), VALOR_OTRA)).toEqual({ tipo: 'duda' })
  })
})
