# SPEC 08 — Juego real: TETRIS

> **Estado:** Approved
> **Depende de:** SPEC 06, SPEC 07
> **Fecha:** 2026-10-07
> **Objetivo:** Portar a TypeScript el Tetris de `references/started-games/03-tetris/` y hacerlo jugable en `#/jugar/tetris`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

Hoy el catálogo tiene CAÍDA (`caida`), un juego de piezas simulado: el player sube la puntuación con un intervalo.
`references/started-games/03-tetris/` tiene un Tetris completo en canvas (`game.js`, 332 líneas), pensado como página independiente.
Ese código guarda el estado en globals (`game.js:45`), usa 11 `getElementById` (`:33-43`) y escucha `keydown` en `document` sin quitar nunca la escucha (`:280`).
También tiene su propio panel HTML de SCORE/LINES/LEVEL, un overlay HTML de PAUSA y GAME OVER, la tecla P, un botón Reiniciar y un tema claro/oscuro con `localStorage`.
Este spec porta el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
El catálogo ya tiene un juego equivalente, CAÍDA, que pasa a llamarse TETRIS.

## Alcance

**Dentro:**

- Migración `replace_caida_with_tetris`: id, título y descripciones. La portada `.cover-tetro` se mantiene.
- Actualizar las referencias al id `caida` en `lib/home.ts`: la fila de `RECENT_SCORES` y el comentario de `RecentScore.gameId`.
- Motor de TETRIS en TypeScript en `lib/tetris/`, sin React, con la misma jugabilidad que `game.js`: tablero de 10×20, las 8 piezas (los 7 tetrominós y la "tuerca"), rotación horaria con wall kicks, soft drop, hard drop, pieza fantasma, siguiente pieza, puntuación clásica por nivel y aceleración cada 10 líneas.
- Canvas de 450×600: tablero de 300×600 y una columna lateral de 150 px con SIGUIENTE y LÍNEAS.
- Paleta neón del Vault en el canvas: I cyan, O amarilla, T magenta, S verde, Z naranja, J violeta, L dorada y tuerca plateada.
- Definición `tetrisEngine` en `lib/tetris/definition.ts` y entrada en `lib/engines/registry.ts`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: columna lateral, rejilla y glow de las piezas.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido. La referencia no tiene.
- Leaderboard real en el detalle (`#/juego/tetris`). Sigue con `seededScores`.
- `best` y `plays` calculados.
- Alias o redirección de `#/juego/caida` y `#/jugar/caida`.
- Mecánicas nuevas y cambios de balance: bolsa de 7, hold, lock delay, SRS, T-spins, DAS propio, modo demo en `ready`.
- Lo que se descarta de la referencia: tema claro/oscuro, panel HTML, overlay de PAUSA y GAME OVER, botón Reiniciar, tecla P y título `<h1>`.
- Ocultar el bloque de vidas del HUD en juegos sin vidas (toca `GamePlayer.tsx`).
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (`supabase/migrations/<version>_replace_caida_with_tetris.sql`)

```sql
update public.games set
  id = 'tetris',
  title = 'TETRIS',
  short = 'Encaja las piezas antes de que el techo te aplaste.',
  long = 'Siete tetrominós y una tuerca hueca caen desde la oscuridad. Rótalos, guíate por su sombra y suéltalos de golpe para limpiar líneas. Cada 10 líneas sube el nivel y la caída se acelera.'
where id = 'caida';
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_replace_caida_with_tetris.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`PUZZLE`), `color` (`magenta`), `cover` (`cover-tetro`), `best` (`184220`), `plays` (`31.8K`) y `sort_order` (`2`) no cambian.
- Hoy (2026-10-07) `public.scores` tiene 0 filas con `game_id = 'caida'`, así que la FK no bloquea el `update` y la migración no borra nada.
- `.cover-tetro` no se renombra: no contiene el id viejo y ya dibuja tetrominós neón. `app/globals.css` no cambia.
- En `lib/home.ts`, la fila de `RECENT_SCORES` con `gameId: "caida"` (NEONFOX, 184220) pasa a `gameId: "tetris"`, y el comentario `e.g. "caida"` pasa a `e.g. "tetris"`.
- `#/juego/caida` y `#/jugar/caida` dejan de existir y caen al Home.

