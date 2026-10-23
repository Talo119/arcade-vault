// Link from the "Confirm signup" email (SPEC 19). Verifies the token_hash on
// the server, so it works even when the link is opened in another browser or
// device (no PKCE code_verifier needed). The session lands in cookies.

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// The hash router has no params: Auth reads ?acceso= once and clears it.
const CONFIRMED = "/?acceso=confirmado#/acceso";
const INVALID = "/?acceso=error#/acceso";

export async function GET(request: NextRequest): Promise<never> {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) redirect(CONFIRMED);
    console.error("[auth/confirm]", error);
  }

  redirect(INVALID);
}
