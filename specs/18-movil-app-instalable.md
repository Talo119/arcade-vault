# SPEC 18 — App instalable en móvil

> **Estado:** Draft
> **Depende de:** SPEC 01, SPEC 14, SPEC 17
> **Fecha:** 2026-10-20
> **Objetivo:** Que Arcade Vault se pueda añadir a la pantalla de inicio con su nombre, su icono y su color, y que abierta así (sin barra del navegador) respete la muesca y las zonas seguras.

## Por qué existe este spec

La auditoría de `mobile-porter` del 2026-10-20 (SPEC 17, "Resultado de la auditoría", comprobación 9) encontró que la app no es instalable.
`GET /manifest.webmanifest` y `GET /apple-icon.png` devuelven 404, y `app/` solo tiene `favicon.ico` (16 y 32 px).
El `<head>` servido solo lleva `<meta name="viewport" content="width=device-width, initial-scale=1">`: sin `theme-color`, sin `viewport-fit` y sin metadatos de Apple.
Añadida hoy a la pantalla de inicio, Android usaría una captura como icono y abriría la web en una pestaña normal, e iOS la abriría con su barra de estado blanca.
Este spec va aparte del SPEC 17 porque trae iconos nuevos y su verificación necesita un dispositivo real.

## Alcance

**Dentro:**

- `app/manifest.ts` con nombre, colores, `display: "standalone"` e iconos.
- Iconos PNG de 192, 512 y 512 `maskable` en `public/icons/`, y `app/apple-icon.png` de 180×180, con el `.logo-mark` de la cabecera.
- Export `viewport` en `app/layout.tsx` con `themeColor`, `colorScheme` y `viewportFit: "cover"`.
- `metadata.appleWebApp` en `app/layout.tsx` con título y barra de estado `black-translucent`.
- Zonas seguras (`env(safe-area-inset-*)`) en la cabecera, el menú lateral, el contenido y el pie.
- Verificación con Playwright y prueba en dispositivo real (Android y iOS).

**Fuera de alcance (para specs futuros):**

- Service worker, modo sin conexión y caché de recursos.
- Notificaciones push.
- Pantallas de arranque de iOS (`startupImage`).
- Bloqueo de orientación en el manifest (`orientation`) y pantalla completa: fuera de alcance del SPEC 14.
- Botón o aviso propio de "INSTALAR" (`beforeinstallprompt`).
- Cambiar `app/favicon.ico`.
- Todo lo del SPEC 17 (cabecera, objetivos táctiles, texto, player).

## Modelo de datos

Docs de Next.js 16 leídos para este spec:

- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md` (`app/manifest.ts`, `MetadataRoute.Manifest`).
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-viewport.md` (export `viewport`, solo en Server Components; `themeColor` y `colorScheme` van aquí y no en `metadata`).
- `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/app-icons.md` (`app/apple-icon.png` genera su `<link rel="apple-touch-icon">`).
- `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md` (`appleWebApp`).
- `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` (iconos 192 y 512 en `public/`).
- `viewportFit` no sale en el doc, pero está en el tipo `Viewport` (`node_modules/next/dist/lib/metadata/types/extra-types.d.ts:52`: `'auto' | 'cover' | 'contain'`).

### `app/manifest.ts`

```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arcade Vault · Portal Retro",
    short_name: "Arcade Vault",
    description: "Juega en línea y compite por el puntaje más alto.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0f", // --bg
    theme_color: "#0a0a0f", // --bg
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

- `name` y `description` son los de `metadata` en `app/layout.tsx`.
- `short_name` tiene 12 caracteres: cabe bajo el icono en Android e iOS.
- `start_url` es `/`: el router por hash abre la Home.

### Iconos

| Fichero                              | Medida  | Contenido                                                                                       |
| ------------------------------------ | ------- | ----------------------------------------------------------------------------------------------- |
| `public/icons/icon-192.png`          | 192×192 | `.logo-mark` (triángulos `--magenta` y `--cyan`, borde y glow) centrado sobre `#0a0a0f`, dentro del 80 % central |
| `public/icons/icon-512.png`          | 512×512 | igual que el de 192                                                                             |
| `public/icons/icon-maskable-512.png` | 512×512 | igual que el de 512; el 80 % central es la zona segura del recorte `maskable`                  |
| `app/apple-icon.png`                 | 180×180 | igual que el de 192, sin transparencia                                                          |

