---
name: project-skins-audit
description: Estado de la última auditoría de skins (2026-10-20): qué juegos cumplen, specs de skins y su estado, pendientes (TETRIS sin skins, ajuste FROGGER en SPEC 16)
metadata:
  type: project
---

Última auditoría: 2026-10-20 (pedida tras implementar FROGGER, SPEC 15, en la rama `spec-15-juego-frogger`).

Estado de specs (verifica con `grep Estado specs/*.md`, cambia rápido):

- SPEC 11 sistema + ASTEROIDS, SPEC 12 ARKANOID, SPEC 13 SNAKE: Implemented. `lib/engines/skins.ts` existe; `skins`/`setSkin` siguen opcionales en `types.ts`.
- SPEC 15 FROGGER (Approved, sin commit): trae sus tres skins; selector OK (GamePlayer lo muestra si `engine.skins`).
- SPEC 16 `16-skins-ajuste-frogger.md` (Draft, 2026-10-20): NEÓN `carA` `#2de2ff`→`#b14bff` (era el mismo hex que la rana) y RETRO `log` `#7dff6e`→`#238b45` (rana/tronco 1.21→4.11:1). CLÁSICO intacto.

Cumplen: asteroids, arkanoid, snake. FROGGER cumple tras SPEC 16.
**TETRIS sigue sin `SKINS` ni selector** (sueltos `engine.ts:234`, `:326`). No escribí su spec porque el encargo era solo FROGGER; es el siguiente pendiente y el que debería hacer obligatorios `skins` y `setSkin`.
Simulados sin motor: gloton, invasores, duelo-pixel (ranaria sustituida por frogger).

Pendientes de respuesta del usuario (nunca han llegado; siguen sin validar): fósforo verde vs ámbar, glow NEÓN 2, RETRO de ARKANOID con 9 hex.

**Why:** el usuario/agente principal suele pedir auditorías acotadas a un juego tras `/spec-impl-game`.
**How to apply:** en la próxima auditoría general, empieza por TETRIS. Si SPEC 16 se rechaza, anota el motivo en [[skin-color-families]].

Ver [[skin-color-families]], [[skin-tech-constraints]], [[project-skins-snake]].
