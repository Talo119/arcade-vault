import {
  BALL_SIZE,
  BASE_BALL_VX,
  BASE_BALL_VY,
  BLOCK_COLORS,
  BLOCK_H,
  BLOCK_W,
  BLOCKS_ORIGIN_X,
  BLOCKS_ORIGIN_Y,
  COLORS,
  EXPLOSION_DURATION,
  EXPLOSION_FRAMES,
  H,
  MAX_DT,
  PADDLE_H,
  PADDLE_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POINTS_PER_BLOCK,
  START_LIVES,
  W,
} from "./config";
import {
  collideAABB,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from "./entities";
import { setupCanvas } from "@/lib/engines/canvas";
import { createInput } from "./input";
import { LEVELS } from "./levels";
import type {
  EngineCallbacks,
  EnginePhase,
  EngineStats,
  GameEngine,
} from "@/lib/engines/types";

// shadowBlur de cada elemento. Los bloques brillan poco para que la separación
// de 1 px se lea; los trozos de la explosión destellan más que los bloques.
const GLOW_BLOCK = 4;
const GLOW_SHARD = 12;
const GLOW_PADDLE = 14;
const GLOW_BALL = 12;

// Bloque dibujado dentro de su celda, con 1 px de separación.
const BLOCK_INSET = 1;
const SHINE_H = 4; // franja de brillo de bloques y paleta
const SHINE = "rgba(255, 255, 255, 0.12)";
const SHARD_SPREAD = 6; // px que se separa cada trozo de la explosión por frame

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
): GameEngine {
  // Buffer a resolución física, dibujo en coordenadas lógicas de 800×600.
  // Los límites usan W y H, nunca canvas.width ni canvas.height.
  const { ctx } = setupCanvas(canvas, W, H);

  // ── Estado ──────────────────────────────────────────────────────────────────
  let phase: EnginePhase = "ready";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  const paddle: Paddle = { x: 0, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H };
  const ball: Ball = {
    x: 0,
    y: 0,
    w: BALL_SIZE,
    h: BALL_SIZE,
    vx: BASE_BALL_VX,
    vy: BASE_BALL_VY,
  };
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = START_LIVES;
  let level = 1;

  let lastStats: EngineStats = { score, level, lives };

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
    if (
      score === lastStats.score &&
      level === lastStats.level &&
      lives === lastStats.lives
    )
      return;
    lastStats = { score, level, lives };
    callbacks.onStats(lastStats);
  }

  function centerPaddle() {
    paddle.x = (W - paddle.w) / 2; // 359,5
  }

  // Pelota sobre la paleta con la velocidad del nivel, como initBall en game.js.
  function serveBall() {
    const speed = LEVELS[level - 1].speed;
    ball.x = paddle.x + (paddle.w - ball.w) / 2;
    ball.y = paddle.y - ball.h;
    ball.vx = BASE_BALL_VX * speed;
    ball.vy = BASE_BALL_VY * speed;
  }

  // La paleta no se recentra; la pelota sale en el mismo frame.
  function loadLevel(n: number) {
    level = n;
    blocks = LEVELS[n - 1].blocks.map((b) => ({
      x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
      y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
      w: BLOCK_W,
      h: BLOCK_H,
      color: b.color,
      alive: true,
    }));
    explosions = [];
    serveBall();
  }

  function initGame() {
    score = 0;
    lives = START_LIVES;
    centerPaddle();
    loadLevel(1);
    setPhase("playing");
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    // Espacio solo hace algo en "ready"; en "playing" se consume sin efecto.
    const space = input.pressed("Space");
    if (phase === "ready") {
      if (!space) return;
      initGame();
    }
    if (phase !== "playing") return;

    // Paleta
    if (input.isDown("ArrowLeft"))
      paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
    if (input.isDown("ArrowRight"))
      paddle.x = Math.min(W - paddle.w, paddle.x + PADDLE_SPEED * dt);

    // Movimiento de la pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Paredes izquierda, derecha y de arriba. No hay pared abajo.
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
    }

    // Paleta: el ángulo no cambia.
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + 8
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
    }

    // Bloques: un bloque por frame; todo choque invierte vy.
    for (const block of blocks) {
      if (!block.alive || !collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push({
        x: block.x,
        y: block.y,
        color: block.color,
        elapsed: 0,
      });
      score += POINTS_PER_BLOCK;
      ball.vy = -ball.vy;
      if (blocks.every((b) => !b.alive)) {
        if (level < LEVELS.length) {
          loadLevel(level + 1);
        } else {
          setPhase("gameover");
          return;
        }
      }
      break;
    }

    // Explosiones
    for (const exp of explosions) exp.elapsed += dt * 1000;
    explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

    // Pelota perdida: sale de nuevo desde la paleta en el mismo frame.
    if (ball.y > H) {
      lives--;
      if (lives <= 0) {
        lives = 0;
        setPhase("gameover");
      } else {
        serveBall();
      }
    }
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function drawBlock(block: Block) {
    const color = BLOCK_COLORS[block.color];
    const x = block.x + BLOCK_INSET;
    const y = block.y + BLOCK_INSET;
    const w = block.w - BLOCK_INSET * 2; // 62
    const h = block.h - BLOCK_INSET * 2; // 22
    ctx.fillStyle = color;
    ctx.shadowBlur = GLOW_BLOCK;
    ctx.shadowColor = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = SHINE;
    ctx.fillRect(x, y, w, SHINE_H);
  }

  // 4 frames en 150 ms, como game.js:223: el bloque se parte en 2×2 trozos
  // que se separan del centro y se desvanecen.
  function drawExplosion(exp: Explosion) {
    const frame = Math.min(
      Math.floor((exp.elapsed / EXPLOSION_DURATION) * EXPLOSION_FRAMES),
      EXPLOSION_FRAMES - 1,
    );
    const color = BLOCK_COLORS[exp.color];
    const w = (BLOCK_W - BLOCK_INSET * 2) / 2; // 31
    const h = (BLOCK_H - BLOCK_INSET * 2) / 2; // 11
    const x = exp.x + BLOCK_INSET;
    const y = exp.y + BLOCK_INSET;
    const off = frame * SHARD_SPREAD;
    ctx.globalAlpha = 1 - frame * 0.25;
    ctx.fillStyle = color;
    ctx.shadowBlur = GLOW_SHARD;
    ctx.shadowColor = color;
    ctx.fillRect(x - off, y - off, w, h);
    ctx.fillRect(x + w + off, y - off, w, h);
    ctx.fillRect(x - off, y + h + off, w, h);
    ctx.fillRect(x + w + off, y + h + off, w, h);
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }

  function drawPaddle() {
    ctx.fillStyle = COLORS.paddle;
    ctx.shadowBlur = GLOW_PADDLE;
    ctx.shadowColor = COLORS.paddle;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    ctx.shadowBlur = 0;
    ctx.fillStyle = SHINE;
    ctx.fillRect(paddle.x, paddle.y, paddle.w, SHINE_H);
  }

  // Círculo de radio 8; la caja de choque sigue siendo el cuadrado de 16×16.
  function drawBall() {
    ctx.fillStyle = COLORS.ball;
    ctx.shadowBlur = GLOW_BALL;
    ctx.shadowColor = COLORS.ball;
    ctx.beginPath();
    ctx.arc(
      ball.x + ball.w / 2,
      ball.y + ball.h / 2,
      ball.w / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Sin texto: puntuación, nivel y vidas van en el HUD de React.
  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    for (const block of blocks) if (block.alive) drawBlock(block);

    // En "gameover" solo quedan los bloques, quietos.
    if (phase === "gameover") return;

    for (const exp of explosions) drawExplosion(exp);
    drawPaddle();
    drawBall();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    // Segundos, limitados a MAX_DT.
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

  // Fase inicial "ready": los 60 bloques del nivel 1, la paleta centrada y la
  // pelota encima, todo quieto.
  centerPaddle();
  loadLevel(1);
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
