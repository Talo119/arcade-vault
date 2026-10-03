# SPEC 05 — Juego real: ASTEROIDS

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-02
> **Objetivo:** Portar a TypeScript el Asteroids de `references/started-games/02-asteroids/` y hacerlo jugable en `#/jugar/asteroids`, dentro del CRT y del HUD del player, en lugar de la simulación.

## Por qué existe este spec

Hoy ningún juego del Vault es jugable: `GamePlayer.tsx` simula la puntuación con un intervalo.
`references/started-games/02-asteroids/` tiene un Asteroids completo en canvas (`game.js`, 510 líneas), pensado como página independiente.
Ese código usa variables globales, `getElementById` y escuchas en `window` que nunca se limpian, así que no se puede cargar tal cual en una SPA que monta y desmonta pantallas.
Este spec lo porta a un motor TypeScript que se puede crear y destruir, y lo conecta con la UI que ya existe en el player: HUD, pausa, FIN y modal de fin de partida.
El catálogo ya tiene un juego equivalente, ROCAS, que pasa a llamarse ASTEROIDS.
Tetris y Arkanoid (`references/started-games/03-tetris/` y `04-arkanoid/`) irán en sus propios specs.

## Alcance

**Dentro:**

- Renombrar el juego `rocas` a `asteroids` en el catálogo: id, título, descripciones y clase de portada.
- Actualizar las referencias al id `rocas`: `lib/home.ts`, `app/globals.css` y el comentario de `components/screens/Library.tsx`.
- Motor de Asteroids en TypeScript en `lib/asteroids/`, sin React, con la misma jugabilidad que `game.js`: física, puntos, niveles, vidas, invencibilidad, partículas y power-up de disparo triple.
- Paleta neón del Vault en el canvas: nave cyan, asteroides magenta, power-up verde, llama amarilla y glow.
- Canvas nítido en pantallas de alta densidad (`devicePixelRatio`) y escalado al ancho del CRT.
- Componente cliente `components/games/AsteroidsCanvas.tsx` que crea y destruye el motor.
- Integración en `components/screens/GamePlayer.tsx` solo para `asteroids`: HUD de React alimentado por el motor, pantalla "PULSA ESPACIO PARA EMPEZAR", PAUSA/REANUDAR, tecla P, pausa automática al perder el foco, FIN, modal de fin de partida y JUGAR DE NUEVO.
- Tira de controles bajo el CRT y aviso "REQUIERE TECLADO" en dispositivos táctiles.
- Pulido visual de los overlays y la tira de controles con `/frontend-design`.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Tetris, Arkanoid y el resto de juegos del catálogo. Siguen con la simulación actual.
- Abstracción genérica de motores o registro de juegos. Se decide cuando llegue el segundo juego real.
- Controles táctiles y soporte de gamepad.
- Persistencia de puntuaciones: tabla `scores` en Supabase, Salón de la Fama real y récord personal en `localStorage`.
- Sonido.
- Alias o redirección de `#/juego/rocas` y `#/jugar/rocas`.
- Mecánicas nuevas (OVNIs, hiperespacio) y cambios de balance.
- Pantalla completa y menú de opciones.
- Adaptar la jugabilidad a `prefers-reduced-motion`.
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (`lib/games.ts`)

La entrada `rocas` se sustituye por:

```ts
{
  id: "asteroids",
  title: "ASTEROIDS",
  short: "Pulveriza asteroides en gravedad cero.",
  long: "Tu nave triangular flota en el vacío absoluto. Rota, propúlsate y dispara para partir cada roca en fragmentos más pequeños. Atrapa el power-up 3x para disparar en abanico durante 5 segundos.",
  cat: "SHOOTER",        // sin cambios
  cover: "cover-asteroids",
  color: "yellow",       // sin cambios
  best: 41200,           // sin cambios
  plays: "15.6K",        // sin cambios
}
```

Reglas:

- La entrada mantiene su posición en `GAMES`.
- `.cover-rocas` pasa a llamarse `.cover-asteroids` en `app/globals.css`, en sus 4 apariciones, sin cambiar sus estilos.
- En `lib/home.ts`, la fila de `RECENT_SCORES` con `gameId: "rocas"` pasa a `gameId: "asteroids"`.
- El comentario de `matchesTitle` en `Library.tsx` cambia de ejemplo: `"as" finds ASTEROIDS but not INVASORES`.
- `#/juego/rocas` y `#/jugar/rocas` dejan de existir y caen al Home, como cualquier id desconocido.

