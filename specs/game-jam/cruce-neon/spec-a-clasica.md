# SPEC GJ — Juego real: CRUCE NEÓN · Variante A (Clásica)

> **Estado:** Draft
> **Depende de:** SPEC 06, SPEC 07
> **Game jam:** tema "Frogger — cruza la carretera y el río sin convertirte en papilla", variante A de 3 (`specs/game-jam/cruce-neon/`)
> **Fecha:** 2026-10-17
> **Objetivo:** Crear un juego de cruzar carriles en el que un bit de neón atraviesa una autopista y un río de plasma hasta cinco portales, y hacerlo jugable en `#/jugar/cruce-neon`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

El tema del game jam es Frogger: cruzar la carretera y el río sin acabar aplastado.
El catálogo no tiene ningún juego real de cruzar carriles. Sí tiene RANARIA (`ranaria`), un Frogger simulado: el player sube la puntuación con un intervalo.
Las reglas del game jam piden siempre una fila nueva, así que CRUCE NEÓN no sustituye a RANARIA: se añade como 9.º juego.
No hay referencia en `references/started-games/` (solo `02-asteroids`, `03-tetris` y `04-arkanoid`), así que el motor se escribe desde cero.
Encaja en el Vault porque todo se dibuja con primitivas neón sobre una cuadrícula: coches como estelas de luz, balsas cian y un bit verde.
Este spec crea el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
Esta variante es el núcleo más directo del tema: subir de abajo arriba, llenar 5 portales con un temporizador de 30 s por bit y 3 vidas.
La variante B (`spec-b-ida-y-vuelta.md`) cambia la meta por viajes de ida y vuelta con multiplicador y peligros nuevos por nivel.
La variante C (`spec-c-semaforos.md`) le da la vuelta al tema: el jugador controla los semáforos y los bits cruzan solos.

## Alcance

**Dentro:**

- Migración `add_cruce_neon_game`: fila nueva en `public.games` con `sort_order` 9.
- Portada `.cover-cruce-neon` en `app/globals.css`.
- Motor de CRUCE NEÓN en TypeScript en `lib/cruce-neon/`, sin React, con las mecánicas de "Modelo de datos": cuadrícula de 15×12 celdas de 48 px, saltos de una celda con flechas y WASD, 5 carriles de tráfico, 4 de río con balsas, 5 portales, 30 s por bit, 3 vidas y niveles que aceleran el tráfico.
- Paleta neón del Vault en el canvas: bit `--green`, portales `--magenta`, balsas `--cyan`, vehículos de colores por carril y barra de tiempo verde, amarilla o magenta.
- Definición `cruceNeonEngine` en `lib/cruce-neon/definition.ts` y entrada en `lib/engines/registry.ts`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: portada nueva, vehículos, balsas, portales, bit, papilla, barra de tiempo y la tira de controles.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Retirar o sustituir RANARIA.
- Viajes de ida y vuelta, multiplicador, boyas que se hunden y patrulla (variante B).
- Semáforos controlados por el jugador (variante C).
- Vidas extra, objetos de bonus, tortugas, cocodrilos y enemigos en la orilla.
- Carriles aleatorios o generados por nivel.
- Leaderboard real en el detalle (`#/juego/cruce-neon`). Sigue con `seededScores`.
- `best` y `plays` calculados.
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (migración `add_cruce_neon_game` en `supabase/migrations/`)

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, sort_order)
values (
  'cruce-neon',
  'CRUCE NEÓN',
  'Cruza la autopista y el río sin acabar hecho papilla.',
  'Guía a un bit de neón a través de cinco carriles de tráfico y cuatro corrientes de plasma con balsas a la deriva. Llévalo a uno de los cinco portales antes de que se agoten sus 30 segundos. Llena los cinco para subir de nivel: el tráfico acelera. Tres vidas.',
  'ARCADE', 'cover-cruce-neon', 'magenta', 0, '0', 9
);
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_add_cruce_neon_game.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`ARCADE`) y `color` (`magenta`) respetan los CHECK de la tabla.
- Hoy (2026-10-17) el `sort_order` más alto es 8 (`duelo-pixel`), así que CRUCE NEÓN va en el 9.
- `best` 0 y `plays` `'0'`, el default del contrato.
- La portada `.cover-cruce-neon` va junto a las demás `.cover-*` de `app/globals.css`: mitad superior con ondas cian del río, mitad inferior con estelas magenta y amarillas de la autopista y un cuadrado verde (el bit) en la mediana. Se diseña con `/frontend-design` y no se parece a `.cover-rana` (bandas cian y círculo verde).
- El Home pasa a mostrar "9 JUEGOS", porque `homeStats(useGames().length)`.
- `lib/home.ts` no cambia: `RECENT_SCORES` no tiene filas de este juego.

