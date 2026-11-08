/**
 * Recorridos de la matriz de validación conjunta (§9 del plan), en la app real.
 * Se corren en tamaño tablet (1024×768) y móvil (390×844).
 */
import { expect, test } from '@playwright/test'
import {
  devolverAlProfesional,
  enviarPreguntas,
  iniciarConsulta,
  responder,
  responderZona,
  revisarAccesibilidad,
  sinScrollHorizontal,
  vigilarConsola,
} from './ayudas'

test.describe('Consulta de punta a punta', () => {
  test('inicio: /app lleva a la vista del profesional, sin pedir datos personales', async ({
    page,
  }) => {
    const errores = vigilarConsola(page)
    await page.goto('/app')
    await expect(page).toHaveURL(/\/profesional$/)
    await expect(page.getByRole('heading', { name: 'Nueva consulta' })).toBeVisible()
    // Sin nombre, DNI, edad ni contacto: no hay campos de texto para identificar a la persona.
    await expect(page.getByRole('textbox')).toHaveCount(0)
    await revisarAccesibilidad(page, 'Nueva consulta')
    await sinScrollHorizontal(page, 'Nueva consulta')
    expect(errores).toEqual([])
  })

  test('recorrido completo: preguntar, responder, resumen y terminar', async ({ page }) => {
    const errores = vigilarConsola(page)
    await iniciarConsulta(page)
    await revisarAccesibilidad(page, 'Preguntar')
    await sinScrollHorizontal(page, 'Preguntar')

    // 1.ª ronda: el síntoma.
    await enviarPreguntas(page, ['¿Qué sientes?'])
    await expect(page.getByRole('heading', { name: '¿Qué sientes?' })).toBeVisible()
    await revisarAccesibilidad(page, 'Pregunta del paciente')
    await sinScrollHorizontal(page, 'Pregunta del paciente')
    await page.getByRole('button', { name: 'Dolor', exact: true }).click()
    await revisarAccesibilidad(page, 'Confirmación')
    await page.getByRole('button', { name: 'Sí, es correcto' }).click()
    await devolverAlProfesional(page)

    // 2.ª ronda: detalles del síntoma, en fila.
    await enviarPreguntas(page, ['¿Dónde te duele?', '¿Desde cuándo?', '¿Qué tan fuerte es?'])
    await responderZona(page, 'Pecho')
    await responder(page, 'Hoy')
    await responder(page, 'Fuerte')
    await devolverAlProfesional(page)

    // El resumen junta lo confirmado, sin inventar.
    const resumen = page.getByRole('main')
    await expect(resumen).toContainText(/Dolor/)
    await expect(resumen).toContainText(/pecho/i)
    await expect(resumen).toContainText(/hoy/i)
    await expect(resumen).toContainText(/fuerte/i)
    await expect(resumen).toContainText(/No constituye diagnóstico/)
    await revisarAccesibilidad(page, 'Resumen')
    await sinScrollHorizontal(page, 'Resumen')

    // Terminar borra todo.
    await page.getByRole('button', { name: /Terminar consulta/ }).click()
    await page.getByRole('button', { name: /Sí, terminar y borrar/ }).click()
    await expect(page.getByRole('heading', { name: 'Nueva consulta' })).toBeVisible()
    await page.goto('/paciente')
    await expect(page.getByRole('heading', { name: 'No hay una consulta en curso' })).toBeVisible()
    expect(errores).toEqual([])
  })

  test('✗ descarta la respuesta y permite elegir otra', async ({ page }) => {
    await iniciarConsulta(page)
    await enviarPreguntas(page, ['¿Tienes alergias?'])
    await page.getByRole('button', { name: 'Sí', exact: true }).click()
    await page.getByRole('button', { name: 'No, cambiar' }).click()
    await expect(page.getByRole('heading', { name: '¿Tienes alergias?' })).toBeVisible()
    await responder(page, 'No')
    await devolverAlProfesional(page)
    await expect(page.getByRole('main')).toContainText(/Alergias/i)
  })

  test('pregunta escrita: con video se agrega; sin video orienta a interpretación', async ({
    page,
  }) => {
    await iniciarConsulta(page)
    const campo = page.getByRole('textbox', { name: 'Pregunta para la persona' })

    await campo.fill('¿Hace cuánto empezó?')
    await expect(page.getByText('Se agregará:')).toContainText('¿Desde cuándo?')
    await page.getByRole('button', { name: 'Agregar' }).click()
    await expect(page.getByRole('button', { name: 'Quitar ¿Desde cuándo?' })).toBeVisible()

    await campo.fill('¿La tos es con flema?')
    await expect(page.getByText(/No hay video LSP para/)).toContainText(
      /Solicita apoyo de interpretación/,
    )
    await expect(page.getByRole('button', { name: 'Agregar' })).toBeDisabled()
  })

  test('recargar a mitad pierde la consulta: nada queda guardado', async ({ page }) => {
    await iniciarConsulta(page)
    await enviarPreguntas(page, ['¿Qué sientes?'])
    await page.getByRole('button', { name: 'Tos', exact: true }).click()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'No hay una consulta en curso' })).toBeVisible()
    const guardado = await page.evaluate(() => localStorage.length + sessionStorage.length)
    expect(guardado).toBe(0)
  })

  test('P2 con el cuerpo: la lista de zonas tiene siluetas y nada se envía antes de revisar', async ({
    page,
  }) => {
    await iniciarConsulta(page)
    await enviarPreguntas(page, ['¿Dónde te duele?'])
    const zonas = page.getByRole('group', { name: 'Zonas del cuerpo' })
    await expect(zonas.getByRole('button')).toHaveCount(9)
    await expect(page.getByRole('button', { name: /Revisar respuesta/ })).toBeDisabled()
    await zonas.getByRole('button', { name: 'Espalda' }).click()
    await expect(zonas.getByRole('button', { name: 'Espalda' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await revisarAccesibilidad(page, 'Cuerpo y zonas')
    await sinScrollHorizontal(page, 'Cuerpo y zonas')
  })

  test('se puede responder solo con teclado', async ({ page }) => {
    await iniciarConsulta(page)
    await enviarPreguntas(page, ['¿Tienes alergias?'])
    const no = page.getByRole('button', { name: 'No', exact: true })
    await no.focus()
    await page.keyboard.press('Enter')
    const si = page.getByRole('button', { name: 'Sí, es correcto' })
    await si.focus()
    await expect(si).toBeFocused()
    await page.keyboard.press('Enter')
    await devolverAlProfesional(page)
  })
})

test.describe('Zoom al 200 % (Q3)', () => {
  test.use({ viewport: { width: 512, height: 384 } })

  test('las pantallas principales no se desbordan', async ({ page }) => {
    await iniciarConsulta(page)
    await sinScrollHorizontal(page, 'Preguntar al 200 %')
    await enviarPreguntas(page, ['¿Qué sientes?'])
    await sinScrollHorizontal(page, 'Pregunta del paciente al 200 %')
    await page.getByRole('button', { name: 'Dolor', exact: true }).click()
    await sinScrollHorizontal(page, 'Confirmación al 200 %')
  })
})
