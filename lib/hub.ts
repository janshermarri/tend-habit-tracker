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
  const { habits, activities, logs, objectives, keyResults } = await getDashboard();
  const ctx = { habits, logs };
  // Last 7 days of completions, so a "what did I do today / this week" question needs no second call.
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const habitName = new Map(habits.map((h) => [h.id, h.name]));
  const activityName = new Map(activities.map((a) => [a.id, a.name]));
  return {
    habits: habits.map((h) => ({ ...h, stats: P.habitStats(h, logs, now) })),
    activities: activities.map(({ id, habit_id, name }) => ({ id, habit_id, name })),
    recentLogs: logs
      .filter((l) => l.logged_at >= since)
      .map((l) => ({
        habit: habitName.get(l.habit_id) ?? l.habit_id,
        activity: (l.activity_id && activityName.get(l.activity_id)) || null,
        at: l.logged_at,
        note: l.note ?? null,
      })),
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
