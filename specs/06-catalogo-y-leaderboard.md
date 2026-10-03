# SPEC 06 — Catálogo en Supabase y leaderboard real

> **Estado:** Approved
> **Depende de:** SPEC 01, SPEC 04, SPEC 05
> **Fecha:** 2026-10-03
> **Objetivo:** Mover el catálogo de juegos a una tabla `games` de Supabase y crear un leaderboard real (`scores`) que se guarda desde el modal de fin de partida y se muestra en el Salón de la Fama.

## Por qué existe este spec

El SPEC 04 dejó Supabase conectado pero sin tablas de dominio.
Hoy el catálogo vive en el array `GAMES` de `lib/games.ts`, y GUARDAR PUNTUACIÓN no guarda nada.
El Salón de la Fama (`#/salon`) muestra filas inventadas con `seededScores`.
Este spec convierte el catálogo en una tabla y crea la primera tabla de puntuaciones, sin esperar a auth.
Va en un solo spec, en dos fases: primero el catálogo y después el leaderboard, porque `scores.game_id` depende de `games.id`.

## Alcance

**Dentro:**

- Migración `create_games_table`: tabla `games`, RLS de lectura pública e insert de los 8 juegos actuales.
- Migración `create_scores_table`: tabla `scores`, índice de ranking, RLS de lectura pública y función `submit_score`.
- Tipos regenerados en `lib/supabase/database.types.ts` después de cada migración.
- Lectura del catálogo en el servidor (`lib/catalog.ts`) desde `app/page.tsx`, que pasa a ser un Server Component async.
- Contexto React `GamesProvider` / `useGames()` en `lib/games-context.tsx`.
- Router que valida los ids contra el catálogo recibido: `parseHash(hash, gameIds)`.
- Home, Biblioteca, detalle, player y Salón leen el catálogo de `useGames()`.
- Eliminación del array `GAMES` de `lib/games.ts`.
- Pantalla de error "SEÑAL PERDIDA" cuando el catálogo no carga. Acerca y Acceso siguen funcionando.
- Módulo de puntuaciones `lib/scores.ts` con el cliente de navegador.
- GUARDAR PUNTUACIÓN real en el modal de fin de partida, para todos los juegos, con estados GUARDANDO…, guardado y error con reintento.
- Salón de la Fama con el top 12 real de cada juego y estados de carga, error y vacío.
- Pulido visual de los estados nuevos con `/frontend-design`.

**Fuera de alcance (para specs futuros):**

- Autenticación y puntuaciones ligadas a `auth.uid()`.
- Antitrampas: validación de la puntuación en el servidor, firma de partidas o límite de envíos.
- `best` y `plays` calculados desde `scores`. Siguen siendo columnas estáticas.
- Leaderboard real en el detalle del juego (`#/juego/:id`). Sigue con `seededScores`.
- Datos reales en el Home: ticker de ÚLTIMAS PUNTUACIONES y TOP JUGADORES siguen estáticos.
- Récord real en las tarjetas de la Biblioteca.
- Panel de administración o edición del catálogo desde la UI.
- Respaldo estático del catálogo si Supabase falla.
- Caché del catálogo (`'use cache'`, Cache Components o revalidación).
- Tiempo real (Supabase Realtime) en el Salón.
- Paginación del ranking más allá de 12 filas.
- Playwright y sección "Resultado de la verificación".
- Tests automatizados.

## Modelo de datos

### Migración 1 (`supabase/migrations/<version>_create_games_table.sql`)

```sql
create table public.games (
  id         text primary key,
  title      text not null,
  short      text not null,
  long       text not null,
  cat        text not null check (cat in ('ARCADE', 'PUZZLE', 'SHOOTER', 'VERSUS')),
  cover      text not null,
  color      text not null check (color in ('cyan', 'magenta', 'yellow', 'green')),
  best       integer not null,
  plays      text not null,
  sort_order integer not null unique
);

alter table public.games enable row level security;
create policy games_select_public on public.games
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.games from anon, authenticated;

-- insert into public.games (...) values (...): los 8 juegos de lib/games.ts
```

