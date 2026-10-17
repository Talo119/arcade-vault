# SPEC GJ — Juego real: CRUCE NEÓN · Variante B (Ida y vuelta)

> **Estado:** Draft
> **Depende de:** SPEC 06, SPEC 07
> **Game jam:** tema "Frogger — cruza la carretera y el río sin convertirte en papilla", variante B de 3 (`specs/game-jam/cruce-neon/`)
> **Fecha:** 2026-10-17
> **Objetivo:** Crear un juego de cruzar carriles en el que un bit de neón cruza la autopista y el río, recoge una chispa en la otra orilla y vuelve con ella para encadenar entregas con multiplicador, y hacerlo jugable en `#/jugar/cruce-neon`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

El tema del game jam es Frogger: cruzar la carretera y el río sin acabar aplastado.
El catálogo no tiene ningún juego real de cruzar carriles. Sí tiene RANARIA (`ranaria`), un Frogger simulado: el player sube la puntuación con un intervalo.
Las reglas del game jam piden siempre una fila nueva, así que CRUCE NEÓN no sustituye a RANARIA: se añade como 9.º juego.
No hay referencia en `references/started-games/` (solo `02-asteroids`, `03-tetris` y `04-arkanoid`), así que el motor se escribe desde cero.
Encaja en el Vault porque todo se dibuja con primitivas neón sobre una cuadrícula: coches como estelas de luz, balsas cian, un bit verde y una chispa amarilla.
Este spec crea el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
Esta variante usa el mismo tablero y el mismo tráfico que la A (`spec-a-clasica.md`), con un giro claro: no hay portales.
El bit cruza, recoge una chispa en la orilla de arriba y la trae de vuelta a la acera; cada entrega seguida sin morir sube un multiplicador de ×1 a ×8.
Además, cada nivel añade un peligro: boyas que se hunden en el nivel 2 y una patrulla en la mediana desde el nivel 3.
La variante C (`spec-c-semaforos.md`) le da la vuelta al tema: el jugador controla los semáforos y los bits cruzan solos.

## Alcance

**Dentro:**

- Migración `add_cruce_neon_game`: fila nueva en `public.games` con `sort_order` 9.
- Portada `.cover-cruce-neon` en `app/globals.css`.
- Motor de CRUCE NEÓN en TypeScript en `lib/cruce-neon/`, sin React, con las mecánicas de "Modelo de datos": cuadrícula de 15×12 celdas de 48 px, saltos de una celda con flechas y WASD, 5 carriles de tráfico y 4 de río, chispa que se recoge arriba y se entrega abajo, multiplicador de racha ×1–×8, 45 s por viaje, 3 vidas, nivel cada 3 entregas, boyas desde el nivel 2 y patrulla desde el nivel 3.
- Paleta neón del Vault en el canvas: bit `--green`, chispa `--yellow`, balsas `--cyan`, patrulla `--magenta`, vehículos de colores por carril, barra de tiempo y marcador del multiplicador.
- Definición `cruceNeonEngine` en `lib/cruce-neon/definition.ts` y entrada en `lib/engines/registry.ts`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: portada nueva, vehículos, balsas, boyas, patrulla, chispa, bit, papilla, franja inferior y la tira de controles.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Retirar o sustituir RANARIA.
- Portales, bonus de tiempo y muro en la orilla (variante A).
- Semáforos controlados por el jugador (variante C).
- Vidas extra, objetos de bonus además de la chispa, varias chispas a la vez y peligros a partir del nivel 4.
- Carriles aleatorios o generados por nivel.
- Mostrar el multiplicador en el HUD de React.
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
  'Lleva a un bit de neón al otro lado de cinco carriles de tráfico y cuatro corrientes de plasma, recoge la chispa y tráela de vuelta. Cada entrega seguida sin morir sube el multiplicador hasta ×8. Cada tres entregas el tráfico acelera; luego llegan las boyas que se hunden y la patrulla de la mediana. Tres vidas.',
  'ARCADE', 'cover-cruce-neon', 'magenta', 0, '0', 9
);
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_add_cruce_neon_game.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`ARCADE`) y `color` (`magenta`) respetan los CHECK de la tabla.
- Hoy (2026-10-17) el `sort_order` más alto es 8 (`duelo-pixel`), así que CRUCE NEÓN va en el 9.
- `best` 0 y `plays` `'0'`, el default del contrato.
- La portada `.cover-cruce-neon` va junto a las demás `.cover-*` de `app/globals.css`: mitad superior con ondas cian del río, mitad inferior con estelas magenta y amarillas de la autopista, un cuadrado verde (el bit) en la mediana y un rombo amarillo (la chispa) arriba. Se diseña con `/frontend-design` y no se parece a `.cover-rana` (bandas cian y círculo verde).
- El Home pasa a mostrar "9 JUEGOS", porque `homeStats(useGames().length)`.
- `lib/home.ts` no cambia: `RECENT_SCORES` no tiene filas de este juego.

