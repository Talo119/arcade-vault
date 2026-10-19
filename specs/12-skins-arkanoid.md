# SPEC 12 — Skins de ARKANOID

> **Estado:** Draft
> **Depende de:** SPEC 07, SPEC 09, SPEC 11
> **Fecha:** 2026-10-19
> **Objetivo:** Dar a ARKANOID sus tres skins del canvas (CLÁSICO, NEÓN y RETRO), elegibles con el selector del player en `#/jugar/arkanoid` y guardadas en `av:skin:arkanoid`.

## Por qué existe este spec

El SPEC 11 crea el sistema de skins y lo aplica solo a ASTEROIDS.
Su contrato es incremental: `EngineDefinition.skins` y `GameEngine.setSkin` son opcionales, y el selector solo aparece en los motores que declaran `skins`.
Hoy ARKANOID pinta con una paleta fija (`BLOCK_COLORS` y `COLORS` en `lib/arkanoid/config.ts`) y un brillo suelto en `lib/arkanoid/engine.ts:50`.
Por eso `#/jugar/arkanoid` no tiene selector de skin.
Este spec mueve todos sus colores a una paleta, añade las skins NEÓN y RETRO con la familia de color del SPEC 11 y declara `skins` para que el selector aparezca.
CLÁSICO reproduce byte a byte los colores actuales: quien no toque el selector ve ARKANOID exactamente como antes.

## Alcance

**Dentro:**

- `lib/arkanoid/config.ts`: tipo `ArkanoidPalette` y `SKINS: Record<SkinId, ArkanoidPalette>`; desaparecen `BLOCK_COLORS` y `COLORS`.
- Motor de ARKANOID leyendo de la paleta activa, con los cuatro `shadowBlur` escalados por `palette.glow`, el brillo `SHINE` dentro de la paleta y `setSkin` en caliente.
- `lib/arkanoid/definition.ts` con `skins: SKINS`, para que el selector CLÁSICO / NEÓN / RETRO del SPEC 11 aparezca en `#/jugar/arkanoid`.
- Persistencia por juego en `localStorage` con la clave `av:skin:arkanoid`, con `loadSkin` y `saveSkin` del SPEC 11.
- Pulido visual del canvas con `/frontend-design`: halo de los bloques en NEÓN y lectura de la separación de 1 px.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- El sistema de skins en sí (`lib/engines/skins.ts`, tipos, `GameCanvas`, selector, contrato de `/nuevo-juego`): lo hace el SPEC 11.
- Skins de TETRIS y SNAKE, cada una en su spec.
- Hacer obligatorios `EngineDefinition.skins` y `GameEngine.setSkin`: lo hace el spec que dé skins al último juego.
- Ampliar la tabla "Familias de color" de `.claude/skills/nuevo-juego/engine-contract.md` con los hex nuevos de este spec.
- Cambios de jugabilidad, niveles, cajas de choque o tamaños de ARKANOID.
- Cambiar la UI del sitio (HUD, CRT, botones, overlays) según la skin.
- Sprites, texturas o degradados en los bloques.
- Tests unitarios y test runner.

## Modelo de datos

### Paleta de ARKANOID (`lib/arkanoid/config.ts`)

