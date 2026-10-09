export type GameKey = "ArrowLeft" | "ArrowRight" | "Space";

const GAME_KEYS: readonly string[] = ["ArrowLeft", "ArrowRight", "Space"];

export interface Input {
  /** Tecla mantenida. */
  isDown: (code: GameKey) => boolean;
  /** Pulsación de un frame: devuelve true una sola vez por pulsación. */
  pressed: (code: GameKey) => boolean;
  /** Suelta todas las teclas y descarta las pulsaciones pendientes. */
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
 * la fase no es "gameover". Solo entonces se registran las pulsaciones y se
 * hace preventDefault, para que Espacio y las flechas no hagan scroll.
 *
 * ← y → se leen como teclas mantenidas, sin autorrepetición: la paleta se
 * mueve mientras estén pulsadas, como `keys` en game.js.
 */
export function createInput(target: Window, isActive: () => boolean): Input {
  const keys: Partial<Record<GameKey, boolean>> = {};
  const justPressed: Partial<Record<GameKey, boolean>> = {};

  const capturing = () => isActive() && !isTyping();

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isGameKey(e.code) || !capturing()) return;
    e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
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
    isDown: (code) => !!keys[code],
    pressed: (code) => {
      const val = !!justPressed[code];
      justPressed[code] = false;
      return val;
    },
    clear: () => {
      for (const code of GAME_KEYS as GameKey[]) {
        keys[code] = false;
        justPressed[code] = false;
      }
    },
    destroy: () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    },
  };
}
