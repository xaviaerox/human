// ============================================================
// MIRA — SupabaseAuthAdapter
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';

import type {
  IAuthAdapter,
  SignUpParentParams,
  SignUpChildParams,
  SignInParams,
  AuthSession,
} from './IAuthAdapter';
import type { Profile, Family, Result } from '@/types';

export class SupabaseAuthAdapter implements IAuthAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getSession(): Promise<AuthSession | null> {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session) return null;
    return this._buildSession(session.user.id, session.user.email ?? '');
  }

  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void {
    const { data: { subscription } } = this.client.auth.onAuthStateChange(
      async (event, session) => {
        if (!session) {
          callback(null);
          return;
        }
        
        let authSession = await this._buildSession(session.user.id, session.user.email ?? '');
        
        // Retry logic: if profile isn't inserted yet during signup flow, wait and retry
        if (!authSession) {
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            authSession = await this._buildSession(session.user.id, session.user.email ?? '');
            if (authSession) break;
          }
        }
        
        callback(authSession);
      }
    );
    return () => subscription.unsubscribe();
  }

  async signUpParent(params: SignUpParentParams): Promise<Result<AuthSession>> {
    const { data, error } = await this.client.auth.signUp({
      email: params.email,
      password: params.password,
    });

    if (error || !data.user) {
      return { ok: false, error: { code: 'signup_failed', message: error?.message ?? 'Signup failed' } };
    }

    const { error: fnError } = await this.client.rpc('create_family_with_parent', {
      p_user_id: data.user.id,
      p_family_name: params.family_name,
      p_display_name: params.display_name,
      p_avatar_seed: params.avatar_seed,
    });

    if (fnError) {
      return { ok: false, error: { code: 'family_creation_failed', message: fnError.message } };
    }

    const session = await this._buildSession(data.user.id, data.user.email ?? '');
    if (!session) {
      return { ok: false, error: { code: 'session_build_failed', message: 'Could not build session after signup' } };
    }

    return { ok: true, data: session };
  }

  async signUpWithInvite(params: SignUpChildParams): Promise<Result<AuthSession>> {
    const { data, error } = await this.client.auth.signUp({
      email: params.email,
      password: params.password,
    });

    if (error || !data.user) {
      return { ok: false, error: { code: 'signup_failed', message: error?.message ?? 'Signup failed' } };
    }

    const { error: fnError } = await this.client.rpc('join_family_with_invite', {
      p_user_id: data.user.id,
      p_invite_code: params.invite_code,
      p_display_name: params.display_name,
      p_birth_year: params.birth_year,
      p_avatar_seed: params.avatar_seed,
    });

    if (fnError) {
      return { ok: false, error: { code: 'invite_join_failed', message: fnError.message } };
    }

    const session = await this._buildSession(data.user.id, data.user.email ?? '');
    if (!session) {
      return { ok: false, error: { code: 'session_build_failed', message: 'Could not build session after signup' } };
    }

    return { ok: true, data: session };
  }

  async signIn(params: SignInParams): Promise<Result<AuthSession>> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: params.email,
      password: params.password,
    });

    if (error || !data.user) {
      return { ok: false, error: { code: 'signin_failed', message: error?.message ?? 'Sign in failed' } };
    }

    const session = await this._buildSession(data.user.id, data.user.email ?? '');
    if (!session) {
      return { ok: false, error: { code: 'session_build_failed', message: 'Could not build session' } };
    }

    return { ok: true, data: session };
  }

  async signOut(): Promise<Result<void>> {
    const { error } = await this.client.auth.signOut();
    if (error) {
      return { ok: false, error: { code: 'signout_failed', message: error.message } };
    }
    return { ok: true, data: undefined };
  }

  async updateProfile(
    updates: Partial<Pick<Profile, 'display_name' | 'avatar_seed' | 'onboarding_complete'>>
  ): Promise<Result<Profile>> {
    const { data: { session } } = await this.client.auth.getSession();
    if (!session) {
      return { ok: false, error: { code: 'not_authenticated', message: 'Not authenticated' } };
    }

    const { data, error } = await this.client
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'profile_update_failed', message: error?.message ?? 'Update failed' } };
    }

    return { ok: true, data };
  }

  // ─────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────
  private async _buildSession(userId: string, email: string): Promise<AuthSession | null> {
    const { data: profile } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    const { data: family } = await this.client
      .from('families')
      .select('*')
      .eq('id', profile.family_id)
      .single();

    if (!family) return null;

    return { user_id: userId, email, profile, family };
  }
}