```ts
import type { SkinId } from "@/lib/engines/skins";
import type { BlockColor } from "./levels";

export interface ArkanoidPalette {
  bg: string;
  paddle: string;
  ball: string;
  blocks: Record<BlockColor, string>; // bloques y los trozos de su explosión
  shine: string; // franja de 4 px arriba de bloques y paleta; decorativo
  glow: number; // multiplica GLOW_BLOCK 4, GLOW_SHARD 12, GLOW_PADDLE 14 y GLOW_BALL 12
}

export const SKINS: Record<SkinId, ArkanoidPalette> = {
  clasico: {
    bg: "#000",
    paddle: "#00f5ff",
    ball: "#e6e9ff",
    blocks: {
      red: "#ff006e",
      yellow: "#f5ff00",
      cyan: "#00f5ff",
      green: "#00ff88",
      magenta: "#aa00ff",
      hotpink: "#ffae00",
      gray: "#c7d0e0",
    },
    shine: "rgba(255, 255, 255, 0.12)",
    glow: 1,
  },
  neon: {
    bg: "#0a0418",
    paddle: "#ff2bd6",
    ball: "#fdf3ff",
    blocks: {
      red: "#ff2bd6",
      yellow: "#ff9e2c",
      cyan: "#2de2ff",
      green: "#4d7bff",
      magenta: "#b14bff",
      hotpink: "#ff5c8a",
      gray: "#e0c8ff",
    },
    shine: "rgba(253, 243, 255, 0.18)",
    glow: 2,
  },
  retro: {
    bg: "#030d05",
    paddle: "#7dff6e",
    ball: "#eaffe4",
    blocks: {
      red: "#3fbf4a",
      yellow: "#9fd0aa",
      cyan: "#2ee6a0",
      green: "#7dff6e",
      magenta: "#238b45",
      hotpink: "#e0ff9a",
      gray: "#c8ff5a",
    },
    shine: "rgba(0, 0, 0, 0)",
    glow: 0.2,
  },
};
```

- `BLOCK_COLORS` y `COLORS` desaparecen de `lib/arkanoid/config.ts`; `SKINS.clasico` es su sustituto, con los mismos diez valores.
- Las claves de `blocks` siguen siendo los nombres de `levels.js` (`BlockColor` en `lib/arkanoid/levels.ts`); `levels.ts` no cambia.
- Las cuatro constantes de glow siguen en `lib/arkanoid/engine.ts` con sus valores actuales; cada `shadowBlur` pasa a ser `GLOW_X * palette.glow`.
- Con `glow` 0.2 los `shadowBlur` valen 0.8, 2.4, 2.8 y 2.4; con `glow` 2 valen 8, 24, 28 y 24.
- `Explosion.color` ya guarda la clave `BlockColor` y no el hex, así que una explosión en curso cambia de color con `setSkin` sin tocar `lib/arkanoid/entities.ts`.

### Contrato del motor

```ts
export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): Required<GameEngine>;
```

- `let palette = SKINS[skin]` al crear el motor; `draw` y sus funciones leen siempre de `palette`.
- `setSkin(next)` hace `palette = SKINS[next]` y no toca fase, puntuación, vidas, nivel, bloques, explosiones, paleta ni pelota.
- Si el motor está en pausa (sin rAF), `setSkin` llama a `draw()` una vez sin `update`, para que el cambio se vea detrás del overlay EN PAUSA (`rgba(0, 0, 0, 0.6)`).
- En `ready`, `playing` y `gameover` el rAF sigue vivo y el cambio se ve en el frame siguiente.
- `setSkin` después de `destroy` no hace nada.
- `lib/arkanoid/definition.ts` añade `skins: SKINS`; `create: createArkanoidGame` no cambia.

### Contraste

Medido con `node .claude/scripts/contrast.mjs` contra el `bg` de cada skin.
ARKANOID no dibuja texto en el canvas: puntuación, nivel y vidas van en el HUD de React.
Todos los elementos de juego usan el umbral 3:1.
Los bloques se dibujan siempre sobre el `bg`, así que no hay fondos secundarios.

