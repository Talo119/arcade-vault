export type AsteroidsPhase = "ready" | "playing" | "dead" | "gameover";

export interface AsteroidsStats {
  score: number;
  lives: number;
  level: number;
}

export interface AsteroidsCallbacks {
  onStats: (stats: AsteroidsStats) => void; // solo cuando cambia algún valor
  onPhase: (phase: AsteroidsPhase) => void; // en cada cambio de fase
}

export interface AsteroidsGame {
  setPaused: (paused: boolean) => void;
  end: () => void; // FIN: pasa a "gameover" si aún no lo está
  destroy: () => void; // cancela el rAF y quita las escuchas
}
