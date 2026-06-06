import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthResult {
  error: string | null;
  /** True when a sign-up needs the user to confirm their email before logging in. */
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  email: string | null;
  /** Whether an admin has approved this account. null = still loading. */
  approved: boolean | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** Re-check approval status (e.g. from the "pending approval" screen). */
  refreshApproval: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  const refreshApproval = useCallback(async () => {
    if (!supabase || !userId) {
      setApproved(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('approved')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // Fail closed: if the profiles table/RLS isn't set up, treat as pending.
      console.warn('[auth] approval check failed:', error.message);
      setApproved(false);
      return;
    }
    setApproved(data?.approved === true);
  }, [userId]);

  // Re-check approval whenever the signed-in user changes.
  useEffect(() => {
    if (!userId) {
      setApproved(null);
      return;
    }
    setApproved(null); // loading
    void refreshApproval();
  }, [userId, refreshApproval]);

  const value = useMemo<AuthContextValue>(() => {
    return {
      configured: isSupabaseConfigured,
      loading,
      session,
      email: session?.user?.email ?? null,
      approved,
      refreshApproval,

      async signIn(email, password) {
        if (!supabase) return { error: 'Authentication is not configured.' };
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },

      async signUp(email, password) {
        if (!supabase) return { error: 'Authentication is not configured.' };
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          },
        });
        if (error) return { error: error.message };
        return { error: null, needsEmailConfirmation: !data.session };
      },

      async signOut() {
        await supabase?.auth.signOut();
      },
    };
  }, [loading, session, approved, refreshApproval]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