### Motor (`lib/tetris/`)

| Archivo         | Contenido                                                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`     | `W` 450, `H` 600, `COLS` 10, `ROWS` 20, `BLOCK` 30, `BOARD_W` 300, `LINE_SCORES`, constantes de velocidad y nivel, `MAX_SCORE`, `COLORS` y `PIECE_COLORS`.                         |
| `pieces.ts`     | `PIECES` (las 8 matrices de `game.js:19-29`, indexadas 1–8), `randomPiece()` y `rotateCW(shape)`.                                                                                  |
| `board.ts`      | `createBoard()`, `collide(board, shape, x, y)`, `merge(board, piece)`, `clearLines(board)` (devuelve las filas limpiadas) y `ghostY(board, piece)`. Mismo algoritmo que `game.js`. |
| `input.ts`      | `createInput(target, isActive)`: cola de pulsaciones, teclas mantenidas, `drain()`, `isDown()`, `clear()` y `destroy()`.                                                           |
| `engine.ts`     | `createTetrisGame(canvas, callbacks): GameEngine`.                                                                                                                                 |
| `definition.ts` | `tetrisEngine: EngineDefinition`.                                                                                                                                                  |

No hay `types.ts` propio: el motor usa directamente los tipos de `lib/engines/types.ts`.

```ts
// lib/tetris/definition.ts
export const tetrisEngine: EngineDefinition = {
  id: "tetris",
  width: W, // 450
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: null },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "→"], label: "MOVER" },
    { keys: ["↑", "X"], label: "ROTAR" },
    { keys: ["↓"], label: "BAJAR" },
    { keys: ["ESPACIO"], label: "CAÍDA" },
  ],
  create: createTetrisGame,
};
```

```ts
// config.ts — valores de game.js
export const LINE_SCORES = [0, 100, 300, 500, 800]; // × nivel
export const START_INTERVAL = 1000; // ms por fila en el nivel 1
export const INTERVAL_STEP = 90; // ms menos por nivel
export const MIN_INTERVAL = 100;
export const LINES_PER_LEVEL = 10;
export const MAX_SCORE = 9_999_999; // CHECK de public.scores

