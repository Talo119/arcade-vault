import type { SkinId } from "@/lib/engines/skins";
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

// Paleta del canvas. Cada skin define todos los colores, cómo se dibuja la
// fruta y el glow.
export interface SnakePalette {
  bg: string;
  grid: string; // cuadrícula de 1 px, decorativo
  border: string; // borde del tablero
  body: string;
  head: string;
  eyes: string; // ojos de 4×4 sobre la cabeza
  fruitGlow: string; // halo del sprite de la fruta, decorativo
  fruitFallback: string; // círculo de la fruta: si fruitSprite es false o si el PNG no carga
  fruitSprite: boolean; // true: sprite de fruits.png; false: círculo fruitFallback
  glow: number; // multiplica GLOW_BODY 10, GLOW_HEAD 12, GLOW_BORDER 12, GLOW_FALLBACK 12 y GLOW_FRUIT 10
}

export const SKINS: Record<SkinId, SnakePalette> = {
  // Tokens de :root
  clasico: {
    bg: "#000",
    grid: "rgba(0, 245, 255, 0.06)", // --cyan al 6 %
    border: "#00f5ff", // --cyan
    body: "#00ff88", // --green
    head: "#e6e9ff", // --ink
    eyes: "#000",
    fruitGlow: "rgba(230, 233, 255, 0.45)", // --ink al 45 %
    fruitFallback: "#ff006e", // --magenta
    fruitSprite: true,
    glow: 1,
  },
  // Synthwave: cuerpo magenta, cabeza cian, borde violeta
  neon: {
    bg: "#0a0418",
    grid: "rgba(177, 75, 255, 0.1)",
    border: "#b14bff",
    body: "#ff2bd6",
    head: "#2de2ff",
    eyes: "#0a0418",
    fruitGlow: "rgba(253, 243, 255, 0.45)",
    fruitFallback: "#ff9e2c",
    fruitSprite: true,
    glow: 2,
  },
  // Fósforo verde, monocromo: la fruta es el círculo, no el sprite a todo color
  retro: {
    bg: "#030d05",
    grid: "rgba(63, 191, 74, 0.1)",
    border: "#7dff6e",
    body: "#3fbf4a",
    head: "#eaffe4",
    eyes: "#030d05",
    fruitGlow: "rgba(200, 255, 90, 0.45)", // no se dibuja: fruitSprite es false
    fruitFallback: "#c8ff5a",
    fruitSprite: false,
    glow: 0.2,
  },
};
