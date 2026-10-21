# SPEC 17 — Adaptación móvil

> **Estado:** Draft
> **Depende de:** SPEC 01, SPEC 02, SPEC 03, SPEC 07, SPEC 14, SPEC 15
> **Fecha:** 2026-10-20
> **Objetivo:** Que todas las pantallas de Arcade Vault quepan, se lean y se toquen bien en móvil y tablet, en vertical y en horizontal, sin cambiar el escritorio a 1440 px.

## Por qué existe este spec

El SPEC 14 dejó tres pendientes: la cabecera desborda entre ~840 y ~900 px, en horizontal la cabecera fija tapa el CRT y falta la prueba en dispositivo real.
La auditoría de `mobile-porter` del 2026-10-20 (ver "Resultado de la auditoría") confirma los dos primeros y encuentra cinco causas más.
La más grave es nueva: en TETRIS, a 360 y 390 px de ancho, el botón → y el botón ROTAR se solapan (42 px y 12 px), así que un toque en la zona común puede despachar la tecla equivocada.
La cabecera es la segunda: a 844×390 su contenido mide 919 px, el navegador móvil aleja la página entera (el viewport de layout pasa a 919×425) y todo se ve un 8 % más pequeño.
FROGGER (SPEC 15) cumple el contrato táctil del SPEC 14, pero su canvas mide 224×210 a 360 px (celdas de 14 px) y la cruceta acaba en y = 816, por debajo de los 740 px de la pantalla.
Este spec arregla todo eso solo con CSS por capacidad (`TOUCH_QUERY`, orientación) y cortes de ancho en la cabecera, más cuatro estilos en línea que pasan a clases.
La app instalada (manifest, iconos, `themeColor`, zonas seguras) va aparte, en el SPEC 18.

## Alcance

**Dentro:**

- Cabecera: menú lateral hasta 1180 px, sin CRÉDITOS entre 1181 y 1319 px y sin el botón "Iniciar Sesión" hasta 560 px.
- Cabecera no fija en el player en horizontal táctil.
- Objetivos táctiles de al menos 44×44 px y 8 px de separación en táctil.
- Texto `JetBrains Mono` de al menos 12 px en táctil.
- Campos de texto a 16 px en táctil, para que iOS no haga zoom al enfocarlos.
- Zonas de TETRIS sin solaparse a 360 y 390 px.
- Player en vertical táctil estrecho: HUD compacto y CRT con menos marco, para que el canvas crezca y la cruceta quepa en la primera pantalla.
- `.home-hero` con `100svh` en lugar de `100vh`.
- Estilos en línea de `Footer.tsx`, `GameDetail.tsx`, `Auth.tsx` y del HUD de `GamePlayer.tsx` convertidos en clases, con los mismos valores en escritorio.
- Pulido con `/frontend-design`, verificación con Playwright y prueba en dispositivo real.

**Fuera de alcance (para specs futuros):**

- Manifest, iconos, `themeColor`, `viewport-fit`, `appleWebApp` y zonas seguras: SPEC 18.
- Todo lo que el SPEC 14 dejó fuera: gestos sobre el canvas, vibración, pantalla completa, bloqueo de orientación o aviso de girar, interruptor manual de los botones, ocultar la tira `<kbd>`, botones configurables, ratón y gamepad.
- Cambiar la proporción 4:3 de `.crt-screen` por la del motor (ver Decisiones).
- Cambios en los motores (`lib/<id>/engine.ts`, `input.ts`), `GameCanvas.tsx`, `lib/engines/registry.ts`, `lib/engines/touch.ts` y los `definition.ts`.
- Rediseño de la cabecera de escritorio o del menú lateral.
- El aviso de React por `key` repetida en la tira de controles (nota del SPEC 15), que es de un spec del player.

## Modelo de datos

Este spec no añade estructuras de datos.
Cambia reglas de `app/globals.css` y cuatro estilos en línea.
`TOUCH` abrevia `(hover: none) and (pointer: coarse)`, la misma `TOUCH_QUERY` del SPEC 14.

### 1. Cabecera (`app/globals.css`, regla de la línea 329)

