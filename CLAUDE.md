# MIRA — Developer & AI Agent Guidelines

MIRA is a neurodiversity-affirming growth platform for children and families.

## Build & Verification Commands
- **Dev Server**: `npm run dev`
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`)
- **Lint**: `npm run lint` (`eslint`) — *Must remain 0 errors, 0 warnings*
- **Test Suite**: `npm run test -- --run` (`vitest run --run`)
- **Build**: `npm run build`

## Code & Architecture Principles
1. **Neurodivergent First**: Avoid punitive mechanics (streaks loss, comparison, shaming). Use non-punitive language and celebration overlays.
2. **PII Protection**: Always pass external LLM prompts through `PiiSanitizer` (`src/lib/security/PiiSanitizer.ts`).
3. **Adapter Architecture**: Use adapter interfaces in `src/lib/adapters/` to support both `static` and `supabase` data sources seamlessly.
4. **State Separation**: Keep presentation components clean; encapsulate complex page state inside custom hooks (e.g. `useHomeState.ts`).
5. **Zero Lint Tolerations**: All code edits must maintain 0 ESLint errors and 0 warnings.
