// Supabase Auth from the browser. Like lib/scores.ts, error details go to the
// console and the UI only gets fixed messages. deriveUsername is pure and is
// also used by app/auth/callback/route.ts on the server.

import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/** Minimum password length configured in Supabase Auth (SPEC 20). */
export const MIN_PASSWORD = 8;

export type OAuthProvider = "google" | "github";

/** Fixed on-screen message per Supabase `error.code`. */
export const AUTH_ERRORS = {
  invalid_credentials: "CORREO O CONTRASEÑA INCORRECTOS",
  email_not_confirmed: "CONFIRMA TU CORREO ANTES DE ENTRAR",
  weak_password: `LA CONTRASEÑA DEBE TENER AL MENOS ${MIN_PASSWORD} CARACTERES`,
  over_email_send_rate_limit: "DEMASIADOS CORREOS · PRUEBA MÁS TARDE",
  over_request_rate_limit: "DEMASIADOS INTENTOS · PRUEBA MÁS TARDE",
} as const;

/** Network errors, 5xx and any other code. */
export const AUTH_ERROR_FALLBACK = "NO SE PUDO CONECTAR CON EL VAULT";

function fail(op: string, error: AuthError): never {
  console.error(op, error);
  const code = error.code as keyof typeof AUTH_ERRORS | undefined;
  throw new Error((code && AUTH_ERRORS[code]) || AUTH_ERROR_FALLBACK);
}

/**
 * An already registered email doesn't fail (Supabase hides it so accounts
 * aren't revealed): the caller shows the same "check your email" panel.
 */
export async function signUp(
  username: string,
  email: string,
  password: string,
): Promise<void> {
  const { error } = await createClient().auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
      data: { username },
    },
  });
  if (error) fail("signUp", error);
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await createClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) fail("signIn", error);
}

export async function signOut(): Promise<void> {
  const { error } = await createClient().auth.signOut();
  if (error) fail("signOut", error);
}

/** Leaves for Google or GitHub: on success the browser never comes back here. */
export async function signInWithProvider(
  provider: OAuthProvider,
): Promise<void> {
  const { error } = await createClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) fail("signInWithProvider", error);
}

const USERNAME_MAX = 10;
const FALLBACK_USERNAME = "JUGADOR";

/** No accents, uppercase, only A-Z0-9_, at most 10 characters. */
function cleanUsername(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, USERNAME_MAX);
}

/** Username from the provider metadata. Always passes isValidName. */
export function deriveUsername(
  meta: Record<string, unknown>,
  email: string | undefined,
): string {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  const fullName = text(meta.full_name) || text(meta.name);
  const candidates = [
    text(meta.user_name), // GitHub login
    text(meta.preferred_username),
    fullName.trim().split(/\s+/)[0] ?? "", // Google: first word of the name
    email?.split("@")[0] ?? "",
  ];
  for (const candidate of candidates) {
    const username = cleanUsername(candidate);
    if (username) return username;
  }
  return FALLBACK_USERNAME;
}
