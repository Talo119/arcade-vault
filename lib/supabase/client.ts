// For Client Components only. In the browser, @supabase/ssr reuses a single
// instance internally; this module keeps no client of its own.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabaseEnv } from "./env";

export function createClient(): SupabaseClient<Database> {
  const { url, publishableKey } = getSupabaseEnv();
  return createBrowserClient<Database>(url, publishableKey);
}
