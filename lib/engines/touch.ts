// Controles táctiles: los botones virtuales despachan KeyboardEvent sintéticos
// con el mismo `code` que el teclado, así que los motores no cambian.

export const TOUCH_QUERY = "(hover: none) and (pointer: coarse)"; // la misma que mostraba REQUIERE TECLADO
export const TOUCH_START_PROMPT = "TOCA PARA EMPEZAR";
export const TOUCH_REPEAT_DELAY_MS = 170; // primera repetición
export const TOUCH_REPEAT_INTERVAL_MS = 50; // repeticiones siguientes

// Se despacha en window, que es donde escuchan los input.ts de los motores.
export function dispatchKey(
  type: "keydown" | "keyup",
  code: string,
  repeat = false,
): void {
  window.dispatchEvent(
    new KeyboardEvent(type, { code, repeat, bubbles: true, cancelable: true }),
  );
}

// keydown + keyup en el mismo tick: el toque sobre el CRT en "ready".
export function tapKey(code: string): void {
  dispatchKey("keydown", code);
  dispatchKey("keyup", code);
}
