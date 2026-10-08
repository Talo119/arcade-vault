---
name: nuevo-juego
description: Diseña el spec de un juego real nuevo para Arcade Vault (portado desde references/started-games/ o creado desde cero), con su motor registrado en el SPEC 07, su fila en el catálogo de Supabase y su puntuación en el leaderboard. Hace las preguntas, escribe specs/NN-juego-<id>.md en Draft y se detiene; la implementación va con /spec-impl.
disable-model-invocation: true
argument-hint: "<carpeta de references/started-games (p. ej. 03-tetris) o descripción del juego>"
allowed-tools: Read, Glob, Grep, Write, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(grep:*), Bash(wc:*), mcp__supabase__execute_sql
---

# /nuevo-juego — Spec de un juego real con leaderboard

## Contexto de sesión

Fecha de hoy (úsala en la cabecera del spec, nunca la inventes):
!`date +%F`

Specs existentes:
!`ls specs/ 2>/dev/null || echo "No existe la carpeta specs/"`

Estado del SPEC 07 (registro de juegos):
!`grep -m1 "Estado" specs/07-*.md 2>/dev/null || echo "NO EXISTE el SPEC 07"`

Registro de motores:
!`cat lib/engines/registry.ts 2>/dev/null || echo "NO EXISTE lib/engines/registry.ts"`

Juegos de referencia disponibles:
!`ls references/started-games/ 2>/dev/null || echo "No hay juegos de referencia"`

---

Esta skill produce **un spec**: el contrato para portar o crear un juego real y conectarlo con la plataforma (registro de motores, catálogo `public.games`, GUARDAR PUNTUACIÓN y Salón de la Fama).
**No escribe código, ni migraciones, ni CSS.** Solo el archivo `specs/NN-juego-<id>.md`.
La implementación la hace después el usuario con `/spec-impl`.

Antes de empezar, lee los dos archivos de esta carpeta:

- `engine-contract.md`: lo que todo spec de juego debe exigir (contrato del SPEC 07, lecciones del SPEC 05, reglas de catálogo y leaderboard del SPEC 06).
- `spec-template.md`: la forma exacta del spec que vas a escribir.

Responde en el idioma del usuario. El spec se escribe en español, como los demás del repo.

## Fase 0 — Prerrequisito

Mira el contexto de sesión de arriba.
Si el SPEC 07 no existe, no está en estado `Implemented` / `Implementado`, o `lib/engines/registry.ts` no existe, **para** y muestra exactamente:

```
❌ Todavía no puedo diseñar juegos reales.

/nuevo-juego da por hecho el registro de motores del SPEC 07
(lib/engines/registry.ts + GameCanvas genérico), y aún no está implementado.

Siguiente paso:
  1. Revisa specs/07-registro-de-juegos.md y cambia su estado a "Approved".
  2. Ejecuta /spec-impl 07-registro-de-juegos.
  3. Cuando esté "Implemented", vuelve a lanzar /nuevo-juego.
```

No ofrezcas alternativas ni empieces "por adelantado". El bloqueo es intencionado.

## Fase 1 — Contexto

1. Lee `CLAUDE.md` y `AGENTS.md`.
2. Lee `specs/05-juego-asteroids.md`, `specs/06-catalogo-y-leaderboard.md` y `specs/07-registro-de-juegos.md`. Si hay un spec de juego más reciente (`NN-juego-*.md`), léelo también: es el mejor ejemplo de las convenciones actuales.
3. Lee `lib/engines/types.ts`, `lib/engines/registry.ts` y `lib/asteroids/definition.ts`. Si el contrato real difiere de `engine-contract.md`, manda el código.
4. Lee el catálogo vivo con `mcp__supabase__execute_sql`. **Solo `SELECT`, nunca otra cosa**:
   - `select id, title, cat, color, cover, best, plays, sort_order from public.games order by sort_order;`
   - `select game_id, count(*) from public.scores group by game_id;`
     Si el MCP no responde, reconstruye el catálogo con los archivos de `supabase/migrations/` y dilo. En ese caso, el número de filas de `scores` queda como riesgo a comprobar en el paso 1 del plan.
