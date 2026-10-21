# SPEC 16 — Ajuste de skins de FROGGER

> **Estado:** Draft
> **Depende de:** SPEC 07, SPEC 11, SPEC 15
> **Fecha:** 2026-10-20
> **Objetivo:** Corregir dos colores de las skins de FROGGER para que la rana no comparta color con los coches de la fila 12 en NEÓN y se despegue de los troncos en RETRO.

## Por qué existe este spec

La auditoría de skins del 2026-10-20 (agente `skin-designer`) revisó las tres skins de FROGGER del SPEC 15.
Las tres existen, siguen el contrato del SPEC 11 y todos los elementos de juego pasan 3:1 contra su `bg`.
El selector CLÁSICO / NEÓN / RETRO ya aparece en `#/jugar/frogger`, porque `froggerEngine.skins` existe.
No hay colores sueltos fuera de `lib/frogger/config.ts`.
Quedan dos problemas de legibilidad que el contraste contra el `bg` no detecta:

- En NEÓN, la rana (`frog`) y los coches de la fila 12 (`carA`) son el mismo hex, `#2de2ff` (1.00:1 entre sí).
  La fila 12 es el primer carril que pisa la rana al salir: la rana y el coche que la atropella se pintan igual.
- En RETRO, la rana `#eaffe4` sobre los troncos `#7dff6e` mide 1.21:1 y los dos son del mismo verde.
  En CLÁSICO y NEÓN el tono los separa (verde sobre amarillo, cian sobre naranja); en RETRO, monocromo, no hay tono que ayude.
  El contorno de 2 px en `bg` de `drawFrogShape` solo rodea la elipse: las patas y las cuencas de los ojos se funden con el tronco.
  La rana pasa casi todo el cruce del río encima de un tronco, así que es el caso que más pesa.

El SPEC 15 está en `Approved` y no se edita.
Este spec cambia dos valores de `SKINS` y deja el resto igual.
CLÁSICO no cambia.

## Alcance

**Dentro:**

- `lib/frogger/config.ts`: `SKINS.neon.carA` pasa de `#2de2ff` a `#b14bff`.
- `lib/frogger/config.ts`: `SKINS.retro.log` pasa de `#7dff6e` a `#238b45`.
- `lib/frogger/engine.ts`: el comentario del contorno de la rana en `drawFrogShape` se ajusta a los ratios nuevos.
- Verificación con Playwright y sección "Resultado de la verificación" en este spec.

**Fuera de alcance (para specs futuros):**

- Cualquier cambio de `SKINS.clasico`.
- Extender el contorno de la rana a las patas y a las cuencas de los ojos: es un cambio de dibujo del motor, no de paleta.
- Cambiar los coches o los camiones de RETRO para separarlos de la rana por luminancia (la rana va sobre el `bg` entre ellos, a 18.73:1).
- Añadir `#238b45` a la tabla "Familias de color" de `.claude/skills/nuevo-juego/engine-contract.md`.
- Skins de TETRIS, que sigue sin `SKINS` ni selector.
- Cambios en `lib/engines/skins.ts`, `lib/engines/types.ts`, `GameCanvas.tsx` o `GamePlayer.tsx`.

## Modelo de datos

Este spec no añade tipos.
Reutiliza `FroggerPalette` y `SKINS: Record<SkinId, FroggerPalette>` del SPEC 15 y el contrato del SPEC 11:

```ts
import type { SkinId } from "@/lib/engines/skins"; // "clasico" | "neon" | "retro"
// EngineDefinition.skins?: Record<SkinId, unknown>
// GameEngine.setSkin?: (skin: SkinId) => void
// createFroggerGame(canvas, callbacks, skin = DEFAULT_SKIN): Required<GameEngine>
```

### Cambios en `lib/frogger/config.ts`

```ts
neon: {
  // …
  carA: "#b14bff", // antes "#2de2ff": era el mismo hex que frog
  // …
},
retro: {
  // …
  log: "#238b45", // antes "#7dff6e": 1.21:1 frente a la rana
  // …
},
```

