"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import About from "@/components/screens/About";
import Auth from "@/components/screens/Auth";
import GameDetail from "@/components/screens/GameDetail";
import GamePlayer from "@/components/screens/GamePlayer";
import HallOfFame from "@/components/screens/HallOfFame";
import Home from "@/components/screens/Home";
import Library from "@/components/screens/Library";
import SignalLost from "@/components/screens/SignalLost";
import type { Game } from "@/lib/games";
import { GamesProvider } from "@/lib/games-context";
import { parseHash, toHash, type Route } from "@/lib/router";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = () => window.location.hash;
// The server never sees the hash, so it always renders the home.
const getServerHash = () => "";

export function useHashRoute(gameIds: readonly string[]) {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const route = useMemo(() => parseHash(hash, gameIds), [hash, gameIds]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [hash]);

  const navigate = useCallback((next: Route) => {
    window.location.hash = toHash(next);
  }, []);

  return { route, navigate };
}

const NO_GAME_IDS: readonly string[] = [];

/**
 * `games` is null when the catalog failed to load. Then parseHash gets no ids,
 * so game routes fall back to home, and the catalog screens (home, biblioteca,
 * salon) show <SignalLost />. Auth and About don't need the catalog.
 */
export default function App({ games }: { games: Game[] | null }) {
  const gameIds = useMemo(
    () => (games ? games.map((g) => g.id) : NO_GAME_IDS),
    [games],
  );
  const { route, navigate } = useHashRoute(gameIds);

  let screen: ReactNode;
  switch (route.name) {
    case "home":
      screen = games ? <Home /> : <SignalLost />;
      break;
    case "biblioteca":
      screen = games ? <Library navigate={navigate} /> : <SignalLost />;
      break;
    // detalle and player are only reachable with a catalog (see parseHash).
    case "detalle":
      screen = <GameDetail id={route.id} navigate={navigate} />;
      break;
    case "player":
      // key: a fresh run whenever the game changes.
      screen = <GamePlayer key={route.id} id={route.id} navigate={navigate} />;
      break;
    case "auth":
      screen = <Auth navigate={navigate} />;
      break;
    case "salon":
      screen = games ? <HallOfFame navigate={navigate} /> : <SignalLost />;
      break;
    case "about":
      screen = <About />;
      break;
  }

  const shell = (
    <>
      <Nav route={route} />
      <main className="av-main">{screen}</main>
      <Footer />
    </>
  );

  return games ? <GamesProvider games={games}>{shell}</GamesProvider> : shell;
}
