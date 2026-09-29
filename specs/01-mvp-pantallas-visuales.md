# SPEC 01 — MVP visual de Arcade Vault

> **Estado:** Implementado
> **Depende de:** —
> **Fecha:** 2026-09-28
> **Objetivo:** Replicar fielmente en Next.js las cinco pantallas de `references/templates/` como una SPA con router por hash, solo con la parte visual y sin juegos reales.

## Por qué existe este spec

El proyecto es un scaffold vacío de `create-next-app`.
El diseño ya existe como prototipo React-en-el-navegador (Babel standalone + `window.*` globals) en `references/templates/`.
Este spec convierte ese prototipo en código real del proyecto (TypeScript, App Router, `next/font`) sin cambiar la estética.
Se mantiene deliberadamente la navegación por hash del template en lugar de rutas del App Router.

## Alcance

**Dentro:**

- Estilos del template portados a `app/globals.css`, con los tokens de color expuestos en `@theme` de Tailwind v4.
- Fuentes Press Start 2P y JetBrains Mono cargadas con `next/font/google`, reemplazando a Geist.
- Fondo decorativo (`.av-bg`, `.av-noise`) en el layout raíz.
- Datos mock tipados: `GAMES`, `CATS`, `seededScores`.
- Router SPA por hash legible, con soporte de atrás/adelante del navegador.
- Nav (escritorio + panel móvil con hamburguesa) y footer.
- Pantalla **Biblioteca**: hero, buscador, chips de categoría, grilla de tarjetas con efecto tilt, estado "NO HAY RESULTADOS".
- Pantalla **Detalle**: portada, tags, descripción, stat-strip, botones, leaderboard de 10 filas.
- Pantalla **Reproductor**: HUD, CRT con arena decorativa, puntuación simulada que sube sola, subida de nivel, pausa, modal "FIN DEL JUEGO".
- Pantalla **Acceso**: pestañas iniciar sesión / crear cuenta, formulario, "jugar como invitado", botones sociales.
- Pantalla **Salón de la Fama**: pestañas por juego, podio, tabla de 12 filas.
- Textos de la UI en español, idénticos al template.

**Fuera de alcance (para specs futuros):**

- Cualquier juego real jugable.
- Autenticación real, sesión de usuario y estado "logueado" (el Nav siempre muestra "Iniciar Sesión").
- Persistencia de puntuaciones (localStorage, base de datos o API).
- Fila "TU MEJOR MARCA" del Salón de la Fama (depende de tener usuario).
- Login social funcional (Google / GitHub).
- Contador de créditos funcional.
- Rutas reales del App Router (`/juegos/[id]`, etc.) y SEO por pantalla.
- Tests automatizados (no hay test runner configurado).

## Modelo de datos

Todo vive en `lib/games.ts` y `lib/router.ts`.
Son datos mock en memoria; nada se persiste.

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;          // "bloque-buster", "caida", ...
  title: string;       // "BLOQUE BUSTER"
  short: string;       // descripción corta (tarjeta)
  long: string;        // descripción larga (detalle)
  cat: GameCategory;
  cover: string;       // clase CSS: "cover-bricks", "cover-tetro", ...
  color: GameColor;
  best: number;        // mejor puntuación global
  plays: string;       // "12.4K"
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;        // "DD/MM/2026"
}

export const GAMES: Game[];                              // los 8 juegos de data.jsx, sin cambios
export const CATS: ("TODOS" | GameCategory)[];          // ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"]
export function seededScores(seed: number, count?: number): ScoreRow[]; // mismo algoritmo determinista del template
```

```ts
// lib/router.ts
export type Route =
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" };
```

Mapa hash ↔ ruta:

| Hash             | Ruta                           |
| ---------------- | ------------------------------ |
| `#/` o vacío     | `{ name: "biblioteca" }`       |
| `#/juego/:id`    | `{ name: "detalle", id }`      |
| `#/jugar/:id`    | `{ name: "player", id }`       |
| `#/acceso`       | `{ name: "auth" }`             |
| `#/salon`        | `{ name: "salon" }`            |

Reglas:

- Un hash desconocido resuelve a `{ name: "biblioteca" }`.
- Un `:id` que no existe en `GAMES` resuelve a `{ name: "biblioteca" }`.
- `seededScores` debe dar exactamente las mismas filas que el template para las mismas semillas (Detalle: `id.length * 17 + 3`, 10 filas; Salón: `id.length * 23 + 7`, 12 filas).

## Plan de implementación