Reglas:

- El insert copia literalmente los 8 objetos actuales de `GAMES`: mismos ids, textos, `cover`, `color`, `best` y `plays`.
- `sort_order` va de 1 a 8 en el orden actual del array: `bloque-buster` = 1 … `duelo-pixel` = 8.
- Ningún rol de la API puede escribir en `games`. El catálogo solo cambia con migraciones.

### Migración 2 (`supabase/migrations/<version>_create_scores_table.sql`)

```sql
create table public.scores (
  id         bigint generated always as identity primary key,
  game_id    text not null references public.games (id),
  name       text not null check (name ~ '^[A-Z0-9_ ]{1,10}$' and name = btrim(name)),
  score      integer not null check (score between 0 and 9999999),
  created_at timestamptz not null default now()
);

create index scores_game_rank_idx on public.scores (game_id, score desc, created_at asc);

alter table public.scores enable row level security;
create policy scores_select_public on public.scores
  for select to anon, authenticated using (true);
revoke insert, update, delete on public.scores from anon, authenticated;

create function public.submit_score(p_game_id text, p_name text, p_score integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$ /* valida e inserta; devuelve scores.id */ $$;

revoke execute on function public.submit_score(text, text, integer) from public;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
```

Reglas de `submit_score`:

- Lanza una excepción si `p_game_id` no existe en `public.games`.
- Lanza una excepción si `p_name` no cumple `^[A-Z0-9_ ]{1,10}$` o tiene espacios a los lados. No recorta: el cliente envía el nombre ya recortado.
- Lanza una excepción si `p_score` es `null` o está fuera de 0..9 999 999.
- Si todo es válido, inserta la fila y devuelve su `id`.
- Las tablas se referencian con esquema (`public.scores`), porque el `search_path` está vacío.

### Flujo de migraciones

Igual que en el SPEC 04: primero `supabase/migrations/pending_<nombre>.sql`, después `apply_migration` con el mismo SQL y nombre, y por último el renombrado a `<version>_<nombre>.sql` con la versión de `list_migrations`.
Tras cada migración se regenera `lib/supabase/database.types.ts` con `generate_typescript_types`.
Al terminar, `supabase/migrations/` tiene 3 archivos y ninguno con prefijo `pending_`.

### Catálogo en la app

`lib/games.ts` conserva los tipos `Game`, `GameCategory`, `GameColor` y `ScoreRow`, la constante `CATS`, `PLAYERS` y `seededScores`.
El array `GAMES` desaparece.
El comentario de cabecera deja de decir que todo es mock: el catálogo viene de Supabase y `seededScores` sigue siendo simulado.

```ts
// lib/catalog.ts — solo servidor
export async function fetchGames(): Promise<Game[]>;
// select de public.games ordenado por sort_order, mapeado a Game (sin sort_order).
// Lanza Error si faltan variables, si falla la consulta o si devuelve 0 filas.
```

```ts
// lib/games-context.tsx — "use client"
export function GamesProvider(props: {
  games: Game[];
  children: ReactNode;
}): ReactNode;
export function useGames(): Game[]; // lanza Error si se usa fuera del provider
```

```ts
// lib/router.ts
export function parseHash(hash: string, gameIds: readonly string[]): Route;
// Igual que hoy, pero valida "#/juego/:id" y "#/jugar/:id" contra gameIds.
```

```ts
// app/page.tsx
export default async function Home() {
  // try { games = await fetchGames() } catch (e) { console.error(e); games = null }
  return <App games={games} />;
}
```

Reglas:

