# SPEC 13 — Skins de SNAKE

> **Estado:** Implemented
> **Depende de:** SPEC 11, SPEC 10
> **Fecha:** 2026-10-19
> **Objetivo:** Dar a SNAKE las tres skins del canvas (CLÁSICO, NEÓN y RETRO), elegibles en `#/jugar/snake` y guardadas en `av:skin:snake`, con el contrato del SPEC 11.

## Por qué existe este spec

El SPEC 11 fija el sistema de skins y lo aplica solo a ASTEROIDS.
SNAKE sigue pintando con un único `COLORS` fijo en `lib/snake/config.ts` y no muestra selector.
Este spec le da sus tres skins sin redefinir el contrato: `SKINS: Record<SkinId, SnakePalette>`, `skins: SKINS` en la definición y `setSkin` en el motor.
SNAKE tiene una particularidad: la fruta es un sprite a todo color de `public/games/snake/fruits.png`, y una paleta no lo recolorea.
NEÓN mantiene el sprite y RETRO lo sustituye por el círculo que hoy solo se dibuja si el PNG no carga.
CLÁSICO reproduce byte a byte los colores actuales: quien no toque el selector ve SNAKE exactamente como antes.

## Alcance

**Dentro:**

- `lib/snake/config.ts`: tipo `SnakePalette` y `SKINS: Record<SkinId, SnakePalette>` con las tres skins; desaparece `COLORS`.
- `lib/snake/engine.ts` leyendo de la paleta activa, con cada `shadowBlur` escalado por `palette.glow`.
- `lib/snake/engine.ts`: la fruta se dibuja como sprite o como círculo según `palette.fruitSprite`.
- `setSkin` en caliente en el motor de SNAKE, con redibujado en pausa.
- `lib/snake/definition.ts` con `skins: SKINS`, lo que activa el selector CLÁSICO / NEÓN / RETRO del SPEC 11 en `#/jugar/snake`.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cualquier cambio en `lib/engines/skins.ts`, `lib/engines/types.ts`, `GameCanvas.tsx`, `GamePlayer.tsx` o el contrato de `nuevo-juego`: son del SPEC 11.
- Skins de TETRIS y ARKANOID (cada uno en su spec).
- Hacer obligatorios `EngineDefinition.skins` y `GameEngine.setSkin`: lo hace el spec que dé skins al último juego sin ellas.
- Recolorear o teñir los sprites de `fruits.png`, o añadir sprites propios de una skin.
- Usar las filas realistas de `fruits.png`.
- Cambiar la UI del sitio según la skin.

## Modelo de datos

### Tipos que se reutilizan (SPEC 11)

```ts
import type { SkinId } from "@/lib/engines/skins"; // "clasico" | "neon" | "retro"
// EngineDefinition.skins?: Record<SkinId, unknown>
// EngineDefinition.create(canvas, callbacks, skin: SkinId)
// GameEngine.setSkin?: (skin: SkinId) => void
```

- SNAKE no añade nada al contrato.
- `createSnakeGame(canvas, callbacks, skin = DEFAULT_SKIN): Required<GameEngine>`: si a SNAKE le falta `setSkin`, no compila.

### Paleta de SNAKE (`lib/snake/config.ts`)

