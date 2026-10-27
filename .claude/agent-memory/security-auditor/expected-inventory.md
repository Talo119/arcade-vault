---
name: expected-inventory
description: Expected DB/API surface of Arcade Vault (tables, functions, grants, schemas, exposed routes) as measured on 2026-10-27, to diff against in later audits
metadata:
  type: project
---

Measured 2026-10-27 (Postgres 17.11). Update when SPEC 22 is implemented.

**Tables (public):** `games`, `scores` only. RLS on, 1 SELECT policy each (`games_select_public`, `scores_select_public`, roles `{anon,authenticated}`, qual `true`). No tables in `private`. Sequence: `public.scores_id_seq`.

- relacl today: `anon=rDxtm/postgres`, `authenticated=rDxtm/postgres` (SELECT + TRUNCATE/REFERENCES/TRIGGER/MAINTAIN). After SPEC 22: `anon=r/postgres`.
- scores_id_seq today: `anon=rwU`, `authenticated=rwU`. After SPEC 22: none.

**Functions:**

- `public.health()` — invoker, search_path="", EXECUTE anon/auth/PUBLIC (explicit grant in migration).
- `public.submit_score(text,text,integer)` — invoker (sql), search_path="", EXECUTE anon/auth, not PUBLIC.
- `private.submit_score(text,text,integer)` — DEFINER (plpgsql), search_path="", EXECUTE anon/auth, not PUBLIC.
- `public.rls_auto_enable()` — DEFINER, search_path=pg_catalog, no EXECUTE for anon/auth/PUBLIC (panel-created).

**Schemas:** `private`: PUBLIC no USAGE; anon/authenticated USAGE (by design, SPEC 20). PostgREST exposes only `public`, `graphql_public` (PGRST106 hint).
**Event triggers:** `ensure_rls` → `rls_auto_enable`, evtenabled `O` (plus Supabase's pgrst_/graphql/cron/net ones).
**Extensions:** uuid-ossp, pgcrypto, pg_stat_statements in `extensions`; supabase_vault in `vault`. pg_graphql NOT enabled.
**Storage:** 0 buckets, 0 storage policies. Realtime publication `supabase_realtime` has no tables.
**Default ACLs (postgres & supabase_admin, schema public):** tables arwdDxtm, seqs rwU, functions X to anon/authenticated. No global (namespace 0) entries, none for `private`.
**Migrations:** 8, last `20261027162047_harden_rpc_functions`.
**API surface:** tables games, scores; RPC callable by anon: health, submit_score.
**App:** routes `/`, `/api/health`, `/auth/callback`, `/auth/confirm` (all ƒ dynamic). `process.env` only in lib/supabase/env.ts.
