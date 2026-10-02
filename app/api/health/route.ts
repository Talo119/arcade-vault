import { createClient } from "@/lib/supabase/server";

type HealthResponse =
  | { ok: true; dbTime: string; latencyMs: number } // 200
  | { ok: false; error: "supabase_unreachable" }; // 503

// A cached health check would lie about the current state.
const headers = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();

    const start = performance.now();
    const { data, error } = await supabase.rpc("health");
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      throw error;
    }

    const body: HealthResponse = { ok: true, dbTime: data, latencyMs };
    return Response.json(body, { headers });
  } catch (err) {
    // Failure details stay in the server log, never in the public response.
    console.error("[api/health]", err);
    const body: HealthResponse = { ok: false, error: "supabase_unreachable" };
    return Response.json(body, { status: 503, headers });
  }
}
