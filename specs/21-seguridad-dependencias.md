# SPEC 21 — Seguridad: dependencias de Next.js

> **Estado:** Draft
> **Depende de:** SPEC 19, SPEC 20
> **Fecha:** 2026-10-27
> **Objetivo:** Dejar `npm audit --omit=dev` sin avisos `high` ni `critical` subiendo `next` a `16.4.3` y cerrar el endpoint `/_next/image`, que la app no usa.

## Por qué existe este spec

La auditoría de seguridad del 2026-10-27 (ver "Resultado de la auditoría") encontró que la base de datos y la app cumplen el SPEC 19 y el SPEC 20.
Lo único que falla por encima de MEDIO son las dependencias de producción:

- `next@16.3.6` está en el rango de diez avisos de GitHub, dos de ellos `critical` (ejecución remota de código sin autenticar):
  - `GHSA-2464-fhr4-w9xw` (critical, `>=16.0.0 <=16.4.0`): RCE en la API de optimización de imágenes con SVG.
  - `GHSA-673q-mjm6-r5xr` (critical, `>=16.0.0 <=16.4.0`): RCE en funciones `use cache` que devuelven typed arrays.
  - `GHSA-cjq9-62q9-8jv4` (high, `<16.3.8`): SSRF en la optimización de imágenes.
  - `GHSA-p3m5-59mp-jv5r` (high, `<=16.4.0`): denegación de servicio en el App Router con Server Actions.
  - Seis `moderate` o `low` más (caché de SSG/ISR, Draft Mode, metadata de imágenes, MCP del servidor de desarrollo).
- `sharp@0.35.4` (dependencia de `next`): `GHSA-wq5f-xc86-pv6w` (high, `<0.35.5`), por `librsvg`.
- `source-map-js@1.2.1` (vía `postcss` de `next` y `@tailwindcss/postcss`): `GHSA-68fv-2mgg-jv7q` (high, `<1.2.2`).

La app no usa `next/image`, `use cache` ni Server Actions.
Aun así, el endpoint `/_next/image` responde en `next start`: `GET /_next/image?url=%2Fgames%2Fsnake%2Ffruits.png&w=64&q=75` devolvió `200` con `Content-Type: image/png`.
Ese endpoint es la superficie de dos de los avisos (`GHSA-2464-fhr4-w9xw` y `GHSA-cjq9-62q9-8jv4`) y de varios anteriores.

No hay despliegue de producción todavía (SPEC 20, Riesgos), así que el impacto real hoy se limita a quien ejecute `next start` en una red.
Por eso la severidad es ALTO y no CRÍTICO: ninguna sonda demostró el fallo.

## Alcance

**Dentro:**

- Subir `next` y `eslint-config-next` de `16.3.6` a `16.4.3` (la versión que propone `npm audit`), con versión exacta como hoy.
- `npm audit fix` (sin `--force`) para las dependencias transitivas que sigan avisando (`source-map-js`).
- `images: { unoptimized: true }` en `next.config.ts`, para que `/_next/image` responda `404`.
- Actualizar la versión de Next.js en `CLAUDE.md` ("Critical: this is Next.js 16.3.6").

**Fuera de alcance (para specs futuros):**

- Content-Security-Policy y `proxy.ts` (fuera de alcance del SPEC 20; siguen pendientes).
- Subir Node.js de 20 a 22 (aviso de `@supabase/supabase-js` en el build; no es de seguridad, ver Decisiones).
- Validar el parámetro `type` en `app/auth/confirm/route.ts` (INFO, ver Decisiones).
- Actualizar otras dependencias sin aviso (`@supabase/ssr`, `@supabase/supabase-js`, `react`).
- Revisión periódica automática de dependencias (Dependabot o similar).
- Los grants sobrantes de `anon` y `authenticated` en la base de datos: van en el SPEC 22.

## Modelo de datos

No hay tablas, migraciones ni cambios de tipos.
`lib/supabase/database.types.ts` no cambia.

Docs de Next.js 16 leídos para este spec:

- `node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md` (sección `unoptimized`: `images: { unoptimized: true }` en `next.config.js` aplica a todas las imágenes).
- `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/images.md`.
- `node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md` (se vuelve a leer tras instalar `16.4.3`; ver paso 2).

Comprobado en `node_modules/next/dist/server/next-server.js` (16.3.6): con `imagesConfig.unoptimized` el servidor responde `render404` a `/_next/image` antes de optimizar nada.

### `package.json`

```json
"next": "16.4.3",
"eslint-config-next": "16.4.3"
```

