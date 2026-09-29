"use client";

import { useEffect, useReducer, useState } from "react";
import { GAMES } from "@/lib/games";
import type { Route } from "@/lib/router";

interface GamePlayerProps {
  id: string;
  navigate: (route: Route) => void;
}

// No real game yet: the score climbs on its own so every screen state can be seen.
const TICK_MS = 220;
const PLAYER = "INVITADO";

interface RunState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  saved: boolean;
}

type RunAction =
  | { type: "tick"; points: number }
  | { type: "togglePause" }
  | { type: "end" }
  | { type: "save" }
  | { type: "restart" };

const INITIAL: RunState = { score: 0, lives: 3, level: 1, paused: false, over: false, saved: false };

function reducer(state: RunState, action: RunAction): RunState {
  switch (action.type) {
    case "tick": {
      const score = state.score + action.points;
      // Same level-up rule as the template: whenever the score lands just past a multiple of 2500.
      const level = score % 2500 < 100 ? state.level + 1 : state.level;
      return { ...state, score, level };
    }
    case "togglePause":
      return { ...state, paused: !state.paused };
    case "end":
      return { ...state, over: true };
    case "save":
      return { ...state, saved: true };
    case "restart":
      return INITIAL;
  }
}

export default function GamePlayer({ id, navigate }: GamePlayerProps) {
  const game = GAMES.find((g) => g.id === id);
  const [run, dispatch] = useReducer(reducer, INITIAL);
  const [name, setName] = useState(PLAYER);
  const { score, lives, level, paused, over, saved } = run;

  useEffect(() => {
    if (over || paused) return;
    const t = setInterval(() => dispatch({ type: "tick", points: Math.floor(10 + Math.random() * 90) }), TICK_MS);
    return () => clearInterval(t);
  }, [over, paused]);

  // parseHash only yields ids that exist in GAMES.
  if (!game) return null;

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>{PLAYER}</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => dispatch({ type: "togglePause" })}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={() => dispatch({ type: "end" })}>FIN</button>
          <button className="btn ghost" onClick={() => navigate({ name: "detalle", id: game.id })}>SALIR</button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <div className="game-arena">
            <div className="grid-floor"></div>
            <div className="enemy e1"></div>
            <div className="enemy e2"></div>
            <div className="enemy e3"></div>
            <div className="player-ship"></div>
          </div>
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>EN PAUSA</div>
                <div
                  className="mono"
                  style={{ fontSize: 11, color: "var(--ink-dim)", marginTop: 10, letterSpacing: "0.16em" }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal" role="dialog" aria-labelledby="game-over-title">
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                {/* Visual only: nothing is persisted in this MVP. */}
                <button className="btn yellow" onClick={() => dispatch({ type: "save" })}>
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={() => dispatch({ type: "restart" })}>JUGAR DE NUEVO</button>
              <button className="btn magenta" onClick={() => navigate({ name: "biblioteca" })}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
