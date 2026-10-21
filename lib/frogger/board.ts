import {
  BASE_TIME,
  FROG_HITBOX,
  MIN_TIME,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  TIME_PER_LEVEL,
} from "./config";
import { turtleState, type Entity, type Lane } from "./lanes";

export type Dir = "up" | "down" | "left" | "right";

export interface Frog {
  x: number; // columna, con decimales mientras va sobre el río
  row: number; // entera
  jump: {
    fromX: number;
    fromRow: number;
    toX: number;
    toRow: number;
    t: number; // ms transcurridos del salto
  } | null;
  maxRow: number; // la fila más alta (menor) alcanzada desde que apareció
}

/** Columna izquierda de cada boca de 2 columnas de la fila 0. El resto es muro. */
export const GOAL_COLS = [1, 4, 7, 10, 13] as const;

/** Índice de la boca (0–4) bajo el centro de la rana, o null si es muro. */
export function goalAt(x: number): number | null {
  const col = Math.floor(x + 0.5);
  const i = GOAL_COLS.findIndex((c) => col === c || col === c + 1);
  return i === -1 ? null : i;
}

function laneAt(lanes: readonly Lane[], row: number) {
  return lanes.find((lane) => lane.row === row);
}

/** La hitbox [x + 0,15, x + 0,85] se solapa con algún vehículo de su fila. */
export function vehicleHits(frog: Frog, lanes: readonly Lane[]) {
  const lane = laneAt(lanes, frog.row);
  if (!lane || (lane.kind !== "car" && lane.kind !== "truck")) return false;
  const left = frog.x + FROG_HITBOX[0];
  const right = frog.x + FROG_HITBOX[1];
  return lane.entities.some((e) => left < e.x + lane.width && right > e.x);
}

/** Tronco o tortuga a flote bajo el centro de la rana, o null (agua o tortuga sumergida). */
export function supportAt(frog: Frog, lanes: readonly Lane[]): Entity | null {
  const lane = laneAt(lanes, frog.row);
  if (!lane || (lane.kind !== "log" && lane.kind !== "turtle")) return null;
  const center = frog.x + 0.5;
  const entity = lane.entities.find(
    (e) => center >= e.x && center < e.x + lane.width,
  );
  if (!entity) return null;
  if (lane.kind === "turtle" && turtleState(lane, entity) === "dive")
    return null;
  return entity;
}

/** Reloj por rana: 30 s en el nivel 1, 2 s menos por nivel, mínimo 16. */
export function roundTime(level: number) {
  return Math.max(MIN_TIME, BASE_TIME - TIME_PER_LEVEL * (level - 1));
}

export function isRiverRow(row: number) {
  return row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT;
}
