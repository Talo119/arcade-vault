# SPEC 10 — Juego real: SNAKE

> **Estado:** Approved
> **Depende de:** SPEC 06, SPEC 07
> **Fecha:** 2026-10-12
> **Objetivo:** Crear un Snake clásico sobre una cuadrícula de 24×18 con frutas pixel-art y hacerlo jugable en `#/jugar/snake`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

Hoy el catálogo tiene SERPENTINA (`serpentina`), un Snake simulado: el player sube la puntuación con un intervalo.
No hay un Snake de referencia en `references/started-games/`, así que el motor se escribe desde cero.
Sí hay assets en `references/source-assets/snake-assets/`: `fruits.png` (3790×442, RGBA, fondo transparente) y `sprites.js` (52 líneas), un atlas con 22 recortes de frutas.
El PNG tiene tres filas: frutas realistas (y 3–127), frutas pixel-art (y 136–295) y otra fila realista (y 312–439). El atlas solo usa la fila pixel-art.
Las coordenadas de `sprites.js` coinciden con los píxeles del PNG, pero sus nombres no: el recorte `banana` es una manzana, `orange` un plátano, `apple` un melocotón, etc. `lib/snake/sprites.ts` los renombra según lo que se ve.
Snake es el arcade más reconocible que le falta al Vault y encaja con su estética: una serpiente de neón sobre una cuadrícula.
Este spec crea el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
El catálogo ya tiene un juego equivalente, SERPENTINA, que pasa a llamarse SNAKE.

## Alcance

**Dentro:**

- Migración `replace_serpentina_with_snake`: id, título y descripciones. La portada `.cover-snake` se mantiene.
- Actualizar la referencia al id `serpentina` en `lib/home.ts`: la fila de `RECENT_SCORES` de ARKADYA.
- Motor de SNAKE en TypeScript en `lib/snake/`, sin React, con las mecánicas de "Modelo de datos": movimiento por pasos en una cuadrícula de 24×18, flechas y WASD, cola de 2 giros, frutas que alargan una celda y valen 10 × nivel, nivel cada 5 frutas con paso más corto, bordes y cuerpo mortales, sin vidas.
- Paleta neón del Vault en el canvas: cuerpo `--green`, cabeza `--ink`, cuadrícula tenue cyan y borde del tablero `--cyan`.
- Frutas dibujadas con los sprites pixel-art de `fruits.png`, una al azar de las 22 cada vez.
- Definición `snakeEngine` en `lib/snake/definition.ts` y entrada en `lib/engines/registry.ts`.
- Assets en `public/games/snake/`: `fruits.png`, copia idéntica de `references/source-assets/snake-assets/fruits.png`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: serpiente, ojos, cuadrícula, borde, glow y la tira de controles.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Movimiento suave interpolado entre celdas.
- Bordes que atraviesan, vidas, fruta bonus, obstáculos, frutas con valores distintos.
- Las filas realistas de `fruits.png`.
- Leaderboard real en el detalle (`#/juego/snake`). Sigue con `seededScores`.
- `best` y `plays` calculados.
- Alias o redirección de `#/juego/serpentina` y `#/jugar/serpentina`.
- Rediseño de la portada `.cover-snake`.
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (migración `replace_serpentina_with_snake` en `supabase/migrations/`)

```sql
update public.games set
  id = 'snake',
  title = 'SNAKE',
  short = 'Come fruta, crece y no te muerdas la cola.',
  long = 'Guía una serpiente de neón por una cuadrícula de 24×18 y devora frutas pixel-art. Cada bocado la alarga una celda y vale 10 puntos por nivel. Cada 5 frutas sube el nivel y la serpiente acelera. Si chocas con el borde o con tu propio cuerpo, se acabó.'
where id = 'serpentina';
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_replace_serpentina_with_snake.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`ARCADE`), `color` (`green`), `cover` (`cover-snake`), `best` (`7820`), `plays` (`9.1K`) y `sort_order` (`3`) no cambian.
- Hoy (2026-10-12) `public.scores` tiene 0 filas con `game_id = 'serpentina'`, así que la FK no bloquea el `update` y la migración no borra nada.
- `.cover-snake` no se renombra: no contiene el id viejo y ya dibuja una serpiente verde. `app/globals.css` no cambia.
- En `lib/home.ts`, la fila de `RECENT_SCORES` con `gameId: "serpentina"` (ARKADYA, 7820) pasa a `gameId: "snake"`.
- `#/juego/serpentina` y `#/jugar/serpentina` dejan de existir y caen al Home.

### Motor (`lib/snake/`)

