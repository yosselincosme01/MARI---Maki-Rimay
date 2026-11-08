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
- `public/models/human-body.glb`: cuerpo 3D, CC0. Ver `ATTRIBUTION.md`.
- `public/brand/`: logo de MARI.
