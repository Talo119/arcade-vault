"use client";

import { useId, useState, type FormEvent } from "react";
import type { Route } from "@/lib/router";

type Tab = "in" | "up";

export default function Auth({ navigate }: { navigate: (route: Route) => void }) {
  const [tab, setTab] = useState<Tab>("in");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  const fieldId = useId();

  // Visual only: no session is created, the Nav keeps showing "Iniciar Sesión".
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    navigate({ name: "biblioteca" });
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{ fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.16em", marginTop: 6 }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        <div className="auth-tabs" role="group" aria-label="Tipo de acceso">
          <button className={tab === "in" ? "on" : undefined} aria-pressed={tab === "in"} onClick={() => setTab("in")}>
            INICIAR SESIÓN
          </button>
          <button className={tab === "up" ? "on" : undefined} aria-pressed={tab === "up"} onClick={() => setTab("up")}>
            CREAR CUENTA
          </button>
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor={`${fieldId}-user`}>Usuario</label>
            <input
              id={`${fieldId}-user`}
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="px_kai"
              autoComplete="username"
            />
          </div>
          {tab === "up" && (
            <div className="field slide-in">
              <label htmlFor={`${fieldId}-email`}>Correo electrónico</label>
              <input
                id={`${fieldId}-email`}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@vault.gg"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor={`${fieldId}-pass`}>Contraseña</label>
            <input
              id={`${fieldId}-pass`}
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete={tab === "in" ? "current-password" : "new-password"}
            />
          </div>

          <button className="btn lg" type="submit" style={{ width: "100%", marginTop: 8 }}>
            {tab === "in" ? "ENTRAR AL VAULT" : "CREAR Y JUGAR"}
          </button>
        </form>

        <button
          className="btn ghost"
          style={{ width: "100%", marginTop: 10 }}
          onClick={() => navigate({ name: "biblioteca" })}
        >
          JUGAR COMO INVITADO
        </button>

        <div className="auth-divider">O CONTINÚA CON</div>
        {/* Social login is out of scope for this MVP: the buttons are inert. */}
        <div className="social">
          <button className="btn ghost" type="button">◆  GOOGLE</button>
          <button className="btn ghost" type="button">▣  GITHUB</button>
        </div>

        <div
          style={{ marginTop: 18, textAlign: "center", fontSize: 11, color: "var(--ink-faint)", letterSpacing: "0.1em" }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
