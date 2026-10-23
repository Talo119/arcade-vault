# SPEC 19 — Autenticación con correo, Google y GitHub

> **Estado:** Implemented
> **Depende de:** SPEC 01, SPEC 04, SPEC 06
> **Fecha:** 2026-10-22
> **Objetivo:** Que un jugador pueda crear una cuenta con correo y contraseña (confirmada desde su correo) o entrar con Google o GitHub, iniciar y cerrar sesión en `#/acceso`, y ver su nombre de usuario en la cabecera mientras la sesión siga abierta.

## Por qué existe este spec

El SPEC 01 dejó `#/acceso` como pantalla solo visual: enviar el formulario navega a la Biblioteca sin crear sesión, el Nav siempre muestra "Iniciar Sesión" y los botones GOOGLE y GITHUB no hacen nada.
El SPEC 06 dejó fuera la autenticación y las puntuaciones ligadas a `auth.uid()`.
Este spec conecta la pantalla con Supabase Auth (correo y contraseña con confirmación por correo, Google y GitHub) y da a la app un estado de sesión.
Los tres métodos van juntos porque comparten la pantalla, el estado de sesión y el nombre de usuario; Google y GitHub solo añaden una ruta de callback y su configuración en el panel.
Ligar el ranking a la cuenta va en otro spec: aquí `scores` y `submit_score` no cambian.

## Alcance

**Dentro:**

- Crear cuenta con usuario, correo y contraseña (`supabase.auth.signUp`), con el usuario guardado en `user_metadata.username`.
- Confirmación obligatoria del correo: tras crear cuenta, panel "REVISA TU CORREO"; el enlace del correo pasa por `app/auth/confirm/route.ts` y vuelve a `#/acceso` con la sesión abierta.
- Iniciar sesión con correo y contraseña (`signInWithPassword`) y cerrar sesión (`signOut`).
- Entrar con Google y con GitHub (`signInWithOAuth`); la vuelta pasa por `app/auth/callback/route.ts` y termina en `#/biblioteca`.
- Nombre de usuario derivado del proveedor la primera vez que se entra con Google o GitHub.
- Estado de sesión para toda la app: `AuthProvider` / `useAuth()` en `lib/auth-context.tsx`, alimentado por `onAuthStateChange`.
- `#/acceso` con sesión: "SESIÓN INICIADA COMO <USUARIO>", correo, IR A LA BIBLIOTECA y CERRAR SESIÓN.
- Nav y menú lateral: con sesión, el botón "Iniciar Sesión" muestra el nombre de usuario y sigue llevando a `#/acceso`.
- Mensajes de error fijos en español para credenciales incorrectas, correo sin confirmar, contraseña corta, límite de correos, fallo de Google o GitHub y error de red.
- Configuración manual de Supabase Auth, Google Cloud y GitHub (URLs, plantilla del correo de confirmación, apps OAuth), documentada como pasos del plan.

**Fuera de alcance (para specs futuros):**

- Otros proveedores (Apple, Discord, X…).
- Recuperar contraseña ("¿Olvidaste tu contraseña?").
- SMTP propio (Resend u otro): se usa el SMTP por defecto de Supabase.
- Tabla `public.profiles`, unicidad del nombre de usuario y validación del nombre en base de datos.
- Ligar `scores` a `user_id`, precargar las iniciales en GUARDAR PUNTUACIÓN o cualquier cambio en `submit_score`.
- Pantalla de perfil, avatar del proveedor, cambiar usuario, correo o contraseña, vincular o desvincular proveedores a mano y borrar la cuenta.
- `proxy.ts` (antes `middleware.ts`) y lectura de la sesión en Server Components.
- Proteger pantallas tras la sesión: todo sigue siendo jugable como invitado.

## Modelo de datos

No hay migraciones ni tablas nuevas. `lib/supabase/database.types.ts` no cambia.
La cuenta vive en `auth.users` (gestionada por Supabase); el nombre de usuario va en `raw_user_meta_data`.

### Metadatos del usuario

