import { revalidatePath } from 'next/cache';
import { badRequest, isHubRequest, unauthorized } from '@/lib/hub';
import { insertLog } from '@/lib/writes';

/** { habitId, activityId?, note? } → the new log. */
export async function POST(request: Request) {
  if (!isHubRequest(request)) return unauthorized();
  const body = await request.json().catch(() => null);
  const { habitId, activityId, note } = body ?? {};
  if (typeof habitId !== 'string' || !habitId) return badRequest('habitId is required.');
  if (activityId != null && typeof activityId !== 'string') return badRequest('activityId must be a string.');
  if (note != null && typeof note !== 'string') return badRequest('note must be a string.');

  try {
    const log = await insertLog(habitId, activityId ?? null, note?.trim() || null);
    revalidatePath('/');
    return Response.json(log, { status: 201 });
  } catch (e) {
    return badRequest((e as Error).message);
  }
}
