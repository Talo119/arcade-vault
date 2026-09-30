# SPEC 02 — Página de inicio (Home)

> **Estado:** Implemented
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-30
> **Objetivo:** Añadir a la SPA la pantalla Home de `references/templates/home-about/` como nueva portada en `#/`, moviendo la Biblioteca a `#/biblioteca`.

## Por qué existe este spec

El template se amplió en `references/templates/home-about/` con dos pantallas nuevas: Home y Acerca de.
Este spec cubre solo el Home; Acerca de irá en su propio spec.
El Home pasa a ser la pantalla por defecto, igual que en el template, así que cambia el mapa de rutas del SPEC 01.
El último paso es comparar con Playwright el Home implementado contra el template original.

## Alcance

**Dentro:**

- Portar a `app/globals.css` los bloques de CSS del Home de `references/templates/home-about/styles.css`: `HOME PAGE` (líneas 930–1069), `ACTIVITY` y `PRICING` (líneas 1621–1725).
- Regla `prefers-reduced-motion: reduce` para los elementos animados del Home.
- Nueva ruta `{ name: "home" }` en `#/`; la Biblioteca pasa a `#/biblioteca`.
- Nav: enlace "Inicio" (escritorio y panel móvil) y el logo apunta al Home.
- Datos mock tipados del Home en `lib/home.ts`.
- Pantalla Home con sus siete bloques: hero con siluetas flotantes, "¿POR QUÉ ARCADE VAULT?", "JUEGOS DISPONIBLES AHORA", stats, "ACTIVIDAD EN VIVO", "PRECIOS" con FAQ, y CTA final.
- Animación de aparición al hacer scroll (`.reveal` → `.reveal.in`).
- Pulido de accesibilidad y responsive con `/frontend-design`.
- Comparación visual con Playwright contra el template a 1440 px y 375 px.

**Fuera de alcance (para specs futuros):**

- Pantalla "Acerca de" y su enlace en el Nav.
- CSS de `ABOUT PAGE`, `GAMEPAD`, `Theme variants`, `tweaks` y `spinner` del nuevo `styles.css`.
- Datos reales en el ticker, el top de jugadores o las stats (siguen siendo mock).
- Abrir directamente la pestaña "CREAR CUENTA" al llegar desde "✦ CREAR CUENTA".
- Autenticación, sesión y persistencia (igual que en el SPEC 01).
- Diff de píxeles automatizado y tests automatizados.

## Modelo de datos

### Rutas (`lib/router.ts`)

```ts
export type Route =
  | { name: "home" }                      // nuevo
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" };
```

| Hash             | Ruta                        | Cambio respecto al SPEC 01 |
| ---------------- | --------------------------- | -------------------------- |
| `#/` o vacío     | `{ name: "home" }`          | Antes era la Biblioteca.   |
| `#/biblioteca`   | `{ name: "biblioteca" }`    | Nuevo.                     |
| `#/juego/:id`    | `{ name: "detalle", id }`   | Sin cambios.               |
| `#/jugar/:id`    | `{ name: "player", id }`    | Sin cambios.               |
| `#/acceso`       | `{ name: "auth" }`          | Sin cambios.               |
| `#/salon`        | `{ name: "salon" }`         | Sin cambios.               |

Reglas:

- Un hash desconocido o un `:id` que no existe en `GAMES` resuelve a `{ name: "home" }`.
- Los `navigate({ name: "biblioteca" })` existentes (Detalle, Reproductor, Acceso, Salón) no se tocan; `toHash` los lleva a `#/biblioteca`.

### Datos del Home (`lib/home.ts`)

