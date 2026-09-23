'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from './supabase/server';
import { SESSION_COOKIE, SESSION_MAX_AGE, issueSession, isSessionValid, verifyPin } from './session';
import { clear, registerAttempt } from './rate-limit';
import type { HabitDraft, ObjectiveDraft } from './drafts';
import type { UnlockState } from './unlock-state';
import * as P from './progress';

/**
 * Server Actions are reachable by direct POST, not just through the UI, so
 * every mutation re-checks the session rather than trusting proxy.ts.
 */
async function requireSession(): Promise<void> {
  const jar = await cookies();
  if (!isSessionValid(jar.get(SESSION_COOKIE)?.value)) {
    throw new Error('Locked. Reload and enter your PIN.');
  }
}

/**
 * Refresh every view after a write. The whole UI derives from one query on `/`,
 * so revalidating that path is exactly the right granularity. Not using
 * `use cache` / `updateTag`: the dashboard is per-request private data that
 * should never be served stale, and caching it would buy nothing for one user.
 */
function refresh(): void {
  revalidatePath('/');
}

/* ── unlock ────────────────────────────────────────────────────────────── */

export async function unlock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const pin = String(formData.get('pin') ?? '');
  const next = String(formData.get('next') ?? '/');

  // Counts this attempt as it checks, so the limit cannot be bypassed by
  // racing several requests through at once.
  const limit = await registerAttempt('pin');
  if (!limit.allowed) {
    const mins = Math.ceil(limit.retryAfterSec / 60);
    return { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}.` };
  }

  if (!verifyPin(pin)) {
    return { error: 'That PIN does not match.' };
  }

  await clear('pin');
  const jar = await cookies();
  jar.set(SESSION_COOKIE, issueSession(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  });

  // Only ever redirect within the app.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function lock(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect('/unlock');
}

/* ── logs ──────────────────────────────────────────────────────────────── */

/**
 * Resolve a YYYY-MM-DD to a timestamp for storage.
 *
 * Today keeps the real clock time, so "logged at 19:00" stays accurate.
 * A past date gets midday: midnight would sit close enough to the boundary
 * that a timezone shift could move the log into the adjacent day, which would
 * silently put it in the wrong week.
 *
 * Future dates are rejected — a typo should not create a phantom entry that
 * distorts "days left" and period stats.
 */
function resolveLoggedAt(date: string | null | undefined): string {
  const now = new Date();
  if (!date) return now.toISOString();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('That date is not valid.');

  const day = P.parseDay(date);
  if (Number.isNaN(day.getTime())) throw new Error('That date is not valid.');

  const today = P.startOfDay(now);
  if (day.getTime() > today.getTime()) throw new Error('You can only log today or a past date.');
  if (day.getTime() === today.getTime()) return now.toISOString();

  const midday = new Date(day);
  midday.setHours(12, 0, 0, 0);
  return midday.toISOString();
}

export async function addLog(
  habitId: string,
  activityId: string | null,
  note: string | null,
  date?: string | null,
): Promise<string> {
  await requireSession();
  const { data, error } = await db()
    .from('logs')
    .insert({ habit_id: habitId, activity_id: activityId, note, logged_at: resolveLoggedAt(date) })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  refresh();
  return data.id as string;
}

export async function updateLog(
  id: string,
  activityId: string | null,
  note: string | null,
  date?: string | null,
): Promise<void> {
  await requireSession();
  const patch: { activity_id: string | null; note: string | null; logged_at?: string } = {
    activity_id: activityId,
    note,
  };

  // Only rewrite the timestamp when the date actually moved, so editing a note
  // does not reset the original time of day.
  if (date) {
    const { data } = await db().from('logs').select('logged_at').eq('id', id).single();
    const current = data?.logged_at ? P.toDateKey(data.logged_at as string) : null;
    if (current !== date) patch.logged_at = resolveLoggedAt(date);
  }

  const { error } = await db().from('logs').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteLog(id: string): Promise<void> {
  await requireSession();
  const { error } = await db().from('logs').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/* ── habits ────────────────────────────────────────────────────────────── */

export async function saveHabit(id: string | null, draft: HabitDraft): Promise<void> {
  await requireSession();
  const supabase = db();
  const name = draft.name.trim();
  if (!name) throw new Error('A habit needs a name.');

  let habitId = id;
  if (id) {
    const { error } = await supabase
      .from('habits')
      .update({ name, target: draft.target, period: draft.period })
      .eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { count } = await supabase.from('habits').select('id', { count: 'exact', head: true });
    const { data, error } = await supabase
      .from('habits')
      .insert({ name, target: draft.target, period: draft.period, sort_order: count ?? 0 })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    habitId = data.id as string;
  }

  // Replace the activity set. Rows the user kept retain their id so their logs
  // stay attached; removed ones null out log.activity_id via ON DELETE SET NULL.
  const keep = draft.activities.filter((a) => a.name.trim());
  const keepIds = keep.map((a) => a.id).filter((x): x is string => !!x);

  let stale = supabase.from('activities').delete().eq('habit_id', habitId!);
  if (keepIds.length) stale = stale.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: delErr } = await stale;
  if (delErr) throw new Error(delErr.message);

  // Split rather than upsert the lot: PostgREST unions the columns across a
  // batch, so a new row alongside existing ones is sent with an explicit
  // id: null and never reaches the gen_random_uuid() default.
  const existing = keep.filter((a) => a.id);
  const added = keep.filter((a) => !a.id);

  if (existing.length) {
    const { error } = await supabase
      .from('activities')
      .upsert(existing.map((a) => ({ id: a.id!, habit_id: habitId!, name: a.name.trim() })));
    if (error) throw new Error(error.message);
  }
  if (added.length) {
    const { error } = await supabase
      .from('activities')
      .insert(added.map((a) => ({ habit_id: habitId!, name: a.name.trim() })));
    if (error) throw new Error(error.message);
  }

  refresh();
}

export async function deleteHabit(id: string): Promise<void> {
  await requireSession();
  // activities and logs cascade; habit-linked key results null out.
  const { error } = await db().from('habits').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

/* ── objectives ────────────────────────────────────────────────────────── */

export async function saveObjective(id: string | null, draft: ObjectiveDraft): Promise<void> {
  await requireSession();
  const supabase = db();
  const title = draft.title.trim();
  if (!title) throw new Error('A goal needs a title.');

  // Preserve the original start date when editing so the timeframe does not shift.
  let start = P.startOfDay(new Date());
  if (id) {
    const { data } = await supabase.from('objectives').select('start_date').eq('id', id).single();
    if (data?.start_date) start = P.parseDay(data.start_date as string);
  }

  const row = {
    title,
    timeframe_months: draft.timeframe_months,
    start_date: P.toDateKey(start),
    end_date: P.toDateKey(P.addMonths(start, draft.timeframe_months)),
  };

  let objectiveId = id;
  if (id) {
    const { error } = await supabase.from('objectives').update(row).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from('objectives').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    objectiveId = data.id as string;
  }

  const krs = draft.key_results.filter((k) => k.title.trim());
  const keepIds = krs.map((k) => k.id).filter((x): x is string => !!x);
  let stale = supabase.from('key_results').delete().eq('objective_id', objectiveId!);
  if (keepIds.length) stale = stale.not('id', 'in', `(${keepIds.join(',')})`);
  const { error: delErr } = await stale;
  if (delErr) throw new Error(delErr.message);

  // Same split as activities: a batch mixing rows with and without ids sends
  // id: null for the new ones.
  const shape = (k: (typeof krs)[number], i: number) => {
    const base = { objective_id: objectiveId!, title: k.title.trim(), sort_order: i, type: k.type };
    if (k.type === 'milestone') return { ...base, done: k.done ?? false };
    if (k.type === 'number') {
      return { ...base, current_value: k.current_value ?? 0, target_value: k.target_value ?? 0, unit: k.unit || null };
    }
    return { ...base, habit_id: k.habit_id ?? null, target_periods: k.target_periods ?? 1 };
  };

  const updates = krs.map((k, i) => ({ k, i })).filter(({ k }) => k.id);
  const inserts = krs.map((k, i) => ({ k, i })).filter(({ k }) => !k.id);

  if (updates.length) {
    const { error } = await supabase
      .from('key_results')
      .upsert(updates.map(({ k, i }) => ({ ...shape(k, i), id: k.id! })));
    if (error) throw new Error(error.message);
  }
  if (inserts.length) {
    const { error } = await supabase
      .from('key_results')
      .insert(inserts.map(({ k, i }) => shape(k, i)));
    if (error) throw new Error(error.message);
  }

  refresh();
}

export async function deleteObjective(id: string): Promise<void> {
  await requireSession();
  const { error } = await db().from('objectives').delete().eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}

export async function updateKeyResult(
  id: string,
  patch: { done?: boolean; current_value?: number },
): Promise<void> {
  await requireSession();
  const { error } = await db().from('key_results').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  refresh();
}
