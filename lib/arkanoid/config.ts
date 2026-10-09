import type { BlockColor } from "./levels";

// Resolución lógica del canvas.
export const W = 800;
export const H = 600;

// Valores de game.js y spritesheet.js.
export const PADDLE_SPEED = 400; // px/s
export const PADDLE_Y = 560;
export const PADDLE_W = 81; // game.js:15 (el sprite mide 162, pero se dibuja a 81)
export const PADDLE_H = 14;
export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200; // px/s, × speed del nivel
export const BASE_BALL_VY = -300;
export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = 80; // (800 − 10 × 64) / 2
export const BLOCKS_ORIGIN_Y = 80;
export const POINTS_PER_BLOCK = 10;
export const START_LIVES = 3;
export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_FRAMES = 4;
export const MAX_DT = 0.05; // s

// Colores del canvas, copiados de los tokens de :root.
export const BLOCK_COLORS: Record<BlockColor, string> = {
  red: "#ff006e", // --magenta
  yellow: "#f5ff00", // --yellow
  cyan: "#00f5ff", // --cyan
  green: "#00ff88", // --green
  magenta: "#aa00ff", // violeta de .cover-tetro
  hotpink: "#ffae00", // naranja de .cover-bricks
  gray: "#c7d0e0", // --silver
};
export const COLORS = {
  bg: "#000",
  paddle: "#00f5ff", // --cyan
  ball: "#e6e9ff", // --ink
};