- `next@16.4.3` declara `sharp` como `^0.35.5` (`npm view next@16.4.3 optionalDependencies.sharp`), lo que cierra `GHSA-wq5f-xc86-pv6w`.

### `next.config.ts`

```ts
const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.63"],
  poweredByHeader: false,
  // La app no usa next/image: /_next/image responde 404 (SPEC 21).
  images: { unoptimized: true },
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};
```

- `securityHeaders`, `poweredByHeader` y `headers()` del SPEC 20 no cambian.
- `/games/snake/fruits.png` se sigue sirviendo como archivo estático: `lib/snake/sprites.ts` lo carga con `FRUITS_SRC` en un canvas, no con `next/image`.

## Plan de implementación

1. **Subir Next.js.** `npm install --save-exact next@16.4.3` y `npm install --save-dev --save-exact eslint-config-next@16.4.3`. Verificación: `npm ls next sharp` muestra `next@16.4.3` y `sharp@0.35.5` o superior.
2. **Notas de actualización.** Leer `node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md` de la versión instalada y aplicar los cambios que afecten a la app. Verificación: `npm run lint` y `npm run build` pasan.
3. **Transitivas.** `npm audit fix` (sin `--force`). Verificación: `npm ls source-map-js` muestra `1.2.2` o superior en todas las ramas y `npm audit --omit=dev` termina con `found 0 vulnerabilities` o solo `moderate`/`low`.
4. **Cerrar `/_next/image`.** Añadir `images: { unoptimized: true }` a `next.config.ts`. Verificación: con `npm run build` y `npm run start`, `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/_next/image?url=%2Fgames%2Fsnake%2Ffruits.png&w=64&q=75"` devuelve `404` y `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/games/snake/fruits.png` devuelve `200`.
5. **Documentación.** En `CLAUDE.md`, el título "Critical: this is Next.js 16.3.6, not the Next.js you know" pasa a `16.4.3`. Verificación: `grep -n "16.3.6" CLAUDE.md` no devuelve nada.
6. **Regresión.** Repetir las sondas REST 11–15 y las comprobaciones 16–19 de `security-auditor` (o relanzarlo). Verificación: mismos resultados que en "Resultado de la auditoría".

## Criterios de aceptación

- [ ] `npm ls next` muestra `next@16.4.3` y `package.json` tiene `"next": "16.4.3"` y `"eslint-config-next": "16.4.3"`.
- [ ] `npm audit --omit=dev --json` tiene `metadata.vulnerabilities.high = 0` y `metadata.vulnerabilities.critical = 0`.
- [ ] `npm ls sharp` muestra `0.35.5` o superior y `npm ls source-map-js` muestra `1.2.2` o superior.
- [ ] `npm run lint` y `npm run build` pasan sin errores.
- [ ] Con `npm run start`, `GET /_next/image?url=%2Fgames%2Fsnake%2Ffruits.png&w=64&q=75` responde `404`.
- [ ] Con `npm run start`, `GET /games/snake/fruits.png` responde `200` y las frutas se ven en Snake.
- [ ] `curl -sI` contra `/`, `/api/health`, `/auth/callback` y `/favicon.ico` sigue devolviendo las cinco cabeceras del SPEC 20 con sus valores exactos y sin `X-Powered-By`.
- [ ] `curl -sI "http://localhost:3000/auth/callback?next=https://evil.example"` sigue redirigiendo a `/?acceso=oauth-error#/acceso`.
- [ ] `curl -sI "http://localhost:3000/auth/confirm?token_hash=x&type=email"` sigue redirigiendo a `/?acceso=error#/acceso`.
- [ ] `curl -si http://localhost:3000/api/health` responde `200`, `cache-control: no-store` y un cuerpo `{"ok":true,"dbTime":…,"latencyMs":…}`.
- [ ] `get_advisors` (security) solo devuelve `auth_leaked_password_protection`.
- [ ] Los criterios del SPEC 20 siguen pasando.
- [ ] Guardar una puntuación desde el player, con y sin sesión, la muestra en el Salón de la Fama.
- [ ] Entrar con correo, con Google y con GitHub sigue funcionando como en el SPEC 19.
- [ ] `grep -n "16.3.6" CLAUDE.md` no devuelve nada.

## Decisiones