5. Calcula qué juegos del catálogo son **simulados**: los que no tienen entrada en `ENGINES`.
6. Decide el **origen** a partir de `$ARGUMENTS`:
   - Si coincide con una carpeta de `references/started-games/`, por nombre completo (`03-tetris`), número (`03`) o nombre (`tetris`), es un **port**.
   - Si es una descripción de un juego, es un **juego original**.
   - Si está vacío, pregunta con `AskUserQuestion`: lista las carpetas de referencia **que aún no tengan motor registrado** más la opción "Juego original".
   - Si la carpeta elegida ya tiene un motor registrado (p. ej. `02-asteroids`), dilo y para.

## Fase 2 — Análisis de la referencia (solo en un port)

Lee **todos** los archivos de la carpeta: `index.html`, `game.js`, CSS, `levels.js`, `assets/`, `README.md`, `CLAUDE.md` y sus `specs/` si los tiene. Ignora `.github/`, `.agents/`, `.Claude/` y los `skills-lock.json`.
Muestra al usuario una tabla de inventario con estas filas, rellenadas con datos reales (nombres de función, números de línea, valores):

| Aspecto                                           | En la referencia | Qué pide el contrato                               |
| ------------------------------------------------- | ---------------- | -------------------------------------------------- |
| Archivos y líneas                                 |                  |                                                    |
| Tamaño lógico del canvas                          |                  | resolución fija → `width`/`height`                 |
| Globals y estado                                  |                  | estado dentro de `create`                          |
| DOM (`getElementById`, panel HTML, overlays HTML) |                  | se descarta; HUD y modal de la plataforma          |
| Escuchas (`window`/`document`/`canvas`)           |                  | solo `window` y se quitan en `destroy`             |
| Bucle (`rAF`, `setInterval`, `dt`)                |                  | rAF, `dt` ≤ 50 ms, pausa cancela el rAF            |
| HUD dibujado en el canvas                         |                  | se quita                                           |
| Pausa propia / reinicio con tecla                 |                  | se quita (P y modal de la plataforma)              |
| Estadísticas → HUD                                |                  | `score`, `level`, `lives` o `null`                 |
| Condición de derrota                              |                  | `gameover`                                         |
| Puntuación máxima posible                         |                  | ≤ 9 999 999                                        |
| Ratón / táctil                                    |                  | fuera por defecto                                  |
| Imágenes / spritesheets                           |                  | `public/games/<id>/`                               |
| Sonido                                            |                  | dentro o fuera (pregunta)                          |
| Colores originales                                |                  | paleta neón de `:root`                             |
| Extras (tema, menús, saltar de nivel…)            |                  | se descarta salvo que el usuario diga lo contrario |

Termina la fase con una lista corta: lo que se porta tal cual, lo que se adapta y lo que se descarta.

## Fase 3 — Preguntas

Pregunta en bloques de 3 a 5 con `AskUserQuestion`. Pon tu recomendación como primera opción y márcala "(Recomendado)".
No preguntes lo que ya responde la referencia o el contrato. Pregunta solo lo que sea una decisión de verdad.
Después de cada bloque, espera las respuestas.

**Bloque A — Catálogo** (siempre):

- ¿**Sustituir** un juego simulado o **añadir** una fila nueva? Ofrece primero el simulado equivalente si lo hay (Tetris → `caida`, Arkanoid/Breakout → `bloque-buster`, Snake → `serpentina`, Pac-Man → `gloton`, Space Invaders → `invasores`, Frogger → `ranaria`, Pong → `duelo-pixel`).
- **Id y título.** Por defecto, el nombre real del juego en kebab-case (`tetris` / `TETRIS`), como se hizo con `rocas` → `asteroids`. Mantener el id viejo es la otra opción.
- Si el id cambia y el simulado tiene filas en `public.scores` (dato de la Fase 1): ¿borrarlas en la migración (recomendado: son partidas simuladas) o mantener el id viejo? Ver `engine-contract.md` §5.
- `short` y `long`: propón textos en el tono del catálogo actual. Que describan solo mecánicas que el juego tiene de verdad.
- En una fila nueva: `cat`, `color` (dentro de los CHECK), posición (`sort_order`, por defecto al final), `best`/`plays` y portada nueva `.cover-<id>`.

**Bloque B — Jugabilidad:**

- En un port: ¿jugabilidad **idéntica** a la referencia (recomendado) o con cambios? Si hay cambios, cuáles exactamente.
- En un juego original: mecánicas, controles, cómo se puntúa (valores exactos), niveles (qué los sube y qué cambian), vidas o `null`, condición de derrota y resolución lógica (800×600 por defecto).
- Qué se dibuja en el canvas además del juego (siguiente pieza, power-up activo, líneas…).
- Mapeo al HUD: qué es `score`, `level` y `lives`.