```css
@media (max-width: 1180px) {
  /* antes 840px; mismo contenido */
  .av-nav {
    padding: 12px 16px;
  }
  .av-nav .links,
  .av-nav .coin-counter {
    display: none;
  }
  .av-nav .hamburger {
    display: inline-flex;
  }
}
@media (min-width: 1181px) and (max-width: 1319px) {
  .av-nav .coin-counter {
    display: none;
  }
}
@media (max-width: 560px) {
  .av-nav .auth-btn {
    display: none;
  } /* sigue en el menú lateral */
}
```

- La navegación completa sin saltos de línea necesita 1 304 px (medido: con CRÉDITOS cabe desde 1 320 px, sin CRÉDITOS desde 1 181 px).
- A 1 440 px no aplica ninguna de las tres reglas.

### 2. Cabecera en el player en horizontal táctil

```css
@media TOUCH and (orientation: landscape) {
  #root:has(.av-player) .av-nav {
    position: relative;
  }
}
```

- El resto de pantallas conserva la cabecera fija.
- `.player-stage` ya cabe en `100dvh` (SPEC 14); sin cabecera fija, un scroll lo deja entero en pantalla.

### 3. Objetivos táctiles (`TOUCH`)

```css
@media TOUCH {
  .btn,
  .chip,
  .skin-btn,
  .av-nav .logo,
  .auth-tabs button {
    min-height: 44px;
  }
  .lb-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
  }
  .av-nav .hamburger {
    min-width: 44px;
    min-height: 44px;
  }
  .av-nav .links,
  .hall-tabs,
  .player-skins {
    gap: 8px;
  }
  .av-search input {
    align-self: stretch;
  }
}
```

- `.player-skins` usa 6 px de hueco en `(max-width: 480px)` (línea 1377); la regla táctil va después y lo deja en 8 px.

### 4. Texto mono a 12 px (`TOUCH`)

```css
@media TOUCH {
  .mini-cat,
  .stat-s,
  .tk-t,
  .pc-foot,
  .score-badge,
  .stat-strip .l,
  .field label,
  .hud-stat .l,
  .player-skins,
  .player-controls,
  .player-controls kbd,
  .podium-slot .date,
  .av-footer,
  .lb-date,
  .auth-version,
  .auth-terms {
    font-size: 12px;
  }
}
```

Estilos en línea que pasan a clase, con los mismos valores en escritorio:

| Fichero                                | Hoy (en línea)                                                                             | Clase nueva     |
| -------------------------------------- | ------------------------------------------------------------------------------------------ | --------------- |
| `components/Footer.tsx`                | `borderTop`, `padding: 20px 32px`, `fontSize: 11`, `letterSpacing`                         | `.av-footer`    |
| `components/screens/GameDetail.tsx:79` | `fontSize: 10`, `color`, `letterSpacing` de la fecha                                       | `.lb-date`      |
| `components/screens/Auth.tsx:28`       | `fontSize: 11`, `color`, `letterSpacing`, `marginTop` de "ACCESO AL SISTEMA · v2.6"        | `.auth-version` |
| `components/screens/Auth.tsx:100`      | `marginTop`, `textAlign`, `fontSize: 11`, `color`, `letterSpacing` de "AL ENTRAR ACEPTAS…" | `.auth-terms`   |

### 5. Campos de texto a 16 px (`TOUCH`)

```css
@media TOUCH {
  .av-search input,
  .field input,
  .modal .input-row input,
  .contact-form input,
  .contact-form textarea {
    font-size: 16px;
  }
}
```

### 6. Zonas y HUD en vertical estrecho

```css
@media TOUCH and (max-width: 400px) {
  .touch-zone {
    gap: 8px;
  }
  .touch-btn[data-action] {
    padding: 0 6px;
    letter-spacing: 0.04em;
  }
  .stat-strip > div {
    padding: 12px 8px;
  }
}
@media TOUCH and (orientation: portrait) and (max-width: 600px) {
  .av-player {
    margin-top: 16px;
    padding: 0 12px 32px;
  }
  .player-hud {
    padding: 10px 12px;
    gap: 10px;
    margin-bottom: 14px;
  }
  .hud-stats {
    display: grid;
    grid-template-columns: repeat(4, auto);
    justify-content: space-between;
    width: 100%;
    gap: 10px;
  }
  .hud-actions {
    width: 100%;
  }
  .hud-actions .btn {
    flex: 1;
    padding: 12px 8px;
  }
  .hud-stat .v {
    font-size: 12px;
    white-space: nowrap;
  }
  .crt {
    padding: 12px;
    border-radius: 20px;
  }
}
```

