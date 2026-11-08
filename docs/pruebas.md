# Pruebas de MARI · matriz de validación

Estado de las pruebas comunes (§9 del [plan de trabajo](plan-de-trabajo.md)) y de la matriz de
validación conjunta. Actualizado el 8 de noviembre de 2026.

## Cómo correrlas

Desde `web/`:

| Comando               | Qué prueba                                                              | Tiempo |
| --------------------- | ----------------------------------------------------------------------- | ------ |
| `npm run check`       | Tipos, oxlint, Prettier y pruebas unitarias e integración (Vitest)      | ~10 s  |
| `npm run build`       | Compilación de producción                                               | ~2 s   |
| `npm run e2e`         | Punta a punta en Microsoft Edge, en tablet (1024×768) y móvil (390×844) | ~1 min |
| `npm run e2e -- --ui` | Lo mismo, en modo visual para depurar                                   | —      |

Las pruebas de punta a punta (`web/e2e/`) usan el Edge instalado en Windows: no descargan
navegadores. Levantan su propio servidor en el puerto 5197. El reporte queda en
`web/playwright-report/` (no se sube al repositorio).

**Capturas para la presentación:** `CAPTURAS=1 npx playwright test capturas` guarda 14 capturas
de una consulta completa en `web/capturas/tablet/` y `web/capturas/movil/`.

## Pruebas comunes

| ID  | Criterio                                                                               | Estado                   | Cómo se comprueba                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | `npm ci`, `dev`, `check` y `build` sin errores                                         | ✅ Cumple                | 229 pruebas de Vitest y compilación en verde                                                                                                                                                      |
| Q2  | Playwright + axe recorren el flujo sin errores críticos de accesibilidad ni de consola | ✅ Cumple                | 16 pruebas de punta a punta; axe (WCAG 2.1 A/AA) sin problemas _critical_ ni _serious_; sin errores de consola                                                                                    |
| Q3  | Teclado, foco visible, contraste y zoom 200 %; tablet, móvil y computadora             | ✅ Cumple (automatizado) | Respuesta solo con teclado; contraste revisado por axe; zoom 200 % (512×384) sin scroll horizontal; tablet y móvil sin scroll horizontal. **Falta**: revisión manual en la tablet real de la demo |
| Q4  | Solo datos sintéticos                                                                  | ✅ Cumple                | Ninguna prueba usa datos de personas                                                                                                                                                              |
| Q5  | Cada fallo repetible agrega una prueba de regresión                                    | ✅ En curso              | Ej.: contraste del resumen, desborde en móvil, `destroy is not a function`                                                                                                                        |

### Problemas que encontraron las pruebas (y se corrigieron)

| Problema                                                           | Dónde                   | Corrección                                                                |
| ------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------- |
| Contraste insuficiente (AA) en textos grises y verdes del resumen  | Resumen del profesional | Texto secundario `tinta-suave` y verde `marca-oscuro` sobre fondos claros |
| Contraste del botón "Borrar selección" sobre el fondo de la página | P2, cuerpo              | Botones fantasma en `marca-oscuro`                                        |
| La pantalla se desbordaba 106 px en móvil                          | Vista profesional       | La grilla define `grid-cols-1` en pantallas chicas                        |
| La pantalla se desbordaba en móvil por el lienzo 3D                | P2, cuerpo              | Grilla `grid-cols-1` y lienzo con ancho `100%`                            |
| Aviso "ResizeObserver loop"                                        | Cuerpo 3D               | El lienzo solo se redimensiona cuando cambia el ancho                     |
| Indicadores del resumen cortados ("No especificad…")               | Resumen                 | Columnas automáticas con ancho mínimo y texto que puede partirse          |

## Matriz de validación conjunta

✅ automatizado · 🟡 parcial · ⬜ pendiente (depende de algo externo)

| Recorrido                          | Resultado esperado                                | Estado | Prueba                                                                                                     |
| ---------------------------------- | ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Inicio y entrega del dispositivo   | Consulta vacía, sin identificación                | ✅     | e2e "inicio" (sin campos de datos personales)                                                              |
| P0 alerta en SÍ                    | Aviso, flujo detenido, resumen solo con la alerta | 🟡     | Unitarias del motor y de la vista profesional. P0 no está en el banco: falta su video                      |
| Dos síntomas                       | Cada síntoma con sus datos, sin mezclarse         | 🟡     | Unitarias del motor (P6, ciclos) y de la consulta en modo conversación. Sin P6 en el banco: falta su video |
| Respuesta por seña                 | Seña propuesta → ✓ guarda / ✗ repite              | 🟡     | Unitarias de `CamaraSenas` (modo presentación). Falta el modelo entrenado (M5)                             |
| Seña con baja confianza            | Pasa a opciones táctiles                          | 🟡     | Unitarias de `decidirSena()`. Falta el modelo entrenado                                                    |
| Cuerpo 3D y respaldo               | Zona correcta en el resumen                       | ✅     | e2e (lista de zonas, revisar antes de enviar) + unitarias de zonas con la malla real del modelo            |
| Pregunta escrita                   | Sugerencia, elección, respuesta en el resumen     | ✅     | e2e "pregunta escrita" + unitarias de la búsqueda                                                          |
| Pregunta sin coincidencia          | Orienta a interpretación                          | ✅     | e2e "sin video orienta a interpretación"                                                                   |
| Mensaje libre                      | Señas confirmadas + aviso para intérprete         | ⬜     | Módulo LIB aún no implementado                                                                             |
| Resumen y terminar                 | Secciones completas; todo se borra                | ✅     | e2e "recorrido completo"                                                                                   |
| Recargar a mitad                   | Consulta perdida, nueva consulta vacía            | ✅     | e2e (además, nada en `localStorage` ni `sessionStorage`)                                                   |
| Modo demo                          | Videos no validados visibles con su etiqueta      | ✅     | Unitarias de la vista paciente                                                                             |
| Sin internet tras la primera carga | Todo funciona                                     | ⬜     | Módulo PWA aún no implementado                                                                             |

## Pendientes para pasar a `main` (R1–R4)

- Revisión manual en la **tablet real** de la demo (Q3).
- Videos de **P0** (alerta), P5, P6, P8, P10 y P11.
- **Modelo de señas** entrenado y evaluado (M5) para los recorridos de señas.
- **Mensaje libre** (LIB) y **PWA**.
