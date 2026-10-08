# Contrato de un juego real en Arcade Vault

Este archivo resume lo que **todo spec de juego** generado por `/nuevo-juego` debe exigir.
La fuente de verdad es `specs/07-registro-de-juegos.md` y el código de `lib/engines/`.
Si el código y este archivo no coinciden, manda el código: léelo y escribe el spec según lo que haya.

---

## 1. Piezas que añade cada juego

| Pieza               | Dónde                                                                                            | Notas                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Motor sin React     | `lib/<id>/` (`config`, `math`, `input`, `entities`, `engine`, `types`; solo los que hagan falta) | Carpeta con el id del juego, como `lib/asteroids/`. Nunca `lib/games/`.                     |
| Definición          | `lib/<id>/definition.ts` → `export const <camelId>Engine: EngineDefinition`                      | `id`, `width`, `height`, `initialStats`, `startPrompt`, `controls`, `create`.               |
| Registro            | `lib/engines/registry.ts`                                                                        | Una línea más en `ENGINES`. Es el único cambio en código compartido.                        |
| Fila del catálogo   | Migración en `supabase/migrations/`                                                              | `update` si sustituye un juego simulado, `insert` si es nuevo. Ver §5.                      |
| Portada             | `app/globals.css`, clase `.cover-<algo>`                                                         | Se reutiliza la del simulado sustituido (renombrada si cambia el id) o se diseña una nueva. |
| Assets (si los hay) | `public/games/<id>/…`                                                                            | Imágenes, spritesheets, sonidos. Rutas absolutas `/games/<id>/…` desde el motor.            |

`GamePlayer.tsx`, `GameCanvas.tsx`, `lib/scores.ts`, `HallOfFame.tsx` **no se tocan**.
Si un juego necesita cambiar alguno de ellos, el contrato se queda corto: eso es un spec aparte (ampliación del registro), no parte del spec del juego.

---

## 2. Tipos (de `lib/engines/types.ts`)

```ts
type EnginePhase = "ready" | "playing" | "dead" | "gameover";
interface EngineStats {
  score: number;
  level: number;
  lives: number | null;
}
interface EngineCallbacks {
  onStats(s: EngineStats): void;
  onPhase(p: EnginePhase): void;
}
interface GameEngine {
  setPaused(p: boolean): void;
  end(): void;
  destroy(): void;
}
interface EngineControl {
  keys: string[];
  label: string;
}
interface EngineDefinition {
  id: string;
  width: number;
  height: number;
  initialStats: EngineStats;
  startPrompt: string;
  controls: EngineControl[]; // sin la P: la añade el player
  create(canvas: HTMLCanvasElement, cb: EngineCallbacks): GameEngine;
}
```

---

## 3. Reglas del motor (lecciones del SPEC 05)

El spec de cada juego debe recoger estas reglas en su modelo de datos o en sus criterios.

**Ciclo de vida**

- `create` arranca en `"ready"` y empieza su bucle `requestAnimationFrame` al instante. En `ready` se ve un fondo animado o la escena quieta, nunca una partida en curso.
- Espacio (u otra tecla de inicio que se pregunte) en `ready` pasa a `"playing"` y reinicia el estado de partida.
- `"gameover"` se alcanza al perder o con `end()`. La entidad del jugador deja de dibujarse o de recibir input. **Espacio no reinicia**: se reinicia desde el modal (el player remonta `<GameCanvas>` con otra `key`).
- `destroy()` cancela el rAF, quita **todas** las escuchas y para cualquier audio. Debe ser idempotente. Tiene que aguantar el doble montaje de StrictMode.
- `setPaused(true)` cancela el rAF y vacía el input. `setPaused(false)` reanuda con `lastTime = null`, de modo que el primer frame tenga `dt = 0`.
- `dt` limitado a 50 ms.

**Canvas**

