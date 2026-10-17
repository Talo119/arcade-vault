# SPEC GJ — Juego real: CRUCE NEÓN · Variante C (Semáforos)

> **Estado:** Draft
> **Depende de:** SPEC 06, SPEC 07
> **Game jam:** tema "Frogger — cruza la carretera y el río sin convertirte en papilla", variante C de 3 (`specs/game-jam/cruce-neon/`)
> **Fecha:** 2026-10-17
> **Objetivo:** Crear un juego de gestión de tráfico en el que el jugador controla los seis semáforos de una autopista para que los bits de neón la crucen solos sin acabar hechos papilla, y hacerlo jugable en `#/jugar/cruce-neon`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

El tema del game jam es Frogger: cruzar la carretera y el río sin acabar aplastado.
El catálogo no tiene ningún juego real de cruzar carriles. Sí tiene RANARIA (`ranaria`), un Frogger simulado: el player sube la puntuación con un intervalo.
Las reglas del game jam piden siempre una fila nueva, así que CRUCE NEÓN no sustituye a RANARIA: se añade como 9.º juego.
No hay referencia en `references/started-games/` (solo `02-asteroids`, `03-tetris` y `04-arkanoid`), así que el motor se escribe desde cero.
Esta variante es otra lectura del tema: el jugador no es quien cruza.
Los bits salen solos por cuatro pasos de cebra y saltan una fila cada pocos milisegundos, sin mirar.
El jugador pone en rojo o en verde cada uno de los seis carriles con las teclas 1 a 6. En rojo el carril se congela y los bits pasan; si se queda en rojo 4 s, el atasco colapsa y se pierde una vida.
Es un juego de decidir en tiempo real cuándo parar y cuándo soltar, por eso es PUZZLE y no ARCADE.
Encaja en el Vault porque todo se dibuja con primitivas neón: estelas de coches, semáforos verdes y magenta y bits verdes.
Este spec crea el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
La variante A (`spec-a-clasica.md`) es el cruce clásico con el jugador como el bit; la B (`spec-b-ida-y-vuelta.md`) añade ida y vuelta con multiplicador. Ninguna de las dos tiene semáforos, atascos ni varios bits a la vez.

## Alcance

**Dentro:**

- Migración `add_cruce_neon_game`: fila nueva en `public.games` con `sort_order` 9.
- Portada `.cover-cruce-neon` en `app/globals.css`.
- Motor de CRUCE NEÓN en TypeScript en `lib/cruce-neon/`, sin React, con las mecánicas de "Modelo de datos": cuadrícula de 12×9 celdas de 64 px, 6 carriles con semáforo controlados con las teclas 1 a 6, 4 pasos de cebra, bits que aparecen y saltan solos, atasco que colapsa a los 4 s de rojo, 3 vidas y nivel cada 10 bits a salvo.
- Paleta neón del Vault en el canvas: bits `--green`, semáforo verde `--green` y rojo `--magenta`, barra de atasco `--yellow` y `--magenta`, coches de colores por carril.
- Definición `cruceNeonEngine` en `lib/cruce-neon/definition.ts` y entrada en `lib/engines/registry.ts`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: portada nueva, coches, luces de freno, pasos de cebra, semáforos, número de carril, barras de atasco, bits, papilla, destello de colapso y la tira de controles.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad. Hacer clic en un semáforo sería natural, pero el ratón va en su propio spec.
- Sonido.
- Retirar o sustituir RANARIA.
- Un bit controlado por el jugador, río, balsas y portales (variantes A y B).
- Semáforos con ámbar o con temporizador automático.
- Bits de tipos distintos (lentos, rápidos, en grupo) y vehículos de emergencia.
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
  'Esta vez no cruzas tú: los bits de neón cruzan solos por los pasos de cebra y tú controlas los seis semáforos de la autopista. Pon un carril en rojo para salvarlos, pero no lo dejes parado demasiado: el atasco colapsa en cuatro segundos. Cada bit a salvo suma 100 por nivel. Tres vidas.',
  'PUZZLE', 'cover-cruce-neon', 'magenta', 0, '0', 9
);
```

El texto `short` es el común de las tres variantes. Como aquí no hay río, al implementar esta variante se puede cambiar por "Para el tráfico a tiempo o los bits acabarán hechos papilla.".

Reglas:

- Flujo de migraciones del SPEC 04: `pending_add_cruce_neon_game.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`PUZZLE`) y `color` (`magenta`) respetan los CHECK de la tabla.
- Hoy (2026-10-17) el `sort_order` más alto es 8 (`duelo-pixel`), así que CRUCE NEÓN va en el 9.
- `best` 0 y `plays` `'0'`, el default del contrato.
- La portada `.cover-cruce-neon` va junto a las demás `.cover-*` de `app/globals.css`: autopista oscura con estelas amarillas y cian, un paso de cebra tenue, un semáforo con una luz magenta y otra verde, y un cuadrado verde (un bit) en la mediana. Se diseña con `/frontend-design` y no se parece a `.cover-rana` (bandas cian y círculo verde).
- El Home pasa a mostrar "9 JUEGOS", porque `homeStats(useGames().length)`.
- `lib/home.ts` no cambia: `RECENT_SCORES` no tiene filas de este juego.

