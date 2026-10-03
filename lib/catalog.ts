// Server only: reads the game catalog from Supabase. It imports the server
// client, which reads cookies(), so any page calling it renders per request.

import type { Game, GameCategory, GameColor } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";

export async function fetchGames(): Promise<Game[]> {
  // Throws if the Supabase env vars are missing.
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, best, plays")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`No se pudo leer el catálogo: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error("El catálogo de juegos está vacío");
  }

  // The table's CHECK constraints guarantee cat and color hold valid values.
  return data.map((row) => ({
    ...row,
    cat: row.cat as GameCategory,
    color: row.color as GameColor,
  }));
}