- Se usa `setupCanvas(canvas, W, H)` de `lib/engines/canvas.ts`, que da `ctx`, `dpr` y `fontFamily`. No se copia la lógica de `dpr`.
- Resolución lógica fija: la del juego de referencia si se porta (Tetris 300×600, Arkanoid y Asteroids 800×600). El player hace el letterbox dentro del CRT 4:3.
- El canvas **no** dibuja puntuación, nivel, vidas, "GAME OVER", "PAUSA" ni menús propios. Todo eso es del HUD y de los overlays de React.
- Lo efímero del juego que no cabe en el HUD (power-up activo, siguiente pieza, líneas) sí puede dibujarse en el canvas. Cada caso se apunta en Decisiones.
- Paleta neón: colores como constantes en `config.ts`, copiados de los tokens de `:root` (`--cyan #00f5ff`, `--magenta #ff006e`, `--yellow #f5ff00`, `--green #00ff88`, `--ink #e6e9ff`). El canvas no entiende `var(--x)`, y leerlos en cada frame cuesta.
- El glow con `shadowBlur` va con `shadowColor` igual al color de trazo. Si el rendimiento cae (frame > 16 ms en Playwright a 375 px con dpr 2), se reduce y se anota.

**Input**

- Escucha en `window` (`keydown` y `keyup`). Nada de `document.getElementById`, `alert`, `innerHTML` ni DOM fuera del canvas.
- `preventDefault` de las teclas del juego solo si el motor está capturando: no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- En `keyup` las teclas se sueltan siempre, aunque no se capture.
- `clear()` al pausar, para que no queden teclas pegadas.
- La tecla **P** es de la plataforma: el motor no la escucha. Si la referencia tenía su propia pausa (Tetris con P, Arkanoid con su menú de pausa), se quita y se apunta en Decisiones.
- Si la referencia reinicia con una tecla o un botón HTML, se quita.

**Estadísticas**

- `onStats` solo cuando cambian `score`, `level` o `lives`, nunca en cada frame.
- `lives: null` en juegos sin vidas. `initialStats` debe coincidir con el primer estado de partida.
- `onPhase` en cada cambio de fase y nunca dos veces seguidas con la misma.
- La puntuación tiene que caber en `0..9 999 999` (CHECK de `public.scores`). Si el juego puede pasarse, el motor la limita y se apunta en Riesgos.

**Assets y sonido**

- Se cargan dentro de `create` (`new Image()`, `new Audio()` o `fetch`), desde `/games/<id>/…`.
- Mientras no han cargado, el motor dibuja `ready` sin ellos o espera. Nunca lanza un error no capturado.
- El sonido respeta la pausa y `destroy`. Las reproducciones que falla el navegador por autoplay se ignoran (`play().catch(() => {})`).
- Si el usuario deja el sonido fuera, el spec lo dice en Alcance y en Decisiones.

---

## 4. Ficheros auxiliares de la referencia

| En la referencia                             | En la plataforma                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| `game.js` con globals                        | Módulos TS en `lib/<id>/`, con estado dentro de `create`.                               |
| `levels.js` / datos                          | `lib/<id>/levels.ts` tipado.                                                            |
| `assets/spritesheet.js` + PNG                | `lib/<id>/sprites.ts` + `public/games/<id>/<archivo>.png`.                              |
| `assets/sounds/*.mp3`                        | `public/games/<id>/sounds/*.mp3` (si el sonido entra).                                  |
| `style.css` / panel HTML (score, next, etc.) | Se descarta. El HUD es de React; lo que haga falta se dibuja en el canvas.              |
| Overlay HTML de game over / botón restart    | Se descarta. El modal FIN DEL JUEGO es de la plataforma.                                |
| Tema claro/oscuro, toggles, títulos          | Se descarta.                                                                            |
| Ratón (`mousemove`, `click`)                 | Fuera por defecto (los controles táctiles y de ratón van en su propio spec). Preguntar. |
| `CLAUDE.md`, `specs/`, `.github/`, skills    | Se ignoran. Solo se leen sus specs como contexto de la jugabilidad.                     |

---

## 5. Catálogo y leaderboard