### Motor (`lib/asteroids/`)

| Archivo       | Contenido                                                                                                |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| `config.ts`   | `W`, `H`, `RADII`, `SPEEDS`, `POINTS`, constantes del power-up y `COLORS`. Mismos valores que `game.js`. |
| `math.ts`     | `wrap`, `dist`, `rand`, `randInt`.                                                                       |
| `input.ts`    | `createInput(target)`: teclas mantenidas, pulsaciones de un frame, `clear()` y `destroy()`.              |
| `entities.ts` | Clases `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle`. Cada `draw` recibe el `ctx` como parámetro. |
| `engine.ts`   | `createAsteroidsGame(canvas, callbacks)`: estado, `update`, `draw` y bucle con `requestAnimationFrame`.  |
| `types.ts`    | Tipos públicos del motor.                                                                                |

```ts
// types.ts
export type AsteroidsPhase = "ready" | "playing" | "dead" | "gameover";

export interface AsteroidsStats {
  score: number;
  lives: number;
  level: number;
}

export interface AsteroidsCallbacks {
  onStats: (stats: AsteroidsStats) => void; // solo cuando cambia algún valor
  onPhase: (phase: AsteroidsPhase) => void; // en cada cambio de fase
}

export interface AsteroidsGame {
  setPaused: (paused: boolean) => void;
  end: () => void; // FIN: pasa a "gameover" si aún no lo está
  destroy: () => void; // cancela el rAF y quita las escuchas
}
```

```ts
// config.ts — colores del canvas, copiados de los tokens de :root
export const COLORS = {
  bg: "#000",
  ship: "#00f5ff", // --cyan
  bullet: "#e6e9ff", // --ink
  asteroid: "#ff006e", // --magenta
  powerUp: "#00ff88", // --green
  thrust: "#f5ff00", // --yellow
};
```

Fases:

| Fase       | Qué se ve y qué pasa                                                                                                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ready`    | Fase inicial. 4 asteroides grandes derivan de fondo y no hay nave. Espacio llama a `initGame()`, que regenera los asteroides lejos del centro, y pasa a `playing`.                               |
| `playing`  | Igual que `playing` en `game.js`.                                                                                                                                                                |
| `dead`     | Igual que `dead` en `game.js`: 2 s sin nave y reaparición con 3 s de invencibilidad.                                                                                                             |
| `gameover` | Se alcanza al perder la última vida o con `end()`. La nave no se dibuja ni recibe input. Los asteroides y las partículas siguen moviéndose. Espacio **no** reinicia: se reinicia desde el modal. |

Reglas del motor:

- El motor arranca en `ready` y su bucle empieza al crearse.
- La jugabilidad es la de `game.js` sin cambios: velocidades, radios, puntos (20/50/100), drag, cooldown de 0,2 s, power-up (15 % de probabilidad, garantizado a las 5 destrucciones, uno por nivel, 5 s de duración y 12 s de vida) y `3 + nivel` asteroides por nivel.
- `dt` se limita a 50 ms, como en `game.js`.
- El canvas tiene una resolución lógica de 800×600. Su buffer mide `800·dpr × 600·dpr`, con `dpr = Math.min(devicePixelRatio, 2)` leído al crear el motor, y se dibuja con `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
- El canvas no dibuja el HUD de puntuación, nivel ni vidas, ni el overlay "GAME OVER". El texto "3x 4.2s" del power-up activo sí se dibuja, arriba a la izquierda, en `COLORS.powerUp`.
- Cada trazo usa `shadowBlur` con `shadowColor` igual a su color de trazo. Las partículas usan el color de lo que explota: `COLORS.asteroid` o `COLORS.ship`.
- La fuente del canvas se lee una vez de la variable `--mono` del canvas con `getComputedStyle`, con `monospace` como respaldo.
- `setPaused(true)` cancela el rAF y vacía el input. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tiene `dt = 0`.
- `onStats` se emite solo cuando cambian `score`, `lives` o `level`, nunca en cada frame.

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: `ArrowLeft`, `ArrowRight`, `ArrowUp` y `Space`.
- Hace `preventDefault()` de los códigos del juego en `keydown` y `keyup` solo si se cumplen tres condiciones: el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`. Así Espacio no hace scroll ni activa el botón que tenga el foco.
- `clear()` pone todas las teclas a soltadas. Evita teclas "pegadas" cuando el `keyup` se pierde al cambiar de pestaña.

### Componente (`components/games/AsteroidsCanvas.tsx`)

```ts
interface AsteroidsCanvasProps {
  paused: boolean;
  ended: boolean; // true → engine.end()
  onStats: (stats: AsteroidsStats) => void;
  onPhase: (phase: AsteroidsPhase) => void;
}
```

Reglas:

- `"use client"`. Renderiza `<canvas className="player-canvas" aria-label="Juego ASTEROIDS">` en el lugar de `.game-arena`.
- Crea el motor en un `useEffect` con dependencias vacías y lo destruye en su limpieza. Debe funcionar con el doble montaje de StrictMode en desarrollo.
- Guarda `onStats` y `onPhase` en refs, para que un cambio de identidad de los callbacks no recree el motor.
- `paused` y `ended` se aplican con `useEffect` sobre la instancia.
- Reiniciar la partida es remontar el componente con otra `key`.

### Estado del player (`components/screens/GamePlayer.tsx`)

```ts
interface RunState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  saved: boolean;
  started: boolean; // nuevo: false mientras ASTEROIDS muestra "PULSA ESPACIO"; siempre true en los juegos simulados
  run: number; // nuevo: sube en cada "restart"; es la key de <AsteroidsCanvas>
}