- En `GamePlayer.tsx`, el `div` con `style={{ display: "flex", gap: 24, flexWrap: "wrap" }}` del HUD pasa a `className="hud-stats"`, con `.hud-stats { display: flex; gap: 24px; flex-wrap: wrap; }` para escritorio.
- `.touch-btn` sigue midiendo al menos 56×56 px y su `font-size` sigue en 10 px (a 9 px la Í de CAÍDA se lee como "±").
- `.stat-strip > div` baja su relleno porque, con las etiquetas a 12 px, la tira de `#/juego/asteroids` llega a x = 368 a 360 px.

### 7. Alto de la portada (línea 2305)

```css
.home-hero {
  min-height: calc(100svh - 60px);
}
```

- En escritorio `svh` es igual a `vh`.

## Plan de implementación

1. **Cabecera.** Reglas de "1. Cabecera". Verificación: sin táctil, a 841, 900, 1 000, 1 100 y 1 180 px `.av-nav` mide 66 px de alto y se ve el botón ≡; a 1 181, 1 250, 1 319 y 1 320 px mide 70 px; a 1 440 px, 70 px y sin ≡; `scrollWidth` ≤ ancho en todos.
2. **Cabecera en el player horizontal.** Regla de "2". Verificación: a 844×390 táctil, en `#/jugar/frogger`, con el borde inferior de `.player-stage` en el borde inferior de la pantalla, el borde superior de `.crt` queda en y ≥ 0 y `.av-nav` fuera de pantalla.
3. **Objetivos táctiles.** Reglas de "3". Verificación: en los siete contextos táctiles, ningún `a`, `button`, `input` visible mide menos de 44 px de alto ni de ancho.
4. **Texto mono.** Clases `.av-footer`, `.lb-date`, `.auth-version` y `.auth-terms`, y reglas de "4". Verificación: sin táctil a 1 440 px los cuatro elementos tienen el mismo `font-size`, `padding` y `letter-spacing` que hoy; en táctil, ningún texto `JetBrains Mono` mide menos de 12 px.
5. **Campos de texto.** Reglas de "5". Verificación: en táctil, el buscador de `#/biblioteca`, los dos campos de `#/acceso`, los tres de `#/acerca` y el de iniciales del modal FIN DEL JUEGO miden 16 px.
6. **Player en vertical.** Clase `.hud-stats` en `GamePlayer.tsx` y reglas de "6". Verificación: a 360×740, en `#/jugar/frogger`, el HUD mide 116 px, el canvas 250×234 y la cruceta acaba en y ≤ 740 con `scrollY` 0; en `#/jugar/tetris`, entre → y ROTAR hay 12 px.
7. **Portada.** Regla de "7". Verificación: `grep -n "100vh" app/globals.css` no devuelve nada.
8. **Pulido con `/frontend-design`.** Revisar a 360×740, 390×844 y 844×390 el HUD compacto, el marco del CRT a 12 px y la cabecera con solo logo y ≡, con la estética de `.btn`, `.skin-btn` y `.touch-btn`. Verificación: capturas de `#/`, `#/jugar/frogger` y `#/jugar/tetris` en las tres medidas.
9. **Verificación con Playwright.** `npm run build` + `next start -p 3005` (o el siguiente puerto libre), con el método del SPEC 14: un contexto nuevo con `hasTouch`, `isMobile` y `deviceScaleFactor` 3 por medida; escritorio a 1 440×900 sin táctil; comparación con `main` desde un worktree. Recorrer los criterios en los siete contextos y añadir "Resultado de la verificación".
10. **Prueba en dispositivo real (la hace el usuario).** `npm run build` + `next start -H 0.0.0.0` y abrir la IP del ordenador desde un móvil de la misma red, en vertical y en horizontal, en el navegador y añadida a la pantalla de inicio. Jugar FROGGER y TETRIS con los botones, enfocar el buscador y las iniciales, y anotar modelo, sistema, navegador y lo que falle.

