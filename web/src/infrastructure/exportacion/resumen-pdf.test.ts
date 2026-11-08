import { describe, expect, it } from 'vitest'
import { CIERRE, type Resumen } from '@/domain/resumen/resumen'
import { crearPdfResumen, nombreArchivoPdf } from './resumen-pdf'

const resumen: Resumen = {
  alerta: {
    estado: 'no',
    texto: 'No refiere dificultad para respirar ni dolor fuerte en el pecho.',
  },
  pidioInterprete: true,
  sintomas: [
    {
      sintoma: 'Dolor',
      linea: 'Dolor en abdomen inferior desde ayer, intensidad fuerte, evolución no especificada.',
      datos: [
        { etiqueta: 'Localización', valor: 'abdomen inferior' },
        { etiqueta: 'Evolución', valor: null },
      ],
      detalles: ['Dolor al comer? Si.'],
    },
  ],
  antecedentes: [{ etiqueta: 'Alergias', valor: 'no' }],
  mensajeLibre: [],
  otrosDatos: [],
  // Muchas filas para forzar más de una página.
  originales: Array.from({ length: 60 }, (_, i) => ({
    hora: '2026-11-08T15:00:00.000Z',
    pregunta: `Pregunta ${i + 1}`,
    respuesta: 'Respuesta',
    origen: 'tactil',
  })),
  cierre: CIERRE,
}

/** El PDF de jsPDF no está comprimido: los textos se pueden buscar en los bytes. */
async function textoDelPdf(blob: Blob) {
  return new TextDecoder('latin1').decode(await blob.arrayBuffer())
}

describe('crearPdfResumen', () => {
  it('genera un PDF con las secciones, el anexo y el cierre', async () => {
    const pdf = await crearPdfResumen(resumen, { generado: new Date(2026, 10, 8, 15, 8) })
    expect(pdf.type).toBe('application/pdf')
    const texto = await textoDelPdf(pdf)
    expect(texto.startsWith('%PDF-')).toBe(true)
    for (const fragmento of [
      'Resumen pre-consulta',
      'Generado: 08/11/2026 15:08',
      'Alerta inicial',
      'Antecedentes',
      'Anexo',
      'Solicitado',
      'No constituye diagn',
    ]) {
      expect(texto).toContain(fragmento)
    }
  })

  it('pasa a otra página cuando el contenido no cabe, con su número', async () => {
    const texto = await textoDelPdf(
      await crearPdfResumen(resumen, { generado: new Date(2026, 10, 8, 15, 8) }),
    )
    expect(texto).toMatch(/P.gina 2 de \d/)
  })
})

describe('nombreArchivoPdf', () => {
  it('no lleva datos personales, solo fecha y hora', () => {
    expect(nombreArchivoPdf(new Date(2026, 10, 8, 15, 8))).toBe('resumen-mari-20261108-1508.pdf')
  })
})
