import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { isHubRequest, unauthorized } from '@/lib/hub';
import { SESSION_COOKIE, isSessionValid, safeEqual } from '@/lib/session';
import { ensureReflection } from '@/lib/reflect';

/**
 * Writes the "Looking back" note for last week, and for last month during the
 * first days of a month. Vercel Cron calls it daily (see vercel.json); it is
 * idempotent, so a day whose note already exists is a no-op. Also reachable
 * with the hub token or a PIN session, for a manual run.
 */
async function allowed(request: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  if (secret && safeEqual(header, `Bearer ${secret}`)) return true;
  if (isHubRequest(request)) return true;
  const jar = await cookies();
  return isSessionValid(jar.get(SESSION_COOKIE)?.value);
}

export async function GET(request: Request) {
  if (!(await allowed(request))) return unauthorized();
  const now = new Date();
  const results: Record<string, string | null> = {};
  try {
    results.week = (await ensureReflection('week', now))?.text ?? null;
    if (now.getDate() <= 3) results.month = (await ensureReflection('month', now))?.text ?? null;
  } catch (e) {
    return Response.json({ error: (e as Error).message, ...results }, { status: 502 });
  }
  revalidatePath('/');
  return Response.json(results);
}
