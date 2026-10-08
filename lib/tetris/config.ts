// Resolución lógica del canvas: tablero de 300×600 y columna lateral de 150.
export const W = 450;
export const H = 600;

export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;
export const BOARD_W = COLS * BLOCK; // 300

// Valores de game.js.
export const LINE_SCORES = [0, 100, 300, 500, 800]; // × nivel
export const START_INTERVAL = 1000; // ms por fila en el nivel 1
export const INTERVAL_STEP = 90; // ms menos por nivel
export const MIN_INTERVAL = 100;
export const LINES_PER_LEVEL = 10;
export const MAX_SCORE = 9_999_999; // CHECK de public.scores

// Colores del canvas, copiados de los tokens de :root.
export const PIECE_COLORS = [
  "", // 0: celda vacía
  "#00f5ff", // 1 I — --cyan
  "#f5ff00", // 2 O — --yellow
  "#ff006e", // 3 T — --magenta
  "#00ff88", // 4 S — --green
  "#ff7700", // 5 Z — naranja de .cover-tetro
  "#aa00ff", // 6 J — violeta de .cover-tetro
  "#ffcf3a", // 7 L — --gold
  "#c7d0e0", // 8 N (tuerca) — --silver
];
export const COLORS = {
  bg: "#000",
  panelBg: "#0f0f18", // --bg-2
  grid: "rgba(255, 255, 255, 0.06)", // --line-2
  divider: "rgba(0, 245, 255, 0.18)", // --line
  label: "#8a8fb5", // --ink-dim
  value: "#e6e9ff", // --ink
};
