# MARI · Maki Rimay — Plan de trabajo para dos programadoras

**The Cookies · Hackathon FACI 2026 · Versión 2.1 · 8 de noviembre de 2026**

Este documento reemplaza la versión 2.0 (PDF). Describe todos los módulos de MARI, quién los
construye, cómo se conectan y cómo se acepta cada entrega: desde que el profesional inicia la
consulta, la persona responde, el profesional escribe una repregunta, hasta que se genera el
resumen y se borra la consulta.

Se parte del primer PR: proyecto en `web/` y arquitectura del
[ADR 0001](adr/0001-arquitectura.md).

| Rol            | Persona          | Propiedad principal                                                                                                                                            |
| -------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Programadora A | Yosselin Cosme   | Experiencia de la persona paciente: banco y motor del flujo, vista paciente, confirmación, cuerpo 3D, regla de decisión de señas y repreguntas                 |
| Programadora B | Emmy Lopez Cueva | Experiencia del profesional y reconocimiento de señas: estado de la consulta, vista profesional, resumen, recolector, modelo, reconocedor, mensaje libre y PWA |
| Ambas          | —                | Contratos compartidos, integración, matriz de pruebas, contenido LSP y salida a `main`                                                                         |

> **Decisiones ya tomadas:** un solo dispositivo sin backend; datos clínicos solo en memoria;
> reconocimiento y búsqueda en el navegador; resumen con plantilla, sin IA generativa; sin
> login del profesional (se usa un botón **Modo profesional**, porque un login falso daría una
> falsa sensación de seguridad).

## Cambios respecto a la versión 2.0

| #   | Cambio                                                                                                              | Dónde     |
| --- | ------------------------------------------------------------------------------------------------------------------- | --------- |
| 1   | La rama de integración es `develop` (ya existe en GitHub) y las ramas de trabajo usan `feature/`                    | §8        |
| 2   | Las respuestas guardan `ciclo` y `sintoma`, para saber a qué síntoma pertenece cada P2–P5                           | §5.2      |
| 3   | Nuevo modo demo: sin él, ningún video LSP se vería ante el jurado                                                   | §5.5, DEM |
| 4   | La regla de decisión de señas es una función pura del dominio, compartida por SEN y LIB                             | §5.3, DEC |
| 5   | `detectarEnGrabacion` devuelve cuándo ocurre cada seña; el reconocedor informa el estado de la cámara               | §5.1      |
| 6   | Nuevo contrato de consulta, con las fases de entrega de la tablet y el caso P0 = SÍ                                 | §5.4      |
| 7   | P9 se activa con `mostrarSi` (configuración del profesional)                                                        | §5.2      |
| 8   | Reparto 19/19: CNS (consulta) y PWA pasan a B; BUS pasa a A; REC sube a la fase a                                   | §4, §6    |
| 9   | "Modo profesional" se activa manteniendo pulsado, para evitar entradas accidentales                                 | PRO3      |
| 10  | Se agregan calendario y mínimo presentable                                                                          | §6        |
| 11  | "Sesión" pasa a llamarse **consulta** (módulo CNS) para no confundirla con un inicio de sesión: MARI no tiene login | §5.4, CNS |

---

## 1. Alcance y límites

MARI es una web app (PWA) para que una persona adulta con discapacidad auditiva usuaria de
Lengua de Señas Peruana (LSP) cuente sus síntomas al inicio de una consulta externa no
urgente, cuando no hay un intérprete disponible. El profesional recibe un resumen solo con lo
que la persona confirmó.

- **No** diagnostica, **no** hace triaje, **no** traduce LSP libre y **no** reemplaza intérpretes.
- No registra pacientes: no pide nombre, DNI, edad, contacto ni fichas. No existe historial
  entre consultas.
- Respuestas, resumen y grabaciones viven **solo en memoria** y se borran al terminar la
  consulta, recargar o cerrar la pestaña. Nada se escribe en `localStorage`, `sessionStorage`,
  archivos, logs ni red.
- Ninguna respuesta pasa al profesional sin la confirmación ✓ de la persona.
- Copiar el resumen es una acción explícita; el portapapeles queda fuera de MARI y así se le
  informa al profesional.
- La única ruta que guarda datos es `/recolector`, para **señantes voluntarios** (no
  pacientes), con consentimiento, deshabilitada en la versión de demostración.

---

## 2. Recorrido completo, paso a paso

Una tablet que pasa de mano. Cada paso indica qué módulo lo resuelve y quién lo construye.

