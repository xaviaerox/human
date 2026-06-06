# Mira — Dev Environment Setup

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (free tier is fine for development)

---

## 1. Clone and install

```bash
git clone <repo>
cd mira
npm install
```

---

## 2. Environment variables

Create `.env.local` in the project root:

```bash
# Required for Supabase mode
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Controls which adapter set is used
# 'static' = in-memory demo (no DB required)
# 'supabase' = live Supabase DB
NEXT_PUBLIC_DATA_SOURCE=static

# Required for AI decomposition (server-side only, never expose to client)
ANTHROPIC_API_KEY=your-anthropic-key
```

**Start with `DATA_SOURCE=static`** — the entire app is functional without a DB.

---

## 3. Apply database migrations (Supabase mode only)

Apply migrations in order using the Supabase dashboard SQL editor or CLI:

```bash
# Via Supabase CLI
supabase db push

# Or manually in order:
# 1. supabase/migrations/001_auth_families.sql
# 2. supabase/migrations/002_routines_completions_sparks.sql
# 3. supabase/migrations/003_companions.sql
# 4. supabase/migrations/004_goals_progression.sql
# 5. supabase/migrations/005_emotional.sql
# 6. supabase/migrations/006_production_hardening.sql
```

Each migration is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). Safe to re-run.

---

## 4. Run tests

```bash
npx vitest run
# Expected: 6 suites, 157 tests, 0 failures
```

Tests run entirely against static adapters — no DB or network required.

---

## 5. Start the dev server

```bash
npm run dev
# App runs at http://localhost:3000
```

With `DATA_SOURCE=static`, the app loads with seeded demo data:
- Family: "Demo Family"
- Parent: "Parent" (`parent@test.com`)
- Child: "Alex" (`child@test.com` or any non-parent email)
- Companion: "Lumi" (stage: sprout, bonding: 30)
- 2 routines: Morning Start, Wind Down
- 1 goal: Learn to tie my shoes (33% progress)
- 2 seeded emotional check-ins

---

## 6. Switch to Supabase

```bash
# .env.local
NEXT_PUBLIC_DATA_SOURCE=supabase
```

All adapters switch automatically. No code changes required.

---

## 7. Set up nightly jobs (production)

Two functions need scheduled execution. Set up via Supabase Edge Functions or pg_cron:

```sql
-- Via pg_cron (requires pg_cron extension enabled in Supabase)
SELECT cron.schedule('decay-emotional-responsiveness', '0 3 * * *',
  'SELECT decay_emotional_responsiveness()');

SELECT cron.schedule('refresh-emotional-summary', '15 3 * * *',
  'SELECT refresh_emotional_summary()');
```

---

## 8. Realtime (Supabase mode)

Realtime is pre-configured in migration 006. Verify in Supabase dashboard:
- `companions` — realtime enabled
- `spark_ledger` — realtime enabled
- `routine_completions` — realtime enabled
- `goal_microtasks` — realtime enabled

---

## Project scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run typecheck    # TypeScript check (no emit)
npx vitest run       # Run all tests
npx vitest           # Tests in watch mode
npx vitest run --coverage  # Coverage report
```

---

## Common issues

### "Missing Supabase environment variables"
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`, or use `DATA_SOURCE=static` to bypass Supabase entirely.

### Tests fail with "Failed to load url"
Import paths in test files must be relative to the test file location, not the project root. See existing test files for the correct pattern.

### `award_sparks()` permission denied
Migration 006 revokes direct INSERT on `spark_ledger`. Always use the RPC:
```typescript
await supabase.rpc('award_sparks', { p_child_id, p_delta, p_source_type });
```

### Companion stage not advancing
Stage is derived from `bonding_score` in the DB trigger. Check that `on_companion_bonding_update()` trigger exists on `companions`. Run migration 003 if missing.
