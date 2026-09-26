# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault: a platform to play games online and compete for the highest scores (see README.md, in Spanish). The app is currently a fresh `create-next-app` scaffold — no game features are implemented yet.

Development follows **Spec Driven Design** using the `/spec` and `/spec-impl` workflow from https://github.com/Klerith/fernando-skills. Install the skills with:

```bash
npx skills@latest add Klerith/fernando-skills
```

## Critical: this is Next.js 16.3.6, not the Next.js you know

Per `AGENTS.md`, this project's Next.js version has breaking changes vs. training data. Before writing routing, data-fetching, layout, or config code, read the relevant page under `node_modules/next/dist/docs/01-app/` (App Router is in use — see `app/layout.tsx`, `app/page.tsx`). Key upgrade notes live at `node_modules/next/dist/docs/01-app/01-getting-started/18-upgrading.md`. Do not assume APIs from older Next.js versions still apply — e.g. this project already uses the newer typed layout props pattern (`LayoutProps<"/">` in `app/layout.tsx`) instead of manually typed `{ children }` props.

## Commands

```bash
npm run dev     # start dev server (Turbopack, per next.config.ts defaults)
npm run build   # production build
npm run start   # run production build
npm run lint    # ESLint via eslint.config.mjs (flat config: next/core-web-vitals + next/typescript)
```

There is no test runner configured yet.

## Skills
Use always /frontend-design for design user interfaces. 

## Architecture

- **App Router only** (`app/` directory). No Pages Router.
- `app/layout.tsx` — root layout; loads `Geist`/`Geist_Mono` fonts via `next/font/google` and exposes them as CSS variables (`--font-geist-sans`, `--font-geist-mono`).
- `app/globals.css` — Tailwind v4 entry point (uses `@tailwindcss/postcss`, configured in `postcss.config.mjs`; no separate `tailwind.config.*`).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- TypeScript strict mode is on.