```ts
export interface SnakePalette {
  bg: string;
  grid: string; // cuadrícula de 1 px, decorativo
  border: string; // borde del tablero
  body: string;
  head: string;
  eyes: string; // ojos de 4×4 sobre la cabeza
  fruitGlow: string; // halo del sprite de la fruta, decorativo
  fruitFallback: string; // círculo de la fruta: si fruitSprite es false o si el PNG no carga
  fruitSprite: boolean; // true: sprite de fruits.png; false: círculo fruitFallback
  glow: number; // multiplicador de shadowBlur; 1 = el actual
}

export const SKINS: Record<SkinId, SnakePalette> = {
  clasico: {
    bg: "#000",
    grid: "rgba(0, 245, 255, 0.06)",
    border: "#00f5ff",
    body: "#00ff88",
    head: "#e6e9ff",
    eyes: "#000",
    fruitGlow: "rgba(230, 233, 255, 0.45)",
    fruitFallback: "#ff006e",
    fruitSprite: true,
    glow: 1,
  },
  neon: {
    bg: "#0a0418",
    grid: "rgba(177, 75, 255, 0.1)",
    border: "#b14bff",
    body: "#ff2bd6",
    head: "#2de2ff",
    eyes: "#0a0418",
    fruitGlow: "rgba(253, 243, 255, 0.45)",
    fruitFallback: "#ff9e2c",
    fruitSprite: true,
    glow: 2,
  },
  retro: {
    bg: "#030d05",
    grid: "rgba(63, 191, 74, 0.1)",
    border: "#7dff6e",
    body: "#3fbf4a",
    head: "#eaffe4",
    eyes: "#030d05",
    fruitGlow: "rgba(200, 255, 90, 0.45)",
    fruitFallback: "#c8ff5a",
    fruitSprite: false,
    glow: 0.2,
  },
};
```

- `COLORS` desaparece de `lib/snake/config.ts`; `SKINS.clasico` es su sustituto, con los mismos ocho valores.
- `fruitSprite` es la única clave que no es un color: decide cómo se dibuja la fruta en cada skin.
- Si el PNG dispara `error`, la fruta se dibuja como círculo `fruitFallback` en cualquier skin, como hoy.
- El PNG se carga siempre, también en RETRO, para que cambiar a CLÁSICO o NEÓN en caliente muestre el sprite sin esperar.

### Contraste

Medido con `node .claude/scripts/contrast.mjs`.
Umbral 3:1 contra el `bg` para los elementos de juego.
SNAKE no dibuja texto en el canvas, así que no hay ninguna clave con umbral 4.5:1.
Los ojos se miden contra la cabeza, que es su fondo (se pasa `eyes` como bg y `head` como color: el ratio es simétrico).

| Clave              | CLÁSICO                                           | NEÓN                                              | RETRO                                                          | Umbral |
| ------------------ | ------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- | ------ |
| `bg`               | `#000` · lum 0.0000                               | `#0a0418` · lum 0.0022                            | `#030d05` · lum 0.0032                                         | ≤ 0.03 |
| `border`           | `#00f5ff` · 15.50:1                               | `#b14bff` · 5.10:1                                | `#7dff6e` · 15.42:1                                            | 3:1    |
| `body`             | `#00ff88` · 15.66:1                               | `#ff2bd6` · 6.29:1                                | `#3fbf4a` · 8.24:1                                             | 3:1    |
| `head`             | `#e6e9ff` · 17.46:1                               | `#2de2ff` · 12.87:1                               | `#eaffe4` · 18.73:1                                            | 3:1    |
| `eyes` (vs `head`) | `#000` · 17.46:1                                  | `#0a0418` · 12.87:1                               | `#030d05` · 18.73:1                                            | 3:1    |
| `fruitFallback`    | `#ff006e` · 5.48:1                                | `#ff9e2c` · 9.76:1                                | `#c8ff5a` · 16.84:1                                            | 3:1    |
| `grid`             | `rgba(0, 245, 255, 0.06)` · 1.07:1 · decorativo   | `rgba(177, 75, 255, 0.1)` · 1.09:1 · decorativo   | `rgba(63, 191, 74, 0.1)` · 1.14:1 · decorativo                 | exento |
| `fruitGlow`        | `rgba(230, 233, 255, 0.45)` · 3.84:1 · decorativo | `rgba(253, 243, 255, 0.45)` · 4.22:1 · decorativo | `rgba(200, 255, 90, 0.45)` · 4.01:1 · decorativo, no se dibuja | exento |
| `fruitSprite`      | `true`                                            | `true`                                            | `false`                                                        | —      |
| `glow`             | 1                                                 | 2                                                 | 0.2                                                            | —      |

