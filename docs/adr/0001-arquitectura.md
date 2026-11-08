# ADR 0001 · Arquitectura de MARI v2

- **Estado:** aceptada
- **Fecha:** 2026-11-08

## Contexto

MARI ayuda a personas adultas sordas usuarias de Lengua de Señas Peruana (LSP) a comunicar
sus síntomas al inicio de una consulta ambulatoria no urgente. La app no diagnostica, no hace
triaje, no traduce LSP libre y no reemplaza intérpretes.

La especificación exige además:

- Las preguntas y la lógica del flujo están en datos (JSON), no en el código de la interfaz.
- Nada se guarda ni se envía sin la confirmación de la persona.
- Los videos y las preguntas del profesional no salen del dispositivo.
- Al terminar la sesión se borran las respuestas y las grabaciones.
- El reconocimiento de señas corre en el navegador.

Los datos de salud son **datos sensibles** según la Ley 29733 de Protección de Datos
Personales (Perú).

## Decisión

### 1. Un solo dispositivo, sin backend ni base de datos (MVP)

La tablet pasa de mano: el paciente responde, la entrega al profesional, y este puede
devolverla para una repregunta. Toda la información clínica vive **solo en la memoria del
navegador** y se borra al terminar la sesión o al cerrar la pestaña.

Es privacidad desde el diseño: un dato que nunca sale del dispositivo no puede filtrarse
desde un servidor.

### 2. Arquitectura hexagonal (por capas)

```
ui ──▶ application ──▶ domain
            ▲
     infrastructure (implementa los puertos)
```

| Capa             | Contenido                                                  | Puede depender de              |
| ---------------- | ---------------------------------------------------------- | ------------------------------ |
| `domain`         | Banco de preguntas, motor del flujo, plantilla del resumen | Nada (TypeScript puro)         |
| `application`    | Casos de uso, estado de la sesión, puertos (interfaces)    | `domain`                       |
| `infrastructure` | MediaPipe, TF.js, Transformers.js, MediaRecorder, JSON     | `application`, `domain`        |
| `ui`             | Páginas y componentes React                                | `application`, `domain`        |

El dominio no conoce React, ni el navegador, ni los modelos de IA. Por eso se prueba con
tests unitarios rápidos, y cualquier tecnología externa se puede cambiar sin tocar la lógica
clínica.

### 3. Tecnologías

| Área                 | Elección                                      |
| -------------------- | --------------------------------------------- |
| Base                 | Vite + React 19 + TypeScript estricto         |
| Rutas                | React Router                                  |
| Validación del banco | Zod                                           |
| Motor del flujo      | Máquina de estados propia (intérprete del JSON) |
| Estado de sesión     | Zustand, sin persistencia                     |
| Estilos              | Tailwind CSS v4 (+ shadcn/ui cuando haga falta) |
| Señas                | MediaPipe Tasks Vision + TensorFlow.js en Web Worker |
| Repreguntas          | Transformers.js en Web Worker, modelo local   |
| PWA                  | vite-plugin-pwa                               |
| Calidad              | Vitest, Testing Library, Playwright + axe, oxlint, Prettier |
| Entrenamiento        | Python (Keras → TF.js) en `ml/`               |

**Mismo extractor en entrenamiento y en la web:** los datos de entrenamiento se graban con la
ruta `/recolector` de la propia app, que exporta puntos ya normalizados. Python solo entrena.

## Consecuencias

**A favor**

- Cumple los requisitos de privacidad sin infraestructura adicional.
- Sin servidor que mantener ni costos de nube; funciona sin internet (PWA).
- La lógica clínica tiene tests y es independiente de la interfaz.

**En contra / pendiente para producción**

Un despliegue real en un establecimiento de salud necesitaría un backend para:

- Dispositivos separados para paciente y profesional.
- Integrar el resumen con la historia clínica electrónica.
- Autenticar profesionales y registrar accesos (auditoría).
- Actualizar el banco, los videos LSP y los modelos sin volver a publicar la app.

Se separaría **dato del paciente** (local, efímero) de **contenido** (banco, videos, modelos:
sin datos personales, servible desde un backend o CDN). Cada integración se agrega como un
adaptador detrás de un puerto, sin cambiar el dominio ni la interfaz.

Mejora posible sin servidor: transferir el resumen por código QR de la tablet a la PC del
profesional.
