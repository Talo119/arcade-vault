import type { BlockColor } from "./levels";

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ball {
  x: number;
  y: number;
  w: number; // caja de choque de 16×16, aunque se dibuje como círculo
  h: number;
  vx: number; // px/s
  vy: number;
}

export interface Block {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

export interface Explosion {
  x: number; // esquina del bloque roto
  y: number;
  color: BlockColor;
  elapsed: number; // ms
}

// Solape de cajas, como game.js:61-68.
export function collideAABB(ball: Ball, block: Block): boolean {
  return (
    ball.x < block.x + block.w &&
    ball.x + ball.w > block.x &&
    ball.y < block.y + block.h &&
    ball.y + ball.h > block.y
  );
}
