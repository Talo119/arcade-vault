"use client";

import { useEffect, useState } from "react";
import { useGames } from "@/lib/games-context";
import type { Route } from "@/lib/router";
import { fetchTopScores, type LeaderboardRow } from "@/lib/scores";

const TOP_CLASS = [" top1", " top2", " top3"];
const EMPTY = "—";

type HallState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; rows: LeaderboardRow[] }; // rows may be empty

function PodiumSlot({ row }: { row: LeaderboardRow | undefined }) {
  return (
    <>
      <div className="name">{row ? row.name : EMPTY}</div>
      <div className="score">{row ? row.score.toLocaleString("es-ES") : EMPTY}</div>
      <div className="date">{row ? row.date : EMPTY}</div>
    </>
  );
}

export default function HallOfFame({ navigate }: { navigate: (route: Route) => void }) {
  const games = useGames();
  // fetchGames never returns an empty catalog.
  const [tab, setTab] = useState(games[0].id);
  // Bumped by REINTENTAR to fetch the same tab again.
  const [attempt, setAttempt] = useState(0);
  // The answer is stored with the request it belongs to; any other request reads as loading.
  const requestKey = `${tab}#${attempt}`;
  const [result, setResult] = useState<{ key: string; state: HallState } | null>(null);
  const hall: HallState = result?.key === requestKey ? result.state : { status: "loading" };

  useEffect(() => {
    let current = true; // false once the tab (or attempt) changes: a late answer is dropped
    fetchTopScores(tab).then(
      (rows) => {
        if (current) setResult({ key: requestKey, state: { status: "ready", rows } });
      },
      () => {
        if (current) setResult({ key: requestKey, state: { status: "error" } });
      },
    );
    return () => {
      current = false;
    };
  }, [tab, requestKey]);

  const game = games.find((g) => g.id === tab) ?? games[0];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs" role="group" aria-label="Juego">
        {games.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            aria-pressed={tab === g.id}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      <div className="hall-board" aria-live="polite" aria-busy={hall.status === "loading"}>
        {hall.status === "loading" && (
          <div className="hall-status loading">
            <div className="hall-status-title pixel">CARGANDO…</div>
          </div>
        )}

        {hall.status === "error" && (
          <div className="hall-status error">
            <div className="hall-status-title pixel">SEÑAL PERDIDA</div>
            <button className="btn lg magenta" onClick={() => setAttempt((n) => n + 1)}>
              REINTENTAR
            </button>
          </div>
        )}

        {hall.status === "ready" && hall.rows.length === 0 && (
          <div className="hall-status empty">
            {/* Two unbreakable halves: on a phone the line breaks after the dot. */}
            <div className="hall-status-title pixel">
              <span className="nowrap">SIN PUNTUACIONES ·</span>{" "}
              <span className="nowrap">SÉ EL PRIMERO</span>
            </div>
            <button
              className="btn lg yellow"
              onClick={() => navigate({ name: "player", id: game.id })}
            >
              JUGAR A {game.title}
            </button>
          </div>
        )}

        {hall.status === "ready" && hall.rows.length > 0 && (
          <>
            <div className="podium">
              <div className={"podium-slot silver" + (hall.rows[1] ? "" : " vacant")}>
                <div className="rank-num">02</div>
                <PodiumSlot row={hall.rows[1]} />
              </div>
              <div className="podium-slot gold">
                <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>CAMPEÓN</div>
                <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
                <div className="name">{hall.rows[0].name}</div>
                <div className="score" style={{ fontSize: 20 }}>{hall.rows[0].score.toLocaleString("es-ES")}</div>
                <div className="date">{hall.rows[0].date}</div>
              </div>
              <div className={"podium-slot bronze" + (hall.rows[2] ? "" : " vacant")}>
                <div className="rank-num">03</div>
                <PodiumSlot row={hall.rows[2]} />
              </div>
            </div>

            <div className="hall-table">
              <div className="th">
                <div>RANGO</div>
                <div>JUGADOR</div>
                <div>PUNTUACIÓN</div>
                <div>FECHA</div>
              </div>
              {hall.rows.map((r, i) => (
                <div
                  key={r.rank}
                  className={"tr" + (TOP_CLASS[i] ?? "")}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                  <div className="pl">{r.name}</div>
                  <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                  <div className="dt">{r.date}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => navigate({ name: "biblioteca" })}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}
