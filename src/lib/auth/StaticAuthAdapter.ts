// ============================================================
// MIRA — StaticAuthAdapter
// In-memory auth for static demo / testing
// ============================================================

import type {
  IAuthAdapter,
  SignUpParentParams,
  SignUpChildParams,
  SignInParams,
  AuthSession,
} from './IAuthAdapter';
import type { Profile, Family, Result } from '@/types';

const STATIC_FAMILY: Family = {
  id: 'static-family-1',
  name: 'Demo Family',
  settings: { timezone: 'Europe/Madrid', locale: 'es', theme: 'calm' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const STATIC_PARENT: Profile = {
  id: 'static-parent-1',
  family_id: 'static-family-1',
  role: 'parent',
  display_name: 'Parent',
  avatar_seed: 'parent-seed',
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const STATIC_CHILD: Profile = {
  id: 'static-child-1',
  family_id: 'static-family-1',
  role: 'child',
  display_name: 'Alex',
  avatar_seed: 'child-seed',
  birth_year: 2017,
  onboarding_complete: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export class StaticAuthAdapter implements IAuthAdapter {
  private _session: AuthSession | null = {
    user_id: STATIC_CHILD.id,
    email: 'demo@mira.app',
    profile: STATIC_CHILD,
    family: STATIC_FAMILY,
  };

  private _listeners: Array<(session: AuthSession | null) => void> = [];

  async getSession(): Promise<AuthSession | null> {
    return this._session;
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    this._listeners.push(callback);
    // Emit current session immediately
    setTimeout(() => callback(this._session), 0);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }

  async signUpParent(params: SignUpParentParams): Promise<Result<AuthSession>> {
    const profile: Profile = { ...STATIC_PARENT, display_name: params.display_name };
    const family: Family = { ...STATIC_FAMILY, name: params.family_name };
    this._session = { user_id: profile.id, email: params.email, profile, family };
    this._emit();
    return { ok: true, data: this._session };
  }

  async signUpWithInvite(params: SignUpChildParams): Promise<Result<AuthSession>> {
    const profile: Profile = { ...STATIC_CHILD, display_name: params.display_name };
    this._session = { user_id: profile.id, email: params.email, profile, family: STATIC_FAMILY };
    this._emit();
    return { ok: true, data: this._session };
  }

  async signIn(params: SignInParams): Promise<Result<AuthSession>> {
    // Static: role determined by email convention (parent@... vs child@...)
    const isParent = params.email.startsWith('parent');
    const profile = isParent ? STATIC_PARENT : STATIC_CHILD;
    this._session = { user_id: profile.id, email: params.email, profile, family: STATIC_FAMILY };
    this._emit();
    return { ok: true, data: this._session };
  }

  async signOut(): Promise<Result<void>> {
    this._session = null;
    this._emit();
    return { ok: true, data: undefined };
  }

  async updateProfile(
    updates: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'onboarding_complete'>>
  ): Promise<Result<Profile>> {
    if (!this._session) {
      return { ok: false, error: { code: 'not_authenticated', message: 'Not authenticated' } };
    }
    this._session.profile = { ...this._session.profile, ...updates };
    return { ok: true, data: this._session.profile };
  }

  // Switch between parent/child view for demo purposes
  switchToParent(): void {
    if (this._session) {
      this._session = { ...this._session, profile: STATIC_PARENT };
      this._emit();
    }
  }

  switchToChild(): void {
    if (this._session) {
      this._session = { ...this._session, profile: STATIC_CHILD };
      this._emit();
    }
  }

  private _emit(): void {
    this._listeners.forEach(l => l(this._session));
  }
}
