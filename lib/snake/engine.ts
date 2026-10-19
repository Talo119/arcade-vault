import {
  CELL,
  COLS,
  FIRST_FRUIT,
  H,
  MAX_DT,
  POINTS_PER_FRUIT,
  ROWS,
  SKINS,
  START_DIR,
  START_SNAKE,
  W,
} from "./config";
import {
  levelForFruits,
  randomFreeCell,
  stepMsForLevel,
  type Cell,
  type Dir,
} from "./board";
import { setupCanvas } from "@/lib/engines/canvas";
import { DEFAULT_SKIN, type SkinId } from "@/lib/engines/skins";
import { createInput } from "./input";
import { FRUIT_SPRITES, FRUITS_SRC, type FruitSprite } from "./sprites";
import type {
  EngineCallbacks,
  EnginePhase,
  EngineStats,
  GameEngine,
} from "@/lib/engines/types";

const DELTA: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// Cada segmento es un cuadrado de 28×28 centrado en su celda de 32.
const SEG_INSET = 2;
const SEG_SIZE = CELL - SEG_INSET * 2; // 28
const EYE_SIZE = 4;
const EYE_EDGE = 4; // px desde el borde delantero de la cabeza
const EYE_SIDE = 6; // px desde cada lateral de la cabeza

const BORDER_W = 2;
// shadowBlur de cada elemento con glow 1; se multiplican por palette.glow.
const GLOW_BODY = 10;
const GLOW_HEAD = 12;
const GLOW_BORDER = 12;
const GLOW_FALLBACK = 12;
// Halo tenue tras la fruta: los sprites oscuros (brócoli, pimiento) se
// despegan del fondo negro sin competir con el glow de la serpiente.
const GLOW_FRUIT = 10;
const FALLBACK_RADIUS = 10;
const GAMEOVER_ALPHA = 0.35;
const SPRITE_SCALE = 1 / 5; // 160 px → 32 px

const SPRITES: readonly FruitSprite[] = Object.values(FRUIT_SPRITES);

function randomSprite() {
  return SPRITES[Math.floor(Math.random() * SPRITES.length)];
}