### Motor (`lib/cruce-neon/`)

| Archivo         | Contenido                                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`     | `W` 720, `H` 600, `CELL` 48, `COLS` 15, `ROWS` 12, zonas, posición inicial, columnas de la chispa, tiempos, puntos, niveles, peligros, `MAX_DT`, `MAX_SCORE`, `COLORS` y `CAR_COLORS`. |
| `lanes.ts`      | Tipos `Lane` y `LaneObject`, `LANES` (los 9 carriles), `speedFactor(level)`, `resetLanes()`, `moveLanes(lanes, dt, factor)` y `overlapsX(a0, a1, b0, b1)`.                             |
| `hazards.ts`    | `buoyState(ms)` (`"solid" \| "blink" \| "sunk"`) y tipo `Patrol` con `movePatrol(patrol, dt, factor)`.                                                                                 |
| `input.ts`      | `createInput(target, isActive)`: cola de saltos (`nextHop`), pulsación de Espacio (`pressed`), `clear()` y `destroy()`.                                                                |
| `engine.ts`     | `createCruceNeonGame(canvas, callbacks): GameEngine`.                                                                                                                                  |
| `definition.ts` | `cruceNeonEngine: EngineDefinition`.                                                                                                                                                   |

No hay `types.ts` propio: los tipos van en `lanes.ts` y `hazards.ts`, y el motor usa los de `lib/engines/types.ts`.

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
export const STRIP_H = 24; // franja inferior: tiempo y multiplicador
export const W = COLS * CELL; // 720
export const H = BOARD_H + STRIP_H; // 600
export const START = { col: 7, row: 11 }; // centro (360, 552)
export const SPARK_COLS = [7, 2, 12, 4, 10]; // columna de la chispa n.º k = SPARK_COLS[k % 5]
export const RIVER_ROWS = [1, 2, 3, 4];
export const ROAD_ROWS = [6, 7, 8, 9, 10];
export const BUOY_ROW = 2;
export const PATROL_ROW = 5;
export const BIT_HALF = 16; // caja de choque del bit: 32×32
export const PATROL_HALF = 16; // caja de choque de la patrulla: 32×32
export const CAR_INSET = 4;
export const X_MIN = 24;
export const X_MAX = 696;
export const TRACK_MARGIN = 240;
export const TRACK = W + 2 * TRACK_MARGIN; // 1200
export const TRIP_TIME = 45; // s por viaje de ida y vuelta
export const DEAD_MS = 1000;
export const START_LIVES = 3;
export const POINTS_STEP = 10; // por fila nueva en el tramo actual
export const POINTS_DELIVERY = 100; // × multiplicador
export const MULT_MAX = 8;
export const DELIVERIES_PER_LEVEL = 3;
export const SPEED_STEP = 0.1;
export const SPEED_MAX = 2.0;
export const BUOY_LEVEL = 2; // las boyas se hunden desde este nivel
export const BUOY_CYCLE_MS = 5000; // 0–3000 a flote, 3000–4000 parpadeo, 4000–5000 hundidas
export const PATROL_LEVEL = 3;
export const PATROL_SPEED = 90; // px/s × speedFactor
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
  bit: "#00ff88", // --green
  eyes: "#0a0a0f", // --bg
  spark: "#f5ff00", // --yellow
  raftFill: "rgba(0, 245, 255, 0.22)", // --cyan al 22 %
  raftEdge: "#00f5ff", // --cyan
  patrol: "#ff006e", // --magenta
  headlight: "#e6e9ff", // --ink
  splat: "#ff006e", // --magenta
  timerOk: "#00ff88", // --green
  timerWarn: "#f5ff00", // --yellow
  timerLow: "#ff006e", // --magenta
  multOn: "#f5ff00", // --yellow
  multOff: "rgba(245, 255, 0, 0.15)", // --yellow al 15 %
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

| Filas     | Zona             | Qué hay                                                                                             |
| --------- | ---------------- | --------------------------------------------------------------------------------------------------- |
| 0         | Orilla de arriba | Zona segura de lado a lado. La chispa está en una de sus columnas.                                  |
| 1–4       | Río de plasma    | Balsas que se mueven en horizontal. Fuera de una balsa, el bit se ahoga. La fila 2 tiene las boyas. |
| 5         | Mediana          | Zona segura en los niveles 1 y 2. Desde el nivel 3 la recorre la patrulla.                          |
| 6–10      | Autopista        | Vehículos que se mueven en horizontal. Tocar uno es atropello.                                      |
| 11        | Acera            | Zona segura y punto de entrega. El bit aparece en `(7, 11)`, centro `(360, 552)`.                   |
| y 576–600 | Franja inferior  | Barra de tiempo del viaje (izquierda) y 8 cuadros del multiplicador (derecha).                      |

Carriles (`LANES`), valores del nivel 1. Son los mismos de la variante A:

| Fila | Tipo    | Sentido | Velocidad (px/s) | Largo (celdas / px) | Objetos | Separación (px) | `offset` (px) | `x` inicial (px)    |
| ---- | ------- | ------- | ---------------- | ------------------- | ------- | --------------- | ------------- | ------------------- |
| 10   | coche   | ←       | 60               | 1 / 48              | 4       | 300             | 120           | −120, 180, 480, 780 |
| 9    | coche   | →       | 80               | 1 / 48              | 3       | 400             | 0             | −240, 160, 560      |
| 8    | camión  | ←       | 100              | 2 / 96              | 3       | 400             | 200           | −40, 360, 760       |
| 7    | bólido  | →       | 140              | 1 / 48              | 2       | 600             | 300           | 60, 660             |
| 6    | tráiler | ←       | 70               | 3 / 144             | 2       | 600             | 100           | −140, 460           |
| 4    | balsa   | →       | 50               | 3 / 144             | 3       | 400             | 250           | 10, 410, 810        |
| 3    | balsa   | ←       | 70               | 2 / 96              | 4       | 300             | 150           | −90, 210, 510, 810  |
| 2    | boya    | →       | 90               | 4 / 192             | 2       | 600             | 350           | 110, 710            |
| 1    | balsa   | ←       | 60               | 3 / 144             | 3       | 400             | 50            | −190, 210, 610      |

- `x` es el borde izquierdo del objeto. `x` inicial del objeto `i` = `offset + i × separación − 240`.
- Cada objeto avanza `velocidad × speedFactor(nivel) × dt` en su sentido.
- Envolvente: si un objeto que va a la derecha llega a `x ≥ 960`, `x −= 1200`; si uno que va a la izquierda baja de `x = −240`, `x += 1200`. El objeto más largo mide 192 px, así que nunca aparece ni desaparece dentro de la pantalla.
- `resetLanes()` coloca todos los objetos en su `x` inicial. No hay azar.

Niveles. `nivel = 1 + floor(entregas / 3)` y `speedFactor(n) = min(1 + 0,1 × (n − 1), 2,0)`:

| Nivel | Entregas | Factor | Bólido (fila 7) | Patrulla | Peligro nuevo                     |
| ----- | -------- | ------ | --------------- | -------- | --------------------------------- |
| 1     | 0–2      | 1,0    | 140 px/s        | —        | —                                 |
| 2     | 3–5      | 1,1    | 154 px/s        | —        | Las boyas de la fila 2 se hunden. |
| 3     | 6–8      | 1,2    | 168 px/s        | 108 px/s | Patrulla en la mediana (fila 5).  |
| 4     | 9–11     | 1,3    | 182 px/s        | 117 px/s | —                                 |
| 5     | 12–14    | 1,4    | 196 px/s        | 126 px/s | —                                 |
| 6     | 15–17    | 1,5    | 210 px/s        | 135 px/s | —                                 |
| 7     | 18–20    | 1,6    | 224 px/s        | 144 px/s | —                                 |
| 8     | 21–23    | 1,7    | 238 px/s        | 153 px/s | —                                 |
| 9     | 24–26    | 1,8    | 252 px/s        | 162 px/s | —                                 |
| 10    | 27–29    | 1,9    | 266 px/s        | 171 px/s | —                                 |
| 11+   | 30+      | 2,0    | 280 px/s        | 180 px/s | —                                 |

Boyas (fila 2, desde el nivel 2):

- `buoyMs` empieza en 0 en el frame en que se llega al nivel 2 y corre en `playing` y en `dead`, nunca en pausa.
- `buoyState(buoyMs % 5000)`: de 0 a 3 000 ms, `"solid"`; de 3 000 a 4 000 ms, `"blink"` (siguen a flote y parpadean); de 4 000 a 5 000 ms, `"sunk"`.
- En `"sunk"` las boyas no sostienen: el bit que está en la fila 2 se ahoga, igual que fuera de una balsa.
- En el nivel 1 las balsas de la fila 2 nunca se hunden.

Patrulla (fila 5, desde el nivel 3):

- Aparece en el frame en que se llega al nivel 3, con el centro en `x` 24, moviéndose a la derecha.
- Se mueve a `90 × speedFactor(nivel)` px/s y rebota al llegar a 24 o a 696.
- Su caja es de 32×32 centrada en su `x` y en la fila 5. Si se solapa con la caja del bit en la fila 5, el bit muere.
- Sigue en la mediana en todos los niveles siguientes y no se reinicia al perder una vida.

Viaje:

- El viaje tiene dos tramos. En la **ida** el bit no lleva la chispa; en la **vuelta**, sí.
- La chispa n.º `k` (empezando en 0) está en la fila 0, columna `SPARK_COLS[k % 5]`: 7, 2, 12, 4, 10, 7, 2…
- Recogida: en la ida, cuando el bit está en la fila 0 y `floor(x / 48)` es la columna de la chispa. Puede llegar a la fila 0 en otra columna y caminar por la orilla hasta ella.
- Entrega: en la vuelta, cuando el bit salta a la fila 11. El bit se queda donde está, empieza otra ida y aparece la chispa siguiente.
- El tiempo del viaje es de 45 s. Vuelve a 45 s al entregar y al reaparecer tras morir.
- Al morir, la chispa vuelve a su columna en la fila 0 y el viaje vuelve a empezar en la ida.

Puntuación:

| Acción                                                                  | Puntos              |
| ----------------------------------------------------------------------- | ------------------- |
| Ida: saltar a una fila (10 a 0) más alta que la mejor de esta ida       | 10                  |
| Vuelta: saltar a una fila (1 a 11) más baja que la mejor de esta vuelta | 10                  |
| Entregar la chispa                                                      | 100 × multiplicador |

- El multiplicador empieza en ×1. Tras cada entrega sube 1, hasta ×8. Al perder una vida vuelve a ×1.
- Un viaje completo suma 110 en la ida (11 filas), 110 en la vuelta (11 filas) y la entrega: 320 con ×1 y 1 020 con ×8.
- Las 8 primeras entregas sin morir suman 8 × 220 + 100 × (1 + 2 + … + 8) = 1 760 + 3 600 = 5 360.
- No hay techo: los niveles no se acaban. El motor limita la puntuación con `score = Math.min(score + puntos, MAX_SCORE)`. A 1 020 por viaje, el tope exige unos 9 800 viajes con ×8.

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ready`    | Fase inicial. Tablero, tráfico y balsas moviéndose a velocidad del nivel 1, como fondo animado, y la chispa en `(7, 0)`. No hay bit ni franja inferior. Espacio llama a `initGame()` (`score` 0, `level` 1, `lives` 3, 0 entregas, ×1, `resetLanes()`, sin boyas ni patrulla, bit en `(7, 11)`, ida, 45 s) y pasa a `playing`. |
| `playing`  | Reglas de abajo.                                                                                                                                                                                                                                                                                                               |
| `dead`     | Tras perder una vida si quedan vidas. Dura 1 000 ms. El bit no se dibuja y en su lugar se ve la papilla. El tráfico, las boyas y la patrulla siguen; el tiempo del viaje no corre y los saltos se descartan. Al acabar, el bit reaparece en `(7, 11)` en la ida con 45 s, y la fase vuelve a `playing`.                        |
| `gameover` | Se alcanza al perder la 3.ª vida o con `end()`. Todo queda quieto. El bit no se dibuja; la papilla de la última muerte, si la hay, se sigue viendo. No hay input. Espacio no reinicia.                                                                                                                                         |

