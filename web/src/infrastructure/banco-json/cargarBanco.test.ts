/// <reference types="node" />
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cargarBanco } from './cargarBanco'

/** Vitest corre desde web/. */
const publico = join(process.cwd(), 'public')

function banco() {
  const resultado = cargarBanco()
  if (!resultado.ok) throw new Error(resultado.errores.join('\n'))
  return resultado.banco
}

describe('banco-preguntas.json', () => {
  it('es válido', () => {
    expect(cargarBanco()).toMatchObject({ ok: true })
  })

  it('el flujo solo incluye las preguntas que ya tienen video', () => {
    const flujo = banco().preguntas.filter((p) => p.grupo === 'flujo')
    expect(flujo.map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P7', 'P9'])
  })

  it('las repreguntas reutilizan los videos validados del flujo', () => {
    const preguntas = banco().preguntas
    const videosFlujo = new Set(preguntas.filter((p) => p.grupo === 'flujo').map((p) => p.video))
    const repreguntas = preguntas.filter((p) => p.grupo === 'repregunta')
    expect(repreguntas.length).toBeGreaterThanOrEqual(5) // el plan pide de 5 a 10 (BAN3)
    expect(repreguntas.every((r) => videosFlujo.has(r.video) && r.alias?.length)).toBe(true)
  })

  it('cada video y pictograma existe en public/', () => {
    const rutas = banco().preguntas.flatMap((p) => [
      p.video,
      ...p.opciones.flatMap((o) => [o.pictograma, o.videoRespuesta]),
    ])
    const faltantes = rutas.filter((r) => r !== undefined && !existsSync(join(publico, r)))
    expect(faltantes).toEqual([])
  })

  it('los 6 videos están validados (grabados por una persona competente en LSP)', () => {
    expect(banco().preguntas.every((p) => p.validado)).toBe(true)
  })
})
