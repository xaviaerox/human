# Mira — Patterns & Conventions

## The Adapter Pattern

Every data module follows this structure exactly. Deviation requires explicit justification.

```
lib/{module}/
├── adapters/
│   ├── I{Module}Adapter.ts      ← interface (the contract)
│   ├── Static{Module}Adapter.ts ← in-memory (tests + demo)
│   └── Supabase{Module}Adapter.ts ← production
├── {Module}Provider.tsx          ← React context + hook
└── (optional domain logic).ts    ← pure functions, no side effects
```

### Interface first

Always define the interface before either implementation. The interface is the contract between the module and its consumers.

```typescript
// IXxxAdapter.ts
export interface IXxxAdapter {
  getXxx(id: string): Promise<Result<Xxx>>;
  createXxx(params: CreateXxxParams): Promise<Result<Xxx>>;
  // ...
}
```

### Static adapter (in-memory)

- Uses in-memory arrays/maps — no external dependencies
- Seeded with realistic demo data
- Deterministic behavior — same inputs produce same outputs
- Must pass all tests without network or DB

```typescript
export class StaticXxxAdapter implements IXxxAdapter {
  private _items: Xxx[] = [...SEED_DATA];
  private _idCounter = 0;
  private _nextId() { return `static-${++this._idCounter}`; }
  // ...
}
```

### Supabase adapter (production)

- Receives `SupabaseClient<Database>` via constructor injection
- Uses typed client — no raw SQL strings
- Follows Supabase JS v2 patterns: `.from().select().eq().single()`
- Always maps errors to `Result<T>` — never throws

```typescript
export class SupabaseXxxAdapter implements IXxxAdapter {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async getXxx(id: string): Promise<Result<Xxx>> {
    const { data, error } = await this.client
      .from('xxx_table')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return { ok: false, error: { code: 'not_found', message: error?.message ?? 'Not found' } };
    }
    return { ok: true, data };
  }
}
```

### Factory registration

After creating a new adapter pair, register it in `lib/adapters.ts`:

```typescript
import { StaticXxxAdapter }   from './xxx/adapters/StaticXxxAdapter';
import { SupabaseXxxAdapter } from './xxx/adapters/SupabaseXxxAdapter';
import type { IXxxAdapter }   from './xxx/adapters/IXxxAdapter';

let _xxx: IXxxAdapter | null = null;

export function getXxxAdapter(): IXxxAdapter {
  if (!_xxx) {
    _xxx = isSupabase ? new SupabaseXxxAdapter(supabase) : new StaticXxxAdapter();
  }
  return _xxx;
}
```

Then export from `lib/index.ts`.

---

## The Result Type

All adapter methods return `Result<T>`. No exceptions, no thrown errors at the adapter boundary.

```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: MiraError };

interface MiraError {
  code: string;    // snake_case error code
  message: string; // human-readable
  details?: unknown;
}
```

### Narrowing

```typescript
const result = await adapter.getCompanion(childId);

if (!result.ok) {
  // Handle error — result.error is MiraError
  console.error(result.error.code, result.error.message);
  return;
}

// result.data is guaranteed to be the type — no null check needed
const companion = result.data;
```

### Error codes

Use descriptive snake_case codes. Examples:
- `not_found`
- `fetch_failed`
- `create_failed`
- `not_authenticated`
- `invite_expired`
- `insufficient_sparks`

---

## Provider pattern

Every Provider follows this structure:

```tsx
// 1. Context interface
interface XxxContextValue {
  // State
  data: Xxx | null;
  loading: boolean;
  // Actions
  doSomething(): Promise<void>;
}

// 2. Context (null default — hook enforces usage within provider)
const XxxContext = createContext<XxxContextValue | null>(null);

// 3. Provider component
interface XxxProviderProps {
  adapter: IXxxAdapter;
  children: ReactNode;
}

export function XxxProvider({ adapter, children }: XxxProviderProps) {
  const { profile } = useAuth(); // Access parent providers via hooks
  const [data, setData] = useState<Xxx | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data on mount / dependency change
  useEffect(() => { /* ... */ }, [adapter, profile?.id]);

  // Memoize value to prevent unnecessary re-renders
  const value = useMemo<XxxContextValue>(() => ({
    data,
    loading,
    doSomething: async () => { /* ... */ },
  }), [data, loading]);

  return (
    <XxxContext.Provider value={value}>
      {children}
    </XxxContext.Provider>
  );
}

// 4. Hook
export function useXxx(): XxxContextValue {
  const ctx = useContext(XxxContext);
  if (!ctx) throw new Error('[Mira] useXxx must be used within <XxxProvider>');
  return ctx;
}
```

