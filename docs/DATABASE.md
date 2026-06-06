# Mira — Database Reference

## Migration order

Always apply in sequence. Each migration depends on the previous.

```
001_auth_families.sql           → families, profiles, family_invites
002_routines_completions_sparks.sql → value_dimensions, routines, routine_steps,
                                      routine_completions, spark_ledger,
                                      child_value_scores, value_score_events
003_companions.sql              → companions, companion_interactions
004_goals_progression.sql       → goals, goal_microtasks
005_emotional.sql               → emotional_checkins, checkin_schedules,
                                  emotional_weekly_summary (materialized view)
006_production_hardening.sql    → indexes, offline_queue, realtime grants,
                                  REVOKE on spark_ledger, get_family_snapshot()
```

---

## Tables

### `families`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `name` | TEXT | Family display name |
| `settings` | JSONB | `{ timezone, locale, theme }` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

RLS: Members can read own family. Parents can update settings.

---

### `profiles`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | References `auth.users(id)` |
| `family_id` | UUID FK | → `families` |
| `role` | TEXT | `'parent'` \| `'child'` |
| `display_name` | TEXT | |
| `avatar_seed` | TEXT | Deterministic avatar key |
| `birth_year` | INT | Never exact DOB |
| `onboarding_complete` | BOOLEAN | False until companion named |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

RLS: Family members read all profiles in family. Own write only.

---

### `family_invites`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `family_id` | UUID FK | |
| `invited_by` | UUID FK | → `profiles` |
| `invite_code` | TEXT UNIQUE | 8-char code, auto-generated |
| `role` | TEXT | Role the invitee will receive |
| `used_by` | UUID FK | NULL until used |
| `used_at` | TIMESTAMPTZ | |
| `expires_at` | TIMESTAMPTZ | Default: 7 days from creation |
| `created_at` | TIMESTAMPTZ | |

---

### `companions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `child_id` | UUID UNIQUE FK | One companion per child |
| `name` | TEXT | NULL until child names it |
| `stage` | TEXT | `egg` → `sprout` → `bloom` → `glow` → `radiant` |
| `stage_unlocked_at` | JSONB | `{ "sprout": "ISO date", ... }` |
| `bonding_score` | INT | Cumulative, never decreases, min 0 |
| `emotional_responsiveness` | INT | 10–100, soft decay nightly (floor 10) |
| `personality_traits` | TEXT[] | Unlocked by interaction patterns |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Stage thresholds:**
- egg: 0–24
- sprout: 25–74
- bloom: 75–174
- glow: 175–349
- radiant: 350+

Stage is enforced by `on_companion_bonding_update()` trigger — it only advances, never regresses. This is enforced at the DB level and mirrored in `CompanionEngine.advanceStage()` client-side.

---

### `companion_interactions`
Append-only audit log. Never modified after insert.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `companion_id` | UUID FK | |
| `child_id` | UUID FK | |
| `type` | TEXT | `routine_complete` \| `emotional_checkin` \| `goal_step_complete` \| `free_interaction` \| `spark_received` \| `name_given` |
| `bonding_delta` | INT | Always >= 0 |
| `context` | JSONB | Source details |
| `occurred_at` | TIMESTAMPTZ | |

---

### `value_dimensions`
Seed data, static reference table.

| id | label |
|---|---|
| `autonomy` | Autonomy |
| `empathy` | Empathy |
| `regulation` | Regulation |
| `curiosity` | Curiosity |
| `courage` | Courage |
| `connection` | Connection |

---

### `child_value_scores`
| Column | Type | Notes |
|---|---|---|
| `child_id` | UUID PK (composite) | |
| `dimension_id` | TEXT PK (composite) | → `value_dimensions` |
| `score` | INT | >= 0, never decreases |
| `updated_at` | TIMESTAMPTZ | |

Updated by trigger on routine/goal/checkin events. Never written by client.

---

### `value_score_events`
Append-only ledger. Source of truth for all score changes.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `child_id` | UUID FK | |
| `dimension_id` | TEXT FK | |
| `delta` | INT | Always > 0 |
| `source_type` | TEXT | |
| `source_id` | UUID | References the triggering record |
| `note` | TEXT | |
| `occurred_at` | TIMESTAMPTZ | |

