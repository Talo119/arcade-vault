import { unstable_rethrow } from "next/navigation";
import App from "@/components/App";
import type { Game } from "@/lib/games";
import { fetchGames } from "@/lib/catalog";

export default async function Home() {
  let games: Game[] | null;
  try {
    games = await fetchGames();
  } catch (e) {
    // Let Next handle its own errors, e.g. the cookies() bailout that marks
    // this route as dynamic during the build.
    unstable_rethrow(e);
    console.error(e);
    games = null;
  }
  return <App games={games} />;
}
