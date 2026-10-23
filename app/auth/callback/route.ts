// Return from Google or GitHub (SPEC 19). PKCE: the code_verifier is in the
// cookies of the same browser that pressed the button. The session lands in
// cookies; the first time, the username is derived from the provider.

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { deriveUsername } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const SIGNED_IN = "/#/biblioteca";
// The hash router has no params: Auth reads ?acceso= once and clears it.
const OAUTH_ERROR = "/?acceso=oauth-error#/acceso";

export async function GET(request: NextRequest): Promise<never> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  // Set when the player cancels at the provider or it fails.
  const providerError = searchParams.get("error");

  if (providerError) {
    console.error(
      "[auth/callback]",
      providerError,
      searchParams.get("error_description"),
    );
  } else if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { user } = data;
      // Only the first time: never overwrite the username of a linked account.
      if (!user.user_metadata?.username) {
        const username = deriveUsername(user.user_metadata ?? {}, user.email);
        const { error: updateError } = await supabase.auth.updateUser({
          data: { username },
        });
        // The session is valid anyway; the next sign-in tries again.
        if (updateError) console.error("[auth/callback] username", updateError);
      }
      redirect(SIGNED_IN);
    }
    console.error("[auth/callback]", error);
  }

  redirect(OAUTH_ERROR);
}
