# Mira — Project State Snapshot
## For agent handoff. Updated after Phase 6.

---

## Exact build state

```
Last completed phase : Phase 6 (Production Hardening)
Test suite           : 157 passing / 0 failing / 6 suites
TypeScript           : Strict mode, 0 errors
Supabase migrations  : 001–006 applied, in order
Barrel export        : lib/index.ts (complete)
Adapter factory      : lib/adapters.ts (complete)
```

---

## File manifest (production files only)

```
types/
  index.ts                               ← ALL domain types

lib/
  index.ts                               ← Barrel export (single import point)
  adapters.ts                            ← Adapter factory + ENV switch
  supabase.ts                            ← Typed Supabase client singleton

  auth/
    IAuthAdapter.ts                      ✅
    StaticAuthAdapter.ts                 ✅
    SupabaseAuthAdapter.ts               ✅
    AuthProvider.tsx                     ✅

  family/
    FamilyProvider.tsx                   ✅
    adapters/
      IFamilyAdapter.ts                  ✅
      StaticFamilyAdapter.ts             ✅
      SupabaseFamilyAdapter.ts           ✅

  companion/
    CompanionEngine.ts                   ✅
    CompanionProvider.tsx                ✅
    dialogue/
      DialogueBank.ts                    ✅
    adapters/
      ICompanionAdapter.ts               ✅
      StaticCompanionAdapter.ts          ✅
      SupabaseCompanionAdapter.ts        ✅

  routines/
    adapters/
      IRoutineAdapter.ts                 ✅
      StaticRoutineAdapter.ts            ✅
      SupabaseRoutineAdapter.ts          ✅

  goals/
    MicrotaskEngine.ts                   ✅
    adapters/
      IGoalsAdapter.ts                   ✅
      StaticGoalsAdapter.ts              ✅
      SupabaseGoalsAdapter.ts            ❌ MISSING — next priority

  emotional/
    EmotionModel.ts                      ✅
    EmotionalProvider.tsx                ✅
    adapters/
      IEmotionalAdapter.ts              ✅
      StaticEmotionalAdapter.ts          ✅
      SupabaseEmotionalAdapter.ts        ✅

  offline/
    OfflineQueue.ts                      ✅

supabase/
  migrations/
    001_auth_families.sql                ✅
    002_routines_completions_sparks.sql  ✅
    003_companions.sql                   ✅
    004_goals_progression.sql            ✅
    005_emotional.sql                    ✅
    006_production_hardening.sql         ✅

docs/
  AGENT_CONTEXT.md                       ✅ (read first)
  ARCHITECTURE.md                        ✅
  DATABASE.md                            ✅
  MODULES.md                             ✅
  PATTERNS.md                            ✅
  COMPANION.md                           ✅
  TESTING.md                             ✅
  ROADMAP.md                             ✅
  ONBOARDING.md                          ✅
  PROJECT_STATE.md                       ✅ (this file)
```

---

## Modules not yet built (in priority order)

### 1. `SupabaseGoalsAdapter`
```
File to create  : lib/goals/adapters/SupabaseGoalsAdapter.ts
Implement       : IGoalsAdapter (lib/goals/adapters/IGoalsAdapter.ts)
Reference impl  : lib/routines/adapters/SupabaseRoutineAdapter.ts (same pattern)
Register in     : lib/adapters.ts → getGoalsAdapter()
Export from     : lib/index.ts
DB tables       : goals, goal_microtasks
DB triggers     : on_microtask_complete, on_goal_complete (already exist in 004)
Special         : completeMicrotask() must UPDATE status → trigger fires server-side
```

### 2. `ProgressionProvider` (full module)
```
Files to create:
  lib/progression/adapters/IProgressionAdapter.ts
  lib/progression/adapters/StaticProgressionAdapter.ts
  lib/progression/adapters/SupabaseProgressionAdapter.ts
  lib/progression/ProgressionProvider.tsx

Interface methods:
  getScores(childId: string): Promise<Result<Record<ValueDimensionId, number>>>
  getEvents(childId: string, limit?: number): Promise<Result<ValueScoreEvent[]>>
  getSummary(childId: string): Promise<Result<ChildProgressionSummary>>

DB tables: child_value_scores, value_score_events, value_dimensions
Display rule: NEVER show raw numbers to child. Use metaphor (garden, constellation).
```

### 3. `SparkProvider` (full module)
```
Files to create:
  lib/sparks/adapters/ISparkAdapter.ts
  lib/sparks/adapters/StaticSparkAdapter.ts
  lib/sparks/adapters/SupabaseSparkAdapter.ts
  lib/sparks/SparkProvider.tsx

Interface methods:
  getBalance(childId: string): Promise<Result<number>>
  getHistory(childId: string, limit?: number): Promise<Result<SparkLedgerEntry[]>>
  awardBonus(childId: string, delta: number, note: string): Promise<Result<SparkLedgerEntry>>

Critical: awardBonus MUST call supabase.rpc('award_sparks', ...) — never direct INSERT
Realtime: subscribe to spark_ledger for live balance updates
```

