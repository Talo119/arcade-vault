# SPEC 14 — Controles táctiles

> **Estado:** Approved1
> **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09, SPEC 10, SPEC 11
> **Fecha:** 2026-10-19
> **Objetivo:** Que ASTEROIDS, TETRIS, ARKANOID y SNAKE se puedan jugar en una pantalla táctil con botones virtuales que despachan las mismas teclas que el teclado.

## Por qué existe este spec

Los cuatro motores reales solo leen teclado: cada `lib/<id>/input.ts` escucha `keydown` y `keyup` en `window` y decide por `e.code`.
En un móvil el player solo muestra el aviso "REQUIERE TECLADO" (SPEC 05 y SPEC 07), así que ningún juego real se puede jugar.
Este spec añade una capa de botones virtuales en el player que despacha `KeyboardEvent` sintéticos con el mismo `code`.
Los motores y sus `input.ts` no cambian: para ellos, un toque es una tecla.
Cada juego declara sus botones en su `EngineDefinition`, de modo que el player sigue siendo genérico y los juegos nuevos traen su mando de serie.

## Alcance

**Dentro:**

- `lib/engines/types.ts`: tipos `TouchButton`, `TouchZone` y `TouchLayout`, y campo **obligatorio** `touch: TouchLayout` en `EngineDefinition`.
- `lib/engines/touch.ts` (nuevo, sin React): media query táctil, prompt táctil, tiempos de autorrepetición y despacho de teclas sintéticas.
- `components/games/TouchControls.tsx` (nuevo): hook `useTouchDevice()` y componente de una zona de botones con multitáctil, autorrepetición y liberación segura.
- `touch` en los cuatro `definition.ts` (`asteroids`, `tetris`, `arkanoid`, `snake`), con la disposición de la tabla "Botones por juego".
- `components/screens/GamePlayer.tsx`: contenedor `.player-stage` con las zonas, tocar el CRT en `ready` equivale a Espacio, prompt "TOCA PARA EMPEZAR" y pista de pausa sin "O P" en táctil; desaparece "REQUIERE TECLADO".
- `app/globals.css`: estilos de `.player-stage`, `.touch-zone` y `.touch-btn`, con zonas bajo el CRT en vertical y a los lados en horizontal; se borra `.kbd-required`.
- Contrato de juegos nuevos: `touch` pasa a ser obligatorio en `.claude/skills/nuevo-juego/` y en `.claude/agents/game-jam.md`, y se menciona en `CLAUDE.md`.
- Pulido visual con `/frontend-design` y verificación con Playwright, con la sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Gestos sobre el canvas (deslizar, arrastrar la paleta, tocar para disparar durante la partida).
- Vibración háptica (`navigator.vibrate`).
- Pantalla completa (Fullscreen API), bloqueo de orientación o aviso "GIRA EL DISPOSITIVO".
- Interruptor manual para forzar los botones en escritorio o en portátiles táctiles con ratón.
- Ocultar la tira `<kbd>` de controles en táctil: se mantiene como hoy.
- Ratón y gamepad.
- Controles táctiles para los juegos simulados: no tienen input.
- Cambios en los motores (`lib/<id>/engine.ts`, `lib/<id>/input.ts`), en `GameCanvas.tsx` o en el registro.
- Añadir `touch` a los drafts de `specs/game-jam/`: se hace al moverlos a `specs/NN-juego-<id>.md`.
- Tamaño, opacidad o posición de los botones configurables por el jugador.

## Modelo de datos

### Tipos (`lib/engines/types.ts`)

```ts
export interface TouchButton {
  code: string; // KeyboardEvent.code que despacha: "ArrowLeft", "Space"…
  label: string; // texto visible: "←", "FUEGO"
  aria: string; // nombre accesible: "Girar a la izquierda"
  repeat?: boolean; // true: mantenerlo re-despacha keydown con repeat: true
}

export interface TouchZone {
  pad: "row" | "cross"; // "cross": exactamente 4 botones en orden ↑ ← → ↓
  buttons: TouchButton[]; // puede estar vacía: la zona ocupa su sitio sin botones
}

export interface TouchLayout {
  left: TouchZone; // pulgar izquierdo
  right: TouchZone; // pulgar derecho
}

export interface EngineDefinition {
  // …campos actuales sin cambios…
  touch: TouchLayout; // botones virtuales en dispositivos táctiles; obligatorio
}
```

