# SPEC 15 — Juego real: FROGGER

> **Estado:** Implemented
> **Depende de:** SPEC 06, SPEC 07
> **Fecha:** 2026-10-20
> **Objetivo:** Crear un Frogger clásico sobre una cuadrícula de 16×15 (carretera, río con troncos y tortugas que se sumergen, cinco bocas destino y reloj por rana) y hacerlo jugable en `#/jugar/frogger`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

Hoy el catálogo tiene RANARIA (`ranaria`), un Frogger simulado: el player sube la puntuación con un intervalo.
No hay un Frogger de referencia en `references/started-games/`, así que el motor se escribe desde cero.
El diseño de juego sale de `specs/game-jam/frogger/01-frogger-core.md`: cuadrícula de celdas de 40 px, 5 carriles de carretera, 6 de río, fila segura intermedia, 5 bocas destino, salto de 1 celda en 120 ms, reloj, +10 / +50 / +200 / bonus de tiempo, 3 vidas y +15 % de velocidad por nivel, todo con primitivas canvas.
Ese archivo no se puede implementar tal cual: describe un componente React con props, una página `app/games/frogger/play/page.tsx`, un `INSERT` directo en `scores` con `user_id` y `localStorage`, y se contradice en el tamaño del canvas (480×640 / 640×560), en las filas de cada zona y en la barra de tiempo (en la misma fila que las metas).
Este spec conserva su jugabilidad, resuelve esas contradicciones y crea el motor con el contrato del SPEC 07, sin tocar el player.
El catálogo ya tiene un juego equivalente, RANARIA, que pasa a llamarse FROGGER.

## Alcance

**Dentro:**

- Migración `replace_ranaria_with_frogger`: id, título, descripciones y portada.
- Actualizar la referencia al id `ranaria` en `lib/home.ts`: la fila de `RECENT_SCORES` de CYBER_LU.
- Portada nueva `.cover-frogger` en `app/globals.css`, que sustituye a `.cover-rana` (se borra).
- Motor de FROGGER en TypeScript en `lib/frogger/`, sin React, con las mecánicas de "Modelo de datos": cuadrícula de 16×15 celdas de 40 px, salto discreto de 1 celda en 120 ms, 5 carriles de coches y camiones, 6 de troncos y tortugas, tortugas que se sumergen con aviso, 5 bocas, reloj por rana, 3 vidas y niveles que aceleran un 15 % hasta el nivel 8.
- Tres skins en el canvas (CLÁSICO, NEÓN, RETRO) con la tabla de "Paleta": rana `--green` / `#2de2ff` / `#eaffe4`, troncos `--yellow` / `#ff9e2c` / `#7dff6e`, tortugas `--magenta` / `#ff2bd6` / `#3fbf4a`, y el resto de elementos por skin.
- Definición `froggerEngine` en `lib/frogger/definition.ts`, con `touch` (cruceta izquierda) y `skins`, y entrada en `lib/engines/registry.ts`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: portada `.cover-frogger`, rana, vehículos, troncos, tortugas, bocas, barra de tiempo y la tira de controles.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Ratón y gamepad.
- Sonido.
- Animaciones de muerte elaboradas (explosiones, partículas).
- Mosca bonus en las bocas, cocodrilos, serpientes, nutrias y la rana hembra.
- Vidas extra.
- Movimiento suave de la rana fuera del salto de 120 ms.
- Leaderboard real en el detalle (`#/juego/frogger`). Sigue con `seededScores`.
- `best` y `plays` calculados.
- Alias o redirección de `#/juego/ranaria` y `#/jugar/ranaria`.
- Lo que el archivo del game jam pedía y no encaja en la plataforma: componente `FroggerGame.tsx` con props, página `app/games/frogger/play/page.tsx`, `dynamic(..., { ssr: false })`, `INSERT` directo en `scores`, `user_id`, nombre en `localStorage` (`av_player_name`) y HUD dibujado en el canvas.
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (migración `replace_ranaria_with_frogger` en `supabase/migrations/`)

```sql
update public.games set
  id = 'frogger',
  title = 'FROGGER',
  short = 'Cruza el tráfico y el río salto a salto.',
  long = 'Guía a la rana por cinco carriles de coches y camiones y seis de río, saltando de celda en celda. En el río solo flotan los troncos y las tortugas, y algunas se sumergen. Llena las cinco bocas de la orilla antes de que se acabe el tiempo para subir de nivel: el tráfico acelera y el reloj se acorta. Cada salto hacia delante da 10 puntos, cada boca 50 más el tiempo que sobre, y la ronda completa 200. Tienes tres vidas.',
  cover = 'cover-frogger'
where id = 'ranaria';
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_replace_ranaria_with_frogger.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`ARCADE`), `color` (`green`), `best` (`18900`), `plays` (`6.4K`) y `sort_order` (`7`) no cambian.
- Hoy (2026-10-20) `public.scores` tiene 0 filas con `game_id = 'ranaria'`, así que la FK no bloquea el `update` y la migración no borra nada.
- `.cover-rana` (2 apariciones en `app/globals.css`) pasa a `.cover-frogger`, rediseñada en el pulido. Al terminar no queda ninguna `.cover-rana`.
- En `lib/home.ts`, la fila de `RECENT_SCORES` con `gameId: "ranaria"` (CYBER_LU, 18900) pasa a `gameId: "frogger"`.
- `#/juego/ranaria` y `#/jugar/ranaria` dejan de existir y caen al Home.

### Motor (`lib/frogger/`)