Reglas del motor:

- En cada frame de `playing`, en este orden:
  - El tiempo del viaje baja `dt`. `buoyMs` sube `dt × 1000` si el nivel es 2 o más.
  - Los carriles se mueven con `moveLanes(lanes, dt, speedFactor(level))` y la patrulla con `movePatrol`, si existe.
  - Si el bit está en una fila de río, su `x` se mueve igual que los objetos de su fila.
  - Se aplica como mucho un salto de la cola.
  - Se comprueban, en este orden, las muertes, la recogida y la entrega.
- En `dead` solo se mueven los carriles, las boyas y la patrulla, y corre el temporizador de 1 000 ms.
- Saltos: ↑ / W resta 1 a la fila; ↓ / S suma 1; ← / A resta 48 a `x`; → / D suma 48 a `x`. ↑ en la fila 0 y ↓ en la fila 11 no hacen nada. Un salto lateral que dejaría el centro fuera de `24..696` no hace nada. El salto vertical no cambia `x`.
- Muertes:
  - Atropello: el bit está en una fila de autopista y su caja `x − 16..x + 16` se solapa con la caja de un vehículo de esa fila, `x + 4..x + largo − 4`.
  - Ahogado: el bit está en una fila de río y su centro no está dentro de `x..x + largo` de ninguna balsa de esa fila, o está en la fila 2 con las boyas en `"sunk"`.
  - Arrastrado: el bit está en una fila de río y su centro sale de `0..720`.
  - Patrulla: el bit está en la fila 5 y su caja se solapa con la de la patrulla.
  - Tiempo: el tiempo del viaje llega a 0.
