import type { SkinId } from "@/lib/engines/skins";
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

// Paleta del canvas. Cada skin define todos los colores y el glow.
export interface ArkanoidPalette {
  bg: string;
  paddle: string;
  ball: string;
  blocks: Record<BlockColor, string>; // bloques y los trozos de su explosión
  shine: string; // franja de 4 px arriba de bloques y paleta; decorativo
  glow: number; // multiplica GLOW_BLOCK 4, GLOW_SHARD 12, GLOW_PADDLE 14 y GLOW_BALL 12
}

export const SKINS: Record<SkinId, ArkanoidPalette> = {
  // Tokens de :root
  clasico: {
    bg: "#000",
    paddle: "#00f5ff", // --cyan
    ball: "#e6e9ff", // --ink
    blocks: {
      red: "#ff006e", // --magenta
      yellow: "#f5ff00", // --yellow
      cyan: "#00f5ff", // --cyan
      green: "#00ff88", // --green
      magenta: "#aa00ff", // violeta de .cover-tetro
      hotpink: "#ffae00", // naranja de .cover-bricks
      gray: "#c7d0e0", // --silver
    },
    shine: "rgba(255, 255, 255, 0.12)",
    glow: 1,
  },
  // Muro de atardecer synthwave: sin verde, sin amarillo y sin plata
  neon: {
    bg: "#0a0418",
    paddle: "#ff2bd6",
    ball: "#fdf3ff",
    blocks: {
      red: "#ff2bd6",
      yellow: "#ff9e2c",
      cyan: "#2de2ff",
      green: "#4d7bff",
      magenta: "#b14bff",
      hotpink: "#ff5c8a",
      gray: "#e0c8ff",
    },
    shine: "rgba(253, 243, 255, 0.18)",
    glow: 2,
  },
  // Fósforo verde, plano: sin franja de brillo
  retro: {
    bg: "#030d05",
    paddle: "#7dff6e",
    ball: "#eaffe4",
    blocks: {
      red: "#3fbf4a",
      yellow: "#9fd0aa",
      cyan: "#2ee6a0",
      green: "#7dff6e",
      magenta: "#238b45",
      hotpink: "#e0ff9a",
      gray: "#c8ff5a",
    },
    shine: "rgba(0, 0, 0, 0)",
    glow: 0.2,
  },
};
