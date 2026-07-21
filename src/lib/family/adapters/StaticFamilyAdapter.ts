// ============================================================
// MIRA — StaticFamilyAdapter
// ============================================================

import type { IFamilyAdapter } from './IFamilyAdapter';
import type { Family, Profile, FamilyInvite, FamilyWithMembers, Result } from '../../../types';

const STATIC_FAMILY: Family = {
  id: 'static-family-1',
  name: 'Demo Family',
  settings: { timezone: 'Europe/Madrid', locale: 'es', theme: 'calm' },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const STATIC_MEMBERS: Profile[] = [
  {
    id: 'static-parent-1',
    family_id: 'static-family-1',
    role: 'parent',
    display_name: 'Parent',
    avatar_seed: 'parent-seed',
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'static-child-1',
    family_id: 'static-family-1',
    role: 'child',
    display_name: 'Alex',
    avatar_seed: 'child-seed',
    birth_year: 2017,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export class StaticFamilyAdapter implements IFamilyAdapter {
  async getFamily(_familyId: string): Promise<Result<FamilyWithMembers>> {
    return {
      ok: true,
      data: { ...STATIC_FAMILY, members: STATIC_MEMBERS },
    };
  }

  async getProfile(profileId: string): Promise<Result<Profile>> {
    const profile = STATIC_MEMBERS.find(m => m.id === profileId);
    if (!profile) {
      return { ok: false, error: { code: 'not_found', message: `Profile ${profileId} not found` } };
    }
    return { ok: true, data: profile };
  }

  async getChildren(_familyId: string): Promise<Result<Profile[]>> {
    return { ok: true, data: STATIC_MEMBERS.filter(m => m.role === 'child') };
  }

  async updateFamilySettings(_familyId: string, settings: Partial<Family['settings']>): Promise<Result<Family>> {
    return { ok: true, data: { ...STATIC_FAMILY, settings: { ...STATIC_FAMILY.settings, ...settings } } };
  }

  async createInvite(familyId: string, invitedBy: string, role: 'parent' | 'child'): Promise<Result<FamilyInvite>> {
    return {
      ok: true,
      data: {
        id: 'static-invite-1',
        family_id: familyId,
        invited_by: invitedBy,
        invite_code: 'DEMO1234',
        role,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      },
    };
  }

  async getActiveInvites(_familyId: string): Promise<Result<FamilyInvite[]>> {
    return { ok: true, data: [] };
  }

  subscribeToFamily(_familyId: string, callback: (members: Profile[]) => void): () => void {
    setTimeout(() => callback(STATIC_MEMBERS), 0);
    return () => {};
  }
}
