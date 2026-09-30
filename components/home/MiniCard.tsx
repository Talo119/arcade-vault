import type { Game } from "@/lib/games";
import { toHash } from "@/lib/router";

/** Compact game card for the Home rail. A real link: Tab, Enter and middle-click all work. */
export default function MiniCard({ game }: { game: Game }) {
  return (
    <a className="mini-card" href={toHash({ name: "detalle", id: game.id })}>
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </a>
  );
}
