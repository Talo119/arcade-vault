# SPEC 04 — Infraestructura de Supabase

> **Estado:** Implemented
> **Depende de:** —
> **Fecha:** 2026-10-02
> **Objetivo:** Conectar la app de Next.js con el proyecto de Supabase mediante `@supabase/ssr` (clientes de navegador y servidor, variables de entorno, migraciones versionadas y tipos generados), verificable con `GET /api/health`.

## Por qué existe este spec

Arcade Vault necesitará cuentas, puntuaciones y quizá un catálogo en base de datos, y todo eso pasa por Supabase.
El proyecto de Supabase (`cyzrsivzkdixaappwdcp`) está vacío: 0 tablas y 0 migraciones.
Este spec solo deja la tubería montada y probada de extremo a extremo.
No añade ninguna funcionalidad visible.
Auth, juegos y puntuaciones irán cada uno en su propio spec, sobre esta base.

## Alcance

**Dentro:**

- Dependencias `@supabase/supabase-js` y `@supabase/ssr`.
- Variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en `.env.local`.
- Plantilla versionada `.env.example` y excepción `!.env.example` en `.gitignore`.
- Carpeta `supabase/migrations/` con la primera migración: la función `public.health()`.
- Aplicación de la migración al proyecto remoto con el MCP de Supabase.
- Tipos generados en `lib/supabase/database.types.ts` con el MCP.
- Lectura y validación de las variables en `lib/supabase/env.ts`.
- Cliente de navegador en `lib/supabase/client.ts`.
- Cliente de servidor con cookies en `lib/supabase/server.ts`.
- Route handler `app/api/health/route.ts` que llama a `health()` y responde 200 o 503.

**Fuera de alcance (para specs futuros):**

- Autenticación: registro, login, sesión y conexión de la pantalla Acceso (`#/acceso`).
- `proxy.ts` para refrescar la sesión en cada petición. Llega con el spec de auth.
- Tablas de dominio (`games`, `scores`, perfiles) y la migración de `lib/games.ts`.
- Conectar el Salón de la Fama o cualquier pantalla a datos reales.
- Supabase CLI, stack local con Docker y `supabase/config.toml`.
- Script npm para regenerar tipos.
- Secret key (`service_role`) en el servidor.
- Indicador visual de estado de la conexión en la UI.
- Variables de entorno en el hosting (Vercel u otro) y despliegue.
- Tests automatizados.

## Modelo de datos

### Variables de entorno

| Variable                               | Archivo      | Valor                                              |
| -------------------------------------- | ------------ | -------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `.env.local` | `https://cyzrsivzkdixaappwdcp.supabase.co`         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` | Publishable key del proyecto (`sb_publishable_…`). |

Reglas:

- `.env.example` lleva las dos variables con valor vacío y se versiona.
- `.env.local` está ignorado por la regla `.env*` existente.
- El `.env` actual, que solo contiene `SUPABASE_DB_PASSWORD`, no se toca.
- Las variables se leen con acceso literal (`process.env.NEXT_PUBLIC_SUPABASE_URL`). Next solo inlina en el bundle del navegador los accesos literales.

### Migración (`supabase/migrations/<version>_create_health_function.sql`)

```sql
create or replace function public.health()
returns timestamptz
language sql
stable
security invoker
set search_path = ''
as $$ select now() $$;

grant execute on function public.health() to anon, authenticated;
```

Reglas:

- El archivo se crea primero como `supabase/migrations/pending_create_health_function.sql`. El prefijo `pending_` marca que todavía no tiene versión remota.
- `<version>` es la versión que asigna Supabase al aplicar la migración con `apply_migration`, tal como la devuelve `list_migrations`. El archivo local y el historial remoto comparten versión y nombre.
- Toda migración futura sigue el mismo flujo: primero el archivo `pending_<nombre>.sql` en `supabase/migrations/`, luego `apply_migration` con el mismo SQL, y después se renombra el archivo a `<version>_<nombre>.sql`.
- Ningún archivo `pending_*` queda en `supabase/migrations/` al terminar un spec.

### Tipos (`lib/supabase/database.types.ts`)

- Se genera con `generate_typescript_types` del MCP y se versiona sin editarlo a mano.
- Se regenera después de cada migración.
- Exporta el tipo `Database`; `public.Functions.health` queda tipada con `Returns: string`.

### Módulos (`lib/supabase/`)

```ts
// env.ts
export function getSupabaseEnv(): { url: string; publishableKey: string };
// Lanza Error("Falta NEXT_PUBLIC_SUPABASE_URL") o Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY").