- Se dibujan una vez con el CSS de `.av-nav .logo-mark` (`app/globals.css:253`) en una página temporal y se capturan con Playwright a cada medida; la página y el script no se versionan.
- Son PNG opacos: iOS rellena de negro la transparencia.

### `app/layout.tsx`

```ts
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description: "Juega en línea y compite por el puntaje más alto.",
  appleWebApp: { title: "Arcade Vault", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  colorScheme: "dark",
  viewportFit: "cover",
};
```

- Con `viewportFit: "cover"` y `black-translucent`, la página llega hasta los bordes y bajo la barra de estado: las zonas seguras pasan a ser responsabilidad del CSS.

### Zonas seguras (`app/globals.css`)

```css
.av-nav {
  padding: calc(14px + env(safe-area-inset-top))
    max(32px, env(safe-area-inset-right)) 14px
    max(32px, env(safe-area-inset-left));
}
@media (max-width: 1180px) {
  /* la regla del menú lateral del SPEC 17 */
  .av-nav {
    padding: calc(12px + env(safe-area-inset-top))
      max(16px, env(safe-area-inset-right)) 12px
      max(16px, env(safe-area-inset-left));
  }
}
.av-mobile-panel {
  padding: calc(24px + env(safe-area-inset-top))
    max(20px, env(safe-area-inset-right))
    calc(24px + env(safe-area-inset-bottom)) 20px;
}
.av-main {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
.av-footer {
  /* clase del SPEC 17 */
  padding: 20px max(32px, env(safe-area-inset-right))
    calc(20px + env(safe-area-inset-bottom))
    max(32px, env(safe-area-inset-left));
}
```

- Sin muesca (escritorio, Android sin recorte) `env()` vale 0 y los valores calculados son los de hoy: 14px 32px en la cabecera, 12px 16px en el menú lateral, 24px 20px en el panel y 20px 32px en el pie.
- `.player-stage` y sus `.touch-zone` quedan dentro de `.av-main`, así que en horizontal no caen bajo la muesca.

## Plan de implementación

1. **Iconos.** Crear los cuatro PNG de la tabla. Verificación: `file public/icons/*.png app/apple-icon.png` da 192×192, 512×512, 512×512 y 180×180, todos sin canal alfa.
2. **Manifest.** `app/manifest.ts`. Verificación: `curl -s localhost:3005/manifest.webmanifest` devuelve el JSON de "Modelo de datos" y el `<head>` tiene `<link rel="manifest" href="/manifest.webmanifest">`; los tres `src` responden 200 con `image/png`.
3. **Viewport y Apple.** `viewport` y `appleWebApp` en `app/layout.tsx`. Verificación: el `<head>` servido tiene `theme-color` `#0a0a0f`, `color-scheme` `dark`, `viewport-fit=cover`, `apple-mobile-web-app-title` "Arcade Vault", `apple-mobile-web-app-status-bar-style` `black-translucent` y `<link rel="apple-touch-icon">` de 180×180.
4. **Zonas seguras.** Reglas de "Zonas seguras". Verificación: sin táctil a 1 440 px, `getComputedStyle` de `.av-nav`, `.av-main` y `.av-footer` da los mismos `padding` que antes del cambio.
5. **Pulido con `/frontend-design`.** Revisar los iconos a 48, 96 y 192 px sobre fondo claro y oscuro, y el `maskable` recortado en círculo. Verificación: capturas de los tres iconos.
6. **Verificación con Playwright.** `npm run build` + `next start -p 3005` (o el siguiente puerto libre). Comprobar `<head>`, manifest e iconos, y repetir la regresión del SPEC 17 a 390×844 y 1 440×900. Inyectar `env()` no es posible: simular la muesca con una regla temporal que sustituya `env(safe-area-inset-top)` por 47px y `env(safe-area-inset-left)` por 47px (los insets de un iPhone 14 en vertical y en horizontal), medir y quitarla. Añadir "Resultado de la verificación".
7. **Prueba en dispositivo real (la hace el usuario).** `npm run build` + `next start -H 0.0.0.0` y abrir la IP del ordenador desde un móvil de la misma red. En Android (Chrome): "Instalar aplicación" o "Añadir a pantalla de inicio". En iOS (Safari): Compartir → "Añadir a pantalla de inicio". Abrirla desde el icono en vertical y en horizontal, recorrer las rutas y jugar FROGGER. Anotar modelo, sistema, navegador y lo que falle. Nota: Chrome solo ofrece instalar en `localhost` o HTTPS; desde la IP de la red puede quedarse en "Añadir a pantalla de inicio" (acceso directo), que no abre en `standalone`. Si pasa, probar con un túnel HTTPS o un despliegue de prueba.