// Colores del canvas, copiados de los tokens de :root.
export const PIECE_COLORS = [
  "", // 0: celda vacía
  "#00f5ff", // 1 I — --cyan
  "#f5ff00", // 2 O — --yellow
  "#ff006e", // 3 T — --magenta
  "#00ff88", // 4 S — --green
  "#ff7700", // 5 Z — naranja de .cover-tetro
  "#aa00ff", // 6 J — violeta de .cover-tetro
  "#ffcf3a", // 7 L — --gold
  "#c7d0e0", // 8 N (tuerca) — --silver
];
export const COLORS = {
  bg: "#000",
  panelBg: "#0f0f18", // --bg-2
  grid: "rgba(255, 255, 255, 0.06)", // --line-2
  divider: "rgba(0, 245, 255, 0.18)", // --line
  label: "#8a8fb5", // --ink-dim
  value: "#e6e9ff", // --ink
};
```

Composición del canvas (450×600):

| Zona            | Posición                                   | Qué se dibuja                                                                                                                                        |
| --------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tablero         | x 0–300, y 0–600                           | Fondo `COLORS.bg`, rejilla de 10×20 con `COLORS.grid` y `lineWidth` 0,5, bloques fijados, pieza fantasma y pieza actual.                             |
| Separador       | x = 300                                    | Línea vertical de `COLORS.divider`.                                                                                                                  |
| Columna lateral | x 300–450                                  | Fondo `COLORS.panelBg`.                                                                                                                              |
| SIGUIENTE       | etiqueta arriba, caja 120×120 en (315, 50) | Etiqueta "SIGUIENTE" en `COLORS.label`. La siguiente pieza con bloques de 30 px, centrada en una rejilla de 4×4 como `drawNext` (`game.js:212-221`). |
| LÍNEAS          | bajo la caja SIGUIENTE                     | Etiqueta "LÍNEAS" en `COLORS.label` y el número de líneas en `COLORS.value`.                                                                         |

Las posiciones exactas de las etiquetas se ajustan en el pulido sin salir de la columna lateral.

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                                                       |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Fase inicial. Tablero vacío con la rejilla, caja SIGUIENTE vacía y LÍNEAS 0. No cae ninguna pieza. Espacio llama a `initGame()` (tablero vacío, `score` 0, `lines` 0, `level` 1, intervalo 1000 ms, `dropAccum` 0, `next = randomPiece()` y `spawn()`) y pasa a `playing`. |
| `playing`  | Igual que en `game.js`: gravedad, movimiento, rotación, soft drop, hard drop, fijado, limpieza de líneas y aparición de la siguiente pieza.                                                                                                                                |
| `gameover` | Se alcanza cuando la pieza nueva colisiona al aparecer (`game.js:149-151`) o con `end()`. El tablero queda congelado. La pieza actual y su fantasma no se dibujan y no hay input. La columna lateral se sigue viendo. Espacio no reinicia.                                 |

La fase `dead` no se usa.

Reglas del motor:

- La jugabilidad es la de `game.js` sin cambios:
  - 8 piezas con la misma probabilidad (`Math.floor(Math.random() * 8) + 1`), sin bolsa. La 8.ª es la tuerca, `[[8,8,8],[8,0,8],[8,8,8]]`.
  - Aparición en `x = floor(COLS / 2) − floor(ancho / 2)` e `y = 0`.
  - Rotación horaria por transposición y reverso (`rotateCW`), con wall kicks `[0, −1, 1, −2, 2]` en ese orden. Si ninguno cabe, no rota.
  - Gravedad: `dropAccum += dt`. Cuando `dropAccum ≥ intervalo`, `dropAccum = 0` y la pieza baja una fila o, si no puede, se fija. No hay lock delay.
  - Fijar = `merge` + `clearLines` + `spawn`.
  - Puntos: `LINE_SCORES[filas] × nivel` al limpiar, +1 por fila de soft drop y +2 por celda de hard drop.
  - Nivel = `floor(lines / 10) + 1`, recalculado al limpiar líneas. Intervalo = `max(100, 1000 − (nivel − 1) × 90)` ms.
- Resolución lógica 450×600, con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- `dt` limitado a 50 ms. El motor trabaja en milisegundos, como `game.js`.
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa. Solo dibuja SIGUIENTE y LÍNEAS, porque no caben en el HUD.
- Mapeo al HUD: `score` = puntuación, `level` = nivel, `lives` = `null` (el HUD muestra "—").
- `onStats` solo cuando cambian `score` o `level`. `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- La puntuación se limita a 9 999 999: cada suma hace `score = Math.min(score + puntos, MAX_SCORE)`.
- Cada bloque es un `fillRect` de `BLOCK − 2` con el color de su pieza y la franja de brillo de 4 px de `rgba(255, 255, 255, 0.12)` arriba, como `drawBlock` (`game.js:161-171`).
- La pieza fantasma usa el color de la pieza con `globalAlpha` 0,2 y sin glow.
- Las piezas fijadas, la actual y la siguiente llevan glow: `shadowBlur` con `shadowColor` igual a su color.
- Los colores se leen de `config.ts`. Nada se lee con `getComputedStyle` en cada frame; la referencia lo hacía con la rejilla (`game.js:174`).
- Lo que se quita de la referencia: pausa con `KeyP`, botón Reiniciar, overlay HTML, panel HTML, tema claro/oscuro y `localStorage`.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `ArrowLeft`, `ArrowRight`, `ArrowUp`, `ArrowDown`, `KeyX` y `Space`. La P no es del juego: la gestiona el player.
- `preventDefault()` de los códigos del juego solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- Cada `keydown` capturado, también las repeticiones del sistema (`e.repeat`), entra en la cola. Así mantener ←, → o ↓ repite la acción como en `game.js`, sin DAS propio.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- El motor vacía la cola con `drain()` al principio de cada frame y aplica las acciones en orden, antes de la gravedad.
- En `ready`, solo Espacio hace algo (empezar). El resto de la cola se descarta.
- La pulsación de Espacio que empieza la partida no suelta la pieza. El motor descarta los Espacio de la cola hasta que `isDown("Space")` es falso.
- `clear()` vacía la cola y suelta todas las teclas.