type RunAction =
  | { type: "tick"; points: number }
  | { type: "togglePause" }
  | { type: "pause" } // nuevo: pausa sin alternar (pérdida de foco)
  | { type: "end" }
  | { type: "save" }
  | { type: "restart" }
  | { type: "start" } // nuevo: fase "ready" → "playing"
  | { type: "sync"; stats: AsteroidsStats }; // nuevo: copia los valores del motor
```

Reglas comunes:

- `isReal = game.id === "asteroids"`. Con `isReal === false`, el player se comporta exactamente como en el SPEC 01.
- El estado inicial es `{ score: 0, lives: 3, level: 1, paused: false, over: false, saved: false, started: !isReal, run: 0 }`.
- `restart` vuelve al estado inicial con `run + 1`.

Reglas de ASTEROIDS:

- El intervalo de simulación no se crea.
- `onPhase("playing")` despacha `start` si `started` es `false`. `onPhase("gameover")` despacha `end`.
- `onStats` despacha `sync`.
- `<AsteroidsCanvas key={run} paused={paused} ended={over} … />`.
- Mientras `started` es `false`: se ve el overlay de inicio y PAUSA y FIN están `disabled`.
- PAUSA/REANUDAR, la tecla `KeyP`, el `blur` de `window` y `visibilitychange` con `document.hidden` solo actúan si `started && !over`. Los dos últimos despachan `pause`; nunca reanudan.
- La tecla P se ignora si el foco está en un `input` o un `textarea`.
- FIN despacha `end`. El motor recibe `ended` y pasa a `gameover`.
- JUGAR DE NUEVO despacha `restart`: monta un motor nuevo en `ready` y el HUD vuelve a 0 / ♥ ♥ ♥ / 01.
- SALIR navega al detalle (`#/juego/asteroids`). Al desmontarse, el motor se destruye.

### Textos y CSS nuevos

| Elemento          | Texto                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------- |
| Overlay de inicio | Título "ASTEROIDS" y "PULSA ESPACIO PARA EMPEZAR" (parpadeando).                             |
| Tira de controles | `← →` ROTAR · `↑` PROPULSAR · `ESPACIO` DISPARAR · `P` PAUSA                                 |
| Aviso en táctiles | "REQUIERE TECLADO"                                                                           |
| Overlay de pausa  | Sin cambios: "EN PAUSA" y "PULSA REANUDAR PARA CONTINUAR", más " O P" al final en ASTEROIDS. |

Clases nuevas en `app/globals.css`, en el bloque `/* ===== player ===== */`:

- `.player-canvas`: `position: absolute; inset: 0; width: 100%; height: 100%; display: block;`.
- `.player-controls`: la tira de controles bajo `.crt`, con las teclas en `<kbd>`.
- `.kbd-required`: oculto por defecto y visible con `@media (hover: none) and (pointer: coarse)`.
- El parpadeo del overlay de inicio reutiliza `@keyframes blink` y se desactiva con `prefers-reduced-motion: reduce`.

