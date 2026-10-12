import type { Cell, Dir } from "./board";

// Resolución lógica del canvas: cuadrícula de COLS×ROWS celdas de CELL px.
export const CELL = 32; // px; los sprites pixel-art (160 px, "píxeles" de 10) se ven a escala 1/5 exacta
export const COLS = 24;
export const ROWS = 18;
export const W = COLS * CELL; // 768
export const H = ROWS * CELL; // 576

export const START_SNAKE: readonly Cell[] = [
  { x: 6, y: 9 },
  { x: 5, y: 9 },
  { x: 4, y: 9 },
]; // cabeza primero
export const START_DIR: Dir = "right";
export const FIRST_FRUIT: Cell = { x: 17, y: 9 };
export const BASE_STEP_MS = 125; // nivel 1: 8 celdas/s
export const STEP_MS_PER_LEVEL = 10;
export const MIN_STEP_MS = 55;
export const FRUITS_PER_LEVEL = 5;
export const POINTS_PER_FRUIT = 10; // × nivel
export const MAX_DT = 0.05; // s

// Colores del canvas, copiados de los tokens de :root.
export const COLORS = {
  bg: "#000",
  grid: "rgba(0, 245, 255, 0.06)", // --cyan al 6 %
  border: "#00f5ff", // --cyan
  body: "#00ff88", // --green
  head: "#e6e9ff", // --ink
  eyes: "#000",
  fruitGlow: "rgba(230, 233, 255, 0.45)", // --ink al 45 %, halo de la fruta
  fruitFallback: "#ff006e", // --magenta, solo si el PNG no carga
};