| Clave            | CLÁSICO                                           | NEÓN                                              | RETRO                                    | Umbral |
| ---------------- | ------------------------------------------------- | ------------------------------------------------- | ---------------------------------------- | ------ |
| `bg`             | `#000` · lum 0.0000                               | `#0a0418` · lum 0.0022                            | `#030d05` · lum 0.0032                   | ≤ 0.03 |
| `paddle`         | `#00f5ff` · 15.50:1                               | `#ff2bd6` · 6.29:1                                | `#7dff6e` · 15.42:1                      | 3:1    |
| `ball`           | `#e6e9ff` · 17.46:1                               | `#fdf3ff` · 18.63:1                               | `#eaffe4` · 18.73:1                      | 3:1    |
| `blocks.red`     | `#ff006e` · 5.48:1                                | `#ff2bd6` · 6.29:1                                | `#3fbf4a` · 8.24:1                       | 3:1    |
| `blocks.yellow`  | `#f5ff00` · 19.19:1                               | `#ff9e2c` · 9.76:1                                | `#9fd0aa` · 11.35:1                      | 3:1    |
| `blocks.cyan`    | `#00f5ff` · 15.50:1                               | `#2de2ff` · 12.87:1                               | `#2ee6a0` · 12.17:1                      | 3:1    |
| `blocks.green`   | `#00ff88` · 15.66:1                               | `#4d7bff` · 5.36:1                                | `#7dff6e` · 15.42:1                      | 3:1    |
| `blocks.magenta` | `#aa00ff` · 4.15:1                                | `#b14bff` · 5.10:1                                | `#238b45` · 4.56:1                       | 3:1    |
| `blocks.hotpink` | `#ffae00` · 11.31:1                               | `#ff5c8a` · 6.85:1                                | `#e0ff9a` · 17.81:1                      | 3:1    |
| `blocks.gray`    | `#c7d0e0` · 13.53:1                               | `#e0c8ff` · 13.30:1                               | `#c8ff5a` · 16.84:1                      | 3:1    |
| `shine`          | `rgba(255, 255, 255, 0.12)` · 1.27:1 · decorativo | `rgba(253, 243, 255, 0.18)` · 1.57:1 · decorativo | `rgba(0, 0, 0, 0)` · 1.00:1 · decorativo | exento |
| `glow`           | 1                                                 | 2                                                 | 0.2                                      | —      |

- Contraste más bajo por skin: CLÁSICO 4.15:1 (`blocks.magenta`), NEÓN 5.10:1 (`blocks.magenta`), RETRO 4.56:1 (`blocks.magenta`).
- `shine` es el único decorativo: se dibuja encima del bloque o de la paleta, no como elemento propio; el ratio de la tabla es el del color compuesto sobre el `bg`.
- Los trozos de la explosión usan el color de su bloque con `globalAlpha` 1 → 0.25; se miden con el color opaco.
- Los siete colores de `blocks` son distintos entre sí en cada skin.
- `paddle` comparte hex con un bloque en las tres skins (`cyan` en CLÁSICO, `red` en NEÓN y `green` en RETRO), como hoy; la paleta va sola en la fila 560 y no se confunde.
- `ball` no coincide con ningún bloque en ninguna skin, porque la pelota pasa por delante de ellos.

### Distinción entre bloques

Cada nivel usa estos colores, de arriba abajo (`lib/arkanoid/levels.ts`):

| Nivel | Filas                                                        |
| ----- | ------------------------------------------------------------ |
| 1     | `red`, `yellow`, `cyan`, `magenta`, `hotpink`, `green`       |
| 2     | `gray`, `cyan`, `hotpink`, `yellow`, `magenta`, `green`      |
| 3     | `yellow` en las filas 0–2 y `magenta` en las 3–5, en ajedrez |
| 4     | `cyan`, `magenta`, `green`, `yellow`, `hotpink`, `red`       |
| 5     | `cyan` en el marco y `hotpink` en la cruz                    |

Las parejas de filas contiguas (también en diagonal, en el ajedrez del nivel 3) son 12: `red`–`yellow`, `red`–`hotpink`, `yellow`–`cyan`, `yellow`–`magenta`, `yellow`–`hotpink`, `yellow`–`green`, `cyan`–`magenta`, `cyan`–`hotpink`, `cyan`–`gray`, `magenta`–`hotpink`, `magenta`–`green` y `hotpink`–`green`.
La asignación de NEÓN y RETRO maximiza la diferencia de color (ΔE CIE76 en Lab) entre esas parejas.
El ΔE no es un contraste y no sustituye al script.

| Skin    | Pareja contigua más parecida                            | ΔE   |
| ------- | ------------------------------------------------------- | ---- |
| CLÁSICO | `cyan` `#00f5ff` – `gray` `#c7d0e0` (nivel 2)           | 45.1 |
| NEÓN    | `magenta` `#b14bff` – `green` `#4d7bff` (niveles 2 y 4) | 43.4 |
| RETRO   | `cyan` `#2ee6a0` – `magenta` `#238b45` (niveles 1 y 4)  | 34.9 |

