import type { SkinId } from "@/lib/engines/skins";

// Resolución lógica del canvas.
export const W = 800;
export const H = 600;

// Indexados por tamaño de asteroide: 1 pequeño, 2 mediano, 3 grande.
export const RADII = [0, 16, 30, 50];
export const SPEEDS = [0, 85, 55, 32];
export const POINTS = [0, 100, 50, 20];

export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;

// Paleta del canvas. Cada skin define todos los colores y el glow.
export interface AsteroidsPalette {
  bg: string;
  ship: string; // nave y su explosión
  bullet: string;
  asteroid: string; // asteroides y su explosión
  powerUp: string; // rombo, texto "3x" y contador "3x N.Ns" del canvas
  thrust: string; // llama del propulsor
  glow: number; // multiplicador de shadowBlur; 1 = GLOW_BASE
}

// shadowBlur con glow 1.
export const GLOW_BASE = 10;

export const SKINS: Record<SkinId, AsteroidsPalette> = {
  // Tokens de :root
  clasico: {
    bg: "#000",
    ship: "#00f5ff", // --cyan
    bullet: "#e6e9ff", // --ink
    asteroid: "#ff006e", // --magenta
    powerUp: "#00ff88", // --green
    thrust: "#f5ff00", // --yellow
    glow: 1,
  },
  neon: {
    bg: "#0a0418",
    ship: "#ff2bd6",
    bullet: "#fdf3ff",
    asteroid: "#b14bff",
    powerUp: "#2de2ff",
    thrust: "#ff9e2c",
    glow: 2,
  },
  // Fósforo verde: la jerarquía se lee por brillo
  retro: {
    bg: "#030d05",
    ship: "#7dff6e",
    bullet: "#eaffe4",
    asteroid: "#3fbf4a",
    powerUp: "#c8ff5a",
    thrust: "#c8ff5a",
    glow: 0.2,
  },
};