- `cat` y `color` llegan como `string` en los tipos generados. `fetchGames` los convierte a `GameCategory` y `GameColor` con un cast; los CHECK de la tabla garantizan los valores.
- `App` recibe `games: Game[] | null`. Con una lista, envuelve las pantallas en `<GamesProvider>` y llama a `parseHash(hash, games.map((g) => g.id))`.
- Con `null`, llama a `parseHash(hash, [])`. Las rutas `home`, `biblioteca` y `salon` muestran `<SignalLost />`, y los ids de juego caen al Home, que también lo muestra. `auth` y `about` se ven normal.
- `/` se renderiza en cada petición: `fetchGames` usa el cliente de servidor, que lee `cookies()`. No se añade caché.
- `HOME_STATS` deja de leer `GAMES.length`. Pasa a ser `homeStats(gameCount: number): HomeStat[]` en `lib/home.ts`, y el Home lo llama con `useGames().length`.
- El Home sigue descartando las filas de `RECENT_SCORES` cuyo `gameId` no está en el catálogo, ahora contra `useGames()`.
- Ninguna pantalla importa `@/lib/supabase/server`. Solo `lib/catalog.ts` lo hace.

### Pantalla de error (`components/screens/SignalLost.tsx`)

| Elemento | Texto                                     |
| -------- | ----------------------------------------- |
| Título   | "SEÑAL PERDIDA"                           |
| Texto    | "NO SE PUDO CARGAR EL CATÁLOGO DE JUEGOS" |
| Botón    | "REINTENTAR" → `window.location.reload()` |

La Nav y el Footer se siguen viendo alrededor.

### Puntuaciones en la app (`lib/scores.ts`)

```ts
export interface LeaderboardRow {
  rank: number; // 1..12, posición en la lista
  name: string;
  score: number;
  date: string; // "DD/MM/AAAA", created_at en hora local
}

export const NAME_PATTERN = /^[A-Z0-9_ ]{1,10}$/;
export function isValidName(name: string): boolean; // NAME_PATTERN y name === name.trim()

export async function fetchTopScores(gameId: string): Promise<LeaderboardRow[]>;
// select name, score, created_at where game_id = gameId
// order by score desc, created_at asc limit 12. Lanza Error si falla.

export async function submitScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void>;
// rpc("submit_score", { p_game_id, p_name, p_score }). Lanza Error si falla.
```

Reglas:

- Usa `createClient` de `@/lib/supabase/client`.
- El detalle del error va a `console.error`. La UI solo muestra mensajes fijos.

### Modal de fin de partida (`components/screens/GamePlayer.tsx`)

```ts
type SaveStatus = "idle" | "saving" | "saved" | "error";

interface RunState {
  // ...igual que en el SPEC 05, salvo:
  save: SaveStatus; // sustituye a `saved: boolean`
}

type RunAction =
  // ...igual que en el SPEC 05, salvo:
  | { type: "saveStart" } // sustituye a "save"
  | { type: "saveOk"; run: number }
  | { type: "saveFail"; run: number };
```

Reglas:

- Aplica a todos los juegos, reales y simulados.
- El valor enviado es `name.trim()`. El input sigue pasando a mayúsculas y cortando a 10 caracteres.
- GUARDAR PUNTUACIÓN está `disabled` si `isValidName(name.trim())` es falso o si `save === "saving"`.
- Si el nombre recortado no es vacío y no es válido, se ve la pista "SOLO A–Z, 0–9, _ Y ESPACIOS" bajo el input.
- `saveStart` pone `save: "saving"`, y el botón dice "GUARDANDO…".
- `saveOk` y `saveFail` se ignoran si su `run` no coincide con el `run` actual. Así una respuesta tardía no afecta a la partida siguiente.
- `saved`: se ve "▸ PUNTUACIÓN GUARDADA_", como hoy.
- `error`: se ve "▸ ERROR AL GUARDAR · REINTÉNTALO_", y el input y el botón GUARDAR siguen visibles para reintentar.
- `restart` vuelve a `save: "idle"`. JUGAR DE NUEVO y VOLVER AL VAULT funcionan en cualquier estado.

### Salón de la Fama (`components/screens/HallOfFame.tsx`)

```ts
type HallState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rows: LeaderboardRow[] }; // rows puede estar vacío
```

Reglas:

- Las pestañas salen de `useGames()`, y la inicial es la primera del catálogo.
- Al montar y al cambiar de pestaña se llama a `fetchTopScores(tab)` y el estado pasa a `loading`. No hay caché entre pestañas.
- Si llega la respuesta de una pestaña que ya no está seleccionada, se descarta.

