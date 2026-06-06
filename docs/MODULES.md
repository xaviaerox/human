# Mira — Module Reference

All imports should come from `lib/index.ts` (the barrel export). Do not import from internal module paths directly in application code.

```typescript
// ✅ Correct
import { useAuth, useCompanion, selectDialogue } from '@/lib';

// ❌ Wrong
import { useAuth } from '@/lib/auth/AuthProvider';
```

---

## `lib/auth`

**Purpose:** Authentication, session management, role detection.

### `AuthProvider`
Wraps the app. Provides session, profile, family, and auth actions.

```typescript
interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  profile: Profile | null;
  family: Family | null;
  isParent: boolean;
  isChild: boolean;
  isAuthenticated: boolean;
  signUpParent(params: SignUpParentParams): Promise<Result<AuthSession>>;
  signUpWithInvite(params: SignUpChildParams): Promise<Result<AuthSession>>;
  signIn(params: SignInParams): Promise<Result<AuthSession>>;
  signOut(): Promise<Result<void>>;
  updateProfile(updates: Partial<Profile>): Promise<Result<Profile>>;
}
```

### `useAuth()`
Hook. Throws if used outside `AuthProvider`.

### `AuthGuard`
Route-level protection component.
```tsx
<AuthGuard requireRole="parent" fallback={<Redirect to="/login" />}>
  <ParentDashboard />
</AuthGuard>
```

### Signup flows

**Parent signup** (creates family atomically):
```typescript
const result = await signUpParent({ email, password, family_name, display_name });
// Calls create_family_with_parent() DB function
```

**Child/family member join** (via invite code):
```typescript
const result = await signUpWithInvite({ email, password, invite_code, display_name, birth_year });
// Calls join_family_with_invite() DB function
```

---

## `lib/family`

**Purpose:** Family grouping, member listing, invite management.

### `FamilyProvider`
Depends on `AuthProvider`. Provides family data and actions.

```typescript
interface FamilyContextValue {
  family: FamilyWithMembers | null;
  children: Profile[];  // child profiles only
  loading: boolean;
  createInvite(role: 'parent' | 'child'): Promise<FamilyInvite | null>;
  getActiveInvites(): Promise<FamilyInvite[]>;
  updateSettings(settings: Partial<FamilySettings>): Promise<void>;
  refresh(): Promise<void>;
}
```

### `useFamily()`
Hook. Throws if used outside `FamilyProvider`.

---

## `lib/companion`

**Purpose:** Companion lifecycle, bonding, stage progression, dialogue.

### `CompanionProvider`
Only active for child role. Returns null companion for parents.

```typescript
interface CompanionContextValue {
  companion: Companion | null;
  display: CompanionDisplayState | null;  // never exposes raw bonding_score
  loading: boolean;
  isVisible: boolean;
  createCompanion(name: string): Promise<boolean>;
  interact(type: CompanionInteractionType, context?: Record<string, unknown>): Promise<void>;
  getDialogue(trigger: DialogueTrigger, emotion?: EmotionState): DialogueLine;
  setAppearanceContext(ctx: AppearanceContext): void;
}
```

### `useCompanion()`
Hook. Throws if used outside `CompanionProvider`.

### `CompanionDisplayState`
What the UI receives. Note: **no raw bonding_score**.
```typescript
interface CompanionDisplayState {
  name: string;
  stage: CompanionStage;         // 'egg' | 'sprout' | 'bloom' | 'glow' | 'radiant'
  stageProgress: number;         // 0–1, position within current stage
  isNewStage: boolean;           // true on the frame stage changes
  responsivenessLevel: 'low' | 'medium' | 'high';
  traits: string[];              // unlocked personality traits
}
```

### `CompanionEngine` (pure functions)

