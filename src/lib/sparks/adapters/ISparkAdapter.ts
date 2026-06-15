import type { Result, SparkLedgerEntry } from '@/types';

export interface ISparkAdapter {
  getBalance(childId: string): Promise<Result<number>>;
  getHistory(childId: string, limit?: number): Promise<Result<SparkLedgerEntry[]>>;
  awardBonus(
    childId: string,
    familyId: string,
    delta: number,
    note: string,
    parentId: string
  ): Promise<Result<SparkLedgerEntry>>;
}