- `touch` es obligatorio desde ya: los cuatro motores lo declaran en este spec, y un juego nuevo sin él no compila.
- `EngineControl` (la tira `<kbd>`) no cambia: los botones táctiles son otra estructura porque necesitan el `code` real y no solo el texto.

### Constantes y helpers (`lib/engines/touch.ts`)

```ts
export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)"; // la misma que mostraba REQUIERE TECLADO
export const TOUCH_START_PROMPT = "TOCA PARA EMPEZAR";
export const TOUCH_REPEAT_DELAY_MS = 170; // primera repetición
export const TOUCH_REPEAT_INTERVAL_MS = 50; // repeticiones siguientes

// window.dispatchEvent(new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }))
export function dispatchKey(
  type: "keydown" | "keyup",
  code: string,
  repeat = false,
): void;

// keydown + keyup de Espacio en el mismo tick: el toque sobre el CRT en "ready"
export function tapKey(code: string): void;
```

- Los eventos se despachan en `window`, que es donde escuchan los cuatro `input.ts`.
- Si el motor no está capturando (pausa, `gameover`, foco en un input), su `input.ts` ignora el `keydown` sintético igual que uno real.
- `keyup` siempre se despacha al soltar, como el teclado, para no dejar teclas pegadas.

### Botones por juego

| Juego     | Zona izquierda                                                               | Zona derecha                           |
| --------- | ---------------------------------------------------------------------------- | -------------------------------------- |
| ASTEROIDS | `row`: ← `ArrowLeft` · → `ArrowRight`                                        | `row`: ↑ `ArrowUp` · FUEGO `Space`     |
| TETRIS    | `row`: ← `ArrowLeft` · ↓ `ArrowDown` · → `ArrowRight`, los tres con `repeat` | `row`: ROTAR `ArrowUp` · CAÍDA `Space` |
| ARKANOID  | `row`: ← `ArrowLeft`                                                         | `row`: → `ArrowRight`                  |
| SNAKE     | `cross`: ↑ `ArrowUp` · ← `ArrowLeft` · → `ArrowRight` · ↓ `ArrowDown`        | `row`: vacía                           |

Nombres accesibles (`aria`):

| Juego     | Botón → `aria`                                                                                |
| --------- | --------------------------------------------------------------------------------------------- |
| ASTEROIDS | ← "Girar a la izquierda" · → "Girar a la derecha" · ↑ "Propulsar" · FUEGO "Disparar"          |
| TETRIS    | ← "Mover a la izquierda" · ↓ "Bajar" · → "Mover a la derecha" · ROTAR "Rotar" · CAÍDA "Caída" |
| ARKANOID  | ← "Mover a la izquierda" · → "Mover a la derecha"                                             |
| SNAKE     | ↑ "Arriba" · ← "Izquierda" · → "Derecha" · ↓ "Abajo"                                          |

- Solo los botones de mover y bajar de TETRIS llevan `repeat`: TETRIS encola cada `keydown`, también los repetidos (SPEC 08), y es el único que depende de la autorrepetición del sistema.
- ASTEROIDS y ARKANOID leen `isDown`: basta con mantener el `keydown` hasta soltar.
- SNAKE ignora `e.repeat` y cada giro es una pulsación: sin `repeat`.
- Las direcciones usan flechas; las acciones, palabras. Press Start 2P no tiene glifos como ↻ o ⤓.

### Comportamiento de un botón (`TouchControls.tsx`)

- `pointerdown` → `setPointerCapture` (en `try/catch`), `dispatchKey("keydown", code)` y `data-pressed="true"`. Si el botón ya está pulsado por otro dedo, el segundo se ignora.
- Con `repeat`, tras `TOUCH_REPEAT_DELAY_MS` se despacha `keydown` con `repeat: true` cada `TOUCH_REPEAT_INTERVAL_MS` mientras siga pulsado.
- `pointerup`, `pointercancel` y `lostpointercapture` → para la repetición, `dispatchKey("keyup", code)` y quita `data-pressed`.
- Cada botón gestiona su propio puntero: varios botones a la vez funcionan (girar, propulsar y disparar en ASTEROIDS).
- Con la prop `disabled` en `true` (pausa o `gameover`), se sueltan todos los botones pulsados (un `keyup` por cada uno) y se ignoran los toques nuevos.
- Al desmontar, se sueltan todos los botones pulsados y se limpian los temporizadores.
- `pointerdown` hace `preventDefault`: el botón no roba el foco ni provoca zoom por doble toque. `contextmenu` también se cancela.
- Son `<button type="button" aria-label={aria}>`, de al menos 56×56 px.