```ts
import type { GameColor } from "@/lib/games";

export type FeatureIconKind = "GAMEPAD" | "FREE" | "TROPHY" | "ROCKET";

export interface Feature {
  icon: FeatureIconKind;
  title: string;        // "JUEGOS CLÁSICOS"
  desc: string;
  color: GameColor;
}

export interface HomeStat {
  n: string;            // número grande: "8", "MILES", "GLOBAL"
  u: string;            // "JUEGOS"
  s: string;            // "Y CONTANDO"
}

export interface RecentScore {
  player: string;       // "NEONFOX"
  gameId: string;       // id de GAMES: "caida"
  score: number;        // 184220
  ago: string;          // "hace 2 min"
  color: GameColor;     // color neón del nombre del jugador
}

export interface TopPlayer {
  rank: number;         // 1..5
  player: string;
  score: number;
}

export interface Faq {
  q: string;
  a: string;
}

export const FEATURES: Feature[];            // 4, textos idénticos al template
export const HOME_STATS: HomeStat[];         // 3; el primero usa String(GAMES.length)
export const RECENT_SCORES: RecentScore[];   // 7, mismos jugadores, puntuaciones, tiempos y colores del template
export const TOP_PLAYERS: TopPlayer[];       // 5, idénticos al template
export const PRICING_PERKS: string[];        // 6 líneas "✔ …" del plan
export const FAQS: Faq[];                    // 3, idénticas al template
```

Reglas:

- Textos derivados de `GAMES` en lugar de copiados del template:
  - Primera stat: `n = String(GAMES.length)` (hoy "8"; el template dice "12+").
  - Ticker: el nombre del juego se toma de `GAMES` por `gameId` (hoy "CAÍDA"; el template dice "Caída").
- Mapa `gameId` del ticker: Caída → `caida`, Glotón → `gloton`, Invasores → `invasores`, Rocas → `rocas`, Bloque Buster → `bloque-buster`, Serpentina → `serpentina`, Ranaria → `ranaria`.
- Una fila del ticker cuyo `gameId` no esté en `GAMES` no se renderiza.
- El resto de textos (hero, features, precios, FAQ, CTA final) se copian literal del template.
- Las puntuaciones se formatean con `toLocaleString("es-ES")` como en el SPEC 01.
- El ancho de la barra del top es `100 - i * 16` % (100, 84, 68, 52, 36).
- El carril de juegos muestra `GAMES.slice(0, 6)`.

## Plan de implementación

