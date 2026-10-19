import type { EngineDefinition } from "@/lib/engines/types";
import { H, SKINS, W } from "./config";
import { createSnakeGame } from "./engine";

export const snakeEngine: EngineDefinition = {
  id: "snake",
  width: W, // 768
  height: H, // 576
  initialStats: { score: 0, level: 1, lives: null },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "MOVER" },
    { keys: ["W", "A", "S", "D"], label: "MOVER" },
  ],
  skins: SKINS,
  create: createSnakeGame,
};
