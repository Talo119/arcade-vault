import { isOpposite, type Dir } from "./board";

const TURN_KEYS: Readonly<Record<string, Dir>> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  KeyW: "up",
  KeyS: "down",
  KeyA: "left",
  KeyD: "right",
};

const MAX_TURNS = 2;

export interface Input {
  /** Saca el siguiente giro de la cola, o undefined si está vacía. */
  nextTurn: () => Dir | undefined;
  /** Si se pulsó Espacio desde la última llamada (pulsación de un frame). */
  pressed: () => boolean;
  /** Vacía la cola de giros y descarta las pulsaciones pendientes. */
  clear: () => void;
  destroy: () => void;
}

function isGameKey(code: string) {
  return code === "Space" || Object.hasOwn(TURN_KEYS, code);
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
 * `getDir` da la dirección vigente en "playing" y null en cualquier otra fase:
 * fuera de "playing" los giros se descartan.
 */
export function createInput(
  target: Window,
  isActive: () => boolean,
  getDir: () => Dir | null,
): Input {
  const down = new Set<string>();
  let turns: Dir[] = [];
  let space = false;

  const capturing = () => isActive() && !isTyping();

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isGameKey(e.code) || !capturing()) return;
    e.preventDefault();
    // Sin autorrepetición: mantener una tecla no repite el giro ni el inicio.
    if (e.repeat || down.has(e.code)) return;
    down.add(e.code);

    if (e.code === "Space") {
      space = true;
      return;
    }

    const dir = getDir();
    if (dir === null || turns.length >= MAX_TURNS) return;
    const turn = TURN_KEYS[e.code];
    // Se compara con el último giro encolado, o con la dirección vigente.
    const last = turns.at(-1) ?? dir;
    if (turn === last || isOpposite(turn, last)) return;
    turns.push(turn);
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
    nextTurn: () => turns.shift(),
    pressed: () => {
      const was = space;
      space = false;
      return was;
    },
    clear: () => {
      turns = [];
      space = false;
      down.clear();
    },
    destroy: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}
