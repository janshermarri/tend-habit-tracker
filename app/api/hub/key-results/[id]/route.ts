import { revalidatePath } from 'next/cache';
import { badRequest, hubDashboard, isHubRequest, unauthorized } from '@/lib/hub';
import { patchKeyResult } from '@/lib/writes';

/** { currentValue?, done? } → the key result with its progress. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isHubRequest(request)) return unauthorized();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { currentValue, done } = body ?? {};
  if (currentValue !== undefined && !Number.isFinite(currentValue)) return badRequest('currentValue must be a number.');
  if (done !== undefined && typeof done !== 'boolean') return badRequest('done must be true or false.');
  if (currentValue === undefined && done === undefined) return badRequest('Send currentValue or done.');

  try {
    await patchKeyResult(id, { current_value: currentValue, done });
  } catch (e) {
    return badRequest((e as Error).message);
  }
  revalidatePath('/');
  // Habit-linked progress needs logs, so read it back through the same view as GET.
  const kr = (await hubDashboard()).objectives.flatMap((o) => o.keyResults).find((k) => k.id === id);
  return Response.json(kr);
}