| #   | Qué ocurre                                                                                                                                                          | Quién usa   | Módulos            | Responsable                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------ | --------------------------- |
| 1   | El profesional mantiene pulsado **Modo profesional** → **Iniciar consulta** (y activa P9 si corresponde). Se crea una consulta vacía con un ID técnico temporal.    | Profesional | CNS, PRO           | B                           |
| 2   | Pantalla de entrega: "Entregue la tablet a la persona". Se abre la vista paciente.                                                                                  | Ambos       | PAC                | A                           |
| 3   | P-OPC (opcional): ¿quieres que tu acompañante esté presente?                                                                                                        | Paciente    | FLU, PAC           | A                           |
| 4   | P0 alerta. Si responde SÍ: "Avisa al personal ahora" y el flujo se detiene.                                                                                         | Paciente    | FLU, PAC           | A                           |
| 5   | Ciclo de síntomas P1–P6. Cada pregunta se muestra en video LSP y se puede repetir.                                                                                  | Paciente    | FLU, VID           | A                           |
| 6   | La persona responde con **seña** (cámara), **pictograma** o **cuerpo 3D** (P2).                                                                                     | Paciente    | SEN, DEC, OPC, CUE | B (SEN) · A (DEC, OPC, CUE) |
| 7   | Confirmación: MARI devuelve lo entendido (video de la seña + pictograma). ✓ guarda; ✗ repite o elige otra.                                                          | Paciente    | CON                | A                           |
| 8   | "Otra / no está aquí" abre el mensaje libre (máx. 1 min, con consentimiento). Se detectan señas conocidas y la persona las confirma.                                | Paciente    | LIB, SEN, CON      | B                           |
| 9   | Antecedentes P7–P10 y cierre P11 (¿algo más o necesitas intérprete?).                                                                                               | Paciente    | FLU, PAC           | A                           |
| 10  | Pantalla de devolución: "Entregue la tablet al profesional".                                                                                                        | Ambos       | PAC                | A                           |
| 11  | El profesional revisa las respuestas confirmadas; los datos faltantes aparecen resaltados.                                                                          | Profesional | PRO                | B                           |
| 12  | **Repregunta:** el profesional escribe una pregunta libre. MARI busca por significado los 3 videos validados más parecidos.                                         | Profesional | BUS                | A                           |
| 13  | El profesional elige uno y la tablet vuelve al paciente, que responde y confirma igual que en los pasos 6–7. Si nada se parece: "Solicite apoyo de interpretación". | Ambos       | BUS, PAC, CON      | A                           |
| 14  | **Resumen final** con plantilla: alerta, síntomas, antecedentes, repreguntas y mensaje libre.                                                                       | Profesional | RES, PRO           | B                           |
| 15  | **Terminar consulta** borra respuestas y grabaciones. Una nueva consulta empieza vacía.                                                                             | Profesional | CNS                | B                           |

---

## 3. Arquitectura y carpetas

Se sigue el ADR 0001 (arquitectura hexagonal). El dominio es TypeScript puro y no conoce
React, el navegador ni la IA; las tecnologías externas entran como adaptadores detrás de
puertos.

```
web/
  src/
    domain/              # TS puro, con tests
      banco/             # tipos y validación (Zod) del banco
      flujo/             # motor del flujo (máquina de estados)
      resumen/           # plantilla del resumen
      senas/             # regla de decisión decidirSena()
    application/
      consulta/          # store Zustand sin persistencia + casos de uso
      puertos/           # Reconocedor, Buscador, Grabador
    infrastructure/
      banco-json/        # carga y valida data/banco-preguntas.json
      senas/             # MediaPipe + TF.js en Web Worker
      busqueda/          # Transformers.js en Web Worker
      grabacion/         # MediaRecorder (mensaje libre, en memoria)
      simuladores/       # mocks de los tres puertos
    ui/
      pages/             # Landing, Paciente, Profesional, Recolector
      components/        # VideoLSP, Opciones, Confirmacion, Cuerpo3D…
    data/banco-preguntas.json
  public/
    videos/              # preguntas y señas de respuesta
    models/senas/v1/     # model.json, pesos, labels.json
    pictogramas/         # ARASAAC + ATTRIBUTION.md
ml/                      # Python: entrenamiento del GRU
  data/landmarks/        # JSON exportados por /recolector (no se suben)
  scripts/  reports/  requirements.txt  CONTRATO.md  VOCABULARIO.md
```

---

## 4. Catálogo de módulos y reparto

El esfuerzo usa puntos relativos (1 = pequeño, 3 = grande). Ambas columnas suman lo mismo; las
tareas de contenido (videos, señantes) son compartidas y no cuentan aquí.

### Programadora A · Yosselin

| ID      | Módulo                                                | Carpeta principal              | Fase | Pts    |
| ------- | ----------------------------------------------------- | ------------------------------ | ---- | ------ |
| BAN     | Banco de preguntas JSON + esquema Zod                 | `domain/banco`, `data/`        | a    | 2      |
| FLU     | Motor del flujo (P-OPC, P0–P11, ciclos y condiciones) | `domain/flujo`                 | a    | 3      |
| PAC+VID | Vista paciente, entregas de tablet y reproductor LSP  | `ui/pages/Paciente`            | a    | 3      |
| OPC     | Respuestas táctiles con pictogramas y escala          | `ui/components`                | a    | 1      |
| CON     | Confirmación ✓/✗ y corrección                         | `ui/components`, `application` | a    | 2      |
| DEM     | Modo demo para videos no validados                    | `ui/components`, config        | a    | 1      |
| CUE     | Cuerpo 3D (P2) con respaldo 2D/lista                  | `ui/components/Cuerpo3D`       | b    | 3      |
| DEC     | Regla de decisión de señas `decidirSena()`            | `domain/senas`                 | c    | 1      |
| BUS     | Repreguntas con búsqueda semántica                    | `infrastructure/busqueda`      | c    | 3      |
|         | **Total A**                                           |                                |      | **19** |

### Programadora B · Emmy