1. **Estilos y fuentes.** Copiar `references/templates/styles.css` a `app/globals.css` debajo de `@import "tailwindcss";` y declarar los colores (`--cyan`, `--magenta`, `--yellow`, `--green`, `--gold`, `--silver`, `--bronze`, `--ink*`, `--bg*`) en `@theme`. En `app/layout.tsx`, quitar Geist, cargar `Press_Start_2P` y `JetBrains_Mono` con `next/font/google` y conectarlas a `--pixel` y `--mono`. Poner `lang="es"`, metadata `title: "Arcade Vault · Portal Retro"` y los divs `.av-bg` y `.av-noise` antes de `{children}`. Verificación: `npm run dev` muestra la página del scaffold sobre el fondo neón con la grilla animada.
2. **Datos y router.** Crear `lib/games.ts` y `lib/router.ts` con el modelo de arriba, más `parseHash(hash): Route` y `toHash(route): string`. Verificación: `npm run lint` pasa.
3. **Shell de la SPA.** Crear `components/App.tsx` (`"use client"`) con un hook `useHashRoute()` que lee `location.hash`, escucha `hashchange`, expone `navigate(route)` y hace `scrollTo(0, 0)` al cambiar de ruta. Crear `components/Nav.tsx` (logo, enlaces con estado activo, "CRÉDITOS · 03", botón "Iniciar Sesión", hamburguesa y panel móvil) y `components/Footer.tsx`. Reemplazar `app/page.tsx` para que renderice `<App />`. Cada pantalla es de momento un placeholder con su nombre. Verificación: los enlaces del Nav cambian el hash y el placeholder; atrás/adelante funcionan.
4. **Biblioteca.** Crear `components/GameCard.tsx` (portada, meta, tilt 3D con el ratón, botón JUGAR con color según `game.color`) y `components/screens/Library.tsx` (hero con flicker y cursor parpadeante, buscador por título, chips de categoría, estado vacío). Clic en tarjeta o JUGAR navega a `#/juego/:id`.
5. **Detalle.** Crear `components/screens/GameDetail.tsx` con portada, tags fijos, título, descripción larga, stat-strip (partidas, mejor global, dificultad fija "★ ★ ★ ☆ ☆"), botones "▶ JUGAR AHORA" (→ `#/jugar/:id`) y "VOLVER AL VAULT", y el leaderboard con top1/top2/top3 resaltados.
6. **Reproductor.** Crear `components/screens/GamePlayer.tsx` con HUD (jugador fijo "INVITADO", puntuación, vidas, nivel), CRT con arena decorativa, simulación de puntuación (+10..99 cada 220 ms, sube nivel como en el template), PAUSA/REANUDAR con overlay "EN PAUSA", FIN abre el modal, SALIR vuelve al detalle. El modal permite editar iniciales (mayúsculas, máx. 10), "GUARDAR PUNTUACIÓN" muestra el toast "▸ PUNTUACIÓN GUARDADA_" sin persistir nada, "JUGAR DE NUEVO" reinicia y "VOLVER AL VAULT" navega a la Biblioteca. El intervalo se limpia al pausar, terminar o desmontar.
7. **Acceso.** Crear `components/screens/Auth.tsx` con pestañas "INICIAR SESIÓN" / "CREAR CUENTA" (el campo de correo aparece solo en crear cuenta), campos controlados, submit y "JUGAR COMO INVITADO" que navegan a la Biblioteca sin guardar nada, botones sociales inertes y texto legal.
8. **Salón de la Fama.** Crear `components/screens/HallOfFame.tsx` con cabecera, pestañas por juego (por defecto el primero de `GAMES`), podio 02/01/03 y tabla con animación escalonada por fila. Sin fila "TU MEJOR MARCA". Botón "VOLVER A LA BIBLIOTECA".
9. **Pulido con `/frontend-design`.** Revisar las cinco pantallas a 1440 px y a 375 px sin cambiar la estética: foco visible en controles, `aria-label` en botones de solo icono, sin scroll horizontal. Eliminar los placeholders que queden.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] La consola del navegador no muestra errores ni avisos de hidratación en ninguna pantalla.
- [ ] `app/layout.tsx` no importa Geist y usa Press Start 2P y JetBrains Mono vía `next/font/google`.
- [ ] No queda ninguna etiqueta `<link>` a `fonts.googleapis.com` ni script de unpkg en el proyecto.
- [ ] Abrir `/` muestra la Biblioteca con las 8 tarjetas de juegos.
- [ ] Escribir "ca" en el buscador deja visible solo "CAÍDA".
- [ ] Seleccionar el chip "SHOOTER" deja visibles solo "INVASORES" y "ROCAS".
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta cambia el hash a `#/juego/<id>` y muestra el Detalle de ese juego con 10 filas de leaderboard.
- [ ] "▶ JUGAR AHORA" cambia el hash a `#/jugar/<id>` y la puntuación del HUD empieza a subir sola.
- [ ] PAUSA detiene la puntuación y muestra "EN PAUSA"; REANUDAR la reactiva.
- [ ] FIN abre el modal "FIN DEL JUEGO" con la puntuación final congelada.
- [ ] "GUARDAR PUNTUACIÓN" muestra "▸ PUNTUACIÓN GUARDADA_" y no escribe nada en `localStorage`.
- [ ] "JUGAR DE NUEVO" deja la puntuación en 0, 3 vidas y nivel 01.
- [ ] La pestaña "CREAR CUENTA" de Acceso muestra el campo de correo; "INICIAR SESIÓN" lo oculta.
- [ ] Enviar el formulario de Acceso navega a la Biblioteca y el Nav sigue mostrando "Iniciar Sesión".
- [ ] El Salón de la Fama muestra podio y 12 filas; cambiar de pestaña cambia los nombres y puntuaciones.
- [ ] Recargar la página en `#/salon` (o cualquier otro hash válido) muestra esa misma pantalla.
- [ ] Abrir `#/juego/no-existe` o `#/cualquier-cosa` muestra la Biblioteca.
- [ ] El botón atrás del navegador vuelve a la pantalla anterior.
- [ ] A 375 px de ancho el Nav muestra la hamburguesa, el panel móvil abre y cierra, y ninguna pantalla tiene scroll horizontal.
- [ ] Las cinco pantallas coinciden visualmente con `references/templates/Arcade Vault.html` abierto en el navegador (mismos textos, colores, disposición y animaciones).