## Criterios de aceptación

**Manifest e iconos**

- [ ] `GET /manifest.webmanifest` responde 200 con `name` "Arcade Vault · Portal Retro", `short_name` "Arcade Vault", `start_url` "/", `display` "standalone", `background_color` y `theme_color` "#0a0a0f", y tres iconos (192, 512 y 512 `maskable`).
- [ ] Los tres iconos del manifest y `/apple-icon.png` responden 200 con `image/png` y miden 192×192, 512×512, 512×512 y 180×180.
- [ ] La pestaña "Application → Manifest" de Chromium no muestra errores ni avisos de instalabilidad.

**`<head>`**

- [ ] `<meta name="theme-color" content="#0a0a0f">`.
- [ ] `<meta name="color-scheme" content="dark">`.
- [ ] `<meta name="viewport">` contiene `width=device-width`, `initial-scale=1` y `viewport-fit=cover`, y no contiene `user-scalable=no` ni `maximum-scale`.
- [ ] `<meta name="apple-mobile-web-app-title" content="Arcade Vault">` y `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`.
- [ ] `<link rel="apple-touch-icon">` con `sizes="180x180"`.

**Zonas seguras**

- [ ] Con la muesca simulada (47 px arriba y a la izquierda), a 390×844 el contenido de `.av-nav` empieza en y ≥ 47 y a 844×390 el `.logo` empieza en x ≥ 47, `.touch-zone-left` en x ≥ 47 y `scrollWidth` ≤ 844.
- [ ] Sin muesca, a 390×844 y a 1 440×900, `padding` de `.av-nav`, `.av-mobile-panel` y `.av-footer` iguales a los del SPEC 17 sin este spec.

**Regresión**

- [ ] Los criterios del SPEC 17 y del SPEC 14 siguen pasando.
- [ ] La captura de escritorio a 1 440 px de `#/` y `#/jugar/asteroids` es igual a la de `main`.
- [ ] `npm run lint` y `npm run build` pasan.
- [ ] La consola no muestra errores en ninguna ruta.

**Dispositivo real**

- [ ] Este spec anota en "Resultado de la verificación" al menos un Android y un iOS, instalados desde la pantalla de inicio: icono, nombre, color de la barra, contenido fuera de la muesca y de la barra de inicio, y FROGGER jugable con la cruceta.

## Decisiones