La tira de controles y el aviso solo se muestran para ASTEROIDS.

## Plan de implementación

1. **Renombrado.** Aplicar el modelo de datos del catálogo en `lib/games.ts`, `lib/home.ts`, `app/globals.css` (`.cover-rocas` → `.cover-asteroids`) y el comentario de `Library.tsx`. Verificación: `grep -rn "rocas" app components lib` no devuelve nada; la Biblioteca muestra ASTEROIDS con su portada; el Home sigue mostrando la fila de VAULT_07 con ASTEROIDS; `#/jugar/asteroids` abre la simulación.
2. **Base del motor.** Crear `lib/asteroids/types.ts`, `config.ts` y `math.ts`. Verificación: `npm run lint` y `npm run build` pasan.
3. **Input.** Crear `lib/asteroids/input.ts` con `createInput`, `clear`, `destroy` y la regla de `preventDefault`. Verificación: `npm run build` pasa.
4. **Entidades.** Portar las 5 clases a `lib/asteroids/entities.ts` con `ctx` como parámetro de `draw`, los colores de `COLORS` y el glow. `Ship.update` recibe el input como parámetro. Verificación: `npm run build` pasa.
5. **Motor.** Crear `lib/asteroids/engine.ts` con las fases, `initGame`, `nextLevel`, `killShip`, colisiones, bucle, `dpr`, `setPaused`, `end`, `destroy` y los callbacks, según las reglas del modelo de datos. Verificación: `npm run build` pasa.
6. **Componente.** Crear `components/games/AsteroidsCanvas.tsx` y la clase `.player-canvas`. Verificación: `npm run build` pasa; ninguna pantalla lo usa todavía.
7. **Integración en el player.** En `GamePlayer.tsx`: ampliar `RunState` y `RunAction`, ramificar con `isReal`, montar `<AsteroidsCanvas>` en lugar de `.game-arena`, conectar `onStats`, `onPhase`, PAUSA, FIN y JUGAR DE NUEVO, y desactivar PAUSA y FIN antes de empezar. Verificación: en `#/jugar/asteroids`, Espacio empieza la partida, el HUD sube al destruir asteroides y perder las 3 vidas abre el modal; `#/jugar/caida` sigue simulando.
8. **Overlay de inicio, tecla P y foco.** Añadir el overlay "PULSA ESPACIO PARA EMPEZAR", la tecla P y la pausa al perder el foco, con sus escuchas limpiadas al desmontar. Verificación: P alterna la pausa; cambiar de pestaña y volver deja la partida en pausa.
9. **Controles y aviso.** Añadir `.player-controls` y `.kbd-required` con sus textos. Verificación: la tira se ve bajo el CRT; con un dispositivo táctil emulado en Playwright aparece "REQUIERE TECLADO".
10. **Pulido con `/frontend-design`.** Revisar el overlay de inicio, el de pausa, la tira de controles y el aviso a 1440 px y 375 px sin cambiar la estética del Vault: jerarquía, legibilidad sobre el canvas, foco visible en los botones del HUD y sin scroll horizontal.
11. **Verificación con Playwright.** Servir la app con `npm run build` + `next start -p 3001`; el `next dev` puede servir un `globals.css` antiguo. Recorrer los criterios de aceptación en `http://localhost:3001/#/jugar/asteroids` a 1440 px y a 375 px, con capturas del overlay de inicio, de una partida en curso, de la pausa y del modal. Corregir los fallos y repetir. Al terminar, añadir a este spec la sección "Resultado de la verificación" con lo comprobado, lo corregido y lo que quede pendiente con su motivo. Las capturas no se versionan.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `grep -rn "rocas" app components lib` no devuelve resultados.
- [ ] La Biblioteca muestra la tarjeta ASTEROIDS con la portada de la antigua ROCAS, en la misma posición.
- [ ] Buscar "as" en la Biblioteca muestra ASTEROIDS y no INVASORES.
- [ ] El Home muestra la fila de VAULT_07 en "ÚLTIMAS PUNTUACIONES" con el título ASTEROIDS.
- [ ] `/#/juego/rocas` y `/#/jugar/rocas` muestran el Home.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/asteroids`.
- [ ] Al abrir `/#/jugar/asteroids` se ve el overlay "PULSA ESPACIO PARA EMPEZAR", con asteroides moviéndose detrás y sin nave.
- [ ] Antes de empezar, PAUSA y FIN están deshabilitados.
- [ ] Tras pulsar Espacio, la nave aparece en el centro parpadeando y el overlay desaparece.
- [ ] Las flechas rotan y propulsan la nave, y Espacio dispara.
- [ ] Pulsar Espacio y las flechas durante la partida no cambia `window.scrollY`.
- [ ] Destruir un asteroide suma en el HUD 20, 50 o 100 puntos según su tamaño.
- [ ] Al chocar con un asteroide sin invencibilidad, el HUD pierde un ♥.
- [ ] Al vaciar el campo de asteroides, el nivel del HUD sube en 1.
- [ ] Recoger el power-up muestra "3x" con la cuenta atrás en el canvas, y cada disparo lanza 3 balas durante 5 s.
- [ ] La nave es cyan, los asteroides magenta y el power-up verde.
- [ ] El canvas no dibuja puntuación, nivel, vidas ni "GAME OVER".
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1600 y `canvas.height` es 1200.
- [ ] PAUSA congela el canvas, muestra "EN PAUSA" y cambia el botón a REANUDAR; REANUDAR continúa sin saltos.
- [ ] La tecla P alterna la pausa durante la partida.
- [ ] Tras hacer clic en REANUDAR, pulsar Espacio dispara y no vuelve a pausar.
- [ ] Disparar `blur` en `window` durante la partida la deja en pausa, y la nave no sigue rotando ni propulsando al reanudar.
- [ ] Perder la tercera vida abre el modal "FIN DEL JUEGO" con la misma puntuación que el HUD.
- [ ] FIN abre el modal con la puntuación actual, y la nave desaparece del canvas.
- [ ] En el modal se pueden escribir iniciales con espacios y con la letra P sin disparar ni pausar.
- [ ] GUARDAR PUNTUACIÓN muestra "▸ PUNTUACIÓN GUARDADA_" y no genera ninguna petición de red.
- [ ] JUGAR DE NUEVO cierra el modal, muestra el overlay de inicio y deja el HUD en 0, ♥ ♥ ♥ y 01.
- [ ] SALIR lleva a `#/juego/asteroids`, y allí Espacio vuelve a hacer scroll de la página.
- [ ] `/#/jugar/caida` sigue con la simulación del SPEC 01: arena falsa y puntuación que sube sola.
- [ ] La tira de controles se ve bajo el CRT solo en ASTEROIDS.
- [ ] Con un dispositivo táctil emulado se ve "REQUIERE TECLADO"; en escritorio no.
- [ ] A 375 px no hay scroll horizontal y el canvas ocupa todo el ancho del CRT con proporción 4:3.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** renombrar `rocas` a `asteroids`, con título ASTEROIDS. Decisión del usuario.
- **No:** reutilizar ROCAS tal cual ni añadir una novena entrada. El usuario quiere el nombre real del juego, y dos juegos de asteroides confundirían.
- **Sí:** reescribir las descripciones y renombrar la portada a `.cover-asteroids`. Decisión del usuario; la descripción larga hablaba de OVNIs que el juego no tiene.
- **No:** alias o redirección desde `rocas`. Decisión del usuario; nada externo enlaza a esas URLs, y un id desconocido ya cae al Home.
- **Sí:** el resto de juegos sigue con la simulación. Decisión del usuario; cada juego real llega con su spec.
- **Sí:** port a TypeScript como motor sin React en `lib/asteroids/`. Decisión del usuario; se puede crear y destruir al navegar y queda tipado.
- **No:** cargar `game.js` casi literal con `<Script>`. Sus escuchas globales nunca se limpian y fallaría al volver a entrar en la pantalla.
- **No:** reescribir el juego con estado de React. Provocaría un re-render por frame.
- **Sí:** carpeta `lib/asteroids/` y no `lib/games/asteroids/`. Ya existe `lib/games.ts`, y una carpeta `lib/games/` al lado haría ambiguo `@/lib/games`.
- **No:** abstracción genérica de motores. Con un solo juego real se diseñaría a ciegas; se decide con el segundo.
- **Sí:** paleta neón del Vault en el canvas. Decisión del usuario; encaja con el CRT y con el resto del sitio.
- **No:** vectores blancos del original.
- **Sí:** colores del canvas como constantes copiadas de los tokens de `:root`. El canvas no entiende `var(--cyan)`, y leerlos en cada frame con `getComputedStyle` cuesta.
- **Sí:** HUD de React alimentado por `onStats`. Decisión del usuario; una sola fuente de verdad con el estilo de la plataforma.
- **No:** HUD dentro del canvas, ni los dos HUD a la vez.
- **Sí:** el texto "3x 4.2s" del power-up sigue en el canvas. Es un estado efímero del juego y no tiene hueco en el HUD.
- **Sí:** `onStats` solo cuando cambian los valores. Evita 60 re-renders por segundo del player.
- **Sí:** modal "FIN DEL JUEGO" de la plataforma. Decisión del usuario.
- **No:** overlay "GAME OVER" del canvas con Espacio para reiniciar. Duplicaría el modal, y Espacio chocaría con escribir las iniciales.
- **Sí:** reiniciar remontando `<AsteroidsCanvas>` con `key={run}`. Garantiza un motor limpio sin un método `reset` que mantener.
- **Sí:** pantalla "PULSA ESPACIO PARA EMPEZAR". Decisión del usuario; nadie pierde una vida mientras lee los controles.
- **Sí:** `initGame()` al empezar, regenerando los asteroides. Los de fondo se han movido durante `ready` y podrían estar sobre el centro.
- **Sí:** PAUSA y FIN deshabilitados antes de empezar. No hay partida que pausar ni puntuación que mostrar.
- **Sí:** pausa con botones, tecla P y pérdida de foco. Decisión del usuario.
- **Sí:** la pérdida de foco solo pausa y nunca reanuda. Volver a la pestaña no debe lanzar la partida sin aviso.
- **Sí:** `clear()` del input al pausar. Al cambiar de pestaña se pierde el `keyup` y la nave seguiría girando.
- **Sí:** P y blur solo en ASTEROIDS. La simulación del resto de juegos queda exactamente como en el SPEC 01.
- **Sí:** solo teclado, con tira de controles y aviso "REQUIERE TECLADO" en táctiles. Decisión del usuario.
- **No:** controles táctiles. Merecen su propio spec: diseño, multitouch y pruebas en dispositivo.
- **Sí:** `preventDefault` de las teclas del juego solo durante la partida y fuera de inputs. Evita el scroll y la activación del botón con foco, sin romper el modal ni el resto de pantallas.
- **Sí:** canvas lógico de 800×600 escalado por `devicePixelRatio`, con un máximo de 2. Nítido en Retina sin cambiar la física; el máximo limita el coste de `shadowBlur`.
- **No:** canvas responsive con resolución lógica variable. Cambiaría la jugabilidad según el tamaño de pantalla.
- **Sí:** la jugabilidad es idéntica a `game.js`. El juego ya está probado; este spec solo lo adapta a la plataforma.
- **Sí:** GUARDAR PUNTUACIÓN sigue simulado. Decisión del usuario; la tabla `scores` va en su propio spec, junto con auth.
- **No:** récord personal en `localStorage` ni tabla en Supabase en este spec.
- **No:** adaptar el juego a `prefers-reduced-motion`. El movimiento es el juego; solo se desactiva el parpadeo del overlay de inicio.
- **Sí:** verificación con Playwright y sección "Resultado de la verificación". Decisión del usuario; sigue a los SPEC 02 y 03.
- **No:** Vitest y tests unitarios del motor. Hoy no hay test runner, y añadirlo es otro alcance.
- **Sí:** verificar contra `next start` y no contra `next dev`. El `next dev` ya sirvió un `globals.css` antiguo en el SPEC 02.