---

## Pure functions

Domain logic that doesn't require state or side effects goes in a standalone `.ts` file (not `.tsx`), named after its domain: `CompanionEngine.ts`, `EmotionModel.ts`, `MicrotaskEngine.ts`.

Rules:
- No imports from React
- No imports from Supabase
- No side effects
- All inputs explicit (no global state reads)
- Fully testable in isolation

---

## Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Interfaces | `I` prefix | `ICompanionAdapter` |
| Static adapters | `Static` prefix | `StaticCompanionAdapter` |
| Supabase adapters | `Supabase` prefix | `SupabaseCompanionAdapter` |
| Providers | `{Domain}Provider` | `CompanionProvider` |
| Hooks | `use{Domain}` | `useCompanion` |
| Engine/model files | `{Domain}Engine` or `{Domain}Model` | `CompanionEngine`, `EmotionModel` |
| Error codes | `snake_case` | `not_found`, `fetch_failed` |
| DB columns | `snake_case` | `child_id`, `bonding_score` |
| TS types/interfaces | `PascalCase` | `CompanionStage`, `RoutineWithSteps` |
| Env vars | `NEXT_PUBLIC_` prefix for client-accessible | `NEXT_PUBLIC_DATA_SOURCE` |

---

## TypeScript strictness

The project uses strict TypeScript. Key active flags:
- `strict: true`
- `noUncheckedIndexedAccess: true` — always check array access: `arr[0]?.thing` not `arr[0].thing`
- `exactOptionalPropertyTypes: true` — don't pass `undefined` where property is absent
- `noImplicitReturns: true` — all code paths must return

When adding to `tsconfig.json`, do not relax these settings.

---

## RLS policy pattern

Every new table needs RLS enabled and policies defined. Standard pattern:

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

-- Read: family members only
CREATE POLICY "my_table: family read" ON my_table
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Write: parent only
CREATE POLICY "my_table: parent write" ON my_table
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Or: child writes own
CREATE POLICY "my_table: child insert own" ON my_table
  FOR INSERT WITH CHECK (child_id = auth.uid());
```

---

## Offline-resilient operations

Any action the child can take on the app must work offline. Pattern:

```typescript
async function handleRoutineComplete(routineId: string) {
  const params = { routine_id: routineId, child_id: profile.id };

  if (!offlineQueue.isOnline) {
    // Queue for later
    offlineQueue.enqueue({ type: 'routine_complete', ...params, completed_date: today() });
    // Optimistic UI update
    markRoutineCompleteOptimistically(routineId);
    return;
  }

  // Online path — direct to adapter
  const result = await routineAdapter.completeRoutine(params);
  if (result.ok) markRoutineCompleteOptimistically(routineId);
}
```

The drain handler must be idempotent — calling it twice for the same record should not create duplicate entries.

---

## What NOT to do

```typescript
// ❌ Never import adapter directly in a component
import { SupabaseCompanionAdapter } from '@/lib/companion/adapters/SupabaseCompanionAdapter';

// ✅ Use the provider hook
const { companion } = useCompanion();

// ❌ Never write to spark_ledger directly
await supabase.from('spark_ledger').insert({ ... });

// ✅ Use the server-side function
await supabase.rpc('award_sparks', { p_child_id, p_delta, p_source_type });

// ❌ Never expose bonding_score to child UI
return <div>Bonding: {companion.bonding_score}</div>;

// ✅ Use the display state
const { display } = useCompanion();
return <CompanionWidget stage={display.stage} progress={display.stageProgress} />;

// ❌ Never implement streaks
const streak = completions.filter(isConsecutive).length;

// ✅ No streaks. Ever.
```
