"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type PointerEvent,
} from "react";
import {
  dispatchKey,
  TOUCH_QUERY,
  TOUCH_REPEAT_DELAY_MS,
  TOUCH_REPEAT_INTERVAL_MS,
} from "@/lib/engines/touch";
import type { TouchButton, TouchZone } from "@/lib/engines/types";

function subscribeTouch(onChange: () => void) {
  const mql = window.matchMedia(TOUCH_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

const getTouch = () => window.matchMedia(TOUCH_QUERY).matches;
const getServerTouch = () => false;

// true en pantallas táctiles sin ratón; false en servidor.
export function useTouchDevice(): boolean {
  return useSyncExternalStore(subscribeTouch, getTouch, getServerTouch);
}

// Posición de cada botón en la cruceta, en el orden ↑ ← → ↓ del TouchZone.
const CROSS_DIRS = ["up", "left", "right", "down"] as const;

// Press Start 2P solo dibuja ↑ y ↓: las cuatro flechas se pintan con su ↑ girada.
const ARROW_TURNS: Record<string, string> = {
  "↑": "0deg",
  "→": "90deg",
  "↓": "180deg",
  "←": "270deg",
};

interface TouchKeyProps {
  button: TouchButton;
  disabled: boolean;
  dir?: (typeof CROSS_DIRS)[number];
}

// Un botón gestiona su propio puntero: varios a la vez funcionan.
function TouchKey({ button, disabled, dir }: TouchKeyProps) {
  const { code, label, aria, repeat } = button;
  const turn = ARROW_TURNS[label];
  const btnRef = useRef<HTMLButtonElement>(null);
  const pointerRef = useRef<number | null>(null); // dedo que lo mantiene pulsado
  const delayRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);

  const release = useCallback(() => {
    if (pointerRef.current === null) return;
    pointerRef.current = null;
    window.clearTimeout(delayRef.current);
    window.clearInterval(intervalRef.current);
    btnRef.current?.removeAttribute("data-pressed");
    dispatchKey("keyup", code);
  }, [code]);

  // Pausa o gameover: suelta lo pulsado. Al desmontar, también.
  useEffect(() => {
    if (disabled) release();
  }, [disabled, release]);
  useEffect(() => release, [release]);

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    e.preventDefault(); // sin foco ni zoom por doble toque
    if (disabled || pointerRef.current !== null) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // sin captura, pointerup y pointercancel siguen soltando la tecla
    }
    pointerRef.current = e.pointerId;
    e.currentTarget.setAttribute("data-pressed", "true");
    dispatchKey("keydown", code);
    if (repeat) {
      delayRef.current = window.setTimeout(() => {
        dispatchKey("keydown", code, true);
        intervalRef.current = window.setInterval(
          () => dispatchKey("keydown", code, true),
          TOUCH_REPEAT_INTERVAL_MS,
        );
      }, TOUCH_REPEAT_DELAY_MS);
    }
  }

  function onPointerEnd(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerId === pointerRef.current) release();
  }

  return (
    <button
      ref={btnRef}
      type="button"
      className="touch-btn"
      aria-label={aria}
      aria-disabled={disabled || undefined}
      data-dir={dir}
      // Acciones con palabra (FUEGO, ROTAR…): otro color y tipografía que las flechas.
      data-action={label.length > 1 || undefined}
      data-arrow={turn !== undefined || undefined}
      style={turn ? ({ "--turn": turn } as CSSProperties) : undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onLostPointerCapture={onPointerEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

interface TouchControlsProps {
  zone: TouchZone;
  side: "left" | "right";
  disabled: boolean; // pausa o gameover: suelta todo e ignora toques nuevos
}

// Una zona de botones virtuales (pulgar izquierdo o derecho).
export default function TouchControls({
  zone,
  side,
  disabled,
}: TouchControlsProps) {
  const cross = zone.pad === "cross";
  return (
    <div
      className={"touch-zone touch-zone-" + side}
      data-pad={zone.pad}
      role="group"
      aria-label={
        side === "left"
          ? "Controles táctiles izquierdos"
          : "Controles táctiles derechos"
      }
    >
      {zone.buttons.map((button, i) => (
        <TouchKey
          key={button.code}
          button={button}
          disabled={disabled}
          dir={cross ? CROSS_DIRS[i] : undefined}
        />
      ))}
    </div>
  );
}
