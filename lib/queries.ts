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

  // Supabase's clock can run ahead of PostgREST's, so a cold first read is
  // sometimes rejected with "JWT issued at future". It clears in a moment: retry.
  let result;
  for (let attempt = 0; ; attempt++) {
    result = await Promise.all([
      supabase.from('habits').select('*').order('sort_order'),
      supabase.from('activities').select('*'),
      supabase.from('logs').select('*').order('logged_at', { ascending: false }).limit(2000),
      supabase.from('objectives').select('*').order('created_at'),
      supabase.from('key_results').select('*').order('sort_order'),
      supabase.from('reflections').select('*').order('period_start', { ascending: false }).limit(300),
    ]);
    const failed = result.find((r) => r.error);
    if (!failed) break;
    if (attempt < 2 && failed.error!.message.includes('JWT issued at future')) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }
    throw new Error(`Supabase query failed: ${failed.error!.message}`);
  }
  const [habits, activities, logs, objectives, keyResults, reflections] = result;

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
