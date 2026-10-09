# SPEC 09 — Juego real: ARKANOID

> **Estado:** Approved
> **Depende de:** SPEC 06, SPEC 07
> **Fecha:** 2026-10-09
> **Objetivo:** Portar a TypeScript el Arkanoid de `references/started-games/04-arkanoid/` y hacerlo jugable en `#/jugar/arkanoid`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

Hoy el catálogo tiene BLOQUE BUSTER (`bloque-buster`), un rompe-bloques simulado: el player sube la puntuación con un intervalo.
`references/started-games/04-arkanoid/` tiene un Arkanoid completo en canvas (`game.js`, 268 líneas; `levels.js`, 50; `assets/spritesheet.js`, 66), pensado como página independiente.
Ese código guarda el estado en globals (`game.js:15-29`), usa `getElementById` (`:1`) y escucha `keydown` y `keyup` en `document` y `click` y `mousemove` en el canvas sin quitar nunca las escuchas (`:70-103`).
Su bucle `requestAnimationFrame` no tiene tope de `dt` y nunca se cancela (`:253-262`), y usa `canvas.width` como ancho del campo, que con `dpr` 2 valdría 1600.
También dibuja su propio HUD en el canvas (`:230-244`), tiene una pausa con P o Escape con un menú para saltar de nivel con clic (`:177-212`), overlays de GAME OVER y de victoria, un spritesheet pixel-art y dos sonidos.
Este spec porta el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
El catálogo ya tiene un juego equivalente, BLOQUE BUSTER, que pasa a llamarse ARKANOID.

## Alcance

**Dentro:**

- Migración `replace_bloque_buster_with_arkanoid`: id, título y descripciones. La portada `.cover-bricks` se mantiene.
- Actualizar la referencia al id `bloque-buster` en `lib/home.ts`: la fila de `RECENT_SCORES` de GLITCHA.
- Motor de ARKANOID en TypeScript en `lib/arkanoid/`, sin React, con la misma jugabilidad que `game.js` y `levels.js`: paleta movida con ← →, pelota con rebotes en paredes, paleta y bloques, 10 puntos por bloque, 3 vidas, 5 niveles con su patrón y su velocidad, avance automático de nivel y explosión de 150 ms en 4 frames.
- Canvas de 800×600 dibujado con primitivas: sin spritesheet ni assets.
- Paleta neón del Vault en el canvas: paleta cyan, pelota `--ink`, y los 7 colores de bloque de la referencia pasados a magenta, amarillo, cyan, verde, violeta, naranja y plata.
- Definición `arkanoidEngine` en `lib/arkanoid/definition.ts` y entrada en `lib/engines/registry.ts`.
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: bloques, paleta, pelota, glow y explosión en el canvas, y la tira de controles.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad. La referencia movía la paleta con el ratón.
- Sonido. Los dos mp3 de la referencia no se copian.
- Spritesheet y assets de imagen.
- Leaderboard real en el detalle (`#/juego/arkanoid`). Sigue con `seededScores`.
- `best` y `plays` calculados.
- Alias o redirección de `#/juego/bloque-buster` y `#/jugar/bloque-buster`.
- Mecánicas nuevas y cambios de balance: ángulo según el punto de impacto en la paleta, rebote según el lado del bloque, pelota pegada a la paleta hasta lanzar, pausa tras perder una vida, power-ups, niveles después del 5.º.
- Lo que se descarta de la referencia: HUD del canvas, pausa con P o Escape, menú de salto de nivel con clic, overlays de GAME OVER y "¡Completaste el juego!".
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (migración `replace_bloque_buster_with_arkanoid` en `supabase/migrations/`)

```sql
update public.games set
  id = 'arkanoid',
  title = 'ARKANOID',
  short = 'Rebota la pelota y derriba cinco muros de neón.',
  long = 'Desliza la paleta y mantén viva la pelota para pulverizar muros de bloques cromáticos. Cinco niveles con su propio patrón: parrilla, pirámide, ajedrez, muro con huecos y cruz. En cada nivel la pelota corre un 10 % más. Tienes tres vidas.'
where id = 'bloque-buster';
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_replace_bloque_buster_with_arkanoid.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- `cat` (`ARCADE`), `color` (`cyan`), `cover` (`cover-bricks`), `best` (`28450`), `plays` (`12.4K`) y `sort_order` (`1`) no cambian.
- Hoy (2026-10-09) `public.scores` tiene 0 filas con `game_id = 'bloque-buster'`, así que la FK no bloquea el `update` y la migración no borra nada.
- `.cover-bricks` no se renombra: no contiene el id viejo y ya dibuja filas de ladrillos neón. `app/globals.css` no cambia.
- En `lib/home.ts`, la fila de `RECENT_SCORES` con `gameId: "bloque-buster"` (GLITCHA, 28450) pasa a `gameId: "arkanoid"`.
- `#/juego/bloque-buster` y `#/jugar/bloque-buster` dejan de existir y caen al Home.