| Archivo         | Contenido                                                                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`     | `W` 640, `H` 600, `CELL` 40, `COLS` 16, `ROWS` 15, filas de cada zona, salida, `JUMP_MS`, `LOOP`, tabla `LANES`, velocidad, reloj, puntos, ciclo de tortugas, `DEAD_MS`, `MAX_DT`, `MAX_SCORE`, `FroggerPalette` y `SKINS`. |
| `lanes.ts`      | Tipos `Lane` y `Entity`, `speedFactor(level)`, `buildLanes(level)`, `updateLanes(lanes, dt)` y `turtleState(lane, entity)`.                                                                                                 |
| `board.ts`      | Tipos `Dir` y `Frog`, `GOAL_COLS`, `goalAt(x)`, `vehicleHits(frog, lanes)`, `supportAt(frog, lanes)`, `roundTime(level)` y `isRiverRow(row)`.                                                                               |
| `input.ts`      | `createInput(target, isActive)`: un salto en cola (`takeDir()`), pulsación de Espacio (`pressed`), `clear()` y `destroy()`.                                                                                                 |
| `engine.ts`     | `createFroggerGame(canvas, callbacks, skin): Required<GameEngine>`.                                                                                                                                                         |
| `definition.ts` | `froggerEngine: EngineDefinition`.                                                                                                                                                                                          |

No hay `types.ts` propio: los tipos van en `lanes.ts` y `board.ts`, y el motor usa los de `lib/engines/types.ts`.

```ts
// lib/frogger/definition.ts
export const froggerEngine: EngineDefinition = {
  id: "frogger",
  width: W, // 640
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "SALTAR" },
    { keys: ["W", "A", "S", "D"], label: "SALTAR" },
  ],
  skins: SKINS,
  touch: {
    // "cross": orden ↑ ← → ↓
    left: {
      pad: "cross",
      buttons: [
        { code: "ArrowUp", label: "↑", aria: "Saltar arriba" },
        { code: "ArrowLeft", label: "←", aria: "Saltar a la izquierda" },
        { code: "ArrowRight", label: "→", aria: "Saltar a la derecha" },
        { code: "ArrowDown", label: "↓", aria: "Saltar abajo" },
      ],
    },
    right: { pad: "row", buttons: [] },
  },
  create: createFroggerGame,
};
```

```ts
// config.ts
export const CELL = 40; // px
export const COLS = 16;
export const ROWS = 15; // 14 filas jugables + la fila 14 del reloj
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 600
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_BANK = 7; // orilla segura
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
export const ROW_TIMER = 14; // no jugable
export const START = { x: 7, row: 13 };
export const JUMP_MS = 120;
export const LOOP = 20; // celdas del bucle de cada carril: 16 visibles + 4 fuera
export const SPEED_STEP = 1.15; // por nivel
export const SPEED_MAX_LEVEL = 8; // desde aquí no acelera más
export const BASE_TIME = 30; // s, nivel 1
export const TIME_PER_LEVEL = 2; // s menos por nivel
export const MIN_TIME = 16; // s
export const POINTS_STEP = 10;
export const POINTS_GOAL = 50;
export const POINTS_ROUND = 200;
export const POINTS_PER_SECOND = 10; // bonus por segundo restante al ocupar una boca
export const TURTLE_CYCLE = 4.5; // s
export const TURTLE_WARN = 2.5; // s: desde aquí parpadea
export const TURTLE_DIVE = 3; // s: desde aquí está sumergida
export const TURTLE_BLINK = 0.1; // s por medio parpadeo
export const DEAD_MS = 1000;
export const FROG_HITBOX = [0.15, 0.85]; // fracción de celda ocupada en x
export const MAX_DT = 0.05; // s
export const MAX_SCORE = 9_999_999;
```

#### Tablero

| Fila | Zona      | Contenido                                                                                        |
| ---- | --------- | ------------------------------------------------------------------------------------------------ |
| 0    | METAS     | 5 bocas de 2 columnas: cols 1–2, 4–5, 7–8, 10–11 y 13–14. Las cols 0, 3, 6, 9, 12 y 15 son muro. |
| 1–6  | RÍO       | 6 carriles de troncos y tortugas (tabla de carriles). Fuera de ellos es agua.                    |
| 7    | ORILLA    | Segura.                                                                                          |
| 8–12 | CARRETERA | 5 carriles de coches y camiones.                                                                 |
| 13   | SALIDA    | Segura. La rana aparece en (7, 13).                                                              |
| 14   | RELOJ     | No jugable. Barra de tiempo.                                                                     |

`goalAt(x)` usa la columna del centro de la rana, `floor(x + 0.5)`: devuelve el índice de la boca (0–4) o `null` si es muro.

#### Carriles (nivel 1)

| Fila | Dir | Tipo           | Ancho (celdas) | N.º | Vel. (celdas/s) | `x` iniciales | Se sumergen        |
| ---- | --- | -------------- | -------------- | --- | --------------- | ------------- | ------------------ |
| 1    | →   | troncos        | 4              | 3   | 2,0             | 0, 7, 14      | —                  |
| 2    | →   | troncos        | 2              | 3   | 3,0             | 2, 8, 14      | —                  |
| 3    | ←   | tortugas       | 2              | 4   | 2,0             | 1, 6, 11, 16  | 2.º (6) y 4.º (16) |
| 4    | →   | troncos        | 4              | 2   | 2,5             | 0, 10         | —                  |
| 5    | →   | troncos        | 3              | 3   | 1,5             | 0, 7, 14      | —                  |
| 6    | ←   | tortugas       | 3              | 4   | 1,75            | 0, 5, 10, 15  | 2.º (5) y 4.º (15) |
| 8    | ←   | camiones       | 3              | 2   | 2,25            | 1, 11         | —                  |
| 9    | →   | coches rápidos | 1              | 2   | 4,0             | 5, 15         | —                  |
| 10   | ←   | camiones       | 2              | 2   | 1,75            | 3, 13         | —                  |
| 11   | →   | coches         | 1              | 3   | 2,5             | 0, 7, 14      | —                  |
| 12   | ←   | coches         | 1              | 3   | 2,0             | 2, 9, 16      | —                  |

- Velocidad del carril = velocidad de la tabla × `speedFactor(level)`.
- `speedFactor(level) = 1.15 ^ (min(level, 8) − 1)`.
- `x` es la columna del borde izquierdo de la entidad, en celdas y con decimales.
- Bucle de `LOOP` = 20 celdas: hacia la derecha, si `x ≥ 16`, `x −= 20`; hacia la izquierda, si `x + ancho ≤ 0`, `x += 20`. Así se conservan los huecos de la tabla.
- `buildLanes(level)` devuelve los carriles con los `x` iniciales y el reloj de tortugas a 0. Se llama en `ready`, en `initGame()` y al completar cada ronda.
- Los carriles se mueven en `ready`, `playing`, `dead` y `gameover`. En pausa no.
- Si en el pulido algún carril resulta imposible de cruzar, se ajusta su velocidad o sus `x` iniciales y se anota en "Resultado de la verificación".

#### Niveles y reloj

| Nivel | Factor de velocidad | Reloj por rana (s) |
| ----- | ------------------- | ------------------ |
| 1     | 1,000               | 30                 |
| 2     | 1,150               | 28                 |
| 3     | 1,323               | 26                 |
| 4     | 1,521               | 24                 |
| 5     | 1,749               | 22                 |
| 6     | 2,011               | 20                 |
| 7     | 2,313               | 18                 |
| 8+    | 2,660               | 16                 |

- `roundTime(level) = max(16, 30 − 2 × (level − 1))`.
- El reloj es **por rana**: se llena al empezar la partida, al reaparecer tras una muerte, al ocupar una boca y al empezar cada ronda.
- Solo corre en `playing`, también durante el salto.

#### Tortugas que se sumergen

- Solo el 2.º y el 4.º grupo de las filas 3 y 6. El 1.º y el 3.º flotan siempre.
- Ciclo de 4,5 s por grupo. Con `t` = reloj del carril (+ 2,25 s para el 4.º grupo), módulo 4,5:
  - `0 ≤ t < 2,5`: a flote. Sirven de apoyo.
  - `2,5 ≤ t < 3`: a flote, parpadeando (visibles 0,1 s, ocultas 0,1 s). Siguen sirviendo de apoyo.
  - `3 ≤ t < 4,5`: sumergidas. No sirven de apoyo. Se dibujan como contorno al 30 % de opacidad.
- El ciclo no cambia con el nivel.

#### Rana

```ts
type Dir = "up" | "down" | "left" | "right";
interface Frog {
  x: number; // columna, con decimales mientras va sobre el río
  row: number; // entera
  jump: {
    fromX: number;
    fromRow: number;
    toX: number;
    toRow: number;
    t: number;
  } | null;
  maxRow: number; // la fila más alta (menor) alcanzada desde que apareció
}
```

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Fase inicial. Tablero completo con los carriles de nivel 1 moviéndose, la rana quieta en (7, 13), las 5 bocas vacías y la barra de tiempo llena. Espacio llama a `initGame()` (`score` 0, `level` 1, `lives` 3, `buildLanes(1)`, bocas vacías, rana en la salida, reloj 30 s) y pasa a `playing`. |
| `playing`  | Reglas de abajo.                                                                                                                                                                                                                                                                                  |
| `dead`     | Tras perder una vida con vidas restantes. La rana se dibuja como una marca en X en `deadMark` donde murió. Los carriles siguen moviéndose, el reloj no corre y no hay input. A los 1 000 ms la rana reaparece en (7, 13) con el reloj lleno y se vuelve a `playing`.                              |
| `gameover` | Se alcanza al perder la última vida o con `end()`. La rana no se dibuja y no hay input. Los carriles siguen moviéndose y las bocas ocupadas se siguen viendo. Espacio no reinicia.                                                                                                                |

Reglas del motor:

- Salto:
  - En `playing`, si la rana no está saltando y hay una dirección en cola (`input.takeDir()`), empieza un salto de 1 celda en esa dirección.
  - Destino: `x ± 1` o `row ± 1`. Si el destino queda fuera de `0 ≤ x ≤ 15` o de `0 ≤ row ≤ 13`, la dirección se descarta y no hay salto.
  - El salto dura `JUMP_MS` (120 ms). Durante el salto la rana se dibuja interpolada entre origen y destino, con las patas extendidas, y no choca ni deriva.
  - Al aterrizar, la rana está en el destino. Si la fila no es de río (0, 7–13), `x = round(x)`.
  - Después se resuelve la celda (abajo).
- Al aterrizar, en este orden:
  - Fila 0: si `goalAt(x)` es `null` (muro) o la boca ya está ocupada, la rana muere. Si está libre: se ocupa, `score += 10 + 50 + ceil(segundos restantes) × 10`, y aparece una rana nueva en (7, 13) con el reloj lleno. Si quedan ocupadas las 5: `score += 200`, `level += 1`, bocas vacías, `buildLanes(level)` y reloj de `roundTime(level)`.
  - Filas 8–12: si `vehicleHits(frog, lanes)`, la rana muere.
  - Filas 1–6: si `supportAt(frog, lanes)` es `null`, la rana muere (agua o tortuga sumergida).
  - Si sobrevive y `row < maxRow`: `maxRow = row` y `score += 10`.
- Cada frame en `playing`, con la rana quieta (sin salto):
  - Filas 1–6: la rana se desplaza con su apoyo (`x += velocidad del carril × dir × dt`). Luego, si el centro (`x + 0,5`) queda fuera de `0..16`, o si `supportAt` es `null` (la tortuga se acaba de sumergir), la rana muere.
  - Filas 8–12: si `vehicleHits(frog, lanes)`, la rana muere.
- `vehicleHits`: la rana ocupa `[x + 0,15, x + 0,85]` en su fila; choca si ese intervalo se solapa con `[e.x, e.x + ancho]` de algún vehículo de su fila.
- `supportAt`: devuelve el tronco o la tortuga de la fila de la rana cuyo rango `[e.x, e.x + ancho)` contiene el centro `x + 0,5`, o `null`. Una tortuga sumergida devuelve `null`.
- Reloj: `timeLeft −= dt` en `playing`. Al llegar a 0, la rana muere.
- Muerte: `lives −= 1`. Si `lives === 0`, `gameover`. Si no, `dead` durante `DEAD_MS`.
- Al reaparecer (tras `dead` o tras ocupar una boca): rana en (7, 13), `maxRow = 13`, sin salto, reloj lleno y `input.clear()`.
- La puntuación se limita a `MAX_SCORE` (9 999 999).
- Resolución lógica 640×600, con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- Todos los límites usan `COLS`, `ROWS`, `CELL`, `W` y `H`, nunca `canvas.width` ni `canvas.height`.
- `dt` en segundos, limitado a `MAX_DT` (50 ms).
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`. El salto en curso, el reloj y el temporizador de `dead` se conservan.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- `setSkin(skin)` cambia la paleta sin tocar fase, puntuación, carriles, rana ni input. En pausa dibuja un frame sin `update`. Tras `destroy` no hace nada.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa. No dibuja ningún texto. Lo único que no está en el HUD es la barra de tiempo de la fila 14.
- Mapeo al HUD: `score` = puntuación, `level` = nivel (ronda), `lives` = vidas (3 al empezar).
- `onStats` solo cuando cambian `score`, `level` o `lives`. `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- Dibujo (primitivas canvas, sin imágenes):
  - Fondo `bg` en todo el canvas (la carretera es el fondo).
  - Filas 1–6 rellenas de `water`. Filas 7 y 13 rellenas de `safe`.
  - Líneas discontinuas de 1 px en `laneLine` entre los carriles de carretera.
  - Fila 0: muros en `wall` y cada boca con borde de 2 px en `bayBorder`. Una boca ocupada lleva dentro la silueta de una rana en `frog`.
  - Coches: rectángulo redondeado con ruedas en `bg`, en `carA` (fila 12), `carB` (fila 11) y `carC` (fila 9).
  - Camiones: rectángulo en `truck` con la cabina separada por una línea en `bg`, mirando hacia donde avanzan.
  - Troncos: rectángulo redondeado en `log` con vetas en `bg` al 35 %.
  - Tortugas: un círculo por celda en `turtle`, con dibujo de caparazón en `bg`. Parpadeando: alternan visible y oculta. Sumergidas: solo contorno en `turtle` con `globalAlpha` 0,3.
  - Rana: elipse de 28×24 px en `frog`, centrada en su celda, con dos ojos (`eye` con pupila `pupil`) hacia arriba y patas extendidas durante el salto.
  - Fila 14: barra de tiempo de ancho proporcional a `timeLeft / roundTime(level)`, en `timerHigh` (> 50 %), `timerMid` (25–50 %) o `timerLow` (< 25 %).
  - Glow con `shadowBlur = GLOW_BASE × palette.glow` y `shadowColor` igual al color del trazo en la rana, los vehículos, los troncos y las tortugas.
  - Tamaños, redondeos, vetas, ruedas y glow se ajustan en el pulido sin cambiar la lógica de celdas.
- Los colores se leen de la paleta de `config.ts`. Nada se lee con `getComputedStyle` en cada frame.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD` y `Space`. La P no es del juego: la gestiona el player.
- `preventDefault()` de los códigos del juego solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- Las direcciones se leen en `keydown`, sin autorrepetición (`event.repeat` se ignora), y solo en `playing`. Un salto por pulsación.
- Cola de 1: una dirección pulsada durante un salto sustituye a la que hubiera en cola y se ejecuta al aterrizar.
- En `dead` las direcciones se ignoran.
- Espacio se lee como pulsación de un frame (`pressed`) y solo hace algo en `ready`. En `playing` se captura (para que no haga scroll) pero no hace nada.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- `clear()` vacía la cola y descarta las pulsaciones pendientes.

