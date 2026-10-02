// Literal `process.env.NEXT_PUBLIC_*` access is required: Next only inlines
// literal reads into the browser bundle. An empty string counts as missing.

export function getSupabaseEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!publishableKey) {
    throw new Error("Falta NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { url, publishableKey };
}
