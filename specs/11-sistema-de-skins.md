# SPEC 11 — Sistema de skins y skins de ASTEROIDS

> **Estado:** Implemented
> **Depende de:** SPEC 07, SPEC 05
> **Fecha:** 2026-10-17
> **Objetivo:** Crear el sistema de skins del canvas (CLÁSICO, NEÓN y RETRO, elegibles en el player y guardadas por juego) y aplicarlo a ASTEROIDS.

## Por qué existe este spec

Hoy cada juego real pinta su canvas con una única paleta fija, copiada de los tokens de `:root`.
El usuario quiere poder cambiar el aspecto de cada juego sin tocar su jugabilidad: una skin CLÁSICO (la actual), una NEÓN (synthwave) y una RETRO (fósforo de CRT).
No existe `lib/engines/skins.ts` ni ninguna skin en el código, así que este spec fija el contrato.
El usuario pidió empezar por ASTEROIDS.
Por eso el contrato es incremental: un motor declara sus skins de forma opcional, y TETRIS, ARKANOID y SNAKE siguen funcionando igual hasta que tengan su propio spec.
CLÁSICO es la skin por defecto y reproduce byte a byte los colores actuales: quien no toque el selector ve el juego exactamente como antes.

## Alcance

**Dentro:**

- `lib/engines/skins.ts` con `SkinId`, `SKIN_IDS`, `DEFAULT_SKIN`, `SKIN_LABELS`, `isSkinId`, `loadSkin` y `saveSkin`.
- Ampliación de `lib/engines/types.ts`: `EngineDefinition.skins` (opcional), `create` con la skin inicial y `GameEngine.setSkin` (opcional).
- `lib/asteroids/config.ts`: tipo `AsteroidsPalette` y `SKINS: Record<SkinId, AsteroidsPalette>` con las tres skins; desaparece `COLORS`.
- Motor de ASTEROIDS leyendo de la paleta activa, con el glow escalado por `palette.glow`, y `setSkin` en caliente.
- `components/games/GameCanvas.tsx` con la prop `skin`.
- `components/screens/GamePlayer.tsx` con el selector CLÁSICO / NEÓN / RETRO para los motores que declaran `skins`, guardado en `localStorage` con la clave `av:skin:asteroids`.
- Contrato de juegos nuevos: `.claude/skills/nuevo-juego/engine-contract.md`, `.claude/skills/nuevo-juego/spec-template.md`, la línea de paleta de `.claude/skills/nuevo-juego/SKILL.md` y la de `.claude/agents/game-jam.md`.
- Pulido visual del selector con `/frontend-design`.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Skins de TETRIS, ARKANOID y SNAKE (un spec `skins-tetris`, `skins-arkanoid` y `skins-snake` cada uno).
- Hacer obligatorios `EngineDefinition.skins` y `GameEngine.setSkin`, cuando los cuatro motores tengan skins.
- Cambiar la UI del sitio (HUD, CRT, botones, overlays) según la skin.
- Skins en los juegos simulados, que no tienen canvas propio.
- Guardar la skin en Supabase o asociarla al usuario.
- Una skin global para todos los juegos.
- Skins con sprites, fondos dibujados o efectos de postproceso (scanlines en el canvas, aberración cromática).
- Tests unitarios y test runner.

## Modelo de datos

### Tipos compartidos (`lib/engines/skins.ts`, nuevo)

```ts
export const SKIN_IDS = ["clasico", "neon", "retro"] as const;
export type SkinId = (typeof SKIN_IDS)[number];
export const DEFAULT_SKIN: SkinId = "clasico";
export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};
export function isSkinId(value: unknown): value is SkinId;
export function loadSkin(gameId: string): SkinId; // av:skin:{gameId}; DEFAULT_SKIN si falta, no es válida o localStorage falla
export function saveSkin(gameId: string, skin: SkinId): void; // en try/catch; un fallo se ignora en silencio
```

- La clave de `localStorage` es `av:skin:` seguida del id del juego: `av:skin:asteroids`.
- El valor guardado es el `SkinId` tal cual (`"clasico"`, `"neon"` o `"retro"`), sin JSON.
- `loadSkin` y `saveSkin` envuelven cada acceso a `localStorage` en `try/catch`, porque el modo privado de Safari y las cookies bloqueadas lo hacen lanzar.

### Contrato del motor (`lib/engines/types.ts`)

```ts
import type { SkinId } from "./skins";

export interface GameEngine {
  setPaused: (paused: boolean) => void;
  end: () => void;
  destroy: () => void;
  setSkin?: (skin: SkinId) => void; // cambia la paleta en caliente; opcional mientras haya motores sin skins
}

export interface EngineDefinition {
  // …campos actuales sin cambios…
  skins?: Record<SkinId, unknown>; // el SKINS del config.ts del juego; sin él, el player no muestra selector
  create: (
    canvas: HTMLCanvasElement,
    callbacks: EngineCallbacks,
    skin: SkinId,
  ) => GameEngine;
}
```