### Paleta (`config.ts`)

```ts
export interface FroggerPalette {
  bg: string;
  water: string;
  safe: string;
  laneLine: string;
  wall: string;
  bayBorder: string;
  frog: string;
  eye: string;
  pupil: string;
  deadMark: string;
  carA: string; // fila 12
  carB: string; // fila 11
  carC: string; // fila 9
  truck: string;
  log: string;
  turtle: string;
  timerHigh: string;
  timerMid: string;
  timerLow: string;
  glow: number;
}
```

| Elemento    | CLÁSICO                                    | NEÓN                        | RETRO                       |
| ----------- | ------------------------------------------ | --------------------------- | --------------------------- |
| `bg`        | `#000`                                     | `#0a0418`                   | `#030d05`                   |
| `water`     | `rgba(0, 245, 255, 0.08)` (`--cyan` 8 %)   | `rgba(45, 226, 255, 0.1)`   | `rgba(63, 191, 74, 0.1)`    |
| `safe`      | `rgba(0, 255, 136, 0.1)` (`--green` 10 %)  | `rgba(177, 75, 255, 0.14)`  | `rgba(125, 255, 110, 0.12)` |
| `laneLine`  | `rgba(230, 233, 255, 0.25)` (`--ink` 25 %) | `rgba(253, 243, 255, 0.25)` | `rgba(63, 191, 74, 0.3)`    |
| `wall`      | `rgba(0, 255, 136, 0.35)` (`--green` 35 %) | `rgba(177, 75, 255, 0.4)`   | `rgba(63, 191, 74, 0.4)`    |
| `bayBorder` | `#f5ff00` (`--yellow`)                     | `#ff9e2c`                   | `#c8ff5a`                   |
| `frog`      | `#00ff88` (`--green`)                      | `#2de2ff`                   | `#eaffe4`                   |
| `eye`       | `#e6e9ff` (`--ink`)                        | `#fdf3ff`                   | `#030d05`                   |
| `pupil`     | `#000`                                     | `#0a0418`                   | `#c8ff5a`                   |
| `deadMark`  | `#e6e9ff` (`--ink`)                        | `#fdf3ff`                   | `#c8ff5a`                   |
| `carA`      | `#00f5ff` (`--cyan`)                       | `#2de2ff`                   | `#7dff6e`                   |
| `carB`      | `#ff006e` (`--magenta`)                    | `#ff2bd6`                   | `#c8ff5a`                   |
| `carC`      | `#f5ff00` (`--yellow`)                     | `#ff9e2c`                   | `#7dff6e`                   |
| `truck`     | `#e6e9ff` (`--ink`)                        | `#fdf3ff`                   | `#c8ff5a`                   |
| `log`       | `#f5ff00` (`--yellow`)                     | `#ff9e2c`                   | `#7dff6e`                   |
| `turtle`    | `#ff006e` (`--magenta`)                    | `#ff2bd6`                   | `#3fbf4a`                   |
| `timerHigh` | `#00ff88` (`--green`)                      | `#2de2ff`                   | `#3fbf4a`                   |
| `timerMid`  | `#f5ff00` (`--yellow`)                     | `#ff9e2c`                   | `#7dff6e`                   |
| `timerLow`  | `#ff006e` (`--magenta`)                    | `#ff2bd6`                   | `#eaffe4`                   |
| `glow`      | 1                                          | 2                           | 0,2                         |

