# SPEC 03 — Página Acerca de (About)

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-09-30
> **Objetivo:** Añadir a la SPA la pantalla "Acerca de" de `references/templates/home-about/` en `#/acerca`, con su formulario de contacto simulado y su enlace en el Nav.

## Por qué existe este spec

El SPEC 02 portó el Home de `references/templates/home-about/` y dejó fuera la pantalla "Acerca de".
Este spec cubre solo esa pantalla: el bloque de misión, los tres highlights, el divisor de píxeles y el formulario de contacto.
El formulario es un mock, igual que en el template: no envía nada.
El último paso es comparar con Playwright el About implementado contra el template original.

## Alcance

**Dentro:**

- Portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1146).
- Pilas de fuentes del template dentro de `.about`, igual que la corrección de `.home` del SPEC 02.
- Regla `prefers-reduced-motion: reduce` para los elementos animados del About.
- Nueva ruta `{ name: "about" }` en `#/acerca`.
- Nav: enlace "Acerca de" como último enlace de escritorio y en el panel móvil antes de "Iniciar Sesión", con estado activo.
- Pantalla About: hero con kicker, título, misión y tres highlights; divisor de píxeles; sección de contacto con intro, tips y formulario.
- Formulario simulado: validación de campos vacíos con shake, mensaje `aria-live`, terminal de éxito y botón "ENVIAR OTRO MENSAJE".
- Animación de aparición al hacer scroll (`.reveal` → `.reveal.in`) reutilizando `lib/useReveal.ts`.
- Pulido de accesibilidad y responsive con `/frontend-design`.
- Comparación visual con Playwright contra el template a 1440 px y 375 px, página completa con el formulario vacío.

**Fuera de alcance (para specs futuros):**

- Envío real del mensaje (route handler, servicio externo o `mailto:`).
- Persistencia del mensaje o del estado de éxito entre recargas.
- Validación por campo con mensajes bajo cada input.
- Enlace a "Acerca de" en el Footer.
- CSS de `GAMEPAD`, `Theme variants`, `tweaks` y `spinner` del nuevo `styles.css`.
- Comparación con Playwright de la terminal de éxito, del estado de error y del foco de los campos.
- Diff de píxeles automatizado y tests automatizados.

## Modelo de datos

### Rutas (`lib/router.ts`)

```ts
export type Route =
  | { name: "home" }
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" }
  | { name: "about" };                     // nuevo
```

| Hash        | Ruta                 | Cambio respecto al SPEC 02 |
| ----------- | -------------------- | -------------------------- |
| `#/acerca`  | `{ name: "about" }`  | Nuevo.                     |

El resto del mapa no cambia. Un hash desconocido sigue resolviendo a `{ name: "home" }`.

### Estado del formulario (`components/screens/About.tsx`)

```ts
interface ContactForm {
  name: string;
  email: string;
  msg: string;
}

const [form, setForm] = useState<ContactForm>({ name: "", email: "", msg: "" });
const [sent, setSent] = useState<string | null>(null); // nombre recortado del remitente; null = formulario visible
const [shake, setShake] = useState(false);             // true durante 400 ms tras un envío inválido
const [status, setStatus] = useState("");              // texto de la región aria-live
```

Reglas:

- Un envío es inválido si `name`, `email` o `msg` quedan vacíos tras `trim()`, igual que en el template.
- El correo usa `type="email"` sin `noValidate`: un correo no vacío con formato inválido lo bloquea la validación nativa del navegador, igual que en el template.
- Envío inválido: `shake = true` durante 400 ms y `status = "Completa nombre, correo y mensaje."`.
- Envío válido: `sent = form.name.trim()` y `status = "Mensaje recibido. Te responderemos pronto."`.
- La terminal muestra `sent.toUpperCase()` en "GRACIAS, …".
- "ENVIAR OTRO MENSAJE" pone `sent = null`, vacía `form` y `status`, y lleva el foco al campo NOMBRE.
- Los `id` de los campos son `contact-name`, `contact-email` y `contact-msg`, unidos a sus `<label htmlFor>`.
- La región `aria-live="polite"` está siempre montada, fuera del `{!sent ? … : …}`, con la clase `sr-only` de Tailwind.

### Textos

Los textos de los 3 highlights y los 3 tips van inline en `About.tsx`, igual que en el template.
Todos los textos se copian literal de `references/templates/home-about/about.jsx`.

## Plan de implementación

