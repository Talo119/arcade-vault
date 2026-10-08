export type GameKey =
  "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "KeyX" | "Space";

const GAME_KEYS: readonly string[] = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyX",
  "Space",
];

export interface Input {
  /** Vacía la cola y devuelve las pulsaciones en orden de llegada. */
  drain: () => GameKey[];
  /** Tecla mantenida. */
  isDown: (code: GameKey) => boolean;
  /** Vacía la cola y suelta todas las teclas. */
  clear: () => void;
  destroy: () => void;
}

function isGameKey(code: string): code is GameKey {
  return GAME_KEYS.includes(code);
}

function isTyping() {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

/**
 * `isActive` dice si el motor está capturando el teclado: no está en pausa y
 * la fase no es "gameover". Solo entonces se encolan las pulsaciones y se hace
 * preventDefault, para que Espacio y las flechas no hagan scroll.
 *
 * Las repeticiones del sistema (`e.repeat`) también se encolan: mantener una
 * tecla repite la acción como en game.js, sin DAS propio.
 */
export function createInput(target: Window, isActive: () => boolean): Input {
  const keys: Partial<Record<GameKey, boolean>> = {};
  let queue: GameKey[] = [];

  const capturing = () => isActive() && !isTyping();

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isGameKey(e.code) || !capturing()) return;
    e.preventDefault();
    keys[e.code] = true;
    queue.push(e.code);
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!isGameKey(e.code)) return;
    // Soltar siempre, aunque no se capture, para no dejar teclas pegadas.
    keys[e.code] = false;
    if (capturing()) e.preventDefault();
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    drain: () => {
      const out = queue;
      queue = [];
      return out;
    },
    isDown: (code) => !!keys[code],
    clear: () => {
      queue = [];
      for (const code of GAME_KEYS as GameKey[]) keys[code] = false;
    },
    destroy: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}