- `create` recibe siempre la skin inicial; los motores sin skins la ignoran y siguen compilando (TypeScript acepta funciones con menos parámetros).
- `setSkin` cambia la paleta sin reiniciar nada: ni fase, ni puntuación, ni entidades, ni input.
- Si el motor está en pausa (sin rAF), `setSkin` dibuja un frame con la paleta nueva sin llamar a `update`, para que el cambio se vea detrás del overlay EN PAUSA.
- Si no está en pausa, el cambio se ve en el frame siguiente.
- `setSkin` después de `destroy` no hace nada.

### Paleta de ASTEROIDS (`lib/asteroids/config.ts`)

```ts
export interface AsteroidsPalette {
  bg: string;
  ship: string; // nave y su explosión
  bullet: string;
  asteroid: string; // asteroides y su explosión
  powerUp: string; // rombo, texto "3x" y contador "3x N.Ns" del canvas
  thrust: string; // llama del propulsor
  glow: number; // multiplicador de shadowBlur; 1 = el actual (10)
}

export const SKINS: Record<SkinId, AsteroidsPalette> = {
  clasico: {
    bg: "#000",
    ship: "#00f5ff",
    bullet: "#e6e9ff",
    asteroid: "#ff006e",
    powerUp: "#00ff88",
    thrust: "#f5ff00",
    glow: 1,
  },
  neon: {
    bg: "#0a0418",
    ship: "#ff2bd6",
    bullet: "#fdf3ff",
    asteroid: "#b14bff",
    powerUp: "#2de2ff",
    thrust: "#ff9e2c",
    glow: 2,
  },
  retro: {
    bg: "#030d05",
    ship: "#7dff6e",
    bullet: "#eaffe4",
    asteroid: "#3fbf4a",
    powerUp: "#c8ff5a",
    thrust: "#c8ff5a",
    glow: 0.2,
  },
};
```

- `COLORS` desaparece de `lib/asteroids/config.ts`; `SKINS.clasico` es su sustituto, con los mismos seis valores.
- `lib/asteroids/types.ts` pasa a `export type AsteroidsGame = Required<GameEngine>;`, para que ASTEROIDS esté obligado a implementar `setSkin`.
- `lib/asteroids/definition.ts` añade `skins: SKINS`.

Contraste medido con `node .claude/scripts/contrast.mjs`.
Umbral 3:1 para los elementos de juego y 4.5:1 para `powerUp`, porque también es el color del texto "3x" y del contador "3x N.Ns" que se dibujan en el canvas.
Todos los valores pasan también 4.5:1.

| Clave      | CLÁSICO             | NEÓN                   | RETRO                  | Umbral |
| ---------- | ------------------- | ---------------------- | ---------------------- | ------ |
| `bg`       | `#000` · lum 0.0000 | `#0a0418` · lum 0.0022 | `#030d05` · lum 0.0032 | ≤ 0.03 |
| `ship`     | `#00f5ff` · 15.50:1 | `#ff2bd6` · 6.29:1     | `#7dff6e` · 15.42:1    | 3:1    |
| `bullet`   | `#e6e9ff` · 17.46:1 | `#fdf3ff` · 18.63:1    | `#eaffe4` · 18.73:1    | 3:1    |
| `asteroid` | `#ff006e` · 5.48:1  | `#b14bff` · 5.10:1     | `#3fbf4a` · 8.24:1     | 3:1    |
| `powerUp`  | `#00ff88` · 15.66:1 | `#2de2ff` · 12.87:1    | `#c8ff5a` · 16.84:1    | 4.5:1  |
| `thrust`   | `#f5ff00` · 19.19:1 | `#ff9e2c` · 9.76:1     | `#c8ff5a` · 16.84:1    | 3:1    |
| `glow`     | 1 (`shadowBlur` 10) | 2 (`shadowBlur` 20)    | 0.2 (`shadowBlur` 2)   | —      |

- ASTEROIDS no tiene elementos decorativos (ni cuadrícula ni divisores ni brillos).
- Las partículas de explosión usan `ship` o `asteroid` con `globalAlpha` decreciente; se miden con su color opaco.
- Contraste más bajo por skin: CLÁSICO 5.48:1 (`asteroid`), NEÓN 5.10:1 (`asteroid`), RETRO 8.24:1 (`asteroid`).
- RETRO usa 5 colores en total: `#030d05`, `#3fbf4a`, `#7dff6e`, `#c8ff5a` y `#eaffe4`. `powerUp` y `thrust` comparten `#c8ff5a`, porque la llama va pegada a la nave y el power-up es un rombo con "3x": no se confunden.
- En RETRO la jerarquía es de brillo: asteroides el verde más apagado, nave más clara, balas el casi blanco.

### Familias de color (reutilizables en los demás juegos)

