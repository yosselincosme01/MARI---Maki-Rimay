/**
 * Resumen en PDF para el informe médico. Se genera en el navegador (jsPDF): sin servidor y
 * sin internet. El archivo sale de MARI solo cuando el profesional lo descarga.
 *
 * Formato A4, con el mismo orden que la pantalla: encabezado, datos de un vistazo, alerta,
 * síntomas, antecedentes, mensaje libre, otros datos y, como anexo, las respuestas originales.
 */
import type { jsPDF as JsPDF } from 'jspdf'
import { fechaHora, horaCorta, mostrarDato, type Resumen } from '@/domain/resumen/resumen'

const MARGEN = 18
const ANCHO_PAGINA = 210
const ALTO_PAGINA = 297
const ANCHO_UTIL = ANCHO_PAGINA - 2 * MARGEN
const PIE = 14 // espacio reservado al pie de página

type Rgb = [number, number, number]
const TINTA: Rgb = [21, 69, 63]
const MARCA: Rgb = [7, 129, 126]
const GRIS: Rgb = [110, 125, 122]
const ALERTA: Rgb = [180, 35, 24]
const FONDO: Rgb = [241, 249, 247]

export interface OpcionesPdf {
  generado: Date
  /** Logo en data URL (PNG). Si falta, el encabezado va solo con texto. */
  logo?: { dataUrl: string; proporcion: number } | undefined
}

export async function crearPdfResumen(resumen: Resumen, opciones: OpcionesPdf): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const escritor = new Escritor(doc)

  encabezado(escritor, opciones)
  deUnVistazo(escritor, resumen)

  escritor.titulo('Alerta inicial')
  escritor.parrafo(resumen.alerta.texto, { color: resumen.alerta.estado === 'si' ? ALERTA : TINTA })

  escritor.titulo('Síntomas referidos')
  if (resumen.sintomas.length === 0) escritor.parrafo('No especificado.', { cursiva: true })
  for (const s of resumen.sintomas) {
    escritor.parrafo(s.linea, { negrita: true })
    for (const d of s.datos) escritor.dato(d.etiqueta, mostrarDato(d), d.valor === null)
    for (const det of s.detalles) escritor.vineta(det)
    escritor.espacio(2)
  }

  escritor.titulo('Antecedentes')
  for (const d of resumen.antecedentes) escritor.dato(d.etiqueta, mostrarDato(d), d.valor === null)

  if (resumen.mensajeLibre.length > 0) {
    escritor.titulo('Mensaje libre en LSP')
    resumen.mensajeLibre.forEach((l) => escritor.vineta(l))
  }
  if (resumen.otrosDatos.length > 0) {
    escritor.titulo('Otros datos referidos')
    resumen.otrosDatos.forEach((l) => escritor.vineta(l))
  }

  escritor.cierre(resumen.cierre)
  anexoOriginales(escritor, resumen)
  pies(doc)

  return doc.output('blob')
}

/** Nombre del archivo, sin datos personales: resumen-mari-20261108-1508.pdf */
export function nombreArchivoPdf(generado: Date): string {
  const d = (n: number) => String(n).padStart(2, '0')
  return `resumen-mari-${generado.getFullYear()}${d(generado.getMonth() + 1)}${d(generado.getDate())}-${d(generado.getHours())}${d(generado.getMinutes())}.pdf`
}

/* ───────────────────────────────── Secciones ───────────────────────────────── */

function encabezado(e: Escritor, { generado, logo }: OpcionesPdf) {
  const { doc } = e
  if (logo) {
    const ancho = 42
    doc.addImage(logo.dataUrl, 'PNG', MARGEN, MARGEN - 4, ancho, ancho / logo.proporcion)
  }
  doc
    .setFont('helvetica', 'bold')
    .setFontSize(16)
    .setTextColor(...TINTA)
  doc.text('Resumen pre-consulta', ANCHO_PAGINA - MARGEN, MARGEN + 2, { align: 'right' })
  doc
    .setFont('helvetica', 'normal')
    .setFontSize(9)
    .setTextColor(...GRIS)
  doc.text(`Generado: ${fechaHora(generado)}`, ANCHO_PAGINA - MARGEN, MARGEN + 8, {
    align: 'right',
  })

  e.y = MARGEN + 16
  doc.setFontSize(9.5).setTextColor(...GRIS)
  doc.text(
    'Información referida y confirmada por la persona usuaria de Lengua de Señas Peruana mediante MARI.',
    MARGEN,
    e.y,
  )
  e.y += 4
  doc
    .setDrawColor(...MARCA)
    .setLineWidth(0.6)
    .line(MARGEN, e.y, ANCHO_PAGINA - MARGEN, e.y)
  e.y += 7
}

