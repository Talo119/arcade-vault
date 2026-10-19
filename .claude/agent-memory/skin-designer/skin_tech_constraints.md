---
name: skin-tech-constraints
description: Restricciones técnicas para skins halladas en la auditoría 2026-10-17 (colores sueltos por juego, overlay de pausa translúcido, partículas con hex fijo, PNG de snake)
metadata:
  type: project
---

Verifica con grep antes de citarlas: pueden haber cambiado.

- Overlay EN PAUSA es `rgba(0,0,0,0.6)` y el rAF se cancela en pausa: `setSkin` en pausa debe dibujar un frame sin `update`.
- ASTEROIDS: `Particle` guardaba el hex al crearse; se propuso guardar `kind`. Glow fijo 10 (entities.ts y engine.ts). `powerUp` también es texto del canvas → 4.5:1.
- TETRIS, colores sueltos: `engine.ts:234` `rgba(255,255,255,0.12)` y `engine.ts:326` `rgba(230,233,255,0.5)` (sombra del texto). Panel `panelBg #0f0f18`: label/value se miden contra él a 4.5:1. Glow 14/6.
- ARKANOID, suelto: `engine.ts:50` `SHINE = rgba(255,255,255,0.12)`. Glow 4/12/14/12.
- SNAKE: fruta es PNG (`public/games/snake/fruits.png`), no se recolorea; hay `fruitFallback`. Glow 10–12 en hasta 432 segmentos (caro con NEÓN). Constantes `GLOW_*` en `engine.ts:46-52`. Sin colores sueltos fuera de `config.ts` (2026-10-19).
- `GamePlayer` va con `key={route.id}` y nunca se renderiza en servidor (hash): el `useState` perezoso con `localStorage` es seguro.
- No hay simulados con canvas: gloton, invasores, ranaria, duelo-pixel.
- ARKANOID (revisado 2026-10-19): `Explosion.color` ya guarda la clave `BlockColor`, no el hex, así que recolorea sola con `setSkin`. Único suelto: `engine.ts:50` `SHINE`. Glow 4/12/14/12 en `engine.ts:42-45`. Sin texto en canvas. `ready` es determinista (captura idéntica a main). Halo de la pelota en NEÓN (24) tiñe el centro de la paleta: medir la paleta contando píxeles, no un punto.
- Conflicto de guía: RETRO 4–6 colores vs. 7 tipos de bloque distintos en ARKANOID → mínimo 9 hex. Se priorizó la distinción; anotado como decisión a revisar.