## Criterios de aceptación

"Táctil" es un contexto de Playwright con `hasTouch`, `isMobile` y `deviceScaleFactor` 3.
"Escritorio" es 1 440×900 sin táctil.
Las rutas son `#/`, `#/biblioteca`, `#/juego/asteroids`, `#/juego/frogger`, `#/acceso`, `#/salon`, `#/acerca`, `#/jugar/asteroids`, `#/jugar/tetris`, `#/jugar/arkanoid`, `#/jugar/snake`, `#/jugar/frogger` y `#/jugar/gloton`.

**General**

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores.
- [ ] `document.documentElement.scrollWidth` ≤ ancho del viewport y `innerWidth` igual al ancho del contexto en todas las rutas a 360×740, 390×844, 844×390, 768×1024 y 1024×768.
- [ ] La consola no muestra errores (`console.error` ni `pageerror`) al abrir cada ruta en todos los contextos.
- [ ] `git diff main --name-only` no incluye ningún `lib/<id>/engine.ts`, `lib/<id>/input.ts`, `lib/<id>/definition.ts`, `GameCanvas.tsx`, `lib/engines/registry.ts` ni `lib/engines/touch.ts`.
- [ ] `grep -n "100vh" app/globals.css` no devuelve nada.

**Escritorio (1 440×900)**

- [ ] Las capturas de página completa de `#/` y de `#/jugar/asteroids` en `ready`, con el canvas tapado y las animaciones CSS desactivadas, son iguales byte a byte a las de `main`.
- [ ] `.av-nav` mide 70 px de alto, muestra Inicio, Biblioteca, Salón de la Fama, Acerca de, CRÉDITOS · 03 e "Iniciar Sesión", y no muestra ≡.
- [ ] El pie, la fecha del leaderboard de `#/juego/frogger` y los dos textos de `#/acceso` tienen el mismo `font-size` (11, 10, 11 y 11 px) que en `main`.

**Cabecera**

- [ ] Sin táctil, a 841, 900, 1 000, 1 100 y 1 180 px de ancho `.av-nav` mide 66 px y muestra ≡; a 1 181, 1 250 y 1 319 px mide 70 px, sin CRÉDITOS; a 1 320 px mide 70 px, con CRÉDITOS.
- [ ] En táctil, `.av-nav` mide 69 px de alto en los cinco contextos táctiles.
- [ ] A 360 y 390 px no se ve "Iniciar Sesión" en la cabecera y sí en el menú lateral.

**Objetivos táctiles y texto (todos los contextos táctiles)**

- [ ] Ningún `a`, `button`, `input`, `select` o `[role=button]` visible fuera de un párrafo mide menos de 44 px de alto o de ancho.
- [ ] Entre dos objetivos vecinos hay al menos 8 px, salvo las dos mitades de `.auth-tabs` y los botones de la cruceta (ver Decisiones).
- [ ] Ningún texto `JetBrains Mono` visible mide menos de 12 px y ningún texto `Press Start 2P` menos de 8 px.
- [ ] Los campos de texto de `#/biblioteca`, `#/acceso`, `#/acerca` y el de iniciales del modal FIN DEL JUEGO miden 16 px.
- [ ] La fila de skins (`.player-skins`) ocupa una sola línea a 360 px.

**Player en vertical (360×740 y 390×844)**

- [ ] En `#/jugar/frogger` a 360×740: HUD de 116 px, canvas de 250×234 (proporción 640:600) y cruceta de 174×174 que acaba en y ≤ 740 con `scrollY` 0.
- [ ] En `#/jugar/frogger` a 390×844: canvas de 274×257 y cruceta que acaba en y ≤ 844 con `scrollY` 0.
- [ ] En `#/jugar/tetris`, el borde izquierdo de ROTAR queda al menos 8 px a la derecha del borde derecho de → (12 px a 360, 42 px a 390), y `elementFromPoint` en el centro de cada botón devuelve ese botón.
- [ ] Los criterios "Táctil en vertical" del SPEC 14 siguen pasando en los cinco juegos con motor (ASTEROIDS, TETRIS, ARKANOID, SNAKE y FROGGER), también a 360×740: zonas bajo el CRT, cruceta de SNAKE y FROGGER con ↑ encima de ← y →, `.touch-btn` ≥ 56×56, "TOCA PARA EMPEZAR", tocar el CRT empieza la partida y pausa sin "O P".
- [ ] FROGGER mantiene sus `aria-label` "Saltar arriba", "Saltar a la izquierda", "Saltar a la derecha" y "Saltar abajo", y su zona derecha sin botones.