El leaderboard ya es genérico (SPEC 06): cualquier id que esté en `public.games` guarda con `submit_score` y aparece en el Salón. El spec del juego solo necesita la fila del catálogo.

**Flujo de migración** (el mismo de SPEC 04 y 06):

1. `supabase/migrations/pending_<nombre>.sql`.
2. `apply_migration` con el mismo SQL y nombre.
3. Renombrar a `<version>_<nombre>.sql` con la versión de `list_migrations`.
4. Regenerar `lib/supabase/database.types.ts` con `generate_typescript_types`.

**Sustituir un juego simulado** (p. ej. CAÍDA → TETRIS):

- Migración `replace_<viejo>_with_<id>`: `update public.games set id = …, title = …, short = …, long = …, cover = … where id = '<viejo>'`. `cat`, `color`, `best`, `plays` y `sort_order` se mantienen salvo que el usuario diga otra cosa.
- **Cuidado con la FK**: `scores.game_id` referencia `games.id` sin `on update cascade`. Si el id cambia y `<viejo>` tiene filas en `public.scores`, el `update` falla. Opciones que hay que preguntar:
  - (a) borrar en la misma migración las filas de `<viejo>`, que vienen de partidas simuladas;
  - (b) mantener el id viejo y cambiar solo los textos;
  - (c) insertar la fila nueva, mover las puntuaciones y borrar la vieja (no se recomienda: mezcla puntuaciones simuladas con reales).
- Si el id cambia, hay que actualizar las referencias en `lib/home.ts` (`RECENT_SCORES.gameId`), en `app/globals.css` (clase `.cover-*` si se renombra, en todas sus apariciones) y en los comentarios. Criterio: `grep -rn "<viejo>" app components lib` vacío.
- `#/juego/<viejo>` y `#/jugar/<viejo>` dejan de existir y caen al Home. No se crean alias.

**Juego nuevo** (fila nueva):

- Migración `add_<id>_game`: `insert into public.games (...) values (...)` con `sort_order = max(sort_order) + 1`, salvo que el usuario quiera otra posición (en ese caso, renumerar en la misma migración).
- `cat` en `ARCADE | PUZZLE | SHOOTER | VERSUS` y `color` en `cyan | magenta | yellow | green` (CHECK de la tabla). Una categoría nueva necesita su propia migración del CHECK, y eso es otro spec.
- `best` y `plays` son estáticos: se preguntan (por defecto `0` y `"0"`).
- Portada nueva `.cover-<id>` en `app/globals.css`, junto a las demás `.cover-*`, diseñada con `/frontend-design` sin romper la estética del Vault.
- El Home muestra "N JUEGOS" con el nuevo total, porque `homeStats(useGames().length)`.

**Criterios de leaderboard que siempre van:**

- Guardar " AB 1 " en `#/jugar/<id>` crea en `public.scores` una fila con `game_id = '<id>'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- La pestaña `<TÍTULO>` del Salón muestra esa fila.
- Antes de la primera partida guardada, la pestaña muestra "SIN PUNTUACIONES · SÉ EL PRIMERO", y su botón lleva a `#/jugar/<id>`.
- `public.scores` no contiene filas de la verificación al terminar.

---

## 6. Verificación que siempre va

- `npm run lint` y `npm run build` sin errores.
- Playwright contra `npm run build` + `next start -p 3001` (el `next dev` puede servir un `globals.css` antiguo), a 1440 px y 375 px.
- Recargar la página al empezar cada recorrido, porque `page.goto` a otra URL con solo el hash cambiado no recarga.
- Overlay de inicio, controles, puntuación, fin por derrota, FIN, modal, JUGAR DE NUEVO, SALIR y Espacio de nuevo con scroll en el detalle.
- `devicePixelRatio` 2 → `canvas.width = W·2`.
- Consola sin errores.
- `/#/jugar/asteroids` sigue funcionando y los juegos simulados restantes siguen simulando.
- Sección "Resultado de la verificación" añadida al spec, con lo comprobado, lo corregido y lo pendiente.