### Motor (`lib/cruce-neon/`)

| Archivo         | Contenido                                                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config.ts`     | `W` 768, `H` 576, `CELL` 64, `COLS` 12, `ROWS` 9, filas de cada zona, pasos de cebra, secuencia de aparición, tiempos, atasco, puntos, niveles, `MAX_DT`, `MAX_SCORE`, `COLORS` y `LANE_COLORS`. |
| `lanes.ts`      | Tipos `Lane` y `Car`, `LANES` (los 6 carriles), `speedFactor(level)`, `resetLanes()`, `moveLanes(lanes, dt, factor)` (devuelve cuántos coches han envuelto) y `overlapsX(a0, a1, b0, b1)`.       |
| `bits.ts`       | Tipo `Bit` (`col`, `row`, `hopTimer`), `spawnMsForLevel(n)`, `hopMsForLevel(n)` y `canHop(bit, bits, lanes)`.                                                                                    |
| `input.ts`      | `createInput(target, isActive)`: cola de cambios de semáforo (`nextToggle`), pulsación de Espacio (`pressed`), `clear()` y `destroy()`.                                                          |
| `engine.ts`     | `createCruceNeonGame(canvas, callbacks): GameEngine`.                                                                                                                                            |
| `definition.ts` | `cruceNeonEngine: EngineDefinition`.                                                                                                                                                             |

No hay `types.ts` propio: los tipos van en `lanes.ts` y `bits.ts`, y el motor usa los de `lib/engines/types.ts`.

```ts
// lib/cruce-neon/definition.ts
export const cruceNeonEngine: EngineDefinition = {
  id: "cruce-neon",
  width: W, // 768
  height: H, // 576
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [{ keys: ["1", "2", "3", "4", "5", "6"], label: "SEMÁFORO" }],
  create: createCruceNeonGame,
};
```

```ts
// config.ts
export const CELL = 64; // px
export const COLS = 12;
export const ROWS = 9;
export const W = COLS * CELL; // 768
export const H = ROWS * CELL; // 576
export const GOAL_ROW = 0; // acera de llegada
export const LANE_ROWS = [7, 6, 5, 3, 2, 1]; // carril 1..6 → fila
export const MEDIAN_ROW = 4;
export const SPAWN_ROW = 8; // acera de salida
export const CROSSWALK_COLS = [1, 4, 7, 10];
export const SPAWN_SEQUENCE = [4, 7, 1, 10, 7, 4, 10, 1];
export const FIRST_SPAWN_MS = 1000;
export const SPAWN_MS = 4000; // nivel 1
export const SPAWN_STEP_MS = 300; // menos por nivel
export const SPAWN_MIN_MS = 1600;
export const HOP_MS = 800; // nivel 1
export const HOP_STEP_MS = 40;
export const HOP_MIN_MS = 500;
export const MAX_BITS = 12;
export const BIT_HALF = 16; // caja de choque del bit: 32×32
export const CAR_INSET = 6; // px que se recorta la caja de cada coche por los lados
export const TRACK_MARGIN = 264; // px fuera de pantalla a cada lado
export const TRACK = W + 2 * TRACK_MARGIN; // 1296
export const JAM_RISE = 0.25; // por segundo en rojo: 4 s hasta el colapso
export const JAM_FALL = 0.2; // por segundo en verde: 5 s de lleno a vacío
export const JAM_WARN = 0.75; // la barra pasa a magenta
export const START_LIVES = 3;
export const POINTS_BIT = 100; // × nivel
export const POINTS_CAR = 10; // por coche que sale de la pantalla
export const BITS_PER_LEVEL = 10;
export const SPEED_STEP = 0.1;
export const SPEED_MAX = 1.8;
export const SPLAT_MS = 600; // solo visual
export const COLLAPSE_FLASH_MS = 400; // solo visual
export const MAX_DT = 0.05; // s
export const MAX_SCORE = 9_999_999; // CHECK de public.scores