| Archivo         | Contenido                                                                                                                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`     | `W` 768, `H` 576, `CELL` 32, `COLS` 24, `ROWS` 18, posición inicial, primera fruta, tiempos de paso, puntos, `MAX_DT`, `COLORS`.                                                                      |
| `sprites.ts`    | `FRUITS_SRC = "/games/snake/fruits.png"`, tipo `FruitSprite` y `FRUIT_SPRITES`: los 22 recortes de `sprites.js` con las claves corregidas.                                                            |
| `board.ts`      | Tipos `Cell` y `Dir`, `stepMsForLevel(level)`, `levelForFruits(n)`, `randomFreeCell(snake)` y `isOpposite(a, b)`.                                                                                     |
| `input.ts`      | `createInput(target, isActive, getDir)`: cola de giros (`nextTurn`), pulsación de Espacio (`pressed`), `clear()` y `destroy()`. `getDir` da la dirección vigente en `playing` y `null` fuera de ella. |
| `engine.ts`     | `createSnakeGame(canvas, callbacks): GameEngine`.                                                                                                                                                     |
| `definition.ts` | `snakeEngine: EngineDefinition`.                                                                                                                                                                      |

No hay `types.ts` propio: los tipos van en `board.ts` y el motor usa los de `lib/engines/types.ts`.

```ts
// lib/snake/definition.ts
export const snakeEngine: EngineDefinition = {
  id: "snake",
  width: W, // 768
  height: H, // 576
  initialStats: { score: 0, level: 1, lives: null },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "MOVER" },
    { keys: ["W", "A", "S", "D"], label: "MOVER" },
  ],
  create: createSnakeGame,
};
```

```ts
// config.ts
export const CELL = 32; // px; los sprites pixel-art (160 px, "píxeles" de 10) se ven a escala 1/5 exacta
export const COLS = 24;
export const ROWS = 18;
export const W = COLS * CELL; // 768
export const H = ROWS * CELL; // 576
export const START_SNAKE = [
  { x: 6, y: 9 },
  { x: 5, y: 9 },
  { x: 4, y: 9 },
]; // cabeza primero
export const START_DIR = "right";
export const FIRST_FRUIT = { x: 17, y: 9 };
export const BASE_STEP_MS = 125; // nivel 1: 8 celdas/s
export const STEP_MS_PER_LEVEL = 10;
export const MIN_STEP_MS = 55;
export const FRUITS_PER_LEVEL = 5;
export const POINTS_PER_FRUIT = 10; // × nivel
export const MAX_DT = 0.05; // s

