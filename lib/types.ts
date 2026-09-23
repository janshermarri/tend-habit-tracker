// Row types — mirror the Supabase tables 1:1.

export type Period = 'week' | 'month';

export type Habit = {
  id: string;
  name: string;
  target: number;          // check-ins per period
  period: Period;
  sort_order: number;
  created_at: string;      // ISO
};

export type Activity = {
  id: string;
  habit_id: string;
  name: string;            // "Gym", "Padel", "Cricket" …
};

export type Log = {
  id: string;
  habit_id: string;
  activity_id: string | null;
  note: string | null;
  logged_at: string;       // ISO timestamp
};

export type Timeframe = 1 | 3 | 6;

export type Objective = {
  id: string;
  title: string;
  timeframe_months: Timeframe;
  start_date: string;      // YYYY-MM-DD
  end_date: string;        // YYYY-MM-DD (start + timeframe)
  created_at: string;
};

type KeyResultBase = { id: string; objective_id: string; title: string; sort_order: number };

export type MilestoneKeyResult = KeyResultBase & { type: 'milestone'; done: boolean };
export type NumberKeyResult = KeyResultBase & { type: 'number'; current_value: number; target_value: number; unit: string | null };
export type HabitKeyResult = KeyResultBase & { type: 'habit'; habit_id: string; target_periods: number };

export type KeyResult = MilestoneKeyResult | NumberKeyResult | HabitKeyResult;
export type KeyResultType = KeyResult['type'];
