"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { HighlightIcon, type HighlightIconKind } from "@/components/about/HighlightIcon";
import { useReveal } from "@/lib/useReveal";

const HIGHLIGHTS: { i: HighlightIconKind; t: string; c: string }[] = [
  { i: "HEART", t: "HECHO CON ❤️ PARA JUGADORES", c: "magenta" },
  { i: "BROWSER", t: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR", c: "cyan" },
  { i: "PLANT", t: "PROYECTO EN CONSTANTE CRECIMIENTO", c: "green" },
];

interface ContactForm {
  name: string;
  email: string;
  msg: string;
}

const EMPTY_FORM: ContactForm = { name: "", email: "", msg: "" };

// Mock form, as in the template: nothing is sent anywhere.
export default function About() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [sent, setSent] = useState<string | null>(null); // trimmed sender name; null = form visible
  const [shake, setShake] = useState(false); // true for 400 ms after an invalid submit
  const [status, setStatus] = useState(""); // aria-live text
  const nameRef = useRef<HTMLInputElement>(null);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.msg.trim()) {
      setShake(true);
      setStatus("Completa nombre, correo y mensaje.");
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setShake(false), 400);
      return;
    }
    setSent(form.name.trim());
    setStatus("Mensaje recibido. Te responderemos pronto.");
  };

  // The button disappears when clicked, so move focus back to NOMBRE once the form is back.
  const sendAnother = () => {
    flushSync(() => {
      setSent(null);
      setForm(EMPTY_FORM);
      setStatus("");
    });
    nameRef.current?.focus();
  };

  return (
    <div ref={rootRef} className="about fade-in">
      {/* ABOUT */}
      <section className="about-hero">
        <div className="kicker pixel neon-yellow">▸ ACERCA DE</div>
        <h1 className="about-title">ACERCA DE ARCADE VAULT</h1>
        <p className="about-mission">
          ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar
          los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar
          y sin costo.
        </p>

        <div className="highlight-row">
          {HIGHLIGHTS.map((h, i) => (
            <div key={h.i} className={"highlight " + h.c} style={{ transitionDelay: i * 80 + "ms" }}>
              <HighlightIcon kind={h.i} />
              <div className="hl-text pixel">{h.t}</div>
            </div>
          ))}
        </div>
      </section>

      {/* divider banner */}
      <div className="about-divider reveal" aria-hidden="true">
        <div className="div-bar"></div>
        <div className="div-pixels">
          {Array.from({ length: 24 }, (_, i) => (
            <span key={i} style={{ animationDelay: i * 80 + "ms" }}></span>
          ))}
        </div>
        <div className="div-bar"></div>
      </div>

      {/* CONTACT */}
      <section className="about-contact reveal">
        <div className="contact-grid">
          <div className="contact-intro">
            <div className="kicker pixel neon-cyan">▸ CONTACTO</div>
            <h2 className="contact-title">CONTÁCTANOS</h2>
            <p className="contact-sub">
              ¿Tienes alguna sugerencia, quieres proponer un juego, o simplemente quieres saludar?
              Escríbenos.
            </p>
            <div className="contact-tips">
              <div className="tip"><span className="tip-led" aria-hidden="true"></span>RESPUESTA EN 24-48H</div>
              <div className="tip"><span className="tip-led y" aria-hidden="true"></span>SUGERENCIAS BIENVENIDAS</div>
              <div className="tip"><span className="tip-led m" aria-hidden="true"></span>SIN SPAM, JAMÁS</div>
            </div>
          </div>

          <form className={"contact-form" + (shake ? " shake" : "")} onSubmit={onSubmit}>
            {!sent ? (
              <>
                <div className="field">
                  <label htmlFor="contact-name">NOMBRE</label>
                  <input
                    ref={nameRef}
                    id="contact-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="px_kai"
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-email">CORREO ELECTRÓNICO</label>
                  <input
                    id="contact-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="jugador@vault.gg"
                  />
                </div>
                <div className="field">
                  <label htmlFor="contact-msg">MENSAJE</label>
                  <textarea
                    id="contact-msg"
                    rows={5}
                    value={form.msg}
                    onChange={(e) => setForm({ ...form, msg: e.target.value })}
                    placeholder="Cuéntanos qué tienes en mente…"
                  ></textarea>
                </div>
                <button className="btn xl press" type="submit" style={{ width: "100%" }}>▶  ENVIAR MENSAJE</button>
              </>
            ) : (
              <div className="terminal-success">
                <div className="term-bar">
                  <span className="dot r"></span><span className="dot y"></span><span className="dot g"></span>
                  <span className="term-title">VAULT-OS // TERMINAL</span>
                </div>
                <div className="term-body">
                  <div className="line"><span className="prompt">vault@arcade:~$</span> ./send_message --to=team</div>
                  <div className="line dim">[OK] Conectando con servidor…</div>
                  <div className="line dim">[OK] Validando contenido…</div>
                  <div className="line dim">[OK] Transmitiendo paquete…</div>
                  <div className="line success">&gt; MENSAJE RECIBIDO. TE RESPONDEREMOS PRONTO. GRACIAS, {sent.toUpperCase()}.<span className="caret">_</span></div>
                  <div style={{ marginTop: 18 }}>
                    <button className="btn ghost" type="button" onClick={sendAnother}>ENVIAR OTRO MENSAJE</button>
                  </div>
                </div>
              </div>
            )}
            {/* Always mounted, so screen readers announce every change. */}
            <div className="sr-only" aria-live="polite">{status}</div>
          </form>
        </div>
      </section>
    </div>
  );
}