1. **Estilos.** Añadir al final de `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` (líneas 1071–1146, sin la regla `.divider` de `/* misc */`, que ya existe), sin cambios. Añadir `.about { --pixel: "Press Start 2P", system-ui, monospace; --mono: "JetBrains Mono", "Courier Prime", "Courier New", monospace; }` junto a la regla equivalente de `.home`. Añadir un bloque `@media (prefers-reduced-motion: reduce)` que quite la animación a `.div-pixels span` y `.term-body .caret`, y que cambie `.contact-form.shake` a `animation: none; border-color: var(--magenta);`. Verificación: `npm run lint` pasa y el Home y las pantallas del SPEC 01 se ven igual.
2. **Ruta y Nav.** En `lib/router.ts` añadir `{ name: "about" }` con `#/acerca` en `parseHash`, `toHash` y el comentario del mapa. En `components/App.tsx` añadir el `case "about"` con un placeholder. En `components/Nav.tsx` añadir `"about"` a `NavTarget` y el enlace "Acerca de" → `#/acerca` como último enlace de `.links` y en el panel móvil entre "Salón de la Fama" e "Iniciar Sesión", con `linkProps("about")`. Verificación: `/#/acerca` muestra el placeholder y "Acerca de" queda activo.
3. **Iconos.** Crear `components/about/HighlightIcon.tsx` con los 3 iconos SVG del template (`HEART`, `BROWSER`, `PLANT`), `aria-hidden="true"` y tipo `HighlightIconKind = "HEART" | "BROWSER" | "PLANT"`.
4. **About, parte estática.** Crear `components/screens/About.tsx` con `.about.fade-in` y `useReveal(rootRef)`: hero (kicker "▸ ACERCA DE", `h1` "ACERCA DE ARCADE VAULT", misión, 3 highlights con `transitionDelay` de 80 ms por índice como el template), divisor `.about-divider.reveal` con 24 píxeles (`animationDelay` de 80 ms por índice, `aria-hidden`) y sección `.about-contact.reveal` con intro (kicker "▸ CONTACTO", `h2` "CONTÁCTANOS", subtítulo y 3 tips con LEDs `aria-hidden`) y el formulario con sus tres campos y el botón "▶  ENVIAR MENSAJE". Sustituir el placeholder de `App.tsx` por `<About />`. Verificación: la pantalla se ve completa con el formulario vacío.
5. **About, formulario.** Añadir a `About.tsx` el estado del modelo de datos, el `onSubmit` con la validación, el shake de 400 ms, la región `aria-live`, la terminal de éxito (`.terminal-success` con barra, 4 líneas y caret) y "ENVIAR OTRO MENSAJE" con la vuelta del foco a NOMBRE. Verificación: enviar vacío hace shake; enviar completo muestra la terminal; "ENVIAR OTRO MENSAJE" vuelve al formulario vacío.
6. **Pulido con `/frontend-design`.** Revisar el About a 1440 px y 375 px sin cambiar la estética: foco visible en inputs, textarea y botones, iconos, LEDs y divisor con `aria-hidden`, jerarquía de encabezados (`h1` en el hero, `h2` en contacto) y sin scroll horizontal.
7. **Comparación con Playwright.** Servir el template con `python3 -m http.server 5500 --directory references/templates/home-about` y abrir `http://localhost:5500/arcade-vault-standalone.html`, navegando al About con el enlace "Acerca de" del Nav (del panel ☰ a 375 px). Servir la app con `npm run build` + `next start -p 3001` y abrir `http://localhost:3001/#/acerca`; el `next dev` puede servir un `globals.css` antiguo. En ambos, a 1440 px y a 375 px, con el formulario vacío: hacer scroll hasta el final para disparar los `.reveal`, esperar a que terminen las transiciones y sacar una captura de página completa. Comparar sección por sección (textos, colores, disposición, espaciados, animaciones), corregir las diferencias no aceptadas y repetir. Al terminar, añadir a este spec una sección "Resultado de la comparación" con las diferencias corregidas, las que quedan y su motivo. Las capturas no se versionan.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] La consola del navegador no muestra errores al abrir `/#/acerca`.
- [ ] Abrir `/#/acerca` muestra el About con el título "ACERCA DE ARCADE VAULT".
- [ ] El Nav de escritorio muestra "Acerca de" como último enlace, tras "Salón de la Fama".
- [ ] El panel móvil muestra "Acerca de" entre "Salón de la Fama" e "Iniciar Sesión".
- [ ] "Acerca de" queda marcado activo (`aria-current="page"`) solo en el About.
- [ ] Clic en "Acerca de" lleva a `#/acerca`; el botón atrás vuelve a la pantalla anterior.
- [ ] Hay 3 highlights con los textos del template; sus iconos tienen `aria-hidden`.
- [ ] El divisor tiene 24 píxeles y no es anunciado por lectores de pantalla.
- [ ] El divisor y la sección de contacto reciben `.in` al entrar en pantalla al hacer scroll.
- [ ] Clic en cada `<label>` del formulario enfoca su campo.
- [ ] Enviar con algún campo vacío o solo con espacios hace shake y no muestra la terminal.
- [ ] Tras un envío inválido, la región `aria-live` contiene "Completa nombre, correo y mensaje." y no es visible en pantalla.
- [ ] Enviar con un correo con formato inválido lo bloquea la validación nativa del navegador.
- [ ] Enviar el formulario completo muestra la terminal con "GRACIAS, <NOMBRE EN MAYÚSCULAS>." y la región `aria-live` contiene "Mensaje recibido. Te responderemos pronto.".
- [ ] El envío no genera ninguna petición de red.
- [ ] "ENVIAR OTRO MENSAJE" muestra el formulario vacío con el foco en NOMBRE.
- [ ] Inputs, textarea y botones son alcanzables con Tab y tienen foco visible.
- [ ] Con `prefers-reduced-motion: reduce` emulado: los píxeles del divisor y el caret no parpadean, y un envío inválido pone el borde del formulario en magenta sin moverlo.
- [ ] A 375 px no hay scroll horizontal; los highlights van en 1 columna y el contacto en 1 columna.
- [ ] Existen capturas de página completa del template y de la app a 1440 px y 375 px, comparadas con Playwright.
- [ ] Este spec contiene la sección "Resultado de la comparación" y toda diferencia listada ahí tiene un motivo.