- Contraste más bajo por skin (no decorativos): CLÁSICO 5.48:1 (`fruitFallback`), NEÓN 5.10:1 (`border`), RETRO 8.24:1 (`body`).
- CLÁSICO pasa todos los umbrales: no hay que proponer ningún cambio del aspecto por defecto.
- Los sprites de `fruits.png` no son de la paleta y no se miden; en CLÁSICO y NEÓN los despega del fondo el halo `fruitGlow`, como hoy.
- En `gameover` la serpiente se dibuja con `globalAlpha` 0.35 (`GAMEOVER_ALPHA`): es un estado atenuado detrás del modal, no un color de la paleta, y no se mide.
- La cabeza destaca sobre el cuerpo en las tres skins: CLÁSICO por tono (blanco tinta sobre verde), NEÓN por tono y brillo (cian 12.87:1 sobre magenta 6.29:1) y RETRO por brillo (casi blanco 18.73:1 sobre verde apagado 8.24:1).
- Colores que el jugador distingue entre sí (borde, cuerpo, cabeza y fruta) son todos distintos en cada skin.
- RETRO usa 5 hex más la cuadrícula translúcida del verde apagado: `#030d05`, `#3fbf4a`, `#7dff6e`, `#c8ff5a` y `#eaffe4`. Los ojos son del color del `bg` y `fruitGlow` no se dibuja.

### Glow

Las constantes de `engine.ts` pasan a ser la base y se multiplican por `palette.glow`:

| Constante (`lib/snake/engine.ts`) | Base | CLÁSICO (1) | NEÓN (2) | RETRO (0.2) |
| --------------------------------- | ---- | ----------- | -------- | ----------- |
| `GLOW_BODY` (línea 46)            | 10   | 10          | 20       | 2           |
| `GLOW_HEAD` (línea 47)            | 12   | 12          | 24       | 2.4         |
| `GLOW_BORDER` (línea 48)          | 12   | 12          | 24       | 2.4         |
| `GLOW_FALLBACK` (línea 49)        | 12   | 12          | 24       | 2.4         |
| `GLOW_FRUIT` (línea 52)           | 10   | 10          | 20       | 2           |

- `shadowBlur = GLOW_X * palette.glow`; con `glow` 0, el código pone `shadowBlur = 0` y no dibuja sombra.
- Las constantes se quedan en `engine.ts`: SNAKE no tiene `entities.ts` que las comparta.

### Usos de color de SNAKE que pasan a leer la paleta

No hay hex sueltos fuera de `config.ts`: `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/snake/*.ts` solo devuelve `lib/snake/config.ts:26-33`.
Sí hay lecturas de `COLORS` que pasan a la paleta activa (`let palette = SKINS[skin]` dentro de `createSnakeGame`):

| Archivo:línea                 | Hoy                                                    | Después                                                    |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| `lib/snake/engine.ts:3`       | `import { COLORS … }`                                  | `import { SKINS … }` y `DEFAULT_SKIN` de `skins.ts`        |
| `lib/snake/engine.ts:63-66`   | `createSnakeGame(canvas, callbacks): GameEngine`       | tercer parámetro `skin` y `Required<GameEngine>`           |
| `lib/snake/engine.ts:196`     | `COLORS.grid`                                          | `palette.grid`                                             |
| `lib/snake/engine.ts:212,215` | `COLORS.border`                                        | `palette.border`                                           |
| `lib/snake/engine.ts:214`     | `GLOW_BORDER`                                          | `GLOW_BORDER * palette.glow`                               |
| `lib/snake/engine.ts:225`     | `if (imageFailed)`                                     | `if (imageFailed \|\| !palette.fruitSprite)`               |
| `lib/snake/engine.ts:226,228` | `COLORS.fruitFallback`                                 | `palette.fruitFallback`                                    |
| `lib/snake/engine.ts:227`     | `GLOW_FALLBACK`                                        | `GLOW_FALLBACK * palette.glow`                             |
| `lib/snake/engine.ts:241-242` | `GLOW_FRUIT`, `COLORS.fruitGlow`                       | `GLOW_FRUIT * palette.glow`, `palette.fruitGlow`           |
| `lib/snake/engine.ts:301`     | `COLORS.eyes`                                          | `palette.eyes`                                             |
| `lib/snake/engine.ts:309-310` | `COLORS.body`, `COLORS.head`, `GLOW_BODY`, `GLOW_HEAD` | `palette.body`, `palette.head`, cada glow `* palette.glow` |
| `lib/snake/engine.ts:317`     | `COLORS.bg`                                            | `palette.bg`                                               |

