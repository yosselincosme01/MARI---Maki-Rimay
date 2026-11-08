import { describe, expect, it } from 'vitest'
import { validarBanco } from './validar'

/** Banco mínimo válido: P1 → (SI → P2 | FIN), P2 → FIN. */
function bancoBase() {
  return {
    version: 1,
    preguntas: [
      {
        id: 'P1',
        grupo: 'flujo',
        texto: '¿Te duele?',
        video: 'videos/p1.mp4',
        validado: false,
        tipo: 'sena',
        opciones: [
          { valor: 'SI', etiqueta: 'Sí' },
          { valor: 'NO', etiqueta: 'No' },
        ],
        iniciaCiclo: true,
        siguiente: [{ si: { valor: 'SI' }, ir: 'P2' }, { ir: 'FIN' }] as unknown[],
      } as Record<string, unknown>,
      {
        id: 'P2',
        grupo: 'flujo',
        texto: '¿Desde cuándo?',
        video: 'videos/p2.mp4',
        validado: false,
        tipo: 'opciones',
        opciones: [{ valor: 'HOY', etiqueta: 'Hoy' }],
        porCiclo: true,
        siguiente: [{ ir: 'FIN' }] as unknown[],
      } as Record<string, unknown>,
    ],
  }
}

function errores(datos: unknown): string[] {
  const resultado = validarBanco(datos)
  return resultado.ok ? [] : resultado.errores
}

describe('validarBanco', () => {
  it('acepta un banco válido', () => {
    expect(validarBanco(bancoBase())).toMatchObject({ ok: true })
  })

  it('rechaza algo que no es un banco, sin lanzar', () => {
    expect(validarBanco(null)).toMatchObject({ ok: false })
    expect(validarBanco('banco')).toMatchObject({ ok: false })
  })

  it('rechaza un campo obligatorio ausente y nombra la pregunta', () => {
    const banco = bancoBase()
    delete banco.preguntas[1]!.video
    expect(errores(banco).join()).toMatch(/^P2 › video:/)
  })

  it('rechaza campos desconocidos (erratas como "sigiente")', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.sigiente = []
    expect(errores(banco)).not.toEqual([])
  })

  it('rechaza IDs repetidos', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.id = 'P1'
    expect(errores(banco).join()).toMatch(/ID repetido: P1/)
  })

  it('rechaza un destino que no existe', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.siguiente = [{ ir: 'P99' }]
    expect(errores(banco).join()).toMatch(/Destino desconocido: P99/)
  })

  it('rechaza una condición con un valor que la pregunta no ofrece', () => {
    const banco = bancoBase()
    banco.preguntas[0]!.siguiente = [{ si: { valor: 'TAL_VEZ' }, ir: 'P2' }, { ir: 'FIN' }]
    expect(errores(banco).join()).toMatch(/"TAL_VEZ" no es una opción de P1/)
  })

  it('acepta OTRA en una condición solo si la pregunta permite "otra"', () => {
    const banco = bancoBase()
    banco.preguntas[0]!.siguiente = [{ si: { valor: 'OTRA' }, ir: 'P2' }, { ir: 'FIN' }]
    expect(errores(banco)).not.toEqual([])
    banco.preguntas[0]!.permiteOtra = true
    expect(errores(banco)).toEqual([])
  })

  it('exige que solo la última regla sea el caso por defecto', () => {
    const banco = bancoBase()
    banco.preguntas[0]!.siguiente = [{ ir: 'P2' }, { si: { valor: 'SI' }, ir: 'FIN' }]
    const lista = errores(banco).join()
    expect(lista).toMatch(/Solo la última regla puede ir sin "si"/)
    expect(lista).toMatch(/La última regla es el caso por defecto/)
  })

  it('exige reglas "siguiente" en las preguntas del flujo', () => {
    const banco = bancoBase()
    delete banco.preguntas[1]!.siguiente
    expect(errores(banco).join()).toMatch(/necesitan reglas "siguiente"/)
  })

  it('exige "alias" en las repreguntas y les prohíbe "siguiente"', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.grupo = 'repregunta'
    expect(errores(banco).join()).toMatch(/necesitan "alias"/)
    banco.preguntas[1]!.alias = ['cuándo']
    expect(errores(banco).join()).toMatch(/no llevan "siguiente"/)
  })

  it('rechaza "nuevoCiclo" hacia una pregunta que no inicia ciclo', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.siguiente = [{ ir: 'P1', nuevoCiclo: true }]
    expect(errores(banco)).toEqual([])
    banco.preguntas[0]!.siguiente = [
      { si: { valor: 'SI' }, ir: 'P2', nuevoCiclo: true },
      { ir: 'FIN' },
    ]
    expect(errores(banco).join()).toMatch(/"nuevoCiclo" debe ir a una pregunta que inicia ciclo/)
  })

  it('reserva OTRA para "permiteOtra"', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.opciones = [{ valor: 'OTRA', etiqueta: 'Otra' }]
    expect(errores(banco).join()).toMatch(/OTRA está reservado/)
  })

  it('rechaza una configuración de "mostrarSi" desconocida', () => {
    const banco = bancoBase()
    banco.preguntas[1]!.mostrarSi = { config: 'preguntarEdad' }
    expect(errores(banco)).not.toEqual([])
  })
})