function deUnVistazo(e: Escritor, resumen: Resumen) {
  const { doc } = e
  const celdas: { etiqueta: string; valor: string; color: Rgb }[] = [
    {
      etiqueta: 'ALERTA INICIAL',
      valor: { si: 'Sí: avisar al personal', no: 'No', 'no-especificado': 'No especificado' }[
        resumen.alerta.estado
      ],
      color: resumen.alerta.estado === 'si' ? ALERTA : TINTA,
    },
    { etiqueta: 'SÍNTOMAS REFERIDOS', valor: String(resumen.sintomas.length), color: TINTA },
    {
      etiqueta: 'APOYO DE INTERPRETACIÓN',
      valor: resumen.pidioInterprete ? 'Solicitado' : 'No solicitado',
      color: resumen.pidioInterprete ? MARCA : TINTA,
    },
  ]
  const ancho = (ANCHO_UTIL - 6) / 3
  celdas.forEach((c, i) => {
    const x = MARGEN + i * (ancho + 3)
    doc.setFillColor(...FONDO).roundedRect(x, e.y, ancho, 16, 2, 2, 'F')
    doc
      .setFont('helvetica', 'bold')
      .setFontSize(7)
      .setTextColor(...GRIS)
    doc.text(c.etiqueta, x + 4, e.y + 5.5)
    doc.setFontSize(11).setTextColor(...c.color)
    doc.text(c.valor, x + 4, e.y + 12)
  })
  e.y += 22
}

function anexoOriginales(e: Escritor, resumen: Resumen) {
  const { doc } = e
  e.titulo('Anexo · Respuestas originales')
  const columnas = [
    { titulo: 'Hora', ancho: 16 },
    { titulo: 'Pregunta', ancho: 78 },
    { titulo: 'Respuesta', ancho: 48 },
    { titulo: 'Cómo', ancho: ANCHO_UTIL - 16 - 78 - 48 },
  ]
  const fila = (celdas: string[], negrita: boolean) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal').setFontSize(8.5)
    const partidas = celdas.map(
      (c, i) => doc.splitTextToSize(c, columnas[i]!.ancho - 2) as string[],
    )
    const alto = Math.max(...partidas.map((p) => p.length)) * 4 + 2
    e.asegurar(alto)
    let x = MARGEN
    partidas.forEach((lineas, i) => {
      doc.setTextColor(...(negrita ? GRIS : TINTA))
      doc.text(lineas, x, e.y + 3.5)
      x += columnas[i]!.ancho
    })
    e.y += alto
    doc
      .setDrawColor(225, 233, 230)
      .setLineWidth(0.2)
      .line(MARGEN, e.y - 0.8, ANCHO_PAGINA - MARGEN, e.y - 0.8)
  }
  fila(
    columnas.map((c) => c.titulo),
    true,
  )
  resumen.originales.forEach((o) =>
    fila([horaCorta(o.hora), o.pregunta, o.respuesta, o.origen], false),
  )
}

function pies(doc: JsPDF) {
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc
      .setFont('helvetica', 'normal')
      .setFontSize(7.5)
      .setTextColor(...GRIS)
    doc.text(
      'MARI · Prototipo de investigación · No constituye diagnóstico',
      MARGEN,
      ALTO_PAGINA - 8,
    )
    doc.text(`Página ${i} de ${total}`, ANCHO_PAGINA - MARGEN, ALTO_PAGINA - 8, { align: 'right' })
  }
}

/* ───────────────────────────── Escritura con saltos de página ───────────────────────────── */