// Colores del canvas, copiados de los tokens de :root.
export const COLORS = {
  bg: "#000",
  grid: "rgba(0, 245, 255, 0.06)", // --cyan al 6 %
  border: "#00f5ff", // --cyan
  body: "#00ff88", // --green
  head: "#e6e9ff", // --ink
  eyes: "#000",
  fruitFallback: "#ff006e", // --magenta, solo si el PNG no carga
};
```

Sprites (`sprites.ts`), fila pixel-art de `fruits.png`, todos con `y` 136 y `h` 160:

| Clave        | `x`  | `w` | Clave en `sprites.js` |
| ------------ | ---- | --- | --------------------- |
| `apple`      | 34   | 110 | `banana`              |
| `banana`     | 186  | 150 | `orange`              |
| `pineapple`  | 378  | 110 | `grape`               |
| `grape`      | 540  | 130 | `garlic`              |
| `pumpkin`    | 712  | 130 | `eggplant`            |
| `turnip`     | 894  | 110 | `strawberry`          |
| `eggplant`   | 1066 | 110 | `cherry`              |
| `strawberry` | 1228 | 130 | `carrot`              |
| `cherry`     | 1400 | 130 | `mushroom`            |
| `carrot`     | 1582 | 110 | `broccoli`            |
| `mushroom`   | 1734 | 150 | `watermelon`          |
| `broccoli`   | 1906 | 150 | `pepper`              |
| `watermelon` | 2068 | 170 | `kiwi`                |
| `pepper`     | 2250 | 140 | `lemon`               |
| `kiwi`       | 2432 | 130 | `peach`               |
| `lemon`      | 2604 | 130 | `peanut`              |
| `orange`     | 2786 | 110 | `apple`               |
| `peach`      | 2948 | 130 | `tomato`              |
| `peanut`     | 3110 | 150 | `berries`             |
| `raspberry`  | 3302 | 110 | `grapes2`             |
| `tomato`     | 3454 | 150 | `pineapple`           |
| `bowl`       | 3637 | 130 | `melon`               |

Las coordenadas se comprobaron decodificando el PNG: son las cajas de los 22 sprites opacos de la fila y=136–295.
Las claves nuevas se asignaron mirando la imagen; si en el pulido alguna no corresponde, se corrige el nombre sin tocar las coordenadas.

Velocidad y niveles:

| Nivel | Frutas comidas | Paso (ms) | Celdas/s | Puntos por fruta |
| ----- | -------------- | --------- | -------- | ---------------- |
| 1     | 0–4            | 125       | 8,0      | 10               |
| 2     | 5–9            | 115       | 8,7      | 20               |
| 3     | 10–14          | 105       | 9,5      | 30               |
| 4     | 15–19          | 95        | 10,5     | 40               |
| 5     | 20–24          | 85        | 11,8     | 50               |
| 6     | 25–29          | 75        | 13,3     | 60               |
| 7     | 30–34          | 65        | 15,4     | 70               |
| 8+    | 35+            | 55        | 18,2     | 10 × nivel       |

- `levelForFruits(n) = 1 + floor(n / 5)`.
- `stepMsForLevel(l) = max(55, 125 − 10 × (l − 1))`.
- Tablero lleno: 432 celdas − 3 iniciales = 429 frutas, nivel máximo 86 y puntuación máxima 186 190 (`50 × (1 + … + 85) + 4 × 860`).

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Fase inicial. Cuadrícula, borde, la serpiente inicial en (4..6, 9) mirando a la derecha y la 1.ª fruta en (17, 9), todo quieto. Espacio llama a `initGame()` (`score` 0, `level` 1, 0 frutas, serpiente y 1.ª fruta iniciales) y pasa a `playing`. |
| `playing`  | Reglas de abajo. La serpiente avanza una celda en cada paso.                                                                                                                                                                                       |
| `gameover` | Se alcanza al chocar con un borde o con el cuerpo, al llenar el tablero o con `end()`. La serpiente se queda donde estaba al 35 % de opacidad y la fruta sigue visible. No hay input. Espacio no reinicia.                                         |

La fase `dead` no se usa: no hay vidas.

Reglas del motor:

- Movimiento por pasos con acumulador: `acc += dt × 1000`; mientras `acc ≥ stepMs`, `acc −= stepMs` y se da un paso.
- En cada paso, en este orden:
  - Si hay un giro en la cola, se saca uno y pasa a ser la dirección.
  - Se calcula la celda siguiente de la cabeza.
  - Si está fuera de `0..23` × `0..17`, `gameover`. La serpiente no se mueve en ese paso.
  - Si coincide con un segmento del cuerpo, `gameover`. La cola cuenta como libre si en este paso no se come: la cabeza puede entrar en la celda que deja la cola.
  - La cabeza se añade al principio.
  - Si la cabeza está en la fruta: `fruits += 1`, `score += 10 × level` (el nivel de antes de comer), `level = levelForFruits(fruits)`, `stepMs = stepMsForLevel(level)` y la cola no se quita (crece 1 celda). Si no quedan celdas libres, `gameover`; si quedan, aparece una fruta nueva.
  - Si no come, se quita la cola.
- La 1.ª fruta de cada partida está siempre en (17, 9). Las siguientes, en una celda libre elegida al azar con probabilidad uniforme.
- Cada fruta nueva lleva un sprite elegido al azar entre los 22 de `FRUIT_SPRITES`. El sprite no cambia ni la puntuación ni el crecimiento.
- Desde el inicio, la cabeza llega a la 1.ª fruta en el paso 11, a los 1 375 ms.
- Resolución lógica 768×576 (4:3), con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- Todos los límites usan `COLS`, `ROWS`, `W` y `H`, nunca `canvas.width` ni `canvas.height`.
- `dt` en segundos, limitado a `MAX_DT` (50 ms). Como el paso mínimo es 55 ms, nunca hay más de un paso por frame.
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input y la cola de giros. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`. El acumulador se conserva.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa. No dibuja ningún texto.
- Mapeo al HUD: `score` = puntuación, `level` = nivel actual, `lives` = `null` (el HUD muestra "—").
- `onStats` solo cuando cambian `score` o `level` (al comer). `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- La puntuación máxima es 186 190, muy por debajo del CHECK de 9 999 999: el motor no necesita tope.
- Dibujo:
  - Fondo `COLORS.bg`.
  - Cuadrícula: líneas de 1 px en `COLORS.grid` cada 32 px.
  - Borde del tablero: `strokeRect` de 2 px en `COLORS.border` con glow, dentro del canvas.
  - Cada segmento del cuerpo es un `fillRect` de 28×28 centrado en su celda (2 px de margen) en `COLORS.body`, con glow: `shadowBlur` con `shadowColor` igual a `COLORS.body`.
  - La cabeza es el mismo cuadrado en `COLORS.head`, con dos ojos de 4×4 en `COLORS.eyes` en el lado hacia el que avanza.
  - La fruta es su sprite dibujado con `imageSmoothingEnabled = false`, a escala 1/5 (`w / 5` × 32) y centrado en su celda. La sandía (170 px → 34 px) sobresale 1 px por cada lado.
  - En `gameover` la serpiente se dibuja con `globalAlpha` 0,35.
  - Tamaños de los segmentos, ojos, glow y grosor del borde se ajustan en el pulido sin cambiar la lógica de celdas.
- Los colores se leen de `config.ts`. Nada se lee con `getComputedStyle` en cada frame.
- El PNG se carga en `create` con `new Image()` desde `FRUITS_SRC`. Mientras no ha cargado (`complete && naturalWidth > 0`), la fruta no se dibuja pero la lógica sigue. Si dispara `error`, la fruta se dibuja como un círculo de radio 10 en `COLORS.fruitFallback` con glow, para que la partida siga siendo jugable. Ningún error queda sin capturar.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `KeyW`, `KeyA`, `KeyS`, `KeyD` y `Space`. La P no es del juego: la gestiona el player.
- `preventDefault()` de los códigos del juego solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- Los giros se leen en `keydown` (sin autorrepetición: `event.repeat` se ignora) y solo en `playing`.
- Cola de giros de 2 como máximo. Un giro se compara con el último de la cola, o con la dirección vigente si la cola está vacía: si es igual u opuesto, se descarta. Si la cola está llena, se descarta.
- Así, ↑ y → pulsados dentro del mismo paso yendo a la izquierda hacen la U en dos pasos, y ← yendo a la derecha no hace nada.
- Espacio se lee como pulsación de un frame (`pressed`) y solo hace algo en `ready`. En `playing` se captura (para que no haga scroll) pero no hace nada.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- `clear()` vacía la cola de giros y descarta las pulsaciones pendientes.

### Textos

| Elemento          | Texto                                         |
| ----------------- | --------------------------------------------- |
| Overlay de inicio | "SNAKE" y "PULSA ESPACIO PARA EMPEZAR"        |
| Tira de controles | `← ↑ → ↓` MOVER · `W A S D` MOVER · `P` PAUSA |

## Plan de implementación

1. **Catálogo.** Comprobar con `select count(*) from public.scores where game_id = 'serpentina'` que sigue en 0. Si no lo está, parar y preguntar al usuario qué hacer con esas filas antes de seguir. Crear `pending_replace_serpentina_with_snake.sql`, aplicarlo con `apply_migration`, renombrarlo con su versión y regenerar `lib/supabase/database.types.ts`. Actualizar `lib/home.ts`. Verificación: `select id, title, cat, color, cover, sort_order from public.games where id = 'snake'` devuelve `snake`, `SNAKE`, `ARCADE`, `green`, `cover-snake`, `3`; `grep -rn "serpentina" app components lib` vacío; la Biblioteca muestra SNAKE en la 3.ª posición; `#/jugar/snake` abre la simulación.
2. **Assets.** Copiar `references/source-assets/snake-assets/fruits.png` a `public/games/snake/fruits.png` sin transformarlo. Verificación: `cmp` entre los dos archivos no da diferencias, y `http://localhost:3001/games/snake/fruits.png` responde 200 con `next start`.
3. **Base del motor.** `config.ts`, `sprites.ts` y `board.ts`. Verificación: `npm run lint` y `npm run build` pasan.
4. **Input.** `input.ts` con la cola de giros, la pulsación de Espacio y la regla de `preventDefault`. Verificación: `npm run build` pasa.
5. **Motor.** `engine.ts` con las fases, `initGame`, el acumulador de pasos, colisiones, crecimiento, niveles, la carga del PNG, el dibujo, `setupCanvas`, `setPaused`, `end`, `destroy` y los callbacks. Verificación: `npm run build` pasa.
6. **Registro.** `definition.ts` y la entrada `snake: snakeEngine` en `ENGINES`. Verificación: en `#/jugar/snake` Espacio empieza la partida, el HUD suma 10 al comer la 1.ª fruta y chocar con el borde abre el modal.
7. **Pulido con `/frontend-design`.** Serpiente, ojos, cuadrícula, borde, glow, el tamaño de las frutas y la tira de controles a 1440 px y 375 px, sin cambiar la estética del Vault. La portada `.cover-snake` no cambia.
8. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/snake` a 1440 y 375 px, con capturas (no se versionan). Leer la serpiente y la fruta interceptando `fillRect` y `drawImage` del contexto 2D, y usar un bot dentro de la página que pulse las flechas para ir a por cada fruta. Para comprobar el tablero lleno, usar un cambio local sin commitear en `COLS`/`ROWS` (por ejemplo 4×3) y anotarlo. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `replace_serpentina_with_snake` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `snake` con título `SNAKE`, `cat` `ARCADE`, `color` `green`, `cover` `cover-snake` y `sort_order` 3, y ya no tiene la fila `serpentina`.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] `grep -rn "serpentina" app components lib` no devuelve resultados, y `/#/juego/serpentina` y `/#/jugar/serpentina` muestran el Home.
- [ ] La Biblioteca muestra SNAKE con la portada `.cover-snake` en la 3.ª posición.
- [ ] El Home muestra la fila de ARKADYA en "ÚLTIMAS PUNTUACIONES" con el título SNAKE, y sigue mostrando "8 JUEGOS".
- [ ] `ENGINES` tiene las entradas `asteroids`, `tetris`, `arkanoid` y `snake`, y `GamePlayer.tsx` no ha cambiado.
- [ ] `public/games/snake/fruits.png` es idéntico byte a byte a `references/source-assets/snake-assets/fruits.png`.
- [ ] Al abrir `/#/jugar/snake` se ve "SNAKE / PULSA ESPACIO PARA EMPEZAR" sobre la cuadrícula, la serpiente en (4..6, 9) y una fruta en (17, 9), y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / — / 01, y la serpiente no se mueve.
- [ ] Espacio empieza la partida, el overlay desaparece y la serpiente avanza hacia la derecha una celda cada 125 ms.
- [ ] Sin pulsar nada, la cabeza llega a (17, 9) a los ~1 375 ms: el HUD pasa a 10, la serpiente mide 4 celdas y aparece otra fruta en una celda libre.
- [ ] ↑ / W, ↓ / S, ← / A y → / D giran la serpiente hacia arriba, abajo, izquierda y derecha.
- [ ] Yendo a la derecha, ← y A no hacen nada.
- [ ] Yendo a la izquierda, ↑ y → pulsadas dentro del mismo paso hacen la U: un paso hacia arriba y el siguiente hacia la derecha.
- [ ] Mantener una flecha pulsada no encola giros repetidos.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] Al comer la 5.ª fruta el HUD marca 50 y el nivel pasa a 02, y la serpiente avanza una celda cada 115 ms.
- [ ] La 6.ª fruta suma 20 (HUD 70).
- [ ] Chocar con cualquiera de los cuatro bordes abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] Morderse el cuerpo abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] La cabeza puede entrar en la celda que deja la cola sin morir.
- [ ] Con un tablero local de 4×3 (sin commitear), llenarlo abre el modal FIN DEL JUEGO.
- [ ] El HUD muestra "—" en vidas durante toda la partida.
- [ ] En `gameover` la serpiente queda quieta al 35 % de opacidad y la fruta sigue visible.
- [ ] FIN abre el modal con la puntuación actual y la serpiente queda quieta y atenuada.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa: `fillText` no se llama nunca.
- [ ] El cuerpo es `#00ff88`, la cabeza `#e6e9ff` y el borde del tablero `#00f5ff`.
- [ ] Cada fruta es uno de los 22 sprites de la fila pixel-art, dibujado nítido (sin suavizado) dentro de su celda.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas; al reanudar, la serpiente sigue en la misma dirección y no aplica giros pulsados durante la pausa.
- [ ] En el modal se pueden escribir iniciales con espacios, con la letra P y con W, A, S y D sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'snake'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña SNAKE del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/snake`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / — / 01, la serpiente inicial y la fruta en (17, 9).
- [ ] SALIR lleva a `#/juego/snake`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1536 y `canvas.height` es 1152, y chocar con el borde derecho (columna 23 → 24) sigue terminando la partida.
- [ ] A 1440 px y a 375 px no hay scroll horizontal, y el canvas mantiene la proporción 768:576 (4:3) dentro del CRT.
- [ ] La tira de controles muestra `← ↑ → ↓` MOVER · `W A S D` MOVER · `P` PAUSA, y en táctil se ve "REQUIERE TECLADO".
- [ ] Mover el ratón o hacer clic sobre el canvas no cambia nada.
- [ ] `/#/jugar/asteroids`, `/#/jugar/tetris` y `/#/jugar/arkanoid` siguen funcionando y `/#/jugar/gloton` sigue simulando.
- [ ] La pestaña de red muestra una sola petición a `/games/snake/fruits.png` con estado 200 y ninguna petición fallida a `/games/snake/…` ni a archivos de audio.
- [ ] Bloqueando `/games/snake/fruits.png`, la fruta se dibuja como un círculo `#ff006e` y la partida se puede jugar sin errores en consola.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/snake`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** sustituir SERPENTINA por SNAKE. Decisión del usuario; es el mismo juego y dos Snakes en el catálogo confundirían.
- **No:** añadir una novena fila.
- **Sí:** cambiar el id a `snake` y el título a SNAKE. Decisión del usuario; es el nombre real del juego, como `rocas` → `asteroids`, `caida` → `tetris` y `bloque-buster` → `arkanoid`.
- **Sí:** el `update` no borra puntuaciones, porque `serpentina` tiene 0 filas en `public.scores`. Si aparecen antes de implementar, el paso 1 para y pregunta.
- **No:** mantener el id `serpentina`.
- **No:** renombrar ni rediseñar `.cover-snake`. Decisión del usuario; no contiene el id viejo y ya dibuja una serpiente verde.
- **Sí:** descripciones nuevas que nombran la cuadrícula de 24×18, las frutas, los 10 puntos por nivel, el nivel cada 5 frutas y los choques mortales. Decisión del usuario; describen solo mecánicas que el juego tiene.
- **No:** mantener los textos de SERPENTINA. Hablan de "núcleos magenta" y de acelerar con cada bocado.
- **Sí:** juego original, sin código de referencia. Solo se reutilizan los sprites de `references/source-assets/snake-assets/`.
- **Sí:** resolución 768×576 con cuadrícula de 24×18 celdas de 32 px. Decisión del usuario; es 4:3 exacto, llena el CRT y los sprites se ven a escala 1/5 exacta.
- **No:** 640×480 (tablero de 300 celdas) ni 800×600 con celdas de 25 px (sprites con píxeles irregulares).
- **Sí:** bordes mortales y sin vidas (`lives: null`). Decisión del usuario; es el Snake clásico.
- **No:** bordes que atraviesan ni 3 vidas.
- **Sí:** nivel cada 5 frutas; el paso empieza en 125 ms y baja 10 ms por nivel hasta 55 ms. Decisión del usuario.
- **No:** acelerar con cada fruta sin niveles, ni velocidad constante.
- **Sí:** cada fruta vale 10 × nivel y alarga 1 celda; el sprite es aleatorio entre los 22 y solo es cosmético. Decisión del usuario.
- **No:** puntos fijos, fruta bonus temporal ni valores por tipo de fruta.
- **Sí:** llenar el tablero termina la partida con `gameover`. Es la única salida posible cuando no queda celda libre para la fruta.
- **Sí:** flechas y WASD. Decisión del usuario.
- **No:** solo flechas.
- **Sí:** Espacio · "PULSA ESPACIO PARA EMPEZAR"; serpiente inicial de 3 celdas en (4..6, 9) hacia la derecha y 1.ª fruta fija en (17, 9). Decisión del usuario; hace verificable la primera puntuación.
- **No:** 1.ª fruta al azar, ni empezar con una flecha.
- **Sí:** cola de 2 giros con el giro de 180° descartado. Decisión del usuario; permite hacer la U sin perder pulsaciones.
- **No:** solo la última tecla por paso.
- **Sí:** `createInput` recibe un 3.er parámetro `getDir: () => Dir | null`. Decisión del usuario durante la implementación; con `isActive` solo, `input.ts` no conoce la dirección vigente ni si la fase es `playing`, y la cola de giros sigue en `input.ts`.
- **No:** mover la cola de giros a `engine.ts` para mantener la firma de 2 parámetros.
- **Sí:** movimiento discreto celda a celda, cuerpo `--green` con glow, cabeza `--ink` con ojos negros hacia la dirección, cuadrícula `rgba(0, 245, 255, 0.06)` y borde `--cyan`. Decisión del usuario.
- **No:** degradado verde → cian ni movimiento suave interpolado.
- **Sí:** `ready` con la escena inicial quieta; en `gameover` la serpiente se congela al 35 % de opacidad y la fruta sigue visible. Decisión del usuario; se ve dónde se chocó.
- **No:** que la serpiente desaparezca en `gameover`.
- **Sí:** copiar `fruits.png` entero, sin transformar, a `public/games/snake/` y dibujar la fila pixel-art con `imageSmoothingEnabled = false`. Decisión del usuario; las coordenadas de `sprites.js` siguen valiendo tal cual.
- **No:** recortar la fila pixel-art ni dibujar las frutas con primitivas.
- **Sí:** renombrar las claves del atlas según lo que se ve. Las de `sprites.js` están desplazadas y no corresponden a la imagen.
- **Sí:** si el PNG falla, la fruta se dibuja como un círculo magenta. El contrato exige que un asset que no carga no rompa la partida.
- **Sí:** motor sin React en `lib/snake/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault en el canvas.
- **Sí:** HUD de React y modal de la plataforma; el canvas no dibuja ningún texto, porque puntuación y nivel caben en el HUD.
- **No:** tope de puntuación en el motor. El máximo es 186 190.
- **No:** sonido. Decisión del usuario; no hay archivos de audio y ASTEROIDS, TETRIS y ARKANOID no tienen.
- **No:** ratón y táctil. Van en su propio spec.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alguien guarda una partida simulada de SERPENTINA antes de implementar y la FK bloquea el `update`. | El paso 1 cuenta las filas de `serpentina` antes de la migración. Si hay alguna, se para y se pregunta.                                                          |
| El Home filtra en silencio las filas de `RECENT_SCORES` con un id que no existe.                    | Paso 1 y criterio de ARKADYA en el Home.                                                                                                                         |
| El PNG (586 KB) tarda en cargar y la 1.ª fruta no se ve al empezar.                                 | La lógica no espera a la imagen; la fruta aparece en cuanto carga. Si falla, círculo magenta. Criterio de red y de PNG bloqueado.                                |
| Alguna clave renombrada de `sprites.ts` no corresponde a su fruta.                                  | Los nombres no afectan a la jugabilidad. Se revisan en el pulido mirando cada sprite; las coordenadas no cambian.                                                |
| Escalar 160 → 32 en un canvas con `dpr` 1 o 2 suaviza los píxeles.                                  | `imageSmoothingEnabled = false` antes de cada `drawImage`, porque `setupCanvas` y los cambios de tamaño pueden restablecerlo.                                    |
| Un frame largo hace perder pasos o saltar celdas.                                                   | `dt` limitado a 50 ms y paso mínimo de 55 ms: nunca más de un paso por frame, y la colisión se comprueba en cada paso.                                           |
| `shadowBlur` en hasta 432 segmentos baja el rendimiento con una serpiente larga.                    | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2 y una serpiente larga, quitar el glow del cuerpo y dejarlo en la cabeza. Se anota. |
| Llenar el tablero de verdad (429 frutas) no es práctico en la verificación.                         | Cambio local sin commitear a un tablero de 4×3 para comprobar el `gameover` por tablero lleno, como el motor de prueba del SPEC 07. Se anota.                    |
| Las teclas W, A, S y D llegan al juego mientras se escriben iniciales en el modal.                  | El modal abre en `gameover`, donde no se captura input; criterio de iniciales con WASD.                                                                          |
| El leaderboard falso del detalle usa `id.length` como semilla y cambia de `serpentina` a `snake`.   | Aceptado: son datos simulados.                                                                                                                                   |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Movimiento interpolado.
- Bordes que atraviesan, vidas, fruta bonus, obstáculos y valores por fruta.
- Las filas realistas de `fruits.png`.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Alias de `serpentina`.
- Rediseño de `.cover-snake`.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la verificación