- **Sí:** `next@16.4.3`. Es la versión que propone `npm audit` y los dos `critical` alcanzan hasta `16.4.0`. Decisión del agente (security-auditor); revisar.
- **No:** quedarse en una `16.3.x`. Ninguna `16.3.x` cierra los dos `critical` (rango `>=16.0.0 <=16.4.0`).
- **No:** `npm audit fix --force`. Puede saltar de versión mayor sin control; la subida de `next` se hace a mano y fijada.
- **Sí:** versión exacta (`--save-exact`) para `next` y `eslint-config-next`, como ya están hoy. Evita que un `npm install` cambie de versión sin spec. Decisión del agente (security-auditor); revisar.
- **Sí:** `images: { unoptimized: true }`. La app no usa `next/image` (0 resultados de `grep -rn "next/image" app components lib`) y el endpoint `/_next/image` es la superficie de varios avisos de Next.js. Cerrarlo reduce el riesgo de los próximos avisos del optimizador. Decisión del agente (security-auditor); revisar.
- **No:** `images.localPatterns` restringido a `/games/**`. Mantendría `/_next/image` vivo sin que nada lo use.
- **Pregunta al usuario:** ¿subir Node.js de 20 a 22? El build muestra "Node.js 20 and below are deprecated" de `@supabase/supabase-js`. No es un fallo de seguridad hoy, pero Node 20 sale de soporte; iría en su propio spec.
- **Pregunta al usuario:** ¿limitar `type` a `email` en `app/auth/confirm/route.ts`? Hoy reenvía cualquier `type` a `/auth/v1/verify` (la sonda con `type=__probe__` acabó en `validation_failed` de Supabase y en `/?acceso=error#/acceso`). Sin un `token_hash` válido no hay impacto; sería solo endurecimiento del SPEC 19.
- **No:** CSP ni `proxy.ts` en este spec. Siguen fuera de alcance por el SPEC 20.

## Riesgos

| Riesgo                                                                      | Mitigación                                                                                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `16.4` trae cambios que rompen algo de la app (config, rutas, tipos)        | El paso 2 relee la guía de actualización de la versión instalada; `npm run build` y los criterios del SPEC 19 y 20 lo comprueban.    |
| `eslint-config-next@16.4.3` añade reglas nuevas y `npm run lint` falla      | Se corrigen en el mismo paso 2; no se desactivan reglas.                                                                             |
| Un componente futuro usa `next/image` y espera optimización                 | Con `unoptimized: true` la imagen se sirve tal cual; quien añada `next/image` decide en su spec si quitar la opción.                 |
| `npm audit fix` cambia más paquetes de los esperados en `package-lock.json` | Revisar el diff de `package-lock.json`: solo deben cambiar `next`, `@next/*`, `sharp`, `@img/*`, `source-map-js` y sus dependencias. |
| Salen avisos nuevos de `next` después de este spec                          | `security-auditor` repite `npm audit --omit=dev` en cada auditoría (comprobación 22).                                                |

## Lo que **no** entra en este spec

- Content-Security-Policy y `proxy.ts`.
- Subir Node.js.
- Validar `type` en `/auth/confirm`.
- Actualizar dependencias sin aviso.
- Dependabot o auditoría automática.
- Grants de la base de datos (SPEC 22).

Cada uno, si llega, va en su propio spec.

## Resultado de la auditoría

Auditoría de `security-auditor` del 2026-10-27, rama `main` (commit `a41ec5f`), `next start` en el puerto `3005`.
Proyecto de Supabase `cyzrsivzkdixaappwdcp`, sondas con la clave publicable (`sb_publishable_…`).

