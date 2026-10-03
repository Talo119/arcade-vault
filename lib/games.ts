// Game types and helpers. The catalog itself lives in the Supabase `games`
// table (see lib/catalog.ts); seededScores is still a simulated leaderboard
// ported from references/templates/data.jsx.

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;
  title: string;
  /** Short description shown on the library card. */
  short: string;
  /** Long description shown on the detail screen. */
  long: string;
  cat: GameCategory;
  /** CSS class that paints the cover art, e.g. "cover-bricks". */
  cover: string;
  color: GameColor;
  /** Global best score. */
  best: number;
  plays: string;
}

export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  /** "DD/MM/2026" */
  date: string;
}

export const CATS: ("TODOS" | GameCategory)[] = [
  "TODOS",
  "ARCADE",
  "PUZZLE",
  "SHOOTER",
  "VERSUS",
];

const PLAYERS = [
  "PX_KAI",
  "NEONFOX",
  "Z3R0COOL",
  "M00NRYU",
  "VAULT_07",
  "GLITCHA",
  "ATARI_KID",
  "CYBER_LU",
  "MAGENTA88",
  "SCANLINE",
  "BIT_LORD",
  "ARKADYA",
  "DROID_X",
  "RGB_QUEEN",
  "PIXEL_DAD",
  "RETROVIRA",
  "VECTORX",
  "JOY_STK",
];

/**
 * Deterministic fake leaderboard. Same LCG and call order as the template,
 * so a given seed always yields the same rows.
 */
export function seededScores(seed: number, count = 12): ScoreRow[] {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const used = new Set<string>();
  const rows: ScoreRow[] = [];
  for (let i = 0; i < count; i++) {
    let name: string;
    do {
      name = PLAYERS[Math.floor(rand() * PLAYERS.length)];
    } while (used.has(name) && used.size < PLAYERS.length);
    used.add(name);
    const base = Math.floor(50000 + rand() * 250000);
    const score = base - i * Math.floor(2000 + rand() * 4000);
    const day = String(1 + Math.floor(rand() * 28)).padStart(2, "0");
    const mon = String(1 + Math.floor(rand() * 12)).padStart(2, "0");
    rows.push({
      rank: i + 1,
      name,
      score: Math.max(score, 1000),
      date: `${day}/${mon}/2026`,
    });
  }
  return rows
    .sort((a, b) => b.score - a.score)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