---

### `routines`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `family_id` | UUID FK | |
| `child_id` | UUID FK | NULL = family-wide |
| `title` | TEXT | |
| `schedule_type` | TEXT | `daily` \| `weekdays` \| `weekends` \| `custom` \| `one_off` |
| `schedule_days` | INT[] | 0=Sun … 6=Sat |
| `time_of_day` | TEXT | `morning` \| `midday` \| `evening` \| `anytime` |
| `scheduled_time` | TIME | Optional exact time |
| `is_active` | BOOLEAN | Soft delete via `is_active = false` |
| `color_token` | TEXT | Maps to design token |
| `icon_key` | TEXT | Maps to icon system |
| `value_dimensions` | TEXT[] | Which dimensions this reinforces |
| `spark_value` | INT | 1–5 |
| `created_by` | UUID FK | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

---

### `routine_steps`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `routine_id` | UUID FK | |
| `position` | INT | Ordered, unique per routine |
| `title` | TEXT | |
| `description` | TEXT | |
| `duration_minutes` | INT | |
| `visual_support` | TEXT | Icon/visual key for accessibility |

UNIQUE constraint: `(routine_id, position)`

---

### `routine_completions`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `routine_id` | UUID FK | |
| `child_id` | UUID FK | |
| `completed_date` | DATE | Default: today |
| `steps_completed` | INT[] | Array of step positions |
| `note` | TEXT | |
| `emotion_after` | TEXT | Optional post-routine check-in word |
| `completed_at` | TIMESTAMPTZ | |

UNIQUE constraint: `(routine_id, child_id, completed_date)` — **this is the idempotency key**. Insert twice for same routine+child+date = no-op.

---

### `spark_ledger`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `child_id` | UUID FK | |
| `family_id` | UUID FK | |
| `delta` | INT | Positive = award, negative = redemption |
| `balance_after` | INT | Computed at insert time, >= 0 enforced |
| `source_type` | TEXT | |
| `source_id` | UUID | |
| `note` | TEXT | |
| `awarded_by` | UUID FK | |
| `created_at` | TIMESTAMPTZ | |

**CRITICAL: `INSERT`, `UPDATE`, `DELETE` are REVOKED from `authenticated` role (migration 006).** All writes go through `award_sparks()` SECURITY DEFINER function only.

Current balance = `SELECT SUM(delta) FROM spark_ledger WHERE child_id = ?`
Also available as view: `spark_balances`

---

### `goals`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `family_id` | UUID FK | |
| `child_id` | UUID FK | |
| `title` | TEXT | |
| `description` | TEXT | |
| `why` | TEXT | "I want this because…" — intrinsic motivation anchor |
| `status` | TEXT | `active` \| `completed` \| `paused` \| `archived` |
| `target_date` | DATE | Soft deadline — "by when would be nice" framing |
| `value_dimensions` | TEXT[] | |
| `total_sparks` | INT | Sum of all microtask spark values |
| `visibility` | TEXT | `child_and_parent` \| `parent_only` |
| `co_created` | BOOLEAN | Child participated in goal creation |
| `created_by` | UUID FK | |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

Auto-completes via trigger when all microtasks are `complete`.

---

### `goal_microtasks`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `goal_id` | UUID FK | |
| `position` | INT | Ordered, unique per goal |
| `title` | TEXT | Max 60 chars — child-readable |
| `description` | TEXT | |
| `effort_level` | TEXT | `easy` \| `medium` \| `stretch` |
| `spark_value` | INT | 1–10 |
| `value_dimensions` | TEXT[] | |
| `status` | TEXT | `pending` \| `in_progress` \| `complete` |
| `ai_generated` | BOOLEAN | True if generated by Claude |
| `ai_model_version` | TEXT | e.g. `claude-sonnet-4-20250514` |
| `completed_at` | TIMESTAMPTZ | |
| `completed_by` | UUID FK | Child or parent |

UNIQUE constraint: `(goal_id, position)`

---

