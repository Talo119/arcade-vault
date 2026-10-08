# SPEC 07 — Registro de juegos reales

> **Estado:** Implemented
> **Depende de:** SPEC 05, SPEC 06
> **Fecha:** 2026-10-07
> **Objetivo:** Sustituir el cableado de ASTEROIDS en `GamePlayer.tsx` por un registro de motores con un contrato común, de modo que un juego real nuevo solo tenga que registrarse.

## Por qué existe este spec

`GamePlayer.tsx` decide si un juego es real con `isReal = game.id === "asteroids"`.
También monta `<AsteroidsCanvas>` a mano, escribe "ASTEROIDS" en el overlay de inicio y tiene la tira de controles de Asteroids fija en el JSX.
El SPEC 05 dejó la abstracción genérica para "cuando llegue el segundo juego real".
Ese momento llega ahora: la skill `/nuevo-juego` genera specs de juegos nuevos (Tetris, Arkanoid u originales) y todos necesitan el mismo punto de enganche.
Este spec crea ese contrato y migra ASTEROIDS a él, sin añadir ningún juego nuevo.

## Alcance

**Dentro:**

- Tipos genéricos del motor en `lib/engines/types.ts`.
- Utilidad `setupCanvas` en `lib/engines/canvas.ts` con la regla de `devicePixelRatio` del SPEC 05.
- Registro `lib/engines/registry.ts` con `ENGINES` y `getEngine(id)`.
- Definición `asteroidsEngine` en `lib/asteroids/definition.ts`.
- Los tipos de `lib/asteroids/types.ts` pasan a ser alias de los genéricos.
- `createAsteroidsGame` usa `setupCanvas`, sin cambiar su comportamiento.
- Componente genérico `components/games/GameCanvas.tsx`, que sustituye a `AsteroidsCanvas.tsx`.
- Canvas con la relación de aspecto del motor, centrado dentro del CRT 4:3 (letterbox).
- `GamePlayer.tsx` sin ninguna referencia a ASTEROIDS: juego real = `getEngine(id) !== undefined`.
- Overlay de inicio, pista de pausa, tira de controles, aviso "REQUIERE TECLADO", tecla P y pausa por pérdida de foco para todo juego registrado.
- HUD con `lives: null` para juegos sin vidas.
- Verificación con Playwright y sección "Resultado de la verificación".

**Fuera de alcance (para specs futuros):**

- Cualquier juego nuevo: Tetris, Arkanoid y los originales llegan con `/nuevo-juego`, cada uno en su spec.
- Carga diferida (`import()` / `next/dynamic`) de los motores. Con dos o tres motores el bundle del player no lo justifica.
- Estadísticas extra en el HUD (líneas, combo, tiempo). Si un juego las necesita, las dibuja en el canvas o se amplía el contrato en su spec.
- Infraestructura de sonido o de carga de assets común.
- Controles táctiles, ratón y gamepad.
- Leaderboard real en el detalle del juego, que sigue con `seededScores`.
- Cambios en el catálogo (`public.games`) o en `public.scores`.
- Cambios en la jugabilidad de ASTEROIDS.
- Tests unitarios y test runner.

## Modelo de datos

### Tipos genéricos (`lib/engines/types.ts`)

```ts
export type EnginePhase = "ready" | "playing" | "dead" | "gameover";

export interface EngineStats {
  score: number;
  level: number;
  lives: number | null; // null → juego sin vidas; el HUD muestra "—"
}

export interface EngineCallbacks {
  onStats: (stats: EngineStats) => void; // solo cuando cambia algún valor
  onPhase: (phase: EnginePhase) => void; // en cada cambio de fase
}

export interface GameEngine {
  setPaused: (paused: boolean) => void;
  end: () => void; // FIN: pasa a "gameover" si aún no lo está
  destroy: () => void; // cancela el rAF y quita las escuchas
}

export interface EngineControl {
  keys: string[]; // texto de cada <kbd>, p. ej. ["←", "→"]
  label: string; // p. ej. "ROTAR"
}

export interface EngineDefinition {
  id: string; // igual que games.id
  width: number; // resolución lógica del canvas
  height: number;
  initialStats: EngineStats; // lo que muestra el HUD antes del primer onStats
  startPrompt: string; // p. ej. "PULSA ESPACIO PARA EMPEZAR"
  controls: EngineControl[]; // sin la P: el player la añade siempre
  create: (canvas: HTMLCanvasElement, callbacks: EngineCallbacks) => GameEngine;
}
```

