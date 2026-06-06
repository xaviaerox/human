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

export const DATA_SOURCE = process.env.NEXT_PUBLIC_DATA_SOURCE ?? 'static';
export const isSupabase  = DATA_SOURCE === 'supabase';

let _auth:      IAuthAdapter      | null = null;
let _family:    IFamilyAdapter    | null = null;
let _companion: ICompanionAdapter | null = null;
let _routines:  IRoutineAdapter   | null = null;
let _goals:     IGoalsAdapter     | null = null;
let _emotional: IEmotionalAdapter | null = null;
let _rewards:   IRewardsAdapter   | null = null;

export function getAuthAdapter(): IAuthAdapter {
  if (!_auth) _auth = isSupabase ? new SupabaseAuthAdapter(supabase) : new StaticAuthAdapter();
  return _auth;
}
export function getFamilyAdapter(): IFamilyAdapter {
  if (!_family) _family = isSupabase ? new SupabaseFamilyAdapter(supabase) : new StaticFamilyAdapter();
  return _family;
}
export function getCompanionAdapter(): ICompanionAdapter {
  if (!_companion) _companion = isSupabase ? new SupabaseCompanionAdapter(supabase) : new StaticCompanionAdapter();
  return _companion;
}
export function getRoutineAdapter(): IRoutineAdapter {
  if (!_routines) _routines = isSupabase ? new SupabaseRoutineAdapter(supabase) : new StaticRoutineAdapter();
  return _routines;
}
export function getGoalsAdapter(): IGoalsAdapter {
  if (!_goals) _goals = isSupabase ? new SupabaseGoalsAdapter(supabase) : new StaticGoalsAdapter();
  return _goals;
}
export function getEmotionalAdapter(): IEmotionalAdapter {
  if (!_emotional) _emotional = isSupabase ? new SupabaseEmotionalAdapter(supabase) : new StaticEmotionalAdapter();
  return _emotional;
}
export function getRewardsAdapter(): IRewardsAdapter {
  if (!_rewards) _rewards = isSupabase ? new SupabaseRewardsAdapter(supabase) : new StaticRewardsAdapter();
  return _rewards;
}
