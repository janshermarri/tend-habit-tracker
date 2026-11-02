# STATUS.md — current task

**Goal:** Fix "JWT issued at future" crashing the cold open (Vercel log: GET /, thrown from `getDashboard()`).

## Decisions
- Cause: Supabase's clock is slightly ahead of PostgREST's, so the first request with a fresh JWT is rejected. Transient.
- Retry the whole dashboard read only on that error: up to 2 retries, ~1s before each. Other errors throw at once.
- `lib/hub.ts` reuses `getDashboard()` (covered). `lib/rate-limit.ts` fails open and logs, so unlock is unaffected. No shared helper needed.

## Steps
- [x] Retry loop in `getDashboard()` (`lib/queries.ts`)
- [x] Checked other `lib/` Supabase reads: nothing else to change
- [x] `npm run typecheck` and `npm run build`

## Verified
- typecheck and build pass.