| ID  | Módulo                                                   | Carpeta principal          | Fase | Pts    |
| --- | -------------------------------------------------------- | -------------------------- | ---- | ------ |
| CNS | Estado de la consulta y casos de uso (sin persistencia)  | `application/consulta`     | a    | 2      |
| REC | Ruta `/recolector` para grabar señas de entrenamiento    | `ui/pages/Recolector`      | a    | 3      |
| PRO | Vista profesional: revisión y faltantes                  | `ui/pages/Profesional`     | a    | 2      |
| RES | Plantilla del resumen + pantalla de resumen              | `domain/resumen`, `ui`     | a    | 2      |
| ML  | Entrenamiento GRU, evaluación y exportación TF.js        | `ml/`                      | b    | 3      |
| SEN | Reconocedor en Web Worker + cámara + adaptador           | `infrastructure/senas`     | c    | 3      |
| LIB | Mensaje libre: grabación en memoria y ventana deslizante | `infrastructure/grabacion` | e    | 2      |
| PWA | Instalable y sin internet tras la primera carga          | config de Vite             | f    | 2      |
|     | **Total B**                                              |                            |      | **19** |

**Por qué este reparto:**

- **CNS va con B** porque la vista profesional y el resumen son sus principales consumidores,
  y `terminarConsulta` llama al Grabador de B. Se hace **primero en la fase a**; mientras tanto,
  A trabaja contra el contrato 5.4 con un store simulado.
- **REC sube a la fase a** porque grabar y validar señas es lo más lento del proyecto.
- **BUS va con A** porque no depende de nada y así B puede concentrarse en la cadena
  REC → ML → SEN → LIB, la más larga y arriesgada.
- **PWA va con B**, que conoce el peso de los modelos que hay que guardar sin internet.
- **DEC va con A**: es dominio puro con tests, y se entrega antes de que B empiece SEN.
- En la fase a, A tiene 12 puntos y B 9, pero B además coordina a los señantes y las sesiones
  de grabación, que no cuentan puntos.

Si alguna termina antes, toma PWA o BUS. El reparto se revisa al terminar la fase a.

---

## 5. Contratos compartidos

Se definen **juntas en la fase 0b**, antes de programar. Una sola persona edita cada contrato
y la otra lo revisa por PR. Cualquier cambio posterior se avisa antes de programarlo. Mientras
un adaptador real no exista, se usa su simulador en `infrastructure/simuladores/`, para que
ninguna espere a la otra.

### 5.0 Convenciones

| Tema              | Acuerdo                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------- |
| Idioma del código | Español para el dominio (`pregunta`, `respuesta`); inglés solo donde lo impone una librería |
| IDs de pregunta   | Estables, en mayúsculas: `P0`…`P11`, `P-OPC`, `R-FLEMA`                                     |
| Valores           | Mayúsculas con guion bajo: `DOLOR`, `NO_SE`, `UNA_SEMANA_O_MAS`                             |

### 5.1 Puertos (`application/puertos/`)

```ts
// application/puertos/tipos.ts
export type ClaseSena =
  "DOLOR" | "TOS" | "FIEBRE" | "FALTA_DE_AIRE" | "SI" | "NO" | "OTRA";

/** Una inferencia del modelo sobre una ventana de 30 fotogramas. */
export interface Inferencia {
  clase: ClaseSena;
  confianza: number; // 0..1, la más alta del softmax
  tiempoMs: number; // marca de tiempo de la ventana
}

/** Una seña ya decidida dentro de una grabación (mensaje libre). Nunca es OTRA. */
export interface Deteccion {
  clase: Exclude<ClaseSena, "OTRA">;
  inicioMs: number;
  finMs: number;
  confianza: number; // promedio de las inferencias que la sostienen
}

export type EstadoCamara =
  | "inactiva"
  | "esperando-permiso"
  | "denegada"
  | "sin-camara"
  | "ocupada"
  | "cargando-modelo"
  | "lista"
  | "error";
```

```ts
// application/puertos/reconocedor.ts — B implementa; A consume en la vista paciente
export interface Reconocedor {
  /** Pide la cámara (sin audio) y empieza a inferir. Solo al pulsar "Activar cámara". */
  iniciar(video: HTMLVideoElement): Promise<void>;
  /** Detiene la inferencia y apaga las pistas de la cámara. */
  detener(): void;
  alCambiarEstado(cb: (estado: EstadoCamara) => void): () => void;
  /** Inferencias crudas. Quien consume aplica decidirSena (5.3). */
  alInferir(cb: (inferencia: Inferencia) => void): () => void;
  /** Mensaje libre: recorre la grabación con ventana deslizante y aplica decidirSena. */
  detectarEnGrabacion(grabacion: Blob): Promise<Deteccion[]>;
}
```

```ts
// application/puertos/buscador.ts — A implementa
export interface Sugerencia {
  preguntaId: string; // siempre una pregunta del grupo "repregunta"
  similitud: number; // 0..1
}

export interface Buscador {
  /** Carga el modelo. Si falla, el adaptador cambia solo al respaldo por texto. */
  preparar(): Promise<void>;
  /** Máximo 3 sugerencias, ordenadas, ya filtradas por el umbral. Vacío = sin coincidencia. */
  buscar(
    texto: string,
  ): Promise<{ metodo: "semantico" | "texto"; sugerencias: Sugerencia[] }>;
}
```

```ts
// application/puertos/grabador.ts — B implementa
export interface Grabador {
  /** Graba sin audio hasta maxSeg. El Blob vive solo en memoria. */
  grabar(maxSeg: number, alProgreso?: (seg: number) => void): Promise<Blob>;
  cancelar(): void;
  /** Libera todos los Blob y URLs creadas. Lo llama terminarConsulta. */
  descartarTodo(): void;
}
```

> **Excepción al ADR 0001:** `HTMLVideoElement` y `Blob` son tipos del navegador dentro de
> `application/`. Se aceptan solo como tipos (no hay lógica del navegador en la capa) porque
> abstraerlos no aporta valor en este proyecto.

