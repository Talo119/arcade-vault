import type { SkinId } from "@/lib/engines/skins";

// Resolución lógica del canvas: cuadrícula de COLS×ROWS celdas de CELL px.
export const CELL = 40; // px
export const COLS = 16;
export const ROWS = 15; // 14 filas jugables + la fila 14 del reloj
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 600

// Zonas del tablero, de arriba abajo.
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_BANK = 7; // orilla segura
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
export const ROW_TIMER = 14; // no jugable
export const START = { x: 7, row: 13 };

export const JUMP_MS = 120;
export const LOOP = 20; // celdas del bucle de cada carril: 16 visibles + 4 fuera
export const SPEED_STEP = 1.15; // por nivel
export const SPEED_MAX_LEVEL = 8; // desde aquí no acelera más
export const BASE_TIME = 30; // s, nivel 1
export const TIME_PER_LEVEL = 2; // s menos por nivel
export const MIN_TIME = 16; // s
export const POINTS_STEP = 10;
export const POINTS_GOAL = 50;
export const POINTS_ROUND = 200;
export const POINTS_PER_SECOND = 10; // bonus por segundo restante al ocupar una boca
export const TURTLE_CYCLE = 4.5; // s
export const TURTLE_WARN = 2.5; // s: desde aquí parpadea
export const TURTLE_DIVE = 3; // s: desde aquí está sumergida
export const TURTLE_BLINK = 0.1; // s por medio parpadeo
export const DEAD_MS = 1000;
export const FROG_HITBOX = [0.15, 0.85]; // fracción de celda ocupada en x
export const MAX_DT = 0.05; // s
export const MAX_SCORE = 9_999_999;
export const GLOW_BASE = 10; // px de shadowBlur con glow 1

// Color de la paleta con que se dibuja cada carril.
export type LaneColor = "carA" | "carB" | "carC" | "truck" | "log" | "turtle";

export interface LaneSpec {
  row: number;
  dir: 1 | -1; // 1 → derecha, −1 → izquierda
  kind: "log" | "turtle" | "truck" | "car";
  color: LaneColor;
  width: number; // celdas
  speed: number; // celdas/s en el nivel 1
  xs: readonly number[]; // borde izquierdo inicial de cada entidad, en celdas
  // Desfase del ciclo de inmersión de cada grupo de tortugas, en s; null → no se sumerge
  dive?: readonly (number | null)[];
}

// Carriles del nivel 1. Las tortugas que se sumergen son el 2.º y el 4.º grupo;
// el 4.º va medio ciclo (2,25 s) por detrás.
export const LANES: readonly LaneSpec[] = [
  {
    row: 1,
    dir: 1,
    kind: "log",
    color: "log",
    width: 4,
    speed: 2,
    xs: [0, 7, 14],
  },
  {
    row: 2,
    dir: 1,
    kind: "log",
    color: "log",
    width: 2,
    speed: 3,
    xs: [2, 8, 14],
  },
  {
    row: 3,
    dir: -1,
    kind: "turtle",
    color: "turtle",
    width: 2,
    speed: 2,
    xs: [1, 6, 11, 16],
    dive: [null, 0, null, TURTLE_CYCLE / 2],
  },
  {
    row: 4,
    dir: 1,
    kind: "log",
    color: "log",
    width: 4,
    speed: 2.5,
    xs: [0, 10],
  },
  {
    row: 5,
    dir: 1,
    kind: "log",
    color: "log",
    width: 3,
    speed: 1.5,
    xs: [0, 7, 14],
  },
  {
    row: 6,
    dir: -1,
    kind: "turtle",
    color: "turtle",
    width: 3,
    speed: 1.75,
    xs: [0, 5, 10, 15],
    dive: [null, 0, null, TURTLE_CYCLE / 2],
  },
  {
    row: 8,
    dir: -1,
    kind: "truck",
    color: "truck",
    width: 3,
    speed: 2.25,
    xs: [1, 11],
  },
  {
    row: 9,
    dir: 1,
    kind: "car",
    color: "carC",
    width: 1,
    speed: 4,
    xs: [5, 15],
  },
  {
    row: 10,
    dir: -1,
    kind: "truck",
    color: "truck",
    width: 2,
    speed: 1.75,
    xs: [3, 13],
  },
  {
    row: 11,
    dir: 1,
    kind: "car",
    color: "carB",
    width: 1,
    speed: 2.5,
    xs: [0, 7, 14],
  },
  {
    row: 12,
    dir: -1,
    kind: "car",
    color: "carA",
    width: 1,
    speed: 2,
    xs: [2, 9, 16],
  },
];

