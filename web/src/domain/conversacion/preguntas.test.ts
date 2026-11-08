import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import { validarBanco } from '@/domain/banco/validar'
import { catalogo, dividirPreguntas, interpretar } from './preguntas'

function banco() {
  const r = validarBanco(datosBanco)
  if (!r.ok) throw new Error(r.errores.join('\n'))
  return r.banco
}
const ids = (texto: string) => interpretar(texto, banco()).map((i) => i.preguntaId)

describe('dividirPreguntas', () => {
  it('separa por signos de pregunta, "y" y comas', () => {
    expect(dividirPreguntas('¿Dónde te duele? y desde cuándo')).toEqual([
      'Dónde te duele',
      'desde cuándo',
    ])
    expect(dividirPreguntas('qué siente, desde cuándo y qué tan fuerte')).toHaveLength(3)
  })

  it('descarta trozos vacíos o sin palabras útiles', () => {
    expect(dividirPreguntas('¿? y , ;')).toEqual([])
  })
})

describe('interpretar (con el banco real)', () => {
  it('lo escrito igual a la pregunta encuentra su pregunta del flujo', () => {
    expect(ids('¿Qué sientes?')).toEqual(['P1']) // palabras muy comunes: va por coincidencia exacta
    expect(ids('que sientes')).toEqual(['P1'])
    expect(ids('¿Dónde te duele?')).toEqual(['P2'])
  })

  it('varias preguntas en un solo texto, en el orden escrito', () => {
    expect(ids('¿Dónde te duele? y desde cuándo')).toEqual(['P2', 'P3'])
  })

  it('entiende otras formas de decirlo gracias a los alias', () => {
    expect(ids('¿Hace cuánto tiempo empezó?')).toEqual(['P3'])
    expect(ids('¿Es alérgica a algún medicamento?')).toEqual(['P7'])
  })

  it('lo que no tiene video se informa como null, sin inventar', () => {
    expect(interpretar('¿Toma pastillas para la presión?', banco())).toEqual([
      { texto: 'Toma pastillas para la presión', preguntaId: null },
    ])
  })

  it('no repite una pregunta pedida dos veces', () => {
    expect(ids('¿Desde cuándo? ¿hace cuánto?')).toEqual(['P3'])
  })
})

describe('catalogo', () => {
  it('ofrece las preguntas del flujo, una por video', () => {
    expect(catalogo(banco()).map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P7', 'P9'])
  })
})