| Estado             | Qué se ve                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `loading`          | "CARGANDO…" en el lugar del podio y la tabla.                                                                 |
| `error`            | "SEÑAL PERDIDA" y un botón "REINTENTAR" que repite `fetchTopScores` de la pestaña actual.                     |
| `ready`, 0 filas   | "SIN PUNTUACIONES · SÉ EL PRIMERO" y un botón "JUGAR A {TÍTULO}" que navega a `#/jugar/{id}`.                 |
| `ready`, 1–2 filas | Podio con "—" en el nombre, la puntuación y la fecha de los puestos vacíos. La tabla solo tiene filas reales. |
| `ready`, 3+ filas  | Podio y tabla como hoy, con datos reales.                                                                     |

- El botón VOLVER A LA BIBLIOTECA se ve en todos los estados.
- `seededScores` deja de usarse en el Salón. El detalle del juego lo sigue usando.
- Las clases nuevas de estos estados van en `app/globals.css`, junto a las del Salón.

## Plan de implementación

1. **Migración del catálogo.** Crear `pending_create_games_table.sql` con la tabla, la RLS y el insert de los 8 juegos. Aplicarla con `apply_migration` (nombre `create_games_table`), renombrar el archivo con su versión y regenerar los tipos. Verificación: `select id, sort_order from public.games order by sort_order` devuelve los 8 ids en el orden de `GAMES`, y `get_advisors` de seguridad no muestra avisos sobre `games`.
2. **Lectura y contexto.** Crear `lib/catalog.ts` con `fetchGames` y `lib/games-context.tsx` con `GamesProvider` y `useGames`. Verificación: `npm run lint` y `npm run build` pasan; nadie los usa todavía.
3. **Carga en `page.tsx`.** Hacer `app/page.tsx` async con `fetchGames`, añadir la prop `games` a `App`, envolver con `GamesProvider` y pasar los ids a `parseHash`. Las pantallas siguen leyendo `GAMES`. Leer antes en `node_modules/next/dist/docs/01-app/` cómo se renderiza una página async que usa `cookies()`. Verificación: `npm run build` pasa y la app se ve igual en `npm run dev`.
4. **Pantallas al contexto.** Cambiar Home, Biblioteca, detalle, player, Salón y `lib/home.ts` (`homeStats`) a `useGames()`. Eliminar `GAMES` de `lib/games.ts` y actualizar su comentario de cabecera. Verificación: `grep -rn "GAMES" app components lib` no devuelve usos del array; Biblioteca, detalle, player y Home se ven igual.
5. **Pantalla de error.** Crear `SignalLost.tsx` y el manejo de `games === null` en `page.tsx` y `App`. Verificación: con `NEXT_PUBLIC_SUPABASE_URL` vacía y el servidor reiniciado, el Home muestra "SEÑAL PERDIDA" y `#/acerca` se ve normal.
6. **Migración de puntuaciones.** Crear `pending_create_scores_table.sql` con la tabla, el índice, la RLS y `submit_score`. Aplicarla (nombre `create_scores_table`), renombrar y regenerar los tipos. Verificación con `execute_sql`: `select public.submit_score('asteroids', 'TEST', 100)` devuelve un id; con `'test'`, `' TEST'`, `-1` o `'no-existe'` lanza error.
7. **Módulo de puntuaciones.** Crear `lib/scores.ts` con `NAME_PATTERN`, `isValidName`, `fetchTopScores` y `submitScore`. Verificación: `npm run build` pasa.
8. **GUARDAR real.** En `GamePlayer.tsx`, sustituir `saved` por `save`, añadir `saveStart`, `saveOk` y `saveFail` con la guarda de `run`, llamar a `submitScore`, y añadir la pista, GUARDANDO… y el mensaje de error. Verificación: guardar una partida de ASTEROIDS y otra de CAÍDA crea dos filas en `public.scores`.
9. **Salón real.** En `HallOfFame.tsx`, sustituir `seededScores` por `fetchTopScores` con `HallState`, el descarte de respuestas antiguas y los estados de la tabla. Verificación: la pestaña ASTEROIDS muestra la fila guardada en el paso 8, y una pestaña sin filas muestra el estado vacío.
10. **Pulido con `/frontend-design`.** Revisar `SignalLost`, los estados del Salón y los del modal a 1440 px y 375 px, sin cambiar la estética del Vault: jerarquía, legibilidad, foco visible y sin scroll horizontal.
11. **Limpieza.** Borrar con `execute_sql` las filas de `public.scores` creadas durante la verificación. Si un estilo nuevo no se aplica en `next dev`, comprobar con `npm run build` + `next start`, porque el `next dev` ya sirvió un `globals.css` antiguo en el SPEC 02.