### 5.2 Banco de preguntas (`data/banco-preguntas.json`)

Las preguntas y la lógica viven en datos. El motor (FLU) interpreta este archivo; la interfaz
nunca codifica el orden.

```jsonc
{
  "version": 1,
  "preguntas": [
    {
      "id": "P1",
      "grupo": "flujo", // "flujo" | "repregunta"
      "texto": "¿Qué sientes?", // para el profesional y lectores de pantalla
      "video": "videos/preguntas/p1.mp4",
      "validado": false, // ver 5.5 Modo demo
      "tipo": "sena", // "sena" | "opciones" | "escala" | "cuerpo"
      "multiple": false,
      "opciones": [
        {
          "valor": "DOLOR",
          "etiqueta": "Dolor",
          "pictograma": "pictogramas/dolor.png",
          "videoRespuesta": "videos/respuestas/dolor.mp4",
        },
      ],
      "permiteOtra": true,
      "iniciaCiclo": true, // la respuesta define el síntoma del ciclo
      "siguiente": [{ "si": { "valor": "DOLOR" }, "ir": "P2" }, { "ir": "P3" }],
    },
    {
      "id": "P3",
      "grupo": "flujo",
      "texto": "¿Desde cuándo?",
      "tipo": "opciones",
      "porCiclo": true, // se guarda junto al síntoma del ciclo actual
      "opciones": [/* HOY, AYER, VARIOS_DIAS, UNA_SEMANA_O_MAS */],
      "siguiente": [{ "ir": "P4" }],
    },
    {
      "id": "P9",
      "mostrarSi": { "config": "preguntarEmbarazo" }, // lo activa el profesional al iniciar
      "siguiente": [{ "ir": "P10" }],
    },
    {
      "id": "R-FLEMA",
      "grupo": "repregunta",
      "texto": "¿La tos es con flema?",
      "alias": ["flema", "tos productiva", "esputo"],
      "tipo": "sena",
    },
  ],
}
```

**Reglas que el motor (FLU) debe cumplir:**

| Regla         | Comportamiento                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `siguiente`   | Se evalúan en orden; gana la primera cuyo `si` se cumple. La última no lleva `si` (caso por defecto). |
| `si`          | `{ "valor": "X" }` compara con la respuesta confirmada de **esta** pregunta.                          |
| `mostrarSi`   | Si no se cumple, la pregunta se salta y se sigue su regla por defecto.                                |
| `ir` especial | `"ALERTA"` (detiene el flujo, P0), `"INTERPRETACION"` (P11 = SÍ), `"FIN"`.                            |
| `nuevoCiclo`  | `{ "si": { "valor": "SI" }, "ir": "P1", "nuevoCiclo": true }` en P6.                                  |
| `permiteOtra` | Ofrece "otra / no está aquí" → mensaje libre → al volver, sigue la regla por defecto.                 |
| Ciclos        | P1 abre el ciclo `n`; P2–P5 se guardan con `ciclo: n` y el `sintoma` del ciclo.                       |

**Valores cerrados** (a validar con el profesional de salud):

| Pregunta            | Valores                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P0, P6, P7, P8, P11 | `SI`, `NO`                                                                                                         |
| P1                  | `DOLOR`, `TOS`, `FIEBRE`, `FALTA_DE_AIRE`                                                                          |
| P2 (zonas)          | `CABEZA`, `GARGANTA`, `PECHO`, `ABDOMEN_SUPERIOR`, `ABDOMEN_INFERIOR`, `ESPALDA`, `BRAZOS`, `PIERNAS`, `OTRA_ZONA` |
| P3                  | `HOY`, `AYER`, `VARIOS_DIAS`, `UNA_SEMANA_O_MAS`                                                                   |
| P4                  | `LEVE`, `MODERADO`, `FUERTE`                                                                                       |
| P5                  | `EMPEORADO`, `MEJORADO`, `IGUAL`                                                                                   |
| P9                  | `SI`, `NO`, `NO_SE`                                                                                                |
| P10 (múltiple)      | `ASMA`, `DIABETES`, `PRESION_ALTA`, `OTRA`, `NINGUNA`                                                              |
| Todas               | `OTRA` cuando se elige "otra / no está aquí"                                                                       |

**Respuesta guardada:**

```ts
// domain/banco/tipos.ts
export type Origen = "sena" | "tactil" | "cuerpo" | "mensaje-libre";

export interface RespuestaProvisional {
  preguntaId: string;
  valor: string | string[];
  origen: Origen;
  confianza?: number; // solo si origen = 'sena'
}

export interface Respuesta extends RespuestaProvisional {
  id: string;
  confirmada: true; // nunca existe una Respuesta sin confirmar
  hora: string; // ISO 8601
  ciclo?: number; // P1–P5: número de síntoma (1, 2, 3…)
  sintoma?: string; // P2–P5: síntoma del ciclo, p. ej. "FIEBRE"
  repregunta?: { sintoma?: string }; // si vino de una repregunta; el profesional puede asociarla
}
```

### 5.3 Regla de decisión de señas (`domain/senas/decision.ts`)

Función pura, con tests, usada por la vista paciente (SEN) y por el mensaje libre (LIB).
**Nunca confirma**: solo propone; la persona confirma con ✓.

