import { asteroidsEngine } from "@/lib/asteroids/definition";
import type { EngineDefinition } from "./types";

// La clave es igual a definition.id y a games.id.
export const ENGINES: Record<string, EngineDefinition> = {
  asteroids: asteroidsEngine,
};

export function getEngine(id: string): EngineDefinition | undefined {
  // hasOwn: un id como "constructor" no debe devolver un miembro de Object.prototype.
  return Object.hasOwn(ENGINES, id) ? ENGINES[id] : undefined;
}
