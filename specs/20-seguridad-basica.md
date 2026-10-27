# SPEC 20 — Seguridad básica

> **Estado:** Approved
> **Depende de:** SPEC 04, SPEC 06, SPEC 19
> **Fecha:** 2026-10-27
> **Objetivo:** Cerrar el checklist de `references/security/security-checklist.md`: funciones `SECURITY DEFINER` fuera de la API expuesta, contraseña mínima de 8, límite de registros por IP y cabeceras de seguridad en Next.js, dejando el advisor de seguridad de Supabase con un único aviso aceptado (contraseñas filtradas, que exige plan Pro).

## Por qué existe este spec

El checklist de seguridad básico (`references/security/security-checklist.md`) pide cinco cosas y lista los avisos del advisor de seguridad de Supabase.
El estado real del proyecto el 2026-10-27:

- **RLS** ya está activo en `public.games` y `public.scores` (SPEC 04 y SPEC 06), con solo políticas de lectura y sin `insert/update/delete` para `anon` ni `authenticated`. Aquí solo se verifica.
- **`public.rls_auto_enable()`** no viene de ninguna migración: es la función del event trigger `ensure_rls` que crea el panel de Supabase al activar el RLS automático en tablas nuevas. Es `SECURITY DEFINER` y tiene `EXECUTE` para `PUBLIC`, `anon` y `authenticated`, así que se expone como `/rest/v1/rpc/rls_auto_enable` (avisos 0028 y 0029).
- **`public.submit_score`** es `SECURITY DEFINER` y ejecutable por `anon` y `authenticated` **a propósito**: es la única vía de escritura de `scores` y los invitados guardan puntuaciones (SPEC 06; el SPEC 19 no lo cambió). El advisor lo marca igual (avisos 0028 y 0029).
- **Contraseña mínima**: Supabase Auth está en 6 (su valor por defecto) y `lib/auth.ts` tiene `MIN_PASSWORD = 6`.
- **Contraseñas filtradas** (HaveIBeenPwned): desactivado. El proyecto está en el plan Free y esta opción solo existe en Pro o superior.
- **Registros por IP**: el límite "sign-ups and sign-ins" de Supabase Auth está en su valor por defecto (30 cada 5 minutos por IP).
- **Cabeceras**: `next.config.ts` solo tiene `allowedDevOrigins`; Next.js añade además `X-Powered-By: Next.js`.

## Alcance

**Dentro:**

- Migración `harden_rpc_functions`:
  - Esquema `private` (no expuesto por la API REST) con `private.submit_score`, que hace lo mismo que la función actual y sigue siendo `SECURITY DEFINER`.
  - `public.submit_score` pasa a `SECURITY INVOKER` y solo llama a `private.submit_score`. El endpoint `/rest/v1/rpc/submit_score`, sus argumentos, su respuesta y sus errores no cambian.
  - `REVOKE EXECUTE` de `public.rls_auto_enable()` a `PUBLIC`, `anon` y `authenticated`; el event trigger `ensure_rls` sigue activo.
- Contraseña mínima de 8 caracteres en Supabase Auth (panel) y en `lib/auth.ts` (`MIN_PASSWORD = 8`).
- La regla de longitud en cliente solo se aplica al crear cuenta; al iniciar sesión solo se exige que la contraseña no esté vacía.
- Límite de "sign-ups and sign-ins" por IP en Supabase Auth: de 30 a 10 cada 5 minutos (panel).
- Cabeceras de seguridad para todas las rutas en `next.config.ts` y `poweredByHeader: false`.
- Actualizar la descripción de `submit_score` en `CLAUDE.md`.

**Fuera de alcance (para specs futuros):**