## Riesgos

| Riesgo                                                                                                                              | Mitigación                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| StrictMode monta, desmonta y vuelve a montar en desarrollo. Si `destroy` no limpia algo, quedan dos bucles o escuchas duplicadas.   | `destroy` cancela el rAF y quita todas las escuchas; los criterios de SALIR y de Espacio en el detalle lo comprueban.                                                   |
| Espacio activa el botón con foco (PAUSA/REANUDAR) además de disparar.                                                               | `preventDefault` en `keydown` y `keyup` de Espacio durante la partida. Si no basta en algún navegador, quitar el foco del botón tras el clic. Lo comprueba un criterio. |
| `shadowBlur` en muchos trazos baja el rendimiento en equipos lentos.                                                                | `dpr` máximo de 2. Si el frame pasa de 16 ms en Playwright, aplicar el glow solo a la nave y al power-up y anotarlo en la verificación.                                 |
| La fuente de `next/font` no ha cargado cuando el motor lee `--mono`.                                                                | El texto del canvas es mínimo ("3x") y tiene `monospace` de respaldo.                                                                                                   |
| El Home filtra en silencio las filas cuyo `gameId` no existe, así que la fila de VAULT_07 desaparecería si se olvida `lib/home.ts`. | Paso 1 y criterio específico del Home.                                                                                                                                  |
| El leaderboard falso del detalle usa `id.length` como semilla. Con `asteroids` cambian sus filas respecto a `rocas`.                | Aceptado: son datos simulados.                                                                                                                                          |
| Llegar a "FIN DEL JUEGO" sin input puede tardar en Playwright.                                                                      | Quedarse quieto sin disparar, con un tiempo máximo generoso. Si no ocurre, jugar a mano y anotarlo en la verificación.                                                  |
| En móvil el canvas se escala hacia abajo y los asteroides pequeños (radio 16) se ven diminutos.                                     | Aceptado: el juego requiere teclado y el aviso lo indica.                                                                                                               |

