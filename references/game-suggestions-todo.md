# Sugerencias de juegos — To Do

> Mantenido por el agente `game-planner` (`.claude/agents/game-planner.md`). No borres items: márcalos y muévelos de sección.
> `[ ]` pendiente · `[x]` hecho (con spec) · `[~]` descartado (con motivo)

## Pendientes

- [ ] **SPACE INVADERS** (`space-invaders`) · SHOOTER · green · sustituye `invasores` · esfuerzo M · sugerido 2026-10-13
  - Por qué: el score-attack arcade por excelencia; equilibra el catálogo real (2 ARCADE, 1 SHOOTER) y reaprovecha fila, portada `cover-invaders` y patrones de disparo/colisión de `lib/asteroids/`. Se diferencia de Asteroids en que el cañón solo se mueve en horizontal, hay formación que baja y acelera, escudos destructibles y platillo de bonus.
  - Siguiente paso: `/nuevo-juego space-invaders: sustituye al simulado invasores (SHOOTER, green, cover-invaders); cañón horizontal con un disparo en pantalla, formación de 5x11 alienígenas que baja y acelera, 4 escudos destructibles y platillo de bonus; puntos 10/20/30 por fila y 50-300 por platillo, oleadas = nivel, 3 vidas`
- [ ] **FROGGER** (`frogger`) · ARCADE · green · sustituye `ranaria` · esfuerzo M · sugerido 2026-10-13
  - Por qué: mecánica de cruzar carriles que no existe en el catálogo, muy viable (carriles con objetos en bucle sobre una cuadrícula) y reaprovecha fila y portada `cover-rana`. Resta que sería el tercer ARCADE real.
  - Siguiente paso: `/nuevo-juego frogger: sustituye al simulado ranaria (ARCADE, green, cover-rana); rana en cuadrícula que cruza 5 carriles de coches y 5 de troncos/tortugas hasta 5 nenúfares con temporizador; 10 puntos por paso nuevo hacia arriba, 50 por rana a casa, bonus por tiempo restante y 1000 al llenar los 5; nivel acelera carriles, 3 vidas`
- [ ] **PAC-MAN** (`pacman`) · ARCADE · yellow · sustituye `gloton` · esfuerzo L · sugerido 2026-10-13
  - Por qué: el clásico más icónico y muy competitivo, reaprovecha fila y portada `cover-glot`; pero el laberinto, el túnel y la IA de cuatro fantasmas (scatter/chase/frightened) lo hacen el más costoso, y sería otro ARCADE.
  - Siguiente paso: `/nuevo-juego pacman: sustituye al simulado gloton (ARCADE, yellow, cover-glot); laberinto de un nivel con túnel, 240 puntos (10) y 4 píldoras (50) que asustan a 4 fantasmas con IA scatter/chase/frightened (200/400/800/1600), fruta de bonus; nivel = laberinto limpiado, 3 vidas`

## Hechos

## Descartados