Reglas de las fases:

- Un motor puede usar solo una parte de `EnginePhase`. El player solo reacciona a `"playing"` (despacha `start`) y a `"gameover"` (despacha `end`).
- Todo motor arranca en `"ready"` y empieza su bucle al crearse, como ASTEROIDS.
- En `"gameover"`, Espacio no reinicia. Se reinicia desde el modal remontando `<GameCanvas>` con otra `key`.

### Canvas (`lib/engines/canvas.ts`)

```ts
export function setupCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): { ctx: CanvasRenderingContext2D; dpr: number; fontFamily: string };
```

Reglas:

- `dpr = Math.min(devicePixelRatio || 1, 2)`. El buffer mide `width·dpr × height·dpr` y se aplica `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
- `fontFamily` se lee una vez de `--mono` con `getComputedStyle`, con `monospace` como respaldo.
- Lanza `Error("Canvas 2D no disponible")` si `getContext("2d")` devuelve `null`.
- Es el mismo código que hoy está al principio de `createAsteroidsGame`, extraído sin cambios.

### Registro (`lib/engines/registry.ts`)

```ts
export const ENGINES: Record<string, EngineDefinition>; // { asteroids: asteroidsEngine }
export function getEngine(id: string): EngineDefinition | undefined;
```

Reglas:

- La clave de `ENGINES` es igual a `definition.id`, y las dos son igual a `games.id`.
- Un id del catálogo sin entrada en `ENGINES` sigue con la simulación del SPEC 01.
- Una entrada sin fila en `games` no se ve nunca, porque `parseHash` solo deja pasar ids del catálogo.
- Carpeta `lib/engines/` y no `lib/games/`, por la ambigüedad con `lib/games.ts` que ya anotó el SPEC 05.

### ASTEROIDS (`lib/asteroids/`)

```ts
// lib/asteroids/definition.ts
export const asteroidsEngine: EngineDefinition = {
  id: "asteroids",
  width: W, // 800
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "→"], label: "ROTAR" },
    { keys: ["↑"], label: "PROPULSAR" },
    { keys: ["ESPACIO"], label: "DISPARAR" },
  ],
  create: createAsteroidsGame,
};
```

```ts
// lib/asteroids/types.ts
export type AsteroidsPhase = EnginePhase;
export type AsteroidsStats = EngineStats;
export type AsteroidsCallbacks = EngineCallbacks;
export type AsteroidsGame = GameEngine;
```

Reglas:

- `createAsteroidsGame` cambia solo su arranque: llama a `setupCanvas(canvas, W, H)` en lugar de las líneas propias de `dpr` y fuente.
- `lives` del motor sigue siendo un `number`. Es compatible con `number | null`.
- La jugabilidad, los colores, el input y las fases no cambian.

### Componente (`components/games/GameCanvas.tsx`)

```ts
interface GameCanvasProps {
  engine: EngineDefinition;
  title: string; // game.title del catálogo, para el aria-label
  paused: boolean;
  ended: boolean; // true → engine.end()
  onStats: (stats: EngineStats) => void;
  onPhase: (phase: EnginePhase) => void;
}
```

Reglas:

- `"use client"`. Renderiza `<canvas className="player-canvas" aria-label={"Juego " + title}>`.
- Mismo patrón que `AsteroidsCanvas.tsx`: el motor se crea en un `useEffect` con dependencias vacías, los callbacks van en refs, y `paused` y `ended` se aplican con `useEffect`. Debe aguantar el doble montaje de StrictMode.
- El canvas lleva `style={{ aspectRatio: `${engine.width} / ${engine.height}` }}`.
- `.player-canvas` deja de ocupar todo el CRT a la fuerza. Queda centrado con `inset: 0; margin: auto; max-width: 100%; max-height: 100%`, y la sobra queda en negro (letterbox).
- Con 800×600 en el CRT 4:3, el canvas sigue ocupando todo el `.crt-screen`, como hoy.
- `AsteroidsCanvas.tsx` se borra.

### Player (`components/screens/GamePlayer.tsx`)

```ts
const engine = getEngine(id); // EngineDefinition | undefined
const isReal = engine !== undefined;

