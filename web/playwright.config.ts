/**
 * Pruebas de punta a punta (Q2): la app real en un navegador real.
 *
 * Usa Microsoft Edge instalado en el equipo (canal "msedge"), así no hay que descargar
 * navegadores. Levanta su propio servidor de Vite en un puerto aparte.
 *
 *   npm run e2e            → corre todo (tablet y móvil)
 *   npm run e2e -- --ui    → modo visual para depurar
 */
import { defineConfig, devices } from '@playwright/test'

const PUERTO = 5197

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    channel: 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'tablet',
      use: { ...devices['Desktop Edge'], viewport: { width: 1024, height: 768 }, hasTouch: true },
    },
    {
      name: 'movil',
      use: { ...devices['Desktop Edge'], viewport: { width: 390, height: 844 }, hasTouch: true },
    },
  ],
  webServer: {
    command: `npx vite --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