// Colores del canvas, copiados de los tokens de :root.
export const COLORS = {
  road: "#0f0f18", // --bg-2
  safe: "#15151f", // --bg-3 (filas 0, 4 y 8)
  laneLine: "rgba(255, 255, 255, 0.06)", // --line-2
  bankEdge: "rgba(0, 255, 136, 0.35)", // --green al 35 %
  medianLine: "rgba(245, 255, 0, 0.35)", // --yellow al 35 %
  zebra: "rgba(230, 233, 255, 0.12)", // --ink al 12 %
  bit: "#00ff88", // --green
  eyes: "#0a0a0f", // --bg
  lightGreen: "#00ff88", // --green
  lightRed: "#ff006e", // --magenta
  laneNumber: "#e6e9ff", // --ink
  headlight: "#e6e9ff", // --ink
  brake: "#ff006e", // --magenta
  jam: "#f5ff00", // --yellow
  jamWarn: "#ff006e", // --magenta
  splat: "#ff006e", // --magenta
  collapse: "rgba(255, 0, 110, 0.25)", // --magenta al 25 %
};
export const LANE_COLORS = [
  "#f5ff00", // carril 1 — --yellow
  "#00f5ff", // carril 2 — --cyan
  "#ffcf3a", // carril 3 — --gold
  "#c7d0e0", // carril 4 — --silver
  "#f5ff00", // carril 5 — --yellow
  "#d97a3a", // carril 6 — --bronze
];
```

Tablero (768×576, 4:3). La celda `(col, fila)` tiene su centro en `(col × 64 + 32, fila × 64 + 32)`:

| Fila | Zona             | Qué hay                                                                |
| ---- | ---------------- | ---------------------------------------------------------------------- |
| 0    | Acera de llegada | Un bit que llega aquí está a salvo: suma y desaparece.                 |
| 1    | Carril 6         | Tecla 6.                                                               |
| 2    | Carril 5         | Tecla 5.                                                               |
| 3    | Carril 4         | Tecla 4.                                                               |
| 4    | Mediana          | Zona segura.                                                           |
| 5    | Carril 3         | Tecla 3.                                                               |
| 6    | Carril 2         | Tecla 2.                                                               |
| 7    | Carril 1         | Tecla 1.                                                               |
| 8    | Acera de salida  | Los bits aparecen en las columnas de los pasos de cebra: 1, 4, 7 y 10. |

Carriles (`LANES`), valores del nivel 1:

| Carril | Fila | Sentido | Velocidad (px/s) | Largo (celdas / px) | Coches | Separación (px) | `offset` (px) | `x` inicial (px)    |
| ------ | ---- | ------- | ---------------- | ------------------- | ------ | --------------- | ------------- | ------------------- |
| 1      | 7    | →       | 90               | 1 / 64              | 3      | 432             | 0             | −264, 168, 600      |
| 2      | 6    | ←       | 120              | 1 / 64              | 3      | 432             | 216           | −48, 384, 816       |
| 3      | 5    | →       | 70               | 2 / 128             | 2      | 648             | 100           | −164, 484           |
| 4      | 3    | ←       | 100              | 1 / 64              | 4      | 324             | 50            | −214, 110, 434, 758 |
| 5      | 2    | →       | 140              | 1 / 64              | 2      | 648             | 400           | 136, 784            |
| 6      | 1    | ←       | 80               | 3 / 192             | 2      | 648             | 300           | 36, 684             |

- `x` es el borde izquierdo del coche. `x` inicial del coche `i` = `offset + i × separación − 264`.
- Separación = `TRACK / coches` (1296 / 2, 3 o 4).
- En verde, cada coche avanza `velocidad × speedFactor(nivel) × dt` en su sentido. En rojo, todos los coches del carril se quedan quietos donde estén.
- Envolvente: si un coche que va a la derecha llega a `x ≥ 1032` (`W + 264`), `x −= 1296`; si uno que va a la izquierda baja de `x = −264`, `x += 1296`. El coche más largo mide 192 px, así que nunca aparece ni desaparece dentro de la pantalla.
- Cada envolvente es un coche que ha salido de la pantalla y suma 10 puntos.
- `resetLanes()` coloca todos los coches en su `x` inicial y pone los 6 semáforos en verde. No hay azar.

Ritmo del nivel 1 con todo en verde: salen de la pantalla unos 1,24 coches por segundo (≈ 12 puntos/s), y aparece un bit cada 4 s (100 puntos si cruza). Salvar bits vale más, pero parar carriles cuesta puntos de tráfico y llena el atasco.

Niveles. `nivel = 1 + floor(bits a salvo / 10)`:

| Nivel | Bits a salvo | `speedFactor` | Carril 5 | Aparición (ms) | Salto (ms) | Puntos por bit |
| ----- | ------------ | ------------- | -------- | -------------- | ---------- | -------------- |
| 1     | 0–9          | 1,0           | 140 px/s | 4 000          | 800        | 100            |
| 2     | 10–19        | 1,1           | 154 px/s | 3 700          | 760        | 200            |
| 3     | 20–29        | 1,2           | 168 px/s | 3 400          | 720        | 300            |
| 4     | 30–39        | 1,3           | 182 px/s | 3 100          | 680        | 400            |
| 5     | 40–49        | 1,4           | 196 px/s | 2 800          | 640        | 500            |
| 6     | 50–59        | 1,5           | 210 px/s | 2 500          | 600        | 600            |
| 7     | 60–69        | 1,6           | 224 px/s | 2 200          | 560        | 700            |
| 8     | 70–79        | 1,7           | 238 px/s | 1 900          | 520        | 800            |
| 9+    | 80+          | 1,8           | 252 px/s | 1 600          | 500        | 100 × nivel    |

- `speedFactor(n) = min(1 + 0,1 × (n − 1), 1,8)`.
- `spawnMsForLevel(n) = max(1600, 4000 − 300 × (n − 1))`.
- `hopMsForLevel(n) = max(500, 800 − 40 × (n − 1))`.

Bits:

- El 1.er bit aparece a los 1 000 ms de empezar. Después, uno cada `spawnMsForLevel(nivel)`.
- El bit n.º `k` (empezando en 0) aparece en la fila 8, columna `SPAWN_SEQUENCE[k % 8]`: 4, 7, 1, 10, 7, 4, 10, 1, 4…
- Si en esa celda ya hay un bit, o ya hay 12 bits, ese bit no aparece y se vuelve a intentar con la misma columna en el intervalo siguiente.
- Cada bit salta solo una fila hacia arriba cada `hopMsForLevel(nivel)`, contando desde que aparece.
- Cuando le toca saltar, el bit espera (y lo vuelve a intentar en el intervalo siguiente) si:
  - en la celda de arriba ya hay otro bit, o
  - la fila de arriba es un carril en rojo y la caja de algún coche parado se solapa con la caja que tendría el bit allí.
- En cualquier otro caso salta, aunque el carril esté en verde y venga un coche: los bits no miran.
- Los saltos se resuelven de la fila más alta a la más baja, para que un bit que deja libre una celda permita saltar al de detrás en el mismo frame.
- Al llegar a la fila 0, el bit está a salvo: suma `100 × nivel` (el nivel de antes de sumar), `bitsASalvo += 1`, se recalcula el nivel y el bit desaparece.
- Aplastado: un bit en la fila de un carril en verde cuya caja (`x − 16..x + 16`) se solapa con la caja de un coche de ese carril (`x + 6..x + largo − 6`). Se pierde una vida, el bit desaparece y se ve la papilla 600 ms. Un coche parado nunca aplasta.

Atasco (uno por carril, de 0 a 1):

- En rojo, `jam = min(1, jam + 0,25 × dt)`. En verde, `jam = max(0, jam − 0,2 × dt)`.
- Si llega a 1, el carril colapsa: se pierde una vida, `jam = 0`, el semáforo pasa a verde solo y el carril destella 400 ms. El jugador puede volver a ponerlo en rojo al instante.
- Un carril en rojo desde 0 colapsa a los 4 s. 2 s en rojo y 1 s en verde dejan el atasco en 0,3.

Puntuación:

| Acción                                             | Puntos      |
| -------------------------------------------------- | ----------- |
| Un bit llega a la acera de arriba                  | 100 × nivel |
| Un coche sale de la pantalla (envolvente en verde) | 10          |

- Desde el inicio, con todo en verde, el 1.er coche que sale es el del carril 4 que empieza en `x` −214: sale a los 0,5 s y el HUD marca 10.
- No hay techo: los niveles no se acaban y el tráfico suma mientras haya carriles en verde. El motor limita la puntuación con `score = Math.min(score + puntos, MAX_SCORE)`.

Cronología del 1.er bit (columna 4, caja `x` 272..304), desde que se pulsa Espacio:

| Tiempo | Bit pasa a         | Qué pasa con todo en verde                                                                                                |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| 1,0 s  | `(4, 8)`, aparece  | —                                                                                                                         |
| 1,8 s  | `(4, 7)`, carril 1 | Seguro: el coche de `x` 168 ya ha pasado la columna 4 (entre 0,51 y 1,44 s).                                              |
| 2,6 s  | `(4, 6)`, carril 2 | Seguro: el coche más cercano que viene está en `x` 504 y no llega hasta los 4,32 s.                                       |
| 3,4 s  | `(4, 5)`, carril 3 | Seguro: el camión que viene no llega hasta los 4,49 s.                                                                    |
| 4,2 s  | `(4, 4)`, mediana  | Seguro.                                                                                                                   |
| 5,0 s  | `(4, 3)`, carril 4 | **Aplastado**: el coche que empezó en `x` 758 está en `x` 258 (caja 264..316) y pasa por la columna 4 entre 4,6 y 5,44 s. |

Con el carril 6 en rojo desde los 4,0 s y el carril 4 en rojo desde los 4,5 s, el 1.er bit no se aplasta:

- A los 5,0 s salta al carril 4 parado: el coche más cercano se quedó en `x` 308 (caja 314..366) y no toca la columna 4.
- A los 5,8 s salta al carril 5, en verde: sus dos coches van hacia la derecha y ya han pasado o no llegan hasta los 9,8 s.
- A los 6,6 s salta al carril 6 parado: el camión se quedó en `x` 364 (caja 370..550) y no toca la columna 4.
- A los 7,4 s llega a la fila 0 y suma 100.
- En ese momento el atasco del carril 6 va por 0,85 y el del 4 por 0,725: ninguno colapsa si se vuelven a poner en verde antes de los 8,0 y 8,5 s.

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Fase inicial. Tablero, pasos de cebra, los 6 semáforos en verde y el tráfico moviéndose a velocidad del nivel 1, como fondo animado. No hay bits ni barras de atasco y nada suma. Espacio llama a `initGame()` (`score` 0, `level` 1, `lives` 3, 0 bits a salvo, `resetLanes()`, atascos a 0, sin bits, `k` 0, 1.er bit a 1 000 ms) y pasa a `playing`. |
| `playing`  | Reglas de abajo.                                                                                                                                                                                                                                                                                                                                        |
| `gameover` | Se alcanza al perder la 3.ª vida (por aplastamiento o por colapso) o con `end()`. Todo queda quieto: coches, bits y barras. Los semáforos se dibujan al 35 % de opacidad. No hay input. Espacio no reinicia.                                                                                                                                            |

La fase `dead` no se usa: al perder una vida la partida sigue en el mismo frame, porque el jugador no es una entidad que reaparezca.

Reglas del motor:

- En cada frame de `playing`, en este orden:
  - Se aplican los cambios de semáforo de la cola, todos los del frame.
  - Se actualizan los atascos y se resuelven los colapsos.
  - Se mueven los coches de los carriles en verde y se suman 10 por cada envolvente.
  - Corre el temporizador de aparición y, si toca, aparece un bit.
  - Corren los temporizadores de salto y se resuelven los saltos, de arriba abajo.
  - Se comprueban los aplastamientos y las llegadas.
- Si en un mismo frame se pierden varias vidas (varios colapsos o aplastamientos), se restan todas, con mínimo 0. Con 0 vidas, `gameover` al final del frame.
- Resolución lógica 768×576 (4:3), con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- Todos los límites usan `W`, `H`, `CELL`, `COLS` y `ROWS`, nunca `canvas.width` ni `canvas.height`.
- `dt` en segundos, limitado a `MAX_DT` (50 ms). El coche más rápido (252 px/s desde el nivel 9) avanza como mucho 12,6 px por frame, menos que la caja del bit (32 px): no hay efecto túnel. El salto más corto (500 ms) es mayor que `MAX_DT`, así que un bit nunca salta dos veces en un frame.
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input y la cola de cambios. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`. Atascos, temporizadores y semáforos se conservan.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa.
- Lo único que se escribe con `fillText` es el número de cada carril, "1" a "6", junto a su semáforo, porque es la tecla que lo controla y no cabe en el HUD.
- Mapeo al HUD: `score` = puntuación, `level` = nivel, `lives` = vidas que quedan (3 → 0).
- `onStats` solo cuando cambian `score`, `level` o `lives`. `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- Dibujo con primitivas (sin imágenes):
  - Filas 0 y 8 en `COLORS.safe` con una línea de 2 px en `COLORS.bankEdge` en el borde que da a la autopista. Fila 4 en `COLORS.safe` con una línea discontinua central de 2 px en `COLORS.medianLine`.
  - Carriles en `COLORS.road` con líneas discontinuas de 1 px en `COLORS.laneLine` entre ellos.
  - Pasos de cebra: en cada carril, en las columnas 1, 4, 7 y 10, tres franjas de 8×56 en `COLORS.zebra`.
  - Cada coche es un `fillRect` de su largo × 40 (12 px de margen arriba y abajo) en `LANE_COLORS[carril − 1]` con glow, con dos faros de 4×6 en `COLORS.headlight` en el lado hacia el que avanza. En un carril en rojo lleva además dos luces de freno de 4×6 en `COLORS.brake` en el lado de atrás.
  - Semáforo: círculo de radio 10 en `(24, centro de la fila)`, en `COLORS.lightGreen` o `COLORS.lightRed` con glow. El número del carril con `fillText`, 14 px, `fontFamily` de `setupCanvas`, en `COLORS.laneNumber`, en `(44, centro de la fila)`.
  - Barra de atasco: `fillRect(0, fila × 64 + 60, 768 × jam, 4)`, en `COLORS.jam` por debajo de 0,75 y en `COLORS.jamWarn` desde 0,75. No se dibuja con `jam` 0.
  - Destello de colapso: el carril entero en `COLORS.collapse` durante 400 ms.
  - Cada bit es un cuadrado de 32×32 centrado en su celda en `COLORS.bit` con glow y dos ojos de 4×4 en `COLORS.eyes` hacia arriba.
  - La papilla es una estrella de 8 rayos de 2 px en `COLORS.splat` con glow, de 48 px de diámetro, durante 600 ms.
  - El glow es `shadowBlur` con `shadowColor` igual al color de trazo o relleno.
  - Tamaños, glow y formas se ajustan en el pulido sin cambiar las cajas de choque.
- Los colores se leen de `config.ts`. Nada se lee con `getComputedStyle` en cada frame.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `Digit1`, `Digit2`, `Digit3`, `Digit4`, `Digit5`, `Digit6` y `Space`. Se usa `event.code`, así que funcionan igual en teclados QWERTY y AZERTY. La P no es del juego: la gestiona el player.
- `preventDefault()` de los códigos del juego solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- Cada `keydown` de `Digit1`–`Digit6` sin autorrepetición (`event.repeat` se ignora) encola un cambio del carril 1–6. Mantener la tecla no hace parpadear el semáforo.
- Los cambios solo se encolan en `playing`. En `ready` se capturan pero se descartan.
- Espacio se lee como pulsación de un frame (`pressed`) y solo hace algo en `ready`. En `playing` se captura (para que no haga scroll) pero no hace nada.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- `clear()` vacía la cola de cambios y descarta las pulsaciones pendientes.

### Textos

| Elemento          | Texto                                       |
| ----------------- | ------------------------------------------- |
| Overlay de inicio | "CRUCE NEÓN" y "PULSA ESPACIO PARA EMPEZAR" |
| Tira de controles | `1 2 3 4 5 6` SEMÁFORO · `P` PAUSA          |
| Canvas            | "1" a "6", junto al semáforo de cada carril |

## Plan de implementación

1. **Catálogo.** Comprobar con `select max(sort_order) from public.games` que sigue en 8 y con `select count(*) from public.games where id = 'cruce-neon'` que da 0. Si no, parar y preguntar al usuario. Crear `pending_add_cruce_neon_game.sql`, aplicarlo con `apply_migration`, renombrarlo con su versión y regenerar `lib/supabase/database.types.ts`. Verificación: `select id, title, cat, color, cover, best, plays, sort_order from public.games where id = 'cruce-neon'` devuelve `cruce-neon`, `CRUCE NEÓN`, `PUZZLE`, `magenta`, `cover-cruce-neon`, `0`, `0`, `9`; la Biblioteca muestra CRUCE NEÓN en la 9.ª posición; `#/jugar/cruce-neon` abre la simulación.
2. **Portada.** `.cover-cruce-neon` en `app/globals.css`, junto a `.cover-duelo`, diseñada con `/frontend-design`. Verificación: la tarjeta de la Biblioteca y el detalle `#/juego/cruce-neon` muestran la portada a 1440 px y 375 px.
3. **Base del motor.** `config.ts`, `lanes.ts` y `bits.ts`. Verificación: `npm run lint` y `npm run build` pasan.
4. **Input.** `input.ts` con la cola de cambios, la pulsación de Espacio y la regla de `preventDefault`. Verificación: `npm run build` pasa.
5. **Motor.** `engine.ts` con las fases, `initGame`, semáforos, atascos, colapsos, tráfico, envolventes, aparición y saltos de los bits, aplastamientos, llegadas, niveles, el dibujo, `setupCanvas`, `setPaused`, `end`, `destroy` y los callbacks. Verificación: `npm run build` pasa.
6. **Registro.** `definition.ts` y la entrada `"cruce-neon": cruceNeonEngine` en `ENGINES`. Verificación: en `#/jugar/cruce-neon` Espacio empieza la partida, el HUD marca 10 a los 0,5 s y el 1.er bit se aplasta a los 5,0 s si no se toca nada.
7. **Pulido con `/frontend-design`.** Coches, luces de freno, pasos de cebra, semáforos, números de carril, barras de atasco, bits, papilla, destello y la tira de controles a 1440 px y 375 px, sin cambiar la estética del Vault.
8. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/cruce-neon` a 1440 y 375 px, con capturas (no se versionan). Leer coches, bits, semáforos y barras interceptando `fillRect`, `arc` y `fillText` del contexto 2D. La cronología del 1.er bit se comprueba pulsando 4 y 6 con `page.keyboard` en los tiempos de la tabla. Para llegar al nivel 2 sin depender de un bot, usar un cambio local sin commitear en `LANES` (carriles sin coches) y anotarlo. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `add_cruce_neon_game` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `cruce-neon` con título `CRUCE NEÓN`, `cat` `PUZZLE`, `color` `magenta`, `cover` `cover-cruce-neon`, `best` 0, `plays` `0` y `sort_order` 9, y las otras 8 filas no han cambiado.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] La Biblioteca muestra CRUCE NEÓN con la portada `.cover-cruce-neon` en la 9.ª posición, y el filtro PUZZLE lo muestra junto a TETRIS.
- [ ] El Home muestra "9 JUEGOS".
- [ ] `ENGINES` tiene las entradas `asteroids`, `tetris`, `arkanoid`, `snake` y `cruce-neon`, y `GamePlayer.tsx` no ha cambiado.
- [ ] Al abrir `/#/jugar/cruce-neon` se ve "CRUCE NEÓN / PULSA ESPACIO PARA EMPEZAR" sobre la autopista con el tráfico en movimiento, los 6 semáforos en verde y sin bits, y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / ♥ ♥ ♥ / 01, y pulsar 1 a 6 no cambia ningún semáforo.
- [ ] Espacio empieza la partida, el overlay desaparece y los coches están en las `x` iniciales de la tabla de carriles.
- [ ] Sin tocar nada, el HUD marca 10 a los ~0,5 s (sale el coche del carril 4).
- [ ] El 1.er bit aparece en `(4, 8)` a los ~1,0 s y salta una fila cada ~800 ms.
- [ ] Sin tocar nada, el 1.er bit se aplasta en el carril 4 a los ~5,0 s: el HUD pierde un ♥ y se ve la papilla `#ff006e` unos 600 ms.
- [ ] Con el carril 6 en rojo desde los 4,0 s y el carril 4 en rojo desde los 4,5 s, el 1.er bit llega a la fila 0 a los ~7,4 s y el HUD sube 100 en ese momento.
- [ ] Cada tecla de 1 a 6 cambia el semáforo de su carril (1 = fila 7, la de abajo; 6 = fila 1, la de arriba) de `#00ff88` a `#ff006e` y viceversa.
- [ ] Mantener una tecla de 1 a 6 cambia el semáforo una sola vez.
- [ ] En rojo, los coches del carril se paran donde están y muestran luces de freno; en verde siguen desde el mismo sitio.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] Un bit no salta a una celda donde hay un coche parado ni a una donde hay otro bit: espera y lo vuelve a intentar en el intervalo siguiente.
- [ ] Un coche parado nunca aplasta a un bit.
- [ ] Cada coche que sale de la pantalla con su carril en verde suma 10; un carril en rojo no suma.
- [ ] Mantener un carril en rojo 4 s seguidos lo colapsa: el HUD pierde un ♥, el carril destella y su semáforo vuelve a `#00ff88` solo.
- [ ] 2 s en rojo y 1 s en verde dejan la barra de atasco de ese carril al 30 % de 768 px (≈ 230 px); la barra es `#f5ff00` por debajo del 75 % y `#ff006e` desde el 75 %.
- [ ] Poner los 6 carriles en rojo nada más empezar abre el modal FIN DEL JUEGO a los ~4 s, con la misma puntuación que el HUD.
- [ ] Con el 10.º bit a salvo el nivel del HUD pasa a 02, el 11.º suma 200, los bits aparecen cada 3 700 ms, saltan cada 760 ms y el carril 5 va a 154 px/s.
- [ ] En el nivel 9 los bits aparecen cada 1 600 ms y saltan cada 500 ms, y en el 10 siguen igual.
- [ ] Nunca hay más de 12 bits a la vez.
- [ ] Perder la 3.ª vida por aplastamiento abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] FIN abre el modal con la puntuación actual; el tráfico y los bits quedan quietos y los semáforos se atenúan al 35 %.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa: `fillText` solo se llama con "1", "2", "3", "4", "5" y "6".
- [ ] Los bits son `#00ff88` y los coches de los carriles 1 a 6 son `#f5ff00`, `#00f5ff`, `#ffcf3a`, `#c7d0e0`, `#f5ff00` y `#d97a3a`.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas, los atascos y los saltos; al reanudar, ningún semáforo cambia solo.
- [ ] En el modal se pueden escribir iniciales con espacios, con la letra P y con los dígitos 1 a 6 sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'cruce-neon'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña CRUCE NEÓN del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/cruce-neon`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / ♥ ♥ ♥ / 01, los 6 semáforos en verde y sin bits.
- [ ] SALIR lleva a `#/juego/cruce-neon`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1536 y `canvas.height` es 1152, y el coche del carril 4 sigue saliendo a los ~0,5 s.
- [ ] A 1440 px y a 375 px no hay scroll horizontal, y el canvas mantiene la proporción 768:576 (4:3) dentro del CRT.
- [ ] La tira de controles muestra `1 2 3 4 5 6` SEMÁFORO · `P` PAUSA, y en táctil se ve "REQUIERE TECLADO".
- [ ] Mover el ratón o hacer clic sobre un semáforo no cambia nada.
- [ ] `/#/jugar/asteroids`, `/#/jugar/tetris`, `/#/jugar/arkanoid` y `/#/jugar/snake` siguen funcionando y `/#/jugar/ranaria` sigue simulando.
- [ ] No hay peticiones a `/games/cruce-neon/…` ni a archivos de audio en la pestaña de red.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/cruce-neon`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** fila nueva `cruce-neon` con `sort_order` 9. Es la regla del game jam: nunca sustituye un juego simulado.
- **No:** sustituir RANARIA. Con esta variante, además, no hay solapamiento: RANARIA es un Frogger y CRUCE NEÓN C no. Decisión del agente (game jam); revisar.
- **Sí:** id `cruce-neon` y título CRUCE NEÓN, comunes a las tres variantes. Decisión del agente (game jam); revisar.
- **Sí:** `cat` `PUZZLE`, la categoría con menos juegos (1, TETRIS) junto a VERSUS. El juego es de decidir cuándo parar cada carril, no de esquivar. Decisión del agente (game jam); revisar.
- **No:** `ARCADE`, que ya tiene 4 juegos, ni `VERSUS`, que es para dos jugadores.
- **Sí:** `color` `magenta`, el menos usado del catálogo (1, TETRIS), y el color del semáforo en rojo. Decisión del agente (game jam); revisar.
- **Sí:** `best` 0 y `plays` `'0'`, el default del contrato. Decisión del agente (game jam); revisar.
- **Sí:** portada nueva `.cover-cruce-neon` con autopista, paso de cebra, semáforo y un bit. Decisión del agente (game jam); revisar.
- **No:** reutilizar `.cover-rana`.
- **Sí:** el `short` común de las tres variantes, con la alternativa sin río apuntada en "Catálogo" para elegir al implementar. Decisión del agente (game jam); revisar.
- **Sí:** juego original, sin código ni assets de referencia.
- **Sí:** el jugador controla los semáforos y los bits cruzan solos. Es otra lectura del tema: la papilla la evita quien para el tráfico. Decisión del agente (game jam); revisar.
- **Sí:** 768×576 (4:3) con 12×9 celdas de 64 px: 6 carriles, mediana y dos aceras. Llena el CRT y deja cajas grandes para leer varios bits a la vez. Decisión del agente (game jam); revisar.
- **No:** el tablero de 720×600 de las variantes A y B. Allí hay río y 5 carriles, y aquí hacen falta 6 carriles con número.
- **Sí:** rojo congela el carril entero al instante. Es simple de leer y de verificar. Decisión del agente (game jam); revisar.
- **No:** coches que frenan antes de una línea de parada, ni ámbar.
- **Sí:** atasco que sube 0,25/s en rojo y baja 0,2/s en verde; a 1 colapsa, quita una vida y fuerza el verde. Es lo que impide dejarlo todo en rojo. Decisión del agente (game jam); revisar.
- **Sí:** los bits saltan sin mirar el tráfico en verde, pero no se meten en un coche parado ni en otro bit. Decisión del agente (game jam); revisar.
- **Sí:** 100 × nivel por bit a salvo y 10 por coche que sale de la pantalla. El tráfico premia tener carriles en verde. Decisión del agente (game jam); revisar.
- **Sí:** nivel cada 10 bits; aparición de 4 000 a 1 600 ms, salto de 800 a 500 ms y tráfico ×1,0 a ×1,8. Decisión del agente (game jam); revisar.
- **Sí:** tráfico y secuencia de aparición deterministas. Es justo para el leaderboard y hace verificable la cronología del 1.er bit. Decisión del agente (game jam); revisar.
- **No:** columnas de aparición al azar.
- **Sí:** 3 vidas, sin fase `dead`: la partida sigue en el mismo frame tras perder una vida. Decisión del agente (game jam); revisar.
- **Sí:** teclas 1 a 6 por `event.code` (`Digit1`–`Digit6`), sin autorrepetición. Decisión del agente (game jam); revisar.
- **No:** teclado numérico, ni ↑ / ↓ para elegir carril y Espacio para cambiarlo. Duplican controles o los hacen más lentos.
- **Sí:** el canvas escribe "1" a "6" junto a cada semáforo con `fillText`. Es lo único escrito y no es estado del HUD.
- **Sí:** `ready` con el tráfico en movimiento, todo en verde y sin bits; `initGame()` vuelve a colocar el tráfico en sus `x` iniciales. Decisión del agente (game jam); revisar.
- **Sí:** en `gameover` todo se congela y los semáforos se atenúan al 35 %, porque son la "entidad" del jugador.
- **Sí:** motor sin React en `lib/cruce-neon/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault en el canvas y primitivas en vez de imágenes. No hay `public/games/cruce-neon/`.
- **Sí:** HUD de React y modal de la plataforma.
- **Sí:** límite `MAX_SCORE` en el motor, porque los niveles no se acaban.
- **No:** sonido. Ningún juego real del Vault lo tiene. Decisión del agente (game jam); revisar.
- **No:** ratón y táctil, aunque hacer clic en un semáforo sería natural. Van en su propio spec.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El juego se aleja del Frogger que pide el tema.                                                     | Es la variante alternativa a propósito. Las variantes A y B cubren la lectura directa.                                                                                       |
| Seis teclas de dígito son difíciles de encontrar sin mirar.                                         | El número de cada carril se dibuja junto a su semáforo y el orden es de abajo arriba, como suben los bits. Si en el pulido no se entiende, se revisa el mapeo en Decisiones. |
| El `sort_order` 9 o el id `cruce-neon` se ocupan antes de implementar.                              | El paso 1 comprueba el máximo y el id antes de la migración. Si cambian, se para y se pregunta.                                                                              |
| Varios colapsos en el mismo frame dejan las vidas en negativo.                                      | Las vidas se restan con mínimo 0 y el `gameover` se resuelve al final del frame. Criterio de los 6 carriles en rojo.                                                         |
| Los tiempos de la cronología dependen de cuándo se pulsa en Playwright.                             | Los márgenes son de al menos 0,4 s (por ejemplo, el carril 4 se puede poner en rojo entre 4,1 y 4,6 s). Se anotan los tiempos reales en la verificación.                     |
| Un frame largo hace que un coche atraviese un bit.                                                  | `dt` limitado a 50 ms: 12,6 px por frame como mucho, menos que la caja de 32 px.                                                                                             |
| La puntuación no tiene techo.                                                                       | `MAX_SCORE` en cada suma.                                                                                                                                                    |
| `shadowBlur` en 16 coches, 12 bits y 6 semáforos baja el rendimiento.                               | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2, quitar el glow de los coches y dejarlo en semáforos y bits. Se anota.                         |
| Llegar al nivel 2 (10 bits) jugando en Playwright es lento.                                         | Cambio local sin commitear en `LANES` (carriles sin coches), como el motor de prueba del SPEC 07. Se anota.                                                                  |
| Al perder la 3.ª vida, el HUD muestra "—" en vidas, porque `GamePlayer.tsx` trata 0 como sin vidas. | Aceptado: pasa igual en ASTEROIDS y ARKANOID, y cambiarlo toca el player.                                                                                                    |
| Los dígitos llegan al juego mientras se escriben iniciales en el modal.                             | El modal abre en `gameover`, donde no se captura input; criterio de iniciales con los dígitos 1 a 6.                                                                         |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Retirar o sustituir RANARIA.
- Bit controlado por el jugador, río y portales (variantes A y B).
- Ámbar, semáforos automáticos, tipos de bit y vehículos de emergencia.
- Carriles aleatorios.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