// client.ts — solo para Client Components
export function createClient(): SupabaseClient<Database>; // createBrowserClient<Database>

// server.ts — Server Components, Route Handlers y Server Actions
export async function createClient(): Promise<SupabaseClient<Database>>; // createServerClient<Database> + await cookies()
```

Reglas:

- `getSupabaseEnv` trata una cadena vacía igual que una variable ausente: `NEXT_PUBLIC_SUPABASE_URL=` lanza `Error("Falta NEXT_PUBLIC_SUPABASE_URL")`.
- `server.ts` lee y escribe cookies con `getAll` / `setAll` de `next/headers`.
- `setAll` va en `try/catch`, porque desde un Server Component no se pueden escribir cookies.
- Los clientes no se cachean en variables de módulo: cada llamada crea uno nuevo.
- Ninguna pantalla existente importa estos módulos en este spec.

### Respuesta de `GET /api/health` (`app/api/health/route.ts`)

```ts
type HealthResponse =
  | { ok: true; dbTime: string; latencyMs: number } // 200
  | { ok: false; error: "supabase_unreachable" }; // 503
```

Reglas:

- `dbTime` es el valor devuelto por `supabase.rpc("health")`, sin transformar. Es el texto ISO 8601 con zona horaria que genera PostgREST (por ejemplo, `2026-10-02T12:34:56.789012+00:00`).
- `latencyMs` es el tiempo entero, en milisegundos, de la llamada a `rpc`.
- Cualquier fallo responde 503 con el mismo cuerpo fijo: variables ausentes, error de `rpc` o excepción de red.
- El detalle del fallo solo va a `console.error` en el servidor y nunca al JSON.
- La respuesta lleva `Cache-Control: no-store`.

## Plan de implementación

1. **Dependencias.** `npm install @supabase/supabase-js @supabase/ssr`. Verificación: `npm run lint` y `npm run build` pasan y la app se ve igual.
2. **Variables de entorno.** Obtener la URL y la publishable key con `get_project_url` y `get_publishable_keys` del MCP. Escribirlas en `.env.local`. Crear `.env.example` con las dos variables vacías. Añadir `!.env.example` a `.gitignore` debajo de `.env*`. Verificación: `git check-ignore .env.example` no devuelve nada y `git check-ignore .env.local` sí.
3. **Migración.** Crear `supabase/migrations/pending_create_health_function.sql` con el SQL del modelo de datos. Aplicarlo con `apply_migration` (nombre `create_health_function`). Renombrar el archivo a `<version>_create_health_function.sql` con la versión que devuelva `list_migrations`. Verificación: `execute_sql` con `select public.health();` devuelve una fecha, y `get_advisors` (tipo `security`) no muestra avisos sobre `health`.
4. **Tipos.** Generar `lib/supabase/database.types.ts` con `generate_typescript_types`. Verificación: el archivo exporta `Database` e incluye `health` en `Functions`; `npm run lint` pasa.
5. **Clientes.** Crear `lib/supabase/env.ts`, `lib/supabase/client.ts` y `lib/supabase/server.ts` según el modelo de datos. Antes, leer `node_modules/next/dist/docs/` sobre `cookies()` para confirmar su API en Next 16. Verificación: `npm run build` pasa.
6. **Health.** Crear `app/api/health/route.ts` con `GET` según el modelo de datos. Verificación: con `npm run dev`, `curl -i http://localhost:3000/api/health` devuelve 200 con `ok: true`.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación.
- [ ] `package.json` incluye `@supabase/supabase-js` y `@supabase/ssr` en `dependencies`.
- [ ] `.env.example` está versionado y contiene exactamente `NEXT_PUBLIC_SUPABASE_URL=` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`.
- [ ] `.env.local` no aparece en `git status`.
- [ ] `.env` sigue igual: solo contiene `SUPABASE_DB_PASSWORD`.
- [ ] `supabase/migrations/` contiene un único archivo, sin prefijo `pending_`, y su versión y nombre coinciden con los que devuelve `list_migrations`.
- [ ] `select public.health();` devuelve la fecha actual del servidor.
- [ ] `get_advisors` de seguridad no muestra avisos sobre `public.health`.
- [ ] `lib/supabase/database.types.ts` exporta `Database`, que incluye la función `health`.
- [ ] `lib/supabase/client.ts` usa `createBrowserClient<Database>`, y `lib/supabase/server.ts` usa `createServerClient<Database>` con `cookies()`.
- [ ] `GET /api/health` responde 200 con `{ ok: true, dbTime, latencyMs }`, donde `dbTime` es una fecha ISO 8601 con zona horaria (formato PostgREST, p. ej. `…+00:00`) y `latencyMs` es un entero ≥ 0.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` vacía en `.env.local` y el servidor reiniciado, `GET /api/health` responde 503 con exactamente `{ "ok": false, "error": "supabase_unreachable" }`, y el log del servidor muestra "Falta NEXT_PUBLIC_SUPABASE_URL".
- [ ] En ese mismo estado sin variables, todas las pantallas de la SPA (`#/`, `#/biblioteca`, `#/acceso`, `#/salon`, `#/acerca`) cargan sin errores en la consola.
- [ ] La respuesta de `/api/health` lleva la cabecera `Cache-Control: no-store`.
- [ ] El bundle del navegador (`.next/static`) no contiene `SUPABASE_DB_PASSWORD` ni su valor.

