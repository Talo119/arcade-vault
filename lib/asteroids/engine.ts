import {
  COLORS,
  H,
  POINTS,
  POWERUP_DROP_CHANCE,
  POWERUP_DURATION,
  W,
} from "./config";
import { Asteroid, Bullet, Particle, PowerUp, Ship } from "./entities";
import { setupCanvas } from "@/lib/engines/canvas";
import { createInput } from "./input";
import { dist, rand } from "./math";
import type {
  AsteroidsCallbacks,
  AsteroidsGame,
  AsteroidsPhase,
  AsteroidsStats,
} from "./types";

export function createAsteroidsGame(
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsGame {
  // Buffer a resolución física, dibujo en coordenadas lógicas de 800×600.
  const { ctx, fontFamily } = setupCanvas(canvas, W, H);

  // ── Estado ──────────────────────────────────────────────────────────────────
  let phase: AsteroidsPhase = "ready";
  let paused = false;
  let destroyed = false;
  let rafId: number | null = null;
  let lastTime: number | null = null;

  let ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let score = 0;
  let lives = 3;
  let level = 1;
  let deadTimer = 0;
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;

  let lastStats: AsteroidsStats = { score, lives, level };

  const input = createInput(
    window,
    () => !destroyed && !paused && phase !== "gameover",
  );

  function setPhase(next: AsteroidsPhase) {
    if (phase === next) return;
    phase = next;
    callbacks.onPhase(next);
  }

  function emitStats() {
    if (
      score === lastStats.score &&
      lives === lastStats.lives &&
      level === lastStats.level
    )
      return;
    lastStats = { score, lives, level };
    callbacks.onStats(lastStats);
  }

  function spawnAsteroids(count: number) {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  }

  function initGame() {
    ship = new Ship();
    bullets = [];
    asteroids = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    score = 0;
    lives = 3;
    level = 1;
    spawnAsteroids(4);
    setPhase("playing");
  }

  function nextLevel() {
    level++;
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  }

  function explode(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
  }

  function killShip() {
    explode(ship.x, ship.y, 14, COLORS.ship);
    ship.dead = true;
    lives--;
    if (lives <= 0) {
      setPhase("gameover");
    } else {
      deadTimer = 2;
      setPhase("dead");
    }
  }

  function updateBackground(dt: number) {
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  function update(dt: number) {
    if (phase === "ready") {
      updateBackground(dt);
      if (input.pressed("Space")) initGame();
      return;
    }

    if (phase === "gameover") {
      updateBackground(dt);
      return;
    }

    if (phase === "dead") {
      deadTimer -= dt;
      updateBackground(dt);
      if (deadTimer <= 0) {
        ship.reset();
        setPhase("playing");
      }
      return;
    }

    // Disparar
    if (input.pressed("Space")) {
      bullets.push(...ship.tryShoot());
    }

    ship.update(dt, input);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5, COLORS.asteroid);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (phase === "playing" && asteroids.length === 0) nextLevel();
  }

  // ── Draw ────────────────────────────────────────────────────────────────────
  function draw() {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx));
    asteroids.forEach((a) => a.draw(ctx));
    powerUps.forEach((p) => p.draw(ctx, fontFamily));
    bullets.forEach((b) => b.draw(ctx));

    const shipVisible = phase === "playing" || phase === "dead";
    if (shipVisible) ship.draw(ctx);

    if (shipVisible && ship.tripleShot > 0) {
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLORS.powerUp;
      ctx.fillStyle = COLORS.powerUp;
      ctx.font = `15px ${fontFamily}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(`3x ${ship.tripleShot.toFixed(1)}s`, 14, 26);
      ctx.restore();
    }
  }

  // ── Loop principal ──────────────────────────────────────────────────────────
  function loop(ts: number) {
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
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

  // Fase inicial "ready": asteroides de fondo, sin nave.
  spawnAsteroids(4);
  start();

  return {
    setPaused(next) {
      if (destroyed || next === paused) return;
      paused = next;
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