### Player (`GamePlayer.tsx`)

- `useTouchDevice()` lee `TOUCH_QUERY` con `useSyncExternalStore` sobre `matchMedia`; en servidor devuelve `false`.
- Estructura de la zona de juego: `.player-stage` contiene la zona izquierda, el `.crt` y la zona derecha. Las zonas solo se renderizan si `isReal && touch`.
- En táctil, mientras el overlay de inicio está visible (`isReal && !started && !over`), un `pointerdown` en `.crt-screen` llama a `tapKey("Space")`. Fuera de ese estado, tocar el CRT no despacha nada.
- En táctil el overlay de inicio muestra `TOUCH_START_PROMPT` en lugar de `engine.startPrompt`.
- En táctil la pista de pausa es "PULSA REANUDAR PARA CONTINUAR", sin " O P".
- Las zonas reciben `disabled={paused || over}`.
- Se borra `<div className="kbd-required">` y su CSS. La tira `.player-controls` se queda igual.
- Orden bajo el HUD: `.player-stage`, selector de skins, tira de controles.

### Disposición (`app/globals.css`)

- **Vertical** (o sin táctil): `.player-stage` es una rejilla con el CRT arriba a todo el ancho y debajo la zona izquierda pegada a la izquierda y la derecha pegada a la derecha.
- **Horizontal táctil** (`TOUCH_QUERY` + `(orientation: landscape)`): una fila zona izquierda · CRT · zona derecha. El CRT se limita para que `.player-stage` no pase de `100dvh`.
- Sin táctil, `.player-stage` no añade ningún espacio: el player de escritorio se ve como en `main`.
- `.touch-btn`: `touch-action: none`, `user-select: none`, `-webkit-user-select: none`, `-webkit-touch-callout: none`, `-webkit-tap-highlight-color: transparent`.
- El aspecto (borde, fondo, glow al pulsar, tipografía) lo fija el paso de pulido con `/frontend-design`, con la estética de `.player-controls kbd` y `.skin-btn` como punto de partida.

## Plan de implementación

1. **Tipos y helpers.** Añadir `TouchButton`, `TouchZone`, `TouchLayout` y `touch: TouchLayout` a `lib/engines/types.ts`; crear `lib/engines/touch.ts`. Declarar `touch` en los cuatro `definition.ts` según "Botones por juego". Verificación: `npm run build` pasa; nada cambia en pantalla.
2. **Componente de zona.** Crear `components/games/TouchControls.tsx` con `useTouchDevice()` y el componente de zona (`pad` `row` y `cross`, multitáctil, `repeat`, `disabled`, liberación al desmontar). Verificación: `npm run build` pasa.
3. **Player en táctil.** En `GamePlayer.tsx`, añadir `.player-stage` con las zonas, el toque en el CRT en `ready`, el prompt y la pista de pausa táctiles, y borrar `.kbd-required`. CSS mínimo de `.player-stage`, `.touch-zone` y `.touch-btn` en vertical. Verificación: en Playwright con táctil emulado a 390×844, `#/jugar/asteroids` muestra las dos zonas bajo el CRT y tocar el CRT empieza la partida.
4. **Horizontal.** Media query de horizontal táctil con las zonas a los lados y el CRT limitado a `100dvh`. Verificación: a 844×390 las tres piezas caben en una fila sin scroll horizontal.
5. **Pulido con `/frontend-design`.** Aspecto de `.touch-btn` (reposo y `data-pressed`) y de la cruceta, a 390×844, 844×390 y 768×1024, con los cuatro juegos. Verificación: capturas en las tres medidas.
6. **Contrato de juegos nuevos.** En `.claude/skills/nuevo-juego/engine-contract.md`: `touch` en la fila "Definición" de §1, `TouchLayout` en los tipos de §2, y la fila "Ratón" de §4 sin "los controles táctiles … van en su propio spec". En `.claude/skills/nuevo-juego/SKILL.md:94` la fila pasa a "Ratón" y el táctil sale de "fuera por defecto". En `.claude/skills/nuevo-juego/spec-template.md`: quitar "Controles táctiles" de fuera de alcance (línea 53), cambiar el criterio "en táctil se ve REQUIERE TECLADO" (línea 201) por uno de botones táctiles, y ajustar la decisión (220) y el riesgo (229). En `.claude/agents/game-jam.md:43`: "controles de teclado y botones táctiles (`touch`)". En `CLAUDE.md`, sección "Game engines": mencionar `touch` y `TouchControls`. Verificación: `grep -rn "REQUIERE TECLADO" .claude CLAUDE.md components app` no devuelve nada.
7. **Verificación con Playwright.** Contra `npm run build` + `next start -p 3001`, en un contexto con `hasTouch: true`, `isMobile: true` y `deviceScaleFactor: 3`; los toques mantenidos y simultáneos con CDP `Input.dispatchTouchEvent`. Escritorio a 1440 px sin táctil. Añadir a este spec la sección "Resultado de la verificación", con capturas.
8. **Prueba en dispositivo real (la hace el usuario).** `next start -H 0.0.0.0` y abrir los cuatro juegos desde un móvil de la misma red. Anotar el resultado (navegador, sistema y lo que falle) en "Resultado de la verificación".