## Decisiones

- **Sí:** solo infraestructura. Decisión del usuario; auth, juegos y puntuaciones son dominios distintos y cada uno merece su spec.
- **No:** meter auth o tablas de dominio aquí. Juntaría cuatro dominios en un spec.
- **Sí:** `@supabase/ssr` con cliente de navegador y de servidor. Decisión del usuario; es la vía oficial para App Router y prepara la sesión por cookies para auth.
- **No:** solo `supabase-js` en el navegador. Habría que rehacerlo al llegar auth o la lectura desde el servidor.
- **Sí:** publishable key (`sb_publishable_…`). Decisión del usuario; es el formato actual, se puede rotar y sustituye a la anon key.
- **No:** anon key JWT legacy. Supabase la está retirando.
- **Sí:** valores en `.env.local` y plantilla `.env.example` versionada. Decisión del usuario; quien clone el repo ve qué variables necesita.
- **No:** añadir las variables al `.env` actual. Mezcla la contraseña de la base de datos con la configuración de la app.
- **Sí:** migraciones como archivos SQL en `supabase/migrations/`, aplicadas con el MCP. Decisión del usuario; deja historial en git sin Docker ni la CLI.
- **No:** Supabase CLI con stack local. Exige Docker para un proyecto que hoy no lo necesita.
- **No:** aplicar cambios solo con el MCP, sin archivos. No queda historial del esquema en el repo.
- **Sí:** renombrar el archivo local a la versión remota. El historial local y el remoto deben coincidir si algún día se adopta la CLI.
- **Sí:** crear la migración como `pending_<nombre>.sql` antes de aplicarla. Decisión del usuario; el prefijo deja claro que el archivo aún no tiene versión remota.
- **No:** una marca de tiempo local provisional. Se confundiría con una versión real hasta el renombrado.
- **Sí:** verificar con un route handler `/api/health`. Decisión del usuario; prueba la conexión real con un `curl`.
- **Sí:** `health()` como RPC creada en la primera migración. Decisión del usuario; prueba de una vez el cliente de servidor, los tipos generados y el flujo de migraciones.
- **No:** `fetch` a `/auth/v1/health`. No pasa por `supabase-js` ni por los tipos.
- **No:** tabla de prueba `ping`. Deja un resto en el esquema.
- **Sí:** `health()` es `stable`, `security invoker`, con `search_path` vacío y ejecutable por `anon`. Decisión del usuario; solo devuelve `now()`, no filtra datos y cumple con los advisors.
- **No:** restringir `health()` a `service_role`. Obligaría a usar una secret key en el servidor solo para el health.
- **Sí:** respuesta 200/503 con JSON mínimo y el detalle solo en el log. Decisión del usuario; un endpoint público no debe exponer errores internos.
- **Sí:** `dbTime` tal cual lo devuelve PostgREST. Decisión del usuario; ya es ISO 8601 con zona horaria y el endpoint no transforma datos.
- **No:** normalizar con `new Date(x).toISOString()`. Pierde los microsegundos y añade una transformación sin necesidad.
- **Sí:** una variable con cadena vacía cuenta como ausente. Decisión del usuario; `.env.example` deja las variables vacías, y `""` haría fallar `createServerClient` con un error confuso.
- **Sí:** las variables ausentes lanzan un error claro al crear el cliente. Decisión del usuario; la app sigue funcionando sin credenciales porque hoy ninguna pantalla usa Supabase.
- **No:** validar las variables al arrancar `dev` o `build`. Obligaría a cualquiera que clone el repo a tener credenciales.
- **Sí:** tipos en `lib/supabase/database.types.ts`, generados con el MCP. Decisión del usuario; no añade la CLI al flujo.
- **No:** script `npm run db:types`. Requiere la CLI y `supabase login`.
- **No:** `proxy.ts` en este spec. Decisión del usuario; sin login no hay sesión que refrescar.
- **Sí:** `Cache-Control: no-store` en `/api/health`. Un health cacheado por un proxy o una CDN mentiría sobre el estado actual.
- **Sí:** crear un cliente por llamada, sin singleton de módulo. En el servidor, un cliente compartido mezclaría las cookies de distintas peticiones.
- **Sí:** en el navegador, dejar el singleton interno de `createBrowserClient` (sin `isSingleton`). Decisión del usuario durante el paso 5; nuestro módulo no cachea nada, pero `@supabase/ssr` reutiliza la instancia en el navegador, como recomienda Supabase.
- **No:** `isSingleton: false`. Con auth, varios clientes de navegador competirían al refrescar la sesión.

