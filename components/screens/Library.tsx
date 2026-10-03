"use client";

import { useMemo, useState } from "react";
import GameCard from "@/components/GameCard";
import { CATS, GAMES } from "@/lib/games";
import type { Route } from "@/lib/router";

type Category = (typeof CATS)[number];

// Matches when the query starts the title or any word in it, so "as" finds
// ASTEROIDS but not INVASORES.
function matchesTitle(title: string, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const hay = title.toLowerCase();
  return hay.startsWith(needle) || hay.includes(" " + needle);
}

export default function Library({
  navigate,
}: {
  navigate: (route: Route) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category>("TODOS");

  const filtered = useMemo(
    () =>
      GAMES.filter(
        (g) => (cat === "TODOS" || g.cat === cat) && matchesTitle(g.title, q),
      ),
    [q, cat],
  );

  return (
    <div className="fade-in">
      <section className="av-hero">
        <h1 className="flicker">ARCADE VAULT</h1>
        <div className="sub">
          INSERTA UNA MONEDA PARA JUGAR <span className="blink">_</span>
        </div>
      </section>

      <div className="av-filters">
        <div className="av-search">
          <span className="ico" aria-hidden="true">
            ⌕
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar un juego por nombre…"
            aria-label="Buscar un juego por nombre"
          />
        </div>
        <div className="av-chips" role="group" aria-label="Categoría">
          {CATS.map((c) => (
            <button
              key={c}
              className={"chip" + (cat === c ? " active" : "")}
              aria-pressed={cat === c}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="av-grid">
        {filtered.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            onSelect={(game) => navigate({ name: "detalle", id: game.id })}
          />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: 80,
              color: "var(--ink-faint)",
            }}
          >
            <div
              className="pixel"
              style={{
                fontSize: 14,
                color: "var(--magenta)",
                marginBottom: 12,
              }}
            >
              NO HAY RESULTADOS
            </div>
            <div>Intenta otra búsqueda o categoría.</div>
          </div>
        )}
      </div>
    </div>
  );
}
