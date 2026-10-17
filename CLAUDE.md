# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: a retro portal to play games online and compete for the highest scores (see README.md, in Spanish). UI copy, specs and most code comments are in Spanish.

Current state:

- All screens from the visual MVP are built: Home, Biblioteca, Detalle, Reproductor, Acceso, Salón de la Fama, Acerca.
- The game catalog and the leaderboard live in Supabase.
- Four real, playable games: **Asteroids**, **Tetris**, **Arkanoid**, **Snake**. The other catalog games still run a simulated "fake" game in the player.
- Auth is visual only (no session is created). The Detalle screen still shows a seeded fake leaderboard (`seededScores` in `lib/games.ts`); the real one is in the Salón de la Fama.

## Spec Driven Design

All work goes through specs in `specs/NN-slug.md` (written in Spanish, header `> **Estado:** Draft | Approved | Implemented`). Specs 01–10 exist; read the relevant one before touching a feature, and when adding a spec, take the next free number.

- `/spec` — writes a new spec (template in `.agents/skills/spec/template.md`).
- `/spec-impl <NN-spec>` — implements an **Approved** spec on its own branch `spec-NN-slug` (auto-created, see `specs/.spec-config.yml`), step by step. When done, set the spec's state to `Implemented`.
- `game-planner` (subagent, `.claude/agents/game-planner.md`) — decides which game to add next. It remembers past suggestions (project memory in `.claude/agent-memory/game-planner/`) and records them as a To Do in `references/game-suggestions-todo.md`. Its output is the argument for `/nuevo-juego`; it never writes specs or code.
- `game-jam` (subagent, `.claude/agents/game-jam.md`) — given a theme, designs one original game and writes 3 variant specs (A clásica, B variante, C alternativa; at least 2 complete, shaped like specs 08–10) in `specs/game-jam/<game-id>/`, all in Draft and always as a new catalog row. It never writes code. To implement one, move it to `specs/NN-juego-<id>.md`, approve it and run `/spec-impl`.
- `/nuevo-juego <started-games folder or description>` — writes the spec for a new real game (engine + catalog row + leaderboard). It only writes `specs/NN-juego-<id>.md` in Draft; implement it with `/spec-impl`. Its contract lives in `.claude/skills/nuevo-juego/engine-contract.md`.
- `/frontend-design` — always use it when designing user interfaces.

`spec`, `spec-impl` and `frontend-design` are installed under `.agents/skills/` (symlinked into `.claude/skills/`, tracked in `skills-lock.json`); reinstall with `npx skills@latest add Klerith/fernando-skills`. `nuevo-juego` is project-local in `.claude/skills/`.

## Critical: this is Next.js 16.3.6, not the Next.js you know

Per `AGENTS.md`, this project's Next.js version has breaking changes vs. training data. Before writing routing, data-fetching, layout, or config code, read the relevant page under `node_modules/next/dist/docs/01-app/` (App Router is in use). Key upgrade notes live at `node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md`. Do not assume APIs from older Next.js versions still apply — e.g. the root layout uses the typed `LayoutProps<"/">` pattern instead of manually typed `{ children }` props.

## Commands

```bash
npm run dev     # start dev server (Turbopack)
npm run build   # production build
npm run start   # run production build
npm run lint    # ESLint (flat config: next/core-web-vitals + next/typescript)
```

There is no test runner configured. Verify changes with `npm run lint`, `npm run build`, and by playing the screen in the browser.

A `PostToolUse` hook (`.claude/hooks/format-and-lint.sh`) runs Prettier and `eslint --fix` on every file you Write/Edit; lint errors it can't fix are reported back and must be fixed in the same turn.

Copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Architecture

### App shell and routing

- **Single page + hash router.** `app/page.tsx` (Server Component) loads the catalog with `fetchGames()` and renders `components/App.tsx` (Client Component). If the catalog fails, `games` is `null` and the catalog screens show `<SignalLost />`.
- `lib/router.ts` maps hashes to routes: `#/`, `#/biblioteca`, `#/juego/:id` (detalle), `#/jugar/:id` (player), `#/acceso`, `#/salon`, `#/acerca`. Unknown hashes and unknown game ids fall back to home. Screens receive `navigate(route)`; don't add App Router pages for these screens.
- Screens live in `components/screens/`; the catalog is exposed through `GamesProvider` / `useGames()` (`lib/games-context.tsx`).
- `app/api/health/route.ts` — `GET /api/health` pings Supabase via the `health()` RPC (200 / 503, `no-store`).

### Styling

- `app/globals.css` — Tailwind v4 entry (`@tailwindcss/postcss`, no `tailwind.config.*`) plus the full retro theme ported from `references/templates/styles.css`: CSS variables (`--mono`, neon colors…), `av-*` layout classes, CSS-only cover art (`cover-*`), player/CRT styles. Most UI is styled with these classes, not Tailwind utilities.
- Fonts (`app/layout.tsx`): `Press_Start_2P` (`--font-press-start`) and `JetBrains_Mono` (`--font-jetbrains`, used by `--mono`).

### Supabase

- Clients: `lib/supabase/server.ts` (Server Components / route handlers; reads `cookies()`, so the page renders per request) and `lib/supabase/client.ts` (browser). Env read in `lib/supabase/env.ts`.
- `public.games` — the catalog (`id, title, short, long, cat, cover, color, best, plays, sort_order`), read in `lib/catalog.ts`.
- `public.scores` — leaderboard, read publicly via RLS; **writes only through the `submit_score(p_game_id, p_name, p_score)` RPC** (security definer, validates game id, name `^[A-Z0-9_ ]{1,10}$` and score range). Client helpers in `lib/scores.ts` (`fetchTopScores` top 12, `submitScore`, `isValidName`).
- `lib/supabase/database.types.ts` is generated — never edit by hand.
- **Migration flow** (via the Supabase MCP, configured in `.mcp.json`): write `supabase/migrations/pending_<name>.sql` → `apply_migration` with the same SQL and name → rename the file to `<version>_<name>.sql` using the version from `list_migrations` → regenerate types with `generate_typescript_types` → check `get_advisors`.

### Game engines

- Contract in `lib/engines/types.ts`: an `EngineDefinition` (`id` = `games.id`, logical `width`/`height`, `initialStats`, `startPrompt`, `controls`, `create(canvas, callbacks)`) whose `create` returns a `GameEngine` (`setPaused`, `end`, `destroy`) and reports `onStats` / `onPhase` (`ready → playing → dead → gameover`).
- `lib/engines/registry.ts` — `ENGINES` map + `getEngine(id)`. `GamePlayer` uses the real engine when one is registered and the simulated game otherwise. On game over the player offers GUARDAR PUNTUACIÓN → `submitScore`.
- `components/games/GameCanvas.tsx` mounts an engine on a canvas; `lib/engines/canvas.ts#setupCanvas` sets up the DPR-scaled 2D context.
- Each game lives in `lib/<id>/` with the same split: `config.ts`, `engine.ts`, `input.ts`, `definition.ts` (the `EngineDefinition`), plus game-specific modules (`board.ts`, `entities.ts`, `pieces.ts`, `levels.ts`, `sprites.ts`…).
- **Adding a real game** = engine folder + registry entry + a migration that inserts/replaces its `games` row (see the `replace_*` migrations) — always via `/nuevo-juego` + `/spec-impl`.

### Other conventions

- Path alias `@/*` maps to the repo root. TypeScript strict mode is on.
- `references/` holds source material, not app code: `templates/` (original HTML/JSX design), `started-games/` (standalone games to port), `source-assets/` (e.g. snake sprites).
- `demos/` is a scratch folder, not used by the app.
