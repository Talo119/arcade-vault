"use client";

import { useMemo, useState } from "react";
import { GAMES, seededScores } from "@/lib/games";
import type { Route } from "@/lib/router";

const TOP_CLASS = [" top1", " top2", " top3"];

export default function HallOfFame({ navigate }: { navigate: (route: Route) => void }) {
  const [tab, setTab] = useState(GAMES[0].id);
  const rows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const [first, second, third] = rows;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs" role="group" aria-label="Juego">
        {GAMES.map((g) => (
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

      <div className="podium">
        <div className="podium-slot silver">
          <div className="rank-num">02</div>
          <div className="name">{second.name}</div>
          <div className="score">{second.score.toLocaleString("es-ES")}</div>
          <div className="date">{second.date}</div>
        </div>
        <div className="podium-slot gold">
          <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>CAMPEÓN</div>
          <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
          <div className="name">{first.name}</div>
          <div className="score" style={{ fontSize: 20 }}>{first.score.toLocaleString("es-ES")}</div>
          <div className="date">{first.date}</div>
        </div>
        <div className="podium-slot bronze">
          <div className="rank-num">03</div>
          <div className="name">{third.name}</div>
          <div className="score">{third.score.toLocaleString("es-ES")}</div>
          <div className="date">{third.date}</div>
        </div>
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.map((r, i) => (
          <div
            key={r.name + i}
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

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <button className="btn lg" onClick={() => navigate({ name: "biblioteca" })}>
          VOLVER A LA BIBLIOTECA
        </button>
      </div>
    </div>
  );
}