| Function | Signature | Purpose |
|---|---|---|
| `stageFromScore` | `(score: number) → CompanionStage` | Derive stage from bonding score |
| `advanceStage` | `(companion, newScore) → CompanionStage` | Stage transition (never regresses) |
| `stageProgress` | `(companion) → number` | Progress 0–1 within current stage |
| `computeNewTraits` | `(companion, interactionCounts) → string[]` | Trait unlock check |
| `shouldCompanionAppear` | `(context: AppearanceContext) → boolean` | Appearance rule enforcement |
| `resolveTimeOfDay` | `(date?) → 'morning' \| 'afternoon' \| 'evening'` | Time-of-day resolution |
| `responsivenessLevel` | `(score: number) → ResponsivenessLevel` | ER tier |
| `toDisplayState` | `(companion, previousStage?) → CompanionDisplayState` | Safe display transform |

### `DialogueBank.selectDialogue`
```typescript
selectDialogue(ctx: DialogueContext): DialogueLine
```

`DialogueContext`:
```typescript
{
  stage: CompanionStage;
  childEmotion?: EmotionState;    // if low valence → routes to difficult_emotion
  triggerType: DialogueTrigger;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  companionName: string;
  recentActivity?: string;
}
```

`DialogueLine`:
```typescript
{
  text: string;
  animationCue?: string;   // e.g. 'pulse_gentle', 'bloom_brief', 'float_up'
  durationMs?: number;
}
```

**Appearance contexts** (determines whether companion renders):

| Context | Companion visible? |
|---|---|
| `home` | ✅ |
| `routine_active` | ❌ (no distraction during task) |
| `routine_complete` | ✅ |
| `goal_step_complete` | ✅ |
| `checkin` | ✅ |
| `checkin_response` | ✅ |
| `transition` | ✅ |
| `parent_dashboard` | ❌ (parent space is adult) |

---

## `lib/routines`

**Purpose:** Routine CRUD, scheduling, idempotent completion.

### `IRoutineAdapter`

```typescript
interface IRoutineAdapter {
  getRoutines(familyId: string, childId?: string): Promise<Result<RoutineWithSteps[]>>;
  getRoutine(routineId: string): Promise<Result<RoutineWithSteps>>;
  createRoutine(params: CreateRoutineParams): Promise<Result<RoutineWithSteps>>;
  updateRoutine(id: string, updates: Partial<Routine>): Promise<Result<Routine>>;
  archiveRoutine(id: string): Promise<Result<void>>;
  completeRoutine(params: CompleteRoutineParams): Promise<Result<RoutineCompletion>>;
  getCompletions(childId: string, from: string, to: string): Promise<Result<RoutineCompletion[]>>;
  isCompleteToday(routineId: string, childId: string): Promise<Result<boolean>>;
}
```

**Idempotency:** `completeRoutine()` uses upsert on `(routine_id, child_id, completed_date)`. Calling it twice for the same day returns the same record.

---

## `lib/goals`

**Purpose:** Goal management, AI microtask decomposition, progress tracking.

### `IGoalsAdapter`

```typescript
interface IGoalsAdapter {
  getGoals(childId: string): Promise<Result<GoalWithMicrotasks[]>>;
  getGoal(goalId: string): Promise<Result<GoalWithMicrotasks>>;
  createGoal(params: CreateGoalParams): Promise<Result<GoalWithMicrotasks>>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<Result<Goal>>;
  completeMicrotask(microtaskId: string, completedBy: string): Promise<Result<GoalMicrotask>>;
  addMicrotasks(goalId: string, microtasks: ParsedMicrotask[]): Promise<Result<GoalMicrotask[]>>;
}
```

### `MicrotaskEngine` (pure functions)

| Function | Purpose |
|---|---|
| `buildDecompositionPrompt(params)` | Builds Claude API prompt for microtask generation |
| `parseDecompositionResponse(raw, modelVersion)` | Parses + validates AI response, returns `DecompositionResult \| null` |
| `fallbackDecomposition(goalTitle)` | 3 generic steps when AI is unavailable |
| `computeGoalProgress(microtasks)` | 0–100 integer |
| `computeTotalSparks(microtasks)` | Sum of all microtask spark values |
| `getNextMicrotask(microtasks)` | Prefers in_progress, then pending |
| `enrichGoal(goal, microtasks)` | Attaches microtasks + progress to goal object |