## Criterios de aceptación

"Táctil" es el contexto de Playwright con `hasTouch` e `isMobile`; "escritorio" es 1440×900 sin táctil.
Las pulsaciones se comprueban con un registro en la página: `window.addEventListener("keydown"/"keyup", e => log.push([e.type, e.code, e.repeat]))`.

**Build y contrato**

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] En `lib/engines/types.ts`, `EngineDefinition.touch` es `TouchLayout`, sin `?`.
- [ ] Los cuatro `definition.ts` declaran `touch` con los botones, `code`, `aria` y `repeat` de la tabla "Botones por juego".
- [ ] `git diff main --stat` no incluye ningún `lib/<id>/engine.ts`, `lib/<id>/input.ts`, `GameCanvas.tsx` ni `registry.ts`.
- [ ] `grep -rn "REQUIERE TECLADO\|kbd-required" .claude CLAUDE.md components app` no devuelve nada.
- [ ] `engine-contract.md` incluye `touch: TouchLayout` en los tipos y no contiene "van en su propio spec" para el táctil.

**Escritorio**

- [ ] En `#/jugar/<id>` de los cuatro juegos no hay ningún `.touch-zone` en el DOM y el prompt es "PULSA ESPACIO PARA EMPEZAR".
- [ ] La captura de `#/jugar/asteroids` en `ready` a 1440 px es igual a la de `main` píxel a píxel, salvo el fondo animado del canvas.
- [ ] Jugar con teclado los cuatro juegos funciona como en `main` (inicio con Espacio, movimiento, P, FIN).

**Táctil en vertical (390×844)**

- [ ] En los cuatro juegos, las zonas están bajo el CRT, la izquierda alineada a la izquierda y la derecha a la derecha, con los botones y `aria-label` de las tablas.
- [ ] En SNAKE la zona izquierda es una cruceta: ↑ queda encima de ← y →, y ↓ debajo, con ← a la izquierda de →.
- [ ] Cada `.touch-btn` mide al menos 56×56 px.
- [ ] `document.documentElement.scrollWidth` es ≤ 390 en los cuatro juegos.
- [ ] El overlay de inicio dice "TOCA PARA EMPEZAR" y la tira `.player-controls` sigue visible.
- [ ] Tocar el CRT en `ready` empieza la partida en los cuatro juegos (el botón PAUSA deja de estar `disabled`) y el registro tiene exactamente `keydown Space` y `keyup Space`.
- [ ] Tocar el CRT durante la partida no añade nada al registro.
- [ ] Con la partida en pausa, la pista dice "PULSA REANUDAR PARA CONTINUAR" sin "O P".
- [ ] Un juego simulado del catálogo (cualquiera sin motor registrado) no muestra `.touch-zone`.

**Táctil en horizontal (844×390)**