- En RETRO, la pareja más parecida de toda la skin es `ball` `#eaffe4` – `yellow` `#9fd0aa` (ΔE 22.3).
- En CLÁSICO es `ball` `#e6e9ff` – `gray` `#c7d0e0` (ΔE 10.1), así que en RETRO la pelota se distingue mejor que hoy.
- En RETRO, las parejas de bloques más parecidas (`red` `#3fbf4a` – `green` `#7dff6e`, ΔE 24.2; `green` – `gray` `#c8ff5a`, ΔE 26.0) nunca van en filas contiguas.

### Familias de color

NEÓN y RETRO parten de la tabla "Familias de color" del SPEC 11.

| Skin  | Hex de la familia que se reutilizan                              | Hex nuevos de este spec                                                                  |
| ----- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| NEÓN  | `#0a0418`, `#ff2bd6`, `#b14bff`, `#2de2ff`, `#ff9e2c`, `#fdf3ff` | azul eléctrico `#4d7bff`, rosa coral `#ff5c8a`, lavanda `#e0c8ff`                        |
| RETRO | `#030d05`, `#3fbf4a`, `#7dff6e`, `#c8ff5a`, `#eaffe4`            | verde profundo `#238b45`, verde salvia `#9fd0aa`, menta `#2ee6a0`, lima pálido `#e0ff9a` |

- El elemento del jugador sigue la regla de ASTEROIDS: cian en CLÁSICO, magenta `#ff2bd6` en NEÓN y verde medio `#7dff6e` en RETRO.
- El elemento más claro también: `ball` usa el mismo hex que `bullet` de ASTEROIDS en NEÓN (`#fdf3ff`) y en RETRO (`#eaffe4`).

### Usos de color de ARKANOID que pasan a leer la paleta

| Archivo:línea                        | Hoy                                                 | Después                                                    |
| ------------------------------------ | --------------------------------------------------- | ---------------------------------------------------------- |
| `lib/arkanoid/config.ts:28-36`       | `BLOCK_COLORS`                                      | `SKINS.clasico.blocks`                                     |
| `lib/arkanoid/config.ts:37-41`       | `COLORS` (`bg`, `paddle`, `ball`)                   | `SKINS.clasico.bg`, `.paddle`, `.ball`                     |
| `lib/arkanoid/engine.ts:5,10`        | `import { BLOCK_COLORS, COLORS }`                   | `import { SKINS }`                                         |
| `lib/arkanoid/engine.ts:50`          | `const SHINE = "rgba(255, 255, 255, 0.12)"`         | `palette.shine`; la constante desaparece                   |
| `lib/arkanoid/engine.ts:53-56`       | `createArkanoidGame(canvas, callbacks): GameEngine` | tercer parámetro `skin` y `Required<GameEngine>`           |
| `lib/arkanoid/engine.ts:230,235-237` | `BLOCK_COLORS[block.color]`, `GLOW_BLOCK`           | `palette.blocks[block.color]`, `GLOW_BLOCK * palette.glow` |
| `lib/arkanoid/engine.ts:240`         | `SHINE`                                             | `palette.shine`                                            |
| `lib/arkanoid/engine.ts:251,258-260` | `BLOCK_COLORS[exp.color]`, `GLOW_SHARD`             | `palette.blocks[exp.color]`, `GLOW_SHARD * palette.glow`   |
| `lib/arkanoid/engine.ts:270-272`     | `COLORS.paddle`, `GLOW_PADDLE`                      | `palette.paddle`, `GLOW_PADDLE * palette.glow`             |
| `lib/arkanoid/engine.ts:275`         | `SHINE`                                             | `palette.shine`                                            |
| `lib/arkanoid/engine.ts:281-283`     | `COLORS.ball`, `GLOW_BALL`                          | `palette.ball`, `GLOW_BALL * palette.glow`                 |
| `lib/arkanoid/engine.ts:298`         | `COLORS.bg`                                         | `palette.bg`                                               |

- `engine.ts:50` es el único color suelto fuera de `config.ts`.
- Con `palette.glow` 0, el código pone `shadowBlur = 0` y no dibuja sombra.

