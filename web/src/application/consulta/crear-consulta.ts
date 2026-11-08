/**
 * La consulta en curso (módulo CNS, contrato §5.4).
 *
 * Es un store de Zustand en su versión "vanilla": no depende de React, así que se prueba
 * con tests puros. La vista se conecta después con un hook.
 *
 * No importa el motor ni el grabador: los recibe al crearse (inyección de dependencias).
 * Así los tests usan versiones falsas y la app, las reales.
 *
 * Todo vive en memoria. No se usa el middleware `persist` de Zustand a propósito.
 */
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { Grabador } from '@/application/puertos/grabador'
import type { Respuesta } from '@/domain/banco/tipos'
import type { MotorFlujo, Paso } from '@/domain/flujo/motor'
import type { CasosDeUso, EstadoConsulta, Fase } from './tipos'

export interface Dependencias {
  motor: MotorFlujo
  grabador: Grabador
  /** IDs técnicos y temporales. En la app: crypto.randomUUID. */
  generarId: () => string
  /** Hora actual. Se inyecta para que los tests sean predecibles. */
  ahora: () => Date
}

export type Consulta = EstadoConsulta & CasosDeUso
export type StoreConsulta = StoreApi<Consulta>

/** Estado de una tablet sin consulta: nada guardado. */
function estadoVacio(): EstadoConsulta {
  return {
    id: '',
    fase: 'inactiva',
    config: { preguntarEmbarazo: false },
    preguntaActiva: null,
    ciclo: null,
    repreguntaActiva: null,
    provisional: null,
    respuestas: [],
  }
}

export function crearConsulta(deps: Dependencias): StoreConsulta {
  return createStore<Consulta>()((set, get) => {
    /** Una acción en la fase equivocada es un error de la interfaz: se avisa en voz alta. */
    function exigirFase(accion: string, ...permitidas: Fase[]): void {
      const { fase } = get()
      if (!permitidas.includes(fase)) {
        throw new Error(`No se puede ${accion} en la fase "${fase}".`)
      }
    }

    /** Reconstruye el paso actual para preguntarle al motor qué sigue. */
    function pasoActual(): Paso {
      const { preguntaActiva, ciclo } = get()
      if (preguntaActiva === null) throw new Error('No hay una pregunta activa.')
      return { tipo: 'pregunta', preguntaId: preguntaActiva, ciclo }
    }

    /** Traduce la decisión del motor a cambios de estado. */
    function aplicarPaso(paso: Paso): Partial<EstadoConsulta> {
      switch (paso.tipo) {
        case 'pregunta':
          return { preguntaActiva: paso.preguntaId, ciclo: paso.ciclo }
        case 'alerta':
          return { fase: 'alerta', preguntaActiva: null, ciclo: null }
        case 'interpretacion': // la orientación se deduce de la respuesta P11 = SÍ
        case 'fin':
          return { fase: 'entrega-profesional', preguntaActiva: null, ciclo: null }
      }
    }

    return {
      ...estadoVacio(),

      iniciarConsulta(config) {
        exigirFase('iniciar una consulta', 'inactiva')
        const paso = deps.motor.inicio(config)
        set({
          ...estadoVacio(),
          id: deps.generarId(),
          fase: 'entrega-paciente',
          config: { ...config },
          ...aplicarPaso(paso),
        })
      },

      recibirTablet() {
        const { fase, repreguntaActiva } = get()
        if (fase === 'entrega-paciente') {
          set({ fase: repreguntaActiva ? 'repregunta' : 'paciente' })
        } else if (fase === 'entrega-profesional') {
          set({ fase: 'profesional' })
        } else {
          throw new Error(`No hay una entrega de tablet pendiente en la fase "${fase}".`)
        }
      },

      proponer(respuesta) {
        exigirFase('responder', 'paciente', 'repregunta')
        const { preguntaActiva } = get()
        if (respuesta.preguntaId !== preguntaActiva) {
          throw new Error(
            `La respuesta es para "${respuesta.preguntaId}", pero la pregunta activa es "${preguntaActiva}".`,
          )
        }
        // Si ya había una provisional, la nueva la reemplaza: la persona cambió de idea antes de ✓.
        set({ provisional: { ...respuesta } })
      },

      confirmar() {
        const estado = get()
        const provisional = estado.provisional
        if (provisional === null) return // doble toque en ✓: no hace nada (CON3)
        exigirFase('confirmar', 'paciente', 'repregunta')

        const respuesta: Respuesta = {
          ...provisional,
          id: deps.generarId(),
          confirmada: true,
          hora: deps.ahora().toISOString(),
        }

        // Repregunta: se guarda y la tablet vuelve al profesional. El motor no participa.
        if (estado.fase === 'repregunta') {
          const sintoma = estado.repreguntaActiva?.sintoma
          respuesta.repregunta = sintoma === undefined ? {} : { sintoma }
          set({
            respuestas: [...estado.respuestas, respuesta],
            provisional: null,
            repreguntaActiva: null,
            preguntaActiva: null,
            fase: 'entrega-profesional',
          })
          return
        }

        // Flujo normal: la respuesta pertenece al ciclo (síntoma) actual.
        if (estado.ciclo !== null) {
          respuesta.ciclo = estado.ciclo.numero
          if (estado.ciclo.sintoma !== undefined) respuesta.sintoma = estado.ciclo.sintoma
        }

        // Primero se le pregunta al motor; si falla, la consulta queda como estaba.
        const siguiente = deps.motor.siguiente(pasoActual(), respuesta, estado.config)
        set({
          respuestas: [...estado.respuestas, respuesta],
          provisional: null,
          ...aplicarPaso(siguiente),
        })
      },

      descartar() {
        set({ provisional: null })
      },

      entregarAlProfesional() {
        exigirFase('entregar la tablet al profesional', 'paciente', 'alerta', 'repregunta')
        set({
          fase: 'entrega-profesional',
          provisional: null,
          preguntaActiva: null,
          ciclo: null,
          repreguntaActiva: null,
        })
      },

      enviarRepregunta(preguntaId, sintoma) {
        exigirFase('enviar una repregunta', 'profesional')
        set({
          fase: 'entrega-paciente',
          preguntaActiva: preguntaId,
          ciclo: null,
          provisional: null,
          repreguntaActiva: sintoma === undefined ? { preguntaId } : { preguntaId, sintoma },
        })
      },

      verResumen() {
        exigirFase('ver el resumen', 'profesional')
        set({ fase: 'resumen' })
      },

      terminarConsulta() {
        deps.grabador.descartarTodo() // grabaciones del mensaje libre
        set(estadoVacio()) // respuestas, resumen y configuración
      },
    }
  })
}
