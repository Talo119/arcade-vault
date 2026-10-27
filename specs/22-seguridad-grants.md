# SPEC 22 — Seguridad: grants de `anon` y `authenticated`

> **Estado:** Draft
> **Depende de:** SPEC 04, SPEC 06, SPEC 19, SPEC 20
> **Fecha:** 2026-10-27
> **Objetivo:** Que `anon` y `authenticated` solo tengan en la base de datos los privilegios que la API usa (`SELECT` en `games` y `scores`, `EXECUTE` en `health` y `submit_score`), y que las tablas, secuencias y funciones nuevas no nazcan abiertas.

## Por qué existe este spec

La auditoría de seguridad del 2026-10-27 (ver "Resultado de la auditoría" en el SPEC 21) encontró que RLS, políticas, funciones y esquemas cumplen el SPEC 20.
Pero los grants de tabla que Supabase da por defecto siguen en pie, y RLS no los cubre:

- `anon` y `authenticated` tienen `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` en `public.games` y `public.scores` (`relacl` = `anon=rDxtm/postgres`).
  Las migraciones de los SPEC 04 y 06 solo revocaron `insert, update, delete`.
  `TRUNCATE` vacía la tabla sin pasar por RLS; `MAINTAIN` permite `LOCK TABLE`.
- `anon` y `authenticated` tienen `USAGE`, `SELECT` y `UPDATE` en `public.scores_id_seq` (`rwU`), que permite `setval`.
  Solo la usa `private.submit_score`, que es `security definer` con dueño `postgres`.
- Los privilegios por defecto de `postgres` en `public` dan `arwdDxtm` en tablas, `rwU` en secuencias y `EXECUTE` en funciones a `anon` y `authenticated`.
  Una tabla nueva nace con RLS gracias a `ensure_rls`, pero con `TRUNCATE` abierto; una función nueva `security definer` nace ejecutable desde `/rest/v1/rpc/*`.
- Postgres da `EXECUTE` a `PUBLIC` en toda función nueva (valor global por defecto).
  Es el riesgo que el SPEC 20 dejó anotado: "Alguien crea más funciones en `private` y las hereda `PUBLIC` por defecto".

Hoy nada de esto es explotable por la API: PostgREST no expone `TRUNCATE`, `LOCK`, `setval` ni DDL, y `pg_graphql` no está activo (`/graphql/v1` → "pg_graphql extension is not enabled").
Es defensa en profundidad, por eso la severidad es MEDIO.

## Alcance

**Dentro:**

- Migración `revoke_api_role_extra_grants`:
  - Revocar `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` de `public.games` y `public.scores` a `anon` y `authenticated`.
  - Revocar todo en `public.scores_id_seq` a `anon` y `authenticated`.
  - Privilegios por defecto de `postgres` en `public`: tablas, secuencias y funciones nuevas sin nada para `anon` ni `authenticated`.
  - Privilegio global por defecto de `postgres`: funciones nuevas sin `EXECUTE` para `PUBLIC`.
- Una línea en `CLAUDE.md` (sección Supabase) que diga que cada migración da sus grants de forma explícita.

**Fuera de alcance (para specs futuros):**

- `FORCE ROW LEVEL SECURITY` y políticas nuevas en `games` o `scores` (fuera de alcance por el SPEC 20).
- Límites y anti-trampas en `submit_score` (fuera de alcance por el SPEC 20).
- Los privilegios por defecto del rol `supabase_admin`: `postgres` no puede cambiarlos.
- Revocar `USAGE` en `private` a `anon` y `authenticated`: lo necesita `public.submit_score` (`security invoker`), como fija el SPEC 20.
- Cambiar `service_role`: la app no lo usa (`lib/supabase/env.ts` solo lee la clave publicable).
- Mover la API a un esquema `api` propio.
- Las dependencias de Next.js (SPEC 21).

## Modelo de datos

No hay tablas, columnas ni funciones nuevas.
`lib/supabase/database.types.ts` no cambia: los tipos no dependen de los grants.