## Resultado de la verificación

Verificación con Playwright contra la app servida con `npm run build` + `next start -p 3001`, a 1440×900 (dpr 1) y a 375×812 (dpr 2), recargando la página al empezar cada recorrido.
Además de las capturas, se leyó el canvas con `getImageData` para clasificar los píxeles por color (cyan, magenta, verde, `--ink`). Así se comprobaron la nave, los asteroides, las balas, el power-up y el texto "3x".
Un bot dentro de la página, guiado por esos píxeles, apuntó, disparó y recogió el power-up. Un `MutationObserver` registró cada cambio del HUD.

### Comprobado

| Criterio                                                               | Resultado                                                                                                                                                                               |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `npm run build`, `grep -rn "rocas" app components lib` | Lint con salida 0, build sin errores, grep sin resultados.                                                                                                                              |
| Biblioteca, búsqueda "as", Home                                        | ASTEROIDS en la 6.ª posición con `.cover-asteroids`. "as" muestra solo ASTEROIDS. El Home muestra VAULT_07 con ASTEROIDS.                                                               |
| `/#/juego/rocas` y `/#/jugar/rocas`                                    | Las dos muestran el Home.                                                                                                                                                               |
| Overlay de inicio                                                      | "ASTEROIDS / PULSA ESPACIO PARA EMPEZAR". 0 píxeles cyan (sin nave) y el centroide magenta se mueve entre lecturas. PAUSA y FIN `disabled`.                                             |
| Espacio empieza                                                        | El overlay desaparece y la nave aparece en (400, 299). En 12 lecturas, 7 con nave y 5 sin ella: parpadeo de invencibilidad.                                                             |
| Controles                                                              | 0,4 s de ← giran −1,5 rad (3,5 rad/s × 0,4 s = 1,4). 0,5 s de ↑ desplazan la nave 59 px. Espacio crea píxeles de bala.                                                                  |
| Scroll                                                                 | Con `scrollY` = 120, pulsar Espacio y las flechas lo deja en 120.                                                                                                                       |
| Puntos, vidas y nivel                                                  | Deltas del HUD: 20 (×3), 50 (×8) y 100 (×16), sin otros valores. ♥ ♥ ♥ → ♥ ♥ al chocar. El nivel pasa a 02 a los 21 s de bot.                                                           |
| Power-up                                                               | Recogido por el bot. "3x" visible arriba a la izquierda durante 5,0 s. Un disparo con el power-up lanza 3 balas y sin él, 1.                                                            |
| Colores y canvas sin HUD                                               | Nave cyan, asteroides magenta y power-up verde en las capturas y en la lectura de píxeles. El canvas no tiene texto de puntuación, nivel, vidas ni "GAME OVER".                         |
| `devicePixelRatio` 2                                                   | `canvas.width` 1600 y `canvas.height` 1200.                                                                                                                                             |
| Pausa                                                                  | Dos `toDataURL` con 500 ms de diferencia son idénticos. Se ve "EN PAUSA … O P" y el botón dice REANUDAR.                                                                                |
| Tecla P y REANUDAR + Espacio                                           | P pausa y P reanuda. Tras hacer clic en REANUDAR, Espacio dispara y no vuelve a pausar.                                                                                                 |
| `blur`                                                                 | Con ← mantenida, `blur` pausa la partida. Al reanudar, la nave gira 0 rad en 0,5 s. `visibilitychange` con `document.hidden` también pausa, y al volver no reanuda.                     |
| Fin por vidas                                                          | Sin tocar nada, el modal se abre a los 43 s (375 px) y a los 80 s (1440 px) con la misma puntuación que el HUD.                                                                         |
| FIN                                                                    | El modal muestra la puntuación del HUD y quedan 0 píxeles cyan en 6 lecturas.                                                                                                           |
| Modal                                                                  | Se puede escribir "A P B" sin pausar ni cerrar el modal. GUARDAR muestra "▸ PUNTUACIÓN GUARDADA_" sin peticiones de red. JUGAR DE NUEVO vuelve al overlay de inicio con 0 / ♥ ♥ ♥ / 01. |
| SALIR                                                                  | Lleva a `#/juego/asteroids`, y allí Espacio hace scroll (`scrollY` de 0 a 163).                                                                                                         |
| `/#/jugar/caida`                                                       | Arena falsa, sin canvas ni tira de controles, y puntuación que sube sola.                                                                                                               |
| Tira de controles y aviso                                              | La tira está bajo el CRT solo en ASTEROIDS. "REQUIERE TECLADO" tiene `display: block` en el dispositivo táctil emulado y `none` en escritorio.                                          |
| 375 px                                                                 | Sin scroll horizontal. El canvas mide 280 px, como `.crt-screen`, con proporción 0,75.                                                                                                  |
| Consola                                                                | Sin errores al abrir, jugar y salir.                                                                                                                                                    |
| Rendimiento del glow                                                   | A 375 px con dpr 2, 120 frames con media de 16,7 ms y p95 de 17 ms. No hizo falta reducir el `shadowBlur`.                                                                              |

