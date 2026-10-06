import 'server-only';
import { db } from './supabase/server';
import type { KeyResult, Log } from './types';
import * as P from './progress';

/**
 * Writes shared by the Server Actions (cookie session) and /api/hub (bearer
 * token). Callers check access and call revalidatePath('/'); these only
 * validate and persist.
 */

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
export function resolveLoggedAt(date: string | null | undefined): string {
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

export async function insertLog(
  habitId: string,
  activityId: string | null,
  note: string | null,
  date?: string | null,
): Promise<Log> {
  const { data, error } = await db()
    .from('logs')
    .insert({ habit_id: habitId, activity_id: activityId, note, logged_at: resolveLoggedAt(date) })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Log;
}

export async function patchKeyResult(
  id: string,
  patch: { done?: boolean; current_value?: number },
): Promise<KeyResult> {
  const { data, error } = await db().from('key_results').update(patch).eq('id', id).select('*').single();
  if (error) throw new Error(error.message);
  return data as KeyResult;
}