| Skin  | `bg`      | Colores de la familia                                                                                      | `glow`    |
| ----- | --------- | ---------------------------------------------------------------------------------------------------------- | --------- |
| NEÓN  | `#0a0418` | magenta `#ff2bd6`, violeta `#b14bff`, cian `#2de2ff`, naranja atardecer `#ff9e2c`, blanco rosado `#fdf3ff` | 1.5 – 2.5 |
| RETRO | `#030d05` | fósforo verde: apagado `#3fbf4a`, medio `#7dff6e`, caliente `#c8ff5a`, casi blanco `#eaffe4`               | 0 – 0.3   |

Esta tabla se copia en `.claude/skills/nuevo-juego/engine-contract.md` para que los juegos nuevos y los specs de skins de TETRIS, ARKANOID y SNAKE partan de los mismos hex.

### Usos de color de ASTEROIDS que pasan a leer la paleta

No hay hex sueltos fuera de `config.ts`.
Sí hay lecturas de `COLORS` y valores de glow fijos que pasan a la paleta activa:

| Archivo:línea                               | Hoy                                            | Después                                                           |
| ------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| `lib/asteroids/entities.ts:13`              | `const GLOW = 10`                              | `GLOW_BASE = 10`; `shadowBlur = GLOW_BASE * palette.glow`         |
| `lib/asteroids/entities.ts:48-49`           | `COLORS.bullet`                                | `palette.bullet`                                                  |
| `lib/asteroids/entities.ts:110-111`         | `COLORS.asteroid`                              | `palette.asteroid`                                                |
| `lib/asteroids/entities.ts:154,158,163`     | `COLORS.powerUp`                               | `palette.powerUp`                                                 |
| `lib/asteroids/entities.ts:253-254`         | `COLORS.ship`                                  | `palette.ship`                                                    |
| `lib/asteroids/entities.ts:273-274`         | `COLORS.thrust`                                | `palette.thrust`                                                  |
| `lib/asteroids/entities.ts:290,296,315-316` | `Particle.color: string` (hex fijo al crearla) | `Particle.kind: "ship" \| "asteroid"`; dibuja con `palette[kind]` |
| `lib/asteroids/engine.ts:113,183`           | `explode(…, COLORS.ship / COLORS.asteroid)`    | `explode(…, "ship" / "asteroid")`                                 |
| `lib/asteroids/engine.ts:215`               | `COLORS.bg`                                    | `palette.bg`                                                      |
| `lib/asteroids/engine.ts:228-230`           | `shadowBlur = 10`, `COLORS.powerUp`            | `shadowBlur = GLOW_BASE * palette.glow`, `palette.powerUp`        |

- Los `draw` de `Bullet`, `Asteroid`, `PowerUp`, `Ship` y `Particle` reciben `palette: AsteroidsPalette` como parámetro.
- `GLOW_BASE` se exporta desde `lib/asteroids/config.ts` para que `engine.ts` y `entities.ts` usen el mismo valor.
- `Particle` guarda el tipo y no el hex, para que una explosión en curso cambie de color con `setSkin` en el frame siguiente.
- Con `glow` 0.2, `shadowBlur` vale 2; con `glow` 0, el código pone `shadowBlur = 0` y no dibuja sombra.

### Componente (`components/games/GameCanvas.tsx`)

- Prop nueva `skin: SkinId`.
- `create(canvas, callbacks, skinRef.current)`: la skin inicial sale de un ref, para que cambiar de skin no vuelva a crear el motor.
- Un efecto con `[skin]` llama a `gameRef.current?.setSkin?.(skin)`.
- JUGAR DE NUEVO remonta el componente con otra `key` y crea el motor con la skin vigente.

### Player (`components/screens/GamePlayer.tsx`)

- `const [skin, setSkin] = useState<SkinId>(() => (engine?.skins ? loadSkin(id) : DEFAULT_SKIN));`
- El inicializador perezoso es seguro: el servidor nunca ve el hash, así que el player solo se renderiza en el cliente (`components/App.tsx`), y `GamePlayer` lleva `key={route.id}`, así que cada juego lee su propia clave.
- Al elegir una skin: `setSkin(next)` y `saveSkin(id, next)`.
- El selector solo se muestra si `isReal && engine.skins`. Hoy, solo en ASTEROIDS.
- Va debajo del CRT y encima de la tira de controles, en un `div.player-skins` con `role="group"` y `aria-label="Skin del canvas"`.
- Contiene la etiqueta "SKIN" y tres `button` con los textos de `SKIN_LABELS` en el orden de `SKIN_IDS`: CLÁSICO, NEÓN, RETRO.
- El botón activo lleva `aria-pressed="true"`; los otros dos, `aria-pressed="false"`.
- Se puede usar en `ready`, durante la partida y en pausa; en `gameover` queda detrás del modal.
- La skin solo cambia el canvas: HUD, CRT, botones, overlays y modal no cambian.

### Textos

| Dónde                  | Texto                  |
| ---------------------- | ---------------------- |
| Etiqueta del selector  | SKIN                   |
| Botones                | CLÁSICO · NEÓN · RETRO |
| `aria-label` del grupo | Skin del canvas        |

