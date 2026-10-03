"use client";

// Shown in place of the catalog screens when the catalog could not load.
export default function SignalLost() {
  return (
    <section className="signal-lost fade-in" role="alert">
      <div className="crt signal-crt">
        <div className="crt-screen">
          <div className="signal-static" aria-hidden="true"></div>
          <div className="signal-roll" aria-hidden="true"></div>
          <div className="crt-content">
            <h1 className="signal-title pixel neon-magenta">SEÑAL PERDIDA</h1>
          </div>
        </div>
        <div className="crt-bottom" aria-hidden="true">
          <span className="led signal-led">SIN SEÑAL</span>
          <span>CANAL 03</span>
        </div>
      </div>
      <p className="signal-text pixel">
        NO SE PUDO CARGAR EL CATÁLOGO DE JUEGOS
      </p>
      <button
        type="button"
        className="btn lg"
        onClick={() => window.location.reload()}
      >
        REINTENTAR
      </button>
    </section>
  );
}