```ts
export interface ParametrosDecision {
  umbral: number; // inicial 0.70
  seguidas: number; // inicial 3
}

/** Propone una clase si las últimas `seguidas` inferencias coinciden y superan el umbral.
 *  Devuelve null en otro caso, o si la clase es OTRA. */
export function decidirSena(
  historial: readonly Inferencia[],
  parametros: ParametrosDecision,
): Exclude<ClaseSena, "OTRA"> | null;
```

**Contrato del modelo** (`ml/CONTRATO.md`). Lo fija Emmy al final de la lección de
preprocesado; la vista paciente solo depende del puerto `Reconocedor`. Valores iniciales, a
confirmar con los datos:

| Elemento      | Propuesta inicial                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Extractor     | MediaPipe Tasks Vision: HandLandmarker (2 manos) + PoseLandmarker (torso y brazos). FaceLandmarker solo si la validación LSP indica que SÍ/NO usan cabeza o rostro. Misma versión en `/recolector` y en la app. |
| Entrada       | Tensor float32 `[1, 30, F]`: 30 fotogramas por muestra. `F` se documenta exactamente (p. ej. 2×21×3 de manos + puntos de pose seleccionados).                                                                   |
| Normalización | Origen en el punto medio de los hombros; escala por la distancia entre hombros. Mano no detectada: ceros + indicador de ausencia.                                                                               |
| Salida        | Softmax de 7 clases en el orden de `labels.json`.                                                                                                                                                               |
| Decisión      | `decidirSena()` con umbral 0,70 y 3 inferencias seguidas. Bajo el umbral: opciones táctiles. Nunca confirma automáticamente.                                                                                    |
| Versión       | `models/senas/v1/`; cualquier cambio de entrada o clases crea `v2` y se avisa a A.                                                                                                                              |

### 5.4 Consulta (`application/consulta/`)

La vista paciente (A) y la profesional (B) dependen del mismo estado. Se fija aquí para que
ambas trabajen en paralelo.

```ts
export type Fase =
  | "inactiva"
  | "entrega-paciente" // "Entregue la tablet a la persona"
  | "paciente"
  | "alerta" // P0 = SÍ
  | "entrega-profesional"
  | "profesional"
  | "repregunta" // la tablet volvió al paciente por una repregunta
  | "resumen";

export interface EstadoConsulta {
  id: string; // técnico y temporal, sin datos personales
  fase: Fase;
  config: { preguntarEmbarazo: boolean };
  preguntaActiva: string | null;
  ciclo: { numero: number; sintoma?: string } | null;
  provisional: RespuestaProvisional | null;
  respuestas: Respuesta[];
}

export interface CasosDeUso {
  iniciarConsulta(config: EstadoConsulta["config"]): void;
  proponer(respuesta: RespuestaProvisional): void; // queda provisional
  confirmar(): void; // ✓: guarda y avanza con el motor
  descartar(): void; // ✗: borra la provisional
  entregarAlProfesional(): void;
  enviarRepregunta(preguntaId: string, sintoma?: string): void;
  verResumen(): void;
  terminarConsulta(): void; // borra todo y llama a Grabador.descartarTodo()
}
```

**P0 = SÍ:** la fase pasa a `alerta` y la persona ve "Avisa al personal ahora". El profesional
puede abrir la vista profesional, donde el resumen muestra solo la **Alerta inicial**.

### 5.5 Modo demo

Hoy ningún video está validado. Sin este modo, la demo no mostraría ningún video LSP.

- `VITE_DEMO=true` reproduce los videos con `validado: false` y muestra la etiqueta **"Video
  no validado"** sobre el reproductor.
- Sin esa variable se aplica PAC2: un video no validado aparece como "video pendiente".
- La demo para el jurado usa `VITE_DEMO=true` y se presenta como demo técnica (R3).

---

## 6. Fases y orden de trabajo

Las dos columnas avanzan en paralelo.

| Fase        | Programadora A · Yosselin                                                   | Programadora B · Emmy                                     | Se termina cuando                                                                                         |
| ----------- | --------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 0 · Hecho   | Base web, ADR, presentación (primer PR)                                     | —                                                         | PR aceptado                                                                                               |
| 0b · Juntas | Contrato 5.2                                                                | Contratos 5.1, 5.4 y borrador de 5.3                      | Ambas aprueban los contratos                                                                              |
| a           | BAN, FLU, PAC+VID, OPC, CON, DEM                                            | CNS (primero), REC, PRO, RES                              | Flujo táctil completo de punta a punta con simuladores; `/recolector` graba                               |
| b           | CUE (cuerpo 3D en P2)                                                       | Grabación con señantes y ML (entrenar, evaluar, exportar) | P2 funciona con 3D y respaldo; hay datos de ≥ 3 señantes                                                  |
| c           | DEC, luego BUS (Transformers.js)                                            | SEN                                                       | El reconocedor real reemplaza al simulador y cumple M5; repregunta escrita → video → respuesta confirmada |
| e           | Integrar cámara y pantallas de repregunta en la vista paciente; revisar LIB | LIB (mensaje libre)                                       | Mensaje libre con señas confirmadas en el resumen                                                         |
| f           | Accesibilidad y matriz de pruebas                                           | PWA y guía de demo                                        | Criterios R1–R4                                                                                           |

### Calendario

| Hito                                                             | Fecha                            |
| ---------------------------------------------------------------- | -------------------------------- |
| Contratos aprobados (0b)                                         | _por definir_                    |
| Fin de fase a: flujo táctil completo                             | _por definir_                    |
| Persona competente en LSP confirmada (bloquea M1 y la grabación) | _por definir — lo antes posible_ |
| Fin de fase c: reconocedor real                                  | _por definir_                    |
| Congelamiento: solo correcciones                                 | _por definir_                    |
| Presentación al jurado                                           | _por definir_                    |

