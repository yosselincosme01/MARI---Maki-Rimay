# MARI · web

App web (PWA) de MARI. Arquitectura y decisiones en [`../docs/adr`](../docs/adr).

## Comandos

| Comando          | Qué hace                                           |
| ---------------- | -------------------------------------------------- |
| `npm run dev`    | Servidor de desarrollo                             |
| `npm run build`  | Compila para producción en `dist/`                 |
| `npm test`       | Tests en modo observador                           |
| `npm run check`  | Tipos + linter + formato + tests (antes de commit) |
| `npm run format` | Formatea el código con Prettier                    |

## Estructura

```
src/
├─ domain/          lógica clínica pura: banco, flujo, resumen
├─ application/     casos de uso, estado de sesión, puertos
├─ infrastructure/  adaptadores: señas, búsqueda, grabación, JSON
├─ ui/              páginas, componentes, rutas
└─ data/            banco-preguntas.json
```

## Recursos

- `public/videos/preguntas/`: videos de preguntas en LSP (sin audio).
- `public/models/human-body.glb`: cuerpo 3D de P2. "Male base mesh" de Innerscene, adaptado de
  MakeHuman, licencia **CC0 1.0**. Procedencia en `public/models/ATTRIBUTION.md`.
- `public/brand/`: logo de MARI.

## Librerías de terceros destacadas

- [three.js](https://threejs.org) (licencia MIT): dibuja el cuerpo 3D de P2
  (`src/ui/components/Cuerpo3D/`). Se descarga solo al llegar a esa pregunta.
- Pictogramas de [ARASAAC](https://arasaac.org) (CC BY-NC-SA). Ver `public/pictogramas/ATTRIBUTION.md`.
