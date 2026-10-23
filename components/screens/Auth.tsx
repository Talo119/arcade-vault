"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import {
  AUTH_ERROR_FALLBACK,
  AUTH_ERRORS,
  MIN_PASSWORD,
  signIn,
  signInWithProvider,
  signOut,
  signUp,
  type OAuthProvider,
} from "@/lib/auth";
import { useAuth } from "@/lib/auth-context";
import type { Route } from "@/lib/router";
import { isValidName } from "@/lib/scores";

type Tab = "in" | "up";

const USERNAME_ERROR = "USUARIO DE 1 A 10 · SOLO A–Z, 0–9, _ Y ESPACIOS";
const EMAIL_ERROR = "ESCRIBE TU CORREO";

/** Notices the auth routes send back as /?acceso=<key>#/acceso. */
const NOTICES = {
  confirmado: { text: "CORREO CONFIRMADO · BIENVENIDO", ok: true },
  error: { text: "ENLACE NO VÁLIDO O CADUCADO", ok: false },
  "oauth-error": { text: "NO SE PUDO ENTRAR CON GOOGLE O GITHUB", ok: false },
} as const;
type NoticeKey = keyof typeof NOTICES;

function readNotice(): NoticeKey | null {
  if (typeof window === "undefined") return null;
  const key = new URLSearchParams(window.location.search).get("acceso");
  return key && key in NOTICES ? (key as NoticeKey) : null;
}

/** First client-side failure, or null when the form can be sent. */
function validate(
  tab: Tab,
  username: string,
  email: string,
  pass: string,
): string | null {
  if (tab === "up" && !isValidName(username)) return USERNAME_ERROR;
  if (!email) return EMAIL_ERROR;
  if (pass.length < MIN_PASSWORD) return AUTH_ERRORS.weak_password;
  return null;
}