```ts
// auth.users.raw_user_meta_data
type UserMetadata = {
  /** Mismo formato que scores.name: ^[A-Z0-9_ ]{1,10}$, sin espacios en los extremos. */
  username: string;
};
```

- Con correo y contraseña, `username` llega en `options.data` de `signUp`.
- Con Google o GitHub, `app/auth/callback/route.ts` lo calcula con `deriveUsername` y lo guarda con `updateUser({ data: { username } })`, solo si la cuenta aún no lo tiene.
- El nombre del formulario se valida solo en cliente con `isValidName` de `lib/scores.ts` (se reutiliza, no se duplica el patrón).
- El campo pasa a mayúsculas mientras se escribe, como las iniciales del modal FIN DEL JUEGO.
- Si una sesión no trae `username` (no debería pasar), se muestra `JUGADOR`.

### Estado de sesión (`lib/auth-context.tsx`)

```ts
type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "user"; email: string; username: string };
```

- `AuthProvider` crea el cliente con `createClient()` de `lib/supabase/client.ts`, llama a `getSession()` al montar y se suscribe a `onAuthStateChange`; se desuscribe al desmontar.
- `useAuth()` lanza un error fuera del provider, como `useGames()`.
- `App.tsx` envuelve el shell en `AuthProvider` siempre, también cuando el catálogo falla (Acceso no depende del catálogo).

### Operaciones (`lib/auth.ts`)

```ts
export const MIN_PASSWORD = 6; // mínimo por defecto de Supabase Auth
export type OAuthProvider = "google" | "github";

export async function signUp(
  username: string,
  email: string,
  password: string,
): Promise<void>;
export async function signIn(email: string, password: string): Promise<void>;
export async function signInWithProvider(
  provider: OAuthProvider,
): Promise<void>;
export async function signOut(): Promise<void>;

/** Nombre de usuario a partir de los metadatos del proveedor. Siempre cumple isValidName. */
export function deriveUsername(
  meta: Record<string, unknown>,
  email: string | undefined,
): string;
```

- `signUp` pasa `options.emailRedirectTo` con el valor `${window.location.origin}/auth/confirm` y `options.data.username`.
- `signInWithProvider` pasa `options.redirectTo` con el valor `${window.location.origin}/auth/callback`; el navegador sale hacia Google o GitHub y no vuelve a la promesa.
- `deriveUsername` prueba en orden `user_name` (GitHub), `preferred_username`, la primera palabra de `full_name` o `name` (Google) y lo que va antes de la `@` del correo. A cada candidato le quita los acentos (`normalize("NFD")`), lo pasa a mayúsculas, borra lo que no sea `A-Z0-9_` y lo corta a 10. Devuelve el primero que no quede vacío, o `JUGADOR`.
- Como `lib/scores.ts`: el detalle del error va a `console.error` y se lanza un `Error` con un mensaje fijo de esta tabla.

| Caso (`error.code` de Supabase) | Mensaje en pantalla                            |
| ------------------------------- | ---------------------------------------------- |
| `invalid_credentials`           | CORREO O CONTRASEÑA INCORRECTOS                |
| `email_not_confirmed`           | CONFIRMA TU CORREO ANTES DE ENTRAR             |
| `weak_password`                 | LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES |
| `over_email_send_rate_limit`    | DEMASIADOS CORREOS · PRUEBA MÁS TARDE          |
| `over_request_rate_limit`       | DEMASIADOS INTENTOS · PRUEBA MÁS TARDE         |
| cualquier otro (red, 5xx…)      | NO SE PUDO CONECTAR CON EL VAULT               |

- Crear cuenta con un correo ya registrado no da error (Supabase lo oculta para no revelar cuentas): se muestra el mismo panel "REVISA TU CORREO".

### Confirmación del correo (`app/auth/confirm/route.ts`)

- `GET /auth/confirm?token_hash=…&type=email`.
- Crea el cliente con `createClient()` de `lib/supabase/server.ts` y llama a `verifyOtp({ type, token_hash })`; la sesión queda en cookies (en un Route Handler `cookies()` se puede escribir).
- Éxito → redirige a `/?acceso=confirmado#/acceso`. Falta un parámetro o falla `verifyOtp` → `/?acceso=error#/acceso`.
- Funciona aunque el enlace se abra en otro navegador o dispositivo, porque no depende del `code_verifier` de PKCE.

