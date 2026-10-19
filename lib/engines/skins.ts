export const SKIN_IDS = ["clasico", "neon", "retro"] as const;
export type SkinId = (typeof SKIN_IDS)[number];

export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

const storageKey = (gameId: string) => `av:skin:${gameId}`;

export function isSkinId(value: unknown): value is SkinId {
  return (
    typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value)
  );
}

// DEFAULT_SKIN si falta, no es válida o localStorage lanza (modo privado, cookies bloqueadas)
export function loadSkin(gameId: string): SkinId {
  try {
    const stored = localStorage.getItem(storageKey(gameId));
    return isSkinId(stored) ? stored : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

// Un fallo de localStorage se ignora en silencio: la skin vale para la sesión
export function saveSkin(gameId: string, skin: SkinId): void {
  try {
    localStorage.setItem(storageKey(gameId), skin);
  } catch {
    // nada que hacer
  }
}
