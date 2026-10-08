# Plantilla del spec de un juego

`/nuevo-juego` usa esta plantilla para escribir `specs/NN-juego-<id>.md`.
**No es texto para copiar al pie de la letra.** Es la forma que debe tener el spec, calcada de `specs/05-juego-asteroids.md`.
Los huecos van entre `<…>`. Los bloques marcados **[port]** solo aplican si el juego viene de `references/started-games/`; los marcados **[sustituye]** o **[nuevo]**, según la decisión de catálogo.
Si un bloque no aplica, se quita entero: un spec nunca lleva huecos sin rellenar, "TODO" ni "por decidir".

Reglas de redacción de los specs del repo:

- En español, una idea por frase y una frase por línea.
- Nombres concretos: rutas, ids, textos exactos entre comillas.
- Sin código largo. Solo tipos y snippets cortos.
- Los estados del player y los textos de la UI van en MAYÚSCULAS, como en el resto de la app.

---

<!-- ===== Inicio de la plantilla ===== -->

# SPEC <NN> — Juego real: <TÍTULO>

> **Estado:** Draft
> **Depende de:** SPEC 06, SPEC 07
> **Fecha:** <fecha del contexto de sesión>
> **Objetivo:** <[port] Portar a TypeScript el <Juego> de `references/started-games/<carpeta>/`> <[original] Crear un <descripción breve>> y hacerlo jugable en `#/jugar/<id>`, con su puntuación guardada en el leaderboard y visible en el Salón de la Fama.

## Por qué existe este spec

<Estado actual: qué juego del catálogo es hoy (simulado) o que no existe.>
<[port] Qué tiene la referencia: archivo principal, líneas y qué impide cargarla tal cual (globals, DOM, escuchas sin limpiar, HUD propio…).>
<[original] Qué juego se quiere y por qué encaja en el Vault.>
Este spec <porta / crea> el motor con el contrato del SPEC 07 y lo registra, sin tocar el player.
<[sustituye] El catálogo ya tiene un juego equivalente, <VIEJO>, que pasa a llamarse <TÍTULO>.>

## Alcance

**Dentro:**

- <[sustituye] Migración `replace_<viejo>_with_<id>`: id, título, descripciones y portada.> <[nuevo] Migración `add_<id>_game`: fila nueva en `public.games` con `sort_order` <N>.>
- <[sustituye, id cambia] Actualizar las referencias al id `<viejo>`: `lib/home.ts`, `app/globals.css` y comentarios.>
- <[nuevo] Portada `.cover-<id>` en `app/globals.css`.>
- Motor de <TÍTULO> en TypeScript en `lib/<id>/`, sin React, <[port] con la misma jugabilidad que `<archivo>`: <lista de mecánicas>> <[original] con las mecánicas de "Modelo de datos">.
- Paleta neón del Vault en el canvas: <qué color lleva cada elemento>.
- Definición `<camelId>Engine` en `lib/<id>/definition.ts` y entrada en `lib/engines/registry.ts`.
- <[assets] Assets en `public/games/<id>/`: <lista>.>
- <[sonido] Sonido: <qué eventos>.>
- Puntuación guardada con GUARDAR PUNTUACIÓN y visible en el Salón, sin cambios en `lib/scores.ts` ni en `public.scores`.
- Pulido visual con `/frontend-design`: <portada nueva / tira de controles / lo que se dibuje en el canvas>.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cambios en `GamePlayer.tsx`, `GameCanvas.tsx` o en el contrato del SPEC 07.
- Controles táctiles, ratón y gamepad. <quitar "ratón" si el usuario lo metió>
- <Sonido, si queda fuera.>
- Leaderboard real en el detalle (`#/juego/<id>`). Sigue con `seededScores`.
- `best` y `plays` calculados.
- Alias o redirección de `#/juego/<viejo>` y `#/jugar/<viejo>`. <[sustituye, id cambia]>
- <[port] Mecánicas nuevas y cambios de balance.> <o la lista de lo descartado>
- <[port] Lo que se descarta de la referencia: tema claro/oscuro, menú de pausa propio, panel HTML…>
- Tests unitarios y test runner.

