import { COLS, ROWS } from "./config";
import type { Piece, Shape } from "./pieces";

/** ROWS filas de COLS celdas: 0 vacía, 1–8 el tipo de la pieza fijada. */
export type Board = number[][];

export function createBoard(): Board {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

/** Si `shape` en (x, y) se sale por los lados o el fondo, o pisa un bloque. */
export function collide(board: Board, shape: Shape, x: number, y: number) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = x + c;
      const ny = y + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function merge(board: Board, piece: Piece) {
  const { shape, x, y } = piece;
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c]) board[y + r][x + c] = shape[r][c];
}

/** Quita las filas llenas, mete filas vacías arriba y devuelve cuántas quitó. */
export function clearLines(board: Board) {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

/** Fila donde aterrizaría la pieza si cayera recta. */
export function ghostY(board: Board, piece: Piece) {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}