### Vuelta de Google y GitHub (`app/auth/callback/route.ts`)

- `GET /auth/callback?code=…` (o `?error=…` si el jugador cancela en el proveedor).
- Crea el cliente con `createClient()` de `lib/supabase/server.ts` y llama a `exchangeCodeForSession(code)`; el `code_verifier` de PKCE está en las cookies del mismo navegador que pulsó el botón.
- Si `user.user_metadata.username` no existe, guarda `deriveUsername(user.user_metadata, user.email)` con `updateUser`.
- Éxito → redirige a `/#/biblioteca`. Llega `error`, falta `code` o falla el intercambio → `/?acceso=oauth-error#/acceso`.
- Google y GitHub dan el correo por verificado: no se envía correo de confirmación.
- Si el correo ya tiene cuenta (de correo y contraseña, o del otro proveedor) y está verificado, Supabase vincula la identidad a esa misma cuenta y el usuario no cambia.

### Pantalla `#/acceso` (`components/screens/Auth.tsx`)

| Estado                           | Qué se ve                                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `loading`                        | La tarjeta con "VERIFICANDO SESIÓN…" en lugar del formulario                                                                   |
| `anon`, pestaña INICIAR SESIÓN   | Correo, Contraseña, ENTRAR AL VAULT, y GOOGLE y GITHUB debajo de "O CONTINÚA CON"                                              |
| `anon`, pestaña CREAR CUENTA     | Usuario, Correo, Contraseña, CREAR Y JUGAR, y GOOGLE y GITHUB debajo de "O CONTINÚA CON"                                       |
| Enviando o saliendo al proveedor | El botón pulsado muestra "CONECTANDO…"; campos y demás botones deshabilitados                                                  |
| Error                            | Línea "▸ <MENSAJE>" bajo el botón (mismo estilo que "▸ ERROR AL GUARDAR" del player); los campos conservan lo escrito          |
| Cuenta creada                    | Panel "REVISA TU CORREO" con el correo usado, aviso de buscar en spam y VOLVER (vuelve a INICIAR SESIÓN con el correo relleno) |
| `user`                           | "SESIÓN INICIADA COMO <USUARIO>", correo, IR A LA BIBLIOTECA y CERRAR SESIÓN                                                   |
| `?acceso=confirmado`             | Aviso "CORREO CONFIRMADO · BIENVENIDO" encima del estado `user`                                                                |
| `?acceso=error`                  | Aviso "ENLACE NO VÁLIDO O CADUCADO" encima del formulario                                                                      |
| `?acceso=oauth-error`            | Aviso "NO SE PUDO ENTRAR CON GOOGLE O GITHUB" encima del formulario                                                            |

- El aviso de `?acceso=` se lee una vez al montar y se limpia con `history.replaceState(null, "", "/" + location.hash)`.
- Iniciar sesión con correo con éxito navega a la Biblioteca, como hoy; con Google o GitHub la Biblioteca llega por la redirección del callback.
- CERRAR SESIÓN se queda en `#/acceso`, que vuelve al formulario.
- Validación en cliente antes de enviar: usuario con `isValidName`, correo no vacío con `type="email"`, contraseña de al menos `MIN_PASSWORD`. El botón de enviar no se deshabilita por validación; al enviar, el primer fallo se muestra como error. GOOGLE y GITHUB no validan el formulario.
- JUGAR COMO INVITADO se mantiene y solo se ve sin sesión.
- Se reutilizan las clases existentes (`auth-card`, `auth-tabs`, `field`, `btn`, `social`); estilos nuevos solo como clases `auth-*` en `app/globals.css`, sin estilos en línea.

### Nav (`components/Nav.tsx`)

- `useAuth()`: con `status: "user"`, `.auth-btn` y el enlace del menú lateral muestran el nombre de usuario (`aria-label="Cuenta de <USUARIO>"`) y llevan a `#/acceso`.
- Con `loading` o `anon` muestran "Iniciar Sesión", como hoy.