## Modelo de datos

### Catálogo (`supabase/migrations/<version>_<nombre>.sql`)

<[sustituye]>

```sql
update public.games set
  id = '<id>', title = '<TÍTULO>', short = '<…>', long = '<…>', cover = '<cover-…>'
where id = '<viejo>';
```

<Si `<viejo>` tiene filas en `scores` y el id cambia: indicar la opción elegida (borrarlas antes del update en la misma migración, o mantener el id).>

<[nuevo]>

```sql
insert into public.games (id, title, short, long, cat, cover, color, best, plays, sort_order)
values ('<id>', '<TÍTULO>', '<…>', '<…>', '<CAT>', 'cover-<id>', '<color>', <best>, '<plays>', <N>);
```

Reglas:

- Flujo de migraciones del SPEC 04: `pending_<nombre>.sql` → `apply_migration` → renombrado con la versión de `list_migrations` → `generate_typescript_types`.
- <[sustituye] `cat`, `color`, `best`, `plays` y `sort_order` no cambian.>
- <[sustituye, id cambia] `.cover-<viejo>` pasa a `.cover-<id>` en sus <N> apariciones sin cambiar estilos; `RECENT_SCORES` con `gameId: "<viejo>"` pasa a `"<id>"`.>
- <[nuevo] `cat` y `color` respetan los CHECK de la tabla.>

### Motor (`lib/<id>/`)

| Archivo         | Contenido                                            |
| --------------- | ---------------------------------------------------- |
| `config.ts`     | `W`, `H`, <constantes del juego> y `COLORS`.         |
| `input.ts`      | `createInput(target, isActive)`: <teclas del juego>. |
| `<…>.ts`        | <entidades / tablero / niveles / sprites>.           |
| `engine.ts`     | `create<Pascal>Game(canvas, callbacks): GameEngine`. |
| `definition.ts` | `<camelId>Engine: EngineDefinition`.                 |

```ts
// lib/<id>/definition.ts
export const <camelId>Engine: EngineDefinition = {
  id: "<id>",
  width: <W>,
  height: <H>,
  initialStats: { score: 0, level: <1>, lives: <n | null> },
  startPrompt: "<PULSA ESPACIO PARA EMPEZAR>",
  controls: [<{ keys: ["←", "→"], label: "MOVER" }, …>],
  create: create<Pascal>Game,
};
```

```ts
// config.ts — colores del canvas, copiados de los tokens de :root
export const COLORS = { <elemento>: "<#hex>", // --<token> … };
```

Fases:

| Fase       | Qué se ve y qué pasa                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `ready`    | <escena de fondo; tecla de inicio → `initGame()` → `playing`>                                   |
| `playing`  | <[port] Igual que en `<archivo>`.> <[original] reglas>                                          |
| `dead`     | <solo si el juego tiene vidas y reaparición; si no, quitar la fila>                             |
| `gameover` | <condición de derrota o `end()`. El jugador no se dibuja ni recibe input. Espacio no reinicia.> |

Reglas del motor:

- <[port] La jugabilidad es la de `<archivo>` sin cambios: <valores clave: velocidades, puntos, niveles, aceleración…>.> <[original] Reglas de puntuación, niveles y fin de partida.>
- Resolución lógica <W>×<H>, con `setupCanvas` de `lib/engines/canvas.ts`. El player hace el letterbox en el CRT.
- `dt` limitado a 50 ms.
- El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa. <Lo que sí se dibuja: siguiente pieza, power-up, líneas…>
- Mapeo al HUD: `score` = <…>, `level` = <…>, `lives` = <… | null>.
- `onStats` solo cuando cambian `score`, `level` o `lives`.
- La puntuación se limita a 9 999 999. <solo si el juego puede pasarse>
- <[port] Lo que se quita de la referencia: pausa propia con <tecla>, reinicio con <tecla>, overlay HTML, panel HTML, tema.>
- <[assets] Los assets se cargan en `create` desde `/games/<id>/…`; mientras cargan, <comportamiento>.>
- <[sonido] Eventos con sonido; se para con `setPaused(true)` y `destroy()`; `play().catch(() => {})`.>