// Paleta del canvas. Cada skin define todos los colores y el glow.
export interface FroggerPalette {
  bg: string;
  water: string;
  safe: string;
  laneLine: string;
  wall: string;
  bayBorder: string;
  frog: string;
  eye: string;
  pupil: string;
  deadMark: string;
  carA: string; // fila 12
  carB: string; // fila 11
  carC: string; // fila 9
  truck: string;
  log: string;
  turtle: string;
  timerHigh: string;
  timerMid: string;
  timerLow: string;
  glow: number; // multiplica GLOW_BASE
}

export const SKINS: Record<SkinId, FroggerPalette> = {
  // Tokens de :root
  clasico: {
    bg: "#000",
    water: "rgba(0, 245, 255, 0.08)", // --cyan al 8 %
    safe: "rgba(0, 255, 136, 0.1)", // --green al 10 %
    laneLine: "rgba(230, 233, 255, 0.25)", // --ink al 25 %
    wall: "rgba(0, 255, 136, 0.35)", // --green al 35 %
    bayBorder: "#f5ff00", // --yellow
    frog: "#00ff88", // --green
    eye: "#e6e9ff", // --ink
    pupil: "#000",
    deadMark: "#e6e9ff", // --ink
    carA: "#00f5ff", // --cyan
    carB: "#ff006e", // --magenta
    carC: "#f5ff00", // --yellow
    truck: "#e6e9ff", // --ink
    log: "#f5ff00", // --yellow
    turtle: "#ff006e", // --magenta
    timerHigh: "#00ff88", // --green
    timerMid: "#f5ff00", // --yellow
    timerLow: "#ff006e", // --magenta
    glow: 1,
  },
  // Synthwave: rana cian, troncos naranja, tortugas magenta
  neon: {
    bg: "#0a0418",
    water: "rgba(45, 226, 255, 0.1)",
    safe: "rgba(177, 75, 255, 0.14)",
    laneLine: "rgba(253, 243, 255, 0.25)",
    wall: "rgba(177, 75, 255, 0.4)",
    bayBorder: "#ff9e2c",
    frog: "#2de2ff",
    eye: "#fdf3ff",
    pupil: "#0a0418",
    deadMark: "#fdf3ff",
    carA: "#2de2ff",
    carB: "#ff2bd6",
    carC: "#ff9e2c",
    truck: "#fdf3ff",
    log: "#ff9e2c",
    turtle: "#ff2bd6",
    timerHigh: "#2de2ff",
    timerMid: "#ff9e2c",
    timerLow: "#ff2bd6",
    glow: 2,
  },
  // Fósforo verde, monocromo
  retro: {
    bg: "#030d05",
    water: "rgba(63, 191, 74, 0.1)",
    safe: "rgba(125, 255, 110, 0.12)",
    laneLine: "rgba(63, 191, 74, 0.3)",
    wall: "rgba(63, 191, 74, 0.4)",
    bayBorder: "#c8ff5a",
    frog: "#eaffe4",
    eye: "#030d05",
    pupil: "#c8ff5a",
    deadMark: "#c8ff5a",
    carA: "#7dff6e",
    carB: "#c8ff5a",
    carC: "#7dff6e",
    truck: "#c8ff5a",
    log: "#7dff6e",
    turtle: "#3fbf4a",
    timerHigh: "#3fbf4a",
    timerMid: "#7dff6e",
    timerLow: "#eaffe4",
    glow: 0.2,
  },
};
