import { arkanoidEngine } from "@/lib/arkanoid/definition";
import { asteroidsEngine } from "@/lib/asteroids/definition";
import { tetrisEngine } from "@/lib/tetris/definition";
import type { EngineDefinition } from "./types";

// La clave es igual a definition.id y a games.id.
export const ENGINES: Record<string, EngineDefinition> = {
  asteroids: asteroidsEngine,
  tetris: tetrisEngine,
  arkanoid: arkanoidEngine,
};

export function getEngine(id: string): EngineDefinition | undefined {
  // hasOwn: un id como "constructor" no debe devolver un miembro de Object.prototype.
  return Object.hasOwn(ENGINES, id) ? ENGINES[id] : undefined;
}