## Decisiones

- **Sí:** SPA con router por hash en una sola página (`app/page.tsx`). Decisión del usuario; mantiene el modelo del template.
- **No:** rutas reales del App Router (`/juegos/[id]`…). Se descartó para este MVP; puede llegar en otro spec.
- **Sí:** hash legible (`#/juego/caida`). Se puede leer y compartir.
- **No:** hash JSON codificado como el template. Ilegible en la barra de direcciones.
- **Sí:** enlaces del Nav como `<a href="#/...">` nativos. Accesibles, funcionan con clic central y no necesitan `onClick`.
- **Sí:** portar `styles.css` a `app/globals.css` y exponer tokens en `@theme`. Máxima fidelidad y menor riesgo; Tailwind queda disponible para lo nuevo.
- **No:** CSS Modules por pantalla. Más trabajo de partición sin beneficio en un MVP.
- **No:** reescribir en utilidades Tailwind. Lento y con riesgo de perder animaciones, pseudo-elementos y el efecto CRT.
- **Sí:** `next/font/google` para Press Start 2P y JetBrains Mono, retirando Geist. Fuentes self-hosted y sin salto de layout.
- **No:** Courier Prime como fuente cargada. Solo queda como fallback en el stack de `--mono`.
- **Sí:** solo visual, sin estado de sesión ni persistencia. Decisión del usuario; el Nav siempre muestra "Iniciar Sesión".
- **Sí:** mantener la simulación del Reproductor (puntuación automática, pausa, modal). Permite ver todos los estados de la pantalla sin un juego real.
- **Sí:** réplica fiel del template; `/frontend-design` solo para pulir accesibilidad y responsive. Decisión del usuario.
- **Sí:** `components/` y `lib/` en la raíz con alias `@/`. Separa UI de datos y sigue el `tsconfig.json` existente.
- **Sí:** hash o id inválido → Biblioteca. El template devolvía `null` (pantalla vacía); redirigir es más claro.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| El servidor no conoce el hash; un deep link (`#/salon`) renderiza primero la Biblioteca y provoca parpadeo o error de hidratación. | Leer el hash con `useSyncExternalStore` (snapshot de servidor = Biblioteca) o tras montar. Aceptar el parpadeo inicial en este MVP. |
| El preflight de Tailwind v4 choca con el reset del template (botones, inputs, márgenes). | El CSS portado va después de `@import "tailwindcss"` y sobreescribe; comparar con el template en el paso 1. |
| `html, body, #root { height: 100% }` del template no aplica porque Next no tiene `#root`. | Ajustar el selector al contenedor real del layout al portar. |
| `Math.random()` en la simulación o en render causa diferencias servidor/cliente. | La simulación solo corre dentro de `useEffect`; la puntuación inicial es 0. |
| `toLocaleString("es-ES")` formatea distinto en servidor y cliente. | Las pantallas se renderizan en cliente dentro de `App`; verificar la ausencia de avisos de hidratación. |

## Lo que **no** entra en este spec

- Juegos reales jugables.
- Login, registro, sesión y login social reales.
- Guardado de puntuaciones y fila "TU MEJOR MARCA".
- Créditos funcionales.
- Rutas del App Router y SEO por pantalla.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
