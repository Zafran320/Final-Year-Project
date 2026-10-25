# Layer: Business Logic (Client Hooks)

This folder is the **business logic layer** — custom React hooks that encapsulate stateful logic, side-effects, and domain behaviour.

## Hooks

| File | Description |
|------|-------------|
| `useComposition.ts` | IME composition tracking (prevents premature form submission on CJK input) |
| `useGlobalPointerTracker.ts` | Global mouse/touch position tracker for UI effects |
| `useMobile.tsx` | Responsive breakpoint detection hook |
| `usePersistFn.ts` | Stable function reference that always calls the latest version |

Core auth hook lives in `../infrastructure/hooks/useAuth.ts`.

## Architecture Rules

- Hooks may call tRPC procedures via `../services/trpc.ts`.
- Hooks may read from `../services/supabase.ts` for auth state.
- Hooks must **not** render JSX.
- Pages and components consume hooks — not the other way around.