- [ ] En los cuatro juegos, el borde derecho de la zona izquierda es ≤ al borde izquierdo de `.crt` y el borde izquierdo de la zona derecha es ≥ al borde derecho de `.crt`.
- [ ] El alto de `.player-stage` es ≤ 390 px y `scrollWidth` ≤ 844.

**Botones**

- [ ] Mantener cualquier botón sin `repeat` durante 600 ms registra exactamente un `keydown` (con `repeat: false`) y, al soltar, un `keyup` del mismo `code`.
- [ ] Mantener ← de TETRIS durante 600 ms registra entre 8 y 11 `keydown ArrowLeft`: el primero con `repeat: false` y el resto con `repeat: true`.
- [ ] En ASTEROIDS, con tres dedos a la vez en ←, ↑ y FUEGO, el registro tiene los tres `keydown` sin ningún `keyup` hasta levantar los dedos, y la nave gira y avanza.
- [ ] En ARKANOID, mantener → 500 ms en partida mueve la paleta a la derecha; en SNAKE, tocar ↑ con la serpiente yendo a la derecha la hace girar hacia arriba; en TETRIS, CAÍDA deja caer la pieza.
- [ ] Un `touchCancel` de CDP con un botón pulsado registra su `keyup`.
- [ ] Pulsar PAUSA con un botón mantenido registra el `keyup` de ese botón; mientras dura la pausa, tocar botones no añade nada al registro.
- [ ] Con el modal de FIN DEL JUEGO abierto, tocar el input de iniciales abre el teclado y escribir no se interpreta como controles.
- [ ] En `.touch-btn`, `getComputedStyle` da `touch-action: none` y `user-select: none`.
- [ ] Ningún toque en los botones hace scroll de la página.

**General**

- [ ] La consola no muestra errores al abrir, jugar y salir de los cuatro juegos en táctil y en escritorio.
- [ ] Este spec contiene la sección "Resultado de la verificación" con una captura por juego en vertical y otra en horizontal, en partida.

## Decisiones

- **Sí:** botones virtuales bajo el CRT, generados desde la definición de cada juego. Un mismo modelo para los cuatro juegos, predecible y verificable. Decisión del usuario.
- **No:** gestos sobre el canvas. Cada juego necesitaría su propio mapeo y ASTEROIDS encaja mal; si llegan, en su propio spec. Decisión del usuario.
- **Sí:** teclas sintéticas (`KeyboardEvent` con el mismo `code` en `window`). Los motores y sus `input.ts` no cambian, y el player es el único que sabe que hay pantalla táctil. Decisión del usuario.
- **No:** una API táctil en `GameEngine` (press/release por acción). Más limpia en abstracto, pero toca los cuatro motores y el contrato sin ganar nada que los eventos sintéticos no den.
- **Sí:** los cuatro juegos reales en este spec. Con botones genéricos el coste por juego es declarar `touch`. Decisión del usuario.
- **Sí:** campo `touch` en `EngineDefinition`, y obligatorio. Todos los motores lo declaran aquí; hacerlo opcional solo serviría para que un juego nuevo llegue sin mando. Decisión del usuario (campo en la definición); obligatorio, decisión del agente; revisar.
- **No:** tabla de botones por id dentro del player. Separaría la definición del juego de sus controles.
- **Sí:** autorrepetición por botón (`repeat`, 170 ms y luego cada 50 ms), solo en ←, ↓ y → de TETRIS. TETRIS es el único motor que depende de la autorrepetición del sistema. Decisión del usuario; los tiempos, decisión del agente; revisar.
- **Sí:** mostrar los botones con `(hover: none) and (pointer: coarse)`. Es la condición que ya usaba "REQUIERE TECLADO"; en escritorio nada cambia. Decisión del usuario.
- **No:** mostrarlos al primer toque o con un interruptor MANDO TÁCTIL. El primer toque no jugaría, y el interruptor añade estado y UI sin una necesidad clara.
- **Sí:** vertical y horizontal. En vertical las zonas van bajo el CRT; en horizontal, a los lados, como un mando, con el CRT limitado a `100dvh`. Decisión del usuario.
- **No:** forzar horizontal ni pantalla completa. iOS Safari no admite pantalla completa de un elemento y bloquear la orientación excluye a quien juega en vertical.
- **Sí:** tocar el CRT en `ready` equivale a Espacio, con el prompt "TOCA PARA EMPEZAR". Durante la partida tocar el CRT no hace nada, para no disparar ni soltar piezas por accidente. Decisión del usuario.
- **Sí:** SNAKE con cruceta en la zona izquierda y la derecha vacía. Cuatro direcciones se leen mejor en cruz. Decisión del usuario.
- **Sí:** quitar "REQUIERE TECLADO" y mantener la tira `<kbd>`. El aviso deja de ser cierto; la tira se queda porque no se eligió ocultarla. Decisión del usuario.
- **Sí:** actualizar el contrato de `/nuevo-juego` y la línea de controles de `game-jam`. Con `touch` obligatorio, un spec de juego sin botones produciría un juego que no compila. Decisión del usuario (`/nuevo-juego`); `game-jam` y `CLAUDE.md`, decisión del agente; revisar.
- **No:** vibración háptica. No funciona en iOS Safari; si llega, en otro spec.
- **Sí:** palabras para las acciones (FUEGO, ROTAR, CAÍDA) y flechas para las direcciones. Press Start 2P no tiene glifos como ↻ o ⤓, y el respaldo del sistema rompería la estética.
- **Sí:** pista de pausa sin " O P" en táctil. Sin teclado, la P no existe. Decisión del agente; revisar.
- **Sí:** tocar un botón en `ready` también despacha su tecla. FUEGO de ASTEROIDS y CAÍDA de TETRIS empiezan la partida igual que Espacio en el teclado.
- **Sí:** verificar contra `next start` y no contra `next dev`, que puede servir un `globals.css` antiguo.

