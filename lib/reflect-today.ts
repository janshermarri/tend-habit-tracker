/**
 * Client-safe half of the reflections: which finished period a note covers,
 * and which note Today shows. No fetching, so app/tend-app.tsx can import it.
 */
import * as P from './progress';
import type { Period, Reflection } from './types';

/** The finished period before the one containing `now`. */
export function lastPeriod(kind: Period, now = new Date()): P.Range {
  const current = P.periodRange(kind, now);
  return P.periodRange(kind, P.addDays(current.start, -1));
}

/**
 * Which note Today shows, if any: last month's for the first three days of a
 * month, else last week's from Monday to Wednesday. After that it rests.
 */
export function reflectionForToday(reflections: Reflection[], now = new Date()): { title: string; text: string } | null {
  const pick = (kind: Period) => {
    const start = P.toDateKey(lastPeriod(kind, now).start);
    return reflections.find((r) => r.kind === kind && r.period_start === start);
  };
  const weekday = (now.getDay() + 6) % 7; // Monday = 0
  if (now.getDate() <= 3) {
    const r = pick('month');
    if (r) return { title: P.parseDay(r.period_start).toLocaleDateString('en-GB', { month: 'long' }), text: r.text };
  }
  if (weekday <= 2) {
    const r = pick('week');
    if (r) return { title: 'Last week', text: r.text };
  }
  return null;
}