- Las otras 19 claves de NEÓN y de RETRO, y las 20 de CLÁSICO, no cambian.
- `#b14bff` es el violeta de la familia NEÓN (borde de SNAKE, asteroides de ASTEROIDS).
- `#238b45` es el verde profundo de la familia RETRO (bloque `magenta` de ARKANOID en RETRO).
- RETRO pasa de 5 a 6 hex: `#030d05`, `#238b45`, `#3fbf4a`, `#7dff6e`, `#c8ff5a` y `#eaffe4`, más las transparencias de `#3fbf4a` y `#7dff6e`.

### Fondos sobre los que se dibuja

Los `rgba` se componen sobre el `bg` antes de medir.

| Fondo                          | Filas       | CLÁSICO   | NEÓN      | RETRO     | Qué se dibuja encima                     |
| ------------------------------ | ----------- | --------- | --------- | --------- | ---------------------------------------- |
| `bg`                           | 0, 8–12, 14 | `#000`    | `#0a0418` | `#030d05` | vehículos, bocas, rana en boca, reloj    |
| `water` sobre `bg`             | 1–6         | `#001414` | `#0e1a2f` | `#091f0c` | troncos, tortugas, rana, marca de muerte |
| `safe` sobre `bg`              | 7, 13       | `#001a0e` | `#210e38` | `#122a12` | rana, marca de muerte                    |
| `wall` sobre `bg` (decorativo) | 0 (muros)   | `#005930` | `#4d2074` | `#1b5421` | borde de las bocas en contacto           |

### Paleta y contraste de FROGGER

Medido con `node .claude/scripts/contrast.mjs`.
Umbral 3:1 para los elementos de juego.
FROGGER no dibuja texto en el canvas, así que ninguna clave tiene umbral 4.5:1.
Cada celda es "color · ratio contra `bg`"; entre paréntesis, contra los fondos secundarios sobre los que se dibuja.
En negrita, los dos valores que cambia este spec.

