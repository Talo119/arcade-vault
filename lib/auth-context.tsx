"use client";

// Session state for the whole app. The browser client keeps the session in
// cookies and refreshes the token on its own; this only mirrors it in React.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type AuthState =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "user"; email: string; username: string };

/** Shown if a session has no username (shouldn't happen). */
const FALLBACK_USERNAME = "JUGADOR";

function toAuthState(session: Session | null): AuthState {
  if (!session) return { status: "anon" };
  const { user } = session;
  const username = user.user_metadata?.username;
  return {
    status: "user",
    email: user.email ?? "",
    username:
      typeof username === "string" && username ? username : FALLBACK_USERNAME,
  };
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("getSession:", error);
      if (active) setState(toAuthState(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(toAuthState(session));
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (state === null) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return state;
}
