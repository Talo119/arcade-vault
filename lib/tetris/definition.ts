import type { EngineDefinition } from "@/lib/engines/types";
import { H, W } from "./config";
import { createTetrisGame } from "./engine";

export const tetrisEngine: EngineDefinition = {
  id: "tetris",
  width: W, // 450
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: null },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "→"], label: "MOVER" },
    { keys: ["↑", "X"], label: "ROTAR" },
    { keys: ["↓"], label: "BAJAR" },
    { keys: ["ESPACIO"], label: "CAÍDA" },
  ],
  create: createTetrisGame,
};