export function createSnakeGame(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): Required<GameEngine> {
  // Buffer a resolución física, dibujo en coordenadas lógicas de 768×576.
  // Los límites usan COLS, ROWS, W y H, nunca canvas.width ni canvas.height.
  const { ctx } = setupCanvas(canvas, W, H);

  // ── Estado ──────────────────────────────────────────────────────────────────
  let palette = SKINS[skin];
  let phase: EnginePhase = "ready";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  let snake: Cell[] = []; // cabeza primero
  let dir: Dir = START_DIR;
  let fruit: Cell | null = null; // null solo con el tablero lleno
  let sprite: FruitSprite = randomSprite();
  let fruits = 0;
  let score = 0;
  let level = 1;
  let stepMs = stepMsForLevel(level);
  let acc = 0; // ms acumulados hacia el siguiente paso

  let lastStats: EngineStats = { score, level, lives: null };

  const input = createInput(
    window,
    () => !destroyed && !paused && phase !== "gameover",
    () => (phase === "playing" ? dir : null),
  );

  // El PNG no bloquea la lógica: la fruta se dibuja en cuanto carga y, si
  // falla, se dibuja como un círculo fruitFallback.
  let imageFailed = false;
  const image = new Image();
  const onImageError = () => {
    imageFailed = true;
  };
  image.addEventListener("error", onImageError);
  image.src = FRUITS_SRC;

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

  // Serpiente y 1.ª fruta iniciales; el sprite de la 1.ª fruta es el de "ready".
  function resetBoard() {
    snake = START_SNAKE.map((c) => ({ ...c }));
    dir = START_DIR;
    fruit = { ...FIRST_FRUIT };
  }

  function initGame() {
    score = 0;
    level = 1;
    fruits = 0;
    stepMs = stepMsForLevel(level);
    acc = 0;
    resetBoard();
    input.clear();
    setPhase("playing");
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function step() {
    const turn = input.nextTurn();
    if (turn) dir = turn;

    const head = snake[0];
    const next = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y };

    // Borde: la serpiente no se mueve en este paso.
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      setPhase("gameover");
      return;
    }

    const eats = fruit !== null && next.x === fruit.x && next.y === fruit.y;
    // Si no come, la cola se va en este paso: su celda cuenta como libre.
    const body = eats ? snake : snake.slice(0, -1);
    if (body.some((c) => c.x === next.x && c.y === next.y)) {
      setPhase("gameover");
      return;
    }

    snake.unshift(next);

    if (!eats) {
      snake.pop();
      return;
    }

    fruits += 1;
    score += POINTS_PER_FRUIT * level; // nivel de antes de comer
    level = levelForFruits(fruits);
    stepMs = stepMsForLevel(level);

    fruit = randomFreeCell(snake);
    if (fruit === null) {
      setPhase("gameover"); // tablero lleno
      return;
    }
    sprite = randomSprite();
  }

  function update(dt: number) {
    // Espacio solo hace algo en "ready"; en "playing" se consume sin efecto.
    const space = input.pressed();
    if (phase === "ready") {
      if (!space) return;
      initGame();
    }
    if (phase !== "playing") return;

    acc += dt * 1000;
    while (phase === "playing" && acc >= stepMs) {
      acc -= stepMs;
      step();
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawGrid() {
    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    // +0,5 para que las líneas de 1 px caigan en un píxel entero.
    for (let x = CELL; x < W; x += CELL) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = CELL; y < H; y += CELL) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();
  }

  function drawBorder() {
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = BORDER_W;
    ctx.shadowBlur = GLOW_BORDER * palette.glow;
    ctx.shadowColor = palette.border;
    // Dentro del canvas: el trazo de 2 px va de 0 a 2 en cada lado.
    ctx.strokeRect(BORDER_W / 2, BORDER_W / 2, W - BORDER_W, H - BORDER_W);
    ctx.shadowBlur = 0;
  }

  function drawFruit(cell: Cell) {
    const cx = cell.x * CELL + CELL / 2;
    const cy = cell.y * CELL + CELL / 2;

    // Sin sprite en la skin, el círculo no espera a que cargue el PNG.
    if (imageFailed || !palette.fruitSprite) {
      ctx.fillStyle = palette.fruitFallback;
      ctx.shadowBlur = GLOW_FALLBACK * palette.glow;
      ctx.shadowColor = palette.fruitFallback;
      ctx.beginPath();
      ctx.arc(cx, cy, FALLBACK_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      return;
    }
    if (!image.complete || image.naturalWidth === 0) return;

    const dw = sprite.w * SPRITE_SCALE;
    const dh = sprite.h * SPRITE_SCALE; // 32
    // setupCanvas y los cambios de tamaño pueden restablecerlo: antes de cada dibujo.
    ctx.imageSmoothingEnabled = false;
    ctx.shadowBlur = GLOW_FRUIT * palette.glow;
    ctx.shadowColor = palette.fruitGlow;
    ctx.drawImage(
      image,
      sprite.x,
      sprite.y,
      sprite.w,
      sprite.h,
      cx - dw / 2,
      cy - dh / 2,
      dw,
      dh,
    );
    ctx.shadowBlur = 0;
  }

  function drawSegment(cell: Cell, color: string, glow: number) {
    ctx.fillStyle = color;
    ctx.shadowBlur = glow;
    ctx.shadowColor = color;
    ctx.fillRect(
      cell.x * CELL + SEG_INSET,
      cell.y * CELL + SEG_INSET,
      SEG_SIZE,
      SEG_SIZE,
    );
  }

  // Dos ojos en el lado hacia el que avanza la cabeza.
  function drawEyes(head: Cell) {
    const x0 = head.x * CELL + SEG_INSET;
    const y0 = head.y * CELL + SEG_INSET;
    // Desplazamientos dentro del cuadrado de 28: a lo ancho (los dos lados)
    // y a lo largo (borde delantero bajo para "up"/"left", alto para "right"/"down").
    const side1 = EYE_SIDE;
    const side2 = SEG_SIZE - EYE_SIDE - EYE_SIZE;
    const frontLow = EYE_EDGE;
    const frontHigh = SEG_SIZE - EYE_EDGE - EYE_SIZE;
    const eyes: [number, number][] =
      dir === "right"
        ? [
            [frontHigh, side1],
            [frontHigh, side2],
          ]
        : dir === "left"
          ? [
              [frontLow, side1],
              [frontLow, side2],
            ]
          : dir === "up"
            ? [
                [side1, frontLow],
                [side2, frontLow],
              ]
            : [
                [side1, frontHigh],
                [side2, frontHigh],
              ];

    ctx.shadowBlur = 0;
    ctx.fillStyle = palette.eyes;
    for (const [ex, ey] of eyes)
      ctx.fillRect(x0 + ex, y0 + ey, EYE_SIZE, EYE_SIZE);
  }

  function drawSnake() {
    // De la cola a la cabeza, para que la cabeza quede encima.
    for (let i = snake.length - 1; i >= 1; i--)
      drawSegment(snake[i], palette.body, GLOW_BODY * palette.glow);
    drawSegment(snake[0], palette.head, GLOW_HEAD * palette.glow);
    drawEyes(snake[0]);
    ctx.shadowBlur = 0;
  }

  // Sin texto: puntuación y nivel van en el HUD de React.
  function draw() {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, W, H);
    drawGrid();

    if (fruit) drawFruit(fruit);

    // En "gameover" la serpiente se queda donde chocó, atenuada.
    if (phase === "gameover") ctx.globalAlpha = GAMEOVER_ALPHA;
    drawSnake();
    ctx.globalAlpha = 1;

    drawBorder();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    // Segundos, limitados a MAX_DT: con el paso mínimo de 55 ms nunca hay más
    // de un paso por frame.
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
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

  // Fase inicial "ready": la serpiente en (4..6, 9) hacia la derecha y la 1.ª
  // fruta en (17, 9), todo quieto.
  resetBoard();
  start();

  return {
    setPaused(nextPaused) {
      if (destroyed || nextPaused === paused) return;
      paused = nextPaused;
      if (paused) {
        stop();
        input.clear();
      } else {
        // lastTime = null: el primer frame tiene dt = 0; el acumulador se conserva.
        start();
      }
    },
    end() {
      if (destroyed || phase === "gameover") return;
      setPhase("gameover");
    },
    setSkin(next) {
      if (destroyed) return;
      palette = SKINS[next];
      // En pausa no hay rAF: un frame sin update para que se vea detrás de EN PAUSA.
      if (paused) draw();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stop();
      input.destroy();
      image.removeEventListener("error", onImageError);
    },
  };
}
