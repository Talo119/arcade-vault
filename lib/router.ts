import { GAMES } from "@/lib/games";

export type Route =
  | { name: "home" }
  | { name: "biblioteca" }
  | { name: "detalle"; id: string }
  | { name: "player"; id: string }
  | { name: "auth" }
  | { name: "salon" };

const HOME: Route = { name: "home" };

const isGameId = (id: string) => GAMES.some((g) => g.id === id);

/**
 * Hash ↔ route map:
 *   "#/" or ""     → home
 *   "#/biblioteca" → biblioteca
 *   "#/juego/:id"  → detalle
 *   "#/jugar/:id"  → player
 *   "#/acceso"     → auth
 *   "#/salon"      → salon
 * Unknown hashes and unknown game ids fall back to home.
 */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#/, "").split("/").filter(Boolean);
  const [head, id, ...rest] = parts;
  if (rest.length > 0) return HOME;

  if (id === undefined) {
    if (head === undefined) return HOME;
    if (head === "biblioteca") return { name: "biblioteca" };
    if (head === "acceso") return { name: "auth" };
    if (head === "salon") return { name: "salon" };
    return HOME;
  }

  let gameId: string;
  try {
    gameId = decodeURIComponent(id);
  } catch {
    return HOME;
  }
  if (!isGameId(gameId)) return HOME;
  if (head === "juego") return { name: "detalle", id: gameId };
  if (head === "jugar") return { name: "player", id: gameId };
  return HOME;
}

export function toHash(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "biblioteca":
      return "#/biblioteca";
    case "detalle":
      return `#/juego/${encodeURIComponent(route.id)}`;
    case "player":
      return `#/jugar/${encodeURIComponent(route.id)}`;
    case "auth":
      return "#/acceso";
    case "salon":
      return "#/salon";
  }
}
