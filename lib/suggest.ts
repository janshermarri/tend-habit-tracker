import 'server-only';
import { complete, parseJsonObject } from './ai';
import { emptyKeyResult, type KeyResultDraft } from './drafts';
import type { Area, Habit, Timeframe } from './types';

/**
 * Drafts 2–3 key results for an objective. The person edits them in the form;
 * nothing is saved here. Habit-linked suggestions may only point at habits
 * that exist, and their target is clamped to the timeframe.
 */
const SYSTEM = `You help one person turn a personal objective into 2 or 3 key results they can track. Reply with a JSON object only.

Shape:
{"key_results":[
  {"type":"milestone","title":"..."},
  {"type":"number","title":"...","target_value":<integer>,"unit":"..."},
  {"type":"habit","habit_id":"<id from the habits list>","target_periods":<integer>}
]}

Rules:
- 2 or 3 items, each a different thing. Titles are short (under 60 characters), concrete and calm — something you can tell has happened, not a vague wish.
- "milestone": a one-off that is either done or not.
- "number": something counted up to a realistic target for the timeframe; "unit" is a plain noun ("sessions", "chapters", "Rs").
- "habit": use at most one, and only if a listed habit clearly serves the objective; "target_periods" is how many weeks (or months, for a monthly habit) the habit should reach its target — at most the "periods" given for it.
- No advice, no explanations, no markdown — the JSON object only.`;

const TYPES = ['milestone', 'number', 'habit'] as const;

export async function suggestKeyResults(
  objective: { title: string; area: Area; timeframe_months: Timeframe },
  habits: (Pick<Habit, 'id' | 'name' | 'period'> & { periods: number })[],
): Promise<KeyResultDraft[]> {
  const user = JSON.stringify({
    objective: objective.title,
    area: objective.area,
    timeframe: `${objective.timeframe_months} month${objective.timeframe_months === 1 ? '' : 's'}`,
    habits: habits.map((h) => ({ id: h.id, name: h.name, period: h.period, periods: h.periods })),
  });
  const { text } = await complete(SYSTEM, user, { json: true });

  const parsed = parseJsonObject(text) ?? {};
  const items = Array.isArray(parsed.key_results) ? parsed.key_results : [];

  const out: KeyResultDraft[] = [];
  for (const raw of items.slice(0, 3)) {
    const k = raw as Record<string, unknown>;
    const type = TYPES.find((t) => t === k.type);
    if (!type) continue;
    const title = typeof k.title === 'string' ? k.title.trim().slice(0, 80) : '';
    if (type === 'milestone' && title) out.push({ ...emptyKeyResult('milestone'), title });
    if (type === 'number' && title) {
      const target = Math.max(1, Math.round(Number(k.target_value)) || 1);
      out.push({ ...emptyKeyResult('number'), title, target_value: target, unit: typeof k.unit === 'string' ? k.unit.trim().slice(0, 30) : '' });
    }
    if (type === 'habit') {
      const habit = habits.find((h) => h.id === k.habit_id);
      if (!habit || out.some((x) => x.type === 'habit')) continue;
      const periods = Math.min(habit.periods, Math.max(1, Math.round(Number(k.target_periods)) || habit.periods));
      out.push({ ...emptyKeyResult('habit'), title: title || habit.name, habit_id: habit.id, target_periods: periods });
    }
  }
  if (!out.length) {
    console.warn('[suggest] nothing usable in:', text.slice(0, 500));
    throw new Error('No usable suggestions this time. Try again.');
  }
  return out;
}