- **Sí:** `app/manifest.ts` y no `public/manifest.json`. Next lo sirve y enlaza solo, y queda tipado con `MetadataRoute.Manifest`.
- **Sí:** iconos PNG estáticos en `public/icons/` y `app/apple-icon.png`, dibujados con el `.logo-mark` de la cabecera. Es la marca que ya existe y no añade dependencias. Decisión del agente (mobile-porter); revisar.
- **No:** iconos generados con `ImageResponse` (`app/icon.tsx`). Añade una ruta por icono y el manifest necesitaría las URL generadas.
- **Sí:** `theme_color` y `background_color` `#0a0a0f` (`--bg`). La barra del sistema y la pantalla de arranque se funden con el fondo de la app. Decisión del agente (mobile-porter); revisar.
- **Sí:** `viewportFit: "cover"` con `black-translucent`. La cabecera oscura llega hasta arriba, bajo la hora y la batería, como una app; a cambio, el CSS tiene que respetar las zonas seguras. Decisión del agente (mobile-porter); revisar.
- **No:** barra de estado `black` sin `cover`. Más simple y sin zonas seguras, pero deja una franja negra encima de la cabecera y, en horizontal, dos bandas a los lados.
- **No:** `maximumScale` ni `userScalable: false`. Impedir el zoom rompe la accesibilidad; los campos a 16 px del SPEC 17 ya evitan el zoom al enfocar.
- **No:** `orientation` en el manifest. Bloquear la orientación está fuera de alcance del SPEC 14 y el player funciona en las dos.
- **No:** service worker. No hace falta para instalar en Android ni en iOS, y la app depende de Supabase en línea.
- **Sí:** `display: "standalone"` y no `fullscreen`. Mantiene la barra de estado; la pantalla completa está fuera de alcance del SPEC 14.

## Riesgos

| Riesgo                                                                                                                       | Mitigación                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Playwright no emula `display-mode: standalone` (CDP `Emulation.setEmulatedMedia` no lo cambia en Chromium 155) ni la muesca. | Muesca simulada con valores fijos en el paso 6; prueba en dispositivo real (paso 7).                                      |
| Chrome no ofrece instalar desde `http://` con una IP de la red.                                                              | Túnel HTTPS o despliegue de prueba; anotarlo en el resultado.                                                             |
| En la app instalada no hay botón atrás del navegador.                                                                        | Todas las pantallas tienen navegación propia (cabecera, menú lateral, SALIR, VOLVER AL VAULT); se comprueba en el paso 7. |
| `black-translucent` deja el texto de la hora sobre la cabecera.                                                              | La cabecera es oscura y tiene `padding-top` con `env(safe-area-inset-top)`.                                               |
| iOS cachea el icono y el nombre al añadir la app.                                                                            | Borrar el acceso y volver a añadirlo en cada prueba.                                                                      |

## Lo que **no** entra en este spec

- Service worker y modo sin conexión.
- Notificaciones push.
- Pantallas de arranque de iOS.
- Orientación bloqueada, pantalla completa y botón propio de instalar.
- Cambiar `favicon.ico`.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.

## Resultado de la auditoría

Fecha: 2026-10-20. Build de producción de `spec-15-juego-frogger` servido con `next start -p 3005`.

| Elemento                         | Hoy                                                       | Falta                                   |
| -------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| `app/manifest.*`                 | no existe; `GET /manifest.webmanifest` → 404              | manifest completo                       |
| Iconos 192 y 512                 | no existen                                                | tres PNG                                |
| `app/apple-icon.*`               | no existe; `GET /apple-icon.png` → 404                    | PNG de 180×180                          |
| `app/icon.*`                     | no existe; solo `app/favicon.ico` (16 y 32 px)            | — (fuera de alcance)                    |
| `themeColor`                     | no hay `<meta name="theme-color">`                        | `#0a0a0f`                               |
| `viewport`                       | `width=device-width, initial-scale=1`, sin `viewport-fit` | `viewport-fit=cover`                    |
| `appleWebApp`                    | no hay metadatos de Apple                                 | título y barra `black-translucent`      |
| `env(safe-area-inset-*)`         | `grep -n "safe-area-inset" app/globals.css` vacío         | cabecera, menú lateral, contenido y pie |
| `display-mode: standalone` (CSS) | ninguna regla                                             | — (no hace falta)                       |

- La columna App de la auditoría del SPEC 17 (390×844 táctil) da lo mismo que el navegador porque el modo `standalone` no se pudo emular.
