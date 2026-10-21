import {
  CELL,
  COLS,
  DEAD_MS,
  GLOW_BASE,
  H,
  JUMP_MS,
  MAX_DT,
  MAX_SCORE,
  POINTS_GOAL,
  POINTS_PER_SECOND,
  POINTS_ROUND,
  POINTS_STEP,
  ROW_BANK,
  ROW_GOALS,
  ROW_RIVER_BOT,
  ROW_RIVER_TOP,
  ROW_ROAD_BOT,
  ROW_ROAD_TOP,
  ROW_START,
  ROW_TIMER,
  SKINS,
  START,
  W,
} from "./config";
import {
  GOAL_COLS,
  goalAt,
  isRiverRow,
  roundTime,
  supportAt,
  vehicleHits,
  type Dir,
  type Frog,
} from "./board";
import { buildLanes, turtleState, updateLanes, type Lane } from "./lanes";
import { setupCanvas } from "@/lib/engines/canvas";
import { DEFAULT_SKIN, type SkinId } from "@/lib/engines/skins";
import { createInput } from "./input";
import type {
  EngineCallbacks,
  EnginePhase,
  EngineStats,
  GameEngine,
} from "@/lib/engines/types";

const DELTA: Record<Dir, { x: number; row: number }> = {
  up: { x: 0, row: -1 },
  down: { x: 0, row: 1 },
  left: { x: -1, row: 0 },
  right: { x: 1, row: 0 },
};

const INITIAL_LIVES = 3;

// Rana: elipse de 28×24 centrada en su celda.
const FROG_RX = 14;
const FROG_RY = 12;
const EYE_DX = 6; // px del centro a cada ojo
const EYE_DY = 10; // px del centro a la altura de los ojos
const SOCKET_R = 5.5;
const FROG_OUTLINE = 2;
const EYE_R = 3.5;
const PUPIL_R = 2;
const LEG_W = 4;
const LEG_ROOT = 8; // px del centro donde nace cada pata
const LEG_Y = 8; // px arriba y abajo del centro
const LEG_TUCK = 6; // patas recogidas
const LEG_LEN = 11; // patas extendidas
const DEAD_INSET = 10; // px desde el borde de la celda a los extremos de la X
const DEAD_W = 4;

// Vehículos, troncos y tortugas, en px dentro de su fila de 40.
const CAR_INSET_X = 4;
const CAR_INSET_Y = 8;
const CAR_RADIUS = 6;
const WHEEL_W = 8;
const WHEEL_H = 3;
const TRUCK_INSET_X = 2;
const TRUCK_INSET_Y = 6;
const CAB_LEN = 12; // px de cabina desde el frente
const LOG_INSET_X = 2;
const LOG_INSET_Y = 5;
const LOG_RADIUS = 12;
const LOG_GRAIN_ALPHA = 0.35;
const TURTLE_R = 15;
const SHELL_R = 8;
const DIVE_ALPHA = 0.3;

