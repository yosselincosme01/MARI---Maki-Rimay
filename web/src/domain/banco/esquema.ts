import { z } from 'zod'

/**
 * Esquema del banco de preguntas (contrato §5.2 del plan de trabajo).
 *
 * Las preguntas y la lógica del flujo viven en datos: el motor (FLU) interpreta el banco y la
 * interfaz nunca codifica el orden. Aquí se valida la forma de cada pregunta y, además, que las
 * reglas `siguiente` sean coherentes (destinos que existen, valores que la pregunta ofrece…).
 */

/** Destinos de `ir` que no son una pregunta. */
export const DESTINOS_ESPECIALES = ['ALERTA', 'INTERPRETACION', 'FIN'] as const

/** Claves de configuración que el profesional fija al iniciar la consulta. */
export const CLAVES_CONFIG = ['preguntarEmbarazo'] as const

/** Valor que se guarda cuando la persona elige "otra / no está aquí". */
export const VALOR_OTRA = 'OTRA'

const idPregunta = z
  .string()
  .regex(/^(P\d+|P-[A-Z]+|R-[A-Z0-9-]+)$/, 'ID inválido: usa P0…P11, P-OPC o R-ALGO')

const valor = z
  .string()
  .regex(/^[A-Z0-9]+(_[A-Z0-9]+)*$/, 'Valor inválido: usa MAYÚSCULAS_CON_GUION_BAJO')

const ruta = z.string().min(1).regex(/^[^/]/, 'La ruta es relativa a public/, sin "/" inicial')

const opcion = z.strictObject({
  valor,
  etiqueta: z.string().min(1),
  pictograma: ruta.optional(),
  videoRespuesta: ruta.optional(),
})

const regla = z.strictObject({
  si: z.strictObject({ valor }).optional(),
  ir: z.string().min(1),
  nuevoCiclo: z.literal(true).optional(),
})

const pregunta = z.strictObject({
  id: idPregunta,
  grupo: z.enum(['flujo', 'repregunta']),
  /** Texto para el profesional y para lectores de pantalla. Debe decir lo mismo que el video. */
  texto: z.string().min(1),
  video: ruta,
  /** Validado por una persona competente en LSP. Si es false, ver modo demo (§5.5). */
  validado: z.boolean(),
  tipo: z.enum(['sena', 'opciones', 'escala', 'cuerpo']),
  multiple: z.boolean().optional(),
  opciones: z.array(opcion).min(1),
  permiteOtra: z.boolean().optional(),
  /** La respuesta define el síntoma del ciclo. */
  iniciaCiclo: z.boolean().optional(),
  /** La respuesta se guarda junto al síntoma del ciclo actual. */
  porCiclo: z.boolean().optional(),
  mostrarSi: z.strictObject({ config: z.enum(CLAVES_CONFIG) }).optional(),
  /** Palabras para el respaldo de búsqueda por texto (solo repreguntas). */
  alias: z.array(z.string().min(1)).min(1).optional(),
  siguiente: z.array(regla).min(1).optional(),
})

export const esquemaBanco = z
  .strictObject({
    version: z.literal(1),
    preguntas: z.array(pregunta).min(1),
  })
  .superRefine((banco, ctx) => {
    const error = (message: string, path: (string | number)[]) =>
      ctx.addIssue({ code: 'custom', message, path })

    const idsFlujo = new Set<string>()
    const vistos = new Set<string>()
    banco.preguntas.forEach((p, i) => {
      if (vistos.has(p.id)) error(`ID repetido: ${p.id}`, ['preguntas', i, 'id'])
      vistos.add(p.id)
      if (p.grupo === 'flujo') idsFlujo.add(p.id)
    })
    if (idsFlujo.size === 0) error('El banco no tiene preguntas del grupo "flujo"', ['preguntas'])

    const iniciaCiclo = new Set(banco.preguntas.filter((p) => p.iniciaCiclo).map((p) => p.id))

    banco.preguntas.forEach((p, i) => {
      const base = ['preguntas', i] as (string | number)[]

      const valores = new Set<string>()
      p.opciones.forEach((o, j) => {
        if (valores.has(o.valor)) {
          error(`Opción repetida: ${o.valor}`, [...base, 'opciones', j, 'valor'])
        }
        if (o.valor === VALOR_OTRA) {
          error(`${VALOR_OTRA} está reservado; usa "permiteOtra"`, [...base, 'opciones', j])
        }
        valores.add(o.valor)
      })

      if (p.iniciaCiclo && p.porCiclo) {
        error('Una pregunta no puede iniciar ciclo y guardarse por ciclo a la vez', base)
      }

      if (p.grupo === 'flujo' && !p.siguiente) {
        error('Las preguntas del flujo necesitan reglas "siguiente"', base)
      }
      if (p.grupo === 'repregunta') {
        if (!p.alias) error('Las repreguntas necesitan "alias"', base)
        if (p.siguiente) error('Las repreguntas no llevan "siguiente"', [...base, 'siguiente'])
      }

      const reglas = p.siguiente ?? []
      reglas.forEach((r, j) => {
        const path = [...base, 'siguiente', j]
        const ultima = j === reglas.length - 1
        if (ultima && r.si) error('La última regla es el caso por defecto: no lleva "si"', path)
        if (!ultima && !r.si) error('Solo la última regla puede ir sin "si"', path)

        if (r.si) {
          const permitido = valores.has(r.si.valor) || (p.permiteOtra && r.si.valor === VALOR_OTRA)
          if (!permitido) {
            error(`"${r.si.valor}" no es una opción de ${p.id}`, [...path, 'si', 'valor'])
          }
        }

        const especial = (DESTINOS_ESPECIALES as readonly string[]).includes(r.ir)
        if (!especial && !idsFlujo.has(r.ir)) {
          error(`Destino desconocido: ${r.ir}`, [...path, 'ir'])
        }
        if (r.ir === p.id) error(`${p.id} no puede ir a sí misma`, [...path, 'ir'])
        if (r.nuevoCiclo && !iniciaCiclo.has(r.ir)) {
          error(`"nuevoCiclo" debe ir a una pregunta que inicia ciclo`, [...path, 'nuevoCiclo'])
        }
      })
    })
  })
