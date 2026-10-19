---
name: project-skins-audit
description: Estado de la última auditoría de skins (2026-10-17) y del SPEC 11 (sistema de skins + ASTEROIDS), con el alcance incremental pendiente de validar
metadata:
  type: project
---

Última auditoría: 2026-10-17. No existía `lib/engines/skins.ts`; ningún juego tenía skins.
Juegos con motor: asteroids, tetris, arkanoid, snake. Simulados (sin motor): gloton, invasores, ranaria, duelo-pixel.

Escrito `specs/11-sistema-de-skins.md` (Draft): contrato + tres skins solo de ASTEROIDS.
El usuario pidió "skins para Asteroids", así que el contrato es **incremental**: `EngineDefinition.skins?` y `GameEngine.setSkin?` opcionales; cada juego con skins usa `Required<GameEngine>`.
Esto se aparta de la regla por defecto del agente (todos los juegos en el primer spec); se dejó como primera decisión a revisar.

**Why:** el usuario quería empezar por un juego; meter los cuatro triplicaba el alcance.
**How to apply:** si el SPEC 11 está Approved/Implemented, el siguiente paso son `NN-skins-tetris.md`, `NN-skins-arkanoid.md`, `NN-skins-snake.md`, y el último de ellos hace obligatorios `skins` y `setSkin`. Si el usuario rechazó el enfoque incremental, reescribir (solo si sigue en Draft) con los cuatro juegos. Comprueba el estado real del spec antes de actuar.

Pendientes de respuesta del usuario: fósforo verde vs ámbar en RETRO, posición del selector (bajo el CRT, etiqueta "SKIN"), glow NEÓN 2.

Ver [[skin-color-families]] y [[skin-tech-constraints]].

**ARKANOID (2026-10-19):** escrito `specs/12-skins-arkanoid.md` (Draft, depende de 07/09/11). Sin `lib/engines/skins.ts` aún (SPEC 11 sin implementar); selector ❌ en `#/jugar/arkanoid` hasta que se implementen 11 y 12. El spec no toca `GamePlayer`: basta `skins: SKINS` en la definición. Clasico pasa entero (mín. 4.15:1, `#aa00ff`).
Pendiente de respuesta: RETRO con 9 hex (rompe 4–6 de la guía para tener 7 bloques distintos) y NEÓN sin verde/amarillo/plata.
