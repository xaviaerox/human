import type { SupabaseClient } from '@supabase/supabase-js';
import { ISparkAdapter } from './ISparkAdapter';
import type { Result, SparkLedgerEntry } from '@/types';

export class SupabaseSparkAdapter implements ISparkAdapter {
  constructor(private readonly client: SupabaseClient) {}

  async getBalance(childId: string): Promise<Result<number>> {
    const { data, error } = await this.client
      .from('spark_ledger')
      .select('delta')
      .eq('child_id', childId);

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }

    const sum = (data ?? []).reduce((acc, row) => acc + (row.delta || 0), 0);
    return { ok: true, data: sum };
  }

  async getHistory(childId: string, limit = 20): Promise<Result<SparkLedgerEntry[]>> {
    const { data, error } = await this.client
      .from('spark_ledger')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { ok: false, error: { code: 'fetch_failed', message: error.message } };
    }

    return { ok: true, data: data as SparkLedgerEntry[] ?? [] };
  }

  async awardBonus(
    childId: string,
    familyId: string,
    delta: number,
    note: string,
    parentId: string
  ): Promise<Result<SparkLedgerEntry>> {
    const { data, error } = await this.client.rpc('award_sparks', {
      p_child_id: childId,
      p_delta: delta,
      p_source_type: 'parent_bonus',
      p_source_id: null,
      p_note: note,
      p_awarded_by: parentId,
    });

    if (error) {
      return { ok: false, error: { code: 'rpc_failed', message: error.message } };
    }

    return { ok: true, data: data as SparkLedgerEntry };
  }
}
