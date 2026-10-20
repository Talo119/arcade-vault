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
  touch: {
    left: {
      pad: "row",
      buttons: [
        {
          code: "ArrowLeft",
          label: "←",
          aria: "Mover a la izquierda",
          repeat: true,
        },
        { code: "ArrowDown", label: "↓", aria: "Bajar", repeat: true },
        {
          code: "ArrowRight",
          label: "→",
          aria: "Mover a la derecha",
          repeat: true,
        },
      ],
    },
    right: {
      pad: "row",
      buttons: [
        { code: "ArrowUp", label: "ROTAR", aria: "Rotar" },
        { code: "Space", label: "CAÍDA", aria: "Caída" },
      ],
    },
  },
  create: createTetrisGame,
};