### Player

- `GamePlayer.tsx` no cambia: el selector del SPEC 11 se muestra si `isReal && engine.skins`, y `arkanoidEngine` pasa a declarar `skins`.
- La skin inicial sale de `loadSkin("arkanoid")`, y elegir otra llama a `saveSkin("arkanoid", next)`.
- La skin solo cambia el canvas: HUD, CRT, botones, overlays y modal no cambian.

## Plan de implementación

1. **Requisito.** Comprobar que el SPEC 11 está `Implemented`: existe `lib/engines/skins.ts` y `#/jugar/asteroids` muestra el selector. Si no, parar: este spec no crea el sistema. Verificación: `ls lib/engines/skins.ts` y `grep -n "player-skins" components/screens/GamePlayer.tsx` devuelven resultado.
2. **Paleta de ARKANOID, sin cambio visual.** Añadir `ArkanoidPalette` y `SKINS` a `lib/arkanoid/config.ts` y borrar `BLOCK_COLORS` y `COLORS`. Hacer que `createArkanoidGame(canvas, callbacks, skin = DEFAULT_SKIN)` guarde `let palette = SKINS[skin]`, que los cuatro `shadowBlur` multipliquen por `palette.glow` y que `SHINE` desaparezca. Verificación: `npm run build` pasa; `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/arkanoid/*.ts` solo devuelve líneas de `config.ts`; `grep -nE 'BLOCK_COLORS|COLORS\.|SHINE\b' lib/arkanoid/*.ts` no devuelve nada; `#/jugar/arkanoid` se ve igual que en `main`.
3. **`setSkin` y definición.** Tipo de retorno `Required<GameEngine>`, `setSkin` en el objeto que devuelve `createArkanoidGame` (con el redibujado en pausa) y `skins: SKINS` en `arkanoidEngine`. Verificación: `npm run build` pasa.
4. **Selector en `#/jugar/arkanoid`.** Sin tocar `GamePlayer.tsx`, comprobar en `npm run dev` que `#/jugar/arkanoid` muestra el grupo "SKIN" con CLÁSICO, NEÓN y RETRO. Verificación: NEÓN cambia el canvas al instante y sobrevive a recargar; `#/jugar/tetris` sigue sin selector.
5. **Pulido con `/frontend-design`.** Revisar el canvas en NEÓN y RETRO: la separación de 1 px entre bloques se lee con `shadowBlur` 8 en NEÓN y los bloques se ven planos en RETRO. Si en NEÓN la separación no se lee, se baja `glow` a 1.5 y se anota en Decisiones; los hex no cambian sin volver a medirlos con el script. Verificación: capturas de `ready` de las tres skins a 1440 px y 375 px.
6. **Verificación con Playwright.** Contra `npm run build` + `next start -p 3001`, a 1440 px y 375 px, con `devicePixelRatio` 2. Una captura por skin. Añadir a este spec la sección "Resultado de la verificación".

## Criterios de aceptación

