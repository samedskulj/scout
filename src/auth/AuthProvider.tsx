"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { authEnabled, supabase } from "./supabase.ts";

interface AuthState {
  session: Session | null;
  /** True until the stored session has been read. */
  loading: boolean;
  /** True after the scout opened a password-reset link: show the new-password form. */
  recovering: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({ session: null, loading: false, recovering: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(authEnabled);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "USER_UPDATED" || event === "SIGNED_OUT") setRecovering(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
  };

  return <AuthContext.Provider value={{ session, loading, recovering, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

/** Sends visitors to the login page when sign-in is configured and they have no session. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const mustSignIn = authEnabled && !loading && !session;

  useEffect(() => {
    if (mustSignIn) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [mustSignIn, pathname, router]);

  if (!authEnabled) return <>{children}</>;
  if (loading || !session) return <div className="auth-loading" aria-busy="true" />;
  return <>{children}</>;
}
