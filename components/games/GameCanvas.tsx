"use client";

import { useEffect, useRef } from "react";
import type { SkinId } from "@/lib/engines/skins";
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
  skin: SkinId; // cambia en caliente con setSkin; no recrea el motor
  onStats: (stats: EngineStats) => void;
  onPhase: (phase: EnginePhase) => void;
}

// Restarting the run means remounting this component with a new `key`.
export default function GameCanvas({
  engine,
  title,
  paused,
  ended,
  skin,
  onStats,
  onPhase,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameEngine | null>(null);
  // Latest props, so a new identity never recreates the engine.
  const engineRef = useRef(engine);
  const skinRef = useRef(skin);
  const onStatsRef = useRef(onStats);
  const onPhaseRef = useRef(onPhase);

  useEffect(() => {
    engineRef.current = engine;
    skinRef.current = skin;
    onStatsRef.current = onStats;
    onPhaseRef.current = onPhase;
  });

  useEffect(() => {
    const game = engineRef.current.create(
      canvasRef.current!,
      {
        onStats: (stats) => onStatsRef.current(stats),
        onPhase: (phase) => onPhaseRef.current(phase),
      },
      skinRef.current,
    );
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

  useEffect(() => {
    gameRef.current?.setSkin?.(skin);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      className="player-canvas"
      aria-label={"Juego " + title}
      style={{ aspectRatio: `${engine.width} / ${engine.height}` }}
    />
  );
}
