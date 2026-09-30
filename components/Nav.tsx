"use client";

import { useEffect, useState } from "react";
import type { Route } from "@/lib/router";

type NavTarget = "home" | "biblioteca" | "salon" | "about" | "auth";

const PANEL_ID = "av-mobile-menu";

export default function Nav({ route }: { route: Route }) {
  const [open, setOpen] = useState(false);

  // Close the mobile panel on Escape and on any navigation, including back/forward.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("hashchange", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("hashchange", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Detail and player screens live "inside" the library.
  const isActive = (name: NavTarget) =>
    route.name === name ||
    (name === "biblioteca" && (route.name === "detalle" || route.name === "player"));

  const linkProps = (name: NavTarget) =>
    isActive(name) ? { className: "active", "aria-current": "page" as const } : {};
  const close = () => setOpen(false);

  return (
    <>
      <nav className="av-nav">
        <a className="logo" href="#/" aria-label="Arcade Vault, ir al inicio">
          <div className="logo-mark" aria-hidden="true"></div>
          <div className="logo-text neon-cyan" aria-hidden="true">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </a>
        <div className="links">
          <a {...linkProps("home")} href="#/">Inicio</a>
          <a {...linkProps("biblioteca")} href="#/biblioteca">Biblioteca</a>
          <a {...linkProps("salon")} href="#/salon">Salón de la Fama</a>
          <a {...linkProps("about")} href="#/acerca">Acerca de</a>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin" aria-hidden="true"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        <a className="btn auth-btn" href="#/acceso">Iniciar Sesión</a>
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          aria-expanded={open}
          aria-controls={PANEL_ID}
        >
          ≡
        </button>
      </nav>

      <div className={"av-mobile-backdrop" + (open ? " open" : "")} onClick={close}></div>
      {/* inert while closed: the off-screen links must not take keyboard focus. */}
      <aside id={PANEL_ID} className={"av-mobile-panel" + (open ? " open" : "")} aria-label="Menú" inert={!open}>
        <div className="pixel neon-cyan" style={{ fontSize: 11, marginBottom: 16 }}>MENÚ</div>
        <a {...linkProps("home")} href="#/" onClick={close}>Inicio</a>
        <a {...linkProps("biblioteca")} href="#/biblioteca" onClick={close}>Biblioteca</a>
        <a {...linkProps("salon")} href="#/salon" onClick={close}>Salón de la Fama</a>
        <a {...linkProps("about")} href="#/acerca" onClick={close}>Acerca de</a>
        <a {...linkProps("auth")} href="#/acceso" onClick={close}>Iniciar Sesión</a>
        <div style={{ flex: 1 }}></div>
        <div className="pixel" style={{ fontSize: 9, color: "var(--ink-faint)", letterSpacing: "0.16em" }}>
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
