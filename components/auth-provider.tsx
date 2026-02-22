"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  type AuthSession,
  type AuthUser,
  getUserFromAccessToken,
  hasSupabaseBrowserConfig,
  refreshAuthSession,
  signInWithEmail,
  signOutWithAccessToken,
  signUpWithEmail
} from "@/lib/auth/supabase-browser";

const STORAGE_KEY = "ccc_auth_session_v1";

type AuthContextValue = {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ requiresEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: AuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function isExpired(session: AuthSession): boolean {
  if (!session.expiresAt) {
    return false;
  }
  const now = Math.floor(Date.now() / 1000);
  return session.expiresAt <= now + 45;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = hasSupabaseBrowserConfig();

  const refreshUser = useCallback(async (currentSession: AuthSession): Promise<AuthSession | null> => {
    try {
      if (isExpired(currentSession) && currentSession.refreshToken) {
        const refreshed = await refreshAuthSession(currentSession.refreshToken);
        setSession(refreshed);
        persistSession(refreshed);
        return refreshed;
      }

      const user = await getUserFromAccessToken(currentSession.accessToken);
      const nextSession: AuthSession = {
        ...currentSession,
        user
      };
      setSession(nextSession);
      persistSession(nextSession);
      return nextSession;
    } catch {
      setSession(null);
      persistSession(null);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    const stored = loadStoredSession();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    refreshUser(stored).finally(() => setIsLoading(false));
  }, [isConfigured, refreshUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextSession = await signInWithEmail(email, password);
    setSession(nextSession);
    persistSession(nextSession);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const nextSession = await signUpWithEmail(email, password);
    if (!nextSession) {
      return { requiresEmailConfirmation: true };
    }

    setSession(nextSession);
    persistSession(nextSession);
    return { requiresEmailConfirmation: false };
  }, []);

  const signOut = useCallback(async () => {
    const currentToken = session?.accessToken;
    setSession(null);
    persistSession(null);

    if (currentToken) {
      await signOutWithAccessToken(currentToken);
    }
  }, [session]);

  const getAccessToken = useCallback(() => session?.accessToken ?? null, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      isConfigured,
      signIn,
      signUp,
      signOut,
      getAccessToken
    }),
    [getAccessToken, isConfigured, isLoading, session, signIn, signOut, signUp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