- `clasico` usa los tokens de `:root`, con el token en comentario.
- `neon` y `retro` salen de la tabla "Familias de color" del SPEC 11.
- Ningún hex ni `rgba(` fuera de `config.ts`: `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/frogger/*.ts` solo devuelve líneas de `config.ts`.
- Contraste medido con `node .claude/scripts/contrast.mjs`: `bg` ≤ 0,03 de luminancia y elementos de juego ≥ 3:1 sobre `bg`. La rana se tiene que distinguir de los troncos y de las tortugas sobre los que va.

### Textos

| Elemento          | Texto                                           |
| ----------------- | ----------------------------------------------- |
| Overlay de inicio | "FROGGER" y "PULSA ESPACIO PARA EMPEZAR"        |
| Tira de controles | `← ↑ → ↓` SALTAR · `W A S D` SALTAR · `P` PAUSA |
| Botones táctiles  | Cruceta izquierda: ↑ ← → ↓. Zona derecha vacía. |

### Puntuación máxima

- Por rana: 130 por avanzar (13 filas, la meta incluida), 50 por la boca y como mucho 300 de bonus (30 s × 10).
- Por ronda: como mucho 5 × 480 + 200 = 2 600.
- No hay techo de niveles, así que el motor limita la puntuación a 9 999 999 por si acaso.

## Plan de implementación

