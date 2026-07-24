// ============================================================
// MIRA — Adapter Factory
// NEXT_PUBLIC_DATA_SOURCE=static|supabase
// ============================================================
import { supabase } from './supabase';

import { StaticAuthAdapter }    from './auth/StaticAuthAdapter';
import { SupabaseAuthAdapter }  from './auth/SupabaseAuthAdapter';
import type { IAuthAdapter }    from './auth/IAuthAdapter';

import { StaticFamilyAdapter }   from './family/adapters/StaticFamilyAdapter';
import { SupabaseFamilyAdapter } from './family/adapters/SupabaseFamilyAdapter';
import type { IFamilyAdapter }   from './family/adapters/IFamilyAdapter';

import { StaticCompanionAdapter }   from './companion/adapters/StaticCompanionAdapter';
import { SupabaseCompanionAdapter } from './companion/adapters/SupabaseCompanionAdapter';
import type { ICompanionAdapter }   from './companion/adapters/ICompanionAdapter';

import { StaticRoutineAdapter }   from './routines/adapters/StaticRoutineAdapter';
import { SupabaseRoutineAdapter } from './routines/adapters/SupabaseRoutineAdapter';
import type { IRoutineAdapter }   from './routines/adapters/IRoutineAdapter';

import { StaticGoalsAdapter }   from './goals/adapters/StaticGoalsAdapter';
import { SupabaseGoalsAdapter } from './goals/adapters/SupabaseGoalsAdapter';
import type { IGoalsAdapter }   from './goals/adapters/IGoalsAdapter';

import { StaticEmotionalAdapter }   from './emotional/adapters/StaticEmotionalAdapter';
import { SupabaseEmotionalAdapter } from './emotional/adapters/SupabaseEmotionalAdapter';
import type { IEmotionalAdapter }   from './emotional/adapters/IEmotionalAdapter';

import { StaticRewardsAdapter }   from './rewards/adapters/StaticRewardsAdapter';
import { SupabaseRewardsAdapter } from './rewards/adapters/SupabaseRewardsAdapter';
import type { IRewardsAdapter }   from './rewards/adapters/IRewardsAdapter';

import { StaticProgressionAdapter }   from './progression/adapters/StaticProgressionAdapter';
import { SupabaseProgressionAdapter } from './progression/adapters/SupabaseProgressionAdapter';
import type { IProgressionAdapter }   from './progression/adapters/IProgressionAdapter';

import { StaticSparkAdapter }   from './sparks/adapters/StaticSparkAdapter';
import { SupabaseSparkAdapter } from './sparks/adapters/SupabaseSparkAdapter';
import type { ISparkAdapter }   from './sparks/adapters/ISparkAdapter';

export function isUseSupabase(): boolean {
  if (typeof window !== 'undefined') {
    if (localStorage.getItem('mira_demo_mode') === 'true') {
      return false;
    }
  }
  return (process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'static') === 'supabase';
}

export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'static';
export const isSupabase  = DATA_SOURCE === 'supabase';

export function getAuthAdapter(): IAuthAdapter {
  return isUseSupabase() ? new SupabaseAuthAdapter(supabase) : new StaticAuthAdapter();
}
export function getFamilyAdapter(): IFamilyAdapter {
  return isUseSupabase() ? new SupabaseFamilyAdapter(supabase) : new StaticFamilyAdapter();
}
export function getCompanionAdapter(): ICompanionAdapter {
  return isUseSupabase() ? new SupabaseCompanionAdapter(supabase) : new StaticCompanionAdapter();
}
export function getRoutineAdapter(): IRoutineAdapter {
  return isUseSupabase() ? new SupabaseRoutineAdapter(supabase) : new StaticRoutineAdapter();
}
export function getGoalsAdapter(): IGoalsAdapter {
  return isUseSupabase() ? new SupabaseGoalsAdapter(supabase) : new StaticGoalsAdapter();
}
export function getEmotionalAdapter(): IEmotionalAdapter {
  return isUseSupabase() ? new SupabaseEmotionalAdapter(supabase) : new StaticEmotionalAdapter();
}
export function getRewardsAdapter(): IRewardsAdapter {
  return isUseSupabase() ? new SupabaseRewardsAdapter(supabase) : new StaticRewardsAdapter();
}
export function getProgressionAdapter(): IProgressionAdapter {
  return isUseSupabase() ? new SupabaseProgressionAdapter(supabase) : new StaticProgressionAdapter();
}
export function getSparkAdapter(): ISparkAdapter {
  return isUseSupabase() ? new SupabaseSparkAdapter(supabase) : new StaticSparkAdapter();
}