Fecha: 2026-10-12. `npm run build` + `next start -p 3001`, Chromium de Playwright, con una página nueva al empezar cada recorrido.
La serpiente, la fruta y los colores se leyeron interceptando `fillRect`, `drawImage`, `arc`, `strokeRect` y `fillText` del contexto 2D. Cada frame se cerraba en el `fillRect` del fondo.
Un bot dentro de la página fue a por la fruta, eligiendo en cada paso la jugada con más espacio libre alcanzable. Los giros de prueba se hicieron con teclas reales de Playwright, sincronizados con los pasos de la cabeza.

| Área                    | Resultado                                                                                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y build            | `npm run lint` y `npm run build` sin errores.                                                                                                                                                                                                                 |
| Catálogo                | Migración `20261012210753_replace_serpentina_with_snake`, igual que `list_migrations`, sin archivos `pending_`. `public.games` tiene `snake` · `SNAKE` · `ARCADE` · `green` · `cover-snake` · 3 y ninguna fila `serpentina`. Tipos regenerados (sin cambios). |
| Referencias al id viejo | `grep -rn "serpentina" app components lib` vacío. `/#/juego/serpentina` y `/#/jugar/serpentina` muestran el Home.                                                                                                                                             |
| Biblioteca y Home       | SNAKE con `.cover-snake` en la 3.ª posición. "ARKADYA ▸ SNAKE +7820" en ÚLTIMAS PUNTUACIONES, y el Home sigue diciendo "8 JUEGOS".                                                                                                                            |
| Registro y assets       | `ENGINES` = `asteroids`, `tetris`, `arkanoid` y `snake`. `GamePlayer.tsx`, `GameCanvas.tsx`, `lib/engines/types.ts`, `lib/scores.ts` y `app/globals.css` sin cambios. `public/games/snake/fruits.png` idéntico al original (`cmp` y SHA-1).                   |
| `ready`                 | Overlay "SNAKE / PULSA ESPACIO PARA EMPEZAR", serpiente en (4..6, 9), fruta en (17, 9), PAUSA y FIN deshabilitados, HUD 0 / — / 01. Sin moverse en 1 s.                                                                                                       |
| Inicio y paso           | Espacio quita el overlay y la cabeza avanza a (7, 9), (8, 9), (9, 9)… cada 124,9 ms de media.                                                                                                                                                                 |
| 1.ª fruta               | La cabeza llega a (17, 9) en el paso 11, a los 1 380 ms. HUD 10, la serpiente mide 4 y la fruta nueva aparece en una celda libre.                                                                                                                             |
| Giros                   | ↑, ←, ↓ y → y W, A, S y D giran en su dirección. Yendo a la derecha, ← y A no hacen nada.                                                                                                                                                                     |
| U y autorrepetición     | Yendo a la izquierda, ↑ y → en el mismo paso dan un paso arriba y el siguiente a la derecha. Con ↑ mantenida, sus autorrepeticiones no encolan giros: tras →, la serpiente sigue a la derecha.                                                                |
| Scroll                  | `window.scrollY` sigue en 150 al pulsar flechas, WASD y Espacio durante la partida, con la página desplazable.                                                                                                                                                |
| Niveles y puntos        | Frutas 1–5: HUD 10, 20, 30, 40 y 50. Con la 5.ª el nivel pasa a 02 y el paso a ~116 ms (115 + cuantización de frames). La 6.ª suma 20 (HUD 70). Con 19 frutas: 460 y nivel 04.                                                                                |
| Bordes                  | Arriba, abajo, izquierda y derecha abren FIN DEL JUEGO con la cabeza en (7, 0), (7, 17), (0, 8) y (23, 9). Puntuación del modal igual que la del HUD (0, 0, 0 y 10).                                                                                          |
| Cuerpo                  | Con 6 celdas, tres giros seguidos a la izquierda llevan la cabeza contra el cuello: FIN DEL JUEGO con 30, igual que el HUD.                                                                                                                                   |
| Celda de la cola        | Con 4 celdas, ↑ ← ↓ → en pasos seguidos hacen entrar la cabeza dos veces en la celda que deja la cola, sin morir.                                                                                                                                             |
| Tablero lleno           | Con el tablero local de 4×3 (ver notas), el bot llena las 12 celdas: FIN DEL JUEGO con 130 y nivel 02, sin fruta en el canvas.                                                                                                                                |
| Vidas                   | El HUD muestra "—" durante toda la partida.                                                                                                                                                                                                                   |
| `gameover` y FIN        | FIN abre el modal con 380, igual que el HUD. La serpiente no da más pasos, se dibuja con `globalAlpha` 0,35 y la fruta se sigue dibujando.                                                                                                                    |
| Textos del canvas       | Con `fillText` interceptado: 0 llamadas en todos los recorridos.                                                                                                                                                                                              |
| Colores                 | Cuerpo `#00ff88`, cabeza `#e6e9ff` y borde `strokeRect(1, 1, 766, 574)` de 2 px en `#00f5ff`.                                                                                                                                                                 |
| Sprites                 | 19 sprites distintos en una partida, todos de la fila pixel-art (`y` 136, `h` 160, `x` de la tabla), con `imageSmoothingEnabled` falso, a `w / 5` × 32 y dentro de su celda.                                                                                  |
| Pausa                   | PAUSA, la tecla P y `blur` congelan el canvas. Con un giro perpendicular pulsado durante la pausa, al reanudar la serpiente sigue en la misma dirección.                                                                                                      |
| Ratón                   | Mover el ratón, hacer clic y doble clic sobre el canvas en `ready` no cambia nada.                                                                                                                                                                            |
| Modal                   | Escribir " P WASD " da " P WASD " sin que el juego avance ni se pause. Guardar " AB 1 " creó la fila `snake` · `AB 1` · 380 y mostró "▸ PUNTUACIÓN GUARDADA_".                                                                                                |
| Salón                   | Sin filas, la pestaña SNAKE muestra "SIN PUNTUACIONES · SÉ EL PRIMERO", y JUGAR A SNAKE lleva a `#/jugar/snake`. Después del guardado muestra `AB 1 · 380`.                                                                                                   |
| JUGAR DE NUEVO y SALIR  | JUGAR DE NUEVO vuelve al overlay con HUD 0 / — / 01, la serpiente en (4..6, 9) y la fruta en (17, 9). SALIR lleva a `#/juego/snake`, donde Espacio hace scroll (0 → 186,5).                                                                                   |
| Resolución              | Con `devicePixelRatio` 2, `canvas.width` 1536 y `canvas.height` 1152, y el borde derecho termina la partida con la cabeza en (23, 9).                                                                                                                         |
| 1440 px y 375 px        | Canvas de 1004×753 y 280×210, proporción 1,3333. Sin scroll horizontal.                                                                                                                                                                                       |
| Controles               | `← ↑ → ↓ MOVER · W A S D MOVER · P PAUSA`. En táctil (`mobile` + emulación táctil) se ve "REQUIERE TECLADO".                                                                                                                                                  |
| Rendimiento             | A 375 px con dpr 2 y una serpiente de 43 celdas: mediana de 16,7 ms entre frames, p95 de 17,7 ms y ninguna tarea larga. El glow del cuerpo se mantiene.                                                                                                       |
| Otros juegos            | `/#/jugar/asteroids`, `/#/jugar/tetris` y `/#/jugar/arkanoid` empiezan con Espacio; `/#/jugar/gloton` sigue simulando (77 → 463).                                                                                                                             |
| Red                     | Una sola petición a `/games/snake/fruits.png` (200) y ninguna otra a `/games/snake/…` ni a archivos de audio. Ninguna petición fallida.                                                                                                                       |
| PNG bloqueado           | Con la petición abortada, la fruta se dibuja como un círculo `#ff006e` desde `ready` y el bot jugó hasta 6 celdas y 30 puntos. Ningún error de JavaScript; la consola solo muestra el aviso de red del navegador por la petición abortada.                    |
| Consola                 | 0 errores al abrir, jugar, terminar y salir de `/#/jugar/snake`.                                                                                                                                                                                              |
| Limpieza                | Se borró la fila de prueba (id 25). `public.scores` tiene 0 filas de `snake`.                                                                                                                                                                                 |