## Riesgos

| Riesgo                                                                                              | Mitigación                                                                                                                                          |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un dedo que sale del botón sin `pointerup` (gesto del sistema, notificación) deja una tecla pegada. | `pointercancel` y `lostpointercapture` sueltan la tecla; la pausa por `blur` / `visibilitychange` del player pone `disabled` y suelta todo.         |
| `setPointerCapture` lanza con punteros sintéticos o en navegadores viejos.                          | Va en `try/catch`; sin captura, `pointerup` y `pointercancel` siguen soltando la tecla.                                                             |
| El emulador de Playwright no se comporta como un móvil real (multitáctil, zoom, menú contextual).   | Toques mantenidos y simultáneos con CDP `Input.dispatchTouchEvent`; paso 8 de prueba en dispositivo real.                                           |
| En horizontal el HUD empuja `.player-stage` y hay que hacer scroll para ver el CRT entero.          | El stage cabe en `100dvh`, así que un scroll lo deja entero en pantalla. Si molesta en la prueba real, un spec aparte decide si se compacta el HUD. |
| Portátiles con pantalla táctil y ratón no cumplen `pointer: coarse` y no ven los botones.           | Aceptado: tienen teclado. El interruptor manual queda fuera de alcance.                                                                             |
| Un juego nuevo o un draft de `specs/game-jam/` llega sin `touch`.                                   | `touch` es obligatorio en el tipo: no compila. El contrato de `/nuevo-juego` y `game-jam` lo piden.                                                 |
| El `keydown` sintético llega mientras el foco está en el input de iniciales.                        | Los `input.ts` ya ignoran teclas con un input enfocado (`isTyping`), y las zonas están `disabled` con el modal abierto.                             |

## Lo que **no** entra en este spec

- Gestos sobre el canvas.
- Vibración háptica.
- Pantalla completa, bloqueo de orientación o aviso de girar el dispositivo.
- Interruptor manual de los botones o botones configurables por el jugador.
- Ocultar la tira `<kbd>` en táctil.
- Ratón y gamepad.
- Cambios en los motores, en `GameCanvas.tsx` o en el registro.
- `touch` en los drafts de `specs/game-jam/`.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la verificación

Fecha: 2026-10-19. `npm run build` + `next start -p 3003`: el `:3001` estaba ocupado por un `next start` de otra sesión con un build anterior.
Chromium de Playwright, con un contexto nuevo en cada recorrido. "Táctil" es `hasTouch`, `isMobile` y `deviceScaleFactor` 3; "escritorio" es 1440×900 sin táctil.
Los toques mantenidos, simultáneos y cancelados se hicieron con CDP `Input.dispatchTouchEvent`. Las pulsaciones se leyeron con el registro de `keydown` / `keyup` en `window` de los criterios (`addInitScript`).
Para comparar con `main` se usó el build servido en `:3002` desde un worktree temporal en `32663b9`. Entre `32663b9` y `main` (`89857d9`) solo cambian `lib/snake/*` y `specs/13`, así que el player de ASTEROIDS es el mismo.

