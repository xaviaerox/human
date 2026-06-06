# Mira — Testing

## Run tests

```bash
# All suites
npx vitest run

# Watch mode
npx vitest

# Single suite
npx vitest run lib/companion/__tests__/phase3.test.ts

# Verbose (show all test names)
npx vitest run --reporter=verbose

# Coverage
npx vitest run --coverage
```

## Current state

```
Test Files  6 passed (6)
     Tests  157 passed (157)
  Duration  ~3s
```

| Suite | File | Tests |
|---|---|---|
| Phase 1: Auth + Family | `lib/auth/__tests__/phase1.test.ts` | 24 |
| Phase 2: Routines | `lib/routines/__tests__/phase2.test.ts` | 16 |
| Phase 3: Companion | `lib/companion/__tests__/phase3.test.ts` | 49 |
| Phase 4: Goals | `lib/goals/__tests__/phase4.test.ts` | 30 |
| Phase 5: Emotional | `lib/emotional/__tests__/phase5.test.ts` | 29 |
| Phase 6: Offline + Integration | `lib/offline/__tests__/phase6.test.ts` | 15 |

---

## Test strategy

### What gets tested

1. **Static adapters** — all CRUD operations, edge cases, idempotency
2. **Pure domain functions** — all engine/model functions with boundary values
3. **Integration scenarios** — cross-module flows (routine → companion bonding)
4. **Prohibited pattern enforcement** — type-level and runtime checks

### What does NOT get tested here

- Supabase adapters (require live DB — use integration test environment)
- React providers (require jsdom — use component test suite, not yet built)
- UI components (Playwright E2E — not yet built)

### Test file location

Tests live adjacent to the module they test:

```
lib/companion/
├── CompanionEngine.ts
├── CompanionProvider.tsx
├── adapters/
└── __tests__/
    └── phase3.test.ts    ← tests CompanionEngine + StaticCompanionAdapter + DialogueBank
```

---

## How to add tests for a new module

1. Create `lib/{module}/__tests__/{phase}.test.ts`
2. Import from relative paths (`../MyModule`, `../adapters/StaticMyAdapter`)
3. Follow the describe → it structure used throughout
4. Cover: happy path, error path, edge cases, idempotency if applicable

### Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { StaticXxxAdapter } from '../adapters/StaticXxxAdapter';

describe('StaticXxxAdapter', () => {
  let adapter: StaticXxxAdapter;

  beforeEach(() => {
    adapter = new StaticXxxAdapter();
  });

  describe('getXxx', () => {
    it('returns data for known id', async () => {
      const result = await adapter.getXxx('known-id');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe('known-id');
      }
    });

    it('returns error for unknown id', async () => {
      const result = await adapter.getXxx('unknown');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBeDefined();
      }
    });
  });
});
```

---

## Test invariants to always verify

For any new adapter:

| Invariant | Test |
|---|---|
| Returns `Result<T>` | `expect(result.ok).toBe(true/false)` |
| Error has `code` and `message` | When `ok: false` |
| Idempotent operations | Call twice, verify same result |
| No negative scores/values | After any mutation |
| Stage never regresses | Companion-specific |
| Sparks never go negative | Spark-related operations |

---

## Vitest config

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'lib/**/*.tsx'],
      exclude: ['**/__tests__/**', '**/adapters.ts'],
    },
  },
});
```

Environment is `node` (not `jsdom`) — no browser APIs available except where mocked via `vi.stubGlobal`.

For tests requiring `localStorage` (OfflineQueue), mock it:
```typescript
beforeEach(() => {
  const storage = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => { storage.set(k, v); },
  });
});

afterEach(() => { vi.unstubAllGlobals(); });
```