Reglas del input (`input.ts`):

- Escucha `keydown` y `keyup` en `window`. `destroy()` quita las dos escuchas.
- Códigos del juego: <`ArrowLeft`, …>. La P no es del juego: la gestiona el player.
- `preventDefault()` solo si el motor no está en pausa, la fase no es `gameover` y el foco no está en un `input` ni en un `textarea`.
- `clear()` suelta todas las teclas.
- <Repetición de teclas (DAS) si el juego la necesita, p. ej. mover piezas al mantener.>

### Textos

| Elemento          | Texto                                     |
| ----------------- | ----------------------------------------- |
| Overlay de inicio | "<TÍTULO>" y "<startPrompt>"              |
| Tira de controles | <`← →` MOVER · `↑` ROTAR · …> · `P` PAUSA |

## Plan de implementación

1. **Catálogo.** <Migración, renombrado, tipos y referencias del id viejo / portada nueva.> Verificación: <`select … from public.games`>; <`grep -rn "<viejo>" app components lib` vacío>; la Biblioteca muestra <TÍTULO> <en la posición N>; `#/jugar/<id>` abre la simulación.
2. **Base del motor.** `config.ts` <y `math.ts`, tipos propios>. Verificación: `npm run lint` y `npm run build` pasan.
3. **Input.** `input.ts`. Verificación: `npm run build` pasa.
4. **<Entidades / tablero / niveles / sprites>.** <…>. Verificación: `npm run build` pasa.
5. **Motor.** `engine.ts` con fases, <…>, bucle, `setupCanvas`, `setPaused`, `end`, `destroy` y callbacks. Verificación: `npm run build` pasa.
6. **Registro.** `definition.ts` + entrada en `ENGINES`. Verificación: en `#/jugar/<id>` Espacio empieza la partida, el HUD cambia al puntuar y perder abre el modal.
7. <**Assets / sonido.** …> <si aplica>
8. **Pulido con `/frontend-design`.** <Portada, lo dibujado en el canvas y la tira> a 1440 px y 375 px, sin cambiar la estética del Vault.
9. **Verificación con Playwright.** `npm run build` + `next start -p 3001`; recorrer los criterios en `http://localhost:3001/#/jugar/<id>` a 1440 y 375 px, con capturas (no se versionan). Guardar una puntuación y comprobarla en el Salón. Borrar las filas de prueba de `public.scores`. Añadir "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `supabase/migrations/` no tiene archivos con prefijo `pending_`, y la migración nueva coincide con `list_migrations`.
- [ ] `public.games` tiene la fila `<id>` con <título, cat, color, cover, sort_order>.
- [ ] <[sustituye, id cambia] `grep -rn "<viejo>" app components lib` no devuelve resultados, y `/#/juego/<viejo>` muestra el Home.>
- [ ] La Biblioteca muestra <TÍTULO> con su portada <en la posición N>.
- [ ] <[nuevo] El Home muestra "<N+1> JUEGOS".>
- [ ] `ENGINES` tiene la entrada `<id>` y `GamePlayer.tsx` no ha cambiado.
- [ ] Al abrir `/#/jugar/<id>` se ve "<TÍTULO> / <startPrompt>" y PAUSA y FIN están deshabilitados.
- [ ] <Tecla de inicio> empieza la partida y el overlay desaparece.
- [ ] <Un criterio por control: "← mueve la pieza una columna a la izquierda".>
- [ ] Pulsar las teclas del juego durante la partida no cambia `window.scrollY`.
- [ ] <Un criterio por regla de puntuación, con valores exactos.>
- [ ] <Niveles: "Al llegar a 10 líneas el nivel del HUD pasa a 02".>
- [ ] <Vidas: "Al <evento> el HUD pierde un ♥" | "El HUD muestra — en vidas".>
- [ ] <Derrota: "<condición> abre el modal FIN DEL JUEGO con la misma puntuación que el HUD".>
- [ ] FIN abre el modal con la puntuación actual y <el jugador desaparece / el juego se congela>.
- [ ] El canvas no dibuja puntuación, nivel, vidas, "GAME OVER" ni pausa.
- [ ] <Colores: "<elemento> es <color>".>
- [ ] PAUSA, la tecla P y `blur` congelan el canvas; al reanudar no quedan teclas pegadas.
- [ ] En el modal se pueden escribir iniciales con espacios y con la letra P sin que el juego reaccione.
- [ ] Guardar " AB 1 " crea en `public.scores` una fila con `game_id = '<id>'` y `name = 'AB 1'`, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] La pestaña <TÍTULO> del Salón muestra esa fila; sin filas, muestra "SIN PUNTUACIONES · SÉ EL PRIMERO" con su botón a `#/jugar/<id>`.
- [ ] JUGAR DE NUEVO vuelve al overlay de inicio con el HUD en `initialStats`.
- [ ] SALIR lleva a `#/juego/<id>`, y allí Espacio vuelve a hacer scroll.
- [ ] Con `devicePixelRatio` 2 emulado, `canvas.width` es <W·2> y `canvas.height` es <H·2>.
- [ ] A 375 px no hay scroll horizontal y el canvas mantiene la proporción <W>:<H> dentro del CRT.
- [ ] La tira de controles muestra <…> · `P` PAUSA, y en táctil se ve "REQUIERE TECLADO".
- [ ] `/#/jugar/asteroids` sigue funcionando y <un juego simulado> sigue simulando.
- [ ] <[assets] Sin peticiones fallidas a `/games/<id>/…` en la pestaña de red.>
- [ ] La consola del navegador no muestra errores al abrir, jugar y salir de `/#/jugar/<id>`.
- [ ] `public.scores` no contiene filas de la verificación al terminar.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

