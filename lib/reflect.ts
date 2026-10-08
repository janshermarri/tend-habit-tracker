import 'server-only';
import { db } from './supabase/server';
import { complete } from './ai';
import { lastPeriod } from './reflect-today';
import * as P from './progress';
import type { Activity, Habit, Log, Period, Reflection } from './types';

/**
 * "Looking back": a few calm sentences about a finished week or month, written
 * once by the AI and stored. The model only sees what was done — habits with
 * at least one check-in, their activities, and a handful of notes — so it
 * cannot comment on what was missed. Periods with no check-ins get no note.
 */
const SYSTEM = `You write a short "Looking back" note for one person's habit tracker, about the week or month that just ended.

You get JSON facts: every habit they checked in on, with its count, whether it reached its target, what activities they did, and a few notes they wrote. Everything in the facts happened; nothing else did.

Tone: warm, plain, unhurried. Like a kind friend noticing what you did, not a coach.

Rules:
- Second person ("you"). No greeting, no sign-off, no emoji, no exclamation marks.
- Only mention things that are in the facts, with the numbers exactly as given. Never add, estimate or compare.
- A target is a minimum: say it was reached when it was; if more was done, call it "a little extra". Never mention a target that wasn't reached, and never use "only", "just", "missed", "behind", "streak" or "should".
- Prefer the concrete: name the habits and activities. Quote at most one note, briefly, in the person's own words, if it carries a mood or a moment worth keeping.
- No advice, no suggestions for next time, no praise words like "great job" or "keep it up". Noticing is enough.
- Never mention "facts", "JSON" or "data".

Format: one paragraph of 2 to 4 sentences, under 70 words. Plain text, no markdown.`;

type Facts = {
  period: Period;
  dates: string;
  habits: { name: string; target: string; checkIns: number; reachedTarget: boolean; activities?: Record<string, number> }[];
  notes: { day: string; habit: string; note: string }[];
};

export function reflectionFacts(
  kind: Period,
  range: P.Range,
  { habits, activities, logs }: { habits: Habit[]; activities: Activity[]; logs: Log[] },
): Facts | null {
  const inRange = logs.filter((l) => { const t = new Date(l.logged_at); return t >= range.start && t < range.end; });
  if (!inRange.length) return null;
  const habitName = new Map(habits.map((h) => [h.id, h.name]));
  const activityName = new Map(activities.map((a) => [a.id, a.name]));
  return {
    period: kind,
    dates: P.formatRange(range.start, P.addDays(range.end, -1)),
    habits: habits.flatMap((h) => {
      const mine = inRange.filter((l) => l.habit_id === h.id);
      if (!mine.length) return [];
      const byAct: Record<string, number> = {};
      mine.forEach((l) => { const n = activityName.get(l.activity_id ?? ''); if (n) byAct[n] = (byAct[n] ?? 0) + 1; });
      // A weekly habit in a month note: the count covers the month, so "reached" means every week did.
      const reachedTarget = h.period === kind
        ? mine.length >= h.target
        : P.periodsBetween(h.period, range.start, range.end).every((p) => P.logsFor(mine, h.id, p).length >= h.target);
      return [{
        name: h.name,
        target: `${h.target} per ${h.period}`,
        checkIns: mine.length,
        reachedTarget,
        ...(Object.keys(byAct).length && { activities: byAct }),
      }];
    }),
    notes: inRange
      .filter((l) => l.note?.trim())
      .sort((a, b) => +new Date(a.logged_at) - +new Date(b.logged_at))
      .slice(-8)
      .map((l) => ({
        day: new Date(l.logged_at).toLocaleDateString('en-GB', { weekday: 'long', ...(kind === 'month' && { day: 'numeric', month: 'short' }) }),
        habit: habitName.get(l.habit_id) ?? 'Check-in',
        note: l.note!.trim().slice(0, 160),
      })),
  };
}

/**
 * The note for the last finished period: existing, or written now and stored.
 * Returns null when that period had no check-ins.
 */
export async function ensureReflection(kind: Period, now = new Date()): Promise<Reflection | null> {
  const range = lastPeriod(kind, now);
  const periodStart = P.toDateKey(range.start);
  const supabase = db();

  const { data: existing } = await supabase.from('reflections').select('*').eq('kind', kind).eq('period_start', periodStart).maybeSingle();
  if (existing) return existing as Reflection;

  const since = P.addDays(range.start, -1).toISOString();
  const [habits, activities, logs] = await Promise.all([
    supabase.from('habits').select('*'),
    supabase.from('activities').select('*'),
    supabase.from('logs').select('*').gte('logged_at', since).lt('logged_at', range.end.toISOString()),
  ]);
  for (const r of [habits, activities, logs]) if (r.error) throw new Error(r.error.message);

  const facts = reflectionFacts(kind, range, { habits: habits.data as Habit[], activities: activities.data as Activity[], logs: logs.data as Log[] });
  if (!facts) return null;

  const { text, model } = await complete(SYSTEM, JSON.stringify(facts));
  const { data, error } = await supabase
    .from('reflections')
    .upsert({ kind, period_start: periodStart, text, model }, { onConflict: 'kind,period_start' })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as Reflection;
}
