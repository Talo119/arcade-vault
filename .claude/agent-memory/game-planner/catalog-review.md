---
name: catalog-review
description: Última revisión del catálogo (reales vs simulados, scores, huecos de categoría) y criterios técnicos aprendidos al evaluar sustituciones
metadata:
  type: project
---

## Revisión 2026-10-13

- Reales (motor en `ENGINES`): arkanoid (ARCADE cyan), tetris (PUZZLE magenta), snake (ARCADE green), asteroids (SHOOTER yellow).
- Simulados en `public.games`: gloton (ARCADE yellow, Pac-Man), invasores (SHOOTER green, Space Invaders), ranaria (ARCADE green, Frogger), duelo-pixel (VERSUS cyan, Pong).
- `public.scores` solo tiene filas de juegos reales → cambiar el id de un simulado no choca con la FK (no hace falta borrar puntuaciones).
- `lib/home.ts` (`RECENT_SCORES`) referencia gloton, invasores y ranaria: el spec que cambie su id debe actualizarlo.
- Reparto real: 2 ARCADE, 1 PUZZLE, 1 SHOOTER, 0 VERSUS. Los 4 colores ya están cubiertos, así que el color no desempata.

**Why:** se recalcula en cada invocación, pero sirve para ver la evolución y no repetir análisis.
**How to apply:** comparar con el estado actual; si cambia, actualizar esta nota y la línea de `MEMORY.md`.

## Criterios aprendidos

- Patrón del proyecto al sustituir: el simulado (nombre inventado en español) pasa a id/título del clásico en inglés (caida→tetris, bloque-buster→arkanoid, serpentina→snake). Se sigue en las sugerencias.
- duelo-pixel (Pong / VERSUS) encaja mal: su puntuación natural es "primero a 11" contra CPU o local a dos jugadores, no un score creciente para el Salón. No proponerlo salvo como variante score-attack solitaria (p. ej. rally infinito) y avisando.
- Snake no tenía carpeta en `started-games/` (solo sprites en `source-assets/`): los juegos originales sin referencia son viables con `/nuevo-juego <descripción>`.
