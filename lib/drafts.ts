/**
 * Form draft shapes, shared by the client forms and the Server Actions that
 * persist them. Kept out of the form components so `lib/actions.ts` can import
 * them without pulling a `'use client'` module into the server bundle.
 */
import type { Area, KeyResultType, Period, Timeframe } from './types';

export type HabitDraft = {
  name: string;
  target: number;
  period: Period;
  /** existing activities keep their id; new ones have none */
  activities: { id?: string; name: string }[];
};

export const emptyHabitDraft: HabitDraft = { name: '', target: 3, period: 'week', activities: [] };

export type KeyResultDraft = {
  id?: string;
  type: KeyResultType;
  title: string;
  done: boolean;            // milestone
  current_value: number;    // number
  target_value: number;     // number
  unit: string;             // number
  habit_id: string | null;  // habit
  target_periods: number;   // habit
  source: string | null;    // set outside Tend; the form keeps it read-only
};

export type ObjectiveDraft = { title: string; timeframe_months: Timeframe; area: Area; key_results: KeyResultDraft[] };

export const emptyKeyResult = (type: KeyResultType = 'milestone'): KeyResultDraft => ({
  type, title: '', done: false, current_value: 0, target_value: 3, unit: '', habit_id: null, target_periods: 8, source: null,
});

export const emptyObjectiveDraft = (): ObjectiveDraft => ({
  title: '',
  timeframe_months: 3,
  area: 'self',
  key_results: [emptyKeyResult()],
});