## Decisiones

- **Sí:** ruta `#/acerca`. Decisión del usuario; corta y en español como `#/salon` y `#/acceso`.
- **No:** `#/acerca-de` ni `#/about`. Más largo el primero, rompe el patrón en español el segundo.
- **Sí:** formulario simulado en cliente, como el template. Decisión del usuario; el envío real abre persistencia, spam y secretos.
- **No:** `mailto:` ni envío real. Van en su propio spec si llegan.
- **Sí:** validación del template más accesibilidad: shake, región `aria-live` y labels unidos con `htmlFor`/`id`. Decisión del usuario.
- **No:** mensajes de error por campo. Se alejan visualmente del template.
- **Sí:** región `aria-live` con `sr-only`. La pantalla se ve idéntica al template y el lector de pantalla anuncia el resultado.
- **Sí:** con reduced motion, borde magenta en lugar de shake. Decisión del usuario; sin él, un usuario vidente con reduced motion no vería señal de error.
- **Sí:** devolver el foco a NOMBRE tras "ENVIAR OTRO MENSAJE". El botón desaparece al pulsarlo y el foco se perdería.
- **Sí:** enlace "Acerca de" en el Nav como el template. Decisión del usuario.
- **No:** enlace en el Footer. El template no lo tiene.
- **Sí:** respetar `prefers-reduced-motion`. Decisión del usuario; sigue al SPEC 02.
- **Sí:** pilas de fuentes del template dentro de `.about`. Decisión del usuario; mismo fallo de glifos (▸, ▶, ❤️) que se corrigió en `.home`.
- **Sí:** textos de highlights y tips inline en `About.tsx`. Decisión del usuario; son 6 textos fijos sin lógica, igual que en el template.
- **No:** `lib/about.ts`. Ceremonia para 6 textos.
- **Sí:** `components/about/HighlightIcon.tsx`, en paralelo a `components/home/PixelArt.tsx`. Separa el SVG del marcado de la pantalla.
- **Sí:** reutilizar `lib/useReveal.ts` con un `ref` al contenedor. El template consulta `.reveal` en todo el `document`.
- **Sí:** mantener el `transitionDelay` de los highlights del template, aunque solo afecta al hover. Fidelidad con el template.
- **Sí:** comparar solo páginas completas a 1440 px y 375 px con el formulario vacío. Decisión del usuario.
- **No:** comparar terminal de éxito, estado de error y foco. Se verifican con los criterios de aceptación, no con capturas.
- **Sí:** comparar contra `next start` y no contra `next dev`. En el SPEC 02 el `next dev` servía un `globals.css` antiguo.
- **Sí:** no versionar las capturas. El resultado queda por escrito en este spec.

