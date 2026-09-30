"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import Auth from "@/components/screens/Auth";
import GameDetail from "@/components/screens/GameDetail";
import GamePlayer from "@/components/screens/GamePlayer";
import HallOfFame from "@/components/screens/HallOfFame";
import Home from "@/components/screens/Home";
import Library from "@/components/screens/Library";
import { parseHash, toHash, type Route } from "@/lib/router";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getHash = () => window.location.hash;
// The server never sees the hash, so it always renders the home.
const getServerHash = () => "";

export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, getHash, getServerHash);
  const route = useMemo(() => parseHash(hash), [hash]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [hash]);

  const navigate = useCallback((next: Route) => {
    window.location.hash = toHash(next);
  }, []);

  return { route, navigate };
}

export default function App() {
  const { route, navigate } = useHashRoute();

  let screen: ReactNode;
  switch (route.name) {
    case "home":
      screen = <Home />;
      break;
    case "biblioteca":
      screen = <Library navigate={navigate} />;
      break;
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
      screen = <HallOfFame navigate={navigate} />;
      break;
  }

  return (
    <>
      <Nav route={route} />
      <main className="av-main">{screen}</main>
      <Footer />
    </>
  );
}