### Contrato de juegos nuevos (`.claude/skills/nuevo-juego/`)

- `engine-contract.md` §2: los tipos con `skins`, `setSkin` y el tercer parámetro de `create`.
- `engine-contract.md` §3, **Canvas**: el punto "Paleta neón" se sustituye por "Skins": `config.ts` exporta un tipo de paleta del juego y `SKINS: Record<SkinId, Palette>` con todas sus constantes de color y `glow`; `clasico` usa los tokens de `:root`; `neon` y `retro` parten de la tabla de familias; ningún hex fuera de la paleta; contraste medido con `node .claude/scripts/contrast.mjs` (bg ≤ 0.03 de luminancia, elementos ≥ 3:1, texto del canvas ≥ 4.5:1, colores distinguibles todos distintos); `definition.ts` declara `skins: SKINS` y el motor implementa `setSkin` (tipo `Required<GameEngine>`).
- `engine-contract.md` §3: se añade la tabla "Familias de color" de este spec.
- `spec-template.md`: el punto "Paleta neón del Vault en el canvas" de Alcance pasa a "Tres skins en el canvas (CLÁSICO, NEÓN, RETRO)"; el snippet `COLORS` pasa a `SKINS`; el criterio de colores pasa a uno por skin; la decisión "paleta neón" pasa a "tres skins, CLÁSICO por defecto".
- `SKILL.md`, bloque C: la pregunta de paleta pide también la versión NEÓN y RETRO de cada elemento, a partir de la tabla de familias.
- `.claude/agents/game-jam.md:46`: "en la paleta neón" pasa a "en las paletas de sus tres skins".

## Plan de implementación

