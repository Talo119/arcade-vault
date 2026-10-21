import type { Dir } from "./board";

const JUMP_KEYS: Readonly<Record<string, Dir>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

export interface Input {
  /** Saca la dirección en cola, o null si no hay ninguna. */
  takeDir: () => Dir | null;
  /** Si se pulsó Espacio desde la última llamada (pulsación de un frame). */
  pressed: () => boolean;
  /** Vacía la cola y descarta las pulsaciones pendientes. */
  clear: () => void;
  destroy: () => void;
}

function isGameKey(code: string) {
  return code === "Space" || Object.hasOwn(JUMP_KEYS, code);
}

function isTyping() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

/**
 * `isActive` dice si el motor está capturando el teclado: no está en pausa y
 * la fase no es "gameover". Solo entonces se leen las teclas y se hace
 * preventDefault, para que Espacio y las flechas no hagan scroll.
 *
 * La cola guarda una sola dirección: una pulsación durante un salto sustituye
 * a la que hubiera y se ejecuta al aterrizar. El motor solo la lee en
 * "playing" y la descarta en las demás fases.
 */
export function createInput(target: Window, isActive: () => boolean): Input {
  const down = new Set<string>();
  let queued: Dir | null = null;
  let space = false;

  const capturing = () => isActive() && !isTyping();

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isGameKey(e.code) || !capturing()) return;
    e.preventDefault();
    // Sin autorrepetición: un salto por pulsación.
    if (e.repeat || down.has(e.code)) return;
    down.add(e.code);

    if (e.code === "Space") space = true;
    else queued = JUMP_KEYS[e.code];
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!isGameKey(e.code)) return;
    // Soltar siempre, aunque no se capture, para no dejar teclas pegadas.
    down.delete(e.code);
    if (capturing()) e.preventDefault();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    takeDir: () => {
      const dir = queued;
      queued = null;
      return dir;
    },
    pressed: () => {
      const was = space;
      space = false;
      return was;
    },
    clear: () => {
      queued = null;
      space = false;
      down.clear();
    },
    destroy: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}