interface RunState {
  score: number;
  lives: number | null; // antes: number
  level: number;
  // paused, over, save, started y run: sin cambios
}
```

Reglas:

- `initialState(engine, run)` usa `engine.initialStats` si hay motor y `{ score: 0, level: 1, lives: 3 }` si no.
- `restart` vuelve a ese estado inicial con `run + 1`.
- El HUD de vidas muestra `"—"` si `lives` es `null` o `0`, y `♥` repetido en otro caso.
- `<GameCanvas key={run} engine={engine} title={game.title} … />` en lugar de `<AsteroidsCanvas>`.
- El título del overlay de inicio es `game.title` y el texto es `engine.startPrompt`.
- La pista de pausa añade " O P" para todo juego real.
- La tira de controles se genera desde `engine.controls`, más un último `{ keys: ["P"], label: "PAUSA" }` que añade el player.
- La tecla P, `blur` y `visibilitychange` actúan en todo juego real, con las mismas reglas del SPEC 05.
- "REQUIERE TECLADO" se muestra en todo juego real.
- Los juegos simulados se comportan exactamente como hoy.
- El archivo no contiene la cadena `asteroids` ni `Asteroids`.

## Plan de implementación

1. **Tipos y canvas.** Crear `lib/engines/types.ts` y `lib/engines/canvas.ts`. Verificación: `npm run lint` y `npm run build` pasan; nadie los usa todavía.
2. **ASTEROIDS al contrato.** Convertir `lib/asteroids/types.ts` en alias y hacer que `createAsteroidsGame` use `setupCanvas`. Verificación: `npm run build` pasa y `#/jugar/asteroids` se juega igual en `npm run dev`.
3. **Definición y registro.** Crear `lib/asteroids/definition.ts` con `asteroidsEngine` y `lib/engines/registry.ts` con `ENGINES` y `getEngine`. Verificación: `npm run build` pasa.
4. **Componente genérico.** Crear `components/games/GameCanvas.tsx` y ajustar `.player-canvas` en `app/globals.css` para el letterbox. Verificación: `npm run build` pasa; nadie lo usa todavía.
5. **Player al registro.** En `GamePlayer.tsx`: `getEngine`, `initialState` desde `initialStats`, `lives: number | null`, `<GameCanvas>`, overlay de inicio, pista de pausa, tira de controles y escuchas de P y foco para todo juego real. Borrar `AsteroidsCanvas.tsx`. Verificación: `grep -n "steroids" components/screens/GamePlayer.tsx` no devuelve nada; ASTEROIDS se juega igual y `#/jugar/caida` sigue simulando.
6. **Letterbox con un motor de prueba local.** Registrar temporalmente, sin commitearlo, un motor mínimo de 300×600 con el id de un juego simulado. Comprobar que se ve centrado con bandas negras a 1440 px y 375 px y que su HUD con `lives: null` muestra "—". Quitarlo después. Verificación: `git status` no muestra el motor de prueba.
7. **Verificación con Playwright.** Servir con `npm run build` + `next start -p 3001`, porque `next dev` puede servir un `globals.css` antiguo. Repetir sobre `#/jugar/asteroids` los criterios del SPEC 05 que tocan el player, a 1440 px y 375 px. Guardar una puntuación y comprobarla en el Salón. Borrar después las filas de prueba de `public.scores`. Añadir a este spec la sección "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] Existen `lib/engines/types.ts`, `lib/engines/canvas.ts`, `lib/engines/registry.ts` y `lib/asteroids/definition.ts`.
- [ ] `components/games/AsteroidsCanvas.tsx` no existe.
- [ ] `grep -n "steroids" components/screens/GamePlayer.tsx` no devuelve resultados.
- [ ] `ENGINES` tiene una sola entrada, `asteroids`.
- [ ] Al abrir `/#/jugar/asteroids` se ve el overlay "ASTEROIDS / PULSA ESPACIO PARA EMPEZAR" con asteroides moviéndose detrás.
- [ ] Antes de empezar, PAUSA y FIN están deshabilitados, y el HUD muestra 0 / ♥ ♥ ♥ / 01.
- [ ] Espacio empieza la partida, las flechas mueven la nave y el HUD suma 20, 50 o 100 puntos al destruir asteroides.
- [ ] Pulsar Espacio y las flechas durante la partida no cambia `window.scrollY`.
- [ ] PAUSA, REANUDAR, la tecla P, `blur` y `visibilitychange` se comportan como en la verificación del SPEC 05.
- [ ] La pista de pausa dice "PULSA REANUDAR PARA CONTINUAR O P".
- [ ] La tira de controles muestra `← →` ROTAR · `↑` PROPULSAR · `ESPACIO` DISPARAR · `P` PAUSA.
- [ ] Perder la tercera vida o pulsar FIN abre el modal con la puntuación del HUD.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con 0 / ♥ ♥ ♥ / 01.
- [ ] Guardar una partida de ASTEROIDS crea una fila con `game_id = 'asteroids'` y se ve en la pestaña ASTEROIDS del Salón.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es 1600 y `canvas.height` es 1200.
- [ ] A 375 px el canvas de ASTEROIDS mide lo mismo que `.crt-screen`, con proporción 4:3 y sin scroll horizontal.
- [ ] Con el motor de prueba de 300×600 del paso 6, el canvas mide `alto × 0,5` de ancho, queda centrado y el HUD muestra "—" en vidas.
- [ ] `/#/jugar/caida` sigue con la simulación: arena falsa, puntuación que sube sola, sin tira de controles ni aviso de teclado.
- [ ] SALIR desde ASTEROIDS lleva a `#/juego/asteroids`, y allí Espacio vuelve a hacer scroll.
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/asteroids`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Resultado de la verificación

Verificación con Playwright contra la app servida con `npm run build` + `next start -p 3001`, a 1440×900 y a 375×812, con dpr 1 y 2.
Se comprobó que `next start` servía el CSS nuevo leyendo la regla `.player-canvas` de `document.styleSheets`.
Un `MutationObserver` registró cada cambio de la puntuación del HUD. Las teclas se enviaron como pulsaciones reales de Playwright donde importaba el foco o el scroll.
El letterbox del paso 6 se midió en `next dev` con el motor de prueba registrado como `caida`, y el motor se quitó después.

### Comprobado

| Criterio                                               | Resultado                                                                                                                                                                                 |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`, `npm run build`                        | Lint con salida 0 y build sin errores.                                                                                                                                                    |
| Archivos                                               | Existen `lib/engines/types.ts`, `canvas.ts`, `registry.ts` y `lib/asteroids/definition.ts`. `components/games/AsteroidsCanvas.tsx` no existe.                                             |
| `grep -n "steroids" components/screens/GamePlayer.tsx` | Sin resultados.                                                                                                                                                                           |
| `ENGINES`                                              | Una sola entrada, `asteroids`.                                                                                                                                                            |
| Overlay de inicio                                      | "ASTEROIDS / PULSA ESPACIO PARA EMPEZAR". Dos `toDataURL` con 400 ms de diferencia son distintos: los asteroides se mueven detrás.                                                        |
| Antes de empezar                                       | PAUSA y FIN `disabled`. HUD 0 / ♥ ♥ ♥ / 01.                                                                                                                                               |
| Partida                                                | Espacio quita el overlay y habilita PAUSA y FIN. Con ← mantenida y Espacio, los incrementos de la puntuación son solo 20, 50 y 100.                                                       |
| Scroll                                                 | Con `scrollY` = 120, pulsar de verdad Espacio, ↑, ← y → lo deja en 120.                                                                                                                   |
| Pausa                                                  | PAUSA congela el canvas (dos `toDataURL` con 500 ms iguales) y el botón pasa a REANUDAR. REANUDAR continúa. Tras un clic real en REANUDAR, Espacio no vuelve a pausar.                    |
| Tecla P, `blur`, `visibilitychange`                    | P pausa y P reanuda. `blur` pausa. `visibilitychange` con `document.hidden` pausa, y al volver no reanuda.                                                                                |
| Pista de pausa                                         | "PULSA REANUDAR PARA CONTINUAR O P".                                                                                                                                                      |
| Tira de controles                                      | `← →` ROTAR · `↑` PROPULSAR · `ESPACIO` DISPARAR · `P` PAUSA. El HTML generado es idéntico al que estaba escrito a mano.                                                                  |
| Fin por vidas y FIN                                    | Sin tocar nada, la tercera vida se pierde y el modal muestra 0, igual que el HUD. FIN muestra 1380 con el HUD en 1380, y el canvas queda con 0 píxeles cyan (sin nave).                   |
| Modal                                                  | Se puede escribir "A P B" sin pausar ni cerrar el modal. JUGAR DE NUEVO vuelve al overlay de inicio con 0 / ♥ ♥ ♥ / 01.                                                                   |
| Guardar en Supabase                                    | GUARDAR hace `POST /rest/v1/rpc/submit_score` y muestra "▸ PUNTUACIÓN GUARDADA_". Se crea la fila `game_id = 'asteroids'`, "SPEC07 QA", 580, y sale en la pestaña ASTEROIDS del Salón.    |
| `devicePixelRatio` 2                                   | `canvas.width` 1600 y `canvas.height` 1200, a 1440 px y a 375 px.                                                                                                                         |
| ASTEROIDS a 1440 px                                    | Canvas 1004×753, igual que `.crt-screen`, en (0, 0).                                                                                                                                      |
| ASTEROIDS a 375 px                                     | Canvas 295×221,25, igual que `.crt-screen`, proporción 1,3333 y sin scroll horizontal.                                                                                                    |
| Motor de prueba 300×600 (paso 6)                       | A 1440 px, canvas 376,5×753 en un CRT de 1004×753, con bandas de 313,75 px a cada lado. A 375 px, 110,625×221,25 con bandas de 92,19 px. Ancho/alto 0,5 en los dos. HUD con "—" en vidas. |
| "REQUIERE TECLADO"                                     | `display: block` con táctil emulado y `none` en escritorio.                                                                                                                               |
| `/#/jugar/caida`                                       | Arena falsa, sin canvas, sin tira de controles ni aviso de teclado, y puntuación que sube sola (129 → 276). La P no pausa.                                                                |
| SALIR                                                  | Lleva a `#/juego/asteroids`, y allí Espacio hace scroll (`scrollY` de 0 a 162,5).                                                                                                         |
| Consola                                                | Sin errores ni avisos al abrir, jugar y salir de `/#/jugar/asteroids`, en escritorio y en el móvil emulado.                                                                               |
| `public.scores`                                        | La fila de prueba (id 19) se borró. Solo queda la fila 18 ("CM"), que es anterior a esta verificación.                                                                                    |