- Protección de rutas con Proxy de Next.js (`proxy.ts`, https://nextjs.org/docs/app/getting-started/proxy): sin ruta, regla ni criterio definidos; las pantallas son rutas hash en `/` y el servidor no ve el hash. Va a su propio spec (junto a la CSP, que también usa `proxy.ts`).
- Protección de contraseñas filtradas (HaveIBeenPwned): requiere plan Pro. Su aviso queda en el advisor como aceptado.
- Content-Security-Policy (con nonces, `proxy.ts`, Supabase, OAuth y fuentes).
- CAPTCHA (Turnstile o hCaptcha) en el registro.
- Requisitos de caracteres en la contraseña (mayúsculas, dígitos, símbolos).
- `preload` en Strict-Transport-Security.
- Obligar a las cuentas existentes con contraseñas de 6 o 7 caracteres a cambiarla.
- Recuperar contraseña.
- Límite de envíos o anti-trampas en `submit_score` (puntuaciones falsas o en ráfaga).
- Exigir sesión para guardar puntuaciones.
- `FORCE ROW LEVEL SECURITY` y políticas nuevas en `games` o `scores`.

## Modelo de datos

No hay tablas nuevas. `lib/supabase/database.types.ts` se regenera (flujo de migraciones) y no cambia: `public.submit_score` mantiene argumentos y tipo de retorno, y `private` no está en los tipos.

Docs de Next.js 16 leídos para este spec:

- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md` (`headers()`, `source`, cabeceras de seguridad recomendadas).
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/poweredByHeader.md`.

### Migración `supabase/migrations/<version>_harden_rpc_functions.sql`

```sql
-- Funciones SECURITY DEFINER fuera de la API expuesta (advisor 0028 / 0029).

create schema if not exists private;
revoke all on schema private from public;
-- public.submit_score es SECURITY INVOKER: quien la llama necesita llegar a private.
grant usage on schema private to anon, authenticated;

-- Mismo cuerpo que la public.submit_score del SPEC 06.
create function private.submit_score(p_game_id text, p_name text, p_score integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if not exists (select 1 from public.games where id = p_game_id) then
    raise exception 'submit_score: juego desconocido %', p_game_id
      using errcode = '22023';
  end if;

  -- No trimming here: the client sends the name already trimmed.
  if p_name is null
     or p_name !~ '^[A-Z0-9_ ]{1,10}$'
     or p_name <> btrim(p_name) then
    raise exception 'submit_score: nombre no válido'
      using errcode = '22023';
  end if;

  if p_score is null or p_score < 0 or p_score > 9999999 then
    raise exception 'submit_score: puntuación fuera de rango'
      using errcode = '22023';
  end if;

  insert into public.scores (game_id, name, score)
  values (p_game_id, p_name, p_score)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function private.submit_score(text, text, integer) from public;
grant execute on function private.submit_score(text, text, integer) to anon, authenticated;

-- La API sigue llamando a public.submit_score; ahora solo delega.
create or replace function public.submit_score(p_game_id text, p_name text, p_score integer)
returns bigint
language sql
security invoker
set search_path = ''
as $$ select private.submit_score(p_game_id, p_name, p_score) $$;

-- rls_auto_enable() la crea el panel (event trigger ensure_rls), no una migración:
-- solo se revoca si existe. El event trigger no necesita EXECUTE para dispararse.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
```

- `create or replace` conserva los permisos de `public.submit_score` (`EXECUTE` para `anon` y `authenticated`, revocado a `PUBLIC` desde el SPEC 06).
- Los errores de `private.submit_score` llegan al cliente con el mismo `errcode` (`22023`) y mensaje: `lib/scores.ts` no cambia.

### Cabeceras (`next.config.ts`)

```ts
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.63"],
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};
```

- `source: "/:path*"` cubre `/`, `/api/health`, `/auth/confirm`, `/auth/callback` y los archivos estáticos.
- En `localhost` (HTTP) el navegador ignora `Strict-Transport-Security`; solo actúa en producción con HTTPS.

### Contraseña (`lib/auth.ts` y `components/screens/Auth.tsx`)

```ts
// lib/auth.ts
/** Minimum password length configured in Supabase Auth (SPEC 20). */
export const MIN_PASSWORD = 8;
```

- `AUTH_ERRORS.weak_password` ya usa `MIN_PASSWORD`: pasa a "LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES" sin tocar el texto.
- `validate()` en `Auth.tsx`:
  - Pestaña CREAR CUENTA (`tab === "up"`): `pass.length < MIN_PASSWORD` → `AUTH_ERRORS.weak_password`, como hoy.
  - Pestaña INICIAR SESIÓN (`tab === "in"`): contraseña vacía → `PASSWORD_ERROR = "ESCRIBE TU CONTRASEÑA"` (nueva constante junto a `EMAIL_ERROR`). Sin regla de longitud: decide Supabase.

### Configuración manual de Supabase Auth (panel, no hay herramienta MCP)

- Authentication → Sign In / Providers → Email → **Minimum password length**: `8`. "Password requirements" se queda en "No required characters".
- Authentication → Rate Limits → **Rate limit for sign-ups and sign-ins**: `10` peticiones cada 5 minutos por IP.
- Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords": no se toca (no disponible en Free).
- Database → el RLS automático en tablas nuevas (`ensure_rls`) sigue activado.

## Plan de implementación

1. **Migración.** Escribir `supabase/migrations/pending_harden_rpc_functions.sql`, aplicarla con `apply_migration` (nombre `harden_rpc_functions`), renombrarla con la versión de `list_migrations`, regenerar tipos con `generate_typescript_types` y revisar `get_advisors` (security). Verificación: `git diff lib/supabase/database.types.ts` vacío; el advisor ya no muestra 0028 ni 0029; guardar una puntuación desde el player sigue funcionando.
2. **Event trigger intacto.** Con `execute_sql`: `create table public._rls_probe (id int);`, leer `relrowsecurity` de `public._rls_probe` y `drop table public._rls_probe;`. Verificación: `relrowsecurity = true`.
3. **Cabeceras.** Añadir `securityHeaders`, `headers()` y `poweredByHeader: false` a `next.config.ts`. Verificación: `npm run build`, `npm run start` y `curl -sI http://localhost:3000/` muestra las cinco cabeceras y no muestra `X-Powered-By`.
4. **Contraseña en código.** `MIN_PASSWORD = 8` en `lib/auth.ts`; en `Auth.tsx`, longitud solo en CREAR CUENTA y `PASSWORD_ERROR` en INICIAR SESIÓN. Verificación: `npm run lint` pasa; crear cuenta con 7 caracteres muestra "LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES" sin petición a `/auth/v1/signup`.
5. ~~**Protección de ruta con Proxy de Next.js**~~ Fuera de alcance (ver Decisiones). Sin cambios; los pasos 6–8 conservan su número.
6. **Contraseña en Supabase.** Poner Minimum password length a 8 en el panel. Verificación: el panel muestra 8.
7. **Límite por IP.** Poner Rate limit for sign-ups and sign-ins a 10 en el panel. Verificación: 11 intentos de inicio de sesión con una contraseña incorrecta de 8 o más caracteres en menos de 5 minutos: el 11.º muestra "DEMASIADOS INTENTOS · PRUEBA MÁS TARDE".
8. **Documentación.** En `CLAUDE.md`, la línea de `public.scores` pasa a decir que `submit_score` es un envoltorio `security invoker` sobre `private.submit_score` (`security definer`). Verificación: `npm run lint` y `npm run build` pasan.

## Criterios de aceptación

- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] Hay una única migración nueva, `supabase/migrations/<version>_harden_rpc_functions.sql`, y su versión coincide con `list_migrations`.
- [ ] `lib/supabase/database.types.ts` no cambia tras regenerarlo.
- [ ] `get_advisors` (security) solo devuelve `auth_leaked_password_protection`.
- [ ] `select relrowsecurity from pg_class where oid in ('public.games'::regclass, 'public.scores'::regclass)` devuelve `true` en las dos filas.
- [ ] `select prosecdef from pg_proc where oid = 'public.submit_score(text, text, integer)'::regprocedure` devuelve `false`, y para `private.submit_score(text, text, integer)` devuelve `true`.
- [ ] `has_function_privilege('anon', 'public.rls_auto_enable()', 'execute')` y lo mismo para `authenticated` devuelven `false`.
- [ ] `POST /rest/v1/rpc/rls_auto_enable` con la clave publicable responde con error de permisos.
- [ ] `POST /rest/v1/rpc/submit_score` con la cabecera `Content-Profile: private` responde que el esquema no está expuesto.
- [ ] Una tabla de prueba creada en `public` nace con RLS activo (paso 2 del plan) y no queda en la base de datos.
- [ ] Guardar una puntuación desde el player sin sesión y con sesión la muestra en el Salón de la Fama.
- [ ] `submit_score` con un nombre no válido (p. ej. `ka-i` desde la consola con `submitScore`) sigue fallando con `22023` y el player muestra "▸ ERROR AL GUARDAR".
- [ ] `curl -sI` contra `/`, `/api/health` y `/favicon.ico` (con `npm run start`) devuelve `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()` y `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
- [ ] Ninguna de esas respuestas lleva `X-Powered-By`.
- [ ] Una página local con `<iframe src="http://localhost:3000/">` no muestra la app (bloqueada por `X-Frame-Options`).
- [ ] Entrar con Google y con GitHub y confirmar un correo nuevo siguen funcionando como en el SPEC 19.
- [ ] CREAR CUENTA con una contraseña de 7 caracteres muestra "LA CONTRASEÑA DEBE TENER AL MENOS 8 CARACTERES" y no hay petición a `/auth/v1/signup`.
- [ ] CREAR CUENTA con 8 caracteres o más llega a Supabase (petición a `/auth/v1/signup`).
- [ ] INICIAR SESIÓN con la contraseña vacía muestra "ESCRIBE TU CONTRASEÑA" y no hay petición a `/auth/v1/token`.
- [ ] INICIAR SESIÓN con una contraseña de 6 o 7 caracteres sí llega a Supabase (petición a `/auth/v1/token`).
- [ ] El panel de Supabase muestra Minimum password length `8` y Rate limit for sign-ups and sign-ins `10`.
- [ ] 11 inicios de sesión fallidos desde la misma IP en menos de 5 minutos: el 11.º muestra "DEMASIADOS INTENTOS · PRUEBA MÁS TARDE".
- [ ] `CLAUDE.md` describe `public.submit_score` como envoltorio `security invoker` de `private.submit_score`.

## Decisiones

- **Sí:** mover la lógica a `private.submit_score` (`SECURITY DEFINER`) y dejar `public.submit_score` como `SECURITY INVOKER` que la llama. El endpoint, los tipos y `lib/scores.ts` no cambian, los invitados siguen guardando y el advisor queda limpio. Decisión del usuario.
- **No:** aceptar el aviso de `submit_score` sin tocar nada. El advisor seguiría con dos avisos permanentes que esconden los nuevos.
- **No:** revocar `submit_score` a `anon` y exigir sesión para guardar. Rompe la experiencia de invitado y contradice el SPEC 19.
- **No:** `public.submit_score` como `SECURITY INVOKER` con `insert` para `anon` y una política RLS de inserción. Abriría `POST /rest/v1/scores` directo y rompería la regla "solo se escribe por la RPC".
- **Sí:** revocar `EXECUTE` de `rls_auto_enable()` a `PUBLIC`, `anon` y `authenticated` y mantener el event trigger. Conserva la red de seguridad que activa RLS en tablas nuevas. Decisión del usuario.
- **No:** borrar la función y el event trigger `ensure_rls`.
- **Sí:** el `revoke` de `rls_auto_enable()` va dentro de un `do` con `to_regprocedure`. La función la crea el panel, no una migración, y en otro entorno puede no existir.
- **Sí:** el RLS de `games` y `scores` solo se verifica. Ya está activo desde los SPEC 04 y 06.
- **Sí:** contraseña mínima de 8, solo longitud. Lo que pide el checklist, con la menor fricción. Decisión del usuario.
- **No:** requisitos de caracteres (mayúsculas, dígitos, símbolos). Más fricción para un portal de juegos y mensajes nuevos.
- **Sí:** la longitud mínima en cliente solo al crear cuenta; al iniciar sesión solo se exige que no esté vacía. Supabase solo aplica el mínimo al registrar o cambiar la contraseña, y sin "recuperar contraseña" una cuenta con 6 o 7 caracteres quedaría sin poder entrar.
- **Sí:** mensaje "ESCRIBE TU CONTRASEÑA" para la contraseña vacía al iniciar sesión. Mismo estilo que "ESCRIBE TU CORREO"; "AL MENOS 8 CARACTERES" confundiría a quien tiene una contraseña antigua más corta.
- **No:** protección de contraseñas filtradas. El proyecto está en Free y la opción exige Pro. Decisión del usuario: se queda fuera y su aviso se acepta.
- **Sí:** bajar el límite de "sign-ups and sign-ins" a 10 cada 5 minutos por IP. Frena bots sin tocar la UI: `over_request_rate_limit` ya muestra "DEMASIADOS INTENTOS · PRUEBA MÁS TARDE". Decisión del usuario.
- **No:** CAPTCHA en este spec. Widget, clave y lógica nueva en `Auth.tsx`: va en su propio spec si hace falta.
- **Sí:** las tres cabeceras del checklist más `Permissions-Policy`, `Strict-Transport-Security` y `poweredByHeader: false`. Decisión del usuario.
- **Sí:** `X-Frame-Options: DENY` (como el checklist) y no `SAMEORIGIN` (como la doc de Next). La app no se incrusta a sí misma en ningún `iframe`.
- **Sí:** `Strict-Transport-Security` de 2 años con `includeSubDomains` y sin `preload`. No compromete un dominio en las listas de preload de los navegadores mientras no haya dominio de producción. Decisión del usuario.
- **No:** Content-Security-Policy. Exige nonces vía `proxy.ts` y permitir Supabase, Google y GitHub: su propio spec.
- **No:** protección de rutas con Proxy de Next.js en este spec. El paso no definía ruta, regla ni criterio de aceptación, y las pantallas son rutas hash que el servidor no ve. Va a su propio spec. Decisión del usuario durante la implementación.
- **Sí:** `source: "/:path*"`, el patrón de la doc de Next 16, en lugar de `'/(.*)'` del checklist. Cubre las mismas rutas.

## Riesgos

| Riesgo                                                                                                          | Mitigación                                                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Volver a activar o desactivar el RLS automático en el panel recrea `rls_auto_enable()` con `EXECUTE` para todos | `get_advisors` lo vuelve a mostrar; basta con repetir el `revoke` de la migración.                                                                           |
| Quitar `EXECUTE` a `PUBLIC` rompe el event trigger                                                              | Postgres no comprueba `EXECUTE` al disparar un event trigger; el paso 2 del plan lo comprueba con una tabla de prueba.                                       |
| `public.submit_score` como `SECURITY INVOKER` falla por permisos sobre `private`                                | La migración da `usage` en `private` y `execute` en `private.submit_score` a `anon` y `authenticated`; el criterio de guardar con y sin sesión lo comprueba. |
| Alguien crea más funciones en `private` y las hereda `PUBLIC` por defecto                                       | `revoke all on schema private from public` y cada función nueva revoca `EXECUTE` a `public`, como `private.submit_score`.                                    |
| 10 intentos cada 5 minutos bloquea a quien prueba la app desde la misma red (misma IP pública)                  | El bloqueo dura 5 minutos y el valor se sube en el panel. Al verificar el paso 6, esperar 5 minutos antes de seguir probando.                                |
| En producción, `/auth/confirm` y `/auth/callback` llaman a Supabase desde la IP del servidor de Next            | Si esas llamadas cuentan para el límite por IP, todos los usuarios comparten un contador. Hoy no hay producción; revisarlo en el spec de despliegue.         |
| Cuentas creadas con contraseñas de 6 o 7 caracteres                                                             | Siguen entrando (el cliente ya no corta por longitud al iniciar sesión). Obligarlas a cambiarla queda fuera.                                                 |
| `Strict-Transport-Security` en un dominio que también sirve subdominios por HTTP                                | Sin `preload` y sin dominio de producción todavía; revisarlo al desplegar.                                                                                   |
| `submit_score` sigue aceptando cualquier puntuación válida de cualquiera (spam o trampas)                       | Fuera de alcance: va en un spec de anti-trampas.                                                                                                             |
| El aviso `auth_leaked_password_protection` se queda en el advisor                                               | Aceptado y documentado: requiere plan Pro.                                                                                                                   |

## Lo que **no** entra en este spec

- Protección de contraseñas filtradas (plan Pro).
- Content-Security-Policy.
- Protección de rutas con Proxy de Next.js (`proxy.ts`).
- CAPTCHA en el registro.
- Requisitos de caracteres en la contraseña.
- `preload` de HSTS.
- Forzar el cambio de contraseñas antiguas y recuperar contraseña.
- Límites y anti-trampas en `submit_score`.
- Exigir sesión para guardar puntuaciones.
- `FORCE ROW LEVEL SECURITY` y políticas nuevas.
- Tests unitarios.

Cada uno, si llega, va en su propio spec.