1. **Catálogo.** Comprobar con `select count(*) from public.scores where game_id = 'ranaria'` que sigue en 0. Si no lo está, parar y preguntar al usuario qué hacer con esas filas antes de seguir. Crear `pending_replace_ranaria_with_frogger.sql`, aplicarlo con `apply_migration`, renombrarlo con su versión y regenerar `lib/supabase/database.types.ts`. Actualizar `lib/home.ts`. Renombrar `.cover-rana` a `.cover-frogger` en `app/globals.css` sin cambiar estilos (el rediseño va en el paso 6). Verificación: `select id, title, cat, color, cover, sort_order from public.games where id = 'frogger'` devuelve `frogger`, `FROGGER`, `ARCADE`, `green`, `cover-frogger`, `7`; `grep -rn "ranaria\|cover-rana" app components lib` vacío; la Biblioteca muestra FROGGER en la 7.ª posición; `#/jugar/frogger` abre la simulación.
2. **Base del motor.** `config.ts` (con `FroggerPalette` y `SKINS`), `lanes.ts` y `board.ts`. Verificación: `npm run lint` y `npm run build` pasan, y el `grep` de colores solo devuelve líneas de `config.ts`.
3. **Input.** `input.ts` con la cola de 1 salto, la pulsación de Espacio y la regla de `preventDefault`. Verificación: `npm run build` pasa.
4. **Motor.** `engine.ts` con las fases, `initGame`, carriles, salto, aterrizaje, deriva en el río, tortugas, reloj, bocas, rondas, muertes, el dibujo, `setupCanvas`, `setPaused`, `end`, `destroy`, `setSkin` y los callbacks. Verificación: `npm run build` pasa.
5. **Registro.** `definition.ts` y la entrada `frogger: froggerEngine` en `ENGINES`. Verificación: en `#/jugar/frogger` Espacio empieza la partida, el HUD suma 10 al saltar a la fila 12 y quedarse quieto en ella acaba con un atropello que quita un ♥.
6. **Pulido con `/frontend-design`.** Portada `.cover-frogger` (carretera, río y rana, sin romper la estética de las demás `.cover-*`), rana, vehículos, troncos, tortugas, bocas, barra de tiempo, glow y la tira de controles, a 1440 px y 375 px. Medir el contraste de las tres skins con `contrast.mjs`.
7. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/frogger` a 1440 y 375 px, con capturas (no se versionan). Leer la rana, los carriles y los colores interceptando `fillRect`, `arc`, `ellipse`, `strokeRect` y `fillText` del contexto 2D, y usar un bot dentro de la página que pulse las flechas para cruzar. Si completar una ronda con el bot no es práctico, usar un cambio local sin commitear en `config.ts` (por ejemplo, velocidades a 0) y anotarlo. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `replace_ranaria_with_frogger` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `frogger` con título `FROGGER`, `cat` `ARCADE`, `color` `green`, `cover` `cover-frogger` y `sort_order` 7, y ya no tiene la fila `ranaria`.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] `grep -rn "ranaria\|cover-rana" app components lib` no devuelve resultados, y `/#/juego/ranaria` y `/#/jugar/ranaria` muestran el Home.
- [ ] La Biblioteca muestra FROGGER con la portada `.cover-frogger` en la 7.ª posición.
- [ ] El Home muestra la fila de CYBER_LU en "ÚLTIMAS PUNTUACIONES" con el título FROGGER, y sigue mostrando "8 JUEGOS".
- [ ] `ENGINES` tiene las entradas `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger`, y `GamePlayer.tsx`, `GameCanvas.tsx`, `lib/engines/types.ts` y `lib/scores.ts` no han cambiado.
- [ ] Al abrir `/#/jugar/frogger` se ve "FROGGER / PULSA ESPACIO PARA EMPEZAR" sobre el tablero con el tráfico y el río moviéndose, la rana quieta en (7, 13) y la barra de tiempo llena, y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / ♥ ♥ ♥ / 01.
- [ ] Espacio empieza la partida y el overlay desaparece.
- [ ] ↑ / W, ↓ / S, ← / A y → / D hacen saltar la rana una celda (40 px) en su dirección, con una animación de ~120 ms.
- [ ] Mantener una flecha pulsada da un solo salto.
- [ ] Una flecha pulsada durante un salto se ejecuta al aterrizar; dos flechas pulsadas durante un salto ejecutan solo la última.
- [ ] En la salida, ↓ no hace nada; en la columna 0, ← no hace nada; en la columna 15, → no hace nada.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] Los vehículos y los troncos avanzan en la dirección y a la velocidad de la tabla de carriles, y al salir por un lado vuelven a entrar por el otro conservando los huecos.
- [ ] Al empezar, ↑ lleva la rana a la fila 12 y el HUD marca 10; si se queda quieta, el coche de la fila 12 la atropella a los ~575 ms del inicio y el HUD pierde un ♥.
- [ ] Al morir con vidas restantes, la rana se ve como una marca en X durante ~1 s mientras el tráfico sigue, y después reaparece en (7, 13) con la barra de tiempo llena.
- [ ] Volver a una fila ya alcanzada por la misma rana no suma; la rana siguiente vuelve a sumar 10 por cada fila nueva.
- [ ] Saltar al agua de las filas 1–6 fuera de un tronco o una tortuga quita un ♥.
- [ ] Sobre un tronco o una tortuga, la rana se desplaza con él; si su centro sale del tablero, pierde un ♥.
- [ ] El 2.º y el 4.º grupo de tortugas de las filas 3 y 6 parpadean 0,5 s, se sumergen 1,5 s (dibujadas como contorno tenue) y vuelven; el 1.º y el 3.º no se sumergen nunca.
- [ ] Una rana sobre una tortuga que se sumerge pierde un ♥.
- [ ] Al aterrizar en la fila 12, la rana vuelve a la columna entera más cercana si venía con decimales del río.
- [ ] Quieta en la salida, la rana pierde un ♥ al agotarse el reloj, a los ~30 s.
- [ ] Al llegar a una boca libre, la boca muestra una rana, el HUD suma 10 + 50 + `ceil(segundos restantes)` × 10, y aparece una rana nueva en (7, 13) con el reloj lleno.
- [ ] Aterrizar en una boca ocupada o en un muro de la fila 0 quita un ♥.
- [ ] Al ocupar la 5.ª boca el HUD suma además 200 y el nivel pasa a 02; las bocas se vacían, el reloj pasa a 28 s y los carriles vuelven a sus `x` iniciales a 1,15 veces la velocidad.
- [ ] Perder el 3.er ♥ abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] En `gameover` la rana no se dibuja y el tráfico sigue moviéndose.
- [ ] FIN abre el modal con la puntuación actual y la rana desaparece.
- [ ] La barra de tiempo de la fila 14 encoge con el reloj y cambia de color al bajar del 50 % y del 25 %.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa: `fillText` no se llama nunca.
- [ ] Con CLÁSICO, la rana es `#00ff88`, los troncos `#f5ff00`, las tortugas `#ff006e` y los coches de la fila 12 `#00f5ff`.
- [ ] Con NEÓN, la rana es `#2de2ff`, los troncos `#ff9e2c`, las tortugas `#ff2bd6` y el fondo `#0a0418`.
- [ ] Con RETRO, la rana es `#eaffe4`, los troncos `#7dff6e`, las tortugas `#3fbf4a` y el fondo `#030d05`.
- [ ] Cambiar de skin durante la partida o en pausa cambia los colores en el siguiente frame sin cambiar fase, puntuación, rana ni carriles.
- [ ] `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/frogger/*.ts` solo devuelve líneas de `config.ts`.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas, el reloj y el tráfico; al reanudar, la rana no salta por teclas pulsadas durante la pausa.
- [ ] En el modal se pueden escribir iniciales con espacios, con la letra P y con W, A, S y D sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'frogger'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña FROGGER del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/frogger`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / ♥ ♥ ♥ / 01, la rana en (7, 13) y las bocas vacías.
- [ ] SALIR lleva a `#/juego/frogger`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1280 y `canvas.height` es 1200.
- [ ] A 1440 px y a 375 px no hay scroll horizontal, y el canvas mantiene la proporción 640:600 dentro del CRT.
- [ ] La tira de controles muestra `← ↑ → ↓` SALTAR · `W A S D` SALTAR · `P` PAUSA.
- [ ] En táctil (Playwright con `hasTouch` e `isMobile`), la zona izquierda es una cruceta con ↑ encima de ← y →, y ↓ debajo, con `aria-label` "Saltar arriba", "Saltar a la izquierda", "Saltar a la derecha" y "Saltar abajo"; la zona derecha no tiene botones; tocar el CRT empieza la partida y cada botón despacha su tecla: `keydown` al tocar y `keyup` al soltar.
- [ ] En táctil, cada toque de ↑ da exactamente un salto.
- [ ] Mover el ratón o hacer clic sobre el canvas no cambia nada.
- [ ] `/#/jugar/asteroids`, `/#/jugar/tetris`, `/#/jugar/arkanoid` y `/#/jugar/snake` siguen funcionando y `/#/jugar/gloton` sigue simulando.
- [ ] La pestaña de red no muestra peticiones a `/games/frogger/…` ni a archivos de audio.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/frogger`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** sustituir RANARIA por FROGGER. Decisión del usuario; es el mismo juego y dos ranas en el catálogo confundirían.
- **No:** añadir una novena fila, aunque el archivo del game jam lo planteaba como juego nuevo.
- **Sí:** cambiar el id a `frogger` y el título a FROGGER. Decisión del usuario; es el nombre real del juego, como `rocas` → `asteroids`, `caida` → `tetris`, `bloque-buster` → `arkanoid` y `serpentina` → `snake`.
- **Sí:** el `update` no borra puntuaciones, porque `ranaria` tiene 0 filas en `public.scores`. Si aparecen antes de implementar, el paso 1 para y pregunta.
- **No:** mantener el id `ranaria`.
- **Sí:** portada nueva `.cover-frogger` diseñada con `/frontend-design`, que sustituye a `.cover-rana`. Decisión del usuario.
- **No:** conservar `.cover-rana`.
- **Sí:** `cat` `ARCADE` y `color` `green` se mantienen. El `lime` del archivo del game jam no cumple el CHECK de `color`.
- **Sí:** las descripciones nuevas del modelo de datos. Decisión del usuario; describen solo mecánicas que el juego tiene.
- **No:** los textos del archivo del game jam ni los de RANARIA.
- **Sí:** juego original, sin código de referencia. El diseño de juego sale de `specs/game-jam/frogger/01-frogger-core.md`; su arquitectura no.
- **Sí:** motor sin React en `lib/frogger/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **No:** componente `FroggerGame.tsx` con props, página `app/games/frogger/play/page.tsx` ni `dynamic(..., { ssr: false })`. La app es una sola página con router por hash y `GamePlayer` ya monta los motores en cliente.
- **No:** `INSERT` directo en `scores`, `user_id` ni nombre guardado en `localStorage`. Las puntuaciones se escriben solo con la RPC `submit_score` del player (SPEC 06).
- **Sí:** tablero de 16×15 celdas de 40 px (640×600): las 14 filas jugables del diseño y una fila 14 solo para la barra de tiempo. Decisión del usuario; resuelve las dos medidas contradictorias y saca la barra de la fila de metas.
- **No:** 640×560 con la barra dentro de la salida, ni 800×600 con muros irregulares en la fila de metas.
- **Sí:** reloj por rana de 30 s, 2 s menos por nivel y mínimo 16 s; se llena al empezar, al reaparecer, al ocupar una boca y en cada ronda. Decisión del usuario; con un reloj por ronda de 15 s llenar 5 bocas es imposible, y el bonus por boca usa el tiempo restante.
- **No:** 15 s con −1 s por nivel, ni 20 s.
- **Sí:** bonus de `ceil(segundos restantes)` × 10 al ocupar una boca.
- **Sí:** +10 por cada fila nueva alcanzada por la rana actual, también la de la meta. Decisión del usuario; cada viaje suma, como en el arcade.
- **No:** +10 solo la primera vez en la ronda.
- **Sí:** +15 % de velocidad por nivel con tope en el nivel 8 (×2,66). Decisión del usuario; evita carriles injugables.
- **No:** acelerar sin tope.
- **Sí:** la tabla de carriles de "Modelo de datos", con bucle de 20 celdas. Decisión del usuario. Se puede ajustar en el pulido si un carril resulta imposible, y se anota.
- **Sí:** en el río la `x` de la rana es continua mientras va sobre un apoyo, y se redondea a la columna más cercana al aterrizar en tierra. Decisión del usuario; es la única forma de que un tronco la lleve sin teletransportarla.
- **Sí:** el soporte se decide con el centro de la rana, el choque con vehículos con una hitbox de 0,15–0,85 de celda, y durante el salto la rana no choca. Decisión del usuario.
- **Sí:** se sumergen el 2.º y el 4.º grupo de tortugas de las filas 3 y 6, con 0,5 s de parpadeo antes de 1,5 s bajo el agua. Decisión del usuario; es legible y deja siempre tortugas seguras.
- **No:** todos los grupos sin aviso.
- **Sí:** fase `dead` de 1 s con una marca en X y el tráfico en marcha; la última vida va directa a `gameover`, como en ASTEROIDS. Decisión del usuario.
- **No:** reaparecer al instante como en ARKANOID.
- **Sí:** 3 vidas (`lives` 3), sin vidas extra.
- **Sí:** flechas y WASD, un salto por pulsación y una sola dirección en cola durante el salto. Decisión del usuario.
- **No:** solo flechas, ni saltos por autorrepetición.
- **Sí:** Espacio · "PULSA ESPACIO PARA EMPEZAR"; en `ready` el tráfico y el río se mueven con la rana quieta en la salida.
- **Sí:** tres skins en el canvas (CLÁSICO, NEÓN, RETRO), CLÁSICO por defecto, con la tabla de "Paleta". Decisión del usuario.
- **No:** rana verde en las tres skins.
- **Sí:** HUD de React y modal de la plataforma; el canvas solo dibuja, además del juego, la barra de tiempo, porque el HUD no tiene sitio para el reloj.
- **No:** el HUD interno del archivo del game jam (puntuación, nivel e iconos de vidas en el canvas). Lo prohíbe el contrato.
- **No:** pausa propia ni reinicio con tecla.
- **Sí:** todo dibujado con primitivas canvas, sin imágenes ni `public/games/frogger/`.
- **No:** tope de puntuación necesario en la práctica (2 600 por ronda), pero el motor limita a 9 999 999 porque los niveles no tienen techo.
- **No:** sonido. Decisión del usuario; no hay archivos de audio y ningún juego del Vault lo tiene.
- **No:** ratón. Decisión del usuario.
- **Sí:** botones táctiles (SPEC 14): cruceta `cross` a la izquierda (↑ ← → ↓) y zona derecha vacía, sin `repeat`, porque cada salto es una pulsación. Decisión del usuario; es la disposición de SNAKE.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                           | Mitigación                                                                                                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Alguien guarda una partida simulada de RANARIA antes de implementar y la FK bloquea el `update`. | El paso 1 cuenta las filas de `ranaria` antes de la migración. Si hay alguna, se para y se pregunta.                                             |
| El Home filtra en silencio las filas de `RECENT_SCORES` con un id que no existe.                 | Paso 1 y criterio de CYBER_LU en el Home.                                                                                                        |
| Algún carril de la tabla resulta imposible de cruzar en niveles altos.                           | Tope de velocidad en el nivel 8. El bot de la verificación cruza el tablero; si un carril falla, se ajusta en el pulido y se anota.              |
| El canvas de 640×600 se ve pequeño a 375 px (celdas de ~14 px).                                  | Aceptado: el player hace el letterbox y los botones táctiles van fuera del CRT. Lo revisa `mobile-porter`.                                       |
| La deriva continua en el río deja la rana entre dos columnas al llegar a la fila 0.              | `goalAt` usa la columna del centro (`floor(x + 0,5)`); criterio de bocas y de muros.                                                             |
| Un frame largo hace que un coche atraviese la rana.                                              | `dt` limitado a 50 ms: a 4 × 2,66 celdas/s un coche avanza como mucho 0,53 celdas por frame, menos que la hitbox más el coche.                   |
| Los colores de las tres skins no llegan a 3:1 o la rana se confunde con su apoyo.                | Paso 6 con `contrast.mjs`; después lo audita `skin-designer`.                                                                                    |
| `shadowBlur` en ~30 entidades baja el rendimiento.                                               | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2, se reduce el glow de los carriles y se deja en la rana. Se anota. |
| Completar rondas con un bot no es práctico en la verificación.                                   | Cambio local sin commitear en `config.ts`, como el tablero de 4×3 del SPEC 10. Se anota.                                                         |
| Las teclas W, A, S y D llegan al juego mientras se escriben iniciales en el modal.               | El modal abre en `gameover`, donde no se captura input; criterio de iniciales con WASD.                                                          |
| El leaderboard falso del detalle usa `id.length` como semilla.                                   | `ranaria` y `frogger` tienen 7 letras: la semilla no cambia.                                                                                     |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Ratón y gamepad.
- Sonido.
- Animaciones de muerte elaboradas.
- Mosca bonus, cocodrilos, serpientes, nutrias y rana hembra.
- Vidas extra.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Alias de `ranaria`.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la verificación

