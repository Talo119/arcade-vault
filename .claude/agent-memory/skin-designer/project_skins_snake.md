---
name: project-skins-snake
description: SPEC 13 skins de SNAKE (2026-10-19, Draft): paletas NEÓN/RETRO elegidas, decisión del sprite de fruta (RETRO usa el círculo fallback vía fruitSprite:false) y pendientes
metadata:
  type: project
---

2026-10-19: escrito `specs/13-skins-snake.md` (hoy Implemented; era Draft, depende de SPEC 11 y 10), pedido por el agente principal con número fijo 13 (el 12 lo usaba arkanoid en paralelo).
SPEC 11 seguía en Draft; `lib/engines/skins.ts` no existía. SNAKE sin colores sueltos fuera de `config.ts`.

- NEÓN: cuerpo `#ff2bd6`, cabeza `#2de2ff`, borde `#b14bff`, ojos = bg, halo fruta `rgba(253,243,255,0.45)`, fallback `#ff9e2c`, glow 2. Mínimo 5.10:1 (borde).
- RETRO: cuerpo `#3fbf4a`, cabeza `#eaffe4`, borde `#7dff6e`, fruta círculo `#c8ff5a`, glow 0.2. Mínimo 8.24:1.
- Sprite: NEÓN lo mantiene; RETRO no lo dibuja (`fruitSprite: false` en la paleta, única clave no-color). Teñir con `source-in` descartado por ser procesar sprites (fuera del SPEC 11).
- Halo naranja en NEÓN descartado (2.67:1 y mismo tono que el fallback).
- El script de contraste falla si el bg no es oscuro: los ojos se miden pasando `eyes` como bg y `head` como color.

**Why:** el usuario aún no ha validado ninguna de estas elecciones.
**How to apply:** si el usuario acepta o rechaza el sprite en RETRO o la cabeza cian, anótalo aquí y en [[skin-color-families]]. Ver [[project-skins-audit]].