### Corregido

La verificación no encontró fallos en la app.
Durante la implementación surgieron dos huecos del spec, resueltos con el usuario:

- **Paso 2:** al convertir `AsteroidsStats` en alias de `EngineStats`, `lives` pasa a `number | null` y `GamePlayer.tsx` dejaba de compilar. Se adelantaron al paso 2 las dos líneas de tipos del paso 5: `RunState.lives: number | null` y el HUD con `lives ? "♥ ".repeat(lives).trim() : "—"`.
- **Paso 4:** en Chrome, un `<canvas>` absoluto con `inset: 0` se estira a todo el contenedor e ignora `aspect-ratio`, así que las reglas del spec no hacían letterbox. Se añadieron `width: auto; height: 100%` a `.player-canvas`.

Hubo un fallo en la propia prueba, no en la app: en `next dev`, la recarga en caliente del registro reutilizó el estado de una partida simulada de CAÍDA. Con la página recargada, el HUD del motor de prueba arrancó en 0 / — / 01.

### Queda pendiente

| Asunto                                                                                                                  | Motivo                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| El letterbox no cubre motores más anchos que 4:3: con `height: 100%`, `max-width` recorta el ancho y deforma el canvas. | Decisión del paso 4. Ningún motor registrado ni previsto es más ancho que 4:3. Si llega uno, su spec puede pasar a container queries (`cqw`/`cqh`). |
| La flecha ↓ hace scroll durante la partida de ASTEROIDS.                                                                | ↓ no es una tecla del juego y `lib/asteroids/input.ts` no la captura desde el SPEC 05. Este spec no cambia el input.                                |
| La deriva de rotación tras `blur` con una tecla mantenida no se volvió a medir.                                         | El input y el motor de ASTEROIDS no cambian en este spec, y el SPEC 05 ya la midió.                                                                 |