**Bloque C — Controles y presentación:**

- Tecla de inicio y texto de `startPrompt` (por defecto "PULSA ESPACIO PARA EMPEZAR").
- Controles y etiquetas de la tira (sin la P, que es de la plataforma).
- Ratón: fuera (recomendado) o dentro.
- Paleta: propón qué token de `:root` lleva cada elemento. En Tetris, por ejemplo, una pieza por color con los 4 neones más `--ink` y variaciones.

**Bloque D — Assets y sonido** (solo si la referencia los tiene, o si el juego original los pide):

- Sonido: fuera (recomendado si el SPEC 05 lo dejó fuera y no hay infraestructura) o dentro, con los archivos en `public/games/<id>/sounds/`.
- Imágenes/spritesheet: copiarlas a `public/games/<id>/` o redibujarlas con primitivas en la paleta neón.

**Cuándo dejar de preguntar.** Cuando puedas responder sin suponer nada:

1. Qué archivos aparecen o cambian (motor, definición, registro, migración, CSS, assets).
2. Cuál es la fila exacta de `public.games` después de la migración.
3. Qué valores numéricos exactos comprueba cada criterio de aceptación (puntos, niveles, velocidades).

Si el juego se va de tamaño (necesita cambiar `GamePlayer.tsx`, el contrato del SPEC 07, `public.scores` o el HUD), dilo. Propón un spec previo de ampliación del registro y para.

## Fase 4 — Escribir el spec

1. Número: el mayor de `specs/` más uno, con dos dígitos.
2. Nombre: `specs/NN-juego-<id>.md`.
3. Sigue `spec-template.md` sección por sección. Quita los bloques que no apliquen (`[port]`, `[sustituye]`, `[nuevo]`, `[assets]`, `[sonido]`) y rellena todos los huecos con datos reales de la Fase 2 y la Fase 3.
4. Cabecera: `**Estado:** Draft`, `**Depende de:** SPEC 06, SPEC 07`, fecha del contexto de sesión.
5. Cada respuesta de la Fase 3 va a **Decisiones** como **Sí:** / **No:**, con su motivo y "Decisión del usuario" cuando lo sea.
6. Repasa el spec contra `engine-contract.md`: cada regla de §3 tiene que estar en el modelo de datos o en un criterio, y los criterios de §5 y §6 tienen que estar todos.
7. Comprueba que no quedan `<…>`, "TODO" ni "por decidir".
8. Escribe el archivo directamente, sin pedir permiso para el nombre. Solo pregunta si el archivo ya existe.
9. Si `specs/.spec-config.yml` no existe, créalo con el contenido por defecto de `/spec` (`AutoCreateBranch: true`). Si existe, no lo toques.

## Fase 5 — Confirmar y parar

Muestra:

```
✅ Spec creado: specs/NN-juego-<id>.md  (Draft)

Juego:     <TÍTULO> (<port desde references/started-games/<carpeta> | original>)
Catálogo:  <sustituye a <viejo> | fila nueva en la posición N>
Motor:     lib/<id>/ → ENGINES["<id>"]

Siguiente paso:
  1. Revisa el spec y cambia su estado a "Approved".
  2. Ejecuta /spec-impl NN-juego-<id>.
```

**Para aquí.** No propongas implementar, ni escribas código, ni apliques migraciones.

## Reglas duras

- Nunca escribas nada fuera de `specs/` (salvo `specs/.spec-config.yml` si no existe).
- Nunca ejecutes SQL que no sea `SELECT`. Las migraciones las aplica `/spec-impl`.
- Nunca des por tomada una decisión que el usuario no haya confirmado. Si falta algo, pregunta en la Fase 3.
- Nunca diseñes un juego que necesite tocar `GamePlayer.tsx`, `GameCanvas.tsx`, `lib/scores.ts` o el esquema de `public.scores`. Eso es otro spec.
- Un juego por spec. Si el usuario pide varios, haz el primero y recuérdale que vuelva a lanzar `/nuevo-juego` para el siguiente.
- La jugabilidad de un port se respeta por defecto. Las mejoras van como decisiones explícitas o a un spec futuro.