1. **Tipos.** Crear `lib/engines/skins.ts` y ampliar `lib/engines/types.ts` con `skins?`, `setSkin?` y el tercer parámetro de `create`. Verificación: `npm run lint` y `npm run build` pasan sin tocar ningún motor.
2. **Paleta de ASTEROIDS, sin cambio visual.** Añadir `AsteroidsPalette`, `GLOW_BASE` y `SKINS` a `lib/asteroids/config.ts` y borrar `COLORS`. Hacer que `createAsteroidsGame(canvas, callbacks, skin = DEFAULT_SKIN)` guarde `let palette = SKINS[skin]` y la pase a cada `draw`; `Particle` con `kind`. Verificación: `npm run build` pasa; `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/asteroids/*.ts` solo devuelve líneas de `config.ts`; `grep -n COLORS lib/asteroids/*.ts` no devuelve nada; `#/jugar/asteroids` se ve igual que en `main`.
3. **`setSkin` y definición.** `AsteroidsGame = Required<GameEngine>`, `setSkin` en el objeto que devuelve `createAsteroidsGame` (con el redibujado en pausa) y `skins: SKINS` en `asteroidsEngine`. Verificación: `npm run build` pasa.
4. **Selector en el player.** Prop `skin` en `GameCanvas.tsx`; estado, `loadSkin`/`saveSkin` y `div.player-skins` en `GamePlayer.tsx`, con estilos mínimos en `app/globals.css` junto a `.player-controls`. Verificación: en `npm run dev`, NEÓN cambia el canvas de ASTEROIDS al instante y sobrevive a recargar; `#/jugar/tetris` no muestra selector.
5. **Contrato de juegos nuevos.** Actualizar `engine-contract.md`, `spec-template.md`, `SKILL.md` y `game-jam.md` como dice "Contrato de juegos nuevos". Verificación: `grep -n "Paleta neón" .claude/skills/nuevo-juego/*.md` no devuelve nada y `grep -n "SKINS" .claude/skills/nuevo-juego/engine-contract.md` sí.
6. **Pulido con `/frontend-design`.** Selector coherente con `.player-controls` y los `.btn` del Vault, legible a 375 px. Verificación: capturas a 1440 px y 375 px sin scroll horizontal.
7. **Verificación con Playwright.** Contra `npm run build` + `next start -p 3001`, a 1440 px y 375 px, con `devicePixelRatio` 2 para leer píxeles exactos. Una captura por skin. Añadir a este spec la sección "Resultado de la verificación".

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `lib/engines/skins.ts` exporta `SKIN_IDS`, `SkinId`, `DEFAULT_SKIN = "clasico"`, `SKIN_LABELS`, `isSkinId`, `loadSkin` y `saveSkin`.
- [ ] `lib/asteroids/config.ts` exporta `SKINS` con las claves `clasico`, `neon` y `retro`, y no exporta `COLORS`.
- [ ] `SKINS.clasico` tiene `bg "#000"`, `ship "#00f5ff"`, `bullet "#e6e9ff"`, `asteroid "#ff006e"`, `powerUp "#00ff88"`, `thrust "#f5ff00"` y `glow 1`, los mismos valores que `COLORS` en `main`.
- [ ] `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/asteroids/*.ts` solo devuelve líneas de `lib/asteroids/config.ts`.
- [ ] En `#/jugar/asteroids` aparece el grupo "SKIN" con CLÁSICO, NEÓN y RETRO, en ese orden, y CLÁSICO con `aria-pressed="true"` sin nada guardado.
- [ ] Con CLÁSICO, el píxel (2, 2) del canvas es `#000000` y, en `ready`, los asteroides tienen píxeles `#ff006e`, igual que en `main`.
- [ ] Con CLÁSICO, la captura de `ready` comparada con la de `main` solo difiere en la posición aleatoria de los asteroides: mismos colores y mismo halo.
- [ ] Con CLÁSICO, durante la partida, la nave tiene píxeles `#00f5ff`, las balas `#e6e9ff` y la llama (↑ mantenida) `#f5ff00`.
- [ ] Con NEÓN, el píxel (2, 2) del canvas es `#0a0418`, los asteroides tienen píxeles `#b14bff`, la nave `#ff2bd6`, las balas `#fdf3ff` y la llama `#ff9e2c`.
- [ ] Con RETRO, el píxel (2, 2) del canvas es `#030d05`, los asteroides tienen píxeles `#3fbf4a`, la nave `#7dff6e`, las balas `#eaffe4` y la llama `#c8ff5a`.
- [ ] Con `POWERUP_DROP_CHANCE = 1` en un cambio local sin commitear, el rombo y el texto "3x" del power-up tienen píxeles `#00ff88` en CLÁSICO, `#2de2ff` en NEÓN y `#c8ff5a` en RETRO, y el contador "3x N.Ns" del canvas usa el mismo color tras recogerlo.
- [ ] Hay una captura de Playwright por skin (CLÁSICO, NEÓN, RETRO) en la sección "Resultado de la verificación".
- [ ] Elegir NEÓN guarda `localStorage.getItem("av:skin:asteroids") === "neon"`, y al recargar `#/jugar/asteroids` el canvas arranca con `#0a0418` y NEÓN tiene `aria-pressed="true"`.
- [ ] Con `av:skin:asteroids = "rosa"`, el player arranca en CLÁSICO.
- [ ] Con `localStorage.getItem` y `setItem` forzados a lanzar (`addInitScript`), el player arranca en CLÁSICO, el selector cambia la skin durante la sesión y la consola no muestra errores.
- [ ] Con la partida en marcha y la puntuación por encima de 0, pausar y elegir RETRO repinta el canvas detrás de EN PAUSA (píxel (2, 2) `#030d05`) sin cambiar la puntuación, las vidas ni el nivel del HUD; REANUDAR sigue con los mismos asteroides.
- [ ] Cambiar de skin durante la partida, sin pausar, no cambia la fase ni el HUD, y una explosión en curso pasa al color de la nueva skin en el frame siguiente.
- [ ] Tras hacer clic en NEÓN en `ready`, pulsar Espacio empieza la partida y la skin sigue en NEÓN.
- [ ] JUGAR DE NUEVO mantiene la skin elegida.
- [ ] `#/jugar/tetris`, `#/jugar/arkanoid` y `#/jugar/snake` no muestran el selector y se ven igual que en `main`.
- [ ] `#/jugar/gloton`, un juego simulado, no muestra el selector y sigue simulando.
- [ ] El HUD, el CRT, los botones y el modal se ven igual con las tres skins.
- [ ] A 375 px el selector cabe sin scroll horizontal.
- [ ] Con NEÓN y `devicePixelRatio` 2 a 375 px, ningún frame pasa de 16 ms con 10 asteroides y una explosión en pantalla.
- [ ] `grep -n "Paleta neón" .claude/skills/nuevo-juego/*.md` no devuelve resultados y `engine-contract.md` contiene `SKINS: Record<SkinId,` y la tabla "Familias de color".
- [ ] La consola del navegador no muestra errores al abrir, cambiar de skin, jugar y salir de `#/jugar/asteroids`.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** contrato incremental, con `EngineDefinition.skins` y `GameEngine.setSkin` opcionales. El usuario pidió las skins de ASTEROIDS; así TETRIS, ARKANOID y SNAKE compilan y se ven igual sin tocarlos. Decisión del agente (skin-designer); revisar.
- **No:** las tres skins de los cuatro juegos en este mismo spec, que es lo que el contrato de skin-designer propone por defecto. Triplica el alcance respecto a lo pedido. Si se prefiere, se reescribe este spec con los cuatro juegos antes de aprobarlo.
- **Sí:** `Record<SkinId, AsteroidsPalette>` en `config.ts` y `Required<GameEngine>` en `lib/asteroids/types.ts`. Si a ASTEROIDS le falta una skin o `setSkin`, no compila. Decisión del agente (skin-designer); revisar.
- **Sí:** `skins: Record<SkinId, unknown>` en la definición, con el mismo objeto `SKINS`. Una definición no puede anunciar una skin que no pinta, y el player no necesita conocer el tipo de cada paleta. Decisión del agente (skin-designer); revisar.
- **No:** `skins: readonly SkinId[]`. Una lista podría quedar incompleta o desincronizada con las paletas.
- **Sí:** CLÁSICO idéntica a los `COLORS` actuales y con `glow` 1. Todas sus claves pasan el contraste (mínimo 5.48:1), así que no hay que proponer ningún cambio del aspecto por defecto.
- **Sí:** NEÓN con la nave magenta `#ff2bd6`, asteroides violeta `#b14bff`, fondo violeta casi negro `#0a0418`, llama naranja atardecer `#ff9e2c`, power-up cian `#2de2ff` y `glow` 2. Invierte los papeles de cian y magenta de CLÁSICO y añade violeta y naranja, para que se note distinta a primera vista y no como un ajuste de tono. Decisión del agente (skin-designer); revisar.
- **No:** NEÓN con la nave cian y los asteroides magenta, más saturados. Se confundiría con CLÁSICO.
- **Sí:** RETRO de fósforo verde, monocroma, con 5 colores y `glow` 0.2 (`shadowBlur` 2, un leve sangrado del fósforo). Evoca los monitores vectoriales y de terminal; la jerarquía se lee por brillo. Decisión del agente (skin-designer); revisar.
- **No:** RETRO ámbar. Es igual de válida; se descarta para que todos los juegos compartan un único fósforo y la familia RETRO sea coherente. Si se prefiere ámbar, se cambia aquí antes de aprobar y vale para los demás juegos.
- **No:** RETRO con `glow` 0. Se ve plana del todo; 0.2 mantiene el carácter de CRT dentro del rango 0 – 0.3.
- **Sí:** en RETRO, `powerUp` y `thrust` comparten `#c8ff5a`. La llama solo aparece pegada a la nave y el power-up es un rombo con "3x"; compartir color mantiene la paleta corta. Decisión del agente (skin-designer); revisar.
- **Sí:** `powerUp` medido contra 4.5:1. Es también el color del texto "3x" y del contador "3x N.Ns" del canvas.
- **Sí:** `Particle` guarda `kind` en lugar del hex. Así una explosión en curso cambia de color con `setSkin`, como pide "se repinta en el frame siguiente".
- **Sí:** `setSkin` en pausa dibuja un frame sin `update`. El overlay EN PAUSA es translúcido (`rgba(0, 0, 0, 0.6)`), y sin ese frame el cambio no se vería hasta reanudar. Decisión del agente (skin-designer); revisar.
- **Sí:** la skin se guarda por juego en `av:skin:asteroids`, con `loadSkin`/`saveSkin` en `try/catch` y CLÁSICO como respaldo.
- **No:** una skin global para todos los juegos. Cada juego puede verse mejor con una skin distinta.
- **Sí:** el selector va debajo del CRT y encima de la tira de controles, con la etiqueta "SKIN" y `aria-pressed`. No tapa el canvas, se puede usar en pausa y se lee junto a los controles del juego. Decisión del agente (skin-designer); revisar.
- **No:** el selector dentro del HUD, junto a PAUSA, FIN y SALIR. A 375 px el HUD ya va justo, y la skin no es una acción de la partida.
- **No:** el selector en el detalle del juego. Cambiar de skin con la partida delante es lo que deja comparar.
- **Sí:** la skin solo cambia el canvas. El CRT, el HUD y el modal son la identidad del Vault.
- **Sí:** el contrato de `/nuevo-juego` y de `game-jam` se actualiza en este spec. Los juegos nuevos nacen con sus tres skins y no necesitan un spec de skins aparte.
- **Sí:** verificar contra `next start` y no contra `next dev`, que puede servir un `globals.css` antiguo.

