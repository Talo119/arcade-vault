import type { SkinId } from "./skins";

export type EnginePhase = "ready" | "playing" | "dead" | "gameover";

export interface EngineStats {
  score: number;
  level: number;
  lives: number | null; // null → juego sin vidas; el HUD muestra "—"
}

export interface EngineCallbacks {
  onStats: (stats: EngineStats) => void; // solo cuando cambia algún valor
  onPhase: (phase: EnginePhase) => void; // en cada cambio de fase
}

export interface GameEngine {
  setPaused: (paused: boolean) => void;
  end: () => void; // FIN: pasa a "gameover" si aún no lo está
  destroy: () => void; // cancela el rAF y quita las escuchas
  setSkin?: (skin: SkinId) => void; // cambia la paleta en caliente; opcional mientras haya motores sin skins
}

export interface EngineControl {
  keys: string[]; // texto de cada <kbd>, p. ej. ["←", "→"]
  label: string; // p. ej. "ROTAR"
}

export interface EngineDefinition {
  id: string; // igual que games.id
  width: number; // resolución lógica del canvas
  height: number;
  initialStats: EngineStats; // lo que muestra el HUD antes del primer onStats
  startPrompt: string; // p. ej. "PULSA ESPACIO PARA EMPEZAR"
  controls: EngineControl[]; // sin la P: el player la añade siempre
  skins?: Record<SkinId, unknown>; // el SKINS del config.ts del juego; sin él, el player no muestra selector
  create: (
    canvas: HTMLCanvasElement,
    callbacks: EngineCallbacks,
    skin: SkinId, // skin inicial; los motores sin skins la ignoran
  ) => GameEngine;
}
