# Mira — Roadmap

## Completed

### Phase 1: Auth + Family
- `families`, `profiles`, `family_invites` schema + RLS
- `create_family_with_parent()` and `join_family_with_invite()` DB functions
- `IAuthAdapter`, `StaticAuthAdapter`, `SupabaseAuthAdapter`
- `AuthProvider`, `useAuth`, `AuthGuard`
- `IFamilyAdapter`, `StaticFamilyAdapter`, `SupabaseFamilyAdapter`
- `FamilyProvider`, `useFamily`
- Adapter factory + ENV switch

### Phase 2: Routines + Persistence
- `value_dimensions`, `child_value_scores`, `value_score_events` schema
- `routines`, `routine_steps`, `routine_completions` schema + RLS
- `spark_ledger`, `award_sparks()` SECURITY DEFINER function
- Idempotent completion upsert `(routine_id, child_id, completed_date)`
- `on_routine_completion()` trigger (sparks + value scores + bonding)
- `IRoutineAdapter`, `StaticRoutineAdapter`, `SupabaseRoutineAdapter`

### Phase 3: Companion
- `companions`, `companion_interactions` schema + RLS
- Stage progression trigger `on_companion_bonding_update()` (never regresses)
- `decay_emotional_responsiveness()` nightly function (floor: 10)
- `create_companion()` DB function
- `CompanionEngine.ts` — pure stage/bonding/trait logic
- `DialogueBank.ts` — all 5 stages × all triggers (neurodivergent-validated)
- `ICompanionAdapter`, `StaticCompanionAdapter`, `SupabaseCompanionAdapter`
- `CompanionProvider`, `useCompanion`

### Phase 4: Goals + AI Decomposition
- `goals`, `goal_microtasks` schema + RLS
- `on_microtask_complete()` and `on_goal_complete()` triggers
- `MicrotaskEngine.ts` — prompt building, response parsing, fallback
- `IGoalsAdapter`, `StaticGoalsAdapter`
- Auto-complete goal when all microtasks done (trigger)

### Phase 5: Emotional Tracking
- `emotional_checkins`, `checkin_schedules` schema + RLS
- `emotional_weekly_summary` materialized view
- `on_emotional_checkin()` trigger (sparks + regulation score + companion ER boost)
- `EmotionModel.ts` — energy × valence grid, prompt scheduling, trend analysis
- `IEmotionalAdapter`, `StaticEmotionalAdapter`, `SupabaseEmotionalAdapter`
- `EmotionalProvider`, `useEmotional`

### Phase 6: Production Hardening
- Performance indexes on all hot-path queries
- `offline_queue` table + `process_offline_entry()` function
- `OfflineQueue.ts` — localStorage queue + drain logic
- Realtime publication grants (companions, spark_ledger, routine_completions, goal_microtasks)
- REVOKE INSERT/UPDATE/DELETE on `spark_ledger` from authenticated role
- `get_family_snapshot()` — single round-trip app load
- `lib/index.ts` barrel export
- 157 passing tests across 6 suites

---

## Next work (priority order)

### 1. `SupabaseGoalsAdapter`
**Status:** Missing — only `StaticGoalsAdapter` exists.  
**What to do:** Follow `SupabaseRoutineAdapter` as exact template. The schema and triggers are complete.  
**File:** `lib/goals/adapters/SupabaseGoalsAdapter.ts`  
**Register in:** `lib/adapters.ts` → `getGoalsAdapter()`  
**Tests:** Add Supabase adapter integration tests (requires live DB)

### 2. `ProgressionProvider`
**Status:** Schema complete (child_value_scores, value_score_events). Provider not built.  
**What to do:**
- `IProgressionAdapter` — `getScores(childId)`, `getEvents(childId, limit)`, `getSummary(childId)`
- `StaticProgressionAdapter` — seeded with demo scores
- `SupabaseProgressionAdapter`
- `ProgressionProvider` + `useProgression()`
- Context value: `scores: Record<ValueDimensionId, number>`, `summary: ChildProgressionSummary`  
**Display rule:** Child sees a "garden" or constellation metaphor — never a numeric score.

### 3. `SparkProvider`
**Status:** `spark_ledger` schema + `award_sparks()` function complete. Provider not built.  
**What to do:**
- `ISparkAdapter` — `getBalance(childId)`, `getHistory(childId, limit)`, `awardBonus(childId, delta, note)` (parent only)
- `StaticSparkAdapter`
- `SupabaseSparkAdapter`
- `SparkProvider` + `useSparks()`
- Realtime subscription to `spark_ledger` for live balance updates  
**Note:** `awardBonus` must call `award_sparks()` RPC — never direct insert.