### Mínimo presentable

Si el tiempo no alcanza, se presenta: **fases a y b + simulador del reconocedor** (con el
aviso "reconocimiento pendiente"). El flujo completo, la confirmación, el cuerpo 3D y el
resumen funcionan sin el modelo (riesgo 1 de la §11).

---

## 7. Criterios de aceptación por módulo

Un módulo se acepta cuando la revisora comprueba sus criterios, no cuando existe el código.
Estados posibles: **Cumple**, **Pendiente**, **Bloqueado**, **No aplica** (con justificación
aceptada por ambas).

### 7.1 Programadora A · Yosselin

**BAN · Banco de preguntas**

- **BAN1** El JSON se valida con Zod al cargar; un banco inválido muestra un error claro y no
  arranca la consulta.
- **BAN2** Cada pregunta tiene ID estable, grupo, texto, video, estado `validado`, tipo,
  opciones y reglas `siguiente`, según §5.2.
- **BAN3** Incluye P-OPC, P0–P11 y las repreguntas iniciales (5 a 10) con `alias`. Revisado
  por un profesional de salud antes de la demo.

**FLU · Motor del flujo**

- **FLU1** P0 = SÍ lleva a la fase `alerta` y muestra "Avisa al personal ahora". No asigna
  prioridades.
- **FLU2** P2 solo si P1 = DOLOR. P2–P5 se guardan con el `ciclo` y el `sintoma` del ciclo
  actual. P6 = SÍ abre un nuevo ciclo en P1; P6 = NO va a P7.
- **FLU3** P9 solo si `mostrarSi` se cumple (configuración del profesional) y ofrece "no sé".
- **FLU4** P11 = SÍ orienta a solicitar interpretación. Toda pregunta con `permiteOtra` ofrece
  "otra / no está aquí".
- **FLU5** Tests unitarios cubren cada rama del flujo, incluidos ciclos de varios síntomas.

**PAC + VID · Vista paciente**

- **PAC1** Muestra solo la pregunta activa, sin datos del profesional. Pantallas de entrega
  claras con ícono, sin depender de lectura.
- **PAC2** Reproducir, pausar y repetir funcionan. Un video ausente o con `validado: false` se
  muestra como "video pendiente", salvo en modo demo (DEM).
- **PAC3** Tablet horizontal en dos paneles (video | respuesta); en móvil se apilan sin
  desplazamiento horizontal.

**OPC · Respuestas táctiles**

- **OPC1** Cada opción viene del banco y produce un valor permitido. Botones de al menos
  48×48 px, foco visible, uso con teclado.
- **OPC2** La escala de intensidad se distingue por tamaño o cantidad de barras, además de
  color y texto.

**CON · Confirmación**

- **CON1** Toda respuesta empieza provisional y no aparece al profesional hasta ✓.
- **CON2** La devolución usa video de la seña, pictograma o zona del cuerpo. ✓ y ✗ se
  distinguen por forma, color y nombre accesible.
- **CON3** ✗ descarta la provisional y permite repetir la seña o elegir otra opción. No hay
  dobles envíos por pulsaciones repetidas.

**DEM · Modo demo**

- **DEM1** Con `VITE_DEMO=true`, los videos no validados se reproducen con la etiqueta "Video
  no validado" siempre visible. Sin la variable, se aplica PAC2.

**CUE · Cuerpo 3D**

- **CUE1** Vistas frente y espalda con botones; zonas de §5.2.
- **CUE2** Respaldo 2D o lista visual si el 3D no carga. Guarda `origen: cuerpo` y el ID de
  zona; el resumen muestra su etiqueta.
- **CUE3** El modelo `human-body.glb` (CC0) y la librería 3D se declaran en la ficha del
  proyecto.

**DEC · Regla de decisión**

- **DEC1** `decidirSena()` cumple §5.3, nunca propone OTRA y tiene tests para: umbral exacto,
  menos inferencias de las necesarias, cambio de clase a mitad e historial vacío.

**BUS · Repreguntas**

- **BUS1** El profesional escribe libremente; se muestran las 3 preguntas del grupo
  `repregunta` más parecidas, con su texto.
- **BUS2** El profesional siempre elige y confirma antes de enviar. Bajo el umbral: "No hay
  video para esta pregunta. Solicite apoyo de interpretación."
- **BUS3** El modelo de embeddings corre en un Web Worker, local; la pregunta escrita no sale
  del dispositivo. Nunca genera señas ni traduce texto a LSP.
- **BUS4** Respaldo: si el modelo no carga, búsqueda por texto normalizado y `alias`, con
  `metodo: 'texto'` (sin llamarla IA).

### 7.2 Programadora B · Emmy

**CNS · Consulta**

- **CNS1** La consulta cumple §5.4: solo ID técnico, fase, configuración, pregunta activa,
  ciclo, respuesta provisional y respuestas confirmadas. Sin datos de identificación.
- **CNS2** Nada se serializa: un test falla si se escribe en `localStorage`, `sessionStorage`
  o se llama a la red con datos de la consulta.
- **CNS3** Terminar la consulta, recargar o cerrar la pestaña borra todo, incluidas las
  grabaciones (llama a `Grabador.descartarTodo`).

**PRO · Vista profesional**

