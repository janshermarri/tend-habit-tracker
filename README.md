# Tend — habit & goal tracker (Next.js + Tailwind v4)

Drop-in `app/`, `components/`, `lib/`, `public/` for a Next.js 14+ App Router project with Tailwind CSS v4.
`Habit Tracker.dc.html` (project root) is the interactive visual reference — same tokens, same copy.

## Setup
1. `npm install`
2. Create the schema: paste [`supabase/schema.sql`](supabase/schema.sql) into the
   Supabase SQL Editor and run it.
3. `cp .env.example .env`, then fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (Project Settings → Data API / API Keys)
   - `APP_SECRET` — `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
   - `APP_PIN_HASH` — `npm run pin -- 123456`
4. `npm run dev`

Add PNG icons to `public/` (see the manifest) for a complete PWA install.

## Access
No accounts: the app is single-tenant. `proxy.ts` gates every route on a signed,
HTTP-only session cookie lasting 14 days; `/unlock` takes the 6-digit PIN, which is
verified server-side against a scrypt hash and rate-limited to 5 attempts per 15
minutes. A 6-digit PIN is small enough to brute-force, so put **Vercel Deployment
Protection** in front of any deployment — the PIN is the inner lock, not the only one.

The browser never talks to Supabase. All reads and writes go through Server
Components and Server Actions using the secret key, which stays on the server
(`lib/supabase/server.ts` imports `server-only` so a client import fails the build).

## Structure
- `app/globals.css` — **all design tokens** as CSS variables (light + `[data-theme="dark"]`), mapped to Tailwind utilities via `@theme` (`bg-surface`, `text-ink-2`, `rounded-lg`, `shadow-md`, `ease-calm`, `wide:` breakpoint = 880px).
- `lib/types.ts` — row types mirroring Supabase tables: `habits`, `activities`, `logs`, `objectives`, `key_results` (`type: milestone | number | habit`).
- `lib/queries.ts` — `getDashboard()`: every row in one round trip, server-only.
- `lib/actions.ts` — Server Actions for every mutation; each re-checks the session and calls `revalidatePath('/')`.
- `lib/session.ts` · `lib/rate-limit.ts` — PIN verification and the signed session cookie.
- `lib/drafts.ts` — form draft shapes, shared by the client forms and the actions.
- `lib/progress.ts` — pure functions: habit period stats, status line, key result / objective progress (objective = average of KRs), time left.
- `components/` — presentational only, no fetching:
  `ProgressRing`, `ProgressBar`, `HabitCard`, `LogSheet`, `Sheet` (bottom sheet → dialog on desktop), `ObjectiveCard`,
  `KeyResultRow` (`MilestoneRow` / `NumberRow` / `HabitLinkedRow`), `BottomNav` + `SideNav`, `EmptyState`,
  `HabitForm`, `ObjectiveForm`, `WeekHabitRow`, `CheckInList`, `Toast`, `Controls` (Segmented, Stepper…),
  `screens.tsx` (`TodayScreen`, `WeekScreen`, `GoalsScreen`, `GoalDetailScreen`).
- `app/page.tsx` — server shell: fetches the dashboard and renders `app/tend-app.tsx`.
- `app/tend-app.tsx` — the client state container. Log writes echo through `useOptimistic` so the UI moves on tap.
- `app/unlock/` — the PIN screen.

## Behaviour notes
- One-tap `+` logs with the habit's last-used activity and shows a toast (Add note · Undo). Tapping the card opens the LogSheet.
- Weeks start Monday. Habit-linked KR = periods (weeks/months) within the objective's timeframe where the habit hit its target ÷ `target_periods`.
- Tone: no red, no streaks, no guilt copy. Over-target reads "a little extra this week".
- Dark mode: set `data-theme="dark"` on `<html>`. Motion respects `prefers-reduced-motion`.

## AI (optional)
Two small touches, both through the same provider chain as the expense tracker
(Azure AI Foundry `gpt-oss-120b`, then Groq and Gemini free tiers; plain fetch,
no SDK — `lib/ai.ts`). No key set = both stay hidden.
- **Looking back** — a few calm sentences about the week (shown Mon–Wed) or month
  (1st–3rd) that just ended, on Today. Written once by `/api/cron/reflect` (Vercel
  Cron, daily 02:00 PKT) from what was done only, stored in `reflections`
  (`supabase/migrate-003.sql`). Open the route in the app while unlocked to run it by hand.
- **Suggest a few** in the objective form drafts 2–3 key results from the title;
  nothing saves until you do.

## Schema
See [`supabase/schema.sql`](supabase/schema.sql) — the source of truth.