Decisiones de implementación que el spec no detallaba:

- `getEngine` usa `Object.hasOwn`, para que un id como `constructor` no devuelva un miembro de `Object.prototype`.
- `GameCanvas` guarda `engine` en una ref, como los callbacks, para que el efecto que crea el motor tenga dependencias vacías.

## Decisiones

- **Sí:** spec propio para el registro antes de cualquier juego nuevo. Decisión del usuario; cada spec de juego queda pequeño y la skill `/nuevo-juego` puede dar el contrato por supuesto.
- **No:** que el primer spec de juego nuevo incluya el refactor. Mezclaría un juego nuevo con una regresión posible de ASTEROIDS.
- **No:** seguir con un `if (id === …)` por juego en el player. Cada juego tocaría el JSX del player.
- **Sí:** registro estático en un `Record`. Con pocos motores es lo más simple y tipado.
- **No:** carga diferida de los motores en este spec. Se decide cuando el bundle del player lo pida.
- **Sí:** `EngineDefinition` con `width`/`height`. La relación de aspecto es del juego: Tetris es vertical y Asteroids 4:3.
- **Sí:** letterbox dentro del CRT 4:3. El marco del player no cambia para ningún juego.
- **No:** cambiar la forma del CRT según el juego. Afectaría a la maquetación y a los juegos simulados.
- **Sí:** `lives: number | null` con "—" en el HUD. Tetris no tiene vidas, y el HUD ya mostraba "—" con 0 vidas.
- **No:** ocultar el bloque de vidas. Cambiaría el ancho del HUD entre juegos; se puede revisar en el pulido de un juego sin vidas.
- **No:** estadísticas extra en el HUD. Ningún juego registrado las necesita todavía.
- **Sí:** el título del overlay sale de `game.title` del catálogo. El catálogo es la única fuente de los textos del juego.
- **No:** `title` dentro de `EngineDefinition`. Serían dos copias del título.
- **Sí:** la P de pausa la añade el player a la tira de controles. Es una tecla de la plataforma, no del juego.
- **Sí:** `setupCanvas` común. Todo motor nuevo necesita la misma regla de `dpr`, y así no se copia.
- **No:** una clase base o un bucle de juego común. Cada motor portado ya trae su bucle, y forzarlos a uno cambiaría su jugabilidad.
- **Sí:** probar el letterbox con un motor temporal sin commitear. No hay todavía un juego vertical real con el que probarlo.
- **Sí:** verificar contra `next start` y no contra `next dev`. El `next dev` ya sirvió un `globals.css` antiguo en el SPEC 02.

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                                                          |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| El refactor cambia sin querer el comportamiento de ASTEROIDS.                        | Los criterios repiten los del SPEC 05 que tocan el player, verificados con Playwright.                                              |
| El nuevo CSS de `.player-canvas` deja el canvas de ASTEROIDS más pequeño que el CRT. | Criterio de tamaño a 375 px. El canvas tiene buffer de proporción 4:3, así que `max-width`/`max-height` lo dejan a tamaño completo. |
| `lives: number \| null` rompe los tipos de `RunState` o de `sync`.                   | `npm run build` en cada paso.                                                                                                       |
| Las escuchas de P y foco, ahora genéricas, se activan en los juegos simulados.       | Siguen condicionadas a `isReal`. Un criterio comprueba que CAÍDA sigue igual.                                                       |
| El motor de prueba del paso 6 se cuela en un commit.                                 | Criterio con `git status` y `ENGINES` con una sola entrada.                                                                         |

## Lo que **no** entra en este spec

- Juegos nuevos.
- Carga diferida de motores.
- Estadísticas extra en el HUD.
- Sonido y assets comunes.
- Controles táctiles, ratón y gamepad.
- Leaderboard real en el detalle.
- Cambios en `public.games` o `public.scores`.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
