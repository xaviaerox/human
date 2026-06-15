import type { Companion, CompanionInteraction, CompanionInteractionType, CompanionMemory, Result } from '@/types';

export interface ICompanionAdapter {
  /** Get companion for a child; null if not yet created */
  getCompanion(childId: string): Promise<Result<Companion | null>>;

  /** Create companion at onboarding — name is required */
  createCompanion(childId: string, name: string): Promise<Result<Companion>>;

  /** Name an existing companion (one-time action) */
  nameCompanion(companionId: string, name: string): Promise<Result<Companion>>;

  /** Record an interaction and update bonding score */
  recordInteraction(
    companionId: string,
    childId: string,
    type: CompanionInteractionType,
    context?: Record<string, unknown>
  ): Promise<Result<CompanionInteraction>>;

  /** Get interaction counts per type (for trait unlock checks) */
  getInteractionCounts(companionId: string): Promise<Result<Record<CompanionInteractionType, number>>>;

  /** Update companion customization options */
  updateCompanion(companionId: string, updates: Partial<Companion>): Promise<Result<Companion>>;

  /** Subscribe to companion changes (realtime bonding updates) */
  subscribeToCompanion(childId: string, callback: (companion: Companion) => void): () => void;

  /** Get memories for a companion */
  getMemories(childId: string): Promise<Result<CompanionMemory[]>>;

  /** Save a new memory */
  createMemory(
    childId: string,
    companionId: string,
    type: 'routine_streak_milestone' | 'difficult_checkin' | 'adventure_complete' | 'parent_badge_award',
    metadata: Record<string, any>
  ): Promise<Result<CompanionMemory>>;
}

