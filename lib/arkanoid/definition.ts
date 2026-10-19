import type { EngineDefinition } from "@/lib/engines/types";
import { H, SKINS, W } from "./config";
import { createArkanoidGame } from "./engine";

export const arkanoidEngine: EngineDefinition = {
  id: "arkanoid",
  width: W, // 800
  height: H, // 600
  initialStats: { score: 0, level: 1, lives: 3 },
  startPrompt: "PULSA ESPACIO PARA EMPEZAR",
  controls: [{ keys: ["←", "→"], label: "MOVER" }],
  skins: SKINS,
  create: createArkanoidGame,
};