### Motor (`lib/arkanoid/`)

| Archivo         | Contenido                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config.ts`     | `W` 800, `H` 600, constantes de paleta, pelota, bloques, puntos, vidas, explosión y `MAX_DT`, `COLORS` y `BLOCK_COLORS`.                                                          |
| `levels.ts`     | `BlockColor` (las 7 claves de la referencia) y `LEVELS`: los 5 niveles de `levels.js`, con el mismo algoritmo, tipados como `{ speed: number; blocks: { col; row; color }[] }[]`. |
| `entities.ts`   | Tipos `Paddle`, `Ball`, `Block` y `Explosion`, y `collideAABB(ball, block)` como `game.js:61-68`.                                                                                 |
| `input.ts`      | `createInput(target, isActive)`: teclas mantenidas (`isDown`), pulsación de un frame (`pressed`), `clear()` y `destroy()`.                                                        |
| `engine.ts`     | `createArkanoidGame(canvas, callbacks): GameEngine`.                                                                                                                              |
| `definition.ts` | `arkanoidEngine: EngineDefinition`.                                                                                                                                               |

No hay `types.ts` propio: los tipos de las entidades van en `entities.ts` y el motor usa los de `lib/engines/types.ts`.

```ts
// lib/arkanoid/definition.ts
export const arkanoidEngine: EngineDefinition = {
  id: "arkanoid",
  width: W, // 800
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [{ keys: ["←", "→"], label: "MOVER" }],
  create: createArkanoidGame,
};
```

```ts
// config.ts — valores de game.js y spritesheet.js
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_Y = 560;
export const PADDLE_W = 81; // game.js:15 (el sprite mide 162, pero se dibuja a 81)
export const PADDLE_H = 14;
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s, × speed del nivel
export const BASE_BALL_VY = -300;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80; // (800 − 10 × 64) / 2
export const BLOCKS_ORIGIN_Y = 80;
export const POINTS_PER_BLOCK = 10;
export const START_LIVES = 3;
export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_FRAMES = 4;
export const MAX_DT = 0.05; // s

// Colores del canvas, copiados de los tokens de :root.
export const BLOCK_COLORS: Record<BlockColor, string> = {
  red: "#ff006e", // --magenta
  yellow: "#f5ff00", // --yellow
  cyan: "#00f5ff", // --cyan
  green: "#00ff88", // --green
  magenta: "#aa00ff", // violeta de .cover-tetro
  hotpink: "#ffae00", // naranja de .cover-bricks
  gray: "#c7d0e0", // --silver
};
export const COLORS = {
  bg: "#000",
  paddle: "#00f5ff", // --cyan
  ball: "#e6e9ff", // --ink
};
```

Las claves de `BLOCK_COLORS` son los nombres de color de `levels.js`, para que `levels.ts` sea una copia directa.

Niveles (de `levels.js`):

| Nivel | Patrón                                    | Bloques | `speed` | Velocidad de la pelota (vx, vy) |
| ----- | ----------------------------------------- | ------- | ------- | ------------------------------- |
| 1     | Parrilla completa 10×6                    | 60      | 1.00    | (200, −300) px/s                |
| 2     | Pirámide centrada                         | 40      | 1.10    | (220, −330) px/s                |
| 3     | Ajedrez (`(col + row) % 2 === 0`)         | 30      | 1.21    | (242, −363) px/s                |
| 4     | Filas con huecos (`gaps4`)                | 39      | 1.33    | (266, −399) px/s                |
| 5     | Marco + cruz central (columna 4 y fila 2) | 39      | 1.46    | (292, −438) px/s                |

Total: 208 bloques, 2 080 puntos como máximo.

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ready`    | Fase inicial. Los 60 bloques del nivel 1, la paleta centrada (`x` 359,5) y la pelota apoyada encima (`x` 392, `y` 544), todo quieto. Espacio llama a `initGame()` (`score` 0, `lives` 3, paleta centrada y `loadLevel(1)`) y pasa a `playing`. La pelota sale en ese frame. |
| `playing`  | Igual que `update` en `game.js:105-165`: paleta, movimiento de la pelota, rebotes en paredes y paleta, choque con un bloque, explosiones y pelota perdida.                                                                                                                  |
| `gameover` | Se alcanza al perder la tercera pelota, al romper el último bloque del nivel 5 o con `end()`. Los bloques que quedan se ven quietos. La paleta, la pelota y las explosiones no se dibujan, y no hay input. Espacio no reinicia.                                             |

