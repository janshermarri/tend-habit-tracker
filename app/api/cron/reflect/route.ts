import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { isHubRequest, unauthorized } from '@/lib/hub';
import { SESSION_COOKIE, isSessionValid, safeEqual } from '@/lib/session';
import { ensureReflections } from '@/lib/reflect';

/**
 * Writes every missing "Looking back" note — the whole week or month, each
 * habit's month, each goal's month — newest first. Vercel Cron calls it daily
 * (see vercel.json); notes that exist are left alone, so a normal day writes
 * one or two. Also reachable with the hub token or a PIN session, for a manual run.
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
  try {
    const result = await ensureReflections(new Date());
    revalidatePath('/');
    return Response.json(result);
  } catch (e) {
    revalidatePath('/');
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
