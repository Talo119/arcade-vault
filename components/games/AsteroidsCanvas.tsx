"use client";

import { useEffect, useRef } from "react";
import { createAsteroidsGame } from "@/lib/asteroids/engine";
import type {
  AsteroidsGame,
  AsteroidsPhase,
  AsteroidsStats,
} from "@/lib/asteroids/types";

interface AsteroidsCanvasProps {
  paused: boolean;
  ended: boolean; // true → engine.end()
  onStats: (stats: AsteroidsStats) => void;
  onPhase: (phase: AsteroidsPhase) => void;
}

// Restarting the run means remounting this component with a new `key`.
export default function AsteroidsCanvas({
  paused,
  ended,
  onStats,
  onPhase,
}: AsteroidsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<AsteroidsGame | null>(null);
  // Latest callbacks, so a new identity never recreates the engine.
  const onStatsRef = useRef(onStats);
  const onPhaseRef = useRef(onPhase);

  useEffect(() => {
    onStatsRef.current = onStats;
    onPhaseRef.current = onPhase;
  });

  useEffect(() => {
    const engine = createAsteroidsGame(canvasRef.current!, {
      onStats: (stats) => onStatsRef.current(stats),
      onPhase: (phase) => onPhaseRef.current(phase),
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  useEffect(() => {
    if (ended) engineRef.current?.end();
  }, [ended]);

  return (
    <canvas
      ref={canvasRef}
      className="player-canvas"
      aria-label="Juego ASTEROIDS"
    />
  );
}
