// ============================================================
// MIRA — IAuthAdapter
// Auth adapter interface
// ============================================================

import type { Profile, Family, Result } from '@/types';

export interface SignUpParentParams {
  email: string;
  password: string;
  family_name: string;
  display_name: string;
  avatar_seed?: string;
}

export interface SignUpChildParams {
  email: string;
  password: string;
  invite_code: string;
  display_name: string;
  birth_year?: number;
  avatar_seed?: string;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthSession {
  user_id: string;
  email: string;
  profile: Profile;
  family: Family;
}

export interface IAuthAdapter {
  /** Get current session, null if not authenticated */
  getSession(): Promise<AuthSession | null>;

  /** Subscribe to auth state changes */
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;

  /** Parent signup: creates family + parent profile atomically */
  signUpParent(params: SignUpParentParams): Promise<Result<AuthSession>>;

  /** Child/parent joins via invite code */
  signUpWithInvite(params: SignUpChildParams): Promise<Result<AuthSession>>;

  /** Email + password sign in */
  signIn(params: SignInParams): Promise<Result<AuthSession>>;

  /** Sign out */
  signOut(): Promise<Result<void>>;

  /** Update own profile */
  updateProfile(updates: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'onboarding_complete'>>): Promise<Result<Profile>>;
}
