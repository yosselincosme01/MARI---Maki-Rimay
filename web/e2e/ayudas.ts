/** Pasos comunes de las pruebas de punta a punta, escritos como los haría una persona. */
import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** El profesional abre MARI e inicia una consulta nueva. */
export async function iniciarConsulta(page: Page) {
  await page.goto('/app')
  await expect(page).toHaveURL(/\/profesional$/)
  await page.getByRole('button', { name: 'Iniciar consulta' }).click()
  await expect(page.getByRole('heading', { name: '¿Qué quieres preguntar?' })).toBeVisible()
}

/** El profesional elige preguntas del catálogo y las envía. Queda en la vista paciente. */
export async function enviarPreguntas(page: Page, preguntas: string[]) {
  for (const texto of preguntas) {
    await page.getByRole('button', { name: texto, exact: true }).click()
  }
  await page.getByRole('button', { name: /^Enviar (pregunta|\d+ preguntas) a la persona$/ }).click()
  await expect(page).toHaveURL(/\/paciente$/)
  await expect(
    page.getByRole('heading', { name: 'Entregue el dispositivo a la persona' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Ya tengo el dispositivo' }).click()
}

/** La persona toca una opción y la confirma con ✓. */
export async function responder(page: Page, opcion: string) {
  await page.getByRole('button', { name: opcion, exact: true }).click()
  await page.getByRole('button', { name: 'Sí, es correcto' }).click()
}

/** P2: la persona elige la zona en la lista, revisa y confirma. */
export async function responderZona(page: Page, zona: string) {
  await page
    .getByRole('group', { name: 'Zonas del cuerpo' })
    .getByRole('button', { name: zona })
    .click()
  await page.getByRole('button', { name: /Revisar respuesta/ }).click()
  await page.getByRole('button', { name: 'Sí, es correcto' }).click()
}

/** La persona terminó la fila: devuelve el dispositivo al profesional. */
export async function devolverAlProfesional(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Entregue el dispositivo al profesional' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Soy el profesional' }).click()
  await expect(page).toHaveURL(/\/profesional$/)
}

/**
 * Revisión automática de accesibilidad con axe (WCAG 2.1 A y AA).
 * Falla con problemas "critical" o "serious"; los menores quedan en el reporte.
 */
export async function revisarAccesibilidad(page: Page, pantalla: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const graves = violations
    .filter((v) => v.impact === 'critical' || v.impact === 'serious')
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    )
  expect(graves, `Accesibilidad en "${pantalla}"`).toEqual([])
}

/** No debe haber desplazamiento horizontal (PAC3, Q3). */
export async function sinScrollHorizontal(page: Page, pantalla: string) {
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(desborde, `Scroll horizontal en "${pantalla}"`).toBeLessThanOrEqual(0)
}

/** Junta los errores de consola de la página para revisarlos al final (Q2). */
export function vigilarConsola(page: Page): string[] {
  const errores: string[] = []
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()))
  page.on('pageerror', (e) => errores.push(e.message))
  return errores
}
