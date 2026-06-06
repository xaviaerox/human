# Mira — Agent Context Document
## Read this first. Read all of it.

---

## What this project is

**Mira** is a production-grade emotional growth platform for neurodivergent children and families.

It is **not** a gamified productivity app. It is **not** a therapy tool. It is a calm, safe, ethically designed system that helps children build emotional skills (autonomy, empathy, regulation, curiosity, courage, connection) through routines, goals, and an evolving companion character.

Every technical decision in this codebase flows from that purpose.

---

## Non-negotiable principles

These are not preferences. They are architectural constraints. Any agent working on this project must refuse to implement anything that violates them.

### Prohibited patterns (hardcoded off — forever)
| Pattern | Why it's prohibited |
|---|---|
| Streaks / days-in-a-row | Shame spirals when broken; catastrophic for neurodivergent children |
| Social comparison / leaderboards | Competitive mechanics destroy intrinsic motivation |
| Timed pressure / countdowns | Anxiety-inducing; antithetical to calm UX |
| Variable reward / loot boxes | Addictive loop mechanics |
| Companion abandonment messaging ("I miss you!") | Guilt-inducing; dark pattern |
| Companion stage regression | A companion that degrades punishes absence |
| Negative scoring | No child score ever decreases |
| "You missed" / "You failed" language | Zero shame-based messaging anywhere |
| Notification dark patterns | No re-engagement manipulation |

### Required before implementing any feature
1. Does it preserve emotional safety?
2. Is it accessible (WCAG 2.2 AA minimum, reduced-motion parity)?
3. Is it simple (max 3 active concepts per screen)?
4. Is it predictable (no surprise mechanics)?
5. Is it free of addictive loop mechanics?

If any answer is no: do not implement. Flag it. Propose an alternative.

---

## Project decisions (locked)

| Decision | Value |
|---|---|
| Companion name | Chosen by child at onboarding (not preset) |
| Check-in prompts | App-prompted (schedule configurable by parent) |
| Spark pools | Individual per child (no shared family pool) |
| Microtask decomposition | AI-assisted (Claude Sonnet) |
| Goal visibility | Child and parent both see goals; co-creation supported |
| Companion design | Faceless abstract blob — no cultural bias, no uncanny valley |
| Companion regression | Impossible — enforced at DB trigger level AND client level |

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14+ / TypeScript / TSX |
| Backend | Supabase (Auth + PostgreSQL + Realtime + Storage) |
| ORM | Supabase JS client v2 with typed schema |
| State | React Context + custom hooks (no Redux) |
| Testing | Vitest |
| Styling | (TBD — Tailwind recommended, follows Mira design tokens) |

---

## Repository structure

```
mira/
├── docs/                          ← YOU ARE HERE
│   ├── AGENT_CONTEXT.md           ← Read first (this file)
│   ├── ARCHITECTURE.md            ← System design + data flow
│   ├── DATABASE.md                ← Full schema reference
│   ├── MODULES.md                 ← Every module: purpose, API, contracts
│   ├── PATTERNS.md                ← Adapter pattern, Result type, naming rules
│   ├── TESTING.md                 ← Test strategy, how to run, how to add
│   ├── COMPANION.md               ← Companion system deep-dive
│   ├── ROADMAP.md                 ← What's done, what's next, what's forbidden
│   └── ONBOARDING.md              ← How to set up the dev environment
│
├── lib/                           ← All application logic
│   ├── index.ts                   ← SINGLE barrel export (use this only)
│   ├── adapters.ts                ← Adapter factory (static ↔ Supabase switch)
│   ├── supabase.ts                ← Typed Supabase client singleton
│   ├── auth/                      ← Authentication + session
│   ├── family/                    ← Family grouping + member management
│   ├── companion/                 ← Companion lifecycle + dialogue
│   ├── routines/                  ← Routine scheduling + completion
│   ├── goals/                     ← Goals + AI microtask decomposition
│   ├── emotional/                 ← Emotional check-ins + trend analysis
│   ├── offline/                   ← Offline queue + drain logic
│   └── */adapters/                ← Interface + Static + Supabase per module
│
├── types/
│   └── index.ts                   ← ALL domain types (single source of truth)
│
└── supabase/
    └── migrations/                ← Apply in order: 001 → 006
        ├── 001_auth_families.sql
        ├── 002_routines_completions_sparks.sql
        ├── 003_companions.sql
        ├── 004_goals_progression.sql
        ├── 005_emotional.sql
        └── 006_production_hardening.sql
```

---

## Current build state

| Phase | Status | Tests |
|---|---|---|
| Phase 1: Auth + Family | ✅ Complete | 24 passing |
| Phase 2: Routines + Sparks + Value Dimensions | ✅ Complete | 16 passing |
| Phase 3: Companion System | ✅ Complete | 49 passing |
| Phase 4: Goals + AI Microtask Decomposition | ✅ Complete | 30 passing |
| Phase 5: Emotional Tracking | ✅ Complete | 29 passing |
| Phase 6: Production Hardening + Offline Queue | ✅ Complete | 15 passing |

**Total: 157 tests, 6 suites, 0 failures.**

---

## What's missing (next work)

In priority order:

1. **`SupabaseGoalsAdapter`** — only `StaticGoalsAdapter` exists. Implement following exact same pattern as `SupabaseRoutineAdapter`.
2. **`ProgressionProvider`** — context + hook for value dimension scores. Schema exists; adapter and provider not yet built.
3. **`SparkProvider`** — context + hook wrapping spark ledger. Read-only for child; parent can award bonus sparks.
4. **Onboarding flow** — child names companion (UI). Uses `createCompanion()` + `updateProfile({ onboarding_complete: true })`.
5. **Parent dashboard** — weekly emotional summary, spark overview, goal management. Never shows raw check-in data.
6. **Child home screen** — companion ambient presence, today's routines, active goal step.
7. **AI decomposition integration** — wire `buildDecompositionPrompt()` → Claude API → `parseDecompositionResponse()`.
8. **Scheduled check-in prompts** — use `shouldPromptCheckin()` to trigger from app layer.
9. **`refresh_emotional_summary()`** — wire to pg_cron or Supabase Edge Function (nightly).
10. **E2E tests** — Playwright against static adapter.

See `ROADMAP.md` for full detail.

---

## The one rule for agents

> **Before writing any code, read `PATTERNS.md`.  
> Before adding any feature, read `ROADMAP.md`.  
> When in doubt, read `COMPANION.md`.**

If a requested feature conflicts with the prohibited patterns list above, refuse it. Explain why. Propose a compliant alternative.
