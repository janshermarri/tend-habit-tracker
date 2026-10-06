import 'server-only';
import { getDashboard } from './queries';
import { safeEqual } from './session';
import * as P from './progress';

/**
 * /api/hub: the personal hub reads and writes Tend with a bearer token instead
 * of the PIN cookie. Progress is computed here, so the hub never re-implements
 * lib/progress.ts.
 */

/** True if the request carries `Authorization: Bearer <HUB_API_TOKEN>`. */
export function isHubRequest(request: Request): boolean {
  const token = process.env.HUB_API_TOKEN;
  if (!token || token.length < 32) return false;
  const header = request.headers.get('authorization') ?? '';
  return safeEqual(header, `Bearer ${token}`);
}

export const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 });
export const badRequest = (error: string) => Response.json({ error }, { status: 400 });

export async function hubDashboard(now = new Date()) {
  const { habits, logs, objectives, keyResults } = await getDashboard();
  const ctx = { habits, logs };
  return {
    habits: habits.map((h) => ({ ...h, stats: P.habitStats(h, logs, now) })),
    objectives: objectives.map((o) => {
      const krs = keyResults.filter((k) => k.objective_id === o.id);
      return {
        ...o,
        progress: P.objectiveProgress(o, krs, ctx, now),
        timeLeft: P.timeLeft(P.parseDay(o.end_date), now),
        keyResults: krs.map((k) => ({ ...k, progress: P.keyResultProgress(k, o, ctx, now).value })),
      };
    }),
  };
}
