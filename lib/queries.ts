import 'server-only';
import { db } from './supabase/server';
import { hasAiProvider } from './ai';
import type { Activity, Habit, KeyResult, Log, Objective, Reflection } from './types';

export type Dashboard = {
  habits: Habit[];
  activities: Activity[];
  logs: Log[];
  objectives: Objective[];
  keyResults: KeyResult[];
  /** "Looking back" notes, newest first; Today and Progress pick by period. */
  reflections: Reflection[];
  /** False when no AI key is set — the AI touches stay hidden. */
  ai: boolean;
};

/**
 * Everything the app renders, in one round trip.
 *
 * The whole UI is derived client-side by lib/progress.ts from these five
 * arrays, so splitting this into per-screen queries would only add waterfalls.
 * Logs are capped: progress views never look back further than the oldest
 * objective, and the check-ins list paginates in the client.
 */
export async function getDashboard(): Promise<Dashboard> {
  const supabase = db();

  const [habits, activities, logs, objectives, keyResults, reflections] = await Promise.all([
    supabase.from('habits').select('*').order('sort_order'),
    supabase.from('activities').select('*'),
    supabase.from('logs').select('*').order('logged_at', { ascending: false }).limit(2000),
    supabase.from('objectives').select('*').order('created_at'),
    supabase.from('key_results').select('*').order('sort_order'),
    supabase.from('reflections').select('*').order('period_start', { ascending: false }).limit(300),
  ]);

  for (const r of [habits, activities, logs, objectives, keyResults, reflections]) {
    if (r.error) throw new Error(`Supabase query failed: ${r.error.message}`);
  }

  return {
    habits: (habits.data ?? []) as Habit[],
    activities: (activities.data ?? []) as Activity[],
    logs: (logs.data ?? []) as Log[],
    objectives: (objectives.data ?? []) as Objective[],
    keyResults: (keyResults.data ?? []) as KeyResult[],
    reflections: (reflections.data ?? []) as Reflection[],
    ai: hasAiProvider(),
  };
}
