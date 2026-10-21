import type { EngineDefinition } from "@/lib/engines/types";
import { H, SKINS, W } from "./config";
import { createFroggerGame } from "./engine";

export const froggerEngine: EngineDefinition = {
  id: "frogger",
  width: W, // 640
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "SALTAR" },
    { keys: ["W", "A", "S", "D"], label: "SALTAR" },
  ],
  skins: SKINS,
  touch: {
    // "cross": orden ↑ ← → ↓
    left: {
      pad: "cross",
      buttons: [
        { code: "ArrowUp", label: "↑", aria: "Saltar arriba" },
        { code: "ArrowLeft", label: "←", aria: "Saltar a la izquierda" },
        { code: "ArrowRight", label: "→", aria: "Saltar a la derecha" },
        { code: "ArrowDown", label: "↓", aria: "Saltar abajo" },
      ],
    },
    right: { pad: "row", buttons: [] },
  },
  create: createFroggerGame,
};
