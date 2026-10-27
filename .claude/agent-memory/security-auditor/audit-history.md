---
name: audit-history
description: Dates and results of past security audits of Arcade Vault, the specs written from them, and their last known state
metadata:
  type: project
---

## 2026-10-27 — first audit (commit a41ec5f, main, next start on :3005)

- 21 of 23 checks pass. SPEC 19/20 contract intact (RLS, policies, private.submit_score, rls_auto_enable revoked, ensure_rls 'O', 5 headers, no X-Powered-By, auth redirects fixed).
- ALTO: `npm audit --omit=dev` → next@16.3.6 (2 critical RCE: GHSA-2464-fhr4-w9xw image optimizer SVG, GHSA-673q-mjm6-r5xr use cache; 2 high), sharp@0.35.4 high, source-map-js@1.2.1 high. Fix: next 16.4.3. `/_next/image` was live (200 on /games/snake/fruits.png) though the app doesn't use next/image.
- MEDIO: anon/authenticated keep TRUNCATE, REFERENCES, TRIGGER, MAINTAIN on games/scores (relacl `rDxtm`), rwU on scores_id_seq, and postgres default ACLs in public open new tables/seqs/functions. Not reachable via PostgREST.
- INFO: /auth/confirm forwards any `type` to /auth/v1/verify; Node 20 deprecation warning from supabase-js; submit_score error echoes p_game_id (UI shows fixed text).

Specs written (state when last seen):

- specs/21-seguridad-dependencias.md — Draft (next 16.4.3, npm audit fix, `images.unoptimized: true`, CLAUDE.md version line).
- specs/22-seguridad-grants.md — Draft (migration `revoke_api_role_extra_grants`; global default revoke of EXECUTE from PUBLIC).

Also noticed: SPEC 20 still says `Approved` although `harden_rpc_functions` is applied and headers are live — reported, not edited.

**How to apply:** next audit, check whether 21/22 were implemented (package.json next version, relacl of games = `anon=r/postgres`) before re-reporting the same findings.