## Criterios de aceptación

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores de tipos ni de compilación, y marca `/` como dinámica.
- [ ] `supabase/migrations/` contiene 3 archivos, ninguno con prefijo `pending_`, y sus versiones y nombres coinciden con `list_migrations`.
- [ ] `public.games` tiene 8 filas con los mismos valores que tenía `GAMES` y `sort_order` de 1 a 8.
- [ ] `lib/supabase/database.types.ts` incluye las tablas `games` y `scores` y la función `submit_score`.
- [ ] `get_advisors` de seguridad no muestra avisos sobre `games` ni `scores`. Sobre `submit_score` solo puede aparecer el aviso de función `security definer` ejecutable por `anon`, aceptado en Decisiones.
- [ ] Con la publishable key, un `insert` directo en `public.scores` o en `public.games` es rechazado.
- [ ] `submit_score` rechaza un juego inexistente, un nombre en minúsculas, un nombre con espacios a los lados, un nombre de 11 caracteres y una puntuación negativa.
- [ ] `grep -rn "GAMES" app components lib` no encuentra el array `GAMES` ni usos suyos.
- [ ] Ninguna pantalla importa `@/lib/supabase/server`.
- [ ] La Biblioteca muestra los 8 juegos en el mismo orden, con sus portadas, récords y partidas.
- [ ] `#/juego/asteroids` y `#/jugar/asteroids` funcionan, y `#/juego/no-existe` muestra el Home.
- [ ] El Home muestra "8 JUEGOS" y el ticker conserva sus 7 filas.
- [ ] Con `NEXT_PUBLIC_SUPABASE_URL` vacía y el servidor reiniciado, `#/`, `#/biblioteca` y `#/salon` muestran "SEÑAL PERDIDA" con REINTENTAR, y `#/acerca` y `#/acceso` se ven normal.
- [ ] En el modal, GUARDAR PUNTUACIÓN está deshabilitado con el input vacío o con solo espacios.
- [ ] Escribir "Ñ" en el input muestra "SOLO A–Z, 0–9, _ Y ESPACIOS" y deja GUARDAR deshabilitado.
- [ ] Mientras se guarda, el botón dice "GUARDANDO…" y está deshabilitado.
- [ ] Guardar " AB 1 " en una partida de ASTEROIDS crea en `public.scores` una fila con `game_id = 'asteroids'`, `name = 'AB 1'` y la puntuación del modal, y se ve "▸ PUNTUACIÓN GUARDADA_".
- [ ] Guardar en una partida de CAÍDA crea una fila con `game_id = 'caida'`.
- [ ] Con la red cortada en DevTools, GUARDAR muestra "▸ ERROR AL GUARDAR · REINTÉNTALO_" y el botón vuelve a estar disponible; al restaurar la red, reintentar guarda la fila.
- [ ] JUGAR DE NUEVO tras guardar deja el modal listo para una nueva partida, sin el mensaje de guardado.
- [ ] El Salón muestra en la pestaña ASTEROIDS las filas guardadas, ordenadas por puntos de mayor a menor y con la fecha en formato DD/MM/AAAA.
- [ ] Con dos filas de la misma puntuación, la más antigua aparece antes.
- [ ] Con más de 12 filas en un juego, el Salón muestra exactamente 12.
- [ ] Una pestaña sin filas muestra "SIN PUNTUACIONES · SÉ EL PRIMERO", y su botón lleva a `#/jugar/{id}` de ese juego.
- [ ] Con 1 o 2 filas, los puestos vacíos del podio muestran "—".
- [ ] Al cambiar de pestaña se ve "CARGANDO…" antes de los datos.
- [ ] Con la red cortada, cambiar de pestaña muestra "SEÑAL PERDIDA" con REINTENTAR, y REINTENTAR carga los datos al restaurar la red.
- [ ] El panel MEJORES PUNTUACIONES del detalle sigue mostrando las filas simuladas de siempre.
- [ ] La consola del navegador no muestra errores al recorrer Home, Biblioteca, detalle, player y Salón con Supabase disponible.
- [ ] A 375 px no hay scroll horizontal en el Salón, en el modal ni en "SEÑAL PERDIDA".
- [ ] `public.scores` no contiene filas de la verificación al terminar.

