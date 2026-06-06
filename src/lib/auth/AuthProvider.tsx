// ============================================================
// MIRA — AuthProvider
// Auth context with role-aware session
// ============================================================

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { IAuthAdapter, AuthSession, SignUpParentParams, SignUpChildParams, SignInParams } from './IAuthAdapter';
import type { Profile, Family, Result } from '@/types';

// ─────────────────────────────────────────
// Context type
// ─────────────────────────────────────────
interface AuthContextValue {
  /** Current session; null = unauthenticated */
  session: AuthSession | null;
  /** Loading state: true while session is being resolved */
  loading: boolean;
  /** Convenience accessors */
  profile: Profile | null;
  family: Family | null;
  isParent: boolean;
  isChild: boolean;
  isAuthenticated: boolean;
  /** Actions */
  signUpParent: (params: SignUpParentParams) => Promise<Result<AuthSession>>;
  signUpWithInvite: (params: SignUpChildParams) => Promise<Result<AuthSession>>;
  signIn: (params: SignInParams) => Promise<Result<AuthSession>>;
  signOut: () => Promise<Result<void>>;
  updateProfile: (updates: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'onboarding_complete'>>) => Promise<Result<Profile>>;
}

// ─────────────────────────────────────────
// Context
// ─────────────────────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null);

// ─────────────────────────────────────────
// Provider
// ─────────────────────────────────────────
interface AuthProviderProps {
  adapter: IAuthAdapter;
  children: ReactNode;
}

export function AuthProvider({ adapter, children }: AuthProviderProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Resolve initial session
    adapter.getSession().then(s => {
      setSession(s);
      setLoading(false);
    });

    // Subscribe to changes
    const unsubscribe = adapter.onAuthStateChange(s => {
      setSession(s);
      setLoading(false);
    });

    return unsubscribe;
  }, [adapter]);

  const signUpParent = useCallback(
    (params: SignUpParentParams) => adapter.signUpParent(params),
    [adapter]
  );

  const signUpWithInvite = useCallback(
    (params: SignUpChildParams) => adapter.signUpWithInvite(params),
    [adapter]
  );

  const signIn = useCallback(
    (params: SignInParams) => adapter.signIn(params),
    [adapter]
  );

  const signOut = useCallback(() => adapter.signOut(), [adapter]);

  const updateProfile = useCallback(
    (updates: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'onboarding_complete'>>) =>
      adapter.updateProfile(updates),
    [adapter]
  );

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    profile: session?.profile ?? null,
    family: session?.family ?? null,
    isParent: session?.profile.role === 'parent',
    isChild: session?.profile.role === 'child',
    isAuthenticated: session !== null,
    signUpParent,
    signUpWithInvite,
    signIn,
    signOut,
    updateProfile,
  }), [session, loading, signUpParent, signUpWithInvite, signIn, signOut, updateProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────
// Hook
// ─────────────────────────────────────────
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('[Mira] useAuth must be used within <AuthProvider>');
  return ctx;
}

// ─────────────────────────────────────────
// Route guard HOC
// ─────────────────────────────────────────
interface AuthGuardProps {
  children: ReactNode;
  requireRole?: 'parent' | 'child';
  fallback?: ReactNode;
}

export function AuthGuard({ children, requireRole, fallback = null }: AuthGuardProps) {
  const { session, loading, isParent, isChild } = useAuth();

  if (loading) return null; // Calm: no loading spinners at route level
  if (!session) return <>{fallback}</>;
  if (requireRole === 'parent' && !isParent) return <>{fallback}</>;
  if (requireRole === 'child' && !isChild) return <>{fallback}</>;

  return <>{children}</>;
}
