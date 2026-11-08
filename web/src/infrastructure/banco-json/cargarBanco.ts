import datos from '@/data/banco-preguntas.json'
import { validarBanco, type ResultadoBanco } from '@/domain/banco/validar'

/**
 * Carga y valida `data/banco-preguntas.json`. Va empaquetado con la app, así que funciona sin
 * internet. Si el banco es inválido, la interfaz muestra los errores y no inicia la consulta.
 */
export function cargarBanco(): ResultadoBanco {
  return validarBanco(datos)
}