Los puntos se dan en coordenadas lógicas del canvas (800×600); con `devicePixelRatio` 2 se leen en el doble.
En `ready` del nivel 1, el centro de cada bloque de la columna 0 está en `x = 112` e `y = 92, 116, 140, 164, 188, 212` (filas 0–5), la paleta ocupa `x 359.5–440.5`, `y 560–574`, y la pelota está centrada en `(400, 552)`.
La paleta se comprueba contando píxeles con el hex exacto en su caja, porque el halo de la pelota (`shadowBlur` 24 en NEÓN) puede teñir los más cercanos.

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `lib/arkanoid/config.ts` exporta `SKINS` con las claves `clasico`, `neon` y `retro`, y no exporta `BLOCK_COLORS` ni `COLORS`.
- [ ] `SKINS.clasico` tiene `bg "#000"`, `paddle "#00f5ff"`, `ball "#e6e9ff"`, `blocks` `red "#ff006e"`, `yellow "#f5ff00"`, `cyan "#00f5ff"`, `green "#00ff88"`, `magenta "#aa00ff"`, `hotpink "#ffae00"`, `gray "#c7d0e0"`, `shine "rgba(255, 255, 255, 0.12)"` y `glow 1`, los mismos valores que en `main`.
- [ ] `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/arkanoid/*.ts` solo devuelve líneas de `lib/arkanoid/config.ts`.
- [ ] `arkanoidEngine.skins === SKINS` y `createArkanoidGame` devuelve un objeto con `setSkin`.
- [ ] En `#/jugar/arkanoid` aparece el grupo "SKIN" con CLÁSICO, NEÓN y RETRO, en ese orden, y CLÁSICO con `aria-pressed="true"` sin nada guardado.
- [ ] Con CLÁSICO, la captura de `ready` es idéntica píxel a píxel a la de `main` (ARKANOID no tiene nada aleatorio en `ready`).
- [ ] Con CLÁSICO, en `ready`: el punto (2, 2) es `#000000`; los centros de los bloques de las filas 0–5 son `#ff006e`, `#f5ff00`, `#00f5ff`, `#aa00ff`, `#ffae00` y `#00ff88`; la caja de la paleta tiene píxeles `#00f5ff`; el centro de la pelota es `#e6e9ff`.
- [ ] Con NEÓN, en `ready`: el punto (2, 2) es `#0a0418`; los centros de los bloques de las filas 0–5 son `#ff2bd6`, `#ff9e2c`, `#2de2ff`, `#b14bff`, `#ff5c8a` y `#4d7bff`; la caja de la paleta tiene píxeles `#ff2bd6`; el centro de la pelota es `#fdf3ff`.
- [ ] Con RETRO, en `ready`: el punto (2, 2) es `#030d05`; los centros de los bloques de las filas 0–5 son `#3fbf4a`, `#9fd0aa`, `#2ee6a0`, `#238b45`, `#e0ff9a` y `#7dff6e`; la caja de la paleta tiene píxeles `#7dff6e`; el centro de la pelota es `#eaffe4`.
- [ ] Con `loadLevel(2)` en lugar de `loadLevel(1)` en la fase inicial, en un cambio local sin commitear, el centro del bloque de la fila 0, columna 4 (punto (368, 92)) es `#c7d0e0` en CLÁSICO, `#e0c8ff` en NEÓN y `#c8ff5a` en RETRO.
- [ ] Con RETRO, el punto (112, 82) de la franja de brillo del bloque de la fila 0 es `#3fbf4a`, el mismo que el centro del bloque.
- [ ] Hay una captura de Playwright de `ready` por skin (CLÁSICO, NEÓN, RETRO) en la sección "Resultado de la verificación".
- [ ] Elegir NEÓN guarda `localStorage.getItem("av:skin:arkanoid") === "neon"`, y al recargar `#/jugar/arkanoid` el canvas arranca con `#0a0418` y NEÓN tiene `aria-pressed="true"`.
- [ ] Elegir NEÓN en ARKANOID no cambia `av:skin:asteroids` ni la skin con la que arranca `#/jugar/asteroids`.
- [ ] Con `av:skin:arkanoid = "rosa"`, el player arranca en CLÁSICO.
- [ ] Con `localStorage.getItem` y `setItem` forzados a lanzar (`addInitScript`), `#/jugar/arkanoid` arranca en CLÁSICO, el selector cambia la skin durante la sesión y la consola no muestra errores.
- [ ] Con la partida en marcha y la puntuación por encima de 0, pausar y elegir RETRO repinta el canvas detrás de EN PAUSA (el canvas, leído con `getImageData`, tiene `#030d05` en el punto (2, 2)) sin cambiar la puntuación, las vidas ni el nivel del HUD; REANUDAR sigue con los mismos bloques vivos y la pelota en la misma posición.
- [ ] Cambiar de skin durante la partida, sin pausar, no cambia la fase ni el HUD, y una explosión en curso pasa al color de la nueva skin en el frame siguiente.
- [ ] Tras hacer clic en RETRO en `ready`, pulsar Espacio empieza la partida y la skin sigue en RETRO.
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] En `gameover` con NEÓN, los bloques que quedan siguen en sus colores NEÓN detrás del modal.
- [ ] El HUD, el CRT, los botones y el modal se ven igual con las tres skins.
- [ ] A 375 px el selector cabe sin scroll horizontal en `#/jugar/arkanoid`.
- [ ] Con NEÓN y `devicePixelRatio` 2 a 375 px, ningún frame pasa de 16 ms con los 60 bloques del nivel 1 y una explosión en pantalla.
- [ ] `#/jugar/tetris` y `#/jugar/snake` se ven igual que antes de este spec.
- [ ] La consola del navegador no muestra errores al abrir, cambiar de skin, jugar y salir de `#/jugar/arkanoid`.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** CLÁSICO idéntica a `BLOCK_COLORS` y `COLORS` actuales, con `shine` `rgba(255, 255, 255, 0.12)` y `glow` 1. Todas sus claves pasan 3:1 (mínimo 4.15:1, el violeta `#aa00ff`), así que no hay que proponer ningún cambio del aspecto por defecto.
- **Sí:** `blocks: Record<BlockColor, string>` dentro de la paleta, con las mismas claves de `levels.ts`. Si a una skin le falta un tipo de bloque, no compila. Decisión del agente (skin-designer); revisar.
- **Sí:** las cuatro constantes de glow se quedan en `engine.ts` y se multiplican por `palette.glow`. Solo `engine.ts` dibuja en ARKANOID; no hace falta exportarlas.
- **Sí:** NEÓN sin verde, sin amarillo y sin plata: magenta `#ff2bd6`, naranja atardecer `#ff9e2c`, cian `#2de2ff`, azul eléctrico `#4d7bff`, violeta `#b14bff`, rosa coral `#ff5c8a` y lavanda `#e0c8ff`, sobre `#0a0418` con `glow` 2. Es un muro de atardecer synthwave que se nota distinto del arcoíris de CLÁSICO a primera vista. Decisión del agente (skin-designer); revisar.
- **No:** NEÓN con los mismos siete matices de CLÁSICO, más saturados. CLÁSICO ya usa colores neón; sería un ajuste de tono.
- **Sí:** en NEÓN la paleta es magenta `#ff2bd6`, igual que la nave de ASTEROIDS en NEÓN. El elemento del jugador tiene el mismo color en toda la familia. Decisión del agente (skin-designer); revisar.
- **Sí:** en NEÓN el bloque `hotpink` pasa a rosa coral `#ff5c8a`. En CLÁSICO esa clave es naranja (`#ffae00`); en NEÓN el naranja ya lo lleva `yellow`, y el rosa encaja con el nombre original de `levels.js`. Decisión del agente (skin-designer); revisar.
- **Sí:** en NEÓN `shine` es `rgba(253, 243, 255, 0.18)`, un poco más fuerte y rosado que el de CLÁSICO, para que la franja se lea bajo un halo doble. Decisión del agente (skin-designer); revisar.
- **Sí:** RETRO de fósforo verde con siete tonos de bloque distintos, en un solo matiz con variaciones hacia menta, salvia y lima, y `glow` 0.2. Mantiene la familia del SPEC 11 y cumple la regla de que los tipos de bloque sean todos distintos. Decisión del agente (skin-designer); revisar.
- **Sí:** RETRO usa 9 hex en total (`#030d05`, `#238b45`, `#3fbf4a`, `#9fd0aa`, `#2ee6a0`, `#7dff6e`, `#c8ff5a`, `#e0ff9a`, `#eaffe4`), por encima de los 4–6 de la guía de estilo. Con 7 tipos de bloque distintos, más fondo y pelota, el mínimo posible es 9. Se prioriza la regla de distinción, que es la que se comprueba. Decisión del agente (skin-designer); revisar.
- **No:** RETRO de 6 colores en la que varios tipos de bloque comparten tono. Sería más fiel a la guía, pero en el nivel 1 dos de las seis filas saldrían iguales y la regla "todos distintos" fallaría. Si se prefiere, se cambia aquí antes de aprobar: `red` y `gray` podrían compartir tono sin coincidir nunca en un mismo nivel, pero haría falta compartir otra pareja que sí coincide en algún nivel.
- **No:** RETRO ámbar o Game Boy. Se mantiene el fósforo verde del SPEC 11 para que la familia RETRO sea la misma en todos los juegos.
- **Sí:** en RETRO `shine` es `rgba(0, 0, 0, 0)`: los bloques y la paleta se ven planos, sin franja. La guía pide RETRO plano y sin degradados. Decisión del agente (skin-designer); revisar.
- **No:** quitar el `fillRect` del brillo cuando `shine` es transparente. Un rectángulo transparente por bloque no cuesta nada y mantiene un único camino de dibujo.
- **Sí:** en RETRO el bloque `magenta` es el más oscuro (`#238b45`, 4.56:1), como en CLÁSICO. El resto de tonos se reparte para separar al máximo las filas contiguas (ΔE mínimo 34.9), no para copiar el orden de brillo de CLÁSICO. Decisión del agente (skin-designer); revisar.
- **No:** RETRO con el orden de brillo de CLÁSICO (`yellow` el más claro). Con siete verdes, `yellow` y `cyan`, contiguas en el nivel 1, quedaban casi iguales (ΔE 26.0).
- **Sí:** RETRO reutiliza cuatro hex de la familia del SPEC 11 (`#3fbf4a`, `#7dff6e`, `#c8ff5a`, `#eaffe4`). Sin esa condición la separación mínima sube de 34.9 a 37.5, pero se pierden `#3fbf4a` y `#c8ff5a`. Se prioriza la coherencia con ASTEROIDS. Decisión del agente (skin-designer); revisar.
- **Sí:** `ball` nunca coincide con un bloque y `paddle` sí, como hoy en CLÁSICO. La pelota pasa por delante de los bloques; la paleta va sola abajo.
- **Sí:** `setSkin` en pausa dibuja un frame sin `update`, como en ASTEROIDS (SPEC 11).
- **Sí:** el selector sale del SPEC 11 sin tocar `GamePlayer.tsx`: basta con declarar `skins`. Así todos los juegos con skins comparten el mismo selector.