1. **Estilos.** Añadir al final de `app/globals.css` los bloques `HOME PAGE` (líneas 930–1069), `ACTIVITY` y `PRICING` (líneas 1621–1725) de `references/templates/home-about/styles.css`, sin cambios. Añadir un bloque `@media (prefers-reduced-motion: reduce)` que deje `.reveal` visible sin transición y quite la animación a `.home-silos .silo`, `.hero-scroll .arrow` y `.home .pulse`. Verificación: `npm run lint` pasa y las pantallas del SPEC 01 se ven igual.
2. **Ruta y Nav.** En `lib/router.ts` añadir `{ name: "home" }`, mapear `#/` a Home y `#/biblioteca` a Biblioteca, y cambiar el fallback a Home. En `components/App.tsx` añadir el `case "home"` con un placeholder. En `components/Nav.tsx` añadir "Inicio" como primer enlace (escritorio y panel móvil) con estado activo, cambiar el `href` de "Biblioteca" a `#/biblioteca` y el `aria-label` del logo a "Arcade Vault, ir al inicio". Verificación: `/` muestra el placeholder, "Biblioteca" abre la Biblioteca y atrás/adelante funcionan.
3. **Datos.** Crear `lib/home.ts` con el modelo de arriba. Verificación: `npm run lint` pasa.
4. **Piezas visuales.** Crear `components/home/PixelArt.tsx` con `FloatingSilhouettes` (las 8 siluetas SVG, `aria-hidden`) y `FeatureIcon` (4 iconos). Crear `components/home/MiniCard.tsx` como `<a className="mini-card" href="#/juego/:id">` con portada, título y categoría.
5. **Hook de aparición.** Crear `lib/useReveal.ts`: un hook que recibe un `ref` al contenedor, observa sus `.reveal` con `IntersectionObserver` (`threshold: 0.12`), añade `.in` y deja de observar. Si `IntersectionObserver` no existe, añade `.in` a todos. Se desconecta al desmontar.
6. **Home, parte 1.** Crear `components/screens/Home.tsx` con `.home.fade-in`, el hero (eyebrow con cursor parpadeante, título en tres líneas, subtítulo, CTAs "▶ EXPLORAR JUEGOS" → `#/biblioteca` y "✦ CREAR CUENTA" → `#/acceso`, indicador "DESLIZA ▼"), la sección `// 01` de features y la sección `// 02` con el carril de mini-tarjetas y "VER TODOS LOS JUEGOS →" → `#/biblioteca`. Todos los CTAs son `<a className="btn …" href>`. Sustituir el placeholder de `App.tsx` por `<Home />`.
7. **Home, parte 2.** Añadir a `Home.tsx` la franja de stats, la sección `// 03` (ticker de últimas puntuaciones con retardo escalonado de 60 ms por fila, y top 5 con "VER SALÓN →" → `#/salon`), la sección `// 04` (tarjeta de precio con sello "FREE PLAY", "EMPEZAR GRATIS →" → `#/acceso` y las 3 FAQ) y el CTA final "INSERTAR MONEDA →" → `#/biblioteca`. Los retardos de transición (80 ms por feature, 90 ms por stat) se mantienen como en el template.
8. **Pulido con `/frontend-design`.** Revisar el Home a 1440 px y 375 px sin cambiar la estética: foco visible en mini-tarjetas y CTAs, siluetas e iconos decorativos con `aria-hidden`, jerarquía de encabezados (`h1` en el hero, `h2` por sección) y sin scroll horizontal.
9. **Comparación con Playwright.** Servir el template con `python3 -m http.server 5500 --directory references/templates/home-about` y abrir `http://localhost:5500/arcade-vault-standalone.html`; abrir la app en `http://localhost:3000/`. En ambos, a 1440 px y a 375 px: hacer scroll hasta el final para disparar los `.reveal`, esperar a que terminen las transiciones y sacar una captura de página completa. Comparar sección por sección (textos, colores, disposición, espaciados, animaciones), corregir las diferencias no aceptadas y repetir. Al terminar, añadir a este spec una sección "Resultado de la comparación" con las diferencias que quedan y su motivo. Las capturas no se versionan.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación al abrir `/`.
- [ ] Abrir `/` muestra el Home con el título "EL ARCADE / CLÁSICO ESTÁ / DE VUELTA".
- [ ] Abrir `/#/biblioteca` muestra la Biblioteca con las 8 tarjetas.
- [ ] Abrir `#/cualquier-cosa` o `#/juego/no-existe` muestra el Home.
- [ ] El Nav muestra "Inicio" como primer enlace, marcado activo en el Home.
- [ ] El Nav no muestra "Acerca de".
- [ ] "Biblioteca" en el Nav sigue marcado activo en Biblioteca, Detalle y Reproductor.
- [ ] Clic en el logo lleva a `#/` y muestra el Home.
- [ ] "▶ EXPLORAR JUEGOS", "VER TODOS LOS JUEGOS →" e "INSERTAR MONEDA →" llevan a `#/biblioteca`.
- [ ] "✦ CREAR CUENTA" y "EMPEZAR GRATIS →" llevan a `#/acceso`.
- [ ] "VER SALÓN →" lleva a `#/salon`.
- [ ] El carril muestra exactamente los 6 primeros juegos de `GAMES` y clic en uno lleva a `#/juego/<id>`.
- [ ] Todos los CTAs y mini-tarjetas del Home son `<a href>` alcanzables con Tab y con foco visible.
- [ ] Hay 8 siluetas flotantes en el hero y ninguna es anunciada por lectores de pantalla (`aria-hidden`).
- [ ] La primera stat muestra el valor de `GAMES.length` ("8").
- [ ] El ticker muestra 7 filas y el nombre de cada juego coincide con su `title` en `GAMES`.
- [ ] El top muestra 5 filas; #01, #02 y #03 en oro, plata y bronce.
- [ ] Las secciones con `.reveal` aparecen (reciben `.in`) al entrar en pantalla al hacer scroll.
- [ ] Con `prefers-reduced-motion: reduce` emulado, todas las secciones son visibles sin hacer scroll y las siluetas no se mueven.
- [ ] Desde la Biblioteca, el botón atrás del navegador vuelve al Home.
- [ ] Los botones "VOLVER AL VAULT" / "VOLVER A LA BIBLIOTECA" de las otras pantallas llevan a `#/biblioteca`.
- [ ] A 375 px no hay scroll horizontal; las features van en 1 columna y el carril en 2.
- [ ] Existen capturas de página completa del template y de la app a 1440 px y 375 px, comparadas con Playwright.
- [ ] Este spec contiene la sección "Resultado de la comparación" y toda diferencia listada ahí tiene un motivo.