## Riesgos

| Riesgo                                                                               | Mitigación                                                                                                                                                                                |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shadowBlur` 20 en NEÓN baja el rendimiento con muchas partículas a dpr 2.           | Criterio de 16 ms por frame a 375 px con dpr 2. Si falla, se baja NEÓN a `glow` 1.5 (`shadowBlur` 15), dentro del rango, y se anota.                                                      |
| El antialiasing impide encontrar píxeles exactos de un trazo de 1.5 px.              | La verificación usa `devicePixelRatio` 2 (trazo de 3 px físicos) y cuenta píxeles con el hex exacto, no un píxel concreto.                                                                |
| `localStorage` lanza en modo privado o con cookies bloqueadas.                       | `loadSkin` y `saveSkin` en `try/catch`; criterio con `addInitScript` que fuerza el fallo.                                                                                                 |
| El foco queda en un botón del selector y Espacio lo activa.                          | El input de ASTEROIDS hace `preventDefault` de Espacio mientras captura, como con REANUDAR (SPEC 07). En pausa, reactivar la misma skin no cambia nada. Criterio de Espacio tras el clic. |
| Un motor sin skins recibe un tercer parámetro que no espera.                         | Lo ignora: `create` de TETRIS, ARKANOID y SNAKE tiene dos parámetros y JavaScript descarta el tercero.                                                                                    |
| Mientras haya motores sin skins, `setSkin` y `skins` opcionales permiten olvidarlos. | El contrato de `/nuevo-juego` los exige, y el spec que dé skins al último juego los hace obligatorios.                                                                                    |

## Lo que **no** entra en este spec

- Skins de TETRIS, ARKANOID y SNAKE.
- Hacer obligatorios `skins` y `setSkin`.
- Cambios en la UI del sitio según la skin.
- Skins en juegos simulados.
- Skins en Supabase o por usuario.
- Skin global.
- Sprites, fondos dibujados y efectos de postproceso.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la verificación

Fecha: 2026-10-19. `npm run build` + `next start -p 3001`, Chromium de Playwright, con un contexto nuevo (`deviceScaleFactor` 2) en cada recorrido.
Para comparar con `main` se sirvió un build de `main` (`f347a53`) en `:3002`, desde un worktree temporal.
Los colores se leyeron de dos formas: contando píxeles con el hex exacto (`getImageData`) e interceptando `stroke`, `fill`, `strokeRect`, `fillRect` y `fillText` del contexto 2D, con su `strokeStyle`, `fillStyle`, `shadowColor`, `shadowBlur` y la posición acumulada de `translate`/`rotate`.
Con esa posición, un piloto automático dentro de la prueba apuntó la nave a los asteroides y al power-up.
Para las comparaciones exactas con `main` se fijó `Math.random` con una semilla y se congeló el reloj de `requestAnimationFrame`, para que los dos builds dibujen la misma escena.

| Área                     | Resultado                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint y build             | `npm run lint` y `npm run build` sin errores ni avisos.                                                                                                                                                                                                                                                                                                                                                                                              |
| Tipos y paleta           | `lib/engines/skins.ts` exporta `SKIN_IDS`, `SkinId`, `DEFAULT_SKIN = "clasico"`, `SKIN_LABELS`, `isSkinId`, `loadSkin` y `saveSkin`. `SKINS` tiene `clasico`, `neon` y `retro`; `SKINS.clasico` = los seis valores de `COLORS` de `main` y `glow` 1. `COLORS` ya no existe.                                                                                                                                                                          |
| Hex fuera de la paleta   | `grep -nE '#[0-9a-fA-F]{3,8}\b\|rgba?\(' lib/asteroids/*.ts` solo devuelve líneas de `config.ts`. `grep -n COLORS lib/asteroids/*.ts` vacío.                                                                                                                                                                                                                                                                                                         |
| Selector                 | `role="group"`, `aria-label="Skin del canvas"`, "SKIN" y CLÁSICO · NEÓN · RETRO en ese orden. Sin nada guardado, CLÁSICO con `aria-pressed="true"` y `av:skin:asteroids` sin valor.                                                                                                                                                                                                                                                                  |
| CLÁSICO igual que `main` | `ready` con la misma semilla: hash del canvas idéntico en los dos builds (`bd41438a`). Píxel (2, 2) `#000000`, 4 699 píxeles `#ff006e` y `shadowBlur` 10 en todos los trazos, igual que en `main`.                                                                                                                                                                                                                                                   |
| Colores en partida       | CLÁSICO: nave `#00f5ff` (332 px), balas `#e6e9ff` (148), llama `#f5ff00` (86), asteroides `#ff006e`, `shadowBlur` 10. NEÓN: fondo `#0a0418`, nave `#ff2bd6` (327), balas `#fdf3ff` (148), llama `#ff9e2c` (70), asteroides `#b14bff`, `shadowBlur` 20. RETRO: fondo `#030d05`, nave `#7dff6e` (393), balas `#eaffe4` (146), llama `#c8ff5a` (84), asteroides `#3fbf4a`, `shadowBlur` 2. En cada skin, los trazos solo usan los colores de su paleta. |
| Power-up                 | Con `POWERUP_DROP_CHANCE = 1` (ver notas): rombo y "3x" en `#00ff88` / `#2de2ff` / `#c8ff5a` (487 / 563 / 527 px). Tras recogerlo, el contador "3x 4.9s" usa el mismo color (291 / 291 / 296 px en la esquina) con `shadowBlur` 10 / 20 / 2.                                                                                                                                                                                                         |
| Persistencia             | Elegir NEÓN guarda `"neon"`. Al recargar, NEÓN con `aria-pressed="true"` y píxel (2, 2) `#0a0418`. Con `"rosa"` guardado arranca en CLÁSICO (`#000000`).                                                                                                                                                                                                                                                                                             |
| `localStorage` que lanza | Con `getItem` y `setItem` forzados a lanzar (`addInitScript`): arranca en CLÁSICO, RETRO cambia el canvas a `#030d05` y se marca, y la consola no muestra errores.                                                                                                                                                                                                                                                                                   |
| Pausa y RETRO            | Con 20 puntos, PAUSA y RETRO: el canvas se repinta detrás de EN PAUSA (píxel (2, 2) `#030d05`, 5 065 px `#3fbf4a`) con los 5 asteroides en las mismas posiciones exactas. HUD `20 · ♥♥♥ · 01` antes, después y tras REANUDAR. El primer frame tras REANUDAR tiene los asteroides en las mismas posiciones.                                                                                                                                           |
| Cambio en partida        | Sin pausar, durante una explosión de 15 partículas `#ff006e`: tras NEÓN, las 15 partículas se dibujan en `#b14bff` y ningún trazo usa ya un color de CLÁSICO. HUD sin cambios, sin overlay de inicio ni modal. Medido dentro de la página: el primer frame del motor tras el clic ya usa la skin nueva (NEÓN, RETRO y CLÁSICO).                                                                                                                      |
| Espacio tras el clic     | Con el foco en NEÓN, Espacio empieza la partida (sin overlay, PAUSA habilitado), NEÓN sigue marcado, el canvas en `#0a0418` y `window.scrollY` no cambia.                                                                                                                                                                                                                                                                                            |
| JUGAR DE NUEVO           | FIN abre el modal; JUGAR DE NUEVO vuelve al overlay de inicio con NEÓN marcado y el canvas en `#0a0418` con asteroides `#b14bff`.                                                                                                                                                                                                                                                                                                                    |
| Otros juegos             | `#/jugar/tetris`, `#/jugar/arkanoid` y `#/jugar/snake` no tienen selector. Con la misma semilla, su canvas y la captura del player son idénticos byte a byte a los de `main`. `#/jugar/gloton` no tiene selector ni canvas y sigue simulando (126 → 580).                                                                                                                                                                                            |
| UI del sitio             | Con la misma semilla en las tres skins, las capturas de `.player-hud`, `.crt-bottom` y `.player-controls` son idénticas. El modal es idéntico por dentro; solo cambia su fila de píxeles más exterior (ver notas).                                                                                                                                                                                                                                   |
| 375 px                   | Selector en una sola fila; `scrollWidth` 360 = `clientWidth` 360, sin scroll horizontal.                                                                                                                                                                                                                                                                                                                                                             |
| Rendimiento              | NEÓN, 375 px, dpr 2 (`canvas.width` 1600), hasta 10 asteroides y 32 partículas en pantalla: el trabajo del motor por frame no pasa de 0,4 ms. Intervalo entre frames con ≥ 10 asteroides y explosión: mediana 16,7 ms, máximo 17,7 ms; en todo el recorrido (911 frames), p95 17,6 ms y máximo 17,7 ms. Ningún frame perdido; `glow` 2 se mantiene.                                                                                                  |
| Contrato de juegos       | `grep -n "Paleta neón" .claude/skills/nuevo-juego/*.md` vacío. `engine-contract.md` contiene `SKINS: Record<SkinId,` y la tabla "Familias de color".                                                                                                                                                                                                                                                                                                 |
| Consola                  | 0 errores en todos los recorridos.                                                                                                                                                                                                                                                                                                                                                                                                                   |

Capturas (no se versionan, en `.playwright-mcp/skins-11/`):

- Una por skin: `skin-clasico-play.png`, `skin-neon-play.png` y `skin-retro-play.png` (nave, llama y balas), más `skin-*-ready.png`.
- `powerup-*.png`, `pause-retro.png`, `perf-neon-375.png`, `modal-*.png` y `cmp-<juego>-branch/main.png`.

Notas:

- Power-up: cambio local sin commitear en `lib/asteroids/config.ts` (`POWERUP_DROP_CHANCE = 1`). Después se restauró a 0.15 y se volvió a compilar.
- Rendimiento: a 60 Hz el intervalo entre frames es de 16,7 ms por definición, así que "ningún frame pasa de 16 ms" se midió como trabajo del motor por frame (≤ 0,4 ms) e intervalos sin frames perdidos (máximo 17,7 ms, jitter de vsync). No hizo falta bajar NEÓN a `glow` 1.5.
- Modal: con la misma semilla, el interior del modal es idéntico píxel a píxel en las tres skins. Solo difieren los 2 528 píxeles de su fila más exterior: el modal empieza en una coordenada fraccionaria (y = 304,25), así que ese borde se mezcla con el fondo semitransparente del backdrop y con el canvas de detrás. No es un cambio del modal.
- Paso 1: `GameCanvas.tsx` pasó `DEFAULT_SKIN` como tercer argumento de `create` para que el build compilara; en el paso 4 se sustituyó por la prop `skin`.
- Paso 2: `palette` se declaró con `const` hasta el paso 3, porque `prefer-const` falla mientras nada la reasigna.
- Pulido: cada botón del selector lleva una muestra de 3 colores de la familia de su skin (`.skin-chip`, decorativa, `aria-hidden`), atenuada salvo en hover o pulsado. Por debajo de 480 px se reducen huecos e interletrado para que las tres skins quepan en una fila a 375 px.
- Pendiente fuera de este spec: `.claude/agents/game-jam.md:104` (`COLORS` en `config.ts`), `.claude/skills/nuevo-juego/SKILL.md:97` ("paleta neón de `:root`") y `SKILL.md:133` ("en la paleta neón") siguen hablando de la paleta única.