class Escritor {
  y = MARGEN
  readonly doc: JsPDF
  constructor(doc: JsPDF) {
    this.doc = doc
  }

  /** Si no cabe `alto`, pasa a una página nueva. */
  asegurar(alto: number) {
    if (this.y + alto > ALTO_PAGINA - MARGEN - PIE) {
      this.doc.addPage()
      this.y = MARGEN
    }
  }

  espacio(mm: number) {
    this.y += mm
  }

  titulo(texto: string) {
    this.asegurar(14)
    this.y += 3
    this.doc
      .setFont('helvetica', 'bold')
      .setFontSize(11.5)
      .setTextColor(...MARCA)
    this.doc.text(texto, MARGEN, this.y)
    this.y += 6
  }

  parrafo(texto: string, estilo: { negrita?: boolean; cursiva?: boolean; color?: Rgb } = {}) {
    const tipo = estilo.negrita ? 'bold' : estilo.cursiva ? 'italic' : 'normal'
    this.doc
      .setFont('helvetica', tipo)
      .setFontSize(10.5)
      .setTextColor(...(estilo.color ?? TINTA))
    const lineas = this.doc.splitTextToSize(texto, ANCHO_UTIL) as string[]
    this.asegurar(lineas.length * 5)
    this.doc.text(lineas, MARGEN, this.y)
    this.y += lineas.length * 5 + 1
  }

  /** "Etiqueta      valor", con el valor en cursiva gris si no se especificó. */
  dato(etiqueta: string, valor: string, faltante: boolean) {
    const sangria = MARGEN + 4
    const columnaValor = sangria + 48
    this.doc.setFontSize(10)
    const lineas = this.doc.splitTextToSize(valor, ANCHO_PAGINA - MARGEN - columnaValor) as string[]
    this.asegurar(lineas.length * 5)
    this.doc.setFont('helvetica', 'normal').setTextColor(...GRIS)
    this.doc.text(etiqueta, sangria, this.y)
    this.doc
      .setFont('helvetica', faltante ? 'italic' : 'normal')
      .setTextColor(...(faltante ? GRIS : TINTA))
    this.doc.text(lineas, columnaValor, this.y)
    this.y += lineas.length * 5
  }

  vineta(texto: string) {
    this.doc
      .setFont('helvetica', 'normal')
      .setFontSize(10)
      .setTextColor(...TINTA)
    const lineas = this.doc.splitTextToSize(texto, ANCHO_UTIL - 10) as string[]
    this.asegurar(lineas.length * 5)
    this.doc.text('•', MARGEN + 4, this.y)
    this.doc.text(lineas, MARGEN + 9, this.y)
    this.y += lineas.length * 5
  }

  cierre(texto: string) {
    this.asegurar(16)
    this.y += 4
    this.doc.setFillColor(...FONDO).roundedRect(MARGEN, this.y, ANCHO_UTIL, 10, 2, 2, 'F')
    this.doc
      .setFont('helvetica', 'bold')
      .setFontSize(9.5)
      .setTextColor(...TINTA)
    this.doc.text(texto, ANCHO_PAGINA / 2, this.y + 6.3, { align: 'center' })
    this.y += 14
  }
}

/**
 * Logo de MARI para el encabezado, leído del propio sitio (permitido por la CSP: mismo origen).
 * Si no se puede cargar, el PDF sale igual, sin logo.
 */
export async function cargarLogo(): Promise<OpcionesPdf['logo']> {
  try {
    const respuesta = await fetch(`${import.meta.env.BASE_URL}brand/mari-logo.png`)
    if (!respuesta.ok) return undefined
    const bytes = await respuesta.arrayBuffer()
    const dataUrl = await new Promise<string>((listo, falla) => {
      const lector = new FileReader()
      lector.onload = () => listo(String(lector.result))
      lector.onerror = falla
      lector.readAsDataURL(new Blob([bytes], { type: 'image/png' }))
    })
    const imagen = new Image()
    imagen.src = dataUrl
    await imagen.decode()
    return { dataUrl, proporcion: imagen.naturalWidth / imagen.naturalHeight }
  } catch {
    return undefined
  }
}