export default function Auth({
  navigate,
}: {
  navigate: (route: Route) => void;
}) {
  const auth = useAuth();
  const [tab, setTab] = useState<Tab>("in");
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [email, setEmail] = useState("");
  /** Action in flight: its button shows CONECTANDO…, the rest is disabled. */
  const [pending, setPending] = useState<"submit" | OAuthProvider | null>(null);
  const busy = pending !== null;
  const [error, setError] = useState<string | null>(null);
  /** Email the confirmation was sent to: shows the "check your email" panel. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  // Read once on mount; the effect below clears the query from the URL.
  const [notice] = useState(readNotice);
  const fieldId = useId();

  // Back from the provider page via bfcache: the page comes back as it left,
  // with the pressed button still in CONECTANDO….
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPending(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  useEffect(() => {
    if (window.location.search) {
      history.replaceState(null, "", "/" + window.location.hash);
    }
  }, []);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const cleanEmail = email.trim();
    const invalid = validate(tab, username, cleanEmail, pass);
    if (invalid) {
      setError(invalid);
      return;
    }

    setError(null);
    setPending("submit");
    try {
      if (tab === "up") {
        await signUp(username, cleanEmail, pass);
        setPass("");
        setSentTo(cleanEmail);
      } else {
        await signIn(cleanEmail, pass);
        setPass("");
        navigate({ name: "biblioteca" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_ERROR_FALLBACK);
    } finally {
      setPending(null);
    }
  };

  // Stays on #/acceso: once the session ends, the form comes back.
  const logout = async () => {
    if (busy) return;
    setError(null);
    setPending("submit");
    try {
      await signOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_ERROR_FALLBACK);
    } finally {
      setPending(null);
    }
  };

  // The form isn't validated: the browser leaves for the provider and the
  // library arrives through the callback redirect.
  const continueWith = async (provider: OAuthProvider) => {
    if (busy) return;
    setError(null);
    setPending(provider);
    try {
      await signInWithProvider(provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : AUTH_ERROR_FALLBACK);
      setPending(null);
    }
  };

  const socialButton = (provider: OAuthProvider, label: string) => (
    <button
      className={"btn ghost" + (pending === provider ? " connecting" : "")}
      type="button"
      disabled={busy}
      aria-busy={pending === provider}
      onClick={() => continueWith(provider)}
    >
      {pending === provider ? "CONECTANDO…" : label}
    </button>
  );

  // Back to INICIAR SESIÓN with the email already filled in.
  const backToSignIn = () => {
    setSentTo(null);
    switchTab("in");
  };

  return (
    <div className="av-auth-wrap fade-in">
      <div className="auth-card">
        <div className="auth-header">
          <div className="mark"></div>
          <h2 className="neon-cyan">ARCADE VAULT</h2>
          <div
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--ink-faint)",
              letterSpacing: "0.16em",
              marginTop: 6,
            }}
          >
            ACCESO AL SISTEMA · v2.6
          </div>
        </div>

        {notice && (
          <div
            className={"auth-notice" + (NOTICES[notice].ok ? " ok" : "")}
            role="status"
          >
            ▸ {NOTICES[notice].text}
          </div>
        )}

        {auth.status === "loading" ? (
          <div className="auth-loading" role="status">
            VERIFICANDO SESIÓN…
          </div>
        ) : auth.status === "user" ? (
          <div className="auth-account slide-in">
            <h3>SESIÓN INICIADA COMO</h3>
            <div className="auth-account-name neon-cyan">{auth.username}</div>
            <p>
              <strong>{auth.email}</strong>
            </p>
            <button
              className="btn"
              type="button"
              disabled={busy}
              onClick={() => navigate({ name: "biblioteca" })}
            >
              IR A LA BIBLIOTECA
            </button>
            <button
              className={"btn ghost" + (busy ? " connecting" : "")}
              type="button"
              disabled={busy}
              aria-busy={busy}
              onClick={logout}
            >
              {busy ? "CONECTANDO…" : "CERRAR SESIÓN"}
            </button>
            {error && (
              <div className="auth-error" role="alert">
                ▸ {error}
              </div>
            )}
          </div>
        ) : sentTo !== null ? (
          <div className="auth-sent slide-in" role="status">
            <h3 className="neon-cyan">REVISA TU CORREO</h3>
            <p>
              Te enviamos un enlace de confirmación a <strong>{sentTo}</strong>.
              Ábrelo para activar tu cuenta.
            </p>
            <p className="auth-sent-hint">
              Si no lo ves, busca en la carpeta de spam.
            </p>
            <button className="btn" type="button" onClick={backToSignIn}>
              VOLVER
            </button>
          </div>
        ) : (
          <>
            <div className="auth-tabs" role="group" aria-label="Tipo de acceso">
              <button
                className={tab === "in" ? "on" : undefined}
                aria-pressed={tab === "in"}
                disabled={busy}
                onClick={() => switchTab("in")}
              >
                INICIAR SESIÓN
              </button>
              <button
                className={tab === "up" ? "on" : undefined}
                aria-pressed={tab === "up"}
                disabled={busy}
                onClick={() => switchTab("up")}
              >
                CREAR CUENTA
              </button>
            </div>

            <form onSubmit={submit}>
              {tab === "up" && (
                <div className="field slide-in">
                  <label htmlFor={`${fieldId}-user`}>Usuario</label>
                  <input
                    id={`${fieldId}-user`}
                    value={username}
                    // Uppercase while typing, like the GAME OVER initials.
                    onChange={(e) => setUsername(e.target.value.toUpperCase())}
                    placeholder="PX_KAI"
                    autoComplete="username"
                    disabled={busy}
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor={`${fieldId}-email`}>Correo electrónico</label>
                <input
                  id={`${fieldId}-email`}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jugador@vault.gg"
                  disabled={busy}
                />
              </div>
              <div className="field">
                <label htmlFor={`${fieldId}-pass`}>Contraseña</label>
                <input
                  id={`${fieldId}-pass`}
                  type="password"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={
                    tab === "in" ? "current-password" : "new-password"
                  }
                  disabled={busy}
                />
              </div>

              <button
                className={
                  "btn lg" + (pending === "submit" ? " connecting" : "")
                }
                type="submit"
                style={{ width: "100%", marginTop: 8 }}
                disabled={busy}
                aria-busy={pending === "submit"}
              >
                {pending === "submit"
                  ? "CONECTANDO…"
                  : tab === "in"
                    ? "ENTRAR AL VAULT"
                    : "CREAR Y JUGAR"}
              </button>
              {error && (
                <div className="auth-error" role="alert">
                  ▸ {error}
                </div>
              )}
            </form>

            <button
              className="btn ghost"
              style={{ width: "100%", marginTop: 10 }}
              disabled={busy}
              onClick={() => navigate({ name: "biblioteca" })}
            >
              JUGAR COMO INVITADO
            </button>

            <div className="auth-divider">O CONTINÚA CON</div>
            <div className="social">
              {socialButton("google", "◆ GOOGLE")}
              {socialButton("github", "▣ GITHUB")}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 18,
            textAlign: "center",
            fontSize: 11,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
          }}
        >
          AL ENTRAR ACEPTAS LOS TÉRMINOS DEL SALÓN ARCADE
        </div>
      </div>
    </div>
  );
}