| Clave       | CLÁSICO                                           | NEÓN                                               | RETRO                                                                   | Umbral |
| ----------- | ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| `bg`        | `#000` · lum 0.0000                               | `#0a0418` · lum 0.0022                             | `#030d05` · lum 0.0032                                                  | ≤ 0.03 |
| `water`     | `rgba(0, 245, 255, 0.08)` · 1.11:1 · decorativo   | `rgba(45, 226, 255, 0.1)` · 1.16:1 · decorativo    | `rgba(63, 191, 74, 0.1)` · 1.14:1 · decorativo                          | exento |
| `safe`      | `rgba(0, 255, 136, 0.1)` · 1.15:1 · decorativo    | `rgba(177, 75, 255, 0.14)` · 1.14:1 · decorativo   | `rgba(125, 255, 110, 0.12)` · 1.28:1 · decorativo                       | exento |
| `laneLine`  | `rgba(230, 233, 255, 0.25)` · 1.86:1 · decorativo | `rgba(253, 243, 255, 0.25)` · 2.03:1 · decorativo  | `rgba(63, 191, 74, 0.3)` · 1.73:1 · decorativo                          | exento |
| `wall`      | `rgba(0, 255, 136, 0.35)` · 2.48:1 · decorativo   | `rgba(177, 75, 255, 0.4)` · 1.70:1 · decorativo    | `rgba(63, 191, 74, 0.4)` · 2.20:1 · decorativo                          | exento |
| `bayBorder` | `#f5ff00` · 19.19:1 (`wall` 7.76:1)               | `#ff9e2c` · 9.76:1 (`wall` 5.74:1)                 | `#c8ff5a` · 16.84:1 (`wall` 7.66:1)                                     | 3:1    |
| `frog`      | `#00ff88` · 15.66:1 (`water` 14.11, `safe` 13.57) | `#2de2ff` · 12.87:1 (`water` 11.13, `safe` 11.34)  | `#eaffe4` · 18.73:1 (`water` 16.43, `safe` 14.59)                       | 3:1    |
| `eye`       | `#e6e9ff` · 17.46:1 contra `pupil`                | `#fdf3ff` · 18.63:1 contra `pupil`                 | `#030d05` · 18.73:1 contra `frog`                                       | 3:1    |
| `pupil`     | `#000` · 17.46:1 contra `eye`                     | `#0a0418` · 18.63:1 contra `eye`                   | `#c8ff5a` · 16.84:1 contra `eye`                                        | 3:1    |
| `deadMark`  | `#e6e9ff` · 17.46:1 (`water` 15.73, `safe` 15.13) | `#fdf3ff` · 18.63:1 (`water` 16.10, `safe` 16.41)  | `#c8ff5a` · 16.84:1 (`water` 14.76, `safe` 13.11)                       | 3:1    |
| `carA`      | `#00f5ff` · 15.50:1                               | **`#b14bff` · 5.10:1** (antes `#2de2ff` · 12.87:1) | `#7dff6e` · 15.42:1                                                     | 3:1    |
| `carB`      | `#ff006e` · 5.48:1                                | `#ff2bd6` · 6.29:1                                 | `#c8ff5a` · 16.84:1                                                     | 3:1    |
| `carC`      | `#f5ff00` · 19.19:1                               | `#ff9e2c` · 9.76:1                                 | `#7dff6e` · 15.42:1                                                     | 3:1    |
| `truck`     | `#e6e9ff` · 17.46:1                               | `#fdf3ff` · 18.63:1                                | `#c8ff5a` · 16.84:1                                                     | 3:1    |
| `log`       | `#f5ff00` · 19.19:1 (`water` 17.28)               | `#ff9e2c` · 9.76:1 (`water` 8.43)                  | **`#238b45` · 4.56:1 (`water` 4.00)** (antes `#7dff6e` · 15.42 / 13.52) | 3:1    |
| `turtle`    | `#ff006e` · 5.48:1 (`water` 4.93)                 | `#ff2bd6` · 6.29:1 (`water` 5.44)                  | `#3fbf4a` · 8.24:1 (`water` 7.22)                                       | 3:1    |
| `timerHigh` | `#00ff88` · 15.66:1                               | `#2de2ff` · 12.87:1                                | `#3fbf4a` · 8.24:1                                                      | 3:1    |
| `timerMid`  | `#f5ff00` · 19.19:1                               | `#ff9e2c` · 9.76:1                                 | `#7dff6e` · 15.42:1                                                     | 3:1    |
| `timerLow`  | `#ff006e` · 5.48:1                                | `#ff2bd6` · 6.29:1                                 | `#eaffe4` · 18.73:1                                                     | 3:1    |
| `glow`      | 1 (`shadowBlur` 10)                               | 2 (`shadowBlur` 20)                                | 0.2 (`shadowBlur` 2)                                                    | —      |

- Contraste más bajo por skin, sin decorativos: CLÁSICO 4.93:1 (`turtle` sobre `water`), NEÓN 5.10:1 (`carA` sobre `bg`), RETRO 4.00:1 (`log` sobre `water`).
- Antes de este spec, el más bajo de RETRO era 7.22:1 (`turtle` sobre `water`) y el de NEÓN 5.44:1 (`turtle` sobre `water`).
- CLÁSICO pasa todos los umbrales: no hay que proponer ningún cambio del aspecto por defecto.
- El ojo de CLÁSICO (`#e6e9ff`) sobre la cuenca verde (`#00ff88`) mide 1.12:1; lo que se lee es la pupila negra sobre el ojo, a 17.46:1.

Decorativos y estados atenuados, que no se miden contra el umbral:

| Elemento                                           | CLÁSICO            | NEÓN               | RETRO                                 |
| -------------------------------------------------- | ------------------ | ------------------ | ------------------------------------- |
| Tortuga sumergida (`turtle` al 30 % sobre `water`) | `#4d0e2f` · 1.27:1 | `#561f61` · 1.46:1 | `#194f1f` · 1.80:1                    |
| Vetas del tronco (`bg` al 35 % sobre `log`)        | decorativo         | decorativo         | `#185f2f` sobre `#238b45`, decorativo |
| Ruedas y línea de cabina (`bg` sobre el vehículo)  | decorativo         | decorativo         | decorativo                            |
| Carril del reloj (`laneLine` detrás de la barra)   | decorativo         | decorativo         | decorativo                            |

- La tortuga sumergida es tenue a propósito: dice "aquí no hay apoyo".

### La rana frente a lo que tiene alrededor

Ratio de luminancia entre la rana y cada elemento (se pasa `frog` como bg al script; el ratio es simétrico).
No hay umbral: los separan también el tono y el contorno de 2 px en `bg`.
Lo que exige la regla es que todos sean hex distintos de `frog`.

| Frente a | CLÁSICO | NEÓN antes → después | RETRO antes → después |
| -------- | ------- | -------------------- | --------------------- |
| `log`    | 1.23:1  | 1.32:1               | 1.21:1 → **4.11:1**   |
| `turtle` | 2.86:1  | 2.05:1               | 2.27:1                |
| `carA`   | 1.01:1  | 1.00:1 → **2.53:1**  | 1.21:1                |
| `carB`   | 2.86:1  | 2.05:1               | 1.11:1                |
| `carC`   | 1.23:1  | 1.32:1               | 1.21:1                |
| `truck`  | 1.12:1  | 1.45:1               | 1.11:1                |

- Después de este spec, `frog` es un hex distinto de todos los vehículos, troncos y tortugas en las tres skins.
- En NEÓN, `#b14bff` (violeta) frente a `#2de2ff` (cian) se separa por tono y por brillo.
- En RETRO, la rana sobre la carretera va sobre `bg` (18.73:1) y solo toca un vehículo al morir; sobre el río va encima del apoyo, por eso se oscurece el tronco y no los vehículos.
- La tortuga de RETRO se queda en `#3fbf4a` (2.27:1 frente a la rana), la misma pareja que cuerpo y cabeza de SNAKE en RETRO.

### Colores sueltos

`grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/frogger/*.ts` solo devuelve líneas de `lib/frogger/config.ts`.
No hay colores que mover a la paleta.
`grep -nE 'shadowBlur|GLOW' lib/frogger/*.ts` solo devuelve `GLOW_BASE` (`config.ts:40`) y su uso con `palette.glow` (`engine.ts:309`).

## Plan de implementación

Requiere el SPEC 15 en `Implemented`.

1. **Dos valores de la paleta.** En `lib/frogger/config.ts`, `SKINS.neon.carA = "#b14bff"` y `SKINS.retro.log = "#238b45"`. Verificación: `npm run build` pasa; `git diff lib/frogger/config.ts` solo cambia esas dos líneas; el `grep` de colores solo devuelve líneas de `config.ts`.
2. **Comentario del contorno.** En `drawFrogShape` (`lib/frogger/engine.ts`), el comentario del contorno pasa a decir que en CLÁSICO y NEÓN la rana y los troncos están a ~1,2–1,3:1 y que en RETRO el tronco es el verde profundo. El contorno no cambia. Verificación: `npm run lint` pasa.
3. **Pulido con `/frontend-design`.** Revisar NEÓN y RETRO a 1440 px y 375 px: la fila 12 en NEÓN junto al violeta de `safe` en la fila 13, y la rana sobre un tronco de la fila 5 en RETRO. Solo se pueden ajustar `SKINS.neon.carA` y `SKINS.retro.log`; cada hex nuevo se vuelve a medir con `node .claude/scripts/contrast.mjs` (≥ 3:1 contra `bg` y contra `water`, y distinto de `frog`) y se anota en la tabla. Verificación: capturas a 1440 px y 375 px.
4. **Verificación con Playwright.** Contra `npm run build` + `next start -p 3001`, a 1440 px y 375 px, con `devicePixelRatio` 2. Una captura por skin en `ready` y otra en partida con la rana sobre un tronco. Leer los colores interceptando `fillStyle` en `roundRect` y `ellipse`, o contando píxeles por banda de fila. Añadir a este spec la sección "Resultado de la verificación".

