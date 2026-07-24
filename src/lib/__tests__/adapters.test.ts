import { describe, it, expect } from 'vitest';
import {
  getAuthAdapter,
  getFamilyAdapter,
  getCompanionAdapter,
  getRoutineAdapter,
  getGoalsAdapter,
  getEmotionalAdapter,
  getRewardsAdapter,
  getProgressionAdapter,
  getSparkAdapter,
} from '@/lib/adapters';

describe('Adapters Factory', () => {
  it('debe devolver instancias validas para todos los dominios', () => {
    expect(getAuthAdapter()).toBeDefined();
    expect(getFamilyAdapter()).toBeDefined();
    expect(getCompanionAdapter()).toBeDefined();
    expect(getRoutineAdapter()).toBeDefined();
    expect(getGoalsAdapter()).toBeDefined();
    expect(getEmotionalAdapter()).toBeDefined();
    expect(getRewardsAdapter()).toBeDefined();
    expect(getProgressionAdapter()).toBeDefined();
    expect(getSparkAdapter()).toBeDefined();
  });
});
