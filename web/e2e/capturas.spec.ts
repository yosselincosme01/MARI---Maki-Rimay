/**
 * Capturas de pantalla de una consulta completa, para revisar el diseño y para la presentación.
 * No es una prueba: solo corre con CAPTURAS=1.
 *
 *   CAPTURAS=1 npx playwright test capturas --project=tablet
 *
 * Las imágenes quedan en web/capturas/ (no se suben al repositorio).
 */
import { test } from '@playwright/test'
import { devolverAlProfesional, enviarPreguntas, iniciarConsulta } from './ayudas'

test.skip(!process.env.CAPTURAS, 'Solo con CAPTURAS=1')

test('capturas de una consulta', async ({ page }, info) => {
  const carpeta = `capturas/${info.project.name}`
  let n = 0
  const foto = async (nombre: string, completa = false) => {
    await page.waitForTimeout(700) // videos, fuentes y el cuerpo 3D terminan de dibujarse
    n++
    await page.screenshot({
      path: `${carpeta}/${String(n).padStart(2, '0')}-${nombre}.png`,
      fullPage: completa,
    })
  }

  await page.goto('/')
  await foto('landing')

  await page.goto('/app')
  await foto('nueva-consulta')
  await iniciarConsulta(page)
  await page.getByRole('button', { name: '¿Qué sientes?', exact: true }).click()
  await foto('preguntar-fila')

  await page.getByRole('button', { name: 'Enviar pregunta a la persona' }).click()
  await foto('entregar-dispositivo')
  await page.getByRole('button', { name: 'Ya tengo el dispositivo' }).click()
  await foto('p1-que-sientes')
  await page.getByRole('button', { name: 'Dolor', exact: true }).click()
  await foto('p1-confirmacion')
  await page.getByRole('button', { name: 'Sí, es correcto' }).click()
  await foto('devolver-dispositivo')
  await devolverAlProfesional(page)
  await foto('profesional-resumen-1', true)

  await enviarPreguntas(page, ['¿Dónde te duele?', '¿Desde cuándo?', '¿Qué tan fuerte es?'])
  await page.waitForTimeout(2500) // carga del modelo 3D
  await foto('p2-cuerpo-3d', true)
  const zonas = page.getByRole('group', { name: 'Zonas del cuerpo' })
  await zonas.getByRole('button', { name: 'Pecho' }).click()
  await foto('p2-zona-elegida', true)
  await page.getByRole('button', { name: /Revisar respuesta/ }).click()
  await foto('p2-confirmacion')
  await page.getByRole('button', { name: 'Sí, es correcto' }).click()
  await foto('p3-desde-cuando')
  await page.getByRole('button', { name: 'Ayer', exact: true }).click()
  await page.getByRole('button', { name: 'Sí, es correcto' }).click()
  await foto('p4-intensidad')
  await page.getByRole('button', { name: 'Fuerte', exact: true }).click()
  await page.getByRole('button', { name: 'Sí, es correcto' }).click()
  await devolverAlProfesional(page)
  await foto('profesional-resumen-final', true)
})