| Área                    | Resultado                                                                                                                                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y build            | `npm run lint` sin errores (los 11 warnings son de scripts en `.playwright-mcp/skins-13/`, anteriores a este spec). `npm run build` sin errores de tipos ni de compilación.                                                                                                   |
| Contrato                | `EngineDefinition.touch: TouchLayout`, sin `?`. Los cuatro `definition.ts` coinciden con "Botones por juego" (botón, `code`, `aria` y `repeat` solo en ←, ↓ y → de TETRIS).                                                                                                   |
| Ficheros intactos       | `git diff main --name-only` no incluye ningún `lib/<id>/engine.ts`, `lib/<id>/input.ts`, `GameCanvas.tsx` ni `registry.ts`.                                                                                                                                                   |
| Greps                   | `grep -rn "REQUIERE TECLADO\|kbd-required" .claude CLAUDE.md components app` vacío. `engine-contract.md` tiene `touch: TouchLayout` y 0 apariciones de "van en su propio spec".                                                                                               |
| Escritorio              | En los cuatro juegos: 0 `.touch-zone` y prompt "PULSA ESPACIO PARA EMPEZAR". Con teclado: Espacio empieza (PAUSA habilitado), flechas, P pausa con "PULSA REANUDAR PARA CONTINUAR O P", P reanuda y FIN abre FIN DEL JUEGO.                                                   |
| Escritorio igual a main | Captura de página completa de `#/jugar/asteroids` en `ready` a 1440 px, con el canvas tapado y las animaciones CSS desactivadas: idéntica byte a byte a la de `main` (379 424 bytes las dos).                                                                                 |
| Vertical (390×844)      | En los cuatro juegos, las zonas empiezan bajo el CRT (CRT hasta y = 647, zonas desde 665), la izquierda alineada con el borde izquierdo del CRT y la derecha con el derecho. Botones y `aria-label` de las tablas. Todos los `.touch-btn` ≥ 56×56. `scrollWidth` 390.         |
| Cruceta de SNAKE        | ↑ encima de ← y →, ↓ debajo, ← a la izquierda de →; ↑ y ↓ entre las dos columnas.                                                                                                                                                                                             |
| Inicio táctil           | Overlay "TOCA PARA EMPEZAR" y `.player-controls` visible. Tocar el CRT registra exactamente `keydown Space` y `keyup Space` y habilita PAUSA en los cuatro juegos. Tocar el CRT en partida no registra nada.                                                                  |
| Pausa táctil            | "PULSA REANUDAR PARA CONTINUAR", sin " O P", en los cuatro juegos.                                                                                                                                                                                                            |
| Juego simulado          | `#/jugar/gloton`: 0 `.touch-zone` y sin canvas.                                                                                                                                                                                                                               |
| Horizontal (844×390)    | En los cuatro juegos, borde derecho de la zona izquierda ≤ borde izquierdo de `.crt` y borde izquierdo de la zona derecha ≥ borde derecho de `.crt`. Alto de `.player-stage` 372 (TETRIS 334, el CRT se estrecha para dejar sitio a 5 botones). `scrollWidth` 919: ver notas. |
| Sin `repeat`            | Mantener 600 ms cada botón sin `repeat` (ASTEROIDS ← → ↑ FUEGO, ARKANOID ← →, SNAKE ↑ ← ↓ →, TETRIS ROTAR CAÍDA) registra exactamente un `keydown` con `repeat: false` y un `keyup` del mismo `code`.                                                                         |
| `repeat` de TETRIS      | Mantener ← registra 10 u 11 `keydown ArrowLeft` (8 tomas: 10, 10, 11, 11, 11, 11, 11, 11), el primero con `repeat: false`, el resto con `repeat: true`, y un `keyup`. Ver notas.                                                                                              |
| Multitáctil             | ASTEROIDS con ←, ↑ y FUEGO a la vez: `keydown` ArrowLeft, ArrowUp y Space sin ningún `keyup` hasta levantar; luego los tres `keyup`. La nave gira (caja de 37×65 a 66×37 px) y avanza (centro de (799, 598) a (726, 552) en px del canvas).                                   |
| Cada juego              | ARKANOID: mantener → 500 ms mueve la paleta (centro x de 800 a 1 213 px del canvas). SNAKE: yendo a la derecha, ↑ la hace girar (centro de la cabeza de y = 608 a 352). TETRIS: CAÍDA deja caer la pieza (puntuación de 0 a 36).                                              |
| `touchCancel`           | Con ← pulsado, `touchCancel` registra su `keyup` y no queda ningún `data-pressed`.                                                                                                                                                                                            |
| Pausa con botón pulsado | Con ← mantenido, PAUSA registra `keyup ArrowLeft`. En pausa, tocar → y FUEGO a la vez no añade nada al registro.                                                                                                                                                              |
| Modal FIN DEL JUEGO     | Tocar el input deja el foco en "Tus iniciales"; escribir "AB P" da el valor "AB P", el modal sigue abierto, no aparece EN PAUSA, la puntuación no cambia y los botones táctiles están `aria-disabled`.                                                                        |
| Estilos                 | `getComputedStyle` de `.touch-btn`: `touch-action: none` y `user-select: none`.                                                                                                                                                                                               |
| Sin scroll ni zoom      | Arrastrar 180 px desde ↓ hacia arriba y un doble toque sobre ↓: `scrollY` sigue en 0 y `visualViewport.scale` en 1.                                                                                                                                                           |
| Consola                 | 0 errores (`console.error` y `pageerror`) al abrir, jugar y salir con SALIR de los cuatro juegos, en táctil (vertical y horizontal) y en escritorio.                                                                                                                          |