## Decisiones

- **Sí:** catálogo completo en la tabla `games`. Decisión del usuario; una sola fuente de verdad para el catálogo.
- **No:** tabla `games` solo como referencia para la clave foránea, con la UI leyendo `lib/games.ts`. Habría dos copias del catálogo.
- **Sí:** catálogo y leaderboard en un mismo spec, en dos fases. Decisión del usuario; el leaderboard depende del catálogo.
- **No:** dividir en SPEC 06 y SPEC 07.
- **Sí:** leer el catálogo en `app/page.tsx` como Server Component y pasarlo a `<App>`. Decisión del usuario; la primera pintura trae el catálogo y el router sigue siendo síncrono.
- **No:** leer el catálogo desde el navegador con un estado de carga. Añade un parpadeo en cada visita y obliga al router a esperar.
- **Sí:** `/` dinámica, sin caché. Es lo que pasa al leer `cookies()` y el catálogo siempre está al día. La caché va en su propio spec si hace falta.
- **Sí:** pantalla "SEÑAL PERDIDA" si el catálogo no carga. Decisión del usuario; Acerca y Acceso no dependen de él.
- **No:** respaldo estático en `lib/games.ts`. Serían dos fuentes que acabarían divergiendo.
- **Sí:** 0 filas en `games` cuenta como fallo. Una app sin juegos no tiene nada que mostrar, y así se ve el aviso en lugar de pantallas vacías.
- **Sí:** `best` y `plays` como columnas estáticas. Decisión del usuario; calcularlos desde `scores` va con el leaderboard del detalle y la Biblioteca.
- **Sí:** contexto `GamesProvider` / `useGames()`. Decisión del usuario; evita cambiar la firma de cada pantalla.
- **No:** pasar `games` por props a cada pantalla.
- **Sí:** `sort_order` en `games`. Una tabla no tiene orden propio, y la Biblioteca y el Home dependen del orden actual.
- **Sí:** `cat` y `color` como `text` con CHECK. Los valores están cerrados y un CHECK se cambia en una migración más fácil que un enum.
- **Sí:** guardar de forma anónima con iniciales. Decisión del usuario; auth todavía no existe.
- **No:** esperar a auth para guardar.
- **Sí:** escritura solo con la RPC `submit_score`, `security definer`. Decisión del usuario; valida en un único sitio y la tabla no admite inserts directos.
- **No:** insert directo con política RLS para `anon`. Deja la tabla abierta a cualquier columna que admita el insert.
- **Sí:** aceptar el aviso de advisors sobre `security definer` ejecutable por `anon`. Es justo lo que hace falta para guardar sin auth, y la función solo inserta filas validadas.
- **Sí:** guardar en todos los juegos, también los simulados. Decisión del usuario.
- **No:** limitar el guardado a ASTEROIDS. Asumido que los juegos simulados llenarán el ranking con puntuaciones generadas por el intervalo.
- **Sí:** solo el Salón de la Fama lee el leaderboard real. Decisión del usuario.
- **No:** leaderboard real en el detalle, el Home o las tarjetas en este spec. El detalle seguirá simulado aunque el Salón sea real.
- **Sí:** top 12 de todas las partidas, con empate a favor de la más antigua. Decisión del usuario; es el arcade clásico y coincide con las 12 filas actuales.
- **No:** una fila por nombre. Sin auth, dos personas con las mismas iniciales se fusionarían.
- **Sí:** iniciales de 1 a 10 caracteres entre A–Z, 0–9, `_` y espacio, recortadas. Decisión del usuario; respeta el input actual.
- **No:** "ANÓNIMO" por defecto ni exactamente 3 letras.
- **Sí:** la misma regla en el cliente y en la base de datos. El cliente da respuesta inmediata y la base de datos es la que manda.
- **Sí:** `scores` vacía con estado vacío en el Salón. Decisión del usuario; no se mezclan jugadores inventados con reales.
- **No:** sembrar `scores` con `seededScores`.
- **Sí:** GUARDANDO…, error con reintento y guarda por `run`. Decisión del usuario; evita duplicados y no pierde la puntuación si falla la red.
- **No:** fallo silencioso.
- **Sí:** dos migraciones, `create_games_table` y `create_scores_table`. Decisión del usuario; encajan con las dos fases del plan.
- **Sí:** sin caché entre pestañas del Salón. Siempre muestra lo último guardado y son 12 filas por consulta.
- **Sí:** verificación con lint, build, consultas con el MCP y prueba manual. Decisión del usuario.
- **No:** Playwright ni sección "Resultado de la verificación" en este spec.
- **Sí:** borrar las filas de prueba de `scores` al terminar. El Salón arranca vacío, como se decidió.

