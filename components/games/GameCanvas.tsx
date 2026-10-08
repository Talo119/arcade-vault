"use client";

import { useEffect, useRef } from "react";
import type {
  EngineDefinition,
  EnginePhase,
  EngineStats,
  GameEngine,
} from "@/lib/engines/types";

interface GameCanvasProps {
  engine: EngineDefinition;
  title: string; // game.title del catálogo, para el aria-label
  paused: boolean;
  ended: boolean; // true → engine.end()
  onStats: (stats: EngineStats) => void;
  onPhase: (phase: EnginePhase) => void;
}

// Restarting the run means remounting this component with a new `key`.
export default function GameCanvas({
  engine,
  title,
  paused,
  ended,
  onStats,
  onPhase,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  // Latest props, so a new identity never recreates the engine.
  const engineRef = useRef(engine);
  const onStatsRef = useRef(onStats);
  const onPhaseRef = useRef(onPhase);

  useEffect(() => {
    engineRef.current = engine;
    onStatsRef.current = onStats;
    onPhaseRef.current = onPhase;
  });

  useEffect(() => {
    const game = engineRef.current.create(canvasRef.current!, {
      onStats: (stats) => onStatsRef.current(stats),
      onPhase: (phase) => onPhaseRef.current(phase),
    });
    gameRef.current = game;
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    gameRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    if (ended) gameRef.current?.end();
  }, [ended]);

  return (
    <canvas
      ref={canvasRef}
      className="player-canvas"
      aria-label={"Juego " + title}
      style={{ aspectRatio: `${engine.width} / ${engine.height}` }}
    />
  );
}