Guía de Supabase consultada: "Securing your API", sección "Default privileges for new tables and functions" (https://supabase.com/docs/guides/api/securing-your-api).
Su receta revoca los privilegios por defecto de `postgres` en `public` a `anon`, `authenticated` y `service_role`, y `EXECUTE` a `public`.
Este spec la sigue para `anon` y `authenticated`, y hace global la revocación a `PUBLIC` (ver Decisiones).

### Migración `supabase/migrations/<version>_revoke_api_role_extra_grants.sql`

```sql
-- Privilegios de tabla que la API no usa y que RLS no cubre.
revoke truncate, references, trigger, maintain
  on table public.games, public.scores
  from anon, authenticated;

-- La secuencia solo la usa private.submit_score (security definer, dueño postgres).
revoke all on sequence public.scores_id_seq from anon, authenticated;

-- Objetos nuevos en public: sin privilegios para los roles de la API.
-- Cada migración da los suyos (grant select / grant execute), como hoy.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;

-- EXECUTE a PUBLIC es un valor global de Postgres: un revoke "in schema"
-- no lo quita. Global: cubre public y private.
alter default privileges for role postgres
  revoke execute on functions from public;
```

- `SELECT` en `games` y `scores` y `EXECUTE` en `public.health`, `public.submit_score` y `private.submit_score` se dieron con `grant` explícito en sus migraciones: no cambian.
- Las migraciones `replace_*` de `/nuevo-juego` solo insertan filas en `games` como `postgres`: no les afecta.
- `MAINTAIN` existe desde Postgres 17; el proyecto está en `17.11`.

### `CLAUDE.md`

En la sección "Supabase", tras la línea de `public.scores`:

```markdown
- New tables, sequences and functions get **no grants** for `anon`/`authenticated` (SPEC 22): each migration grants what the API needs (`grant select …`, `grant execute …`). New functions also get no `EXECUTE` for `PUBLIC`.
```

## Plan de implementación

1. **Migración.** Escribir `supabase/migrations/pending_revoke_api_role_extra_grants.sql`, aplicarla con `apply_migration` (nombre `revoke_api_role_extra_grants`), renombrarla con la versión de `list_migrations`, regenerar tipos con `generate_typescript_types` y revisar `get_advisors` (security y performance). Verificación: `git diff lib/supabase/database.types.ts` vacío; el advisor de seguridad solo muestra `auth_leaked_password_protection`.
2. **Grants actuales.** Con `execute_sql`: `select c.relname, r.rolname, has_table_privilege(r.rolname, c.oid, 'SELECT') as sel, has_table_privilege(r.rolname, c.oid, 'TRUNCATE') as trunc, has_table_privilege(r.rolname, c.oid, 'TRIGGER') as trig, has_table_privilege(r.rolname, c.oid, 'REFERENCES') as refs, has_table_privilege(r.rolname, c.oid, 'MAINTAIN') as maint from pg_class c cross join pg_roles r where c.oid in ('public.games'::regclass, 'public.scores'::regclass) and r.rolname in ('anon', 'authenticated')`. Verificación: `sel = true` y el resto `false` en las cuatro filas.
3. **Secuencia.** `select has_sequence_privilege('anon', 'public.scores_id_seq', 'USAGE') or has_sequence_privilege('anon', 'public.scores_id_seq', 'UPDATE') or has_sequence_privilege('authenticated', 'public.scores_id_seq', 'USAGE') or has_sequence_privilege('authenticated', 'public.scores_id_seq', 'UPDATE') as any_priv`. Verificación: `false`.
4. **Privilegios por defecto.** `select n.nspname, d.defaclobjtype, d.defaclacl::text from pg_default_acl d left join pg_namespace n on n.oid = d.defaclnamespace where d.defaclrole = 'postgres'::regrole`. Verificación: ninguna fila de `public` contiene `anon=` ni `authenticated=`; la fila global (`nspname` nulo, `defaclobjtype = 'f'`) es `{postgres=X/postgres}`, sin entrada `=X/postgres` para `PUBLIC`.
5. **Objetos nuevos cerrados.** Con `execute_sql`, en una sola petición: `create table public._grant_probe (id int); create function private._grant_probe() returns int language sql as 'select 1';`, después leer `relrowsecurity` de `public._grant_probe`, `has_table_privilege('anon', 'public._grant_probe', 'SELECT')`, `has_table_privilege('anon', 'public._grant_probe', 'TRUNCATE')` y `has_function_privilege('anon', 'private._grant_probe()', 'execute')`, y por último `drop table public._grant_probe; drop function private._grant_probe();`. Verificación: `relrowsecurity = true` y los tres privilegios `false`; `to_regclass('public._grant_probe')` y `to_regprocedure('private._grant_probe()')` son nulos al terminar.
6. **Guardar puntuaciones.** Desde el player, guardar una puntuación sin sesión y otra con sesión. Verificación: las dos aparecen en el Salón de la Fama.
7. **Documentación.** Añadir la línea de `CLAUDE.md`. Verificación: `npm run lint` y `npm run build` pasan.
8. **Regresión.** Repetir las sondas REST 11–15 y las comprobaciones 16–19 de `security-auditor` (o relanzarlo). Verificación: mismos resultados que en el "Resultado de la auditoría" de abajo.

## Criterios de aceptación

- [ ] Hay una única migración nueva, `supabase/migrations/<version>_revoke_api_role_extra_grants.sql`, y su versión coincide con `list_migrations`.
- [ ] `lib/supabase/database.types.ts` no cambia tras regenerarlo.
- [ ] `get_advisors` (security) solo devuelve `auth_leaked_password_protection`, y `get_advisors` (performance) no devuelve avisos de RLS.
- [ ] La consulta del paso 2 devuelve `sel = true` y `trunc`, `trig`, `refs` y `maint` en `false` para `anon` y `authenticated` en `games` y `scores`.
- [ ] `select relacl::text from pg_class where oid = 'public.scores'::regclass` contiene `anon=r/postgres` y `authenticated=r/postgres`.
- [ ] La consulta del paso 3 devuelve `false`.
- [ ] La consulta del paso 4 no muestra `anon=` ni `authenticated=` en las filas de `public` y la fila global de funciones no da `X` a `PUBLIC`.
- [ ] La tabla y la función de prueba del paso 5 nacen sin privilegios para `anon`, la tabla con RLS activo, y no quedan en la base de datos.
- [ ] `select prosecdef, has_function_privilege('anon', oid, 'execute') from pg_proc where oid in ('public.submit_score(text, text, integer)'::regprocedure, 'private.submit_score(text, text, integer)'::regprocedure, 'public.health()'::regprocedure)` devuelve `EXECUTE = true` en las tres (`prosecdef` `false`, `true`, `false`).
- [ ] `GET /rest/v1/games?select=id&limit=1` y `GET /rest/v1/scores?select=id&limit=1` con la clave publicable responden `200`.
- [ ] `POST /rest/v1/scores` con la clave publicable responde `401` con `42501`.
- [ ] `POST /rest/v1/rpc/submit_score` con `p_name = "ka-i"` responde `400` con `22023`.
- [ ] `POST /rest/v1/rpc/health` con la clave publicable responde `200` con una fecha.
- [ ] `GET http://localhost:3000/api/health` (con `npm run start`) responde `200` y `{"ok":true,…}`.
- [ ] Guardar una puntuación desde el player, con y sin sesión, la muestra en el Salón de la Fama.
- [ ] Los criterios del SPEC 20 siguen pasando (RLS, `private.submit_score`, `rls_auto_enable`, `ensure_rls` con `evtenabled = 'O'`, `PGRST106` en `private`).
- [ ] `npm run lint` y `npm run build` pasan sin errores.

## Decisiones

- **Sí:** revocar `TRUNCATE`, `REFERENCES`, `TRIGGER` y `MAINTAIN` en `games` y `scores`. La API no los usa y RLS no protege de `TRUNCATE` ni de `LOCK TABLE`. Completa el "sin `insert/update/delete`" del SPEC 20 sin tocar políticas. Decisión del agente (security-auditor); revisar.
- **Sí:** revocar todo en `public.scores_id_seq` a `anon` y `authenticated`. Solo la usa `private.submit_score`, que corre como `postgres`. Decisión del agente (security-auditor); revisar.
- **Sí:** quitar los privilegios por defecto de `postgres` en `public` para `anon` y `authenticated`, como recomienda la guía "Securing your API" de Supabase. Una tabla o función nueva no queda expuesta por olvido; el repo ya da sus grants con `grant` explícito en cada migración. Decisión del agente (security-auditor); revisar.
- **Sí:** quitar `EXECUTE` a `PUBLIC` en el valor por defecto **global** de `postgres`, no "in schema public". Según la documentación de Postgres (`ALTER DEFAULT PRIVILEGES`), un `revoke` por esquema no puede quitar un privilegio que se da globalmente, y `EXECUTE` a `PUBLIC` es el valor global por defecto. Así también cubre `private`, el riesgo que anotó el SPEC 20. Decisión del agente (security-auditor); revisar.
- **No:** incluir `service_role` en los `revoke`, como hace la receta de Supabase. La app no lo usa y quitárselo no reduce la superficie de un atacante con la clave publicable.
- **No:** revocar `USAGE` en `private` a `anon` y `authenticated`. Rompería `public.submit_score` (`security invoker`) y el guardado de invitados del SPEC 20.
- **No:** `FORCE ROW LEVEL SECURITY`. Fuera de alcance por el SPEC 20, y no afecta a `TRUNCATE`.
- **No:** mover la API a un esquema `api`. Cambiaría el endpoint `/rest/v1/rpc/submit_score` y los tipos.
- **Pregunta al usuario:** ¿añadir límites o anti-trampas a `submit_score`? Los logs de las últimas 24 h no muestran ráfagas ni abuso, así que la auditoría no lo pide hoy; sigue fuera de alcance por el SPEC 20.

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Una tabla o RPC nueva de un spec futuro olvida su `grant` y la app recibe `42501`                             | La línea nueva de `CLAUDE.md` lo avisa; PostgREST devuelve en `hint` el `GRANT` exacto que falta. Es fallo cerrado, no abierto.                                                    |
| El revoke global de `EXECUTE` a `PUBLIC` afecta a funciones que `postgres` cree fuera de `public` y `private` | Hoy no hay otras (`pg_proc` de `public` y `private` lista 4). Las extensiones ya instaladas no cambian; una extensión nueva que se instale como `postgres` necesitaría sus grants. |
| El panel recrea `rls_auto_enable()` como `supabase_admin`, cuyos privilegios por defecto siguen abiertos      | `get_advisors` lo vuelve a mostrar (avisos 0028 y 0029) y basta con repetir el `revoke` del SPEC 20.                                                                               |
| Quitar `USAGE` en la secuencia rompe el `insert` de `private.submit_score`                                    | Corre como `postgres` (`security definer`); el paso 6 y su criterio lo comprueban con y sin sesión.                                                                                |
| `MAINTAIN` no existe en un entorno con Postgres 16 o anterior                                                 | El proyecto está en 17.11. En otro entorno, quitar `maintain` del primer `revoke`.                                                                                                 |
| La tabla o función de prueba del paso 5 se queda en la base de datos                                          | El paso 5 termina con `drop` y su criterio comprueba con `to_regclass` y `to_regprocedure` que no quedan.                                                                          |

## Lo que **no** entra en este spec

- `FORCE ROW LEVEL SECURITY` y políticas nuevas.
- Límites y anti-trampas en `submit_score`.
- Privilegios por defecto de `supabase_admin`.
- `USAGE` en `private`.
- `service_role`.
- Esquema `api` propio.
- Dependencias de Next.js (SPEC 21).

Cada uno, si llega, va en su propio spec.

## Resultado de la auditoría

Auditoría de `security-auditor` del 2026-10-27, rama `main` (commit `a41ec5f`), `next start` en el puerto `3005`.
La tabla completa de las 23 comprobaciones está en el SPEC 21; aquí, las de base de datos y sondas REST.

| #   | Comprobación                 | Estado | Severidad | Evidencia                                                                                                                                                                                                                                               |
| --- | ---------------------------- | ------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Advisors                     | ✅     | —         | `security`: solo `auth_leaked_password_protection`. `performance`: `[]`.                                                                                                                                                                                |
| 2   | RLS                          | ✅     | —         | `games` y `scores` con `relrowsecurity = true` y 1 política cada una.                                                                                                                                                                                   |
| 3   | Políticas                    | ✅     | —         | Solo `SELECT` para `{anon,authenticated}` con `qual = true`.                                                                                                                                                                                            |
| 4   | Grants de tabla              | ❌     | MEDIO     | `relacl` de `games` y `scores`: `anon=rDxtm/postgres`, `authenticated=rDxtm/postgres`. `scores_id_seq`: `anon=rwU`. `pg_default_acl` de `postgres` en `public`: `arwdDxtm` (tablas), `rwU` (secuencias), `X` (funciones) para `anon` y `authenticated`. |
| 5   | Funciones                    | ✅     | —         | `private.submit_score` definer con `search_path=""`; `public.submit_score` y `public.health` invoker; `rls_auto_enable` sin `EXECUTE` para `PUBLIC`, `anon` ni `authenticated`.                                                                         |
| 6   | Esquemas y trigger           | ✅     | —         | `private` sin `USAGE` para `PUBLIC`; `ensure_rls` con `evtenabled = 'O'`.                                                                                                                                                                               |
| 7   | Migraciones                  | ✅     | —         | 8 = 8, mismos nombres; ningún `pending_*`.                                                                                                                                                                                                              |
| 8   | Extensiones                  | ✅     | —         | Ninguna en `public`.                                                                                                                                                                                                                                    |
| 9   | Logs                         | ⚠️     | INFO      | Solo las sondas de la auditoría y la implementación del SPEC 20.                                                                                                                                                                                        |
| 10  | Auth (panel)                 | ⚠️     | INFO      | Pendiente de confirmar por el usuario.                                                                                                                                                                                                                  |
| 11  | Lectura pública              | ✅     | —         | `games` y `scores` → `200`.                                                                                                                                                                                                                             |
| 12  | Escritura directa            | ✅     | —         | `POST`, `PATCH`, `DELETE` → `401` `42501`.                                                                                                                                                                                                              |
| 13  | Funciones cerradas           | ✅     | —         | `rls_auto_enable` → `42501`; `Content-Profile: private` → `PGRST106`.                                                                                                                                                                                   |
| 14  | Validación de `submit_score` | ✅     | —         | Nombre, juego y puntuación inválidos → `22023`.                                                                                                                                                                                                         |
| 15  | Superficie expuesta          | ✅     | —         | OpenAPI exige clave secreta (`401`); por catálogo: `games`, `scores`, `rpc/health`, `rpc/submit_score`.                                                                                                                                                 |