**Player en horizontal (844×390 y 1024×768)**

- [ ] En `#/jugar/frogger`, `#/jugar/asteroids` y `#/jugar/gloton` a 844×390, con el borde inferior de `.player-stage` en el borde inferior de la pantalla, el borde superior de `.crt` queda en y ≥ 0 y la cabecera no lo tapa.
- [ ] En `#/jugar/gloton` a 1024×768, lo mismo.
- [ ] En el resto de pantallas, `.av-nav` sigue con `position: sticky`.
- [ ] Los criterios "Táctil en horizontal" del SPEC 14 siguen pasando: zonas a los lados del CRT y alto de `.player-stage` ≤ 390 a 844×390.

**Portada**

- [ ] `getComputedStyle(.home-hero).minHeight` es `innerHeight − 60` px en todos los contextos y el CSS usa `100svh`.

**Spec**

- [ ] Este spec contiene la sección "Resultado de la verificación" con capturas de `#/`, `#/jugar/frogger` y `#/jugar/tetris` a 360×740, 390×844 y 844×390.

## Decisiones

- **Sí:** menú lateral hasta 1 180 px en lugar de 840 px. Entre 841 y 1 319 px la cabecera hoy salta de línea (85–90 px de alto) y entre 841 y 918 px además desborda; es un problema de ancho, así que se arregla con un corte de ancho. Decisión del agente (mobile-porter); revisar.
- **Sí:** quitar CRÉDITOS · 03 entre 1 181 y 1 319 px. Es decorativo y lo único que no cabe; en el menú lateral sigue. Decisión del agente (mobile-porter); revisar.
- **Sí:** quitar "Iniciar Sesión" de la cabecera hasta 560 px. Hoy salta a dos líneas, hace la cabecera de 81 px y el enlace ya está en el menú lateral. Decisión del agente (mobile-porter); revisar.
- **No:** reducir la tipografía de la cabecera para que quepa. Cambiaría también el escritorio entre 1 181 y 1 440 px.
- **Sí:** cabecera no fija solo en el player en horizontal táctil. Con 69 px fijos, un CRT de 372 px no cabe en 390 px; achicar el CRT lo dejaría en ~300 px. Decisión del agente (mobile-porter); revisar.
- **No:** restar el alto de la cabecera en el tope del CRT del SPEC 14. Haría el CRT más pequeño en todos los horizontales.
- **Sí:** HUD compacto en vertical táctil hasta 600 px (cuatro datos en una fila y valores a 12 px). El riesgo del SPEC 14 "el HUD empuja `.player-stage`" lo dejaba para un spec aparte; a 360×740 el HUD mide 197 px y la cruceta de FROGGER y SNAKE acaba en y = 816. Decisión del agente (mobile-porter); revisar.
- **Sí:** marco del CRT de 12 px en vertical táctil hasta 600 px. El canvas de FROGGER pasa de 224×210 a 250×234 a 360 px (celdas de 14 a 15,6 px) y de 248×233 a 274×257 a 390 px (de 15,5 a 17,1 px). Decisión del agente (mobile-porter); revisar.
- **No:** dar a `.crt-screen` la proporción de cada motor (640:600 en FROGGER). Daría celdas de 19 px a 390 px, pero a TETRIS (3:4) le haría un CRT de 435 px de alto que empuja sus botones fuera de pantalla, y es un cambio de diseño del player para todos los juegos. Pregunta al usuario: si se quiere, va en su propio spec y solo para motores con proporción ≥ 1.
- **Sí:** aceptar las celdas de 15,6 px de FROGGER a 360 px. La rana se distingue (contorno de 2 px del SPEC 15) y los botones van fuera del CRT; lo confirma la prueba en dispositivo real. Decisión del agente (mobile-porter); revisar.
- **Sí:** en TETRIS hasta 400 px, 8 px entre botones y menos relleno en ROTAR y CAÍDA, sin bajar de 56×56 ni de 10 px de fuente. Es la única forma de que cinco botones quepan en 336 px sin cambiar la disposición del SPEC 14.
- **No:** apilar las dos zonas de TETRIS en dos filas. Rompe la disposición "izquierda a la izquierda, derecha a la derecha" del SPEC 14.
- **Sí:** exentas de los 8 px las dos mitades de `.auth-tabs` (un control segmentado) y los botones de la cruceta (4,2 px en diagonal, fijado en el pulido del SPEC 14 y no se reabre).
- **Sí:** texto mono a 12 px y campos a 16 px solo en táctil. En escritorio no cambia nada y en iOS un campo de menos de 16 px hace zoom al enfocarlo. Decisión del agente (mobile-porter); revisar.
- **Sí:** convertir en clases los cuatro estilos en línea con `fontSize`. Un `@media` no puede con un estilo en línea sin `!important`.
- **No:** ocultar la tira `<kbd>` en táctil (fuera de alcance del SPEC 14). Queda debajo de `.player-stage` y no empuja el CRT fuera de pantalla. Pregunta al usuario: si molesta en el móvil real, va en su propio spec.
- **No:** aviso "GIRA EL DISPOSITIVO" ni pantalla completa (fuera de alcance del SPEC 14). Con este spec el player funciona en las dos orientaciones.
- **Sí:** `100svh` en `.home-hero`. Con la barra del navegador visible, `100vh` es más alto que la pantalla.
- **Sí:** verificar contra `next start` y no contra `next dev`.