Capturas (no se versionan, en `.playwright-mcp/spec-14/`):

- En partida, una por juego y orientación: `playing-{asteroids,tetris,arkanoid,snake}-390x844.png` y `playing-{…}-844x390.png`.
- Pulido (paso 5), con el primer botón izquierdo pulsado: `step5-<juego>-{390x844,844x390,768x1024}.png`.
- Escritorio: `desktop-asteroids-ready-1440-branch.png` y `desktop-asteroids-ready-1440-main.png`.
- Botones: `multitouch-before.png`, `multitouch-held.png`, `snake-turn-up.png`, `tetris-before-drop.png`, `tetris-after-drop.png`.

Notas:

- `scrollWidth` 919 a 844×390 (criterio "`scrollWidth` ≤ 844"): no lo causa este spec. El botón "Iniciar Sesión" de la cabecera (`a.btn.auth-btn`) llega hasta x = 919, y pasa igual en `main` y en la Home. Entre 840 px (donde aparece el menú lateral) y unos 900 px la navegación completa no cabe. `.player-stage` termina en x = 820 en los cuatro juegos. Decisión del usuario: se deja fuera de este spec y el arreglo de la cabecera va en su propio spec.
- `repeat` de TETRIS: a 600 ms exactos salen 10 `keydown` (el inicial más las repeticiones de 170, 220 … 570 ms). Con CDP el toque duró de verdad entre 628 y 668 ms, y a partir de 620 ms entra la undécima. Está dentro de 8–11, pero en el límite superior.
- ASTEROIDS: en algunas muestras la nave no aparece porque parpadea; la primera captura con tres dedos cayó en un frame sin nave.
- Horizontal: con el scroll que deja el CRT entero en pantalla, la cabecera fija tapa la parte de arriba del CRT. Es el riesgo "el HUD empuja `.player-stage`" de este spec; se revisa en la prueba en dispositivo real.
- Pulido (paso 5): Press Start 2P solo tiene ↑ y ↓, así que las cuatro flechas se dibujan con su ↑ girada (`data-arrow` y `--turn`). El texto del botón sigue siendo el `label` de la definición. La Í de "CAÍDA" es el glifo de la fuente, igual que "Sesión" o "CRÉDITOS" en la cabecera.

### Prueba en dispositivo real (paso 8)

Pendiente: `npm run build` + `next start -H 0.0.0.0` y abrir los cuatro juegos desde un móvil de la misma red. Anotar navegador, sistema y lo que falle.