Fecha: 2026-10-20. `npm run build` + `next start -p 3001`, Chromium de Playwright, recargando la página al empezar cada recorrido.
La rana, los carriles, las bocas, la barra de tiempo y los colores se leyeron interceptando `fillRect`, `roundRect`, `arc`, `ellipse`, `strokeRect`, `fill`, `stroke` y `fillText` del contexto 2D. Cada frame se cerraba en el `fillRect` del fondo.
Un bot dentro de la página cruzó la carretera y el río pulsando flechas: en la carretera saltaba cuando la fila siguiente quedaba libre durante 0,75 s, y en el río cuando había apoyo al aterrizar. Las pruebas de teclas se hicieron con teclas reales de Playwright.

| Área                    | Resultado                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y build            | `npm run lint` (0 errores; los 11 avisos son de scripts viejos en `.playwright-mcp/`) y `npm run build` sin errores.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Catálogo                | Migración `20261020231736_replace_ranaria_with_frogger`, igual que `list_migrations`, sin archivos `pending_`. Antes de aplicarla, `ranaria` tenía 0 filas en `public.scores`. `public.games` tiene `frogger` · `FROGGER` · `ARCADE` · `green` · `cover-frogger` · 7 y ninguna fila `ranaria`. Tipos regenerados (sin cambios: la migración solo cambia datos).                                                                                                                                                                                          |
| Referencias al id viejo | `grep -rn "ranaria\|cover-rana" app components lib` vacío. `/#/juego/ranaria` y `/#/jugar/ranaria` muestran el Home.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Biblioteca y Home       | FROGGER con `.cover-frogger` en la 7.ª posición. "CYBER_LU ▸ FROGGER" en ÚLTIMAS PUNTUACIONES, y el Home sigue diciendo "8 JUEGOS".                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Registro                | `ENGINES` = `asteroids`, `tetris`, `arkanoid`, `snake` y `frogger`. `GamePlayer.tsx`, `GameCanvas.tsx`, `lib/engines/types.ts` y `lib/scores.ts` sin cambios.                                                                                                                                                                                                                                                                                                                                                                                            |
| `ready`                 | Overlay "FROGGER / PULSA ESPACIO PARA EMPEZAR", PAUSA y FIN deshabilitados, HUD 0 / ♥ ♥ ♥ / 01, rana en (7, 13), 5 bocas vacías, barra de 624 px (llena) y carriles moviéndose.                                                                                                                                                                                                                                                                                                                                                                          |
| Saltos                  | Espacio quita el overlay. ←/A, →/D, ↑/W y ↓/S saltan una celda; la `x` interpolada va de 7 a 6 entre ~40 y ~170 ms tras la tecla (120 ms de salto).                                                                                                                                                                                                                                                                                                                                                                                                      |
| Autorrepetición y cola  | Con ← mantenida y 8 `keydown` con `repeat`, un solo salto (7 → 6). ← y, durante el salto, ← → dejan la rana en 6 (solo la última); ← y ← durante el salto, en 4.                                                                                                                                                                                                                                                                                                                                                                                         |
| Límites                 | En la salida ↓ y S no hacen nada. En la columna 0 ← no hace nada; en la 15, → tampoco.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Scroll                  | `window.scrollY` sigue en 0 con flechas, WASD y Espacio durante la partida.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Carriles                | Velocidades medidas en celdas/s: 2 / 2,99 / −2 / 2,49 / 1,5 / −1,75 (filas 1–6) y −2,25 / 3,99 / −1,75 / 2,49 / −2 (filas 8–12). Tras 25 s, los huecos módulo 20 son los iniciales (p. ej. fila 1: 7, 6, 7; fila 2: 6, 6, 8).                                                                                                                                                                                                                                                                                                                            |
| Atropello               | ↑ lleva la rana a (7, 12) y el HUD marca 10. Quieta, pierde un ♥ a los 592 ms del inicio (575 ms + latencia de la lectura).                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `dead`                  | Marca en X en (7, 12) con el tráfico en marcha. A los 1 016 ms la rana reaparece en (7, 13) con la barra llena.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Filas repetidas         | W suma 10; S y volver a subir a la fila 12 con la misma rana no suman. Tres toques de ↑ y ↓ en táctil dejan el HUD en 10.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Río                     | Saltar al agua desde la orilla quita un ♥. Sobre un tronco la rana deriva a la velocidad de su carril; un tronco de la fila 2 la llevó hasta `x` 15,47 y perdió un ♥ al salir su centro del tablero. Una tortuga que se sumergió en la fila 3 le quitó un ♥.                                                                                                                                                                                                                                                                                             |
| Tortugas                | En cada fila se sumerge un solo grupo a la vez (2 o 3 círculos en contorno con `globalAlpha` 0,3) durante ~1,5 s, precedido de 0,5 s con dos apagados de 0,1 s. Los otros dos grupos siguen siempre a flote (≥ 6 círculos en la fila 3 y ≥ 9 en la 6).                                                                                                                                                                                                                                                                                                   |
| Vuelta a tierra         | Desde el río con `x` 6,8, ↓ deja la rana en la fila 7 con `x` 7.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Reloj                   | Quieta en la salida pierde un ♥ a los 30,0 s. La barra pasa de `#00ff88` a `#f5ff00` al bajar del 50 % y a `#ff006e` al bajar del 25 %.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Bocas                   | Boca libre: +390 con ~20,6 s restantes y +450 con ~26,6 s (130 de filas + 50 + `ceil(t)` × 10), la boca muestra una rana y sale otra en (7, 13) con la barra llena. Una partida normal del bot: +270 con ~20,5 s (10 + 50 + 210). Muro (columna 6) y boca ocupada (columna 1) quitan un ♥ sin sumar la boca.                                                                                                                                                                                                                                             |
| Ronda                   | La 5.ª boca suma 650 (130 + 50 + 270 + 200), el nivel pasa a 02, las bocas se vacían, la barra se llena, los carriles vuelven a sus `x` iniciales y la velocidad pasa de 0,05 a 0,0575 celdas/s (× 1,15). El reloj del nivel 2 mata a la rana a los ~28 s.                                                                                                                                                                                                                                                                                               |
| `gameover`              | Perder el 3.er ♥ abre FIN DEL JUEGO con 640, igual que el HUD. FIN abre el modal con la puntuación del HUD. En `gameover` la rana no se dibuja y el tráfico sigue.                                                                                                                                                                                                                                                                                                                                                                                       |
| Textos del canvas       | Con `fillText` interceptado: 0 llamadas en todos los recorridos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Colores                 | CLÁSICO: rana `#00ff88`, troncos `#f5ff00`, tortugas `#ff006e`, coches de la fila 12 `#00f5ff`. NEÓN: rana `#2de2ff`, troncos `#ff9e2c`, tortugas `#ff2bd6`, fondo `#0a0418`. RETRO: rana `#eaffe4`, troncos `#7dff6e`, tortugas `#3fbf4a`, fondo `#030d05`. `grep` de colores: solo `config.ts`.                                                                                                                                                                                                                                                        |
| Skin en caliente        | Cambiar a NEÓN en partida cambia la rana a `#2de2ff` en el siguiente frame con el mismo HUD, la misma rana y los carriles sin reiniciar. En pausa, cambiar a RETRO dibuja un solo frame.                                                                                                                                                                                                                                                                                                                                                                 |
| Contraste               | `contrast.mjs`: `bg` con luminancia 0 / 0,0022 / 0,0032 y todos los elementos ≥ 5,48:1 (CLÁSICO), ≥ 6,29:1 (NEÓN) y ≥ 8,24:1 (RETRO).                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Pausa                   | PAUSA, la tecla P y `blur` congelan el canvas, el reloj y el tráfico. Con ↑ pulsada durante la pausa, al reanudar la rana no salta.                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Ratón                   | Mover el ratón y hacer clic sobre el canvas no cambia la rana, el HUD ni la pausa.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Modal                   | Escribir "P WASD" da "P WASD" sin que el juego reaccione. Guardar " AB 1 " creó la fila `frogger` · `AB 1` · 0 y mostró "▸ PUNTUACIÓN GUARDADA_".                                                                                                                                                                                                                                                                                                                                                                                                        |
| Salón                   | La pestaña FROGGER mostró `AB 1 · 0`. Sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO", y JUGAR A FROGGER lleva a `#/jugar/frogger`.                                                                                                                                                                                                                                                                                                                                                                                                                |
| JUGAR DE NUEVO y SALIR  | JUGAR DE NUEVO vuelve al overlay con HUD 0 / ♥ ♥ ♥ / 01, la rana en (7, 13) y 0 bocas. SALIR lleva a `#/juego/frogger`, donde Espacio hace scroll (0 → 234).                                                                                                                                                                                                                                                                                                                                                                                             |
| Resolución              | Con `devicePixelRatio` 2, `canvas.width` 1280 y `canvas.height` 1200.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 1440 px y 375 px        | Canvas de 803×753 y 224×210, proporción 1,0667. Sin scroll horizontal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Controles               | `← ↑ → ↓ SALTAR · W A S D SALTAR · P PAUSA`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Táctil                  | (`hasTouch` + `isMobile`, 390 px) Cruceta izquierda de 56×56 con ↑ (103, 693) encima de ← (44, 752) y → (162, 752), y ↓ (103, 811) debajo; `aria-label` "Saltar arriba", "Saltar a la izquierda", "Saltar a la derecha" y "Saltar abajo". Zona derecha sin botones. Tocar el CRT ("TOCA PARA EMPEZAR") empieza la partida. Cada botón despacha `keydown` y `keyup` de su código; mantener ← 600 ms da un `keydown` al tocar, un `keyup` al soltar y un solo salto. Toques ← ← → llevan la rana 7 → 6 → 5 → 6; cada toque de ↑ sube exactamente una fila. |
| Rendimiento             | A 375 px con dpr 1 y con dpr 2: mediana de 16,7 ms entre frames y p95 de 17,5–17,6 ms. El glow se mantiene en todas las entidades.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Otros juegos            | `/#/jugar/asteroids`, `/#/jugar/tetris`, `/#/jugar/arkanoid` y `/#/jugar/snake` empiezan con Espacio; `/#/jugar/gloton` sigue simulando.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Red                     | Ninguna petición a `/games/frogger/…` ni a archivos de audio.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Consola                 | 0 errores al abrir, jugar, terminar y salir de `/#/jugar/frogger` contra `next start`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Limpieza                | Se borró la fila de prueba (id 28). `public.scores` tiene 0 filas de `frogger`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