### 4. Onboarding flow (UI)
**Status:** DB function + adapter method exist. UI not built.  
**Screens needed:**
1. Parent signup (family name, display name)
2. Family invite flow (generate code, share, join)
3. Child onboarding — name the companion (free text, no suggestions)
4. Companion egg reveal + first dialogue (`name_chosen` trigger)
**Gate:** `profile.onboarding_complete` must be `false` to enter. Set to `true` after naming.

### 5. Child home screen
**What to build:**
- Companion widget (ambient, `AppearanceContext: 'home'`)
- Today's routines list (from `useRoutine` — not built yet)
- Active goal step (from `useGoals`)
- Spark balance (from `useSparks`)
- Check-in prompt if `shouldPrompt('morning')` returns true  
**Design constraint:** Max 3 active concepts visible at once. Calm, uncluttered.

### 6. Parent dashboard
**What to build:**
- Family member list (from `useFamily`)
- Per-child weekly emotional summary (aggregated — never raw check-ins)
- Per-child spark balance + recent history
- Goal list with progress (parent can create, child can complete)
- Routine management (create, edit, archive)
- Check-in schedule configuration  
**Critical:** Parent sees `emotional_weekly_summary` view, not `emotional_checkins` table.

### 7. AI decomposition integration
**Status:** `buildDecompositionPrompt()` and `parseDecompositionResponse()` built and tested.  
**What to wire:**
```typescript
const prompt = buildDecompositionPrompt({ goalTitle, goalDescription, goalWhy, childAge });
const response = await fetch('/api/decompose', { method: 'POST', body: JSON.stringify({ prompt }) });
const { text } = await response.json();
const result = parseDecompositionResponse(text, 'claude-sonnet-4-20250514');
const microtasks = result?.microtasks ?? fallbackDecomposition(goalTitle);
await goalsAdapter.addMicrotasks(goalId, microtasks);
```
**API route:** `pages/api/decompose.ts` or `app/api/decompose/route.ts` — calls Claude API server-side (key never on client).  
**Model:** `claude-sonnet-4-20250514`

### 8. Scheduled check-in prompts
**What to do:**
- In the child home screen, on mount, check `shouldPrompt('morning')`
- If true, render a gentle prompt overlay using `useCompanion().getDialogue('checkin_prompt')`
- After routine completion, check `shouldPrompt('after_routine')` and prompt
- At bedtime, OS notification or in-app modal using `shouldPrompt('bedtime')`

### 9. Nightly maintenance jobs
**What to set up** (Supabase Edge Function or pg_cron):
- `decay_emotional_responsiveness()` — nightly at 03:00
- `refresh_emotional_summary()` — nightly at 03:15

### 10. E2E tests (Playwright)
**Scope:**
- Onboarding flow (parent signup → child join → companion naming)
- Routine completion → spark balance update
- Goal creation → microtask completion → goal complete
- Emotional check-in → companion response
- Offline completion → reconnect → sync

---

## Deliberately deferred

These are potential future phases, not current scope. Do not implement without explicit approval.

| Feature | Why deferred |
|---|---|
| Push notifications | High risk of dark patterns — needs careful UX design |
| Multi-language i18n | Scope creep for MVP |
| Companion voice/audio | Accessibility benefit, but high complexity |
| Photo/media in goals | Storage cost + moderation complexity |
| Sibling interaction features | Requires careful design to avoid comparison |
| Parent analytics beyond weekly summary | Privacy risk — scope carefully |
| Rewards marketplace (spark redemption) | Needs family-specific configuration UI first |
| AI companion dialogue (generative) | Fixed bank is safer + more controllable for now |

---

## Permanently forbidden

These will never be implemented. If a request to implement any of these arrives, refuse and explain why.

- Streaks of any kind
- Social comparison between children
- Leaderboards
- Companion stage regression
- Negative scores or values
- Urgency mechanics ("limited time", "expires in")
- Companion guilt mechanics ("I miss you")
- Loot boxes or random rewards
- Notifications designed to increase engagement (not utility)
- Advertising or sponsored content
- Raw emotional data visible to third parties
- Any feature that benefits the platform more than the child
