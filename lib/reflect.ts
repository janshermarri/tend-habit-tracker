import 'server-only';
import { db } from './supabase/server';
import { complete } from './ai';
import { lastPeriod } from './reflect-today';
import * as P from './progress';
import type { Activity, Habit, KeyResult, Log, Objective, Period, Reflection } from './types';

/**
 * "Looking back": a few calm sentences about a finished week or month, written
 * once by the AI and stored. The model only sees what was done — habits with
 * at least one check-in, their activities, a handful of notes, key results
 * that moved — so it cannot comment on what was missed. Nothing done = no note.
 *
 * Three subjects, all keyed by (kind, subject, period_start):
 *   ''               the whole week or month — Today and Progress
 *   'habit:<id>'     one habit's month — the habit page, under Rhythm
 *   'objective:<id>' one goal's month — the goal page
 */
const SYSTEM = `You write a short "Looking back" note for one person's habit tracker, about a week or month that has ended.

You get JSON facts about what they did. Everything in the facts happened; nothing else did.

Tone: warm, plain, unhurried. Like a kind friend noticing what you did, not a coach.

Rules:
- Second person ("you"). No greeting, no sign-off, no emoji, no exclamation marks.
- Only mention things that are in the facts, with the numbers exactly as given. Never add, estimate, compare or give percentages.
- A target is a minimum: say it was reached when it was; if more was done, call it "a little extra". Never mention a target that wasn't reached, what is left, or what comes next, and never use "only", "just", "missed", "behind", "streak" or "should".
- Prefer the concrete: name habits, activities and key results. Quote at most one note, briefly, in the person's own words, if it carries a mood or a moment worth keeping.
- No advice, no suggestions, no praise words like "great job" or "keep it up". Noticing is enough.
- Never mention "facts", "JSON" or "data".
- Plain text, no markdown.`;

const FORMAT = {
  all: 'Format: one paragraph of 2 to 4 sentences, under 70 words.',
  habit: 'This note is about one habit only, for the month given. Format: one or two sentences, under 40 words.',
  objective: 'This note is about one objective, for the month given: what moved and where its key results stand. Format: one or two sentences, under 45 words.',
};

type Data = { habits: Habit[]; activities: Activity[]; logs: Log[]; objectives: Objective[]; keyResults: KeyResult[] };
type Target = { kind: Period; subject: string; range: P.Range };

const inRange = (logs: Log[], range: P.Range) =>
  logs.filter((l) => { const t = new Date(l.logged_at); return t >= range.start && t < range.end; });

const dayLabel = (l: Log, kind: Period) =>
  new Date(l.logged_at).toLocaleDateString('en-GB', { weekday: 'long', ...(kind === 'month' && { day: 'numeric', month: 'short' }) });

const noteList = (logs: Log[], habitName: Map<string, string>, kind: Period, max: number) =>
  logs
    .filter((l) => l.note?.trim())
    .sort((a, b) => +new Date(a.logged_at) - +new Date(b.logged_at))
    .slice(-max)
    .map((l) => ({ day: dayLabel(l, kind), habit: habitName.get(l.habit_id) ?? 'Check-in', note: l.note!.trim().slice(0, 160) }));

const activityMix = (logs: Log[], activityName: Map<string, string>) => {
  const out: Record<string, number> = {};
  logs.forEach((l) => { const n = activityName.get(l.activity_id ?? ''); if (n) out[n] = (out[n] ?? 0) + 1; });
  return Object.keys(out).length ? out : undefined;
};

/** Weeks (or months) inside `range` where the habit reached its target. */
const periodsHit = (h: Habit, logs: Log[], range: P.Range, now: Date) =>
  P.periodsBetween(h.period, range.start, range.end)
    .filter((p) => p.end <= now && P.logsFor(logs, h.id, p).length >= h.target).length;