## Riesgos

| Riesgo                                                                                                                                                                            | Mitigación                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next 16 puede haber cambiado la API de `cookies()` o de los route handlers respecto a lo que documenta `@supabase/ssr`.                                                           | Leer `node_modules/next/dist/docs/` antes del paso 5. Hoy `cookies()` es asíncrona y los route handlers no se cachean por defecto.                                                |
| `NEXT_PUBLIC_*` se inlina en el build; con acceso dinámico (`process.env[name]`) llegaría `undefined` al navegador.                                                               | `env.ts` lee cada variable con acceso literal.                                                                                                                                    |
| Next solo carga `.env.local` al arrancar; un cambio de variables no se nota con el servidor en marcha.                                                                            | Reiniciar `npm run dev` tras editar `.env.local`, también para el criterio del 503.                                                                                               |
| La versión de la migración local y la remota divergen.                                                                                                                            | Renombrar el archivo con la versión que devuelve `list_migrations` (paso 3).                                                                                                      |
| Los tipos quedan desfasados tras futuras migraciones.                                                                                                                             | Regla del modelo de datos: regenerar después de cada migración.                                                                                                                   |
| `.gitignore` ignora `.env*` y `.env.example` no se versionaría.                                                                                                                   | Excepción `!.env.example` debajo de `.env*`; verificada con `git check-ignore`.                                                                                                   |
| `.mcp.json` sin versionar contiene el `project_ref`.                                                                                                                              | No es un secreto; decidir si se versiona queda fuera de este spec.                                                                                                                |
| El proyecto gratuito de Supabase se pausa por inactividad y el health responde 503.                                                                                               | Es el comportamiento esperado del 503; reactivar el proyecto desde el dashboard.                                                                                                  |
| `@supabase/supabase-js` ≥ 2.110 exige Node ≥ 22, y `@supabase/ssr` 0.12.7 exige `supabase-js ^2.114.0`. Con Node 20, npm instala `supabase-js` 2.109.0 y el árbol queda inválido. | Usar Node ≥ 22 para instalar y ejecutar el proyecto (decisión del usuario durante el paso 1). Fijar la versión de Node en el repo (`engines`, `.nvmrc`) queda fuera de este spec. |

## Lo que **no** entra en este spec

- Autenticación, sesión y `proxy.ts`.
- Tablas de dominio y migración de `lib/games.ts`.
- Datos reales en cualquier pantalla.
- Supabase CLI, Docker y script de tipos.
- Secret key en el servidor.
- Indicador de conexión en la UI.
- Variables en el hosting y despliegue.
- Tests automatizados.

Cada uno, si llega, va en su propio spec.