### Configuración manual (paneles, no hay herramienta MCP)

`<ref>` es la referencia del proyecto de Supabase (la de `NEXT_PUBLIC_SUPABASE_URL`).

**Supabase → Authentication:**

- Sign In / Providers → Email: activado, "Confirm email" activado.
- URL Configuration: Site URL `http://localhost:3000`; Redirect URLs `http://localhost:3000/**` y la URL de producción con `/**` cuando exista. Cubre `/auth/confirm` y `/auth/callback`.
- Emails → "Confirm signup": el enlace pasa a `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email`.
- Sign In / Providers → Google y GitHub: activados, con el Client ID y el Client Secret de cada app.
- SMTP por defecto: solo envía a correos de miembros del equipo del proyecto y con un límite de pocos correos por hora.

**Google Cloud Console:**

- Pantalla de consentimiento OAuth con los permisos `openid`, `email` y `profile`; en modo "Testing", con los correos de prueba añadidos como usuarios de prueba.
- Credenciales → ID de cliente OAuth de tipo "Aplicación web": orígenes autorizados `http://localhost:3000`; URI de redirección autorizada `https://<ref>.supabase.co/auth/v1/callback`.

**GitHub → Settings → Developer settings → OAuth Apps:**

- Nueva app: Homepage URL `http://localhost:3000`; Authorization callback URL `https://<ref>.supabase.co/auth/v1/callback`.

Los Client Secret solo se pegan en el panel de Supabase: no van a `.env.local` ni al repositorio.

## Plan de implementación