La fase `dead` no se usa: al perder una vida la pelota vuelve a salir desde la paleta en el mismo frame, como en `game.js`.

Reglas del motor:

- La jugabilidad es la de `game.js` sin cambios, en este orden dentro de cada frame:
  - Paleta: ← resta y → suma `PADDLE_SPEED × dt` a `paddle.x`, limitado a `0..W − PADDLE_W` (0..719).
  - Pelota: `x += vx × dt`, `y += vy × dt`.
  - Paredes: si `x ≤ 0`, `x = 0` y `vx = |vx|`; si `x + 16 ≥ W`, `x = W − 16` y `vx = −|vx|`; si `y ≤ 0`, `y = 0` y `vy = |vy|`. No hay pared abajo.
  - Paleta: si `vy > 0`, la pelota se solapa en horizontal con la paleta y `y + 16` está entre `PADDLE_Y` y `PADDLE_Y + PADDLE_H + 8`, entonces `y = PADDLE_Y − 16` y `vy = −|vy|`. El ángulo no cambia.
  - Bloques: el primer bloque vivo que se solapa con la pelota (`collideAABB`) muere, crea una explosión, suma 10 puntos e invierte `vy`, sea cual sea el lado del choque. Solo se rompe un bloque por frame.
  - Si ya no quedan bloques vivos: en los niveles 1 a 4, `loadLevel(nivel + 1)`; en el nivel 5, `gameover`.
  - Explosiones: `elapsed += dt × 1000` y se quitan al llegar a 150 ms.
  - Pelota perdida: si `y > H`, se resta una vida. Con 0 vidas, `gameover`. Si quedan vidas, la pelota se coloca sobre la paleta y vuelve a salir con la velocidad del nivel.
