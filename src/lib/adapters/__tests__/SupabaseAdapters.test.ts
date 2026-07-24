import { describe, it, expect, vi } from 'vitest';
import { SupabaseRoutineAdapter } from '@/lib/routines/adapters/SupabaseRoutineAdapter';
import { SupabaseGoalsAdapter } from '@/lib/goals/adapters/SupabaseGoalsAdapter';
import { SupabaseEmotionalAdapter } from '@/lib/emotional/adapters/SupabaseEmotionalAdapter';
import { SupabaseCompanionAdapter } from '@/lib/companion/adapters/SupabaseCompanionAdapter';
import { SupabaseRewardsAdapter } from '@/lib/rewards/adapters/SupabaseRewardsAdapter';
import type { SupabaseClient } from '@supabase/supabase-js';

function createMockSupabase() {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: 'mock-1', title: 'Test' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'mock-1', name: 'Lumi' }, error: null }),
    then: vi.fn().mockImplementation((resolve) => resolve({ data: [], error: null })),
  };

  return {
    from: vi.fn().mockReturnValue(mockChain),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  } as unknown as SupabaseClient;
}

describe('Supabase Routine Adapter', () => {
  it('debe solicitar rutinas correctamente desde Supabase', async () => {
    const mockSupabase = createMockSupabase();
    const adapter = new SupabaseRoutineAdapter(mockSupabase);
    const result = await adapter.getRoutines('child-1');
    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('routines');
  });
});

describe('Supabase Goals Adapter', () => {
  it('debe solicitar metas activas correctamente', async () => {
    const mockSupabase = createMockSupabase();
    const adapter = new SupabaseGoalsAdapter(mockSupabase);
    const result = await adapter.getGoals('child-1');
    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('goals');
  });
});

describe('Supabase Emotional Adapter', () => {
  it('debe enviar check-in emocional correctamente', async () => {
    const mockSupabase = createMockSupabase();
    const adapter = new SupabaseEmotionalAdapter(mockSupabase);
    const result = await adapter.submitCheckin({
      child_id: 'child-1',
      prompted_by: 'child',
      emotion: {
        valence: 4,
        energy_level: 3,
        emotion_word: 'feliz',
      },
    });
    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('emotional_checkins');
  });
});

describe('Supabase Companion Adapter', () => {
  it('debe obtener datos del compañero Lumi', async () => {
    const mockSupabase = createMockSupabase();
    const adapter = new SupabaseCompanionAdapter(mockSupabase);
    const result = await adapter.getCompanion('child-1');
    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('companions');
  });
});

describe('Supabase Rewards Adapter', () => {
  it('debe obtener catalogo de recompensas', async () => {
    const mockSupabase = createMockSupabase();
    const adapter = new SupabaseRewardsAdapter(mockSupabase);
    const result = await adapter.getRewards('family-1');
    expect(result.ok).toBe(true);
    expect(mockSupabase.from).toHaveBeenCalledWith('rewards');
  });
});
