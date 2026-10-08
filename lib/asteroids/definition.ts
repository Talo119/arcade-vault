import type { EngineDefinition } from "@/lib/engines/types";
import { H, W } from "./config";
import { createAsteroidsGame } from "./engine";

export const asteroidsEngine: EngineDefinition = {
  id: "asteroids",
  width: W, // 800
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [
    { keys: ["←", "→"], label: "ROTAR" },
    { keys: ["↑"], label: "PROPULSAR" },
    { keys: ["ESPACIO"], label: "DISPARAR" },
  ],
  create: createAsteroidsGame,
};