- `loadLevel(n)` crea los bloques del nivel en `BLOCKS_ORIGIN + (col × 64, row × 24)`, vacía las explosiones y coloca la pelota sobre la paleta (`x = paddle.x + 32,5`, `y = 544`) con `vx = 200 × speed` y `vy = −300 × speed`. La paleta no se recentra. La pelota sale en el mismo frame.
- Todos los límites usan `W` y `H`, nunca `canvas.width` ni `canvas.height`, que valen `W × dpr` y `H × dpr`.
- Resolución lógica 800×600, con `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- `dt` en segundos, limitado a `MAX_DT` (50 ms). Con la pelota más rápida (438 px/s) avanza como mucho 21,9 px por frame, menos que la altura de un bloque (24 px).
- El motor arranca en `ready` y su bucle `requestAnimationFrame` empieza al crearse.
- `setPaused(true)` cancela el rAF y vacía el input. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`.
- `end()` pasa a `gameover` si aún no lo está. `destroy()` cancela el rAF y quita las escuchas, y es idempotente: aguanta el doble montaje de StrictMode.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER", "¡Completaste el juego!", pausa ni menú de niveles. No dibuja ningún texto.
- Mapeo al HUD: `score` = puntuación, `level` = nivel actual (1–5), `lives` = vidas que quedan (3 → 0).
- `onStats` solo cuando cambian `score`, `level` o `lives`. `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- La puntuación máxima es 2 080, muy por debajo del CHECK de 9 999 999: el motor no necesita tope.
- Dibujo con primitivas (sin imágenes):
  - Fondo `COLORS.bg`.
  - Cada bloque vivo es un `fillRect` de 62×22 dentro de su celda de 64×24 (1 px de separación), con su color de `BLOCK_COLORS`, la franja de brillo de 4 px de `rgba(255, 255, 255, 0.12)` arriba y glow: `shadowBlur` con `shadowColor` igual a su color.
  - La paleta es un rectángulo de 81×14 en `COLORS.paddle` con glow.
  - La pelota es un círculo de radio 8 centrado en `(x + 8, y + 8)` en `COLORS.ball` con glow. Su caja de choque sigue siendo el cuadrado de 16×16.
  - La explosión dura 150 ms en 4 frames (`frame = min(floor(elapsed / 150 × 4), 3)`), como `game.js:223`. En el frame `k`, el bloque se dibuja partido en 4 trozos (2×2) de su color, separados `k × 4` px del centro, con `globalAlpha` `1 − k × 0,25`.
  - Los tamaños de la franja de brillo, el glow y la separación de los trozos se ajustan en el pulido sin cambiar las cajas de choque.
- Los colores se leen de `config.ts`. Nada se lee con `getComputedStyle` en cada frame.
- Lo que se quita de la referencia: pausa con P o Escape, menú de salto de nivel y su escucha `click`, escucha `mousemove`, HUD del canvas, overlays de GAME OVER y de victoria, spritesheet y sonidos.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `ArrowLeft`, `ArrowRight` y `Space`. La P y Escape no son del juego: la P la gestiona el player.
- `preventDefault()` de los códigos del juego solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- ← y → se leen como teclas mantenidas (`isDown`), sin autorrepetición: la paleta se mueve mientras estén pulsadas, como `keys` en `game.js:29`.
- Espacio se lee como pulsación de un frame (`pressed`) y solo hace algo en `ready`. En `playing` se captura (para que no haga scroll) pero no hace nada.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- `clear()` suelta todas las teclas y descarta las pulsaciones pendientes.

### Textos

| Elemento          | Texto                                     |
| ----------------- | ----------------------------------------- |
| Overlay de inicio | "ARKANOID" y "PULSA ESPACIO PARA EMPEZAR" |
| Tira de controles | `← →` MOVER · `P` PAUSA                   |

## Plan de implementación

1. **Catálogo.** Comprobar con `select count(*) from public.scores where game_id = 'bloque-buster'` que sigue en 0. Si no lo está, parar y preguntar al usuario qué hacer con esas filas antes de seguir. Crear `pending_replace_bloque_buster_with_arkanoid.sql`, aplicarlo con `apply_migration`, renombrarlo con su versión y regenerar `lib/supabase/database.types.ts`. Actualizar `lib/home.ts`. Verificación: `select id, title, cat, color, cover, sort_order from public.games where id = 'arkanoid'` devuelve `arkanoid`, `ARKANOID`, `ARCADE`, `cyan`, `cover-bricks`, `1`; `grep -rn "bloque-buster" app components lib` vacío; la Biblioteca muestra ARKANOID en la 1.ª posición; `#/jugar/arkanoid` abre la simulación.
2. **Base del motor.** `config.ts`, `levels.ts` y `entities.ts`. Verificación: `npm run lint` y `npm run build` pasan.
3. **Input.** `input.ts` con teclas mantenidas, pulsaciones y la regla de `preventDefault`. Verificación: `npm run build` pasa.
4. **Motor.** `engine.ts` con las fases, `initGame`, `loadLevel`, la física de `update`, las explosiones, el dibujo con primitivas, `setupCanvas`, `setPaused`, `end`, `destroy` y los callbacks. Verificación: `npm run build` pasa.
5. **Registro.** `definition.ts` y la entrada `arkanoid: arkanoidEngine` en `ENGINES`. Verificación: en `#/jugar/arkanoid` Espacio empieza la partida, el HUD suma 10 al romper un bloque y perder las 3 pelotas abre el modal.
6. **Pulido con `/frontend-design`.** Bloques, paleta, pelota, glow, explosión y la tira de controles a 1440 px y 375 px, sin cambiar la estética del Vault. La portada `.cover-bricks` no cambia.
7. **Verificación con Playwright.** `npm run build` + `next start -p 3001`, recargando la página al empezar cada recorrido. Recorrer los criterios en `http://localhost:3001/#/jugar/arkanoid` a 1440 y 375 px, con capturas (no se versionan). Leer las posiciones de la paleta, la pelota y los bloques con `getImageData`, y usar un bot dentro de la página que mantenga ← o → para poner la paleta bajo la pelota. Si un nivel no se vacía jugando en 3 minutos, comprobar el avance de nivel y la victoria con un cambio local sin commitear en `LEVELS` (pocos bloques por nivel), como el motor de prueba del SPEC 07, y anotarlo. Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración `replace_bloque_buster_with_arkanoid` coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `arkanoid` con título `ARKANOID`, `cat` `ARCADE`, `color` `cyan`, `cover` `cover-bricks` y `sort_order` 1, y ya no tiene la fila `bloque-buster`.
- [ ] `lib/supabase/database.types.ts` está regenerado después de la migración.
- [ ] `grep -rn "bloque-buster" app components lib` no devuelve resultados, y `/#/juego/bloque-buster` y `/#/jugar/bloque-buster` muestran el Home.
- [ ] La Biblioteca muestra ARKANOID con la portada `.cover-bricks` en la 1.ª posición.
- [ ] El Home muestra la fila de GLITCHA en "ÚLTIMAS PUNTUACIONES" con el título ARKANOID.
- [ ] `ENGINES` tiene las entradas `asteroids`, `tetris` y `arkanoid`, y `GamePlayer.tsx` no ha cambiado.
- [ ] Al abrir `/#/jugar/arkanoid` se ve "ARKANOID / PULSA ESPACIO PARA EMPEZAR" sobre los 60 bloques del nivel 1, y PAUSA y FIN están deshabilitados.
- [ ] Antes de empezar, el HUD muestra 0 / ♥ ♥ ♥ / 01, y la paleta y la pelota no se mueven.
- [ ] Espacio empieza la partida, el overlay desaparece y la pelota sale hacia arriba a la derecha desde la paleta.
- [ ] Mantener ← mueve la paleta a la izquierda y mantener → a la derecha, a 400 px/s; contra los bordes (x 0 y x 719) no se mueve más.
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] La pelota rebota en las paredes izquierda, derecha y de arriba, y en la paleta.
- [ ] Romper un bloque suma 10 puntos en el HUD y el bloque desaparece con una explosión de unos 150 ms.
- [ ] En el nivel 1 la pelota se mueve a (±200, ±300) px/s.
- [ ] Al vaciar el nivel 1, el nivel del HUD pasa a 02, aparecen los 40 bloques de la pirámide y la pelota sale desde la paleta a (220, −330) px/s.
- [ ] Los niveles 3, 4 y 5 muestran 30, 39 y 39 bloques con los patrones de ajedrez, huecos y marco con cruz.
- [ ] Al caer la pelota por abajo, el HUD pierde un ♥ y la pelota vuelve a salir desde la paleta sin pausa.
- [ ] Perder la tercera pelota abre el modal FIN DEL JUEGO con la misma puntuación que el HUD.
- [ ] Romper el último bloque del nivel 5 abre el modal FIN DEL JUEGO con 2 080 puntos.
- [ ] FIN abre el modal con la puntuación actual; los bloques quedan quietos y la paleta y la pelota desaparecen.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER", "¡Completaste el juego!" ni pausa: `fillText` no se llama nunca.
- [ ] La paleta es `#00f5ff` y la pelota `#e6e9ff`.
- [ ] Las filas del nivel 1 son, de arriba abajo, `#ff006e`, `#f5ff00`, `#00f5ff`, `#aa00ff`, `#ffae00` y `#00ff88`.
- [ ] La 1.ª fila del nivel 2 es `#c7d0e0`.
- [ ] PAUSA, la tecla P y `blur` congelan el canvas; al reanudar, la paleta no se mueve sola.
- [ ] Escape no pausa ni cambia nada en el juego.
- [ ] En el modal se pueden escribir iniciales con espacios y con la letra P sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = 'arkanoid'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña ARKANOID del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/arkanoid`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en 0 / ♥ ♥ ♥ / 01 y los 60 bloques del nivel 1.
- [ ] SALIR lleva a `#/juego/arkanoid`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1600 y `canvas.height` es 1200, y la pelota sigue rebotando en la pared derecha (x lógica 784).
- [ ] A 1440 px y a 375 px no hay scroll horizontal, y el canvas mantiene la proporción 800:600 (4:3) dentro del CRT.
- [ ] La tira de controles muestra `← →` MOVER · `P` PAUSA, y en táctil se ve "REQUIERE TECLADO".
- [ ] Mover el ratón sobre el canvas no mueve la paleta.
- [ ] `/#/jugar/asteroids` y `/#/jugar/tetris` siguen funcionando y `/#/jugar/serpentina` sigue simulando.
- [ ] No hay peticiones a `/games/arkanoid/…` ni a archivos de audio en la pestaña de red.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/arkanoid`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** sustituir BLOQUE BUSTER por ARKANOID. Decisión del usuario; es el mismo juego y dos rompe-bloques en el catálogo confundirían.
- **No:** añadir una novena fila.
- **Sí:** cambiar el id a `arkanoid` y el título a ARKANOID. Decisión del usuario; es el nombre real del juego, como `rocas` → `asteroids` y `caida` → `tetris`.
- **Sí:** el `update` no borra puntuaciones, porque `bloque-buster` tiene 0 filas en `public.scores`. Si aparecen antes de implementar, el paso 1 para y pregunta.
- **No:** mantener el id `bloque-buster` ni usar `breakout`.
- **No:** renombrar `.cover-bricks`. Decisión del usuario; no contiene el id viejo y ya dibuja ladrillos neón.
- **Sí:** descripciones nuevas que nombran los cinco patrones, el +10 % de velocidad por nivel y las tres vidas. Decisión del usuario; describen solo mecánicas que el juego tiene.
- **No:** mantener los textos de BLOQUE BUSTER. Hablan de "patrones imposibles" y de racha, que el port no tiene.
- **Sí:** jugabilidad idéntica a `game.js`, rarezas incluidas: paleta de 81 px, ángulo fijo, todo choque con un bloque invierte `vy` y un bloque por frame. Decisión del usuario.
- **No:** ángulo según el punto de impacto en la paleta ni rebote según el lado del bloque. Cambiarían el balance; van en otro spec.
- **Sí:** romper el último bloque del nivel 5 pasa a `gameover` y abre el modal FIN DEL JUEGO. Decisión del usuario; la partida termina y el canvas no dibuja mensajes.
- **No:** volver al nivel 1 tras el nivel 5 ni overlay "¡Completaste el juego!".
- **Sí:** saque inmediato al empezar, al perder una vida y al cambiar de nivel, como `game.js`. Decisión del usuario.
- **No:** pelota pegada a la paleta hasta pulsar Espacio, ni pausa de 1 s con la fase `dead`.
- **Sí:** `ready` con los 60 bloques del nivel 1, la paleta centrada y la pelota encima, todo quieto. Decisión del usuario; escena quieta y legible bajo el overlay.
- **No:** fondo vacío en `ready`.
- **Sí:** dibujar con primitivas neón en vez del spritesheet. Decisión del usuario; el pixel-art de la referencia no encaja con la estética del Vault y así no hay assets que cargar.
- **No:** copiar `spritesheet-breakout.png` a `public/games/arkanoid/`.
- **Sí:** 7 colores de bloque distintos: los 4 neones, `--silver`, el violeta de `.cover-tetro` y el naranja de `.cover-bricks`. Decisión del usuario; los niveles 1 y 4 tienen seis filas de colores distintos.
- **No:** solo 4 neones más `--ink` con colores repetidos.
- **Sí:** motor sin React en `lib/arkanoid/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault en el canvas.
- **Sí:** HUD de React y modal de la plataforma; el canvas no dibuja ningún texto, porque puntuación, nivel y vidas caben en el HUD.
- **No:** HUD del canvas, pausa con P o Escape, menú de salto de nivel ni overlays de GAME OVER y victoria de la referencia.
- **Sí:** Espacio · "PULSA ESPACIO PARA EMPEZAR" para empezar y tira `← →` MOVER. Decisión del usuario; igual que ASTEROIDS y TETRIS.
- **No:** tope de puntuación en el motor. El máximo es 2 080.
- **No:** sonido. Decisión del usuario; ASTEROIDS y TETRIS no tienen y el SPEC 07 dejó fuera la infraestructura de audio.
- **No:** ratón y táctil. Decisión del usuario; van en su propio spec, aunque la referencia movía la paleta con el ratón.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                                       | Mitigación                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alguien guarda una partida simulada de BLOQUE BUSTER antes de implementar y la FK bloquea el `update`.       | El paso 1 cuenta las filas de `bloque-buster` antes de la migración. Si hay alguna, se para y se pregunta.                                                                                               |
| El Home filtra en silencio las filas de `RECENT_SCORES` con un id que no existe.                             | Paso 1 y criterio de GLITCHA en el Home.                                                                                                                                                                 |
| Con el ángulo fijo, el jugador no puede apuntar y la pelota puede tardar mucho en tocar los últimos bloques. | Aceptado: es la jugabilidad de la referencia. En la verificación, si un nivel no se vacía en 3 minutos, el avance y la victoria se comprueban con un cambio local sin commitear en `LEVELS`, y se anota. |
| Copiar `canvas.width` de la referencia rompe las paredes con `dpr` 2 (la pared derecha quedaría en 1600).    | Todos los límites usan `W` y `H`. Criterio de `dpr` 2 con rebote en la pared derecha.                                                                                                                    |
| Un frame largo hace que la pelota atraviese un bloque o la paleta.                                           | `dt` limitado a 50 ms: como mucho 21,9 px por frame, menos que los 24 px de un bloque y que la ventana de 22 px de la paleta.                                                                            |
| `shadowBlur` en 60 bloques baja el rendimiento.                                                              | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright a 375 px con dpr 2, quitar el glow de los bloques y dejarlo en la paleta y la pelota. Se anota.                                               |
| Al perder la tercera vida, el HUD muestra "—" en vidas, porque `GamePlayer.tsx` trata 0 como sin vidas.      | Aceptado: pasa igual en ASTEROIDS y cambiarlo toca el player.                                                                                                                                            |
| El leaderboard falso del detalle usa `id.length` como semilla y cambia de `bloque-buster` a `arkanoid`.      | Aceptado: son datos simulados.                                                                                                                                                                           |

