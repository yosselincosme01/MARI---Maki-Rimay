import { describe, expect, it } from 'vitest'
import datosBanco from '@/data/banco-preguntas.json'
import { validarBanco } from '@/domain/banco/validar'
import { buscarPorTexto, raices } from './busqueda'

const resultado = validarBanco(datosBanco)
if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
const preguntas = resultado.banco.preguntas

/** IDs sugeridos para una pregunta escrita por el profesional. */
const sugeridas = (texto: string) => buscarPorTexto(texto, preguntas).map((c) => c.preguntaId)
const primera = (texto: string) => sugeridas(texto)[0]

describe('raices', () => {
  it('quita tildes, signos y palabras vacías, y recorta a la raíz', () => {
    expect(raices('¿Desde cuándo tiene FIEBRE?')).toEqual(['desde', 'cuand', 'fiebr'])
  })

  it('alérgico y alergias comparten raíz', () => {
    expect(raices('alérgico')).toEqual(raices('alergias'))
  })
})

describe('buscarPorTexto con el banco real', () => {
  it.each([
    ['¿Desde cuándo tiene la fiebre?', 'R-DESDE-CUANDO'],
    ['¿Hace cuánto empezó el dolor?', 'R-DESDE-CUANDO'],
    ['¿Cuánto tiempo lleva así?', 'R-DESDE-CUANDO'],
    ['¿Le duele mucho?', 'R-INTENSIDAD'],
    ['¿Qué tan fuerte es el dolor?', 'R-INTENSIDAD'],
    ['¿En qué parte le duele?', 'R-ZONA'],
    ['¿Dónde le duele exactamente?', 'R-ZONA'],
    ['¿Es alérgico a algún medicamento?', 'R-ALERGIAS'],
    ['¿Podría estar embarazada?', 'R-EMBARAZO'],
    ['¿Qué otro síntoma tiene?', 'R-SINTOMA'],
  ])('"%s" sugiere primero %s', (texto, esperada) => {
    expect(primera(texto)).toBe(esperada)
  })

  it('devuelve como máximo 3, ordenadas de mayor a menor similitud', () => {
    const resultado = buscarPorTexto('¿Dónde le duele y desde cuándo, qué tan fuerte?', preguntas)
    expect(resultado.length).toBeLessThanOrEqual(3)
    const similitudes = resultado.map((c) => c.similitud)
    expect(similitudes).toEqual([...similitudes].sort((a, b) => b - a))
    expect(similitudes.every((s) => s > 0 && s <= 1)).toBe(true)
  })

  it('sin coincidencia devuelve una lista vacía (orientar a interpretación)', () => {
    expect(sugeridas('¿La tos es con flema?')).toEqual([])
    expect(sugeridas('¿Fuma usted?')).toEqual([])
  })

  it('texto vacío o solo palabras vacías no sugiere nada', () => {
    expect(sugeridas('')).toEqual([])
    expect(sugeridas('¿y usted?')).toEqual([])
  })

  it('solo sugiere preguntas del grupo "repregunta", nunca del flujo', () => {
    const ids = sugeridas('¿Dónde le duele? ¿Qué siente? ¿Desde cuándo? ¿Tiene alergias?')
    expect(ids.length).toBeGreaterThan(0)
    expect(ids.every((id) => id.startsWith('R-'))).toBe(true)
  })

  it('respeta el umbral y el máximo', () => {
    expect(buscarPorTexto('¿le duele?', preguntas, { umbral: 0.99, maximo: 3 })).toEqual([])
    expect(buscarPorTexto('¿le duele?', preguntas, { umbral: 0, maximo: 1 })).toHaveLength(1)
  })
})