## Riesgos

| Riesgo                                                                                  | Mitigación                                                                                             |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Playwright no reproduce la barra del navegador, el zoom al enfocar ni la muesca.        | Prueba en dispositivo real (paso 10).                                                                  |
| `:has()` no existe en navegadores antiguos (Safari 15.3 o anterior).                    | Sin `:has()` la cabecera sigue fija, que es el comportamiento de hoy.                                  |
| Un portátil táctil con ratón no cumple `TOUCH_QUERY` y no recibe los tamaños táctiles.  | Aceptado, como en el SPEC 14: tiene puntero fino.                                                      |
| Entre 841 y 1 180 px de ancho un escritorio ve el menú lateral en lugar de los enlaces. | El menú lateral funciona con ratón y teclado; a 1 440 px no cambia nada.                               |
| Un juego nuevo con más de cinco botones no cabe a 360 px.                               | El criterio de `elementFromPoint` y `scrollWidth` lo detecta; `mobile-porter` audita cada juego nuevo. |
| Un nombre de jugador o una puntuación larga desborda el HUD compacto.                   | `white-space: nowrap` y columnas `auto`; el criterio de `scrollWidth` a 360 px.                        |

## Lo que **no** entra en este spec

- La app instalable: manifest, iconos, `themeColor`, `viewport-fit`, `appleWebApp` y zonas seguras (SPEC 18).
- Proporción de `.crt-screen` por motor.
- Ocultar la tira `<kbd>` en táctil.
- Gestos, vibración, pantalla completa, orientación, interruptor de botones, botones configurables, ratón y gamepad.
- Cambios en los motores, `GameCanvas.tsx`, el registro y `lib/engines/touch.ts`.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la auditoría

Fecha: 2026-10-20. Rama `spec-15-juego-frogger` (working tree con FROGGER), build de producción servido con `next start -p 3005`.
Chromium 155 de Playwright, un contexto nuevo por medida (`hasTouch`, `isMobile`, `deviceScaleFactor` 3; escritorio sin táctil).
La columna App es 390×844 táctil sin `display-mode: standalone`: CDP `Emulation.setEmulatedMedia` con `display-mode` no cambia `matchMedia` en esta versión, así que la app instalada se cubre con la auditoría estática (SPEC 18) y la prueba en dispositivo real.
Los valores "después" salen de inyectar las reglas de este spec en la página con `addInitScript`, sin tocar el código.