- El comentario de `lib/snake/engine.ts:96-97` ("un círculo magenta") pasa a "un círculo `fruitFallback`".
- En RETRO el círculo se dibuja aunque el PNG aún no haya cargado: la condición de `fruitSprite` va antes de la de `image.complete`.

### `setSkin` en SNAKE

- `setSkin(skin)` hace `palette = SKINS[skin]` y no toca nada más: ni fase, ni serpiente, ni dirección, ni cola de giros, ni fruta, ni sprite elegido, ni acumulador, ni puntuación, ni nivel.
- Si `paused` es `true` (sin rAF), llama a `draw()` una vez, para que el cambio se vea detrás del overlay EN PAUSA.
- Si no está en pausa, el cambio se ve en el frame siguiente; en `gameover` el rAF sigue vivo y también se repinta.
- Después de `destroy`, no hace nada.

## Plan de implementación

Requiere el SPEC 11 en `Implemented`: `lib/engines/skins.ts`, el tercer parámetro de `create`, la prop `skin` de `GameCanvas` y el selector de `GamePlayer` ya existen.

1. **Paleta de SNAKE, sin cambio visual.** Añadir `SnakePalette` y `SKINS` a `lib/snake/config.ts` y borrar `COLORS`. En `engine.ts`, `createSnakeGame(canvas, callbacks, skin = DEFAULT_SKIN)` guarda `let palette = SKINS[skin]` y sustituye cada lectura de la tabla "Usos de color", con los glow multiplicados. Verificación: `npm run build` pasa; `grep -n COLORS lib/snake/*.ts` no devuelve nada; `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/snake/*.ts` solo devuelve líneas de `config.ts`; `#/jugar/snake` se ve igual que en `main`.
2. **Fruta según la skin.** Condición `imageFailed || !palette.fruitSprite` en `drawFruit`, antes de comprobar la carga del PNG. Verificación: forzando `create(…, "retro")` en un cambio local sin commitear, la fruta de (17, 9) es un círculo `#c8ff5a`.
3. **`setSkin` y definición.** `setSkin` en el objeto que devuelve `createSnakeGame`, con el redibujado en pausa; tipo de retorno `Required<GameEngine>`; `skins: SKINS` en `snakeEngine` (`lib/snake/definition.ts`). Verificación: `npm run build` pasa.
4. **Selector en `#/jugar/snake`.** No se toca `GamePlayer.tsx`: el selector del SPEC 11 aparece porque `snakeEngine.skins` existe. Verificación: en `npm run dev`, `#/jugar/snake` muestra el grupo "SKIN" con CLÁSICO, NEÓN y RETRO; NEÓN cambia el canvas al instante y sobrevive a recargar.
5. **Pulido con `/frontend-design`.** Revisar NEÓN y RETRO a 1440 px y 375 px: halo de la serpiente, legibilidad de los ojos, el círculo RETRO y la cuadrícula. Solo se ajustan valores de `SKINS.neon` y `SKINS.retro`, y cada hex nuevo se vuelve a medir con `node .claude/scripts/contrast.mjs` y se anota en la tabla de contraste. Verificación: capturas a 1440 px y 375 px.
6. **Verificación con Playwright.** Contra `npm run build` + `next start -p 3001`, a 1440 px y 375 px, con `devicePixelRatio` 2. Una captura por skin en `ready` y otra en partida. Añadir a este spec la sección "Resultado de la verificación".

