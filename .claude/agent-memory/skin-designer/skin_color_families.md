---
name: skin-color-families
description: Hex de las familias NEÓN y RETRO propuestas en el SPEC 11 para reutilizar entre juegos, y por qué (fósforo verde, papeles invertidos en NEÓN)
metadata:
  type: project
---

Propuestas en SPEC 11 (2026-10-17), aún sin validar por el usuario. Reutilizarlas en tetris/arkanoid/snake para coherencia.

- **NEÓN:** bg `#0a0418` (lum 0.0022), magenta `#ff2bd6` (6.29:1), violeta `#b14bff` (5.10:1), cian `#2de2ff` (12.87:1), naranja `#ff9e2c` (9.76:1), blanco rosado `#fdf3ff` (18.63:1). glow 2.
  En ASTEROIDS: nave magenta, asteroides violeta (invierte cian/magenta de CLÁSICO para que no parezca un ajuste de tono).
- **RETRO:** fósforo verde monocromo. bg `#030d05` (lum 0.0032), `#3fbf4a` (8.24:1), `#7dff6e` (15.42:1), `#c8ff5a` (16.84:1), `#eaffe4` (18.73:1). glow 0.2.
  Jerarquía por brillo. Ámbar descartado solo por coherencia (un fósforo para todos).
- Para tetris (8 piezas distintas) el RETRO verde monocromo tendrá pocos tonos: quizá haga falta subir a 6 colores o usar Game Boy oscuro. Pensarlo antes de proponer.

**Why:** la guía exige que una skin parezca la misma familia en todos los juegos.
**How to apply:** parte de estos hex; si el usuario rechaza alguno, anota el motivo aquí y no lo repitas.

**Ampliaciones de ARKANOID (SPEC 12, 2026-10-19), sin validar:**
- NEÓN añade azul eléctrico `#4d7bff` (5.36:1), rosa coral `#ff5c8a` (6.85:1), lavanda `#e0c8ff` (13.30:1). Paleta del jugador = magenta `#ff2bd6`; pelota = `#fdf3ff`.
- RETRO añade verde profundo `#238b45` (4.56:1), salvia `#9fd0aa` (11.35:1), menta `#2ee6a0` (12.17:1), lima pálido `#e0ff9a` (17.81:1). Jugador = `#7dff6e`; pelota = `#eaffe4`.
- Útil para TETRIS (8 piezas): parte de estos hex. En RETRO verde, asignar tonos maximizando ΔE entre vecinos reales, no por orden de brillo (yellow/cyan quedaban a ΔE 26).