## Riesgos

| Riesgo | Mitigación |
| ------ | ---------- |
| Tailwind v4 trae keyframes propios que pisan los del template (pasó con `pulse` en el SPEC 02). | Verificar en el CSS servido que `shake` y `pxblink` son los del template; si chocan, renombrarlos como `btn-pulse`. |
| Los `.reveal` empiezan con `opacity: 0`; si el hook falla, el formulario queda invisible. | `useReveal` ya tiene fallback sin `IntersectionObserver` y la regla de reduced-motion del SPEC 02 los hace visibles. |
| El hero no es `.reveal` pero los highlights llevan `transitionDelay`; el hover de los highlights 2 y 3 tarda 80 y 160 ms en empezar. | Aceptado por fidelidad al template. |
| `.contact-form input` hereda de `.field input` (SPEC 01); un cambio en Acceso cambia el About. | Aceptado; es el mismo estilo en el template. |
| En el template el About puede no tener hash propio y solo abrirse desde el Nav. | Navegar al About con clic en "Acerca de" (panel ☰ a 375 px). |
| El template standalone carga Google Fonts desde internet; sin red las fuentes no coinciden. | Hacer la comparación con conexión; si falla, anotarlo en "Resultado de la comparación". |
| El título y los highlights en pixel font pueden desbordar a 375 px. | Verificar sin scroll horizontal en el paso 6; `clamp()` del título ya viene del template. |

## Resultado de la comparación

Comparación con Playwright del template (`python3 -m http.server 5500`) contra la app (`npm run build` + `next start -p 3001`), a 1440 px y 375 px, página completa con el formulario vacío, tras hacer scroll hasta el final (los dos `.reveal` con `.in`) y esperar a las fuentes.
Además de las capturas se midieron posición, tamaño, tamaño de fuente, interletrado, color e interlineado de hero, título, misión, highlights, divisor, contacto, formulario, labels, inputs, textarea, botón y footer.

### Diferencias corregidas

| Diferencia | Causa | Corrección |
| ---------- | ----- | ---------- |
| El textarea medía 131 px de alto con fuente de 14 px e interlineado de 21 px; en el template, 116 px con 13,33 px e interlineado `normal`. El formulario quedaba 15 px más alto. | El preflight de Tailwind v4 hace que los controles de formulario hereden fuente, interlineado e interletrado; el template no tiene preflight y usa los valores del navegador. | `.contact-form textarea { font-size: revert; line-height: revert; letter-spacing: revert; }` en `app/globals.css`. |
| Los inputs tenían interletrado de 0,14 px; en el template, `normal`. | El mismo preflight. | `.contact-form input { letter-spacing: revert; }`, limitado al formulario de contacto para no cambiar Acceso. |

Tras la corrección, las mediciones del template y de la app coinciden en todos los elementos a 1440 px y 375 px.

### Diferencias que quedan

| Diferencia | Motivo |
| ---------- | ------ |
| A 375 px el template tiene scroll horizontal (`scrollWidth` 396 px en un viewport de 360 px) y la app no. | Lo provoca el panel móvil cerrado del template, que sobresale por la derecha; no es parte del About. Este spec exige que no haya scroll horizontal a 375 px. |
| El texto que hereda la fuente del `body` usa la pila de `next/font` (`"JetBrains Mono", "JetBrains Mono Fallback"`) en lugar de la del template (`"JetBrains Mono", "Courier Prime", …`). | Solo afecta a glifos que JetBrains Mono no tiene; el About no usa ninguno en ese texto y las medidas son idénticas. La corrección de `.about` cubre lo que usa `var(--pixel)` y `var(--mono)`, igual que en el Home. |
| En las capturas de página completa el Nav aparece a media página. | Es el Nav fijo en una captura de página completa; pasa igual en el template y en la app. |

No es una diferencia: el `▸` de los kickers se ve como un punto pequeño en los dos.

## Lo que **no** entra en este spec

- Envío real del mensaje, `mailto:` y persistencia.
- Validación por campo.
- Enlace a "Acerca de" en el Footer.
- CSS de Gamepad, variantes de tema, tweaks y spinner.
- Comparación con capturas de la terminal de éxito, del error y del foco.
- Diff de píxeles y tests automatizados.

Cada uno, si llega, va en su propio spec.
