import { ISparkAdapter } from './ISparkAdapter';
import type { Result, SparkLedgerEntry } from '@/types';

export class StaticSparkAdapter implements ISparkAdapter {
  private _entries: SparkLedgerEntry[] = [
    {
      id: 'spark-1',
      child_id: 'static-child-id',
      family_id: 'static-family-id',
      delta: 10,
      balance_after: 10,
      source_type: 'routine_complete',
      source_id: 'routine-1',
      note: 'Rutina Mañana completada',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'spark-2',
      child_id: 'static-child-id',
      family_id: 'static-family-id',
      delta: 5,
      balance_after: 15,
      source_type: 'parent_bonus',
      source_id: 'bonus-1',
      note: '¡Por ordenar tus juguetes!',
      awarded_by: 'static-parent-id',
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'spark-3',
      child_id: 'static-child-id',
      family_id: 'static-family-id',
      delta: -3,
      balance_after: 12,
      source_type: 'redemption',
      source_id: 'reward-1',
      note: 'Canjeado: Helado familiar',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  async getBalance(childId: string): Promise<Result<number>> {
    const balance = this._entries
      .filter(e => e.child_id === childId)
      .reduce((acc, e) => acc + e.delta, 0);
    return { ok: true, data: balance };
  }

  async getHistory(childId: string, limit = 20): Promise<Result<SparkLedgerEntry[]>> {
    const history = this._entries
      .filter(e => e.child_id === childId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
    return { ok: true, data: history };
  }

  async awardBonus(
    childId: string,
    familyId: string,
    delta: number,
    note: string,
    parentId: string
  ): Promise<Result<SparkLedgerEntry>> {
    const currentBalance = this._entries
      .filter(e => e.child_id === childId)
      .reduce((acc, e) => acc + e.delta, 0);

    if (currentBalance + delta < 0) {
      return { ok: false, error: { code: 'insufficient_sparks', message: 'Saldo negativo no permitido' } };
    }

    const entry: SparkLedgerEntry = {
      id: `static-spark-${Date.now()}`,
      child_id: childId,
      family_id: familyId,
      delta,
      balance_after: currentBalance + delta,
      source_type: 'parent_bonus',
      note,
      awarded_by: parentId,
      created_at: new Date().toISOString(),
    };

    this._entries.push(entry);
    return { ok: true, data: entry };
  }
}