### Motor (`lib/cruce-neon/`)

| Archivo         | Contenido                                                                                                                                                                   |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`     | `W` 720, `H` 600, `CELL` 48, `COLS` 15, `ROWS` 12, zonas, posición inicial, portales, tiempos, puntos, velocidad por nivel, `MAX_DT`, `MAX_SCORE`, `COLORS` y `CAR_COLORS`. |
| `lanes.ts`      | Tipos `Lane` y `LaneObject`, `LANES` (los 9 carriles), `speedFactor(level)`, `resetLanes()`, `moveLanes(lanes, dt, factor)` y `overlapsX(a0, a1, b0, b1)`.                  |
| `input.ts`      | `createInput(target, isActive)`: cola de saltos (`nextHop`), pulsación de Espacio (`pressed`), `clear()` y `destroy()`.                                                     |
| `engine.ts`     | `createCruceNeonGame(canvas, callbacks): GameEngine`.                                                                                                                       |
| `definition.ts` | `cruceNeonEngine: EngineDefinition`.                                                                                                                                        |

No hay `types.ts` propio: los tipos van en `lanes.ts` y el motor usa los de `lib/engines/types.ts`.

```ts
// lib/cruce-neon/definition.ts
export const cruceNeonEngine: EngineDefinition = {
  id: "cruce-neon",
  width: W, // 720
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "SALTAR" },
    { keys: ["W", "A", "S", "D"], label: "SALTAR" },
  ],
  create: createCruceNeonGame,
};
```

```ts
// config.ts
export const CELL = 48; // px
export const COLS = 15;
export const ROWS = 12;
export const BOARD_H = ROWS * CELL; // 576
export const STRIP_H = 24; // franja inferior con la barra de tiempo
export const W = COLS * CELL; // 720
export const H = BOARD_H + STRIP_H; // 600
export const START = { col: 7, row: 11 }; // centro (360, 552)
export const PORTAL_COLS = [1, 4, 7, 10, 13];
export const RIVER_ROWS = [1, 2, 3, 4];
export const ROAD_ROWS = [6, 7, 8, 9, 10];
export const BIT_HALF = 16; // caja de choque del bit: 32×32
export const CAR_INSET = 4; // px que se recorta la caja de cada vehículo por los lados
export const X_MIN = 24; // centro mínimo tras un salto lateral
export const X_MAX = 696; // centro máximo tras un salto lateral
export const TRACK_MARGIN = 240; // px fuera de pantalla a cada lado
export const TRACK = W + 2 * TRACK_MARGIN; // 1200
export const TIME_LIMIT = 30; // s por bit
export const DEAD_MS = 1000;
export const START_LIVES = 3;
export const POINTS_STEP = 10; // por fila nueva
export const POINTS_HOME = 50; // por bit en un portal
export const POINTS_PER_SECOND = 10; // × segundos enteros que quedan
export const POINTS_LEVEL = 1000; // al llenar los 5 portales
export const SPEED_STEP = 0.15; // por nivel
export const SPEED_MAX = 1.75;
export const HOP_QUEUE = 2;
export const HOP_ANIM_MS = 80; // solo visual
export const MAX_DT = 0.05; // s
export const MAX_SCORE = 9_999_999; // CHECK de public.scores