- **PRO1** Muestra solo respuestas confirmadas de la consulta activa y resalta los datos
  faltantes.
- **PRO2** Ofrece: Repreguntar, Ver resumen y Terminar consulta. Informa que MARI no conserva
  datos.
- **PRO3** "Modo profesional" se activa manteniendo pulsado el botón (≈ 2 s), para evitar
  entradas accidentales. No se presenta como medida de seguridad.

**RES · Resumen**

- **RES1** Secciones: Alerta inicial, Síntomas referidos, Antecedentes, Repreguntas, Mensaje
  libre en LSP.
- **RES2** Una línea por síntoma (agrupada por `ciclo`): "[síntoma] desde [inicio],
  intensidad [nivel], [evolución]". Lo que falta: "no especificado". Nunca completa ni infiere.
- **RES3** Muestra también las respuestas originales. Cierre fijo: "Información referida y
  confirmada por la persona. No constituye diagnóstico."
- **RES4** Copiar requiere acción explícita y avisa que el portapapeles queda fuera de MARI.
  Sin respuestas confirmadas no se genera resumen.
- **RES5** Tests unitarios con respuestas sintéticas, incluidos varios síntomas y datos
  faltantes.

**PWA**

- **PWA1** La app se instala y funciona sin internet después de la primera carga, incluidos
  videos, modelos de señas y de búsqueda. Se mide el peso total del caché en la tablet de la
  demo.

### 7.3 Modelo de reconocimiento · Emmy

- **M1 Vocabulario:** DOLOR, TOS, FIEBRE, FALTA_DE_AIRE, SI, NO y OTRA, validado por una
  persona competente en LSP y documentado en `ml/VOCABULARIO.md` (incluye si SÍ/NO usan
  cabeza o rostro). **Se cumple antes de empezar a grabar**, porque define la entrada del
  modelo.
- **M2 Datos:** cada señante firma consentimiento; se identifica con un código (P01, P02…),
  sin nombre. Sugerido: ≥ 5 personas y ~30 repeticiones por seña, variando luz y fondo. OTRA
  incluye transiciones y señas fuera del vocabulario, no solo reposo.
- **M3 Recolector:** `/recolector` solo existe con `VITE_RECOLECTOR=true`; no graba video,
  exporta solo puntos normalizados en JSON (`CLASE_P03_rep012.json`). Nunca disponible en la
  demo pública.
- **M4 Entrenamiento:** GRU pequeña en Keras; script reproducible con semilla;
  `requirements.txt` con versiones fijas.
- **M5 Evaluación:** separación por persona (las de prueba no se usan en entrenamiento);
  exactitud por clase, matriz de confusión y umbral en `ml/reports/`. No se declara ≥ 80 %
  sin ese reporte.
- **M6 Exportación:** TF.js en `public/models/senas/v1/` con `labels.json`; se verifica que
  Python y navegador dan la misma clase para las mismas muestras de prueba.
- **M7 SEN · Integración:** inferencia en Web Worker; cámara sin audio, solo al pulsar
  "Activar cámara"; estados de `EstadoCamara` visibles; las pistas se detienen al salir. No se
  graban ni envían fotogramas.
- **M8 LIB · Mensaje libre:** opcional, con consentimiento, máx. 1 min, solo en memoria. La
  ventana deslizante usa `decidirSena()` y devuelve `Deteccion[]`; la persona confirma cada
  seña. El resumen separa lo confirmado de "el resto requiere revisión por un intérprete". Se
  implementa después de cumplir M5.

> Mientras M5 no se cumpla, la vista paciente usa el simulador del `Reconocedor` y muestra
> "reconocimiento pendiente". No se inventan respuestas ni porcentajes de confianza.

---

## 8. Forma de trabajo con Git

`main` es la versión estable y demostrable; `develop` integra el trabajo de ambas. Cada tarea
va en una rama pequeña creada desde `develop`.

| Rama                          | Uso                           | Regla                                                       |
| ----------------------------- | ----------------------------- | ----------------------------------------------------------- |
| `main`                        | Versión estable               | Solo recibe `develop` aceptada, por PR revisado por la otra |
| `develop`                     | Integración                   | Siempre instala, compila y pasa `npm run check`             |
| `feature/a-…` · `feature/b-…` | Una funcionalidad             | Nace de `develop` y vuelve por PR                           |
| `fix/…`                       | Una corrección                | Incluye prueba que evita la regresión                       |
| `feature/ml-…`                | Trabajo en `ml/`              | No sube datos crudos ni landmarks de señantes               |
| `docs/…` · `chore/…`          | Documentación o mantenimiento | No mezclar con cambios funcionales                          |

**Ramas iniciales sugeridas:** `docs/plan-y-contratos`, `feature/a-banco-flujo`,
`feature/a-vista-paciente`, `feature/a-confirmacion`, `feature/a-modo-demo`,
`feature/a-cuerpo-3d`, `feature/a-decision-senas`, `feature/a-repreguntas`,
`feature/b-consulta`, `feature/b-recolector`, `feature/b-vista-profesional`,
`feature/b-resumen`, `feature/ml-entrenamiento`, `feature/b-reconocedor`,
`feature/b-mensaje-libre`, `feature/b-pwa`.

### Rutina de cada tarea

```bash
git switch develop && git pull --ff-only origin develop
git switch -c feature/a-banco-flujo
cd web && npm run check && npm run build && cd ..
git add -- <archivos de la tarea>
git commit -m "feat(flujo): motor del flujo P0-P11"
git push -u origin feature/a-banco-flujo   # abrir PR hacia develop
```