## Criterios de aceptación

Las coordenadas son lógicas (640×600); con `devicePixelRatio` 2 se leen en el doble.
Bandas de referencia: fila 12 = `y` 480–519; troncos de la fila 1 = `y` 45–74; río = `y` 40–279.

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `SKINS.neon.carA === "#b14bff"` y `SKINS.retro.log === "#238b45"`.
- [ ] `git diff` de este spec en `lib/frogger/config.ts` solo cambia las líneas de `carA` en `neon` y de `log` en `retro`.
- [ ] `SKINS.clasico` sigue con `bg "#000"`, `frog "#00ff88"`, `carA "#00f5ff"`, `carB "#ff006e"`, `carC "#f5ff00"`, `truck "#e6e9ff"`, `log "#f5ff00"`, `turtle "#ff006e"`, `bayBorder "#f5ff00"` y `glow 1`, como en el SPEC 15.
- [ ] `grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' lib/frogger/*.ts` solo devuelve líneas de `lib/frogger/config.ts`.
- [ ] Con CLÁSICO, en `ready`, los coches de la fila 12 se dibujan en `#00f5ff`, los troncos en `#f5ff00` y la rana en `#00ff88`, como antes de este spec.
- [ ] Con NEÓN, en `ready`, los coches de la fila 12 se dibujan en `#b14bff`.
- [ ] Con NEÓN, en `ready`, la banda de la fila 12 no tiene ningún píxel `#2de2ff`.
- [ ] Con NEÓN, la rana se dibuja en `#2de2ff`, los troncos en `#ff9e2c` y las tortugas en `#ff2bd6`, como en el SPEC 15.
- [ ] Con RETRO, en `ready`, los troncos de la fila 1 se dibujan en `#238b45`.
- [ ] Con RETRO, en `ready`, la banda del río no tiene ningún píxel `#7dff6e`.
- [ ] Con RETRO, la rana se dibuja en `#eaffe4`, las tortugas en `#3fbf4a`, los coches de la fila 12 en `#7dff6e` y el fondo en `#030d05`.
- [ ] Con RETRO y la rana quieta sobre un tronco de la fila 5, la captura muestra la elipse `#eaffe4`, su contorno `#030d05` y el tronco `#238b45` alrededor.
- [ ] Hay una captura de Playwright por skin (CLÁSICO, NEÓN, RETRO) en `ready`, y una de RETRO con la rana sobre un tronco, en "Resultado de la verificación".
- [ ] Cambiar de NEÓN a RETRO con la rana sobre un tronco, en pausa, repinta el canvas detrás de EN PAUSA sin cambiar la puntuación, el nivel, las vidas ni la posición de la rana.
- [ ] Elegir NEÓN guarda `localStorage.getItem("av:skin:frogger") === "neon"`, y al recargar `#/jugar/frogger` los coches de la fila 12 se dibujan en `#b14bff`.
- [ ] La consola del navegador no muestra errores al abrir, cambiar de skin, jugar y salir de `#/jugar/frogger`.
- [ ] Este spec contiene la sección "Resultado de la verificación".

## Decisiones