Notas:

- Tablero lleno: cambio local sin commitear en `lib/snake/config.ts` con `COLS` 4, `ROWS` 3, `START_SNAKE` (2..0, 0) y `FIRST_FRUIT` (3, 2), porque la serpiente y la 1.ª fruta del tablero real quedan fuera de 4×3. El bot siguió un ciclo hamiltoniano del tablero. Después se restauró el archivo y se volvió a compilar.
- Con el PNG bloqueado, Chromium escribe "Failed to load resource: net::ERR_FAILED" en la consola. Es el registro de red del propio navegador por la petición que abortó la prueba, no un error del motor: `new Image()` no lanza excepciones y no hay errores sin capturar.
- Durante la implementación, `createInput` recibió un 3.er parámetro `getDir` (ver "Decisiones").
- En el pulido se añadió un halo tenue `rgba(230, 233, 255, 0.45)` con `shadowBlur` 10 detrás de la fruta, para que los sprites oscuros (brócoli, pimiento, berenjena) se despeguen del fondo. Los 22 nombres de `sprites.ts` se revisaron en una hoja de contactos y corresponden a lo que se ve.
- A 375 px la tira inferior del CRT ("SEÑAL OK · SNAKE · CRT-83…") se parte en varias líneas. Es de `GamePlayer.tsx` y pasa también con los demás juegos.