- Al morir: `lives −= 1`, el multiplicador vuelve a ×1, la chispa vuelve a la fila 0, se guarda la posición de la papilla y la cola de saltos se vacía. Con vidas, `dead` durante 1 000 ms; con 0 vidas, `gameover`.
- Al entregar: suma `100 × mult`, `mult = min(mult + 1, 8)`, `entregas += 1`, `level = 1 + floor(entregas / 3)`. Si el nivel sube a 2 empieza `buoyMs`; si sube a 3 aparece la patrulla.
- Resolución lógica 720×600, con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- Todos los límites usan `W`, `H`, `CELL`, `COLS` y `ROWS`, nunca `canvas.width` ni `canvas.height`.
- `dt` en segundos, limitado a `MAX_DT` (50 ms). El objeto más rápido (280 px/s desde el nivel 11) avanza como mucho 14 px por frame, y la patrulla 9 px, menos que la caja del bit (32 px): no hay efecto túnel.
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input y la cola de saltos. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`. El tiempo del viaje, `buoyMs` y el temporizador de `dead` se conservan.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa. No dibuja ningún texto.
- Lo que sí dibuja además del tablero: la chispa, la barra de tiempo y el multiplicador como 8 cuadros, porque no caben en el HUD.
- Mapeo al HUD: `score` = puntuación, `level` = nivel, `lives` = vidas que quedan (3 → 0).
- `onStats` solo cuando cambian `score`, `level` o `lives`. El multiplicador no va al HUD. `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- Dibujo con primitivas (sin imágenes):
  - Zonas, vehículos, balsas, bit y papilla como en la variante A: filas 0, 5 y 11 en `COLORS.safe` con borde `COLORS.bankEdge`; río en `COLORS.road` más `COLORS.river`; vehículos de su largo × 32 en `CAR_COLORS[fila]` con faros `COLORS.headlight`; balsas de su largo × 36 en `COLORS.raftFill` con borde de 2 px `COLORS.raftEdge`; bit de 32×32 en `COLORS.bit` con ojos `COLORS.eyes`; papilla de 8 rayos en `COLORS.splat`.
  - Boyas en `"blink"`: `globalAlpha` alterna entre 1 y 0,4 cada 125 ms. En `"sunk"`: `globalAlpha` 0,2 y sin glow.
  - Chispa en la fila 0: rombo de 20×20 en `COLORS.spark` con glow, con `globalAlpha` que oscila entre 0,6 y 1 cada 600 ms. Llevada: rombo de 12×12 sobre el bit, 22 px por encima de su centro.
  - Patrulla: `strokeRect` de 28×28 y 2 px con una X dentro, en `COLORS.patrol` con glow.
  - Barra de tiempo: `fillRect(8, 584, 576 × tiempo / 45, 8)`. `COLORS.timerOk` con más de 15 s, `COLORS.timerWarn` entre 15 y 5 s, y `COLORS.timerLow` por debajo de 5 s.
  - Multiplicador: 8 cuadros de 10×10 en `x = 600 + i × 14`, `y` 583. Los `mult` primeros en `COLORS.multOn` con glow; el resto en `COLORS.multOff`.
  - La franja inferior no se dibuja en `ready` ni en `gameover`.
  - El glow es `shadowBlur` con `shadowColor` igual al color de trazo o relleno.
  - Tamaños, glow y formas se ajustan en el pulido sin cambiar las cajas de choque.
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
3. **Base del motor.** `config.ts`, `lanes.ts` y `hazards.ts`. Verificación: `npm run lint` y `npm run build` pasan.
4. **Input.** `input.ts` con la cola de saltos, la pulsación de Espacio y la regla de `preventDefault`. Verificación: `npm run build` pasa.
5. **Motor.** `engine.ts` con las fases, `initGame`, carriles, arrastre, saltos, muertes, chispa, tramos, multiplicador, niveles, boyas, patrulla, el dibujo, `setupCanvas`, `setPaused`, `end`, `destroy` y los callbacks. Verificación: `npm run build` pasa.
6. **Registro.** `definition.ts` y la entrada `"cruce-neon": cruceNeonEngine` en `ENGINES`. Verificación: en `#/jugar/cruce-neon` Espacio empieza la partida, ↑ suma 10 en el HUD y quedarse quieto 45 s quita un ♥.
7. **Pulido con `/frontend-design`.** Vehículos, balsas, boyas, patrulla, chispa, bit, papilla, franja inferior, glow y la tira de controles a 1440 px y 375 px, sin cambiar la estética del Vault.
8. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/cruce-neon` a 1440 y 375 px, con capturas (no se versionan). Leer el bit, la chispa, los vehículos, las balsas y la patrulla interceptando `fillRect`, `strokeRect` y `globalAlpha` del contexto 2D. Como el tráfico es determinista, un bot dentro de la página calcula cuándo saltar. Para encadenar entregas y llegar a los niveles 2 y 3 sin depender del bot, usar un cambio local sin commitear en `LANES` (autopista sin vehículos y balsas de 15 celdas) y anotarlo. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `add_cruce_neon_game` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `cruce-neon` con título `CRUCE NEÓN`, `cat` `ARCADE`, `color` `magenta`, `cover` `cover-cruce-neon`, `best` 0, `plays` `0` y `sort_order` 9, y las otras 8 filas no han cambiado.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] La Biblioteca muestra CRUCE NEÓN con la portada `.cover-cruce-neon` en la 9.ª posición.
- [ ] El Home muestra "9 JUEGOS".
- [ ] `ENGINES` tiene las entradas `asteroids`, `tetris`, `arkanoid`, `snake` y `cruce-neon`, y `GamePlayer.tsx` no ha cambiado.
- [ ] Al abrir `/#/jugar/cruce-neon` se ve "CRUCE NEÓN / PULSA ESPACIO PARA EMPEZAR" sobre el tablero con el tráfico en movimiento, la chispa en `(7, 0)` y sin bit, y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / ♥ ♥ ♥ / 01.
- [ ] Espacio empieza la partida, el overlay desaparece, el bit aparece en `(7, 11)`, la barra de tiempo se ve llena y verde y hay 1 cuadro del multiplicador encendido.
- [ ] Al empezar, los vehículos y las balsas están en las `x` iniciales de la tabla de carriles.
- [ ] ↑ / W, ↓ / S, ← / A y → / D hacen saltar el bit una celda (48 px) arriba, abajo, a la izquierda y a la derecha.
- [ ] Mantener una flecha pulsada da un solo salto.
- [ ] ↑ en la fila 0, ↓ en la fila 11, ← en la columna 0 y → en la columna 14 no hacen nada.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] ↑ en el primer segundo lleva el bit a `(7, 10)` sin morir y el HUD marca 10.
- [ ] En la ida, llegar a la fila 0 desde la 11 sin bajar suma 110; bajar y volver a subir no suma.
- [ ] La fila 0 es segura en todas sus columnas, y caminar por ella hasta la chispa la recoge: el rombo amarillo pasa a dibujarse sobre el bit.
- [ ] Llegar a la fila 11 sin la chispa no suma nada más que los saltos.
- [ ] La 1.ª entrega sin morir deja el HUD en 320 (110 + 110 + 100), enciende 2 cuadros del multiplicador y pone la chispa siguiente en la columna 2 de la fila 0.
- [ ] La 2.ª entrega seguida suma 420 (HUD 740) y la 3.ª suma 520 (HUD 1 260).
- [ ] Con la 3.ª entrega el nivel del HUD pasa a 02 y el bólido de la fila 7 va a 154 px/s.
- [ ] Desde el nivel 2, las boyas de la fila 2 parpadean de 3 000 a 4 000 ms y se hunden de 4 000 a 5 000 ms de cada ciclo de 5 s; estar sobre una boya hundida quita un ♥.
- [ ] En el nivel 1, las balsas de la fila 2 nunca se hunden.
- [ ] Con la 6.ª entrega el nivel pasa a 03 y aparece la patrulla `#ff006e` en la mediana, en `x` 24, moviéndose a 108 px/s y rebotando en 24 y 696; tocarla quita un ♥.
- [ ] El multiplicador no pasa de 8 cuadros: la 9.ª entrega seguida suma 220 + 800.
- [ ] Morir apaga el multiplicador a 1 cuadro, devuelve la chispa a su columna en la fila 0 y la entrega siguiente vale 100.
- [ ] Tocar un vehículo, saltar al río fuera de una balsa y dejar que una balsa saque el centro del bit de `0..720` quitan un ♥ cada uno.
- [ ] Tras perder un ♥ se ve la papilla `#ff006e` durante ~1 000 ms, las flechas no mueven nada y el bit reaparece en `(7, 11)` con la barra llena.
- [ ] Quedarse quieto 45 s quita un ♥; la barra pasa a `#f5ff00` con 15 s y a `#ff006e` con 5 s.
- [ ] Perder la 3.ª vida abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] FIN abre el modal con la puntuación actual; el tráfico queda quieto y el bit desaparece.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa: `fillText` no se llama nunca.
- [ ] El bit es `#00ff88`, la chispa y los cuadros encendidos `#f5ff00`, el borde de las balsas `#00f5ff`, la patrulla `#ff006e` y los vehículos de las filas 10, 9, 8, 7 y 6 son `#f5ff00`, `#00f5ff`, `#ffcf3a`, `#ff006e` y `#c7d0e0`.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas, la barra de tiempo y el ciclo de las boyas; al reanudar, el bit no salta solo.
- [ ] En el modal se pueden escribir iniciales con espacios, con la letra P y con W, A, S y D sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'cruce-neon'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña CRUCE NEÓN del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/cruce-neon`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / ♥ ♥ ♥ / 01, la chispa en `(7, 0)` y sin patrulla.
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
- **No:** sustituir RANARIA. Retirarla o reconvertirla va en su propio spec. Decisión del agente (game jam); revisar.
- **Sí:** id `cruce-neon` y título CRUCE NEÓN, comunes a las tres variantes. Decisión del agente (game jam); revisar.
- **Sí:** `cat` `ARCADE`, aunque es la categoría con más juegos (4). El núcleo es de reflejos. Decisión del agente (game jam); revisar.
- **Sí:** `color` `magenta`, el menos usado del catálogo (1, TETRIS). Decisión del agente (game jam); revisar.
- **Sí:** `best` 0 y `plays` `'0'`, el default del contrato. Decisión del agente (game jam); revisar.
- **Sí:** portada nueva `.cover-cruce-neon`, con la chispa amarilla además del río, la autopista y el bit. Decisión del agente (game jam); revisar.
- **No:** reutilizar `.cover-rana`. Es la portada de RANARIA, que sigue en el catálogo.
- **Sí:** juego original, sin código ni assets de referencia.
- **Sí:** mismo tablero (720×600, 15×12 celdas de 48 px) y mismo tráfico que la variante A. Si se implementa B, la A no hace falta, y el giro se nota desde el primer viaje. Decisión del agente (game jam); revisar.
- **Sí:** ida y vuelta con chispa en lugar de 5 portales. Obliga a cruzar el tráfico en los dos sentidos y la orilla de arriba deja de ser una trampa de muros. Decisión del agente (game jam); revisar.
- **No:** portales, muro mortal en la fila 0 y bonus de tiempo. Son de la variante A.
- **Sí:** chispa en columnas fijas (7, 2, 12, 4, 10), alternando lados. Obliga a moverse en horizontal por la orilla y es determinista. Decisión del agente (game jam); revisar.
- **No:** chispa en una columna al azar.
- **Sí:** multiplicador ×1–×8 por entregas seguidas sin morir, que vuelve a ×1 al perder una vida. Es lo que reparte el leaderboard: arriesgar una vida cuesta la racha. Decisión del agente (game jam); revisar.
- **Sí:** el multiplicador se dibuja como 8 cuadros en la franja inferior, sin texto, porque el HUD no tiene sitio para él y el contrato no se toca.
- **No:** añadir el multiplicador al HUD de React. Toca `GamePlayer.tsx`.
- **Sí:** 10 por fila nueva en cada tramo y 100 × multiplicador por entrega. Decisión del agente (game jam); revisar.
- **Sí:** 45 s por viaje completo. Un viaje es el doble de largo que el bit de la variante A. Decisión del agente (game jam); revisar.
- **Sí:** nivel cada 3 entregas; el tráfico acelera un 10 % por nivel hasta ×2,0 en el nivel 11. Decisión del agente (game jam); revisar.
- **Sí:** boyas que se hunden 1 s de cada 5 desde el nivel 2 y patrulla en la mediana desde el nivel 3. Cada nivel temprano cambia cómo se juega, no solo la velocidad. Decisión del agente (game jam); revisar.
- **No:** más peligros desde el nivel 4. Se dejan para otro spec si el juego lo pide.
- **Sí:** 3 vidas sin vidas extra, y fase `dead` de 1 000 ms con la papilla. Decisión del agente (game jam); revisar.
- **Sí:** tras entregar, el bit se queda en la acera donde está y empieza la ida siguiente, sin volver al centro.
- **Sí:** `ready` con el tráfico en movimiento, la chispa en `(7, 0)` y sin bit; `initGame()` vuelve a colocar el tráfico en sus `x` iniciales. Decisión del agente (game jam); revisar.
- **Sí:** motor sin React en `lib/cruce-neon/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault en el canvas y primitivas en vez de imágenes. No hay `public/games/cruce-neon/`.
- **Sí:** HUD de React y modal de la plataforma; el canvas dibuja la chispa, la barra de tiempo y el multiplicador, sin texto.
- **Sí:** límite `MAX_SCORE` en el motor, porque los niveles no se acaban.
- **No:** sonido. Ningún juego real del Vault lo tiene. Decisión del agente (game jam); revisar.
- **No:** ratón y táctil. Van en su propio spec.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El catálogo tiene dos juegos de cruzar carriles: RANARIA (simulado) y CRUCE NEÓN (real).            | Aceptado en el game jam. La ida y vuelta lo separa de la descripción de RANARIA. Retirar RANARIA queda para su propio spec.                                                     |
| El `sort_order` 9 o el id `cruce-neon` se ocupan antes de implementar.                              | El paso 1 comprueba el máximo y el id antes de la migración. Si cambian, se para y se pregunta.                                                                                 |
| El multiplicador no se ve en el HUD y el jugador no entiende por qué una entrega vale más que otra. | Los 8 cuadros amarillos de la franja inferior se encienden al entregar. Si en el pulido no se entienden, se agrandan; añadirlo al HUD sería un spec de ampliación del contrato. |
| Un frame largo hace que un vehículo o la patrulla atraviesen el bit.                                | `dt` limitado a 50 ms: 14 px por frame como mucho, menos que la caja de 32 px.                                                                                                  |
| Las boyas se hunden con el bit encima sin aviso.                                                    | 1 s de parpadeo antes de hundirse, siempre en la misma parte del ciclo. Criterio del ciclo de 5 s.                                                                              |
| La puntuación no tiene techo.                                                                       | `MAX_SCORE` en cada suma.                                                                                                                                                       |
| `shadowBlur` en unos 30 objetos más la chispa y los cuadros baja el rendimiento.                    | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2, quitar el glow de las balsas. Se anota.                                                          |
| Llegar a los niveles 2 y 3 jugando en Playwright es lento (3 y 6 entregas).                         | Bot con el tráfico determinista y, para los niveles, cambio local sin commitear en `LANES` (autopista vacía y balsas de 15 celdas). Se anota.                                   |
| Al perder la 3.ª vida, el HUD muestra "—" en vidas, porque `GamePlayer.tsx` trata 0 como sin vidas. | Aceptado: pasa igual en ASTEROIDS y ARKANOID, y cambiarlo toca el player.                                                                                                       |
| El canvas 6:5 deja más franja negra en el CRT 4:3.                                                  | Aceptado: el player hace el letterbox. Criterio de proporción.                                                                                                                  |
| Las teclas W, A, S y D llegan al juego mientras se escriben iniciales en el modal.                  | El modal abre en `gameover`, donde no se captura input; criterio de iniciales con WASD.                                                                                         |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Retirar o sustituir RANARIA.
- Portales y bonus de tiempo (variante A).
- Semáforos controlados por el jugador (variante C).
- Multiplicador en el HUD de React.
- Vidas extra, varias chispas, peligros desde el nivel 4 y carriles aleatorios.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
