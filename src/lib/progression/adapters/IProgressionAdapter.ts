import type { Result, ChildValueScore, ValueScoreEvent, ChildBadge } from '@/types';

export interface IProgressionAdapter {
  getScores(childId: string): Promise<Result<ChildValueScore[]>>;
  getEvents(childId: string, limit?: number): Promise<Result<ValueScoreEvent[]>>;
  getBadges(childId: string): Promise<Result<ChildBadge[]>>;
  awardBadge(
    childId: string,
    familyId: string,
    dimensionId: string,
    tier: 'bronze' | 'silver' | 'gold',
    note?: string,
    parentId?: string
  ): Promise<Result<ChildBadge>>;
}
