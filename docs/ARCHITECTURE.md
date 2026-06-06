# Mira — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        MIRA PLATFORM                            │
│                                                                  │
│   Child View                        Parent Dashboard             │
│   ──────────────────────            ──────────────────────────   │
│   • Companion (ambient)             • Family members             │
│   • Today's routines                • Weekly emotional summary   │
│   • Active goal step                • Goal management            │
│   • Emotional check-in              • Spark awards               │
│   • Spark balance                   • Routine creation           │
│                                     • Schedule configuration     │
│                   │                           │                  │
│                   └───────────┬───────────────┘                  │
│                               │                                  │
│                    ┌──────────▼──────────────┐                   │
│                    │   Next.js App Layer      │                   │
│                    │   React Context Tree     │                   │
│                    │   Adapter Pattern        │                   │
│                    └──────────┬──────────────┘                   │
│                               │                                  │
│              ┌────────────────▼────────────────┐                 │
│              │           Supabase               │                 │
│              │  PostgreSQL + Auth + Realtime    │                 │
│              │  Row Level Security on all tables│                 │
│              │  DB triggers for all side effects│                 │
│              └─────────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Provider Tree

Providers must be nested in this exact order. Each provider depends on those above it.

```tsx
<AuthProvider adapter={getAuthAdapter()}>
  <FamilyProvider adapter={getFamilyAdapter()}>
    <CompanionProvider adapter={getCompanionAdapter()}>
      <EmotionalProvider adapter={getEmotionalAdapter()}>
        {/* ProgressionProvider — not yet built */}
        {/* SparkProvider — not yet built */}
        <AppLayout>
          {children}
        </AppLayout>
      </EmotionalProvider>
    </CompanionProvider>
  </FamilyProvider>
</AuthProvider>
```

**Dependency chain:**
- `AuthProvider` → provides `session`, `profile`, `family`
- `FamilyProvider` → reads from `useAuth()`, provides family members
- `CompanionProvider` → reads `profile.role` from `useAuth()`, child-only
- `EmotionalProvider` → reads `profile.id` from `useAuth()`

---

## Data Flow

### Routine completion (full path)

```
Child taps "Done" on routine
  → routineAdapter.completeRoutine({ routine_id, child_id, date })
  → Supabase INSERT into routine_completions (idempotent upsert)
  → DB trigger: on_routine_completion() fires
      → award_sparks(child_id, spark_value, 'routine_complete')
          → INSERT into spark_ledger (balance_after computed server-side)
      → INSERT into value_score_events (per tagged dimension)
      → UPDATE child_value_scores (upsert, score += 1 per dimension)
      → UPDATE companions SET bonding_score += 2 (triggers stage check)
          → on_companion_bonding_update() fires
          → IF new stage > old stage: UPDATE stage, stage_unlocked_at
      → INSERT into companion_interactions (audit log)
  → Realtime: companion row UPDATE published → CompanionProvider receives
  → UI updates: companion display state refreshes
```

### Emotional check-in (full path)

```
Child submits check-in (energy_level, valence, emotion_word)
  → EmotionalProvider.submitCheckin()
  → validateCheckin() — rejects if out of range
  → emotionalAdapter.submitCheckin()
  → Supabase INSERT into emotional_checkins
  → DB trigger: on_emotional_checkin() fires
      → award_sparks(child_id, 1, 'emotional_checkin')
      → INSERT value_score_events for 'regulation' dimension
      → UPDATE companions SET bonding_score += 3, emotional_responsiveness = MIN(100, er + 5)
  → Optimistic update: recentCheckins + lastCheckin updated in context
  → CompanionProvider receives realtime companion update
  → Companion dialogue selected: selectDialogue({ trigger: 'checkin_response', childEmotion })
```

### Offline path (routine completion while offline)