1. **Configuración de Supabase (correo).** Aplicar los puntos de Email, URL Configuration y plantilla "Confirm signup". Verificación: en el panel, "Confirm email" está activo, `http://localhost:3000/**` aparece en Redirect URLs y la plantilla "Confirm signup" contiene `token_hash`.
2. **Sesión.** Crear `lib/auth-context.tsx` (`AuthProvider`, `useAuth`) y envolver el shell de `components/App.tsx`. Verificación: `npm run build` pasa y la app se ve igual que antes.
3. **Nav.** Usar `useAuth()` en `components/Nav.tsx` para el `.auth-btn` y el enlace del menú lateral. Verificación: sin sesión se ve "Iniciar Sesión" en ambos.
4. **Operaciones de correo.** Crear `lib/auth.ts` con `signUp`, `signIn`, `signOut`, `MIN_PASSWORD` y la tabla de mensajes. Verificación: `npm run lint` pasa.
5. **Formulario.** En `components/screens/Auth.tsx`, el campo "Usuario" de INICIAR SESIÓN pasa a "Correo"; CREAR CUENTA pide Usuario, Correo y Contraseña; validación en cliente, estado "CONECTANDO…", línea de error y panel "REVISA TU CORREO". Verificación: crear cuenta con un correo del equipo muestra el panel y el correo llega.
6. **Confirmación.** Crear `app/auth/confirm/route.ts`. Verificación: abrir el enlace del correo termina en `#/acceso` con "CORREO CONFIRMADO · BIENVENIDO" y la sesión abierta; un `token_hash` inventado termina en "ENLACE NO VÁLIDO O CADUCADO".
7. **Pantalla de cuenta.** Estados `loading` y `user` de `Auth.tsx` con CERRAR SESIÓN e IR A LA BIBLIOTECA; JUGAR COMO INVITADO solo sin sesión. Verificación: iniciar sesión, recargar y cerrar sesión desde `#/acceso`.
8. **Apps OAuth.** Crear el cliente OAuth de Google y la OAuth App de GitHub y activar ambos proveedores en Supabase con sus credenciales. Verificación: Google y GitHub aparecen como activados en Sign In / Providers.
9. **Nombre derivado.** Añadir `OAuthProvider`, `signInWithProvider` y `deriveUsername` a `lib/auth.ts`. Verificación: `npm run lint` pasa.
10. **Callback.** Crear `app/auth/callback/route.ts`. Verificación: `/auth/callback` sin `code` termina en `#/acceso` con "NO SE PUDO ENTRAR CON GOOGLE O GITHUB".
11. **Botones sociales.** GOOGLE y GITHUB llaman a `signInWithProvider`, con "CONECTANDO…" y el aviso `?acceso=oauth-error`. Verificación: entrar con GitHub y con Google termina en `#/biblioteca` con el usuario en la cabecera.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] No hay migraciones nuevas en `supabase/migrations/` y `lib/supabase/database.types.ts` no cambia.
- [ ] Ningún Client ID ni Client Secret de Google o GitHub aparece en el repositorio ni en `.env.example`.
- [ ] Sin sesión, la cabecera y el menú lateral muestran "Iniciar Sesión".
- [ ] La pestaña INICIAR SESIÓN muestra Correo y Contraseña; CREAR CUENTA muestra Usuario, Correo y Contraseña; las dos muestran GOOGLE y GITHUB activos.
- [ ] Escribir `kai` en Usuario lo muestra como `KAI`.
- [ ] Enviar CREAR CUENTA con un usuario de 11 caracteres o con `KA-I` muestra un error y no llama a Supabase (sin petición a `/auth/v1/signup` en la pestaña Red).
- [ ] Enviar con una contraseña de 5 caracteres muestra "LA CONTRASEÑA DEBE TENER AL MENOS 6 CARACTERES" y no llama a Supabase.
- [ ] Crear cuenta con un correo del equipo muestra "REVISA TU CORREO" con ese correo y llega un correo de confirmación.
- [ ] Iniciar sesión con esa cuenta antes de confirmar muestra "CONFIRMA TU CORREO ANTES DE ENTRAR".
- [ ] El enlace del correo, abierto en otro navegador, lleva a `#/acceso` con "CORREO CONFIRMADO · BIENVENIDO", la cabecera muestra el usuario y la URL queda en `/#/acceso` sin `?acceso=`.
- [ ] `/auth/confirm?token_hash=x&type=email` lleva a `#/acceso` con "ENLACE NO VÁLIDO O CADUCADO".
- [ ] Iniciar sesión con una contraseña incorrecta muestra "CORREO O CONTRASEÑA INCORRECTOS" y conserva el correo escrito.
- [ ] Iniciar sesión con la cuenta confirmada navega a `#/biblioteca` y la cabecera muestra el nombre de usuario en lugar de "Iniciar Sesión".
- [ ] Pulsar GITHUB pone el botón en "CONECTANDO…" y abre la autorización de github.com; al autorizar se vuelve a `#/biblioteca` con el `login` de GitHub en mayúsculas en la cabecera (sin guiones y con 10 caracteres como máximo).
- [ ] Pulsar GOOGLE con un usuario de prueba abre la elección de cuenta de Google; al elegirla se vuelve a `#/biblioteca` con un usuario que cumple `^[A-Z0-9_ ]{1,10}$` en la cabecera.
- [ ] Entrar con Google o GitHub no envía ningún correo de confirmación.
- [ ] Cerrar sesión y volver a entrar con el mismo proveedor muestra el mismo usuario que la primera vez.
- [ ] Entrar con Google o GitHub con el mismo correo que una cuenta de correo ya confirmada muestra el usuario de esa cuenta, no uno derivado.
- [ ] Cancelar en la pantalla de Google o GitHub vuelve a `#/acceso` con "NO SE PUDO ENTRAR CON GOOGLE O GITHUB" y la URL queda en `/#/acceso`.
- [ ] `/auth/callback` sin `code` lleva a `#/acceso` con "NO SE PUDO ENTRAR CON GOOGLE O GITHUB".
- [ ] `deriveUsername({ full_name: "José Pérez" }, undefined)` devuelve `JOSE`, `deriveUsername({ user_name: "kai-dev-the-great" }, undefined)` devuelve `KAIDEVTHEG` y `deriveUsername({}, "ñ@x.com")` devuelve `N` (comprobado en la consola del navegador o con un script de `node`).
- [ ] Tras recargar la página la sesión sigue abierta y la cabecera sigue mostrando el usuario, sea cual sea el método.
- [ ] Con sesión, `#/acceso` muestra "SESIÓN INICIADA COMO <USUARIO>", el correo, IR A LA BIBLIOTECA y CERRAR SESIÓN, y no muestra JUGAR COMO INVITADO.
- [ ] CERRAR SESIÓN deja `#/acceso` en el formulario y la cabecera vuelve a "Iniciar Sesión"; tras recargar sigue sin sesión.
- [ ] Mientras se envía, el botón muestra "CONECTANDO…" y no se puede pulsar dos veces.
- [ ] JUGAR COMO INVITADO sigue navegando a `#/biblioteca` sin sesión.
- [ ] Con el catálogo caído (`SignalLost`), `#/acceso` sigue funcionando y se puede iniciar sesión.
- [ ] Guardar una puntuación funciona igual con y sin sesión.
- [ ] `Auth.tsx` y `Nav.tsx` no añaden estilos en línea nuevos.