## Riesgos

| Riesgo                                                                                                        | Mitigación                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Sin auth, cualquiera puede llamar a `submit_score` con una puntuación inventada o en bucle.                   | Aceptado. Los CHECK limitan el formato y el rango. El antitrampas y el límite de envíos van con el spec de auth.     |
| Si Supabase está pausado o caído, el Home, la Biblioteca y el Salón quedan inutilizables.                     | Pantalla "SEÑAL PERDIDA" con REINTENTAR. El proyecto gratuito se reactiva desde el dashboard.                        |
| Cada visita a `/` hace una consulta a Supabase y suma su latencia a la primera pintura.                       | Aceptado: es una consulta pequeña. La caché queda fuera de este spec.                                                |
| Los tipos generados dan `cat` y `color` como `string`.                                                        | Cast en `fetchGames`, respaldado por los CHECK de la tabla.                                                          |
| Una respuesta tardía de GUARDAR o del Salón pisa el estado de otra partida o de otra pestaña.                 | Guarda por `run` en el modal y descarte por pestaña en el Salón.                                                     |
| Los ids de `RECENT_SCORES` en `lib/home.ts` dejan de existir en `games` y el ticker pierde filas en silencio. | El insert copia los ids actuales. Un criterio comprueba que el ticker conserva sus 7 filas.                          |
| Next 16 puede renderizar distinto una página async que lee `cookies()`.                                       | Leer `node_modules/next/dist/docs/01-app/` en el paso 3. Un criterio comprueba que el build marca `/` como dinámica. |
| Las filas de prueba quedan en el Salón real.                                                                  | Paso 11 y criterio específico.                                                                                       |
| La puntuación de los juegos simulados crece sola y llenará el ranking con valores sin partida real detrás.    | Aceptado por decisión del usuario. Cada juego real que llegue la sustituirá.                                         |

## Lo que **no** entra en este spec

- Autenticación y puntuaciones ligadas a una cuenta.
- Antitrampas y límite de envíos.
- `best` y `plays` calculados.
- Leaderboard real en el detalle, el Home y las tarjetas.
- Administración del catálogo desde la UI.
- Respaldo estático y caché del catálogo.
- Tiempo real y paginación en el Salón.
- Playwright y tests automatizados.

Cada uno, si llega, va en su propio spec.
