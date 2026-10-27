---
name: measurement-tricks
description: Non-obvious behaviours of PostgREST, Supabase Auth, Next 16 and Postgres discovered while auditing Arcade Vault, and what can't be measured read-only
metadata:
  type: reference
---

- `GET /rest/v1/` (OpenAPI) with the publishable key → 401 "Secret API key required". Derive the exposed surface from `pg_proc`/`pg_class` + `has_*_privilege`, and the PGRST106 hint (lists exposed schemas).
- The legacy anon JWT from `get_publishable_keys` (reported `disabled: false`) is rejected with "Invalid API key" — use the `sb_publishable_…` key.
- Direct writes as anon return HTTP 401 + `42501` (not 403). Content-Profile on a non-exposed schema → 406 `PGRST106`.
- `information_schema.role_table_grants` doesn't show MAINTAIN; read `pg_class.relacl` (`m` = MAINTAIN, `D` = TRUNCATE, `x` = REFERENCES, `t` = TRIGGER).
- Postgres: a per-schema `ALTER DEFAULT PRIVILEGES … REVOKE` can't remove a globally granted default (EXECUTE to PUBLIC on functions); it must be global.
- `/auth/callback?code=x` does NOT reach `/auth/v1/token` (supabase-js fails locally without code_verifier). `/auth/confirm?token_hash=x&type=…` does hit `/auth/v1/verify` (one call each, acceptable).
- `query_logs`: sources here are edge_logs, postgres_logs, postgrest_logs, auth_logs, storage_logs, pgbouncer_logs. MCP SQL appears in postgres_logs with `-- source: POST /mcp`.
- `.next/static` contains `startsWith("sb_secret_")` from supabase-js — a false positive for the secrets grep; check for `sb_secret_[A-Za-z0-9]{6,}` instead.
- `/_next/image` is live in `next start` unless `images.unoptimized: true` (next-server.js then calls render404). SVG source → 400, remote URL → 400 without remotePatterns.
- zsh: a glob with no matches aborts the whole command line — quote or guard globs over the memory dir.
- Not measurable read-only: that new objects are born closed (needs create/drop) — leave as a spec verification step.
