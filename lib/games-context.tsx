"use client";

// Exposes the catalog loaded on the server to every screen without
// threading it through props.

import { createContext, useContext, type ReactNode } from "react";
import type { Game } from "@/lib/games";

const GamesContext = createContext<Game[] | null>(null);

export function GamesProvider({
  games,
  children,
}: {
  games: Game[];
  children: ReactNode;
}): ReactNode {
  return <GamesContext value={games}>{children}</GamesContext>;
}

export function useGames(): Game[] {
  const games = useContext(GamesContext);
  if (games === null) {
    throw new Error("useGames debe usarse dentro de <GamesProvider>");
  }
  return games;
}