// Colores del canvas, copiados de los tokens de :root.
export const COLORS = {
  bg: "#0a0a0f", // --bg (franja inferior)
  road: "#0f0f18", // --bg-2
  safe: "#15151f", // --bg-3 (filas 0, 5 y 11)
  river: "rgba(0, 245, 255, 0.07)", // --cyan al 7 %
  laneLine: "rgba(255, 255, 255, 0.06)", // --line-2
  bankEdge: "rgba(0, 255, 136, 0.35)", // --green al 35 %
  portal: "#ff006e", // --magenta
  portalFilled: "#00ff88", // --green
  bit: "#00ff88", // --green
  eyes: "#0a0a0f", // --bg
  raftFill: "rgba(0, 245, 255, 0.22)", // --cyan al 22 %
  raftEdge: "#00f5ff", // --cyan
  headlight: "#e6e9ff", // --ink
  splat: "#ff006e", // --magenta
  timerOk: "#00ff88", // --green
  timerWarn: "#f5ff00", // --yellow
  timerLow: "#ff006e", // --magenta
};
export const CAR_COLORS: Record<number, string> = {
  10: "#f5ff00", // --yellow
  9: "#00f5ff", // --cyan
  8: "#ffcf3a", // --gold
  7: "#ff006e", // --magenta
  6: "#c7d0e0", // --silver
};
```

Tablero (720×600). La celda `(col, fila)` tiene su centro en `(col × 48 + 24, fila × 48 + 24)`:

| Filas     | Zona              | Qué hay                                                                                   |
| --------- | ----------------- | ----------------------------------------------------------------------------------------- |
| 0         | Orilla de llegada | Muro con 5 portales en las columnas 1, 4, 7, 10 y 13. El resto de la fila es muro mortal. |
| 1–4       | Río de plasma     | Balsas que se mueven en horizontal. Fuera de una balsa, el bit se ahoga.                  |
| 5         | Mediana           | Zona segura.                                                                              |
| 6–10      | Autopista         | Vehículos que se mueven en horizontal. Tocar uno es atropello.                            |
| 11        | Acera de salida   | Zona segura. El bit aparece en `(7, 11)`, centro `(360, 552)`.                            |
| y 576–600 | Franja inferior   | Barra de tiempo del bit actual.                                                           |

Carriles (`LANES`), valores del nivel 1:

| Fila | Tipo    | Sentido | Velocidad (px/s) | Largo (celdas / px) | Objetos | Separación (px) | `offset` (px) | `x` inicial (px)    |
| ---- | ------- | ------- | ---------------- | ------------------- | ------- | --------------- | ------------- | ------------------- |
| 10   | coche   | ←       | 60               | 1 / 48              | 4       | 300             | 120           | −120, 180, 480, 780 |
| 9    | coche   | →       | 80               | 1 / 48              | 3       | 400             | 0             | −240, 160, 560      |
| 8    | camión  | ←       | 100              | 2 / 96              | 3       | 400             | 200           | −40, 360, 760       |
| 7    | bólido  | →       | 140              | 1 / 48              | 2       | 600             | 300           | 60, 660             |
| 6    | tráiler | ←       | 70               | 3 / 144             | 2       | 600             | 100           | −140, 460           |
| 4    | balsa   | →       | 50               | 3 / 144             | 3       | 400             | 250           | 10, 410, 810        |
| 3    | balsa   | ←       | 70               | 2 / 96              | 4       | 300             | 150           | −90, 210, 510, 810  |
| 2    | balsa   | →       | 90               | 4 / 192             | 2       | 600             | 350           | 110, 710            |
| 1    | balsa   | ←       | 60               | 3 / 144             | 3       | 400             | 50            | −190, 210, 610      |

- `x` es el borde izquierdo del objeto. `x` inicial del objeto `i` = `offset + i × separación − 240`.
- Separación = `TRACK / objetos` (1200 / 2, 3 o 4), así que los huecos se repiten igual en cada vuelta.
- Cada objeto avanza `velocidad × speedFactor(nivel) × dt` en su sentido.
- Envolvente: si un objeto que va a la derecha llega a `x ≥ 960` (`W + 240`), `x −= 1200`; si uno que va a la izquierda baja de `x = −240`, `x += 1200`. Como el objeto más largo mide 192 px, nunca aparece ni desaparece dentro de la pantalla.
- `resetLanes()` coloca todos los objetos en su `x` inicial. No hay azar: dos partidas iguales ven el mismo tráfico.

Velocidad por nivel, `speedFactor(n) = min(1 + 0,15 × (n − 1), 1,75)`:

| Nivel | Factor | Bólido (fila 7) | Coche (fila 10) | Balsa (fila 4) |
| ----- | ------ | --------------- | --------------- | -------------- |
| 1     | 1,00   | 140 px/s        | 60 px/s         | 50 px/s        |
| 2     | 1,15   | 161 px/s        | 69 px/s         | 57,5 px/s      |
| 3     | 1,30   | 182 px/s        | 78 px/s         | 65 px/s        |
| 4     | 1,45   | 203 px/s        | 87 px/s         | 72,5 px/s      |
| 5     | 1,60   | 224 px/s        | 96 px/s         | 80 px/s        |
| 6+    | 1,75   | 245 px/s        | 105 px/s        | 87,5 px/s      |

Puntuación:

| Acción                                                   | Puntos                                  |
| -------------------------------------------------------- | --------------------------------------- |
| Saltar a una fila (10 a 1) que este bit aún no ha pisado | 10                                      |
| Llegar a un portal libre                                 | 50                                      |
| Bonus de tiempo al llegar                                | 10 × segundos enteros que quedan        |
| Llenar el 5.º portal del nivel                           | 1 000 (además de los puntos de llegada) |

- "Fila no pisada" se lleva con `bestRow` por bit: empieza en 11 y cada salto a una fila menor que `bestRow` suma 10 y la actualiza. Bajar y volver a subir no suma. Al llegar a un portal o al morir, `bestRow` vuelve a 11.
- Un bit suma como mucho 100 en saltos (filas 10 a 1). La fila 0 no da los 10: da la llegada.
- El bonus de tiempo es como mucho 290: los 11 saltos necesitan al menos 11 frames, así que siempre quedan menos de 30 s enteros.
- Máximo por nivel: 5 × (100 + 50 + 290) + 1 000 = 3 200. Cada vida perdida puede sumar además hasta 100 en saltos.
- No hay techo: los niveles no se acaban y el tráfico deja de acelerar en el 6. El motor limita la puntuación con `score = Math.min(score + puntos, MAX_SCORE)`. Llegar a 9 999 999 exigiría unos 3 125 niveles.

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Fase inicial. Tablero, 5 portales vacíos y el tráfico y las balsas moviéndose a velocidad del nivel 1, como fondo animado. No hay bit ni barra de tiempo. Espacio llama a `initGame()` (`score` 0, `level` 1, `lives` 3, portales vacíos, `resetLanes()`, bit en `(7, 11)`, `bestRow` 11, tiempo 30 s) y pasa a `playing`. |
| `playing`  | Reglas de abajo. El bit salta, el tiempo corre y el tráfico se mueve.                                                                                                                                                                                                                                                      |
| `dead`     | Tras perder una vida si quedan vidas. Dura 1 000 ms. El bit no se dibuja y en su lugar se ve la papilla. El tráfico sigue moviéndose, el tiempo no corre y los saltos se descartan. Al acabar, el bit reaparece en `(7, 11)` con 30 s y `bestRow` 11, y la fase vuelve a `playing`.                                        |
| `gameover` | Se alcanza al perder la 3.ª vida o con `end()`. Todo queda quieto. El bit no se dibuja; la papilla de la última muerte, si la hay, se sigue viendo. No hay input. Espacio no reinicia.                                                                                                                                     |

Reglas del motor:

- En cada frame de `playing`, en este orden:
  - El tiempo baja `dt`.
  - Los carriles se mueven con `moveLanes(lanes, dt, speedFactor(level))`.
  - Si el bit está en una fila de río, su `x` se mueve igual que las balsas de su fila (`velocidad × factor × dt` con su signo).
  - Se aplica como mucho un salto de la cola.
  - Se comprueban, en este orden, las muertes y la llegada.
- Saltos:
  - ↑ / W resta 1 a la fila; ↓ / S suma 1; ← / A resta 48 a `x`; → / D suma 48 a `x`.
  - ↓ en la fila 11 no hace nada. Un salto lateral que dejaría el centro fuera de `24..696` no hace nada.
  - El salto vertical no cambia `x`: sobre el río, `x` es continua y no se ajusta a la cuadrícula.
  - Mientras el bit no pisa el río, `x` es un centro de celda (360 ± 48 × n). Si vuelve del río a la mediana, conserva la `x` continua que traía y la mantiene en la autopista.
- Muertes:
  - Atropello: el bit está en una fila de autopista y su caja `x − 16..x + 16` se solapa con la caja de un vehículo de esa fila, `x + 4..x + largo − 4`.
  - Ahogado: el bit está en una fila de río y su centro `x` no está dentro de `x..x + largo` de ninguna balsa de esa fila.
  - Arrastrado: el bit está en una fila de río y su centro sale de `0..720`.
  - Muro: el bit salta a la fila 0 y su columna (`floor(x / 48)`) no es 1, 4, 7, 10 ni 13.
  - Portal ocupado: el bit salta a un portal que ya tiene un bit.
  - Tiempo: el tiempo llega a 0.
- Al morir: `lives −= 1`, se guarda la posición de la papilla y la cola de saltos se vacía. Con vidas, `dead` durante 1 000 ms; con 0 vidas, `gameover`.
- Llegada: el bit salta a un portal libre. Suma 50 + 10 × `floor(tiempo)`. El portal queda lleno.
  - Si es el 5.º, suma 1 000, `level += 1` y los 5 portales se vacían. Los carriles conservan su posición y pasan a la velocidad del nivel nuevo.
  - El bit reaparece en `(7, 11)` en el mismo frame, con 30 s y `bestRow` 11. No hay fase `dead`.
- Desde el inicio, ↑ pulsada en el primer segundo lleva el bit a `(7, 10)` sin peligro: el coche más cercano de la fila 10 (`x` 480, hacia la izquierda) no toca la columna 7 hasta los 1,8 s.
- Resolución lógica 720×600, con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- Todos los límites usan `W`, `H`, `CELL`, `COLS` y `ROWS`, nunca `canvas.width` ni `canvas.height`.
- `dt` en segundos, limitado a `MAX_DT` (50 ms). El objeto más rápido (245 px/s en el nivel 6) avanza como mucho 12,25 px por frame, menos que la mitad de la caja del bit (32 px): no hay efecto túnel.
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input y la cola de saltos. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`. El tiempo del bit y el temporizador de `dead` se conservan.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa. No dibuja ningún texto.
- Lo que sí dibuja además del tablero: los portales llenos y la barra de tiempo, porque no caben en el HUD.
- Mapeo al HUD: `score` = puntuación, `level` = nivel, `lives` = vidas que quedan (3 → 0).
- `onStats` solo cuando cambian `score`, `level` o `lives`. `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- Dibujo con primitivas (sin imágenes):
  - Fondo de cada zona: filas 0, 5 y 11 en `COLORS.safe` con una línea de 2 px en `COLORS.bankEdge` en su borde; río en `COLORS.road` con `COLORS.river` encima; autopista en `COLORS.road` con líneas discontinuas de 1 px en `COLORS.laneLine` entre carriles.
  - Muro de la fila 0: `COLORS.safe`. Cada portal es un `strokeRect` de 40×40 y 2 px centrado en su celda, en `COLORS.portal` con glow. Un portal lleno cambia el trazo a `COLORS.portalFilled` y lleva dentro un cuadrado de 24×24 del mismo color.
  - Cada vehículo es un `fillRect` de su largo × 32 (8 px de margen arriba y abajo) en `CAR_COLORS[fila]` con glow, y dos faros de 4×4 en `COLORS.headlight` en el lado hacia el que avanza.
  - Cada balsa es un `fillRect` de su largo × 36 (6 px de margen) en `COLORS.raftFill` con un `strokeRect` de 2 px en `COLORS.raftEdge` con glow.
  - El bit es un cuadrado de 32×32 en `COLORS.bit` con glow y dos ojos de 4×4 en `COLORS.eyes` hacia el último salto. Durante `HOP_ANIM_MS` (80 ms) tras un salto se dibuja a 28×36 en el sentido del salto; es solo visual.
  - La papilla es una estrella de 8 rayos de 2 px en `COLORS.splat` con glow, de 40 px de diámetro, en la posición de la muerte.
  - Barra de tiempo: `fillRect(8, 584, 704 × tiempo / 30, 8)`. `COLORS.timerOk` con más de 10 s, `COLORS.timerWarn` entre 10 y 5 s, y `COLORS.timerLow` por debajo de 5 s. En `ready` y `gameover` no se dibuja.
  - El glow es `shadowBlur` con `shadowColor` igual al color de trazo o relleno.
  - Tamaños, glow y forma de la papilla se ajustan en el pulido sin cambiar las cajas de choque.
- Los colores se leen de `config.ts`. Nada se lee con `getComputedStyle` en cada frame.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD` y `Space`. La P no es del juego: la gestiona el player.
- `preventDefault()` de los códigos del juego solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- Los saltos se leen en `keydown`, sin autorrepetición (`event.repeat` se ignora): mantener una flecha da un solo salto.
- Los saltos solo se encolan en `playing`. En `ready` y `dead` se capturan pero se descartan.
- Cola de 2 saltos como máximo; si está llena, el salto nuevo se descarta. El motor saca uno por frame.
- Espacio se lee como pulsación de un frame (`pressed`) y solo hace algo en `ready`. En `playing` y `dead` se captura (para que no haga scroll) pero no hace nada.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- `clear()` vacía la cola de saltos y descarta las pulsaciones pendientes.

