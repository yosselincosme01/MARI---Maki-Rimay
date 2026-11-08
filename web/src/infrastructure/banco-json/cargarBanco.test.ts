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

  it('solo incluye las preguntas que ya tienen video', () => {
    expect(banco().preguntas.map((p) => p.id)).toEqual(['P1', 'P2', 'P3', 'P4', 'P7', 'P9'])
  })

  it('cada video y pictograma existe en public/', () => {
    const rutas = banco().preguntas.flatMap((p) => [
      p.video,
      ...p.opciones.flatMap((o) => [o.pictograma, o.videoRespuesta]),
    ])
    const faltantes = rutas.filter((r) => r !== undefined && !existsSync(join(publico, r)))
    expect(faltantes).toEqual([])
  })

  it('ningún video está marcado como validado todavía', () => {
    expect(banco().preguntas.every((p) => !p.validado)).toBe(true)
  })
})
