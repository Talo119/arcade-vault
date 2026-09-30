"use client";

import { useMemo } from "react";
import { GAMES, seededScores } from "@/lib/games";
import type { Route } from "@/lib/router";

interface GameDetailProps {
  id: string;
  navigate: (route: Route) => void;
}

const TOP_CLASS = [" top1", " top2", " top3"];

export default function GameDetail({ id, navigate }: GameDetailProps) {
  const game = useMemo(() => GAMES.find((g) => g.id === id), [id]);
  const scores = useMemo(() => seededScores(id.length * 17 + 3, 10), [id]);
  // parseHash only yields ids that exist in GAMES.
  if (!game) return null;

  return (
    <div className="av-detail fade-in">
      <div>
        <div className="detail-cover">
          <div className={"cover-bg " + game.cover}></div>
        </div>
        <div style={{ marginTop: 20 }} className="detail-info">
          <div className="detail-tags">
            <span>{game.cat}</span>
            <span>1 JUGADOR</span>
            <span>TECLADO / TÁCTIL</span>
            <span>RETRO 1985</span>
          </div>
          <h2 className="neon-cyan">{game.title}</h2>
          <p>{game.long}</p>
          <div className="stat-strip">
            <div>
              <div className="l">Partidas</div>
              <div className="v">{game.plays}</div>
            </div>
            <div>
              <div className="l">Mejor global</div>
              <div className="v" style={{ color: "var(--magenta)", textShadow: "0 0 6px rgba(255,0,110,0.5)" }}>
                {game.best.toLocaleString("es-ES")}
              </div>
            </div>
            <div>
              <div className="l">Dificultad</div>
              <div
                className="v"
                role="img"
                aria-label="3 de 5"
                style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
              >
                ★ ★ ★ ☆ ☆
              </div>
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn xl pulse" onClick={() => navigate({ name: "player", id: game.id })}>
              ▶  JUGAR AHORA
            </button>
            <button className="btn ghost lg" onClick={() => navigate({ name: "biblioteca" })}>
              VOLVER AL VAULT
            </button>
          </div>
        </div>
      </div>

      <aside>
        <div className="leaderboard">
          <h3>MEJORES PUNTUACIONES</h3>
          {scores.map((r, i) => (
            <div key={r.name} className={"lb-row" + (TOP_CLASS[i] ?? "")}>
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">
                {r.name}
                <div style={{ fontSize: 10, color: "var(--ink-faint)", letterSpacing: "0.1em" }}>{r.date}</div>
              </div>
              <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