Comprobaciones: 1 desborde, 2 objetivos táctiles, 3 texto, 4 zoom al enfocar, 5 cabecera fija, 6 alto de pantalla, 7 zonas seguras, 8 solo con hover, 9 viewport y app, 10 player táctil (SPEC 14), 11 consola, 12 escritorio.

| Ruta                | 360×740     | 390×844     | 844×390          | 768×1024   | 1024×768   | App            | 1440 |
| ------------------- | ----------- | ----------- | ---------------- | ---------- | ---------- | -------------- | ---- |
| `#/`                | ❌ 2, 3, 6  | ❌ 2, 3, 6  | ❌ 1, 2, 3, 6    | ❌ 2, 3, 6 | ❌ 2, 3, 6 | ❌ 2, 3, 6, 9  | ✅   |
| `#/biblioteca`      | ❌ 2, 3, 4  | ❌ 2, 3, 4  | ❌ 1, 2, 3, 4    | ❌ 2, 3, 4 | ❌ 2, 3, 4 | ❌ 2, 3, 4, 9  | ✅   |
| `#/juego/asteroids` | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3       | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9     | ✅   |
| `#/juego/frogger`   | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3       | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9     | ✅   |
| `#/acceso`          | ❌ 2, 3, 4  | ❌ 2, 3, 4  | ❌ 1, 2, 3, 4    | ❌ 2, 3, 4 | ❌ 2, 3, 4 | ❌ 2, 3, 4, 9  | ✅   |
| `#/salon`           | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3       | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9     | ✅   |
| `#/acerca`          | ❌ 2, 3, 4  | ❌ 2, 3, 4  | ❌ 1, 2, 3, 4    | ❌ 2, 3, 4 | ❌ 2, 3, 4 | ❌ 2, 3, 4, 9  | ✅   |
| `#/jugar/asteroids` | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3, 5    | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9     | ✅   |
| `#/jugar/tetris`    | ❌ 2, 3, 10 | ❌ 2, 3, 10 | ❌ 1, 2, 3       | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9, 10 | ✅   |
| `#/jugar/arkanoid`  | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3, 5    | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9     | ✅   |
| `#/jugar/snake`     | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3, 5    | ❌ 2, 3    | ❌ 2, 3    | ❌ 2, 3, 9     | ✅   |
| `#/jugar/frogger`   | ❌ 2, 3, 4  | ❌ 2, 3, 4  | ❌ 1, 2, 3, 4, 5 | ❌ 2, 3, 4 | ❌ 2, 3    | ❌ 2, 3, 4, 9  | ✅   |
| `#/jugar/gloton`    | ❌ 2, 3     | ❌ 2, 3     | ❌ 1, 2, 3, 5    | ❌ 2, 3    | ❌ 2, 3, 5 | ❌ 2, 3, 9     | ✅   |

- La 7 (zonas seguras) pasa hoy porque no hay `viewport-fit=cover`: iOS deja el contenido dentro de la zona segura. Pasa a ser obligatoria con el SPEC 18.
- La 8 pasa en todas: las 14 reglas `:hover` de `globals.css` solo cambian color, borde, sombra o posición.
- La 11 pasa en todas: 0 errores de consola.
- La 12 se midió como "las reglas de este spec no cambian nada a 1 440 px" (misma altura de cabecera, 70 px, y mismo `scrollWidth`, 1 425 px por la barra de scroll, en las 13 rutas, con y sin las reglas); la comparación byte a byte con `main` queda para la verificación.
- El modal FIN DEL JUEGO se midió en `#/jugar/frogger` a 360, 390, 844 y 768 px; es el mismo componente en los cinco juegos.
- Con las reglas de este spec inyectadas, las 78 celdas táctiles (13 rutas × 6 contextos) pasan las comprobaciones 1–6, 10 y 11.
- El último ajuste (ROTAR y CAÍDA a 10 px de fuente y `white-space: nowrap` en el HUD) se midió aparte en los cinco juegos con motor a 360×740 y 390×844: `scrollWidth` 360 y 390, todos los `.touch-btn` ≥ 56×56 y 12 px (360) y 42 px (390) entre → y ROTAR.