### AI decomposition flow

```typescript
// 1. Build prompt
const prompt = buildDecompositionPrompt({
  goalTitle: goal.title,
  goalDescription: goal.description,
  goalWhy: goal.why,
  childAge: currentYear - (profile.birth_year ?? currentYear),
  existingTraits: companion?.personality_traits,
});

// 2. Call Claude API (claude-sonnet-4-20250514)
const response = await callClaudeAPI(prompt);

// 3. Parse response
const result = parseDecompositionResponse(response, 'claude-sonnet-4-20250514');

// 4. Fallback if parse fails
const microtasks = result?.microtasks ?? fallbackDecomposition(goal.title);

// 5. Save to adapter
await goalsAdapter.addMicrotasks(goal.id, microtasks);
```

---

## `lib/emotional`

**Purpose:** Emotional check-ins, scheduling, trend analysis for parent dashboard.

### `EmotionalProvider`

```typescript
interface EmotionalContextValue {
  recentCheckins: EmotionalCheckin[];
  lastCheckin: EmotionalCheckin | null;
  weeklySummaries: EmotionalWeeklySummary[];
  trend: EmotionTrend | null;    // null if < 2 weeks data
  schedule: CheckinPrompt[];
  loading: boolean;
  submitCheckin(emotion, context_type?, context_id?, note?, prompted_by?): Promise<EmotionalCheckin | null>;
  shouldPrompt(context: ContextType): boolean;
  updateSchedule(schedule: CheckinPrompt[]): Promise<void>;
  refresh(): Promise<void>;
}
```

### `EmotionModel` (pure functions)

| Function | Purpose |
|---|---|
| `classifyEmotion(state)` | → `EmotionQuadrant` (high/low energy × pleasant/unpleasant) |
| `getSuggestedWords(state)` | → `string[]` (suggested emotion words for that quadrant) |
| `shouldPromptCheckin(schedule, context, lastCheckinAt, now?)` | Boolean — should we prompt now? |
| `analyseEmotionTrend(summaries)` | → `EmotionTrend` — improving/stable/declining/insufficient_data |
| `validateCheckin(state)` | → `CheckinValidationError[]` (empty = valid) |

### Energy × valence grid

```
         Valence →
         1        3        5
Energy  ┌─────────┬─────────┐
5 ↑     │  HE/UNP │  HE/PLS │   HE = high energy
3       │         │         │   LE = low energy
1       │  LE/UNP │  LE/PLS │   UNP = unpleasant
        └─────────┴─────────┘   PLS = pleasant
```

No quadrant is labelled "bad". All emotions are valid.

---

## `lib/offline`

**Purpose:** Queue and drain client-side actions during offline periods.

### `OfflineQueue`

```typescript
class OfflineQueue {
  get isOnline(): boolean;
  enqueue(action: QueuedAction): OfflineQueueEntry;
  getQueue(): OfflineQueueEntry[];
  size(): number;
  clear(): void;
  remove(id: string): void;
  drain(): Promise<{ processed: number; failed: number }>;
}
```

`QueuedAction` types: `QueuedRoutineComplete`, `QueuedMicrotaskComplete`, `QueuedEmotionalCheckin`.

Max attempts: 3. After 3 failures, entry stays in queue but is skipped on drain.

**Singleton:** Use `getOfflineQueue(drainHandler)` — do not instantiate directly.

---

## `types/index.ts`

Single source of truth for all domain types. **If a type is needed anywhere in the app, it lives here.** Do not define domain types inside modules.

Key types to know:

```typescript
// Result type — used by all adapter methods
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: MiraError };

// Always narrow before using:
const result = await adapter.getRoutines(familyId);
if (result.ok) {
  // result.data is RoutineWithSteps[]
} else {
  // result.error is MiraError
}
```