### 4. Onboarding UI flow
```
Screens:
  /onboarding/parent  → family name + display name → signUpParent()
  /onboarding/join    → invite code → signUpWithInvite()
  /onboarding/child   → companion naming → createCompanion() → updateProfile({ onboarding_complete: true })

Gate: check profile.onboarding_complete on app init
      if false → redirect to /onboarding
      if true → allow through to main app

Companion naming screen:
  - Show egg (pulsing blob)
  - Free text input (no character suggestions)
  - On submit: createCompanion(name) → companion dialogue 'name_chosen'
```

### 5. Child home screen
```
Route: /app (child role only, AuthGuard)
Components needed:
  - CompanionWidget (ambient, setAppearanceContext('home'))
  - TodayRoutines (routineAdapter.getRoutines filtered to today's schedule)
  - ActiveGoalStep (goalsAdapter.getGoals → getNextMicrotask())
  - SparkBalance (sparkAdapter.getBalance)
  - CheckinPrompt (renders if shouldPrompt('morning') is true)

Layout constraint: max 3 concepts visible at once
```

### 6. Parent dashboard
```
Route: /dashboard (parent role only, AuthGuard)
Sections:
  - Family members (useFamily().children)
  - Per-child emotional summary (weekly, aggregated — NOT raw checkins)
  - Per-child spark balance
  - Goal management (create/view goals with microtasks)
  - Routine management (create/edit/archive)
  - Check-in schedule config (updateSchedule())

Critical: emotional_weekly_summary view, not emotional_checkins table
Companion: does NOT appear here (shouldCompanionAppear('parent_dashboard') = false)
```

---

## Key constants

```typescript
// Companion stage thresholds
egg:     0–24
sprout:  25–74
bloom:   75–174
glow:    175–349
radiant: 350+

// Bonding deltas per interaction
routine_complete:    +2
emotional_checkin:  +3
goal_step_complete: +2
free_interaction:   +1
spark_received:     +1
name_given:         +5 (onboarding only)

// Emotional responsiveness
initial:  50
per_checkin: +5 (capped at 100)
nightly_decay: -2 (floor: 10)

// Spark values
routine: 1–5 (set by parent)
microtask: 1–10 (set by parent or AI)
goal_complete_bonus: 5 (fixed)
emotional_checkin: 1 (fixed)

// Value score deltas
routine_complete: +1 per tagged dimension
microtask_complete: +1 per tagged dimension
goal_complete: +3 per tagged dimension
emotional_checkin: +1 to 'regulation' always
```

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | In supabase mode | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | In supabase mode | Supabase anon key |
| `NEXT_PUBLIC_DATA_SOURCE` | Always | `'static'` or `'supabase'` |
| `ANTHROPIC_API_KEY` | For AI decomposition | Server-side only, never client |

---

## Static demo data

When `DATA_SOURCE=static`:

```
Family:    { id: 'static-family-1', name: 'Demo Family' }
Parent:    { id: 'static-parent-1', display_name: 'Parent', role: 'parent' }
Child:     { id: 'static-child-1', display_name: 'Alex', role: 'child', birth_year: 2017 }
Companion: { id: 'companion-1', name: 'Lumi', stage: 'sprout', bonding_score: 30 }
Routines:  [ 'Morning Start' (spark: 3), 'Wind Down' (spark: 2) ]
Goal:      { id: 'goal-1', title: 'Learn to tie my shoes', progress: 33% }
Invite:    { invite_code: 'DEMO1234', role: 'child' }
```

---

## Architectural invariants

An agent must never violate these. They are non-negotiable:

1. `spark_ledger` — INSERT/UPDATE/DELETE are REVOKED from client. Always use `award_sparks()` RPC.
2. Companion stage — never regresses. Enforced in DB trigger AND `CompanionEngine.advanceStage()`.
3. `emotional_responsiveness` — floor of 10. Never returns to zero.
4. `bonding_score` — never exposed to child UI. Use `toDisplayState()`.
5. Child scores — never decrease. All `delta` values in `value_score_events` are positive.
6. Routine completion — idempotent via `UNIQUE (routine_id, child_id, completed_date)`.
7. All adapter methods return `Result<T>` — never throw.
8. All imports come from `lib/index.ts` — never from internal module paths.
9. RLS is enabled on every table. No table without RLS policies.
10. Prohibited UX patterns are not configurable — they are structurally absent.