## Criterios de aceptación

Las coordenadas son lógicas (768×576); con `devicePixelRatio` 2 se leen en el doble.
Celdas de referencia en `ready`: cabeza (6, 9), cuerpo (5, 9), fruta (17, 9), celda vacía (12, 4).

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `lib/snake/config.ts` exporta `SnakePalette` y `SKINS` con las claves `clasico`, `neon` y `retro`, y no exporta `COLORS`.
- [ ] `SKINS.clasico` tiene `bg "#000"`, `grid "rgba(0, 245, 255, 0.06)"`, `border "#00f5ff"`, `body "#00ff88"`, `head "#e6e9ff"`, `eyes "#000"`, `fruitGlow "rgba(230, 233, 255, 0.45)"`, `fruitFallback "#ff006e"`, `fruitSprite true` y `glow 1`, los mismos valores que `COLORS` en `main`.
- [ ] `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/snake/*.ts` solo devuelve líneas de `lib/snake/config.ts`.
- [ ] `snakeEngine.skins === SKINS` y `createSnakeGame` devuelve `Required<GameEngine>`.
- [ ] En `#/jugar/snake` aparece el grupo "SKIN" con CLÁSICO, NEÓN y RETRO, en ese orden, y CLÁSICO con `aria-pressed="true"` sin nada guardado.
- [ ] Con CLÁSICO, en `ready`: el píxel (400, 144) es `#000000`, el (208, 304) de la cabeza es `#e6e9ff`, el (176, 304) del cuerpo es `#00ff88` y el (1, 304) del borde es `#00f5ff`.
- [ ] Con CLÁSICO, la captura de `ready` es igual a la de `main` píxel a píxel salvo la celda (17, 9) y su halo, porque el sprite de la fruta es aleatorio.
- [ ] Con CLÁSICO, la celda (17, 9) muestra un sprite de `fruits.png` y ningún píxel `#ff006e`.
- [ ] Con NEÓN, en `ready`: el píxel (400, 144) es `#0a0418`, el (208, 304) de la cabeza es `#2de2ff`, el (176, 304) del cuerpo es `#ff2bd6` y el (1, 304) del borde es `#b14bff`.
- [ ] Con NEÓN, la celda (17, 9) muestra un sprite de `fruits.png` y ningún píxel `#ff9e2c`.
- [ ] Con NEÓN, los ojos de la cabeza tienen píxeles `#0a0418`.
- [ ] Con RETRO, en `ready`: el píxel (400, 144) es `#030d05`, el (208, 304) de la cabeza es `#eaffe4`, el (176, 304) del cuerpo es `#3fbf4a`, el (1, 304) del borde es `#7dff6e` y el (560, 304), centro de la fruta, es `#c8ff5a`.
- [ ] Con RETRO, la fruta es un círculo de radio 10 desde el primer frame, aunque `fruits.png` aún no haya cargado.
- [ ] Con RETRO, los ojos de la cabeza tienen píxeles `#030d05`.
- [ ] Con `fruits.png` bloqueado (`page.route` con `abort`), la fruta es un círculo `#ff006e` en CLÁSICO, `#ff9e2c` en NEÓN y `#c8ff5a` en RETRO, y la consola no muestra errores sin capturar.
- [ ] Hay una captura de Playwright por skin (CLÁSICO, NEÓN, RETRO) en la sección "Resultado de la verificación".
- [ ] Elegir NEÓN guarda `localStorage.getItem("av:skin:snake") === "neon"`, y al recargar `#/jugar/snake` el píxel (400, 144) es `#0a0418` y NEÓN tiene `aria-pressed="true"`.
- [ ] Con `av:skin:snake = "rosa"`, el player arranca en CLÁSICO.
- [ ] Con `localStorage.getItem` y `setItem` forzados a lanzar (`addInitScript`), `#/jugar/snake` arranca en CLÁSICO, el selector cambia la skin durante la sesión y la consola no muestra errores.
- [ ] Elegir RETRO en `#/jugar/snake` no cambia `av:skin:asteroids`, y viceversa.
- [ ] Con la partida en marcha y la puntuación por encima de 0, pausar y elegir RETRO repinta el canvas detrás de EN PAUSA (píxel (400, 144) `#030d05`) sin cambiar la puntuación ni el nivel del HUD; REANUDAR sigue con la serpiente en la misma posición, la misma dirección y la misma fruta.
- [ ] Cambiar de skin durante la partida, sin pausar, no cambia la fase, el HUD ni la longitud de la serpiente, y el canvas cambia de colores en el frame siguiente.
- [ ] Cambiar de CLÁSICO a RETRO y volver a CLÁSICO en la misma partida muestra el mismo sprite de fruta que antes del cambio.
- [ ] Tras hacer clic en NEÓN en `ready`, pulsar Espacio empieza la partida y la skin sigue en NEÓN.
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] El HUD, el CRT, los botones y el modal de `#/jugar/snake` se ven igual con las tres skins.
- [ ] Con NEÓN, `devicePixelRatio` 2 a 375 px y una serpiente de 150 segmentos (`START_SNAKE` alargado en un cambio local sin commitear), ningún frame pasa de 16 ms.
- [ ] La consola del navegador no muestra errores al abrir, cambiar de skin, jugar y salir de `#/jugar/snake`.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** la paleta de SNAKE reúne las ocho constantes de `COLORS` más `fruitSprite` y `glow`. Es el contrato del SPEC 11; SNAKE no tiene colores sueltos fuera de `config.ts`.
- **Sí:** CLÁSICO idéntica a los `COLORS` actuales y con `glow` 1. Todas sus claves no decorativas pasan el contraste (mínimo 5.48:1), así que no hay que proponer ningún cambio del aspecto por defecto.
- **Sí:** NEÓN con cuerpo magenta `#ff2bd6`, cabeza cian `#2de2ff`, borde violeta `#b14bff`, fondo `#0a0418`, cuadrícula violeta al 10 % y `glow` 2. Sale de la familia NEÓN del SPEC 11 y cambia cada papel de CLÁSICO (cuerpo verde, cabeza blanca, borde cian), para que se note distinta a primera vista. Decisión del agente (skin-designer); revisar.
- **No:** NEÓN con la cabeza blanco rosado `#fdf3ff`. Repetiría la cabeza blanca de CLÁSICO; el cian sobre magenta es más synthwave y destaca más (12.87:1 frente a 6.29:1 del cuerpo).
- **No:** NEÓN con el borde cian. Se parecería al borde `#00f5ff` de CLÁSICO.
- **Sí:** NEÓN mantiene los sprites de `fruits.png`, con un halo blanco rosado `rgba(253, 243, 255, 0.45)`. Las frutas a todo color encajan en un synthwave saturado, y el halo cumple la misma función que en CLÁSICO: despegar los sprites oscuros (brócoli, pimiento) del fondo. Decisión del agente (skin-designer); revisar.
- **No:** halo naranja en NEÓN. Es el mismo tono que `fruitFallback` de NEÓN (`#ff9e2c`) y medía 2.67:1.
- **Sí:** RETRO de fósforo verde, monocroma, con la familia del SPEC 11: cuerpo `#3fbf4a`, cabeza `#eaffe4`, borde `#7dff6e`, fruta `#c8ff5a`, fondo `#030d05` y `glow` 0.2. La jerarquía es de brillo: la cabeza es el casi blanco, el cuerpo el verde más apagado y la fruta el verde caliente. Decisión del agente (skin-designer); revisar.
- **Sí:** RETRO no dibuja el sprite: la fruta es el círculo de fallback, de radio 10, en `#c8ff5a`. El sprite a todo color rompería la paleta corta de RETRO (como mucho 4–6 colores) y el monocromo de fósforo. El círculo ya existe en el motor, así que no hace falta ningún asset nuevo. Decisión del agente (skin-designer); revisar.
- **No:** RETRO con el sprite tal cual. Doce tonos de fruta sobre un CRT verde no parecen hardware real.
- **No:** teñir el sprite de verde con un canvas auxiliar y `globalCompositeOperation = "source-in"`. Conservaría la silueta de cada fruta, pero es procesar sprites, que el SPEC 11 deja fuera; si se quiere, va en su propio spec.
- **Sí:** `fruitSprite: boolean` dentro de la paleta. Así la decisión de cómo se dibuja la fruta vive con los colores de cada skin y no en un `if (skin === "retro")` del motor. Decisión del agente (skin-designer); revisar.
- **Sí:** el PNG se carga en todas las skins. Pasar de RETRO a NEÓN en caliente muestra el sprite sin esperar a la red.
- **Sí:** los ojos son del color del `bg` en las tres skins. Es lo que hace CLÁSICO hoy (`#000` sobre `#000`), y el contraste con la cabeza es el mismo que el de la cabeza con el fondo.
- **Sí:** las constantes `GLOW_*` se quedan en `engine.ts` y se multiplican por `palette.glow`. SNAKE no tiene `entities.ts`, así que no hace falta exportarlas.
- **Sí:** el selector de `#/jugar/snake` no exige tocar `GamePlayer.tsx`. El SPEC 11 lo muestra para todo motor con `skins`, y basta con declarar `skins: SKINS`.
- **Sí:** este spec no hace obligatorios `skins` ni `setSkin`. TETRIS sigue sin skins; lo hará el spec que se las dé al último juego.
- **Sí:** verificar contra `next start` y no contra `next dev`, que puede servir un `globals.css` antiguo.

