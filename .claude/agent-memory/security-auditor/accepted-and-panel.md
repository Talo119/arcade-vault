---
name: accepted-and-panel
description: Accepted security warnings, open questions put to the user, and the last confirmation of the Supabase Auth panel settings
metadata:
  type: project
---

**Accepted (not findings):**

- `auth_leaked_password_protection` advisor — needs Pro plan; accepted by the user in SPEC 20.
- No Content-Security-Policy / no `proxy.ts` — out of scope in SPEC 20, pending its own spec (INFO).

**Open questions asked to the user (2026-10-27, in SPEC 21/22 Decisiones):**

- Upgrade Node 20 → 22 (supabase-js deprecation)?
- Restrict `type` to `email` in app/auth/confirm/route.ts?
- Rate limits / anti-cheat for submit_score? (logs showed no abuse)
  No answer yet — record it here when known, and don't re-ask if rejected for the same reason.

**Auth panel (check 10):** never confirmed by the user yet. Expected: Minimum password length 8; sign-ups and sign-ins 10 / 5 min / IP; Confirm email on; Site URL http://localhost:3000; Redirect URLs only own domains with `/**`. Ask again until a confirmation with date is stored here.