### Textos

| Elemento           | Texto                                                                 |
| ------------------ | --------------------------------------------------------------------- |
| Overlay de inicio  | "TETRIS" y "PULSA ESPACIO PARA EMPEZAR"                               |
| Tira de controles  | `← →` MOVER · `↑` `X` ROTAR · `↓` BAJAR · `ESPACIO` CAÍDA · `P` PAUSA |
| Columna del canvas | "SIGUIENTE" y "LÍNEAS"                                                |

## Plan de implementación

1. **Catálogo.** Comprobar con `select count(*) from public.scores where game_id = 'caida'` que sigue en 0. Si no lo está, parar y preguntar al usuario qué hacer con esas filas antes de seguir. Crear `pending_replace_caida_with_tetris.sql`, aplicarlo con `apply_migration`, renombrarlo con su versión y regenerar `lib/supabase/database.types.ts`. Actualizar `lib/home.ts`. Verificación: `select id, title, cat, color, cover, sort_order from public.games where id = 'tetris'` devuelve `tetris`, `TETRIS`, `PUZZLE`, `magenta`, `cover-tetro`, `2`; `grep -rn "caida" app components lib` vacío; la Biblioteca muestra TETRIS en la 2.ª posición; `#/jugar/tetris` abre la simulación.
2. **Base del motor.** `config.ts` y `pieces.ts`. Verificación: `npm run lint` y `npm run build` pasan.
3. **Tablero.** `board.ts` con `createBoard`, `collide`, `merge`, `clearLines` y `ghostY`. Verificación: `npm run build` pasa.
4. **Input.** `input.ts` con la cola, las repeticiones y la regla de `preventDefault`. Verificación: `npm run build` pasa.
5. **Motor.** `engine.ts` con las fases, `initGame`, `spawn`, gravedad, acciones, fijado, puntos, nivel, el dibujo del tablero y la columna lateral, `setupCanvas`, `setPaused`, `end`, `destroy` y los callbacks. Verificación: `npm run build` pasa.
6. **Registro.** `definition.ts` y la entrada `tetris: tetrisEngine` en `ENGINES`. Verificación: en `#/jugar/tetris` Espacio empieza la partida, el HUD cambia al puntuar y llenar el tablero abre el modal.
7. **Pulido con `/frontend-design`.** Columna lateral, rejilla, glow y la tira de controles a 1440 px y 375 px, sin cambiar la estética del Vault. La portada `.cover-tetro` no cambia.
8. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/tetris` a 1440 y 375 px, con capturas (no se versionan). Leer la rejilla del canvas con `getImageData` (celdas de 30 px) para comprobar piezas, colores y líneas. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `replace_caida_with_tetris` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `tetris` con título `TETRIS`, `cat` `PUZZLE`, `color` `magenta`, `cover` `cover-tetro` y `sort_order` 2, y ya no tiene la fila `caida`.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] `grep -rn "caida" app components lib` no devuelve resultados, y `/#/juego/caida` y `/#/jugar/caida` muestran el Home.
- [ ] La Biblioteca muestra TETRIS con la portada `.cover-tetro` en la 2.ª posición.
- [ ] El Home muestra la fila de NEONFOX en "ÚLTIMAS PUNTUACIONES" con el título TETRIS.
- [ ] `ENGINES` tiene las entradas `asteroids` y `tetris`, y `GamePlayer.tsx` no ha cambiado.
- [ ] Al abrir `/#/jugar/tetris` se ve "TETRIS / PULSA ESPACIO PARA EMPEZAR" sobre el tablero vacío, y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / — / 01 y no cae ninguna pieza.
- [ ] Espacio empieza la partida, el overlay desaparece y aparece una pieza arriba del tablero sin soltarse.
- [ ] ← mueve la pieza una columna a la izquierda y → una a la derecha; contra la pared no se mueve.
- [ ] Mantener → mueve la pieza varias columnas seguidas hasta la pared.
- [ ] ↑ y X rotan la pieza en sentido horario; pegada a la pared, la pieza se desplaza para poder rotar.
- [ ] ↓ baja la pieza una fila y suma 1 punto en el HUD.
- [ ] En el tablero vacío, soltar Espacio y volver a pulsarlo antes de que la primera pieza baje la deja caer hasta el fondo y suma 36 puntos (34 si es la tuerca).
- [ ] Sin tocar nada, en el nivel 1 la pieza baja una fila por segundo.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] Limpiar 1, 2, 3 o 4 líneas en el nivel 1 suma 100, 300, 500 u 800 puntos, y LÍNEAS aumenta en esa cantidad.
- [ ] Al llegar a 10 líneas, el nivel del HUD pasa a 02 y la pieza baja una fila cada 910 ms.
- [ ] El HUD muestra — en vidas durante toda la partida.
- [ ] Llenar el tablero hasta que la pieza nueva no quepa abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] FIN abre el modal con la puntuación actual; el tablero queda congelado y la pieza actual y su fantasma desaparecen.
- [ ] La caja SIGUIENTE muestra la pieza que aparece después.
- [ ] La pieza fantasma se ve en la fila donde aterrizaría la pieza actual, con su color al 20 %.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa; solo "SIGUIENTE" y "LÍNEAS".
- [ ] La I es `#00f5ff`, la O `#f5ff00`, la T `#ff006e`, la S `#00ff88`, la Z `#ff7700`, la J `#aa00ff`, la L `#ffcf3a` y la tuerca `#c7d0e0`.
- [ ] La tuerca (anillo 3×3 hueco) aparece durante la partida.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas; al reanudar, la pieza no se mueve sola.
- [ ] En el modal se pueden escribir iniciales con espacios y con las letras P y X sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'tetris'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña TETRIS del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/tetris`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / — / 01 y el tablero vacío.
- [ ] SALIR lleva a `#/juego/tetris`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 900 y `canvas.height` es 1200.
- [ ] A 1440 px y a 375 px no hay scroll horizontal, y el canvas mide la altura de `.crt-screen` con proporción 450:600 (0,75), centrado con bandas negras.
- [ ] La tira de controles muestra `← →` MOVER · `↑` `X` ROTAR · `↓` BAJAR · `ESPACIO` CAÍDA · `P` PAUSA, y en táctil se ve "REQUIERE TECLADO".
- [ ] `/#/jugar/asteroids` sigue funcionando y `/#/jugar/serpentina` sigue simulando.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/tetris`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** sustituir CAÍDA por TETRIS. Decisión del usuario; dos juegos de piezas en el catálogo confundirían.
- **No:** añadir una novena fila.
- **Sí:** cambiar el id a `tetris` y el título a TETRIS. Decisión del usuario; es el nombre real del juego, como `rocas` → `asteroids`.
- **Sí:** el `update` no borra puntuaciones, porque `caida` tiene 0 filas en `public.scores`. Si aparecen antes de implementar, el paso 1 para y pregunta.
- **No:** mantener el id `caida`.
- **No:** renombrar `.cover-tetro`. Decisión del usuario; no contiene el id viejo y ya dibuja tetrominós neón.
- **Sí:** descripciones nuevas que nombran la tuerca, la sombra, el hard drop y la aceleración cada 10 líneas. Decisión del usuario; describen solo mecánicas que el juego tiene.
- **Sí:** jugabilidad idéntica a `game.js`, incluida la tuerca como 8.ª pieza con probabilidad 1/8. Decisión del usuario; es lo que hace la referencia aunque su README hable de 7 piezas.
- **No:** Tetris clásico de 7 piezas, bolsa de 7, hold, lock delay ni SRS.
- **Sí:** autorrepetición del sistema operativo para mantener teclas, como en `game.js`. Decisión del usuario.
- **No:** DAS propio en el motor. Cambiaría la sensación del juego.
- **Sí:** la pulsación de Espacio que empieza no suelta la pieza. Decisión del usuario; si no, la primera pieza caería sin que el jugador la viera.
- **Sí:** canvas de 450×600 con columna lateral para SIGUIENTE y LÍNEAS. Decisión del usuario; es la composición de la referencia y las líneas no tienen hueco en el HUD.
- **No:** 300×600 con la siguiente pieza encima del tablero, ni quitar la siguiente pieza.
- **Sí:** tablero vacío con la rejilla en `ready`. Decisión del usuario; escena quieta y legible bajo el overlay.
- **No:** modo demo en `ready`.
- **Sí:** motor sin React en `lib/tetris/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault con 8 colores: los 4 neones, `--gold`, `--silver` y el naranja y el violeta de `.cover-tetro`. Decisión del usuario; cada pieza se distingue por su color.
- **No:** solo 4 neones más `--ink` con colores repetidos.
- **Sí:** HUD de React y modal de la plataforma; en el canvas solo se dibujan SIGUIENTE y LÍNEAS, porque no caben en el HUD.
- **Sí:** `lives: null`, con "—" en el HUD. Tetris no tiene vidas.
- **No:** pausa propia con P, botón Reiniciar, overlay HTML de PAUSA y GAME OVER, panel HTML ni tema claro/oscuro de la referencia.
- **Sí:** Espacio · "PULSA ESPACIO PARA EMPEZAR" para empezar. Decisión del usuario; igual que ASTEROIDS.
- **Sí:** tira `← →` MOVER · `↑` `X` ROTAR · `↓` BAJAR · `ESPACIO` CAÍDA. Decisión del usuario; son las etiquetas de `index.html`.
- **Sí:** tope de 9 999 999 puntos en el motor. Es el CHECK de `public.scores`.
- **No:** sonido. La referencia no tiene.
- **No:** ratón y táctil. Decisión del usuario; van en su propio spec.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                             | Mitigación                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alguien guarda una partida simulada de CAÍDA antes de implementar y la FK bloquea el `update`.     | El paso 1 cuenta las filas de `caida` antes de la migración. Si hay alguna, se para y se pregunta.                                                                                              |
| El Home filtra en silencio las filas de `RECENT_SCORES` con un id que no existe.                   | Paso 1 y criterio de NEONFOX en el Home.                                                                                                                                                        |
| El canvas vertical se ve pequeño a 375 px (unos 166×221 px).                                       | Aceptado: el juego requiere teclado y el aviso lo indica.                                                                                                                                       |
| `shadowBlur` en hasta 200 bloques fijados baja el rendimiento.                                     | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2, quitar el glow de los bloques fijados y dejarlo en la pieza actual y la siguiente. Se anota.                     |
| El juego puede pasar de 9 999 999 puntos (unas 1000 líneas).                                       | `Math.min` con `MAX_SCORE` en cada suma.                                                                                                                                                        |
| La autorrepetición depende del sistema operativo, y Playwright no la genera al mantener una tecla. | En la prueba, enviar varios `keydown` con `repeat: true` para simular la repetición.                                                                                                            |
| Limpiar 10 líneas con Playwright cuesta.                                                           | Un bot dentro de la página lee la rejilla con `getImageData` y coloca las piezas. Si no llega, se comprueba con un cambio local sin commitear, como el motor de prueba del SPEC 07, y se anota. |
| La fuente de `next/font` no ha cargado cuando el motor lee `--mono`.                               | Solo se dibujan "SIGUIENTE", "LÍNEAS" y un número, con `monospace` de respaldo.                                                                                                                 |
| El leaderboard falso del detalle usa `id.length` como semilla y cambia de `caida` a `tetris`.      | Aceptado: son datos simulados.                                                                                                                                                                  |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Alias de `caida`.
- Mecánicas nuevas: bolsa de 7, hold, lock delay, SRS, T-spins, DAS propio y modo demo.
- Tema claro/oscuro, panel HTML, overlays HTML, botón Reiniciar y tecla P de la referencia.
- Ocultar el bloque de vidas del HUD.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la verificación