### Reglas

- Nunca `push --force` en `main` ni `develop`. Proteger ambas ramas en GitHub.
- No subir `node_modules`, `dist`, `.env`, videos de señantes, `ml/data/` ni grabaciones.
- Cada PR incluye: criterios cumplidos (IDs), comandos ejecutados con su resultado, captura y
  limitaciones.
- Un cambio en contratos (§5) se avisa antes y lo revisa la otra programadora.

---

## 9. Pruebas comunes

- **Q1** Desde un clon limpio: `npm ci`, `npm run dev`, `npm run check` (tipos, oxlint,
  Prettier, Vitest) y `npm run build` terminan sin errores.
- **Q2** Playwright + axe recorren el flujo principal sin errores críticos de accesibilidad
  ni de consola.
- **Q3** Teclado, foco visible, contraste y zoom 200 %. Tamaños de referencia: tablet
  1024×768, móvil 390×844 y computadora.
- **Q4** Ninguna prueba ni demo usa información real; solo datos sintéticos.
- **Q5** Toda corrección de un fallo repetible agrega una prueba de regresión.

### Matriz de validación conjunta

| Recorrido                          | Ejecuta | Resultado esperado                                                    |
| ---------------------------------- | ------- | --------------------------------------------------------------------- |
| Inicio y entrega de tablet         | B → A   | Consulta vacía, sin identificación                                    |
| P0 alerta en SÍ                    | A       | Mensaje de aviso, flujo detenido, resumen solo con la alerta          |
| Dos síntomas con P6                | A       | Ambos síntomas con su duración, intensidad y evolución, sin mezclarse |
| Respuesta por seña                 | B       | Seña propuesta → ✓ guarda / ✗ repite                                  |
| Seña con baja confianza            | B       | Pasa a opciones táctiles                                              |
| Cuerpo 3D y respaldo               | A       | Zona correcta en el resumen                                           |
| Repregunta escrita                 | A → B   | 3 sugerencias, elección, respuesta confirmada en el resumen           |
| Repregunta sin coincidencia        | A       | Orienta a interpretación                                              |
| Mensaje libre                      | B       | Señas confirmadas + aviso para intérprete                             |
| Resumen y terminar                 | B       | Secciones completas; todo se borra                                    |
| Recargar a mitad                   | Ambas   | Consulta perdida, nueva consulta vacía                                |
| Modo demo                          | A       | Videos no validados visibles con su etiqueta                          |
| Sin internet tras la primera carga | B       | Todo funciona                                                         |

---

## 10. Pendientes que no son código

| Pendiente                                                                      | Responsable de conseguirlo      | Bloquea      |
| ------------------------------------------------------------------------------ | ------------------------------- | ------------ |
| Persona competente en LSP que valide señas, videos y pictogramas — **urgente** | Ambas                           | M1, M2, PAC2 |
| Revisión del banco por un profesional de salud                                 | Ambas                           | BAN3         |
| Videos que faltan: P0, P5, P6, P8, P10, P11 y repreguntas                      | A coordina                      | PAC2         |
| Videos de la seña de cada respuesta (para la confirmación)                     | A coordina                      | CON2         |
| Señantes voluntarios con consentimiento                                        | B coordina                      | M2           |
| Criterio de P9 (cuándo preguntar por embarazo)                                 | Ambas, con profesional de salud | FLU3         |
| Pictograma de "falta de aire" (el actual es provisional)                       | Ambas                           | CON2         |
| Comprimir el video de alergias (13 MB)                                         | A                               | PWA1         |
| Licencia de ARASAAC (no comercial) si el proyecto continúa                     | Ambas                           | —            |

### Decisiones abiertas

1. **Zonas del cuerpo:** ¿se distingue abdomen inferior derecho e izquierdo, como en el cuerpo
   3D anterior?
2. **P4:** ¿tres niveles (leve, moderado, fuerte) o escala de 0 a 10?
3. **P10:** ¿se mantiene `NINGUNA` y la selección múltiple?

---

## 11. Riesgos

| Riesgo                                     | Mitigación                                                                                                       |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| El modelo no alcanza la precisión esperada | Vocabulario pequeño, umbral, confirmación y respaldo táctil; la demo funciona sin el modelo (mínimo presentable) |
| Pocos señantes o datos poco variados       | Grabar desde la fase a; variar luz y fondo; separar por persona al evaluar                                       |
| No se consigue a tiempo la validación LSP  | Buscarla el primer día; sin ella no se graba, porque la entrada del modelo podría cambiar                        |
| El 3D no carga en la tablet de la demo     | Respaldo 2D o lista visual                                                                                       |
| Modelos pesados para la tablet             | Workers, carga diferida y medición en el dispositivo real; el modelo de embeddings puede pesar de 30 a 120 MB    |
| Videos sin validar                         | Modo demo con etiqueta visible; no presentar la demo como solución validada                                      |

---

## 12. Salida a main

- **R1** Recorrido completo verificado: inicio → preguntas → respuesta → confirmación →
  revisión → repregunta → resumen → borrado.
- **R2** El último commit de `develop` pasa Q1–Q2 y ambas lo revisan visualmente.
- **R3** Los pendientes externos se declaran. Sin videos validados se presenta como demo
  técnica, no como solución validada para uso clínico.
- **R4** Ambas aprueban el PR `develop` → `main` y se etiqueta la versión (p. ej. `v0.1.0`).
