import {
  BLOCK,
  BOARD_W,
  COLORS,
  COLS,
  H,
  INTERVAL_STEP,
  LINE_SCORES,
  LINES_PER_LEVEL,
  MAX_SCORE,
  MIN_INTERVAL,
  PIECE_COLORS,
  ROWS,
  START_INTERVAL,
  W,
} from "./config";
import { clearLines, collide, createBoard, ghostY, merge } from "./board";
import { setupCanvas } from "@/lib/engines/canvas";
import { createInput, type GameKey } from "./input";
import { randomPiece, rotateCW, type Piece, type Shape } from "./pieces";
import type {
  EngineCallbacks,
  EnginePhase,
  EngineStats,
  GameEngine,
} from "@/lib/engines/types";

const KICKS = [0, -1, 1, -2, 2];

// Columna lateral: caja SIGUIENTE de 4×4 bloques y el contador de LÍNEAS.
const NEXT_X = 315;
const NEXT_Y = 50;
const NEXT_SIZE = 4 * BLOCK; // 120
const LINES_Y = NEXT_Y + NEXT_SIZE + 44; // base de la etiqueta LÍNEAS

// shadowBlur: la pieza que cae brilla más que las fijadas.
const GLOW_ACTIVE = 14;
const GLOW_LOCKED = 6;

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): GameEngine {
  // Buffer a resolución física, dibujo en coordenadas lógicas de 450×600.
  const { ctx, fontFamily } = setupCanvas(canvas, W, H);
  // Fuente de los valores del HUD, leída una vez como --mono en setupCanvas.
  const pixelFont =
    getComputedStyle(canvas).getPropertyValue("--pixel").trim() || "monospace";

  // ── Estado ──────────────────────────────────────────────────────────────────
  let phase: EnginePhase = "ready";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  let board = createBoard();
  let current: Piece | null = null;
  let next: Piece | null = null;
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = START_INTERVAL;
  let dropAccum = 0;
  // La pulsación de Espacio que empieza la partida no suelta la pieza.
  let swallowSpace = false;

  let lastStats: EngineStats = { score, level, lives: null };

  const input = createInput(
    window,
    () => !destroyed && !paused && phase !== "gameover",
  );

  function setPhase(nextPhase: EnginePhase) {
    if (phase === nextPhase) return;
    phase = nextPhase;
    callbacks.onPhase(nextPhase);
  }

  function emitStats() {
    if (score === lastStats.score && level === lastStats.level) return;
    lastStats = { score, level, lives: null };
    callbacks.onStats(lastStats);
  }

  function addScore(points: number) {
    score = Math.min(score + points, MAX_SCORE);
  }

  function initGame() {
    board = createBoard();
    score = 0;
    lines = 0;
    level = 1;
    dropInterval = START_INTERVAL;
    dropAccum = 0;
    next = randomPiece();
    setPhase("playing");
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (current && collide(board, current.shape, current.x, current.y)) {
      setPhase("gameover");
    }
  }

  // ── Acciones ────────────────────────────────────────────────────────────────
  function move(dx: number) {
    if (!current) return;
    if (!collide(board, current.shape, current.x + dx, current.y))
      current.x += dx;
  }

  function tryRotate() {
    if (!current) return;
    const rotated = rotateCW(current.shape);
    for (const kick of KICKS) {
      if (!collide(board, rotated, current.x + kick, current.y)) {
        current.shape = rotated;
        current.x += kick;
        return;
      }
    }
  }

  function softDrop() {
    if (!current) return;
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      addScore(1);
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (!current) return;
    const gy = ghostY(board, current);
    addScore((gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }

  function lockPiece() {
    if (!current) return;
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      lines += cleared;
      addScore((LINE_SCORES[cleared] || 0) * level);
      level = Math.floor(lines / LINES_PER_LEVEL) + 1;
      dropInterval = Math.max(
        MIN_INTERVAL,
        START_INTERVAL - (level - 1) * INTERVAL_STEP,
      );
    }
    spawn();
  }

  function apply(key: GameKey) {
    switch (key) {
      case "ArrowLeft":
        move(-1);
        break;
      case "ArrowRight":
        move(1);
        break;
      case "ArrowDown":
        softDrop();
        break;
      case "ArrowUp":
      case "KeyX":
        tryRotate();
        break;
      case "Space":
        hardDrop();
        break;
    }
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    const keys = input.drain();

    if (phase === "ready") {
      // Solo Espacio hace algo; el resto de la cola se descarta.
      if (keys.includes("Space")) {
        initGame();
        swallowSpace = true;
      }
    } else if (phase === "playing") {
      for (const key of keys) {
        if (phase !== "playing") break;
        if (key === "Space" && swallowSpace) continue;
        apply(key);
      }

      if (phase === "playing" && current) {
        dropAccum += dt;
        if (dropAccum >= dropInterval) {
          dropAccum = 0;
          if (!collide(board, current.shape, current.x, current.y + 1)) {
            current.y++;
          } else {
            lockPiece();
          }
        }
      }
    }

    if (swallowSpace && !input.isDown("Space")) swallowSpace = false;
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBlock(
    px: number,
    py: number,
    type: number,
    alpha: number,
    glow: number,
  ) {
    const color = PIECE_COLORS[type];
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillRect(px + 1, py + 1, BLOCK - 2, BLOCK - 2);
    ctx.shadowBlur = 0;
    // Franja de brillo.
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillRect(px + 1, py + 1, BLOCK - 2, 4);
    ctx.globalAlpha = 1;
  }

  function drawShape(
    shape: Shape,
    ox: number,
    oy: number,
    alpha: number,
    glow: number,
  ) {
    for (let r = 0; r < shape.length; r++)
      for (let c = 0; c < shape[r].length; c++)
        if (shape[r][c])
          drawBlock(ox + c * BLOCK, oy + r * BLOCK, shape[r][c], alpha, glow);
  }

  function drawGrid() {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let c = 1; c < COLS; c++) {
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(BOARD_W, r * BLOCK);
    }
    ctx.stroke();
  }

  function drawBoard() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, BOARD_W, H);
    drawGrid();

    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (board[r][c])
          drawBlock(c * BLOCK, r * BLOCK, board[r][c], 1, GLOW_LOCKED);

    // En "gameover" el tablero queda congelado sin la pieza actual ni su sombra.
    if (phase === "playing" && current) {
      const gy = ghostY(board, current);
      drawShape(current.shape, current.x * BLOCK, gy * BLOCK, 0.2, 0);
      drawShape(
        current.shape,
        current.x * BLOCK,
        current.y * BLOCK,
        1,
        GLOW_ACTIVE,
      );
    }
  }

  function drawSidebar() {
    ctx.fillStyle = COLORS.panelBg;
    ctx.fillRect(BOARD_W, 0, W - BOARD_W, H);

    ctx.strokeStyle = COLORS.divider;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(BOARD_W + 0.5, 0);
    ctx.lineTo(BOARD_W + 0.5, H);
    ctx.stroke();

    // SIGUIENTE
    drawLabel("SIGUIENTE", NEXT_Y - 14);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(NEXT_X, NEXT_Y, NEXT_SIZE, NEXT_SIZE);
    ctx.strokeStyle = COLORS.divider;
    ctx.strokeRect(NEXT_X + 0.5, NEXT_Y + 0.5, NEXT_SIZE - 1, NEXT_SIZE - 1);
    if (next) {
      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      drawShape(
        shape,
        NEXT_X + offX * BLOCK,
        NEXT_Y + offY * BLOCK,
        1,
        GLOW_ACTIVE,
      );
    }

    // LÍNEAS: valor con la fuente pixel y el glow del HUD.
    drawLabel("LÍNEAS", LINES_Y);
    ctx.save();
    ctx.fillStyle = COLORS.value;
    ctx.shadowBlur = 6;
    ctx.shadowColor = "rgba(230, 233, 255, 0.5)"; // --ink al 50 %, como .hud-stat .v
    ctx.font = `20px ${pixelFont}`;
    ctx.fillText(String(lines), NEXT_X, LINES_Y + 34);
    ctx.restore();
  }

  // Etiqueta como .hud-stat .l: mono, mayúsculas y espaciada.
  function drawLabel(text: string, y: number) {
    ctx.save();
    ctx.fillStyle = COLORS.label;
    ctx.font = `11px ${fontFamily}`;
    ctx.letterSpacing = "1.5px";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(text, NEXT_X, y);
    ctx.restore();
  }

  function draw() {
    drawBoard();
    drawSidebar();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    // Milisegundos, como game.js, limitados a 50.
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 50);
    lastTime = ts;
    update(dt);
    emitStats();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Fase inicial "ready": tablero vacío con la rejilla, sin pieza.
  start();

  return {
    setPaused(nextPaused) {
      if (destroyed || nextPaused === paused) return;
      paused = nextPaused;
      if (paused) {
        stop();
        input.clear();
      } else {
        start();
      }
    },
    end() {
      if (destroyed || phase === "gameover") return;
      setPhase("gameover");
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      input.destroy();
    },
  };
}
