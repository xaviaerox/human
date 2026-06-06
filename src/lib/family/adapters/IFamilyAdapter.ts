// ============================================================
// MIRA — IFamilyAdapter
// ============================================================

import type { Family, Profile, FamilyInvite, FamilyWithMembers, Result } from '@/types';

export interface IFamilyAdapter {
  /** Get current family with all members */
  getFamily(familyId: string): Promise<Result<FamilyWithMembers>>;

  /** Get a single profile */
  getProfile(profileId: string): Promise<Result<Profile>>;

  /** Get all child profiles in a family */
  getChildren(familyId: string): Promise<Result<Profile[]>>;

  /** Update family settings */
  updateFamilySettings(familyId: string, settings: Partial<Family['settings']>): Promise<Result<Family>>;

  /** Create an invite for a new family member */
  createInvite(familyId: string, invitedBy: string, role: 'parent' | 'child'): Promise<Result<FamilyInvite>>;

  /** Get active invites for a family */
  getActiveInvites(familyId: string): Promise<Result<FamilyInvite[]>>;

  /** Subscribe to family member changes (realtime) */
  subscribeToFamily(familyId: string, callback: (members: Profile[]) => void): () => void;
}