Notas:

- Completar una ronda con el bot y las vidas reales no fue práctico (en 400 s, con vidas extra, solo llenó una boca), así que se usaron dos cambios locales sin commitear: `INITIAL_LIVES` 50 en `engine.ts` para las pruebas de muro, agua y vuelta a tierra; y, para la ronda completa y la boca ocupada, una tabla temporal de carriles con el río cubierto por dos troncos de 10 celdas y los vehículos fuera de la ruta, todos a 0,05 celdas/s, para poder medir el × 1,15 y la vuelta a las `x` iniciales. Después se restauraron `config.ts`, `lanes.ts` y `engine.ts` (`config.ts` idéntico al original con `diff`) y se volvió a compilar antes del resto de recorridos.
- El criterio "Al aterrizar en la fila 12, la rana vuelve a la columna entera…" no se puede dar tal cual: desde el río solo se llega a la orilla (fila 7). Se verificó ahí, que es la regla del motor (`x = round(x)` en las filas 0 y 7–13).
- Una dirección pulsada en el mismo frame en que Espacio arranca la partida se descarta, porque `initGame()` reaparece la rana y llama a `input.clear()`, como pide el spec.
- Con `next dev`, React avisa en la consola "Encountered two children with the same key" por `SALTAR`: la tira de controles de `GamePlayer.tsx` usa `control.label` como `key` y FROGGER tiene dos controles SALTAR. Pasa igual con los dos MOVER de SNAKE. El aviso solo existe en desarrollo y no sale contra `next start`. Se deja para un spec del player, porque este no toca `GamePlayer.tsx`.
- En el pulido: `GLOW_BASE` 10 en `config.ts` (el spec la usa en la fórmula del glow pero no la listaba); ojos sobre cuencas que sobresalen del borde superior de la rana; patas recogidas en reposo y extendidas durante el salto; un contorno de 2 px en `bg` alrededor de la rana, porque frente a los troncos su contraste de luminancia es solo de 1,21–1,32:1 en las tres skins (en RETRO los dos son verdes); y un carril tenue en `laneLine` detrás de la barra de tiempo.
- Ningún carril resultó imposible de cruzar con la tabla del spec; no se cambiaron velocidades ni `x` iniciales.