## Lo que **no** entra en este spec

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad.
- Sonido.
- Spritesheet y assets de imagen.
- Leaderboard real en el detalle.
- `best` y `plays` calculados.
- Alias de `bloque-buster`.
- Mecánicas nuevas: ángulo por zona de paleta, rebote por lado, pelota pegada, pausa tras perder una vida, power-ups y más de 5 niveles.
- HUD del canvas, pausa con P o Escape, menú de niveles y overlays de la referencia.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la verificación

Fecha: 2026-10-09. `npm run build` + `next start -p 3001`, Chromium de Playwright, recargando la página al empezar cada recorrido.
Colores, bloques vivos y patrones se leyeron con `getImageData` en el centro de cada celda de 64×24.
Las trayectorias de la pelota y la paleta se registraron interceptando `arc` y `fillRect` del contexto 2D, y un bot dentro de la página mantuvo ← o → para poner la paleta bajo la pelota.

| Área                    | Resultado                                                                                                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y build            | `npm run lint` y `npm run build` sin errores.                                                                                                                                                                                                                                |
| Catálogo                | Migración `20261009171721_replace_bloque_buster_with_arkanoid`, igual que `list_migrations`, sin archivos `pending_`. `public.games` tiene `arkanoid` · `ARKANOID` · `ARCADE` · `cyan` · `cover-bricks` · 1 y ninguna fila `bloque-buster`. Tipos regenerados (sin cambios). |
| Referencias al id viejo | `grep -rn "bloque-buster" app components lib` vacío. `/#/juego/bloque-buster` y `/#/jugar/bloque-buster` muestran el Home.                                                                                                                                                   |
| Biblioteca y Home       | ARKANOID con `.cover-bricks` en la 1.ª posición. "GLITCHA ▸ ARKANOID +28.450" en ÚLTIMAS PUNTUACIONES.                                                                                                                                                                       |
| Registro                | `ENGINES` = `asteroids`, `tetris` y `arkanoid`. `GamePlayer.tsx`, `GameCanvas.tsx` y `app/globals.css` sin cambios.                                                                                                                                                          |
| `ready`                 | Overlay "ARKANOID / PULSA ESPACIO PARA EMPEZAR" sobre los 60 bloques, PAUSA y FIN deshabilitados, HUD 0 / ♥ ♥ ♥ / 01. Paleta en x 359,5 y pelota en (392, 544), sin moverse en 1 s.                                                                                          |
| Inicio                  | Espacio quita el overlay y la pelota sale desde (392, 544) hacia arriba a la derecha: (408,5, 519,2) a los 100 ms.                                                                                                                                                           |
| Paleta                  | Mantener ← da −400 px/s y → +400 px/s. Contra los bordes se queda en x 0 y x 719.                                                                                                                                                                                            |
| Scroll                  | `window.scrollY` sigue en 0 al pulsar Espacio, ← y → durante la partida, con la página desplazable.                                                                                                                                                                          |
| Rebotes                 | `vx` cambia de signo en x 784 y x 0, `vy` en y 0 (techo) y en y 544 (paleta).                                                                                                                                                                                                |
| Bloques y explosión     | Cada bloque suma 10 en el HUD. La explosión se dibuja en 4 frames con `globalAlpha` 1 / 0,75 / 0,5 / 0,25, y el último se dibuja a los 133 ms (se quita al pasar de 150).                                                                                                    |
| Velocidad               | Nivel 1: (200, 300) px/s. Nivel 2: la pelota sale desde la paleta a (220, −330) px/s.                                                                                                                                                                                        |
| Niveles                 | Al vaciar cada nivel el HUD pasa al siguiente. Nivel 2: pirámide de 40. Nivel 3: ajedrez de 30. Nivel 4: 39 con los huecos de `gaps4`, fila a fila. Nivel 5: marco + cruz de 39.                                                                                             |
| Victoria                | Romper el último bloque del nivel 5 abrió FIN DEL JUEGO con 2080, igual que el HUD.                                                                                                                                                                                          |
| Vidas                   | Al caer la pelota el HUD pierde un ♥ y en el frame siguiente (16 ms) la pelota está en y 544 sobre la paleta.                                                                                                                                                                |
| Derrota                 | Perder la tercera pelota abrió FIN DEL JUEGO con 70, igual que el HUD. El HUD muestra "—" en vidas (riesgo aceptado).                                                                                                                                                        |
| FIN                     | El modal muestra 620, igual que el HUD. Quedan 38 bloques quietos y la pelota y la paleta no se vuelven a dibujar.                                                                                                                                                           |
| Textos del canvas       | Con `fillText` interceptado: 0 llamadas en todos los recorridos.                                                                                                                                                                                                             |
| Colores                 | Paleta `#00f5ff` y pelota `#e6e9ff`. Filas del nivel 1: `#ff006e`, `#f5ff00`, `#00f5ff`, `#aa00ff`, `#ffae00`, `#00ff88`. 1.ª fila del nivel 2: `#c7d0e0`.                                                                                                                   |
| Pausa                   | PAUSA, la tecla P y `blur` congelan el canvas. Con ← mantenida durante la pausa, al reanudar la paleta sigue en la misma x (226,2 y 166,5).                                                                                                                                  |
| Escape                  | No pausa y el juego sigue corriendo.                                                                                                                                                                                                                                         |
| Ratón                   | Barrer el canvas con el ratón no mueve la paleta.                                                                                                                                                                                                                            |
| Modal                   | Escribir "P P P" da "P P P" sin que el juego reaccione. Guardar " AB 1 " creó la fila `arkanoid` · `AB 1` · 2080 y mostró "▸ PUNTUACIÓN GUARDADA_".                                                                                                                          |
| Salón                   | La pestaña ARKANOID mostró `AB 1 · 2080`. Sin filas muestra "SIN PUNTUACIONES · SÉ EL PRIMERO", y su botón JUGAR A ARKANOID lleva a `#/jugar/arkanoid`.                                                                                                                      |
| JUGAR DE NUEVO y SALIR  | JUGAR DE NUEVO vuelve al overlay con HUD 0 / ♥ ♥ ♥ / 01 y los 60 bloques. SALIR lleva a `#/juego/arkanoid`, donde Espacio hace scroll (0 → 162,5).                                                                                                                           |
| Resolución              | Con `devicePixelRatio` 2, `canvas.width` 1600 y `canvas.height` 1200, y la pelota rebota en la pared derecha en x 784.                                                                                                                                                       |
| 1440 px y 375 px        | Canvas de 1004×753 y 295×221, proporción 1,333. Sin scroll horizontal.                                                                                                                                                                                                       |
| Controles               | `← → MOVER · P PAUSA`. En táctil (`mobile` + emulación táctil) se ve "REQUIERE TECLADO".                                                                                                                                                                                     |
| Rendimiento             | A 375 px con dpr 2 y 60 bloques: el bucle tarda 0,13 ms de media y 0,4 ms como máximo, sin frames perdidos. El glow de los bloques se mantiene.                                                                                                                              |
| Otros juegos            | `/#/jugar/asteroids` y `/#/jugar/tetris` empiezan con Espacio; `/#/jugar/serpentina` sigue simulando (163 → 857).                                                                                                                                                            |
| Red                     | Ninguna petición a `/games/arkanoid/…` ni a archivos de audio o imagen.                                                                                                                                                                                                      |
| Consola                 | 0 errores al abrir, jugar, terminar y salir de `/#/jugar/arkanoid`. Los únicos avisos eran de `getImageData` del script de verificación.                                                                                                                                     |
| Limpieza                | Se borró la fila de prueba (id 23). `public.scores` tiene 0 filas de `arkanoid`.                                                                                                                                                                                             |

Notas:

- La partida completa (5 niveles) se jugó con el bot y sin cambiar `LEVELS`. Para no esperar, el reloj que recibe el motor en `requestAnimationFrame` se aceleró ×3 dentro de la página: cada frame real avanza 50 ms, el `MAX_DT` del motor. La velocidad de la pelota se midió en tiempo de juego, y la del nivel 1 y los rebotes también a velocidad real.
- En el pulido el glow de los bloques bajó a 4 para que la separación de 1 px se lea, los trozos de la explosión brillan con 12 y se separan 6 px por frame, y la paleta lleva la misma franja de brillo de 4 px que los bloques. Las cajas de choque no cambian.
- A 375 px la tira inferior del CRT ("SEÑAL OK · ARKANOID · CRT-83…") se parte en varias líneas. Es de `GamePlayer.tsx` y pasa también con ASTEROIDS y TETRIS.