## Riesgos

| Riesgo                                                                                 | Mitigación                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| El SPEC 11 no está implementado cuando se ejecuta este spec.                           | El paso 1 del plan lo comprueba y para.                                                                                                                                                                         |
| El criterio del SPEC 11 "`#/jugar/arkanoid` no muestra el selector" deja de cumplirse. | Es correcto: ese criterio describe el estado tras el SPEC 11. Este spec lo sustituye por el criterio del selector en `#/jugar/arkanoid`.                                                                        |
| `shadowBlur` 8 en 60 bloques con `devicePixelRatio` 2 baja el rendimiento en NEÓN.     | Criterio de 16 ms por frame a 375 px. Si falla, NEÓN baja a `glow` 1.5 (`shadowBlur` 6 en bloques), dentro del rango, y se anota.                                                                               |
| El halo de 8 px en NEÓN tapa la separación de 1 px entre bloques.                      | Paso 5 del plan. Si no se lee, `glow` 1.5. Los centros de bloque siguen dando el hex exacto, porque la sombra no llega a 11 px del borde.                                                                       |
| Los siete verdes de RETRO cuestan de distinguir en pantallas con poco contraste.       | Las filas contiguas de cada nivel se separan por brillo o por matiz (tabla "Distinción entre bloques"). Todos los bloques valen lo mismo (10 puntos, un golpe), así que confundir dos no cambia la jugabilidad. |
| El foco queda en un botón del selector y Espacio lo activa.                            | El input de ARKANOID hace `preventDefault` de Espacio mientras captura, como con REANUDAR (SPEC 07). Criterio de Espacio tras el clic en RETRO.                                                                 |

## Lo que **no** entra en este spec

- El sistema de skins del SPEC 11.
- Skins de TETRIS y SNAKE.
- Hacer obligatorios `skins` y `setSkin`.
- Ampliar la tabla "Familias de color" de `engine-contract.md`.
- Cambios de jugabilidad o de niveles.
- Cambios en la UI del sitio según la skin.
- Sprites, texturas y degradados.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