| #   | Comprobación                 | Estado | Severidad | Evidencia                                                                                                                                                                                                                                                 |
| --- | ---------------------------- | ------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Advisors                     | ✅     | —         | `security`: solo `auth_leaked_password_protection`. `performance`: `[]`.                                                                                                                                                                                  |
| 2   | RLS                          | ✅     | —         | `public.games` y `public.scores` con `relrowsecurity = true` y 1 política cada una; no hay más tablas en `public` ni `private`.                                                                                                                           |
| 3   | Políticas                    | ✅     | —         | `games_select_public` y `scores_select_public`: `SELECT`, `{anon,authenticated}`, `qual = true`; ninguna de escritura.                                                                                                                                    |
| 4   | Grants de tabla              | ❌     | MEDIO     | `anon` y `authenticated` tienen `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` en `games` y `scores` (`relacl` `anon=rDxtm`), `rwU` en `public.scores_id_seq` y los privilegios por defecto de `public` abren tablas y funciones nuevas. SPEC 22.       |
| 5   | Funciones                    | ✅     | —         | `private.submit_score`: definer, `search_path=""`, `EXECUTE` para `anon`/`authenticated`, no `PUBLIC`. `public.submit_score` y `public.health`: invoker. `public.rls_auto_enable`: definer, `search_path=pg_catalog`, sin `EXECUTE` para nadie de la API. |
| 6   | Esquemas y trigger           | ✅     | —         | `has_schema_privilege('public','private','usage') = false`; `ensure_rls` con `evtenabled = 'O'`.                                                                                                                                                          |
| 7   | Migraciones                  | ✅     | —         | 8 en `list_migrations` y 8 en `supabase/migrations/`, mismas versiones y nombres; ningún `pending_*`.                                                                                                                                                     |
| 8   | Extensiones                  | ✅     | —         | `uuid-ossp`, `pgcrypto`, `pg_stat_statements` en `extensions`; `supabase_vault` en `vault`; ninguna en `public`.                                                                                                                                          |
| 9   | Logs                         | ⚠️     | INFO      | Últimas 24 h: solo las sondas de esta auditoría y la implementación del SPEC 20; sin ráfagas de `22023`, `42501` ni de `/rpc/submit_score`.                                                                                                               |
| 10  | Auth (panel)                 | ⚠️     | INFO      | Sin herramienta MCP y sin confirmación previa: el usuario debe confirmarlo (ver respuesta del agente).                                                                                                                                                    |
| 11  | Lectura pública              | ✅     | —         | `GET /rest/v1/games?select=id&limit=1` y `scores` → `200`.                                                                                                                                                                                                |
| 12  | Escritura directa            | ✅     | —         | `POST scores`, `POST games`, `PATCH`/`DELETE` en `games?id=eq.__probe__` y `scores?id=eq.-1` → `401` `42501`.                                                                                                                                             |
| 13  | Funciones cerradas           | ✅     | —         | `rpc/rls_auto_enable` → `401` `42501`; `rpc/submit_score` con `Content-Profile: private` → `406` `PGRST106` (expuestos: `public`, `graphql_public`).                                                                                                      |
| 14  | Validación de `submit_score` | ✅     | —         | `p_name = "ka-i"`, `p_game_id = "__probe__"`, `p_score = -1` y `p_score = 10000000` → `400` `22023`; ningún id devuelto.                                                                                                                                  |
| 15  | Superficie expuesta          | ✅     | —         | `GET /rest/v1/` con la clave publicable → `401` "Secret API key required". Por catálogo: tablas `games`, `scores`; RPC con `EXECUTE` para `anon`: `health`, `submit_score`. `graphql/v1`: `pg_graphql` no activo. Storage: 0 buckets.                     |
| 16  | Cabeceras                    | ✅     | —         | Las cinco del SPEC 20 en `/`, `/api/health`, `/auth/callback` y `/favicon.ico`; sin `X-Powered-By`. Sin CSP: INFO aceptado.                                                                                                                               |
| 17  | Secretos                     | ✅     | —         | Solo `.env.example` versionado y vacío; `service_role` solo en texto de `specs/04`; historial sin `sb_secret_` ni JWT; `.env*` en `.gitignore`; el bundle solo contiene `startsWith("sb_secret_")` de `supabase-js`.                                      |
| 18  | Variables                    | ✅     | —         | `process.env` solo en `lib/supabase/env.ts`, con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.                                                                                                                                     |
| 19  | Rutas de auth                | ✅     | —         | `?code=x`, `?next=https://evil.example` y `?error=…&next=//evil.example` → `/?acceso=oauth-error#/acceso`; `/auth/confirm?token_hash=x&type=email` → `/?acceso=error#/acceso`. Ningún parámetro decide el destino.                                        |
| 20  | Entrada de usuario           | ✅     | —         | 0 usos de `dangerouslySetInnerHTML`, `innerHTML`, `eval` o `new Function`; `submitScore` solo tras `isValidName` (`GamePlayer.tsx`); `username` pintado como texto JSX (`Nav.tsx`, `Auth.tsx`).                                                           |
| 21  | `/api/health`                | ✅     | —         | `200`, `cache-control: no-store`, cuerpo `{"ok":true,"dbTime":…,"latencyMs":…}`; `POST` → `405`.                                                                                                                                                          |
| 22  | Dependencias                 | ❌     | ALTO      | `npm audit --omit=dev`: 1 paquete `critical` (`next@16.3.6`, 2 avisos critical y 2 high) y 2 `high` (`sharp@0.35.4`, `source-map-js@1.2.1`). `/_next/image` sirve `fruits.png` con `200`. Este spec.                                                      |
| 23  | Build                        | ✅     | —         | `npm run lint` y `npm run build` pasan; aviso de Node 20 deprecado de `@supabase/supabase-js` (INFO).                                                                                                                                                     |
