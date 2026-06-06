// ============================================================
// MIRA — SupabaseFamilyAdapter
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

import type { IFamilyAdapter } from './IFamilyAdapter';
import type { Family, Profile, FamilyInvite, FamilyWithMembers, Result } from '../../../types';

export class SupabaseFamilyAdapter implements IFamilyAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getFamily(familyId: string): Promise<Result<FamilyWithMembers>> {
    const { data: family, error: familyError } = await this.client
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();

    if (familyError || !family) {
      return { ok: false, error: { code: 'family_not_found', message: familyError?.message ?? 'Family not found' } };
    }

    const { data: members, error: membersError } = await this.client
      .from('profiles')
      .select('*')
      .eq('family_id', familyId)
      .order('role', { ascending: false }); // parents first

    if (membersError) {
      return { ok: false, error: { code: 'members_fetch_failed', message: membersError.message } };
    }

    return { ok: true, data: { ...family, members: members ?? [] } };
  }

  async getProfile(profileId: string): Promise<Result<Profile>> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'profile_not_found', message: error?.message ?? 'Not found' } };
    }
    return { ok: true, data };
  }

  async getChildren(familyId: string): Promise<Result<Profile[]>> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('family_id', familyId)
      .eq('role', 'child');

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }
    return { ok: true, data: data ?? [] };
  }

  async updateFamilySettings(familyId: string, settings: Partial<Family['settings']>): Promise<Result<Family>> {
    const { data: current } = await this.client
      .from('families')
      .select('settings')
      .eq('id', familyId)
      .single();

    const { data, error } = await this.client
      .from('families')
      .update({ settings: { ...(current?.settings ?? {}), ...settings } })
      .eq('id', familyId)
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'update_failed', message: error?.message ?? 'Update failed' } };
    }
    return { ok: true, data };
  }

  async createInvite(familyId: string, invitedBy: string, role: 'parent' | 'child'): Promise<Result<FamilyInvite>> {
    const { data, error } = await this.client
      .from('family_invites')
      .insert({ family_id: familyId, invited_by: invitedBy, role })
      .select()
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'invite_create_failed', message: error?.message ?? 'Failed' } };
    }
    return { ok: true, data };
  }

  async getActiveInvites(familyId: string): Promise<Result<FamilyInvite[]>> {
    const { data, error } = await this.client
      .from('family_invites')
      .select('*')
      .eq('family_id', familyId)
      .is('used_by', null)
      .gt('expires_at', new Date().toISOString());

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }
    return { ok: true, data: data ?? [] };
  }

  subscribeToFamily(familyId: string, callback: (members: Profile[]) => void): () => void {
    // Initial fetch
    this.getChildren(familyId).then(result => {
      if (result.ok) callback(result.data);
    });

    // Realtime subscription
    const channel = this.client
      .channel(`family:${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `family_id=eq.${familyId}` },
        async () => {
          const result = await this.getChildren(familyId);
          if (result.ok) callback(result.data);
        }
      )
      .subscribe();

    return () => { this.client.removeChannel(channel); };
  }
}
