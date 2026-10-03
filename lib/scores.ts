// Real leaderboard, read and written from the browser. Writes only go through
// the submit_score RPC, which validates again on the database side. Error
// details go to the console; the UI shows fixed messages.

import { createClient } from "@/lib/supabase/client";

export interface LeaderboardRow {
  /** 1..12, position in the list. */
  rank: number;
  name: string;
  score: number;
  /** "DD/MM/AAAA", created_at in local time. */
  date: string;
}

/** Same rule as the scores.name CHECK and submit_score. */
export const NAME_PATTERN = /^[A-Z0-9_ ]{1,10}$/;

export function isValidName(name: string): boolean {
  return NAME_PATTERN.test(name) && name === name.trim();
}

const TOP_LIMIT = 12;

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function fetchTopScores(
  gameId: string,
): Promise<LeaderboardRow[]> {
  const { data, error } = await createClient()
    .from("scores")
    .select("name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(TOP_LIMIT);

  if (error) {
    console.error("fetchTopScores", gameId, error);
    throw new Error("No se pudo cargar el ranking");
  }

  return data.map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function submitScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void> {
  const { error } = await createClient().rpc("submit_score", {
    p_game_id: gameId,
    p_name: name,
    p_score: score,
  });

  if (error) {
    console.error("submitScore", gameId, error);
    throw new Error("No se pudo guardar la puntuación");
  }
}