Hallazgos:

| #   | Ruta                                                          | Contexto  | Medida                                                                                                                                                                                                                                                                                              | Captura                              |
| --- | ------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 10  | `#/jugar/tetris`                                              | 360×740   | → (`[aria-label="Mover a la derecha"]`) acaba en x = 204 y ROTAR empieza en x = 162: 42 px solapados; `elementFromPoint(183, y)` da "Mover a la derecha"                                                                                                                                            | `jugar-tetris-360x740.png`           |
| 10  | `#/jugar/tetris`                                              | 390×844   | → acaba en x = 204 y ROTAR empieza en x = 192: 12 px solapados; `elementFromPoint(198, y)` da "Rotar"                                                                                                                                                                                               | —                                    |
| 1   | todas                                                         | 844×390   | `a.btn.auth-btn` llega a x = 919; `scrollWidth` 919, `innerWidth` 919 e `innerHeight` 425 (la página se aleja); igual de 841 a 918 px                                                                                                                                                               | `home-844x390.png`                   |
| 5   | `#/jugar/frogger`, `asteroids`, `arkanoid`, `snake`, `gloton` | 844×390   | `.av-nav` de 90 px (enlaces en dos líneas); con `.player-stage` (372 px) al final de la pantalla, la cabecera tapa 37 px del CRT                                                                                                                                                                    | `jugar-frogger-scrolled-844x390.png` |
| 5   | `#/jugar/gloton`                                              | 1024×768  | `.player-stage` de 738 px y `.av-nav` de 90 px: la cabecera tapa 60 px del CRT                                                                                                                                                                                                                      | —                                    |
| 2   | todas                                                         | táctil    | `.btn` 41 px de alto (PAUSA, FIN, SALIR, JUGAR, GUARDAR PUNTUACIÓN), `.hamburger` 57×41, `a.logo` 36, `.chip` 40, `.skin-btn` 33, `a.lb-link` 41 (28 a 844 px), `.auth-tabs button` 38 a 768 px o más, buscador de 22 px de alto; `.skin-btn` y `.hall-tabs` a 6 px y enlaces de la cabecera a 4 px | `jugar-frogger-360x740.png`          |
| 3   | todas                                                         | táctil    | `JetBrains Mono` de 10 px (`.hud-stat .l`, `.mini-cat`, `.stat-strip .l`, `.field label`, `.score-badge`, fecha de `.lb-row`) y 11 px (`.player-controls`, `kbd`, `.skin-btn`, `.stat-s`, `.tk-t`, `.pc-foot`, `.podium-slot .date`, pie, textos de `#/acceso`)                                     | —                                    |
| 4   | `#/biblioteca`, `#/acceso`, `#/acerca`, modal                 | táctil    | buscador 13 px, `.field input` 14 px, `textarea` 13,33 px, iniciales del modal 14 px                                                                                                                                                                                                                | `jugar-frogger-modal-390x844.png`    |
| 6   | `#/`                                                          | todos     | `.home-hero { min-height: calc(100vh - 60px) }` (línea 2305); la cabecera móvil mide 81 px, no 60                                                                                                                                                                                                   | —                                    |
| —   | `#/jugar/frogger`                                             | 360×740   | canvas 224×210 (celdas de 14 px), HUD de 197 px (113–310), cruceta de 642 a 816 con la pantalla en 740                                                                                                                                                                                              | `jugar-frogger-360x740.png`          |
| —   | cabecera                                                      | 360 y 390 | "Iniciar Sesión" en dos líneas (123×56 y 142×56) y cabecera de 81 px                                                                                                                                                                                                                                | `menu-390x844.png`                   |

Capturas en `.playwright-mcp/mobile-porter/2026-10-20/` (no se versionan): antes (`jugar-frogger-{360x740,390x844,844x390,768x1024}.png`, `jugar-frogger-scrolled-844x390.png`, `jugar-frogger-modal-*.png`, `menu-*.png`, `home-844x390.png`, `jugar-tetris-360x740.png`) y con las reglas inyectadas (`after-jugar-frogger-*.png`, `after-jugar-tetris-360x740.png`, `final-jugar-frogger-360x740.png`).