### Corregido

La verificación no encontró fallos en la app.
Hubo dos fallos en la propia prueba, no en la app:

- `page.goto` a una URL que solo cambia el hash no recarga la página. Se añadió una recarga al empezar cada recorrido.
- El halo semitransparente del cyan entraba en el rango del verde y el bot perseguía un power-up inexistente. Se separaron los colores por la relación entre G y B.

El pulido del paso 10 añadió el estilo de `.hud-actions .btn:disabled` y el tamaño de texto de los overlays con unidades `cqi`.

### Queda pendiente

| Asunto                                                                                                     | Motivo                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Tras FIN con balas en vuelo, las balas quedan quietas en el canvas durante `gameover`.                     | Es el comportamiento de `game.js`, que no actualiza las balas fuera de `playing` y sí las dibuja. La jugabilidad se porta sin cambios. |
| La consola muestra el aviso `willReadFrequently` de Canvas2D durante la prueba.                            | Lo provoca el `getImageData` de la prueba, no la app. Sin la prueba no aparece.                                                        |
| A 375 px, el pie del CRT ("SEÑAL OK · … · CARGA · 1MB") ocupa dos líneas apretadas.                        | Ya pasaba antes de este spec y afecta a todos los juegos. Queda para un spec futuro.                                                   |
| A 1440×900, el CRT en 4:3 es más alto que la ventana y la parte de abajo del canvas queda bajo el pliegue. | Corregirlo cambia la maquetación del player para todos los juegos. Queda para un spec futuro.                                          |
| `shadowBlur` no escala con `setTransform`, así que el glow se ve más fino con dpr 2.                       | El spec no pide compensarlo y la nitidez a dpr 2 es correcta.                                                                          |

Decisiones de implementación que el spec no detallaba:

- `createInput(target, isActive)` recibe una función con el estado del motor, y las pulsaciones solo se registran mientras se captura el teclado.
- FIN quita la pausa en ASTEROIDS, para que la nave desaparezca y "EN PAUSA" no quede bajo el modal.
- El paso de nivel solo se comprueba en `playing`, para que no suba con la partida terminada.

## Lo que **no** entra en este spec

- Tetris, Arkanoid y el resto de juegos reales.
- Abstracción genérica de motores.
- Controles táctiles y gamepad.
- Persistencia de puntuaciones, Salón de la Fama real y récord en `localStorage`.
- Sonido.
- Alias o redirección de `rocas`.
- Mecánicas nuevas y cambios de balance.
- Pantalla completa y menú de opciones.
- Adaptación de la jugabilidad a reduced motion.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