## Decisiones

- **Sí:** correo, Google y GitHub en un solo spec. Comparten pantalla, sesión y nombre de usuario. Decisión del usuario: primero se aceptó dividir en dos specs y después se pidió juntarlos.
- **No:** un SPEC 20 aparte para Google y GitHub. Era la propuesta inicial para cerrar antes el correo; el usuario prefirió no partirlo.
- **Sí:** iniciar sesión con correo. Es lo que Supabase Auth admite de forma nativa. Decisión del usuario.
- **No:** iniciar sesión con usuario o correo. Exige una RPC usuario → correo que además revela qué cuentas existen.
- **Sí:** confirmación de correo obligatoria. Decisión del usuario.
- **Sí:** SMTP por defecto de Supabase. Decisión del usuario; solo envía a miembros del equipo y con un límite bajo, así que vale para desarrollo y no para usuarios reales (ver Riesgos).
- **Sí:** confirmación por `token_hash` en `app/auth/confirm/route.ts` con `verifyOtp`. Funciona aunque el enlace se abra en otro navegador o en el móvil, y la sesión queda en cookies desde el servidor.
- **No:** el enlace por defecto (`{{ .ConfirmationURL }}`, PKCE con `?code=`). Solo funciona en el mismo navegador donde se creó la cuenta, porque el `code_verifier` vive allí.
- **Sí:** Google y GitHub con PKCE y `exchangeCodeForSession` en `app/auth/callback/route.ts`. Aquí el mismo navegador sí está garantizado (el jugador acaba de pulsar el botón), y es el flujo que `@supabase/ssr` usa por defecto.
- **No:** dejar que el cliente de navegador intercambie el `?code=` solo (`detectSessionInUrl`). Mezclaría query y hash en la SPA y el nombre derivado se guardaría desde el cliente.
- **Sí:** nombre de usuario derivado del proveedor (`deriveUsername`), guardado en el callback solo si falta. Sin pasos extra para el jugador. Decisión del usuario.
- **No:** pedir el nombre en el primer acceso con Google o GitHub. Un paso más y un estado intermedio de "sesión sin nombre".
- **Sí:** volver de Google o GitHub a `#/biblioteca`. Igual que el login con correo. Decisión del usuario.
- **Sí:** vinculación automática de identidades de Supabase cuando el correo coincide y está verificado. Una persona no acaba con dos cuentas por entrar de dos formas, y conserva su usuario.
- **Sí:** volver a `/?acceso=<estado>#/acceso` y limpiar la query con `history.replaceState`. El router de hash no admite parámetros y `#/acceso/...` lo trataría como id de juego.
- **Sí:** mantener `#/acceso` con pestañas y reutilizar `Auth.tsx`. Sin rutas nuevas en `lib/router.ts`. Decisión del usuario.
- **Sí:** el nombre de usuario en `user_metadata`. Sin tabla nueva. Decisión del usuario.
- **No:** tabla `public.profiles`. Daría unicidad y validación en base de datos, pero el usuario lo dejó fuera; si se liga el ranking a la cuenta, ese spec la reconsidera.
- **Sí:** formato del usuario igual que `scores.name` y validado con `isValidName`. Si más adelante se ligan las puntuaciones a la cuenta, el usuario cabe como iniciales. Decisión del usuario.
- **Sí:** con sesión, el botón de la cabecera muestra el usuario y `#/acceso` hace de pantalla de cuenta. Sin pantalla de perfil nueva y sin ensanchar la cabecera que ajusta el SPEC 17. Decisión del usuario.
- **No:** botón SALIR propio en la cabecera. Más ancho en una cabecera que ya desborda en ciertos anchos.
- **Sí:** el ranking no cambia, ni siquiera para precargar iniciales. Decisión del usuario.
- **Sí:** sesión solo en cliente (`AuthProvider` + `onAuthStateChange`), sin `proxy.ts`. La app es una SPA de hash y ningún Server Component necesita al usuario; el cliente de navegador refresca el token solo.
- **Sí:** contraseña de al menos 6 caracteres, el mínimo por defecto de Supabase. Cliente y servidor aplican la misma regla sin tocar más configuración.
- **Sí:** mensajes de error fijos por `error.code` y detalle en `console.error`. Mismo patrón que `lib/scores.ts`.
- **Sí:** correo ya registrado → mismo panel "REVISA TU CORREO". Supabase no da error para no revelar cuentas; la pantalla tampoco.
- **Sí:** un único mensaje para cualquier fallo de Google o GitHub. El callback no sabe con certeza qué proveedor falló y el detalle va a la consola.
- **No:** pedir más permisos a los proveedores que el correo y el perfil básico.