<Cada respuesta de la fase de preguntas, en forma de **Sí:** / **No:**, con su motivo y "Decisión del usuario" cuando lo sea. Siempre deben aparecer:>

- **Sí/No:** sustituir <VIEJO> o añadir una fila nueva.
- **Sí/No:** cambiar el id (y qué se hace con las filas de `scores` del viejo).
- **Sí/No:** jugabilidad idéntica a la referencia. <[port]>
- **Sí:** motor sin React en `lib/<id>/` registrado en `ENGINES`; el player no se toca (SPEC 07).
- **Sí:** paleta neón del Vault en el canvas.
- **Sí:** HUD de React y modal de la plataforma; <lo que sí se dibuja en el canvas y por qué>.
- **No:** <pausa propia / reinicio con tecla / panel HTML de la referencia>.
- **Sí/No:** sonido.
- **Sí/No:** ratón y táctil.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                            | Mitigación                                               |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| <[sustituye, id cambia] La FK de `scores.game_id` bloquea el `update` del id.>                    | <Opción elegida en la migración y criterio de catálogo.> |
| <[sustituye, id cambia] El Home filtra en silencio las filas de `RECENT_SCORES` con el id viejo.> | <Paso 1 y criterio del Home.>                            |
| <El canvas vertical/estrecho se ve pequeño a 375 px.>                                             | <Aceptado: el juego requiere teclado.>                   |
| <`shadowBlur` baja el rendimiento.>                                                               | <dpr máximo 2; reducir glow si el frame pasa de 16 ms.>  |
| <[assets] Los assets tardan o fallan al cargar.>                                                  | <Comportamiento en `ready` y criterio de red.>           |
| <El juego puede superar 9 999 999 puntos.>                                                        | <Límite en el motor.>                                    |
| <El leaderboard falso del detalle usa `id.length` como semilla y cambia con el id nuevo.>         | <Aceptado: son datos simulados.>                         |

## Lo que **no** entra en este spec

- <Repetición de "Fuera de alcance".>

Cada uno, si llega, va en su propio spec.