- **Sí:** un spec nuevo y no una edición del SPEC 15. El SPEC 15 está en `Approved`, y su tabla de paleta (`carA` de NEÓN, `log` de RETRO) y su criterio "RETRO: troncos `#7dff6e`" quedan sustituidos por este.
- **Sí:** en NEÓN se cambia `carA` y no `frog`. La rana cian `#2de2ff` es una decisión del usuario en el SPEC 15 y tiene criterio de aceptación propio. Decisión del agente (skin-designer); revisar.
- **Sí:** `carA` de NEÓN pasa al violeta `#b14bff` (5.10:1). Es de la familia NEÓN, ya se usa en SNAKE y ASTEROIDS, y es el único color de la familia que no está ya en otro vehículo de FROGGER ni se parece al cian. Decisión del agente (skin-designer); revisar.
- **No:** `carA` de NEÓN en azul eléctrico `#4d7bff` (5.36:1). Es el tono más cercano al cian de la rana y repetiría el problema a medias.
- **No:** `carA` de NEÓN en lavanda `#e0c8ff` (13.30:1). Se confunde con los camiones `#fdf3ff` de las filas 8 y 10.
- **Sí:** en RETRO se oscurece el tronco al verde profundo `#238b45` (4.56:1 contra `bg`, 4.00:1 contra `water`, 4.11:1 frente a la rana). Es el apoyo sobre el que la rana pasa más tiempo, y sin tono propio en un monocromo la única separación posible es el brillo. Decisión del agente (skin-designer); revisar.
- **No:** dejar RETRO como está y confiar solo en el contorno. El contorno rodea la elipse pero no las patas ni las cuencas de los ojos, que a 1.21:1 se funden con el tronco.
- **No:** oscurecer también las tortugas de RETRO. Con los troncos y las tortugas por debajo de ~0.28 de luminancia harían falta dos verdes nuevos casi iguales; la tortuga se queda en `#3fbf4a`, a 2.27:1 de la rana, como cuerpo y cabeza de SNAKE en RETRO.
- **No:** oscurecer la rana de RETRO. Dejaría de ser el elemento más brillante y perdería contraste con la carretera.
- **No:** cambiar los vehículos de RETRO. La rana no se dibuja encima de ellos salvo al morir, y bajarlos al verde profundo apagaría toda la carretera.
- **Sí:** RETRO pasa a 6 hex, el máximo de la guía.
- **No:** cambiar CLÁSICO. Todas sus claves pasan el umbral, y la rana `#00ff88` frente a los coches `#00f5ff` de la fila 12 (1.01:1) son hex distintos y tonos distintos (verde y cian); además es la decisión "tokens de `:root`" del SPEC 15. Si el usuario quiere separarlos más, va en su propio spec porque cambiaría el aspecto por defecto. Decisión del agente (skin-designer); revisar.
- **Sí:** el contorno de 2 px en `bg` de la rana se mantiene en las tres skins. En CLÁSICO y NEÓN sigue siendo lo que separa la rana del tronco por luminancia.
- **Sí:** verificar contra `next start` y no contra `next dev`, que puede servir un `globals.css` antiguo.

## Riesgos

| Riesgo                                                                                      | Mitigación                                                                                                                                      |
| ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| El tronco `#238b45` de RETRO se parece demasiado a la tortuga `#3fbf4a` (1.81:1 entre sí).  | Se distinguen por forma (rectángulo redondeado con vetas frente a círculos con caparazón). El paso 3 lo revisa a 375 px.                        |
| Con `glow` 2, el halo violeta de los coches de la fila 12 tiñe la fila 13 (`safe` violeta). | Los criterios leen el relleno de los coches, no su halo. Si en el pulido la salida parece un solo bloque violeta, se ajusta `carA` y se remide. |
| El SPEC 15 aún no está en `Implemented` cuando se aprueba este.                             | El plan exige el SPEC 15 en `Implemented`. Si se implementan en la misma rama, este spec va en un commit aparte.                                |
| Un criterio del SPEC 15 ("RETRO: troncos `#7dff6e`") deja de cumplirse.                     | Es lo esperado: este spec lo sustituye. El SPEC 15 no se edita.                                                                                 |

## Lo que **no** entra en este spec

- Cambios en CLÁSICO.
- Cambios en el dibujo de la rana (contorno de patas y cuencas).
- Cambios en el sistema de skins del SPEC 11 o en el contrato de `nuevo-juego`.
- Skins de TETRIS.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
