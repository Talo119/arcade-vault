import {
  COLS,
  LANES,
  LOOP,
  SPEED_MAX_LEVEL,
  SPEED_STEP,
  TURTLE_BLINK,
  TURTLE_CYCLE,
  TURTLE_DIVE,
  TURTLE_WARN,
  type LaneSpec,
} from "./config";

/** Tronco, tortuga o vehículo. `x` es el borde izquierdo, en celdas y con decimales. */
export interface Entity {
  x: number;
  dive: number | null; // desfase del ciclo de inmersión en s; null → no se sumerge
}

/** Carril en juego: la fila de la tabla LANES con la velocidad del nivel. */
export interface Lane extends Omit<LaneSpec, "xs" | "dive"> {
  speed: number; // celdas/s, ya multiplicada por speedFactor(level)
  entities: Entity[];
  t: number; // reloj del carril en s; marca el ciclo de las tortugas
}

/** "blinkOn"/"blinkOff": a flote, parpadeando. Solo "dive" deja de servir de apoyo. */
export type TurtleState = "float" | "blinkOn" | "blinkOff" | "dive";

/** 1,15 ^ (nivel − 1), sin pasar del nivel 8 (×2,66). */
export function speedFactor(level: number) {
  return SPEED_STEP ** (Math.min(level, SPEED_MAX_LEVEL) - 1);
}

/** Carriles con sus `x` iniciales y el reloj de tortugas a 0. */
export function buildLanes(level: number): Lane[] {
  const factor = speedFactor(level);
  return LANES.map(({ xs, dive, ...spec }) => ({
    ...spec,
    speed: spec.speed * factor,
    entities: xs.map((x, i) => ({ x, dive: dive?.[i] ?? null })),
    t: 0,
  }));
}

/** Avanza cada carril y lo cierra en un bucle de LOOP celdas, conservando los huecos. */
export function updateLanes(lanes: Lane[], dt: number) {
  for (const lane of lanes) {
    lane.t += dt;
    const dx = lane.speed * lane.dir * dt;
    for (const e of lane.entities) {
      e.x += dx;
      if (lane.dir > 0 && e.x >= COLS) e.x -= LOOP;
      else if (lane.dir < 0 && e.x + lane.width <= 0) e.x += LOOP;
    }
  }
}

/** Fase del ciclo de 4,5 s: a flote, parpadeo de 0,5 s y 1,5 s sumergida. */
export function turtleState(lane: Lane, entity: Entity): TurtleState {
  if (entity.dive === null) return "float";
  const t = (lane.t + entity.dive) % TURTLE_CYCLE;
  if (t < TURTLE_WARN) return "float";
  if (t < TURTLE_DIVE)
    return Math.floor((t - TURTLE_WARN) / TURTLE_BLINK) % 2 === 0
      ? "blinkOn"
      : "blinkOff";
  return "dive";
}