const BAY_BORDER_W = 2;
const LANE_DASH = [12, 10];
const TIMER_INSET_X = 8;
const TIMER_H = 12;

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: EngineCallbacks,
  skin: SkinId = DEFAULT_SKIN,
): Required<GameEngine> {
  // Buffer a resolución física, dibujo en coordenadas lógicas de 640×600.
  // Los límites usan COLS, ROWS, CELL, W y H, nunca canvas.width ni canvas.height.
  const { ctx } = setupCanvas(canvas, W, H);

  // ── Estado ──────────────────────────────────────────────────────────────────
  let palette = SKINS[skin];
  let phase: EnginePhase = "ready";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  let lanes: Lane[] = buildLanes(1);
  let frog: Frog = newFrog();
  let bays: boolean[] = GOAL_COLS.map(() => false);
  let score = 0;
  let level = 1;
  let lives = INITIAL_LIVES;
  let timeLeft = roundTime(level); // s
  let deadMs = 0; // ms que quedan de "dead"
  let deadAt = { x: START.x, row: START.row }; // dónde se dibuja la X

  let lastStats: EngineStats = { score, level, lives };

  const input = createInput(
    window,
    () => !destroyed && !paused && phase !== "gameover",
  );

  function newFrog(): Frog {
    return { x: START.x, row: START.row, jump: null, maxRow: START.row };
  }

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

  function addScore(points: number) {
    score = Math.min(MAX_SCORE, score + points);
  }

  // Rana nueva en la salida con el reloj lleno: al empezar, tras "dead" y al ocupar una boca.
  function respawn() {
    frog = newFrog();
    timeLeft = roundTime(level);
    input.clear();
  }

  function initGame() {
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    lanes = buildLanes(level);
    bays = GOAL_COLS.map(() => false);
    respawn();
    setPhase("playing");
  }

  /** Posición dibujada de la rana: interpolada durante el salto. */
  function frogPos() {
    const j = frog.jump;
    if (!j) return { x: frog.x, row: frog.row, jumping: false };
    const k = Math.min(j.t / JUMP_MS, 1);
    return {
      x: j.fromX + (j.toX - j.fromX) * k,
      row: j.fromRow + (j.toRow - j.fromRow) * k,
      jumping: true,
    };
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function die() {
    const { x, row } = frogPos();
    deadAt = { x, row };
    frog.jump = null;
    lives -= 1;
    if (lives === 0) {
      setPhase("gameover");
      return;
    }
    deadMs = DEAD_MS;
    setPhase("dead");
  }

  function startJump(dir: Dir) {
    const toX = frog.x + DELTA[dir].x;
    const toRow = frog.row + DELTA[dir].row;
    // Fuera del tablero jugable: la dirección se descarta.
    if (toX < 0 || toX > COLS - 1 || toRow < ROW_GOALS || toRow > ROW_START)
      return;
    frog.jump = { fromX: frog.x, fromRow: frog.row, toX, toRow, t: 0 };
  }

  function reachGoal(bay: number) {
    bays[bay] = true;
    addScore(
      POINTS_STEP + POINTS_GOAL + Math.ceil(timeLeft) * POINTS_PER_SECOND,
    );
    if (bays.every(Boolean)) {
      addScore(POINTS_ROUND);
      level += 1;
      bays = GOAL_COLS.map(() => false);
      lanes = buildLanes(level);
    }
    respawn();
  }

  function land() {
    const j = frog.jump;
    if (!j) return;
    frog.x = j.toX;
    frog.row = j.toRow;
    frog.jump = null;
    if (!isRiverRow(frog.row)) frog.x = Math.round(frog.x);

    if (frog.row === ROW_GOALS) {
      const bay = goalAt(frog.x);
      if (bay === null || bays[bay]) die();
      else reachGoal(bay);
      return;
    }
    if (isRoadRow(frog.row) && vehicleHits(frog, lanes)) {
      die();
      return;
    }
    if (isRiverRow(frog.row) && supportAt(frog, lanes) === null) {
      die();
      return;
    }
    if (frog.row < frog.maxRow) {
      frog.maxRow = frog.row;
      addScore(POINTS_STEP);
    }
  }

  // Rana quieta: deriva con su apoyo en el río y choques en la carretera.
  function standStill(dt: number) {
    if (isRiverRow(frog.row)) {
      const lane = lanes.find((l) => l.row === frog.row);
      if (lane) frog.x += lane.speed * lane.dir * dt;
      const center = frog.x + 0.5;
      if (center < 0 || center > COLS || supportAt(frog, lanes) === null) die();
      return;
    }
    if (isRoadRow(frog.row) && vehicleHits(frog, lanes)) die();
  }

  function updatePlaying(dt: number) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0;
      die();
      return;
    }

    if (frog.jump) {
      frog.jump.t += dt * 1000;
      if (frog.jump.t >= JUMP_MS) land();
      return;
    }

    standStill(dt);
    if (phase !== "playing") return;
    const dir = input.takeDir();
    if (dir) startJump(dir);
  }

  function update(dt: number) {
    // Espacio solo hace algo en "ready"; en "playing" se consume sin efecto.
    const space = input.pressed();
    if (phase === "ready" && space) {
      initGame();
      return; // los carriles arrancan desde sus x iniciales en el siguiente frame
    }

    // Los carriles se mueven en todas las fases; en pausa no hay rAF.
    updateLanes(lanes, dt);

    if (phase === "dead") {
      deadMs -= dt * 1000;
      if (deadMs <= 0) {
        respawn();
        setPhase("playing");
      }
      return;
    }

    if (phase !== "playing") {
      input.takeDir(); // fuera de "playing" las direcciones se descartan
      return;
    }
    updatePlaying(dt);
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function glow(color: string) {
    ctx.shadowBlur = GLOW_BASE * palette.glow;
    ctx.shadowColor = color;
  }

  function noGlow() {
    ctx.shadowBlur = 0;
  }

  function drawBoard() {
    ctx.fillStyle = palette.bg; // la carretera es el fondo
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = palette.water;
    ctx.fillRect(
      0,
      ROW_RIVER_TOP * CELL,
      W,
      (ROW_RIVER_BOT - ROW_RIVER_TOP + 1) * CELL,
    );
    ctx.fillStyle = palette.safe;
    ctx.fillRect(0, ROW_BANK * CELL, W, CELL);
    ctx.fillRect(0, ROW_START * CELL, W, CELL);

    // Líneas discontinuas entre carriles de carretera; +0,5 para caer en un píxel entero.
    ctx.strokeStyle = palette.laneLine;
    ctx.lineWidth = 1;
    ctx.setLineDash(LANE_DASH);
    ctx.beginPath();
    for (let row = ROW_ROAD_TOP + 1; row <= ROW_ROAD_BOT; row++) {
      ctx.moveTo(0, row * CELL + 0.5);
      ctx.lineTo(W, row * CELL + 0.5);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGoals() {
    const y = ROW_GOALS * CELL;
    ctx.fillStyle = palette.wall;
    for (let col = 0; col < COLS; col++)
      if (goalAt(col) === null) ctx.fillRect(col * CELL, y, CELL, CELL);

    ctx.strokeStyle = palette.bayBorder;
    ctx.lineWidth = BAY_BORDER_W;
    GOAL_COLS.forEach((col, i) => {
      const half = BAY_BORDER_W / 2;
      ctx.strokeRect(
        col * CELL + half,
        y + half,
        2 * CELL - BAY_BORDER_W,
        CELL - BAY_BORDER_W,
      );
      if (bays[i]) drawFrogShape((col + 1) * CELL, y + CELL / 2, false);
    });
  }

  function drawCar(lane: Lane, x: number) {
    const color = palette[lane.color];
    const px = x * CELL + CAR_INSET_X;
    const py = lane.row * CELL + CAR_INSET_Y;
    const w = lane.width * CELL - CAR_INSET_X * 2;
    const h = CELL - CAR_INSET_Y * 2;
    ctx.fillStyle = color;
    glow(color);
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, CAR_RADIUS);
    ctx.fill();
    noGlow();
    // Ruedas: dos arriba y dos abajo, dentro de la carrocería.
    ctx.fillStyle = palette.bg;
    for (const wx of [px + 3, px + w - 3 - WHEEL_W])
      for (const wy of [py, py + h - WHEEL_H])
        ctx.fillRect(wx, wy, WHEEL_W, WHEEL_H);
  }

  function drawTruck(lane: Lane, x: number) {
    const color = palette[lane.color];
    const px = x * CELL + TRUCK_INSET_X;
    const py = lane.row * CELL + TRUCK_INSET_Y;
    const w = lane.width * CELL - TRUCK_INSET_X * 2;
    const h = CELL - TRUCK_INSET_Y * 2;
    ctx.fillStyle = color;
    glow(color);
    ctx.fillRect(px, py, w, h);
    noGlow();
    // Cabina separada por una línea, en el lado hacia el que avanza.
    const cut = lane.dir > 0 ? px + w - CAB_LEN : px + CAB_LEN;
    ctx.strokeStyle = palette.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cut, py);
    ctx.lineTo(cut, py + h);
    ctx.stroke();
  }

  function drawLog(lane: Lane, x: number) {
    const color = palette[lane.color];
    const px = x * CELL + LOG_INSET_X;
    const py = lane.row * CELL + LOG_INSET_Y;
    const w = lane.width * CELL - LOG_INSET_X * 2;
    const h = CELL - LOG_INSET_Y * 2;
    ctx.fillStyle = color;
    glow(color);
    ctx.beginPath();
    ctx.roundRect(px, py, w, h, LOG_RADIUS);
    ctx.fill();
    noGlow();
    // Vetas: dos trazos horizontales desplazados.
    ctx.globalAlpha = LOG_GRAIN_ALPHA;
    ctx.strokeStyle = palette.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px + 10, py + h / 3);
    ctx.lineTo(px + w * 0.6, py + h / 3);
    ctx.moveTo(px + w * 0.35, py + (h * 2) / 3);
    ctx.lineTo(px + w - 10, py + (h * 2) / 3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawTurtles(
    lane: Lane,
    x: number,
    state: ReturnType<typeof turtleState>,
  ) {
    if (state === "blinkOff") return;
    const color = palette[lane.color];
    const cy = lane.row * CELL + CELL / 2;
    for (let k = 0; k < lane.width; k++) {
      const cx = (x + k + 0.5) * CELL;
      ctx.beginPath();
      ctx.arc(cx, cy, TURTLE_R, 0, Math.PI * 2);
      if (state === "dive") {
        // Sumergida: solo el contorno, tenue.
        ctx.globalAlpha = DIVE_ALPHA;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = color;
      glow(color);
      ctx.fill();
      noGlow();
      // Caparazón: anillo interior y una cruz.
      ctx.strokeStyle = palette.bg;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, SHELL_R, 0, Math.PI * 2);
      ctx.moveTo(cx, cy - TURTLE_R + 3);
      ctx.lineTo(cx, cy - SHELL_R);
      ctx.moveTo(cx, cy + SHELL_R);
      ctx.lineTo(cx, cy + TURTLE_R - 3);
      ctx.stroke();
    }
  }

  function drawLanes() {
    for (const lane of lanes)
      for (const e of lane.entities) {
        if (lane.kind === "car") drawCar(lane, e.x);
        else if (lane.kind === "truck") drawTruck(lane, e.x);
        else if (lane.kind === "log") drawLog(lane, e.x);
        else drawTurtles(lane, e.x, turtleState(lane, e));
      }
  }

  // Elipse de 28×24 con dos ojos arriba; con `legs`, patas extendidas (salto).
  function drawFrogShape(cx: number, cy: number, jumping: boolean) {
    ctx.fillStyle = palette.frog;
    glow(palette.frog);
    // Patas: recogidas en reposo, extendidas durante el salto. Nacen dentro
    // del cuerpo para que no quede hueco entre pata y elipse.
    const legLen = jumping ? LEG_LEN : LEG_TUCK;
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        ctx.fillRect(
          sx > 0 ? cx + LEG_ROOT : cx - LEG_ROOT - legLen,
          cy + sy * LEG_Y - LEG_W / 2,
          legLen,
          LEG_W,
        );
    ctx.beginPath();
    ctx.ellipse(cx, cy, FROG_RX, FROG_RY, 0, 0, Math.PI * 2);
    // Cuencas de los ojos: sobresalen del borde superior, en el color de la rana.
    for (const sx of [-1, 1]) {
      ctx.moveTo(cx + sx * EYE_DX + SOCKET_R, cy - EYE_DY);
      ctx.arc(cx + sx * EYE_DX, cy - EYE_DY, SOCKET_R, 0, Math.PI * 2);
    }
    ctx.fill();
    noGlow();
    // Contorno en bg: la rana y los troncos tienen poca diferencia de
    // luminancia (~1,2:1), así que el borde oscuro la separa de su apoyo.
    ctx.strokeStyle = palette.bg;
    ctx.lineWidth = FROG_OUTLINE;
    ctx.beginPath();
    ctx.ellipse(cx, cy, FROG_RX, FROG_RY, 0, 0, Math.PI * 2);
    ctx.stroke();

    for (const sx of [-1, 1]) {
      const ex = cx + sx * EYE_DX;
      const ey = cy - EYE_DY;
      ctx.fillStyle = palette.eye;
      ctx.beginPath();
      ctx.arc(ex, ey, EYE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.pupil;
      ctx.beginPath();
      ctx.arc(ex, ey - 1, PUPIL_R, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawFrog() {
    const { x, row, jumping } = frogPos();
    drawFrogShape((x + 0.5) * CELL, (row + 0.5) * CELL, jumping);
  }

  function drawDeadMark() {
    const px = deadAt.x * CELL;
    const py = deadAt.row * CELL;
    ctx.strokeStyle = palette.deadMark;
    ctx.lineWidth = DEAD_W;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(px + DEAD_INSET, py + DEAD_INSET);
    ctx.lineTo(px + CELL - DEAD_INSET, py + CELL - DEAD_INSET);
    ctx.moveTo(px + CELL - DEAD_INSET, py + DEAD_INSET);
    ctx.lineTo(px + DEAD_INSET, py + CELL - DEAD_INSET);
    ctx.stroke();
    ctx.lineCap = "butt";
  }

  // Fila 14: barra de tiempo proporcional al reloj de la rana.
  function drawTimer() {
    const ratio = Math.max(0, Math.min(1, timeLeft / roundTime(level)));
    const y = ROW_TIMER * CELL + (CELL - TIMER_H) / 2;
    // Carril tenue de fondo: se ve cuánto ha encogido la barra.
    ctx.fillStyle = palette.laneLine;
    ctx.fillRect(TIMER_INSET_X, y + TIMER_H / 2 - 1, W - TIMER_INSET_X * 2, 2);
    ctx.fillStyle =
      ratio > 0.5
        ? palette.timerHigh
        : ratio >= 0.25
          ? palette.timerMid
          : palette.timerLow;
    ctx.fillRect(TIMER_INSET_X, y, (W - TIMER_INSET_X * 2) * ratio, TIMER_H);
  }

  // Sin texto: puntuación, nivel, vidas y estados van en el HUD de React.
  function draw() {
    drawBoard();
    drawGoals();
    drawLanes();
    if (phase === "dead") drawDeadMark();
    else if (phase !== "gameover") drawFrog();
    drawTimer();
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    // Segundos, limitados a MAX_DT: un coche nunca atraviesa la hitbox en un frame.
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

  // Fase inicial "ready": carriles de nivel 1 en marcha, rana quieta en la
  // salida, bocas vacías y la barra de tiempo llena.
  start();

  return {
    setPaused(nextPaused) {
      if (destroyed || nextPaused === paused) return;
      paused = nextPaused;
      if (paused) {
        stop();
        input.clear();
      } else {
        // lastTime = null: el primer frame tiene dt = 0; salto, reloj y "dead" se conservan.
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
    },
  };
}

function isRoadRow(row: number) {
  return row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT;
}
