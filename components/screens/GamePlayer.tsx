"use client";

import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import AsteroidsCanvas from "@/components/games/AsteroidsCanvas";
import type { AsteroidsPhase, AsteroidsStats } from "@/lib/asteroids/types";
import { GAMES } from "@/lib/games";
import type { Route } from "@/lib/router";

interface GamePlayerProps {
  id: string;
  navigate: (route: Route) => void;
}

// Games without a real engine yet: the score climbs on its own so every screen state can be seen.
const TICK_MS = 220;
const PLAYER = "INVITADO";

interface RunState {
  score: number;
  lives: number;
  level: number;
  paused: boolean;
  over: boolean;
  saved: boolean;
  started: boolean; // false while ASTEROIDS shows "PULSA ESPACIO"; always true in simulated games
  run: number; // bumps on every "restart"; it is the key of <AsteroidsCanvas>
}

type RunAction =
  | { type: "tick"; points: number }
  | { type: "togglePause" }
  | { type: "pause" } // pauses without toggling (focus loss)
  | { type: "end" }
  | { type: "save" }
  | { type: "restart" }
  | { type: "start" } // "ready" → "playing"
  | { type: "sync"; stats: AsteroidsStats }; // copies the engine's values

function initialState(isReal: boolean, run = 0): RunState {
  return {
    score: 0,
    lives: 3,
    level: 1,
    paused: false,
    over: false,
    saved: false,
    started: !isReal,
    run,
  };
}

function createReducer(isReal: boolean) {
  return function reducer(state: RunState, action: RunAction): RunState {
    switch (action.type) {
      case "tick": {
        const score = state.score + action.points;
        // Same level-up rule as the template: whenever the score lands just past a multiple of 2500.
        const level = score % 2500 < 100 ? state.level + 1 : state.level;
        return { ...state, score, level };
      }
      case "togglePause":
        return { ...state, paused: !state.paused };
      case "pause":
        return state.paused ? state : { ...state, paused: true };
      case "end":
        if (state.over) return state;
        // A paused engine would stay frozen with the ship on screen, so the real game unpauses on FIN.
        return { ...state, over: true, paused: isReal ? false : state.paused };
      case "save":
        return { ...state, saved: true };
      case "restart":
        return initialState(isReal, state.run + 1);
      case "start":
        return state.started ? state : { ...state, started: true };
      case "sync":
        return { ...state, ...action.stats };
    }
  };
}

export default function GamePlayer({ id, navigate }: GamePlayerProps) {
  const game = GAMES.find((g) => g.id === id);
  const isReal = game?.id === "asteroids";
  const reducer = useMemo(() => createReducer(isReal), [isReal]);
  const [state, dispatch] = useReducer(reducer, isReal, initialState);
  const [name, setName] = useState(PLAYER);
  const { score, lives, level, paused, over, saved, started, run } = state;

  useEffect(() => {
    if (isReal || over || paused) return;
    const t = setInterval(
      () =>
        dispatch({
          type: "tick",
          points: Math.floor(10 + Math.random() * 90),
        }),
      TICK_MS,
    );
    return () => clearInterval(t);
  }, [isReal, over, paused]);

  const onStats = useCallback(
    (stats: AsteroidsStats) => dispatch({ type: "sync", stats }),
    [],
  );
  const onPhase = useCallback((phase: AsteroidsPhase) => {
    if (phase === "playing") dispatch({ type: "start" });
    else if (phase === "gameover") dispatch({ type: "end" });
  }, []);

  const canPause = started && !over;

  // ASTEROIDS only: P toggles the pause, losing focus pauses (never resumes).
  useEffect(() => {
    if (!isReal || !canPause) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "KeyP" || e.repeat) return;
      const el = document.activeElement;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
        return;
      dispatch({ type: "togglePause" });
    };
    const onBlur = () => dispatch({ type: "pause" });
    const onVisibility = () => {
      if (document.hidden) dispatch({ type: "pause" });
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isReal, canPause]);

  // parseHash only yields ids that exist in GAMES.
  if (!game) return null;

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {PLAYER}
            </div>
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
          <button
            className="btn yellow"
            disabled={!started}
            onClick={() => {
              if (isReal && !canPause) return;
              dispatch({ type: "togglePause" });
            }}
          >
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button
            className="btn magenta"
            disabled={!started}
            onClick={() => dispatch({ type: "end" })}
          >
            FIN
          </button>
          <button
            className="btn ghost"
            onClick={() => navigate({ name: "detalle", id: game.id })}
          >
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isReal ? (
            <AsteroidsCanvas
              key={run}
              paused={paused}
              ended={over}
              onStats={onStats}
              onPhase={onPhase}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {isReal && !started && !over && (
            <div className="crt-content player-start">
              <div>
                <div className="pixel title">ASTEROIDS</div>
                <div className="pixel prompt">PULSA ESPACIO PARA EMPEZAR</div>
              </div>
            </div>
          )}
          {paused && (
            <div className="crt-content player-pause">
              <div>
                <div className="pixel neon-yellow title">EN PAUSA</div>
                <div className="mono hint">
                  PULSA REANUDAR PARA CONTINUAR{isReal && " O P"}
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

      {isReal && (
        <>
          <div className="player-controls">
            <span className="ctl">
              <kbd>←</kbd>
              <kbd>→</kbd> ROTAR
            </span>
            <span className="ctl">
              <kbd>↑</kbd> PROPULSAR
            </span>
            <span className="ctl">
              <kbd>ESPACIO</kbd> DISPARAR
            </span>
            <span className="ctl">
              <kbd>P</kbd> PAUSA
            </span>
          </div>
          <div className="kbd-required">REQUIERE TECLADO</div>
        </>
      )}

      {over && (
        <div className="modal-bd">
          <div
            className="modal"
            role="dialog"
            aria-labelledby="game-over-title"
          >
            <h2 id="game-over-title">FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                  aria-label="Tus iniciales"
                />
                {/* Visual only: nothing is persisted in this MVP. */}
                <button
                  className="btn yellow"
                  onClick={() => dispatch({ type: "save" })}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button
                className="btn"
                onClick={() => dispatch({ type: "restart" })}
              >
                JUGAR DE NUEVO
              </button>
              <button
                className="btn magenta"
                onClick={() => navigate({ name: "biblioteca" })}
              >
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
