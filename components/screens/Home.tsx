"use client";

import { useMemo, useRef } from "react";
import MiniCard from "@/components/home/MiniCard";
import { FeatureIcon, FloatingSilhouettes } from "@/components/home/PixelArt";
import { useGames } from "@/lib/games-context";
import { FAQS, FEATURES, homeStats, PRICING_PERKS, RECENT_SCORES, TOP_PLAYERS } from "@/lib/home";
import { useReveal } from "@/lib/useReveal";

// Every CTA is a real <a href>, so they need no navigate prop.
export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);
  const games = useGames();

  // Ticker game names come from the catalog; a row whose game is not in it is dropped.
  const tickerRows = useMemo(
    () =>
      RECENT_SCORES.flatMap((row) => {
        const game = games.find((g) => g.id === row.gameId);
        return game ? [{ row, title: game.title }] : [];
      }),
    [games],
  );

  return (
    <div ref={rootRef} className="home fade-in">
      {/* HERO */}
      <section className="home-hero">
        <FloatingSilhouettes />
        <div className="home-hero-inner">
          <div className="hero-eyebrow pixel neon-yellow">▸ INSERTA UNA MONEDA<span className="blink" aria-hidden="true">_</span></div>
          <h1 className="home-title">
            <span className="line-1">EL ARCADE</span>
            <span className="line-2">CLÁSICO ESTÁ</span>
            <span className="line-3">DE VUELTA</span>
          </h1>
          <p className="home-sub">
            Juega los mejores clásicos directamente en tu navegador.<br />
            Sin descargas. Sin costo. Solo diversión.
          </p>
          <div className="home-ctas">
            <a className="btn xl pulse" href="#/biblioteca">▶  EXPLORAR JUEGOS</a>
            <a className="btn xl magenta" href="#/acceso">✦  CREAR CUENTA</a>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>DESLIZA</span>
            <span className="arrow">▼</span>
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-magenta" aria-hidden="true">{"// 01"}</div>
          <h2 className="section-title">¿POR QUÉ ARCADE VAULT?</h2>
          <div className="section-rule"></div>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <div key={f.icon} className={"feature-card " + f.color} style={{ transitionDelay: i * 80 + "ms" }}>
              <FeatureIcon kind={f.icon} />
              <div className="ft-title pixel">{f.title}</div>
              <div className="ft-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* GAMES PREVIEW */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-cyan" aria-hidden="true">{"// 02"}</div>
          <h2 className="section-title">JUEGOS DISPONIBLES AHORA</h2>
          <div className="section-rule"></div>
        </div>
        <div className="mini-rail">
          {games.slice(0, 6).map((g) => (
            <MiniCard key={g.id} game={g} />
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <a className="btn lg" href="#/biblioteca">VER TODOS LOS JUEGOS →</a>
        </div>
      </section>

      {/* STATS */}
      <section className="home-stats reveal">
        <div className="stats-inner">
          {homeStats(games.length).map((st, i) => (
            <div key={st.u} className="stat-block" style={{ transitionDelay: i * 90 + "ms" }}>
              <div className="stat-n neon-yellow">{st.n}</div>
              <div className="stat-u pixel">{st.u}</div>
              <div className="stat-s">{st.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RECENT ACTIVITY / LEADERBOARD */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-yellow" aria-hidden="true">{"// 03"}</div>
          <h2 className="section-title">ACTIVIDAD EN VIVO</h2>
          <div className="section-rule"></div>
        </div>
        <div className="activity-grid">
          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
            </div>
            <div className="ticker">
              {tickerRows.map(({ row, title }, i) => (
                <div key={row.player + row.gameId} className="tick-row" style={{ animationDelay: i * 60 + "ms" }}>
                  <span className={"tk-p neon-" + row.color}>{row.player}</span>
                  <span className="tk-mid">▸ {title}</span>
                  <span className="tk-s">+{row.score.toLocaleString("es-ES")}</span>
                  <span className="tk-t">{row.ago}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="activity-card">
            <div className="ac-head">
              <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES · HOY</div>
              <a className="lb-link" href="#/salon">VER SALÓN →</a>
            </div>
            <div className="top-list">
              {TOP_PLAYERS.map((r, i) => (
                <div key={r.rank} className={"top-row" + (i < 3 ? " top" + (i + 1) : "")}>
                  <span className="tp-rk">#{String(r.rank).padStart(2, "0")}</span>
                  <span className="tp-bar"><span className="tp-fill" style={{ width: 100 - i * 16 + "%" }}></span></span>
                  <span className="tp-p">{r.player}</span>
                  <span className="tp-s">{r.score.toLocaleString("es-ES")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="home-section reveal">
        <div className="section-head">
          <div className="kicker pixel neon-green" aria-hidden="true">{"// 04"}</div>
          <h2 className="section-title">PRECIOS</h2>
          <div className="section-rule"></div>
        </div>
        <div className="pricing-grid">
          <div className="price-card">
            <div className="pc-label pixel">PLAN ÚNICO</div>
            <div className="pc-name pixel">JUGADOR VAULT</div>
            <div className="pc-amount">
              <span className="pc-amount-n">$0</span>
              <span className="pc-amount-u">/ SIEMPRE</span>
            </div>
            <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
            <ul className="pc-list">
              {PRICING_PERKS.map((perk) => (
                <li key={perk}>{perk}</li>
              ))}
            </ul>
            <a className="btn xl pulse" style={{ width: "100%" }} href="#/acceso">EMPEZAR GRATIS →</a>
            <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
            <div className="pc-stamp pixel">FREE<br />PLAY</div>
          </div>

          <div className="pricing-faq">
            {FAQS.map((f) => (
              <div key={f.q} className="faq-item">
                <div className="faq-q pixel">{f.q}</div>
                <div className="faq-a">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="home-final reveal">
        <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
        <a className="btn xl pulse final-cta" href="#/biblioteca">INSERTAR MONEDA →</a>
        <div className="final-tag">Gratis. Sin registro obligatorio. Empieza en segundos.</div>
      </section>
    </div>
  );
}
