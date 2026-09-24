/**
 * Pure progress helpers — no data fetching, no React.
 * Input: arrays shaped like the Supabase tables (see types.ts).
 * Weeks start on Monday. "Days left" includes today.
 */
import type { Activity, Habit, KeyResult, Log, Objective, Period } from './types';

export const DAY_MS = 86400000;

export type DateLike = Date | string | number;
export type Range = { start: Date; end: Date };
/** Exported so UI components can share the union instead of re-deriving it. */
export type CellState = 'hit' | 'miss' | 'current' | 'future';

export function startOfDay(d: DateLike): Date { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function addDays(d: DateLike, n: number): Date { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function addMonths(d: Date, n: number): Date { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }
export function startOfWeek(d: DateLike): Date { const x = startOfDay(d); return addDays(x, -((x.getDay() + 6) % 7)); }
export function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1); }
export function parseDay(s: string): Date { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }
export function toDateKey(d: DateLike): string { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; }

/** Current week or month containing `ref`: { start, end } with end exclusive. */
export function periodRange(period: Period, ref: DateLike = new Date()): Range {
  const r = new Date(ref);
  const start = period === 'month' ? startOfMonth(r) : startOfWeek(r);
  const end = period === 'month' ? new Date(start.getFullYear(), start.getMonth() + 1, 1) : addDays(start, 7);
  return { start, end };
}

/** Every week/month period that overlaps [from, to). */
export function periodsBetween(period: Period, from: Date, to: Date): Range[] {
  const out: Range[] = [];
  let r = periodRange(period, from);
  while (r.start < to) { out.push(r); r = periodRange(period, r.end); }
  return out;
}

export function logsFor(logs: Log[], habitId: string, range: Range): Log[] {
  return logs.filter((l) => {
    if (l.habit_id !== habitId) return false;
    const t = new Date(l.logged_at);
    return t >= range.start && t < range.end;
  });
}

export function daysLeft(range: Range, ref: DateLike = new Date()): number {
  return Math.max(0, Math.round((+range.end - +startOfDay(ref)) / DAY_MS));
}

export type HabitStats = {
  count: number; target: number; left: number; done: boolean;
  pct: number; period: Period; range: Range;
};

/** Count-per-period stats for one habit. */
export function habitStats(habit: Habit, logs: Log[], ref: DateLike = new Date()): HabitStats {
  const range = periodRange(habit.period, ref);
  const count = logsFor(logs, habit.id, range).length;
  return {
    count,
    target: habit.target,
    left: daysLeft(range, ref),
    done: count >= habit.target,
    pct: Math.min(1, count / habit.target),
    period: habit.period,
    range,
  };
}

/** Calm, guilt-free one-liner: "2 of 3 done · 3 days left". */
export function statusLine(st: HabitStats): string {
  const w = st.period;
  if (st.count > st.target) return `${st.count} of ${st.target} — a little extra this ${w}`;
  if (st.done) return `Done for this ${w}`;
  const left = st.left <= 1 ? `last day of the ${w}` : `${st.left} days left`;
  return `${st.count} of ${st.target} done · ${left}`;
}

/** statusLine() without the count, for places where dots already show it: "4 days left". */
export function statusNote(st: HabitStats): string {
  const w = st.period;
  if (st.count > st.target) return `A little extra this ${w}`;
  if (st.done) return `Done for this ${w}`;
  return st.left <= 1 ? `Last day of the ${w}` : `${st.left} days left`;
}

/** Default activity for one-tap logging: the last one used, else the first. */
export function lastActivityId(habitId: string, logs: Log[], activities: Activity[]): string | null {
  const mine = logs
    .filter((l) => l.habit_id === habitId && l.activity_id)
    .sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at));
  if (mine[0]) return mine[0].activity_id;
  const a = activities.find((x) => x.habit_id === habitId);
  return a ? a.id : null;
}

export type ProgressCell = { start: Date; count: number; state: CellState };
export type KeyResultProgress = {
  value: number;
  hits?: number;
  cells?: ProgressCell[];
  habit?: Habit | null;
};

/**
 * Progress of one key result, 0..1.
 * habit-linked: counts periods (weeks/months) inside the objective's timeframe
 * where the habit hit its target, against kr.target_periods.
 */
export function keyResultProgress(
  kr: KeyResult,
  objective: Objective,
  { habits, logs }: { habits: Habit[]; logs: Log[] },
  ref: DateLike = new Date(),
): KeyResultProgress {
  if (kr.type === 'milestone') return { value: kr.done ? 1 : 0 };
  if (kr.type === 'number') return { value: kr.target_value ? Math.min(1, (kr.current_value || 0) / kr.target_value) : 0 };
  const habit = habits.find((h) => h.id === kr.habit_id);
  if (!habit) return { value: 0, hits: 0, cells: [], habit: null };
  const periods = periodsBetween(habit.period, parseDay(objective.start_date), parseDay(objective.end_date));
  const current = periodRange(habit.period, ref).start.getTime();
  const cells: ProgressCell[] = periods.map((p) => {
    const count = logsFor(logs, habit.id, p).length;
    const t = p.start.getTime();
    const hit = count >= habit.target && t <= current;
    const state: CellState = hit ? 'hit' : t > current ? 'future' : t === current ? 'current' : 'miss';
    return { start: p.start, count, state };
  });
  const hits = cells.filter((c) => c.state === 'hit').length;
  return { value: Math.min(1, hits / (kr.target_periods || 1)), hits, cells, habit };
}

/** Objective progress = average of its key results. */
export function objectiveProgress(
  objective: Objective,
  keyResults: KeyResult[],
  ctx: { habits: Habit[]; logs: Log[] },
  ref: DateLike = new Date(),
): number {
  if (!keyResults.length) return 0;
  return keyResults.reduce((sum, kr) => sum + keyResultProgress(kr, objective, ctx, ref).value, 0) / keyResults.length;
}

export function timeLeft(end: DateLike, ref: DateLike = new Date()): string {
  const days = Math.round((+startOfDay(end) - +startOfDay(ref)) / DAY_MS);
  if (days <= 0) return 'Timeframe complete';
  if (days === 1) return '1 day left';
  if (days < 14) return `${days} days left`;
  if (days < 63) return `${Math.round(days / 7)} weeks left`;
  return `${Math.round(days / 30.4)} months left`;
}

export function formatDay(d: DateLike): string { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
export function formatRange(a: Date, b: Date): string {
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  return sameMonth
    ? `${a.getDate()} – ${b.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`
    : `${formatDay(a)} – ${formatDay(b)}`;
}