## Decisiones

- **Sí:** Home en `#/` y Biblioteca en `#/biblioteca`. Decisión del usuario; replica el template, donde el logo lleva al Home.
- **No:** Home en `#/inicio`. Dejaba el Home como pantalla secundaria, lejos del template.
- **Sí:** fallback de rutas desconocidas al Home. Sustituye el criterio del SPEC 01 que redirigía a la Biblioteca.
- **Sí:** solo el enlace "Inicio" en el Nav. Decisión del usuario; "Acerca de" llega con su pantalla en otro spec.
- **No:** "Acerca de" como placeholder. Un enlace a una pantalla inexistente confunde.
- **Sí:** datos mock en `lib/home.ts` tipado. Decisión del usuario; separa datos y UI como `lib/games.ts`.
- **No:** arrays inline en el componente. Mezcla datos y marcado.
- **Sí:** `<a href>` con las clases del template para CTAs y mini-tarjetas. Decisión del usuario; mismo aspecto, navegable por teclado, clic central funciona. Sigue la decisión del Nav del SPEC 01.
- **No:** `<div onClick>` / `<button onClick>` como el template. Peor accesibilidad.
- **Sí:** respetar `prefers-reduced-motion`. Decisión del usuario; sin esa preferencia el Home se ve idéntico al template.
- **Sí:** derivar de `GAMES` la stat de número de juegos y los nombres del ticker. Decisión del usuario; evita textos que contradicen el catálogo.
- **No:** copiar "12+" y los nombres en minúscula del template. Incoherente con los 8 juegos reales.
- **Sí:** portar solo los bloques de CSS del Home. El resto del nuevo `styles.css` pertenece a otras pantallas.
- **Sí:** comparación con capturas de página completa a 1440 px y 375 px, corrigiendo a ojo. Decisión del usuario.
- **No:** diff de píxeles automatizado. Las animaciones (float, blink, pulse, grilla del fondo) lo hacen inestable.
- **Sí:** servir el template por HTTP local en lugar de `file://`. Playwright puede bloquear `file://` y el bundle decodifica assets con `fetch`.
- **Sí:** no versionar las capturas. Son un artefacto de verificación; el resultado queda por escrito en este spec.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Ahora el servidor renderiza el Home (snapshot vacío = `#/`); los deep links a otras pantallas muestran el Home un instante. | Aceptado, igual que el parpadeo del SPEC 01. Verificar que no hay avisos de hidratación. |
| `toLocaleString("es-ES")` se renderiza en el servidor por primera vez (el Home es la pantalla SSR) y puede diferir del cliente. | Node 20 trae ICU completo; verificar la consola. Si aparece el aviso, formatear tras montar. |
| Los `.reveal` empiezan con `opacity: 0`; si el hook falla, las secciones quedan invisibles. | Fallback en `useReveal` sin `IntersectionObserver` y regla de reduced-motion que las hace visibles. |
| Capturas de página completa con `.reveal` sin disparar salen con secciones vacías. | Hacer scroll hasta el final y esperar las transiciones antes de capturar. |
| El template standalone carga Google Fonts desde internet; sin red las fuentes no coinciden. | Hacer la comparación con conexión; si falla, anotarlo en "Resultado de la comparación". |
| Las siluetas absolutas del hero provocan scroll horizontal en móvil. | `.home-hero` tiene `overflow: hidden`; verificar a 375 px. |
| Cambiar `#/` rompe marcadores o enlaces a la Biblioteca. | Proyecto sin usuarios; se acepta. |

## Resultado de la comparación

Comparación del 2026-09-30 con Playwright (Chromium). Template servido en `http://localhost:5500/arcade-vault-standalone.html`, con conexión, así que Google Fonts cargó. App servida desde `npm run build` + `next start -p 3001`: el `next dev` que ya corría en `:3000` seguía sirviendo un `globals.css` antiguo y no reflejaba los últimos cambios de CSS. Capturas de página completa a 1440 px y 375 px, tras hacer scroll hasta el final (los 6 `.reveal` con `.in`) y esperar a las transiciones. Revisión sección por sección con recortes lado a lado, usando la diferencia media por franjas de 100 px solo como guía para saber dónde mirar.

