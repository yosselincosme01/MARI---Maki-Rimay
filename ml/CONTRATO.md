# Contrato del modelo de señas · versión de entrada `v1`

Ficha técnica de los datos con los que se entrena el modelo y que recibe en la app (plan §5.3).
Quien entrene en Python debe poder leer las muestras **sin mirar el código de la web**.

> **Regla de oro:** el mismo extractor y la misma normalización en el entrenamiento y en la app.
> Por eso Python **no extrae puntos**: solo lee los JSON que produce MARI. Cualquier cambio en
> esta ficha crea una versión nueva (`v2`) y se avisa a la otra programadora.

## 1. Extractor

| Elemento | Valor                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Librería | `@mediapipe/tasks-vision` **1.1.1** (versión exacta en `web/package.json`)                                    |
| Manos    | `hand_landmarker.task` float16/1 · SHA-256 `fbc2a300…7cde1` · `numHands: 2` · modo `VIDEO`                    |
| Pose     | `pose_landmarker_lite.task` float16/1 · SHA-256 `59929e1d…0d574a` · `numPoses: 1` · modo `VIDEO`              |
| Delegado | GPU; si no hay, CPU. Se guarda en cada muestra (`captura.delegado`)                                           |
| Cara     | **No se usa en v1.** Si la validación LSP (M1) indica que SÍ/NO usan la cabeza o el rostro, se agrega en `v2` |
| Código   | `web/src/infrastructure/senas/extractor.ts`                                                                   |

Las huellas completas están en `web/scripts/preparar-mediapipe.mjs`.

**Manos:** la etiqueta de MediaPipe ("Right"/"Left") coincide con la mano real de la persona,
porque la cámara entrega la imagen sin espejar (verificado con cámara real el 2026-11-08).

**Pose:** si alguno de los dos hombros tiene `visibility < 0.5`, el fotograma no tiene pose y se
descarta.

## 2. Normalización de un fotograma

Código: `web/src/domain/senas/normalizar.ts` (con tests).

1. Se corrige el aspecto: `x' = x · (ancho / alto)`; `y` no cambia.
2. **Origen:** el punto medio entre los hombros (pose 11 y 12).
3. **Escala:** la distancia entre los hombros, en coordenadas corregidas. Si es menor que
   `0.001`, el fotograma se descarta.
4. Cada punto queda como `((x' − origen_x) / escala, (y − origen_y) / escala)`. En las manos se
   agrega `z / escala`.
5. **Mano ausente** (o con un número de puntos distinto de 21): 63 ceros y su indicador en `0`.

Resultado: los hombros quedan siempre en `(0.5, 0)` y `(−0.5, 0)`, sin importar la posición ni
la distancia a la cámara.

## 3. Vector de un fotograma: `F = 142`

| Índices     | Contenido                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0 – 62`    | Mano **derecha**: 21 puntos × (x, y, z), en el orden de MediaPipe Hands                                                                                   |
| `63 – 125`  | Mano **izquierda**: 21 puntos × (x, y, z)                                                                                                                 |
| `126`       | `1` si se detectó la mano derecha, si no `0`                                                                                                              |
| `127`       | `1` si se detectó la mano izquierda, si no `0`                                                                                                            |
| `128 – 141` | Pose: 7 puntos × (x, y), en este orden: nariz (0), hombro izq. (11), hombro der. (12), codo izq. (13), codo der. (14), muñeca izq. (15), muñeca der. (16) |

## 4. Muestra: `30 × 142`

- Se graba una repetición (1,5 a 3 s) y se normaliza cada fotograma.
- Se descarta si menos del **50 %** de los fotogramas tiene pose, o si quedan menos de **15**
  fotogramas válidos.
- Se **remuestrea a 30 fotogramas** repartidos de forma pareja en el tiempo, tomando el
  fotograma más cercano (sin promediar).
- Los valores se guardan redondeados a **5 decimales**.

**Entrada del modelo:** tensor `float32` de forma `[1, 30, 142]`.

## 5. Archivos de muestra

Ubicación: `ml/data/landmarks/` (**no se sube al repositorio**). Nombre:
`CLASE_P03_rep012.json`.

```jsonc
{
  "formato": "mari-muestra",
  "versionEntrada": "v1", // si no es "v1", el script de entrenamiento debe rechazarla
  "clase": "DOLOR",
  "senante": "P03", // código, nunca el nombre
  "repeticion": 12,
  "fecha": "2026-11-08", // solo el día
  "dimension": 142,
  "fotogramas": [[/* 142 números */] /* × 30 */],
  "captura": {
    "duracionMs": 2000,
    "fotogramasValidos": 52,
    "fotogramasTotales": 58,
    "delegado": "GPU",
  },
}
```

Nunca contiene video ni datos personales.

## 6. Clases y salida

Orden fijo de `labels.json` y de la salida softmax:

```json
["DOLOR", "TOS", "FIEBRE", "FALTA_DE_AIRE", "SI", "NO", "OTRA"]
```

**OTRA** incluye el reposo (manos abajo), las transiciones y señas fuera del vocabulario. No es
solo reposo.

**Decisión en la app:** `decidirSena()` (plan §5.3) propone una clase si su confianza es ≥ 0,70
en 3 inferencias seguidas. Nunca confirma: la persona confirma con ✓.

## 7. Evaluación y exportación (M5, M6)

- **Separación por persona:** las personas de prueba no aparecen en el entrenamiento. Se divide
  por el campo `senante`, nunca por archivo.
- Se reporta en `ml/reports/`: exactitud por clase, matriz de confusión y umbral elegido. No se
  declara ninguna exactitud sin ese reporte.
- Exportación a TF.js en `web/public/models/senas/v1/` con `model.json`, los pesos y
  `labels.json`.
- Verificación: para las mismas muestras de prueba, Python y el navegador dan la misma clase.

## 8. Cuándo se crea `v2`

Cualquier cambio en: la versión de MediaPipe o sus modelos, los puntos usados (por ejemplo,
agregar la cara), la normalización, `F`, los 30 fotogramas, o las clases y su orden. Las
muestras `v1` no se mezclan con las `v2`.
