import {
  BASE_STEP_MS,
  COLS,
  FRUITS_PER_LEVEL,
  MIN_STEP_MS,
  ROWS,
  STEP_MS_PER_LEVEL,
} from "./config";

/** Celda de la cuadrícula: x en 0..COLS−1, y en 0..ROWS−1. */
export interface Cell {
  x: number;
  y: number;
}

export type Dir = "up" | "down" | "left" | "right";

/** ms por paso: 125 en el nivel 1, 10 menos por nivel, mínimo 55. */
export function stepMsForLevel(level: number) {
  return Math.max(MIN_STEP_MS, BASE_STEP_MS - STEP_MS_PER_LEVEL * (level - 1));
}

/** Nivel tras comer `n` frutas: uno más cada 5. */
export function levelForFruits(n: number) {
  return 1 + Math.floor(n / FRUITS_PER_LEVEL);
}

/** Celda libre al azar con probabilidad uniforme, o null si el tablero está lleno. */
export function randomFreeCell(snake: readonly Cell[]): Cell | null {
  const taken = new Set(snake.map((c) => c.y * COLS + c.x));
  const free: Cell[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (!taken.has(y * COLS + x)) free.push({ x, y });
  if (free.length === 0) return null;
  return free[Math.floor(Math.random() * free.length)];
}

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOpposite(a: Dir, b: Dir) {
  return OPPOSITE[a] === b;
}