- **1440 px:** misma altura (3909 px). Fuera del hero, todas las franjas dan diferencia 0 salvo la stat "8".
- **375 px:** misma altura (6320 px). El template mide 396 px de ancho porque se desborda en horizontal; la app mide 360 px.

### Diferencias corregidas durante la comparación

| Diferencia | Causa | Corrección |
| --- | --- | --- |
| Los botones `.btn.pulse` ("EXPLORAR JUEGOS", "EMPEZAR GRATIS", "INSERTAR MONEDA") se veían con el texto gris y sin brillo. | Tailwind v4 trae su propio `@keyframes pulse` (opacidad 0.5), que sustituía al del template, así que el botón se desvanecía en lugar de brillar. | Keyframes renombrados a `btn-pulse` en `app/globals.css`. Arregla también el botón "JUGAR" del Detalle (SPEC 01), que tenía el mismo fallo. |
| "→" y "▼" (y en general los glifos que no tiene Press Start 2P: ▸, ✦) se dibujaban más anchos que en el template. | `next/font` mete un fallback basado en Arial justo después de cada fuente, así que esos glifos los dibujaba Arial y no `system-ui` como en el template. Es el mismo problema que el ▲ de `.cover-rocas` del SPEC 01. | Dentro de `.home`, `--pixel` y `--mono` usan las pilas de fuentes del template tal cual. |
| A 375 px, las tarjetas de "ACTIVIDAD EN VIVO" medían 339 px en una columna de 296 px y se cortaban por la derecha. | La pista `1fr` crecía hasta el ancho del título "▸ TOP JUGADORES · HOY", que no hace salto de línea. El template tiene el mismo fallo (paso 8). | `.activity-grid` pasa a `minmax(0, 1fr)` por debajo de 900 px. |

### Diferencias que quedan

| Diferencia | Motivo |
| --- | --- |
| La primera stat muestra "8" y no "12+". | Decisión del spec: se deriva de `GAMES.length`. |
| El ticker muestra "CAÍDA", "GLOTÓN"… en mayúsculas; el template, "Caída", "Glotón"… | Decisión del spec: el nombre sale del `title` de `GAMES`. |
| A 375 px, el título "▸ TOP JUGADORES · HOY" se corta con "…" y "VER SALÓN →" queda entero dentro de la tarjeta. En el template la tarjeta se desborda y se corta por la derecha. | Pulido de responsive del paso 8 (sin scroll horizontal). La elipsis ya venía en el CSS del template (`.ac-title`). |
| A 375 px, la app no tiene scroll horizontal (360 px de ancho); el template mide 396 px. | La corrección de `.activity-grid` de arriba y el pulido de pantallas estrechas del SPEC 01. |
| A 375 px, el botón ☰ del Nav se ve entero; en el template se corta por la derecha. | Pulido de pantallas estrechas del SPEC 01, no de este spec. |
| El Home no tiene los enlaces "Acerca de" del Nav. | Fuera de alcance: va en su propio spec. |
| Diferencias pequeñas en el hero y en los botones con brillo. | No son diferencias reales: las siluetas flotan y `.pulse` brilla sin estar sincronizados entre las dos capturas. |

### Notas

- El cursor `_` del eyebrow no parpadea, igual que en el template: su regla `.blink` solo aplica dentro de `.av-hero .sub`. El paso 6 habla de un "cursor parpadeante"; se mantuvo el comportamiento del template por decisión del usuario.
- Iguales al template, así que no cuentan como diferencias: a 375 px el `max-height: 360px` del ticker corta las últimas filas (cada fila ocupa 4 líneas), y "+7820" sale sin punto de miles porque `toLocaleString("es-ES")` no agrupa los números de 4 cifras.
- Las capturas quedaron en `.playwright-mcp/compare/` (ignorado por git) y no se versionan.

## Lo que **no** entra en este spec

- Pantalla "Acerca de" y su enlace en el Nav.
- CSS de About, Gamepad, variantes de tema, tweaks y spinner.
- Datos reales en ticker, top de jugadores y stats.
- Pestaña "CREAR CUENTA" preseleccionada al llegar desde el Home.
- Autenticación, sesión y persistencia.
- Diff de píxeles y tests automatizados.

Cada uno, si llega, va en su propio spec.