```
Child taps "Done" offline
  → isCompleteToday() → false (optimistic)
  → offlineQueue.enqueue({ type: 'routine_complete', ... })
  → UI updates optimistically (routine shown as complete)
  → Device goes online
  → window 'online' event fires
  → offlineQueue.drain() called
      → For each entry: process_offline_entry(id) via Supabase RPC
      → Idempotent: ON CONFLICT DO NOTHING on routine_completions
      → All triggers fire server-side (sparks, bonding, scores)
  → offlineQueue.remove(entry.id)
```

---

## Adapter Pattern

The core architectural seam. Every module has:

```
IXxxAdapter          ← interface (contract)
StaticXxxAdapter     ← in-memory implementation (tests + demo)
SupabaseXxxAdapter   ← production implementation
```

Switch is controlled by a single environment variable:

```bash
NEXT_PUBLIC_DATA_SOURCE=static    # default, uses in-memory adapters
NEXT_PUBLIC_DATA_SOURCE=supabase  # production, uses Supabase adapters
```

The factory in `lib/adapters.ts` instantiates singletons. **Nothing else in the app should import adapters directly.** They should come from the factory or be injected via providers.

---

## Security Model

### Row Level Security

Every table has RLS enabled. The invariant:
- A user can only read data that belongs to their `family_id`
- A child can only write their own data (`child_id = auth.uid()`)
- A parent can write all data within their `family_id`
- The `spark_ledger` table is **read-only for all authenticated users** — writes only via `award_sparks()` SECURITY DEFINER function

### Server-side enforcement

All financial-equivalent operations (spark award, value score updates, companion bonding) run inside PostgreSQL triggers or SECURITY DEFINER functions. The client never writes to:
- `spark_ledger` (REVOKE INSERT enforced in migration 006)
- `value_score_events` (insert only via trigger)
- `companion_interactions` (insert only via trigger)

This means: **client-side manipulation of sparks or scores is structurally impossible.**

---

## Realtime Subscriptions

Four tables have Supabase Realtime enabled (migration 006):
- `companions` — for live companion stage/bonding updates
- `spark_ledger` — for live spark balance
- `routine_completions` — for multi-device sync
- `goal_microtasks` — for co-created goal progress

Pattern in adapters:

```typescript
const channel = supabase
  .channel(`companion:${childId}`)
  .on('postgres_changes', { event: 'UPDATE', table: 'companions', filter: `child_id=eq.${childId}` },
    payload => callback(payload.new as Companion)
  )
  .subscribe();

return () => supabase.removeChannel(channel);
```

Always return the unsubscribe function. Always clean up in `useEffect` return.

---

## Key architectural decisions

### Why DB triggers instead of client-side logic?

Spark awards, bonding updates, and value scores are all computed in PostgreSQL triggers. Reasons:
1. **Ledger integrity** — no client can award themselves sparks
2. **Atomicity** — routine completion + spark award + bonding + score all succeed or all fail
3. **Offline resilience** — when the queue drains, all side effects fire correctly from the server

### Why the adapter pattern over a single Supabase implementation?

1. **Tests run without network** — static adapters are pure in-memory
2. **Demo mode** — the app is fully functional with `DATA_SOURCE=static`
3. **Incremental migration** — each module can be switched independently
4. **Interface stability** — the UI never breaks when the backend changes

### Why no Redux / Zustand?

The state is naturally hierarchical (auth → family → child-specific modules). React Context is sufficient and reduces dependency surface. Each provider owns one domain. No cross-domain state mutations.

---

## Performance considerations

- **Companion animations**: CSS/SVG only — no JavaScript animation loops on the main thread
- **Progression calculations**: All in DB triggers — the client never computes scores
- **Emotional weekly summary**: Materialized view, refreshed nightly — never computed on read
- **Family snapshot**: `get_family_snapshot()` RPC function — single round trip on app load
- **Offline queue**: localStorage-based — does not block the UI thread
- **Realtime rate**: 2 events/second cap (configured in Supabase client) — calm, not reactive
