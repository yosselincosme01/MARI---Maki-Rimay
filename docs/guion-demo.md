# Guion de la demo de MARI (video de 2 a 3 minutos)

Para grabar el recorrido que se usará en la presentación. Todo con datos inventados.

## Antes de grabar

1. En `web/`, arranca la app:

   ```bash
   npm run dev
   ```

   Abre la dirección que muestra la terminal (por ejemplo `http://localhost:5173`). Comprueba que
   la pestaña diga **"MARI · Salud que te escucha"**.

2. Prepara la ventana en tamaño tablet: en Edge o Chrome, F12 → ícono de dispositivo
   (Ctrl + Shift + M) → 1024 × 768. Oculta las herramientas de desarrollo antes de grabar, o usa
   la tablet real.
3. Para grabar en Windows: **Win + Alt + R** (Xbox Game Bar) o la Herramienta Recortes
   (Win + Shift + S → Grabar). Graba solo la ventana del navegador.
4. Recarga la página antes de empezar: así la consulta arranca vacía.

## Recorrido

| #   | Pantalla                | Qué hacer                                                                                                                       | Qué destacar (en la narración o en un texto en pantalla)               |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | Landing (`/`)           | Baja un poco y vuelve arriba                                                                                                    | El problema: sin intérprete, la consulta empieza a ciegas              |
| 2   | Landing                 | **Probar demo**                                                                                                                 | —                                                                      |
| 3   | Nueva consulta          | **Iniciar consulta**                                                                                                            | Sin login ni datos personales                                          |
| 4   | ¿Qué quieres preguntar? | Toca **¿Qué sientes?** → **Enviar pregunta a la persona**                                                                       | El profesional pregunta con videos LSP validados; MARI no genera señas |
| 5   | Entregue el dispositivo | **Ya tengo el dispositivo**                                                                                                     | El dispositivo pasa de mano                                            |
| 6   | ¿Qué sientes?           | Deja ver unos segundos el video; toca **Dolor**                                                                                 | Pregunta en LSP y respuestas con pictogramas, para quien no lee        |
| 7   | ¿Es correcto?           | **Sí, es correcto**                                                                                                             | Nada se guarda sin la confirmación ✓ de la persona                     |
| 8   | Entregue al profesional | **Soy el profesional**                                                                                                          | —                                                                      |
| 9   | Resumen en vivo         | Muestra el resumen                                                                                                              | Se arma solo con lo confirmado; lo que falta aparece resaltado         |
| 10  | ¿Qué quieres preguntar? | Escribe **"¿dónde le duele y desde cuándo?"** → **Agregar**; toca **¿Qué tan fuerte es?** → **Enviar 3 preguntas a la persona** | El profesional escribe con sus palabras y MARI encuentra los videos    |
| 11  | ¿Dónde te duele?        | Gira el cuerpo, toca el **pecho** (aparece el punto naranja) → **Revisar respuesta** → **Sí, es correcto**                      | Cuerpo 3D; también hay una lista con siluetas                          |
| 12  | ¿Desde cuándo?          | **Ayer** → **Sí, es correcto**                                                                                                  | Los días marcados se entienden sin leer                                |
| 13  | ¿Qué tan fuerte es?     | **Fuerte** → **Sí, es correcto**                                                                                                | Intensidad con barras, no solo con color                               |
| 14  | Resumen final           | **Soy el profesional**, muestra el resumen y **Descargar PDF**                                                                  | Informe para la historia clínica; no constituye diagnóstico            |
| 15  | Terminar                | **Terminar consulta** → **Sí, terminar y borrar**                                                                               | Todo se borra: nada queda en el dispositivo ni en un servidor          |

## Mensajes clave para cerrar

- Apoya la consulta, **no la reemplaza**: no diagnostica, no hace triaje, no traduce LSP libre.
- **Privacidad desde el diseño**: todo ocurre en el dispositivo y se borra al terminar.
- **Accesible para quien no lee**: video LSP, pictogramas, siluetas, días y barras.
- Probado: 229 pruebas unitarias y 16 de punta a punta (tablet y móvil, con revisión de
  accesibilidad).

## Capturas para las diapositivas

En `web/`:

```bash
CAPTURAS=1 npx playwright test capturas
```

Guarda 14 capturas de este mismo recorrido en `web/capturas/tablet/` y `web/capturas/movil/`.