Fecha: 2026-10-08. `npm run build` + `next start -p 3001`, Chromium de Playwright, recargando la página al empezar cada recorrido.
La rejilla se leyó con `getImageData` (celdas de 30 px) y un bot dentro de la página colocó las piezas con su propio modelo del tablero.
LÍNEAS se leyó comparando su zona del canvas con renders de referencia de 0 a 60.

| Área                   | Resultado                                                                                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y build           | `npm run lint` y `npm run build` sin errores.                                                                                                                                                                                                                                                                       |
| Catálogo               | Migración `20261008010238_replace_caida_with_tetris`, igual que `list_migrations`, sin archivos `pending_`. `public.games` tiene `tetris` · `TETRIS` · `PUZZLE` · `magenta` · `cover-tetro` · 2 y ninguna fila `caida`. Tipos regenerados (sin cambios).                                                            |
| Referencias a `caida`  | `grep -rn "caida" app components lib` vacío. `/#/juego/caida` y `/#/jugar/caida` muestran el Home.                                                                                                                                                                                                                  |
| Biblioteca y Home      | TETRIS con `.cover-tetro` en la 2.ª posición. "NEONFOX ▸ TETRIS +184.220" en ÚLTIMAS PUNTUACIONES.                                                                                                                                                                                                                  |
| Registro               | `ENGINES` = `asteroids` y `tetris`. `GamePlayer.tsx`, `GameCanvas.tsx` y `app/globals.css` sin cambios.                                                                                                                                                                                                             |
| `ready`                | Overlay "TETRIS / PULSA ESPACIO PARA EMPEZAR", PAUSA y FIN deshabilitados, HUD 0 / — / 01, tablero y SIGUIENTE vacíos, LÍNEAS 0. Tras 2,7 s sigue sin caer ninguna pieza.                                                                                                                                           |
| Inicio                 | Espacio quita el overlay y la pieza aparece en la fila 0 con la puntuación en 0. Soltar y volver a pulsar Espacio: la Z cae a las filas 18–19 y suma 36.                                                                                                                                                            |
| Movimiento             | ← y → mueven una columna; contra la pared no se mueve. Un `keydown` de → más 12 repeticiones (`repeat: true`) lleva la pieza de la columna 0 a la 9.                                                                                                                                                                |
| Rotación               | ↑ y X giran en sentido horario (S, comparada con `rotateCW`). La S vertical pegada a la pared izquierda gira con el kick +1 y queda en la columna 0.                                                                                                                                                                |
| Soft drop              | ↓ baja una fila y suma 1.                                                                                                                                                                                                                                                                                           |
| Gravedad               | Nivel 1: 1001 / 1017 / 1016 ms. Nivel 2: 915 / 919 / 916 ms. El exceso es como mucho un frame, porque `dropAccum = 0` descarta el sobrante, igual que `game.js`.                                                                                                                                                    |
| Puntos y líneas        | 22 partidas y 706 piezas del bot, con cada incremento igual a `2 × celdas + LINE_SCORES[n] × nivel`. Nivel 1: 1 línea +130 (15 celdas), 2 líneas +332 (16), 3 líneas +532 (16), 4 líneas +832 (16). Nivel 2: 1 línea +222, 2 líneas +624. LÍNEAS coincide en todas las limpiezas. A las 10 líneas el HUD pasa a 02. |
| Scroll                 | `window.scrollY` sigue en 0 al jugar con teclado real, con la página desplazable.                                                                                                                                                                                                                                   |
| Vidas                  | El HUD muestra — durante toda la partida.                                                                                                                                                                                                                                                                           |
| Fin por llenar         | El modal FIN DEL JUEGO muestra 194, igual que el HUD.                                                                                                                                                                                                                                                               |
| FIN                    | El modal muestra 140, igual que el HUD. El canvas no cambia en 1,5 s, y no quedan ni pieza actual ni fantasma: el tablero coincide con el modelo del bot.                                                                                                                                                           |
| SIGUIENTE              | Coincide con la pieza que aparece después en 245 de 245 piezas comprobadas.                                                                                                                                                                                                                                         |
| Fantasma               | Las celdas de aterrizaje de la S valen `[0, 51, 27]` = `#00ff88 × 0,2`.                                                                                                                                                                                                                                             |
| Textos del canvas      | Con `fillText` interceptado, solo se dibujan "SIGUIENTE", "LÍNEAS" y el número de líneas.                                                                                                                                                                                                                           |
| Colores                | Última celda dibujada de cada pieza: I `#00f5ff`, O `#f5ff00`, T `#ff006e`, S `#00ff88`, Z `#ff7700`, J `#aa00ff`, L `#ffcf3a`, N `#c7d0e0`. En las otras celdas el glow de los bloques vecinos puede mover un canal en 1 unidad.                                                                                   |
| Tuerca                 | Aparece durante la partida (la 8.ª pieza, en gris plateado).                                                                                                                                                                                                                                                        |
| Pausa                  | PAUSA, la tecla P y `blur` congelan el canvas 2,3 s (mismo hash). Al reanudar, la pieza sigue en la misma fila.                                                                                                                                                                                                     |
| Modal                  | Escribir "p x" da "P X" sin que el juego reaccione. Guardar " AB 1 " creó la fila `tetris` · `AB 1` · 140 y mostró "▸ PUNTUACIÓN GUARDADA_".                                                                                                                                                                        |
| Salón                  | La pestaña TETRIS mostró `AB 1 · 140`. Sin filas muestra "SIN PUNTUACIONES · SÉ EL PRIMERO", y su botón JUGAR A TETRIS lleva a `#/jugar/tetris`.                                                                                                                                                                    |
| JUGAR DE NUEVO y SALIR | JUGAR DE NUEVO vuelve al overlay con HUD 0 / — / 01, tablero vacío, SIGUIENTE vacía y LÍNEAS 0. SALIR lleva a `#/juego/tetris`, donde Espacio hace scroll (0 → 162,5).                                                                                                                                              |
| Resolución             | Con `devicePixelRatio` 2, `canvas.width` 900 y `canvas.height` 1200.                                                                                                                                                                                                                                                |
| 1440 px y 375 px       | Canvas de 564,8×753 y 165,9×221,3, de la altura de `.crt-screen`, proporción 0,75 y centrado. Sin scroll horizontal.                                                                                                                                                                                                |
| Controles              | `← → MOVER · ↑ X ROTAR · ↓ BAJAR · ESPACIO CAÍDA · P PAUSA`. En táctil (`hasTouch`, `isMobile`) se ve "REQUIERE TECLADO".                                                                                                                                                                                           |
| Rendimiento            | A 375 px con dpr 2 y 84–120 bloques fijados: 60 fps sin frames perdidos, y el bucle tarda 0,23 ms de media y 0,4 ms como máximo. El glow de las piezas fijadas se mantiene.                                                                                                                                         |
| Otros juegos           | `/#/jugar/asteroids` empieza y se juega; `/#/jugar/serpentina` sigue simulando (puntuación 168 → 614).                                                                                                                                                                                                              |
| Consola                | 0 errores al abrir, jugar, terminar y salir de `/#/jugar/tetris`, y en ASTEROIDS y SERPENTINA. Los únicos avisos eran de `getImageData` del script de verificación.                                                                                                                                                 |
| Limpieza               | Se borró la fila de prueba (id 21). `public.scores` tiene 0 filas de `tetris` y 0 filas `AB 1`.                                                                                                                                                                                                                     |

Notas:

- El 4 líneas no salía con la estrategia normal del bot. Se reforzó la penalización de huecos y salió en la 7.ª partida, sin tocar el motor.
- La caja SIGUIENTE centra la matriz de la pieza como `drawNext`, no sus celdas ocupadas: S, Z, T, J y L quedan arriba a la izquierda de la caja. Es lo que pide este spec; cambiarlo iría en otro.
- A 375 px la tira inferior del CRT ("SEÑAL OK · TETRIS · CRT-83…") se parte en varias líneas. Es de `GamePlayer.tsx` y pasa también con ASTEROIDS.
