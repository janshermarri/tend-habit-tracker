import { revalidatePath } from 'next/cache';
import { badRequest, isHubRequest, unauthorized } from '@/lib/hub';
import { insertLog } from '@/lib/writes';
import { db } from '@/lib/supabase/server';

/**
 * { habitId, activityId?, note?, date? } → the new log. A second log of the same habit
 * within 10 minutes answers 409 with the existing one: the Telegram assistant may retry.
 */
export async function POST(request: Request) {
  if (!isHubRequest(request)) return unauthorized();
  const body = await request.json().catch(() => null);
  const { habitId, activityId, note, date } = body ?? {};
  if (typeof habitId !== 'string' || !habitId) return badRequest('habitId is required.');
  if (activityId != null && typeof activityId !== 'string') return badRequest('activityId must be a string.');
  if (note != null && typeof note !== 'string') return badRequest('note must be a string.');
  if (date != null && typeof date !== 'string') return badRequest('date must be a string.');

  if (date == null) {
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: dup } = await db()
      .from('logs')
      .select('*')
      .eq('habit_id', habitId)
      .gte('logged_at', since)
      .limit(1);
    if (dup?.length) return Response.json({ error: 'Already logged in the last 10 minutes.', log: dup[0] }, { status: 409 });
  }

  try {
    const log = await insertLog(habitId, activityId ?? null, note?.trim() || null, date ?? null);
    revalidatePath('/');
    return Response.json(log, { status: 201 });
  } catch (e) {
    return badRequest((e as Error).message);
  }
}