## Riesgos

| Riesgo                                                                                | Mitigación                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` 20 en hasta 432 segmentos con NEÓN baja el rendimiento a dpr 2.          | Criterio de 16 ms por frame con 150 segmentos a 375 px y dpr 2. Si falla, se baja NEÓN a `glow` 1.5 (`shadowBlur` 15 en el cuerpo), dentro del rango 1.5 – 2.5, y se anota en Decisiones. |
| El criterio del SPEC 11 "`#/jugar/snake` no muestra el selector" deja de cumplirse.   | Es lo esperado: este spec lo sustituye para SNAKE. El SPEC 11 no se edita.                                                                                                                |
| El antialiasing del círculo RETRO impide leer `#c8ff5a` en el borde.                  | El criterio lee el centro de la celda (560, 304), donde el círculo es opaco.                                                                                                              |
| El halo del borde (24 en NEÓN) tiñe los píxeles de referencia del fondo.              | La celda vacía de referencia es (12, 4), a más de 140 px de cualquier borde y lejos de la serpiente y de la fruta.                                                                        |
| El foco queda en un botón del selector y Espacio lo activa.                           | El input de SNAKE hace `preventDefault` de Espacio mientras captura (SPEC 10); en pausa, reactivar la misma skin no cambia nada. Criterio de Espacio tras el clic.                        |
| Si el SPEC 11 cambia su contrato antes de implementarse, este spec queda desalineado. | Este spec solo usa `SkinId`, `DEFAULT_SKIN`, `skins` y `setSkin`. Si cambian, se escribe un spec nuevo de skins de SNAKE.                                                                 |

## Lo que **no** entra en este spec

- Cambios en el sistema de skins del SPEC 11 (`skins.ts`, `types.ts`, `GameCanvas`, `GamePlayer`, `nuevo-juego`).
- Skins de TETRIS y ARKANOID.
- Hacer obligatorios `skins` y `setSkin`.
- Teñir, recolorear o sustituir los sprites de `fruits.png`.
- Cambios en la UI del sitio según la skin.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