### `emotional_checkins`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `child_id` | UUID FK | |
| `emotion_word` | TEXT | Child's own words, no validation |
| `energy_level` | INT | 1–5 |
| `valence` | INT | 1–5 |
| `context_type` | TEXT | `morning` \| `after_routine` \| `after_goal` \| `free` \| `bedtime` |
| `context_id` | UUID | Optional ref to triggering routine/goal |
| `note` | TEXT | Free text, no length limit |
| `prompted_by` | TEXT | `app` \| `child` |
| `companion_response_key` | TEXT | Which dialogue response was shown |
| `occurred_at` | TIMESTAMPTZ | |

RLS: Family can read. Only child can insert their own. **Parents see aggregated weekly summary, not raw check-ins.**

---

### `checkin_schedules`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `child_id` | UUID UNIQUE FK | One schedule per child |
| `prompts` | JSONB | Array of `CheckinPrompt` objects |
| `updated_at` | TIMESTAMPTZ | |

Default prompts: morning (08:00), after_routine (event-triggered), bedtime (20:00).

---

### `offline_queue`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `action_type` | TEXT | `routine_complete` \| `microtask_complete` \| `emotional_checkin` |
| `payload` | JSONB | Full action data |
| `created_at` | TIMESTAMPTZ | |
| `processed_at` | TIMESTAMPTZ | NULL until drained |
| `error` | TEXT | Set if processing failed |

Processed via `process_offline_entry(id)` RPC.

---

## Views

### `spark_balances`
```sql
SELECT child_id, COALESCE(SUM(delta), 0) AS balance
FROM spark_ledger GROUP BY child_id;
```

### `emotional_weekly_summary` (materialized)
```sql
SELECT child_id, DATE_TRUNC('week', occurred_at) AS week_start,
  AVG(energy_level) AS avg_energy, AVG(valence) AS avg_valence,
  COUNT(*) AS checkin_count,
  MODE() WITHIN GROUP (ORDER BY emotion_word) AS most_common_emotion
FROM emotional_checkins
GROUP BY child_id, DATE_TRUNC('week', occurred_at);
```
Refreshed nightly via `refresh_emotional_summary()`.

---

## Functions (SECURITY DEFINER)

| Function | Purpose |
|---|---|
| `create_family_with_parent(user_id, family_name, display_name, avatar_seed)` | Atomic family + parent profile creation on signup |
| `join_family_with_invite(user_id, invite_code, display_name, birth_year, avatar_seed)` | Validates invite, creates profile, marks invite used |
| `award_sparks(child_id, delta, source_type, source_id, note, awarded_by)` | Only valid way to write to spark_ledger |
| `create_companion(child_id, name)` | Creates companion + logs name_given interaction + initial bonding boost |
| `decay_emotional_responsiveness()` | Nightly: -2 ER for children with no check-in in 48h (floor 10) |
| `process_offline_entry(entry_id)` | Processes queued offline action idempotently |
| `get_family_snapshot(user_id)` | Single-query app load: profile + family + children + companion + sparks |
| `refresh_emotional_summary()` | Refreshes materialized view (call nightly) |

---

## Triggers

| Trigger | Table | Function | Effect |
|---|---|---|---|
| `trg_routine_completion` | `routine_completions` AFTER INSERT | `on_routine_completion()` | Sparks + value scores + companion bonding |
| `trg_companion_stage_progression` | `companions` BEFORE UPDATE OF `bonding_score` | `on_companion_bonding_update()` | Stage advancement (never regression) |
| `trg_microtask_complete` | `goal_microtasks` AFTER UPDATE OF `status` | `on_microtask_complete()` | Sparks + value scores + companion bonding + auto-complete goal |
| `trg_goal_complete` | `goals` AFTER UPDATE OF `status` | `on_goal_complete()` | Bonus sparks + value scores on completion |
| `trg_emotional_checkin` | `emotional_checkins` AFTER INSERT | `on_emotional_checkin()` | Sparks + regulation score + companion bonding + ER boost |
| `trg_*_updated_at` | All mutable tables | `set_updated_at()` | Auto-update `updated_at` column |