/** The facts one note is written from, or null when nothing was done. */
export function reflectionFacts(t: Target, d: Data, now = new Date()): object | null {
  const { kind, range } = t;
  const dates = kind === 'month'
    ? range.start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : P.formatRange(range.start, P.addDays(range.end, -1));
  const habitName = new Map(d.habits.map((h) => [h.id, h.name]));
  const activityName = new Map(d.activities.map((a) => [a.id, a.name]));
  const logs = inRange(d.logs, range);

  if (t.subject.startsWith('habit:')) {
    const h = d.habits.find((x) => x.id === t.subject.slice(6));
    const mine = logs.filter((l) => h && l.habit_id === h.id);
    if (!h || !mine.length) return null;
    return {
      habit: h.name, target: `${h.target} per ${h.period}`, month: dates, checkIns: mine.length,
      ...(h.period === 'week' ? { weeksThatReachedTarget: periodsHit(h, mine, range, now) } : { reachedTarget: mine.length >= h.target }),
      ...(activityMix(mine, activityName) && { activities: activityMix(mine, activityName) }),
      notes: noteList(mine, habitName, 'month', 5),
    };
  }

  if (t.subject.startsWith('objective:')) {
    const o = d.objectives.find((x) => x.id === t.subject.slice(10));
    if (!o) return null;
    const krs = d.keyResults.filter((k) => k.objective_id === o.id);
    const milestonesDone = krs.flatMap((k) => (k.type === 'milestone' && k.done ? [k.title] : []));
    const numbers = krs.flatMap((k) => (k.type === 'number' && k.current_value > 0 ? [{ title: k.title, at: k.current_value, of: k.target_value, ...(k.unit && { unit: k.unit }) }] : []));
    const habits = krs.flatMap((k) => {
      if (k.type !== 'habit') return [];
      const h = d.habits.find((x) => x.id === k.habit_id);
      const hits = h ? periodsHit(h, logs, range, now) : 0;
      return h && hits ? [{ habit: h.name, [`${h.period}sThatReachedTarget`]: hits }] : [];
    });
    if (!milestonesDone.length && !numbers.length && !habits.length) return null;
    return { objective: o.title, area: o.area, month: dates, milestonesDone, numbersSoFar: numbers, habits };
  }

  if (!logs.length) return null;
  return {
    period: kind,
    dates,
    habits: d.habits.flatMap((h) => {
      const mine = logs.filter((l) => l.habit_id === h.id);
      if (!mine.length) return [];
      const reachedTarget = h.period === kind
        ? mine.length >= h.target
        : periodsHit(h, mine, range, now) === P.periodsBetween(h.period, range.start, range.end).length;
      return [{ name: h.name, target: `${h.target} per ${h.period}`, checkIns: mine.length, reachedTarget, ...(activityMix(mine, activityName) && { activities: activityMix(mine, activityName) }) }];
    }),
    notes: noteList(logs, habitName, kind, 8),
  };
}

/** Finished periods of `kind` from `from` up to now, newest first, at most `max`. */
function finishedPeriods(kind: Period, from: Date, now: Date, max: number): P.Range[] {
  const current = P.periodRange(kind, now);
  return P.periodsBetween(kind, from, current.start).filter((r) => r.end <= current.start).reverse().slice(0, max);
}

/** Every note that should exist right now. */
function targets(d: Data, now: Date): Target[] {
  const out: Target[] = [];
  if (!d.logs.length) return out;
  const first = new Date(Math.min(...d.logs.map((l) => +new Date(l.logged_at))));
  finishedPeriods('week', first, now, 16).forEach((range) => out.push({ kind: 'week', subject: '', range }));
  finishedPeriods('month', first, now, 12).forEach((range) => out.push({ kind: 'month', subject: '', range }));
  for (const h of d.habits) {
    const mine = d.logs.filter((l) => l.habit_id === h.id);
    if (!mine.length) continue;
    const hFirst = new Date(Math.min(...mine.map((l) => +new Date(l.logged_at))));
    finishedPeriods('month', hFirst, now, 6).forEach((range) => out.push({ kind: 'month', subject: `habit:${h.id}`, range }));
  }
  for (const o of d.objectives) {
    finishedPeriods('month', P.parseDay(o.start_date), now, 6)
      .filter((r) => r.start < P.parseDay(o.end_date))
      .forEach((range) => out.push({ kind: 'month', subject: `objective:${o.id}`, range }));
  }
  return out;
}

const SYSTEM_FOR = (subject: string) =>
  `${SYSTEM}\n\n${subject.startsWith('habit:') ? FORMAT.habit : subject.startsWith('objective:') ? FORMAT.objective : FORMAT.all}`;

/**
 * Writes every missing note, newest first, up to `limit` AI calls per run so
 * one cron invocation stays short. Periods with nothing done are skipped.
 */
export async function ensureReflections(now = new Date(), limit = 25): Promise<{ written: number; pending: number }> {
  const supabase = db();
  const [habits, activities, logs, objectives, keyResults, existing] = await Promise.all([
    supabase.from('habits').select('*'),
    supabase.from('activities').select('*'),
    supabase.from('logs').select('*').order('logged_at', { ascending: false }).limit(2000),
    supabase.from('objectives').select('*'),
    supabase.from('key_results').select('*'),
    supabase.from('reflections').select('kind, subject, period_start'),
  ]);
  for (const r of [habits, activities, logs, objectives, keyResults, existing]) if (r.error) throw new Error(r.error.message);
  const d: Data = { habits: habits.data as Habit[], activities: activities.data as Activity[], logs: logs.data as Log[], objectives: objectives.data as Objective[], keyResults: keyResults.data as KeyResult[] };
  const have = new Set((existing.data as Pick<Reflection, 'kind' | 'subject' | 'period_start'>[]).map((r) => `${r.kind}|${r.subject}|${r.period_start}`));

  const missing = targets(d, now).filter((t) => !have.has(`${t.kind}|${t.subject}|${P.toDateKey(t.range.start)}`));
  let written = 0;
  let calls = 0;
  for (const t of missing) {
    if (calls >= limit) break;
    const facts = reflectionFacts(t, d, now);
    if (!facts) continue;
    calls++;
    const { text, model } = await complete(SYSTEM_FOR(t.subject), JSON.stringify(facts));
    const { error } = await supabase
      .from('reflections')
      .upsert({ kind: t.kind, subject: t.subject, period_start: P.toDateKey(t.range.start), text, model }, { onConflict: 'kind,subject,period_start' });
    if (error) throw new Error(error.message);
    written++;
  }
  return { written, pending: Math.max(0, missing.length - calls) };
}

export { lastPeriod };