### Textos

| Elemento          | Texto                                           |
| ----------------- | ----------------------------------------------- |
| Overlay de inicio | "CRUCE NEÓN" y "PULSA ESPACIO PARA EMPEZAR"     |
| Tira de controles | `← ↑ → ↓` SALTAR · `W A S D` SALTAR · `P` PAUSA |

## Plan de implementación

1. **Catálogo.** Comprobar con `select max(sort_order) from public.games` que sigue en 8 y con `select count(*) from public.games where id = 'cruce-neon'` que da 0. Si no, parar y preguntar al usuario. Crear `pending_add_cruce_neon_game.sql`, aplicarlo con `apply_migration`, renombrarlo con su versión y regenerar `lib/supabase/database.types.ts`. Verificación: `select id, title, cat, color, cover, best, plays, sort_order from public.games where id = 'cruce-neon'` devuelve `cruce-neon`, `CRUCE NEÓN`, `ARCADE`, `magenta`, `cover-cruce-neon`, `0`, `0`, `9`; la Biblioteca muestra CRUCE NEÓN en la 9.ª posición; `#/jugar/cruce-neon` abre la simulación.
2. **Portada.** `.cover-cruce-neon` en `app/globals.css`, junto a `.cover-duelo`, diseñada con `/frontend-design`. Verificación: la tarjeta de la Biblioteca y el detalle `#/juego/cruce-neon` muestran la portada a 1440 px y 375 px.
3. **Base del motor.** `config.ts` y `lanes.ts` con `LANES`, `speedFactor`, `resetLanes`, `moveLanes` y `overlapsX`. Verificación: `npm run lint` y `npm run build` pasan.
4. **Input.** `input.ts` con la cola de saltos, la pulsación de Espacio y la regla de `preventDefault`. Verificación: `npm run build` pasa.
5. **Motor.** `engine.ts` con las fases, `initGame`, el movimiento de carriles, el arrastre de las balsas, los saltos, las muertes, los portales, el tiempo, los niveles, el dibujo, `setupCanvas`, `setPaused`, `end`, `destroy` y los callbacks. Verificación: `npm run build` pasa.
6. **Registro.** `definition.ts` y la entrada `"cruce-neon": cruceNeonEngine` en `ENGINES`. Verificación: en `#/jugar/cruce-neon` Espacio empieza la partida, ↑ suma 10 en el HUD y quedarse quieto 30 s quita un ♥.
7. **Pulido con `/frontend-design`.** Vehículos, faros, balsas, portales, bit, papilla, barra de tiempo, glow y la tira de controles a 1440 px y 375 px, sin cambiar la estética del Vault.
8. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/cruce-neon` a 1440 y 375 px, con capturas (no se versionan). Leer el bit, los vehículos y las balsas interceptando `fillRect` y `strokeRect` del contexto 2D. Como el tráfico es determinista, un bot dentro de la página calcula cuándo saltar. Para llenar los 5 portales y subir de nivel sin depender del bot, usar un cambio local sin commitear en `LANES` (autopista sin vehículos y balsas de 15 celdas) y anotarlo. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `add_cruce_neon_game` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `cruce-neon` con título `CRUCE NEÓN`, `cat` `ARCADE`, `color` `magenta`, `cover` `cover-cruce-neon`, `best` 0, `plays` `0` y `sort_order` 9, y las otras 8 filas no han cambiado.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] La Biblioteca muestra CRUCE NEÓN con la portada `.cover-cruce-neon` en la 9.ª posición.
- [ ] El Home muestra "9 JUEGOS".
- [ ] `ENGINES` tiene las entradas `asteroids`, `tetris`, `arkanoid`, `snake` y `cruce-neon`, y `GamePlayer.tsx` no ha cambiado.
- [ ] Al abrir `/#/jugar/cruce-neon` se ve "CRUCE NEÓN / PULSA ESPACIO PARA EMPEZAR" sobre el tablero con el tráfico en movimiento y sin bit, y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / ♥ ♥ ♥ / 01.
- [ ] Espacio empieza la partida, el overlay desaparece, el bit aparece en `(7, 11)` (centro 360, 552) y la barra de tiempo se ve llena y verde.
- [ ] Al empezar, los vehículos y las balsas están en las `x` iniciales de la tabla de carriles.
- [ ] ↑ / W, ↓ / S, ← / A y → / D hacen saltar el bit una celda (48 px) arriba, abajo, a la izquierda y a la derecha.
- [ ] Mantener una flecha pulsada da un solo salto.
- [ ] ↓ en la fila 11 no hace nada, y ← en la columna 0 o → en la columna 14 no hacen nada.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] ↑ en el primer segundo lleva el bit a `(7, 10)` sin morir y el HUD marca 10.
- [ ] Bajar y volver a subir a una fila ya pisada por ese bit no suma puntos.
- [ ] Los vehículos de la fila 7 se mueven a 140 px/s hacia la derecha y los de la fila 10 a 60 px/s hacia la izquierda en el nivel 1.
- [ ] Sobre una balsa, el bit se mueve con ella a su velocidad (50 px/s en la fila 4 del nivel 1).
- [ ] Tocar un vehículo quita un ♥ del HUD, el bit desaparece y se ve la papilla `#ff006e` durante ~1 000 ms; después el bit reaparece en `(7, 11)` con la barra llena.
- [ ] Saltar a una fila de río fuera de una balsa quita un ♥.
- [ ] Dejar que una balsa arrastre el centro del bit fuera de `0..720` quita un ♥.
- [ ] Saltar a la fila 0 en una columna sin portal (por ejemplo la 0 o la 2) quita un ♥.
- [ ] Saltar a un portal ya lleno quita un ♥.
- [ ] Quedarse quieto 30 s quita un ♥; la barra pasa a `#f5ff00` con 10 s y a `#ff006e` con 5 s.
- [ ] Durante los ~1 000 ms de la papilla, las flechas no mueven nada y el tráfico sigue moviéndose.
- [ ] Llegar a un portal libre suma 50 + 10 × los segundos enteros que quedan (con 18,6 s, 230), llena el portal en `#00ff88` y el bit nuevo aparece en `(7, 11)` en el mismo frame.
- [ ] Un bit que sube de la fila 11 al portal sin bajar suma 100 en saltos antes de la llegada.
- [ ] Llenar el 5.º portal suma 1 000 más, el nivel del HUD pasa a 02, los 5 portales se vacían y el bólido de la fila 7 pasa a 161 px/s.
- [ ] En el nivel 6 el bólido va a 245 px/s, y en el 7 sigue a 245 px/s.
- [ ] Perder la 3.ª vida abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] FIN abre el modal con la puntuación actual; el tráfico queda quieto y el bit desaparece.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa: `fillText` no se llama nunca.
- [ ] El bit es `#00ff88`, los portales vacíos `#ff006e`, el borde de las balsas `#00f5ff` y los vehículos de las filas 10, 9, 8, 7 y 6 son `#f5ff00`, `#00f5ff`, `#ffcf3a`, `#ff006e` y `#c7d0e0`.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas y la barra de tiempo; al reanudar, el bit no salta solo y el tiempo sigue donde estaba.
- [ ] En el modal se pueden escribir iniciales con espacios, con la letra P y con W, A, S y D sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'cruce-neon'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña CRUCE NEÓN del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/cruce-neon`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / ♥ ♥ ♥ / 01 y los portales vacíos.
- [ ] SALIR lleva a `#/juego/cruce-neon`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1440 y `canvas.height` es 1200, y → en la columna 14 sigue sin mover el bit.
- [ ] A 1440 px y a 375 px no hay scroll horizontal, y el canvas mantiene la proporción 720:600 (6:5) dentro del CRT.
- [ ] La tira de controles muestra `← ↑ → ↓` SALTAR · `W A S D` SALTAR · `P` PAUSA, y en táctil se ve "REQUIERE TECLADO".
- [ ] Mover el ratón o hacer clic sobre el canvas no cambia nada.
- [ ] `/#/jugar/asteroids`, `/#/jugar/tetris`, `/#/jugar/arkanoid` y `/#/jugar/snake` siguen funcionando y `/#/jugar/ranaria` sigue simulando.
- [ ] No hay peticiones a `/games/cruce-neon/…` ni a archivos de audio en la pestaña de red.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/cruce-neon`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** fila nueva `cruce-neon` con `sort_order` 9. Es la regla del game jam: nunca sustituye un juego simulado.
- **No:** sustituir RANARIA, aunque es el Frogger simulado del catálogo. Retirarla o reconvertirla va en su propio spec. Decisión del agente (game jam); revisar.
- **Sí:** id `cruce-neon` y título CRUCE NEÓN, comunes a las tres variantes. Nombra la mecánica (cruzar) y la estética del Vault sin usar la marca Frogger. Decisión del agente (game jam); revisar.
- **No:** `frogger`, `rana-neon` ni `papilla`. El primero es una marca y choca con RANARIA; los otros dos atan el juego a una rana que no aparece.
- **Sí:** `cat` `ARCADE`, aunque es la categoría con más juegos (4). El núcleo es de reflejos y llamarlo PUZZLE engañaría. La variante C sí es PUZZLE. Decisión del agente (game jam); revisar.
- **Sí:** `color` `magenta`, el menos usado del catálogo (1, TETRIS). Decisión del agente (game jam); revisar.
- **No:** `green`, que ya tienen SNAKE, INVASORES y RANARIA.
- **Sí:** `best` 0 y `plays` `'0'`, el default del contrato. Decisión del agente (game jam); revisar.
- **Sí:** portada nueva `.cover-cruce-neon` con río cian, estelas magenta y amarillas y un bit verde cuadrado. Decisión del agente (game jam); revisar.
- **No:** reutilizar `.cover-rana`. Es la portada de RANARIA, que sigue en el catálogo.
- **Sí:** juego original, sin código ni assets de referencia.
- **Sí:** cuadrícula de 15×12 celdas de 48 px más una franja de 24 px: 720×600 (6:5). 15 columnas dejan los 5 portales simétricos (1, 4, 7, 10 y 13) y el bit centrado en la 7. Decisión del agente (game jam); revisar.
- **No:** 768×576 (16 columnas), donde los 5 portales no quedan centrados.
- **Sí:** 5 carriles de autopista y 4 de río, con mediana y acera seguras. Decisión del agente (game jam); revisar.
- **Sí:** tráfico determinista con `offset` fijos y separaciones regulares. Es justo para el leaderboard y hace verificables los criterios. Decisión del agente (game jam); revisar.
- **No:** carriles o huecos aleatorios.
- **Sí:** saltos discretos de una celda, uno por pulsación y uno por frame, con cola de 2. Decisión del agente (game jam); revisar.
- **Sí:** `x` continua sobre las balsas, como en el arcade original: el bit no se recoloca en la cuadrícula al saltar desde el río.
- **Sí:** 30 s por bit y bonus de 10 por segundo entero restante. Decisión del agente (game jam); revisar.
- **Sí:** 10 por fila nueva, 50 por portal y 1 000 al llenar los cinco. Decisión del agente (game jam); revisar.
- **Sí:** nivel nuevo al llenar los 5 portales; el tráfico acelera un 15 % por nivel hasta ×1,75 en el nivel 6. Decisión del agente (game jam); revisar.
- **No:** carriles nuevos o más vehículos por nivel. Cambiarían la tabla de carriles en cada nivel y la verificación.
- **Sí:** 3 vidas sin vidas extra, y fase `dead` de 1 000 ms con la papilla. La papilla es el chiste del tema. Decisión del agente (game jam); revisar.
- **No:** vida extra por puntos. Complica el máximo y el ritmo de la partida.
- **Sí:** `ready` con el tráfico en movimiento y sin bit, como fondo animado; `initGame()` vuelve a colocar el tráfico en sus `x` iniciales. Decisión del agente (game jam); revisar.
- **Sí:** en `gameover` todo queda quieto y la papilla de la última muerte se sigue viendo.
- **Sí:** el canvas dibuja la barra de tiempo y los portales llenos, porque el HUD no tiene tiempo ni portales. No dibuja texto.
- **Sí:** motor sin React en `lib/cruce-neon/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault en el canvas y primitivas en vez de imágenes. No hay `public/games/cruce-neon/`.
- **Sí:** HUD de React y modal de la plataforma.
- **Sí:** límite `MAX_SCORE` en el motor, porque los niveles no se acaban.
- **No:** sonido. Ningún juego real del Vault lo tiene y el SPEC 07 dejó fuera su infraestructura. Decisión del agente (game jam); revisar.
- **No:** ratón y táctil. Van en su propio spec.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                                            | Mitigación                                                                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El catálogo tiene dos juegos de cruzar carriles: RANARIA (simulado) y CRUCE NEÓN (real).                          | Aceptado en el game jam. Portada y textos distintos. Retirar RANARIA queda para su propio spec, que tendrá que mirar sus filas en `public.scores`.                                  |
| El `sort_order` 9 o el id `cruce-neon` se ocupan antes de implementar (el CHECK `unique` haría fallar el insert). | El paso 1 comprueba el máximo y el id antes de la migración. Si cambian, se para y se pregunta.                                                                                     |
| Un frame largo hace que un vehículo atraviese el bit.                                                             | `dt` limitado a 50 ms: el objeto más rápido avanza 12,25 px por frame, menos que la caja de 32 px.                                                                                  |
| La `x` continua sobre el río deja el bit entre dos celdas al saltar a la mediana.                                 | Aceptado: es el comportamiento del arcade original. Las cajas de choque usan `x`, no la columna, así que no hay celdas ambiguas. Solo la llegada usa `floor(x / 48)`.           |
| La puntuación no tiene techo.                                                                                     | `MAX_SCORE` en cada suma. A 3 200 por nivel, el tope exige más de 3 000 niveles.                                                                                                    |
| El tráfico determinista permite memorizar una ruta.                                                               | Aceptado: es lo que hace justo el leaderboard. La variante B añade peligros por nivel si hace falta más variedad.                                                                   |
| `shadowBlur` en unos 30 objetos baja el rendimiento.                                                              | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2, quitar el glow de las balsas y dejarlo en vehículos, portales y bit. Se anota.                       |
| Llenar 5 portales y subir de nivel jugando en Playwright es lento.                                                | Bot que usa el tráfico determinista y, para el nivel, cambio local sin commitear en `LANES` (autopista vacía y balsas de 15 celdas), como el motor de prueba del SPEC 07. Se anota. |
| Al perder la 3.ª vida, el HUD muestra "—" en vidas, porque `GamePlayer.tsx` trata 0 como sin vidas.               | Aceptado: pasa igual en ASTEROIDS y ARKANOID, y cambiarlo toca el player.                                                                                                           |
| El canvas 6:5 deja más franja negra en el CRT 4:3 que los juegos de 4:3.                                          | Aceptado: el player hace el letterbox. Criterio de proporción a 1440 y 375 px.                                                                                                      |
| Las teclas W, A, S y D llegan al juego mientras se escriben iniciales en el modal.                                | El modal abre en `gameover`, donde no se captura input; criterio de iniciales con WASD.                                                                                             |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Retirar o sustituir RANARIA.
- Ida y vuelta, multiplicador, boyas y patrulla (variante B).
- Semáforos controlados por el jugador (variante C).
- Vidas extra, bonus, tortugas, cocodrilos y carriles aleatorios.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