## Riesgos

| Riesgo                                                                                                | Mitigación                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| El SMTP por defecto solo envía a miembros del equipo y con pocos correos por hora                     | Probar con correos del equipo. `over_email_send_rate_limit` tiene mensaje propio. Un SMTP propio va en otro spec.                          |
| La plantilla "Confirm signup" se queda con el enlace por defecto                                      | El paso 1 del plan la cambia y verifica que contiene `token_hash`; sin ese cambio el criterio del otro navegador falla.                    |
| `emailRedirectTo` o `redirectTo` fuera de Redirect URLs (p. ej. producción): Supabase usa la Site URL | Añadir la URL de producción con `/**` al desplegar; documentado en "Configuración manual".                                                 |
| La app de Google en modo "Testing" solo deja entrar a los usuarios de prueba                          | Añadir los correos de prueba en la pantalla de consentimiento. Publicar la app de Google queda fuera de este spec.                         |
| Un proveedor sin activar en Supabase: el navegador acaba en una página de error JSON de Supabase      | El paso 8 verifica que ambos proveedores están activos antes de conectar los botones.                                                      |
| Una cuenta de GitHub con el correo privado no da correo al proveedor                                  | GitHub entrega el correo principal verificado con el permiso por defecto `user:email`; si aun así falta, `deriveUsername` usa `user_name`. |
| `user_metadata.username` no es único ni se valida en base de datos y el usuario puede cambiarlo       | Solo se muestra; no se usa para permisos ni para el ranking. La unicidad llega con `profiles` si un spec la necesita.                      |
| Dos jugadores de GitHub o Google acaban con el mismo nombre derivado (p. ej. `JOSE`)                  | Se acepta: el nombre no es único en este spec (ver la fila anterior).                                                                      |
| El SPEC 17 (Draft) también cambia `Auth.tsx` (estilos en línea → clases) y el `.auth-btn`             | El que se implemente segundo rebasa sobre el primero. Este spec no añade estilos en línea, así que no choca con su regla.                  |
| Un nombre de usuario largo ensancha `.auth-btn` en la cabecera                                        | El usuario tiene como máximo 10 caracteres, menos que "Iniciar Sesión" (14).                                                               |

## Lo que **no** entra en este spec

- Otros proveedores además de Google y GitHub.
- Recuperar contraseña.
- SMTP propio.
- Publicar la app OAuth de Google (salir del modo "Testing").
- Tabla `profiles` y nombre de usuario único.
- Puntuaciones ligadas a la cuenta e iniciales precargadas.
- Pantalla de perfil, avatar, cambios de cuenta, vinculación manual de proveedores y borrado.
- `proxy.ts` y sesión en Server Components.
- Pantallas que exijan sesión.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
