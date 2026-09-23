'use client';

import { Sheet } from './Sheet';
import { AddTile, FieldLabel, FormHeader, Segmented, Stepper, inputClass } from './Controls';
import { CloseIcon } from './icons';
import type { KeyResultType, Period, Timeframe } from '@/lib/types';

import { emptyKeyResult, emptyObjectiveDraft, type KeyResultDraft, type ObjectiveDraft } from '@/lib/drafts';

// Re-exported so existing importers of this module keep working.
export { emptyKeyResult, emptyObjectiveDraft };
export type { KeyResultDraft, ObjectiveDraft };

type HabitOption = { id: string; name: string; period: Period };

type ObjectiveFormProps = {
  open: boolean;
  mode: 'create' | 'edit';
  draft: ObjectiveDraft;
  /** "Ends 23 December" for the chosen timeframe */
  endsLabel: string;
  habits: HabitOption[];
  /** number of weeks/months in the timeframe for a given period — caps target_periods */
  periodsInTimeframe: (period: Period, months: Timeframe) => number;
  onChange: (next: ObjectiveDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

const TYPES: { value: KeyResultType; label: string }[] = [
  { value: 'milestone', label: 'Milestone' },
  { value: 'number', label: 'Number' },
  { value: 'habit', label: 'Habit' },
];
const PLACEHOLDER: Record<KeyResultType, string> = {
  milestone: 'e.g. Book a coaching session',
  number: 'e.g. Ship small side projects',
  habit: 'e.g. Keep a steady learning rhythm',
};

export function ObjectiveForm(p: ObjectiveFormProps) {
  const { draft } = p;
  const set = (patch: Partial<ObjectiveDraft>) => p.onChange({ ...draft, ...patch });
  const setKr = (i: number, patch: Partial<KeyResultDraft>) =>
    set({ key_results: draft.key_results.map((k, j) => (j === i ? { ...k, ...patch } : k)) });
  const canSave = !!draft.title.trim() && draft.key_results.some((k) => k.title.trim());

  return (
    <Sheet open={p.open} onClose={p.onCancel} label={p.mode === 'edit' ? 'Edit objective' : 'New objective'} maxWidth="max-w-[600px]">
      <FormHeader title={p.mode === 'edit' ? 'Edit objective' : 'New objective'} onCancel={p.onCancel} onSave={p.onSave} canSave={canSave} />
      <div className="flex flex-col gap-7 px-5 pt-2 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <label className="flex flex-col gap-2.5">
          <FieldLabel>Objective</FieldLabel>
          <input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="What would you like to be true?" className={`${inputClass} h-[52px] text-[17px]`} />
        </label>

        <div className="flex flex-col gap-3">
          <FieldLabel>Timeframe</FieldLabel>
          <Segmented<Timeframe>
            options={[{ value: 1, label: '1 month' }, { value: 3, label: '3 months' }, { value: 6, label: '6 months' }]}
            value={draft.timeframe_months}
            onChange={(timeframe_months) => set({ timeframe_months })}
          />
          <p className="text-sm text-ink-2">{p.endsLabel}</p>
        </div>

        <div className="flex flex-col gap-3">
          <FieldLabel hint="How you’ll know it’s moving. Progress is the average of these.">Key results</FieldLabel>

          {draft.key_results.map((k, i) => {
            const habit = p.habits.find((h) => h.id === k.habit_id);
            const total = habit ? p.periodsInTimeframe(habit.period, draft.timeframe_months) : 0;
            return (
              <div key={k.id ?? i} className="flex flex-col gap-3 rounded-md border border-line bg-bg p-3.5 animate-rise">
                <div className="flex items-center justify-between gap-2">
                  <Segmented size="sm" options={TYPES} value={k.type} onChange={(type) => setKr(i, { type })} />
                  {draft.key_results.length > 1 && (
                    <button type="button" aria-label="Remove key result" onClick={() => set({ key_results: draft.key_results.filter((_, j) => j !== i) })} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface-2">
                      <CloseIcon />
                    </button>
                  )}
                </div>

                <input value={k.title} onChange={(e) => setKr(i, { title: e.target.value })} placeholder={PLACEHOLDER[k.type]} className="h-[46px] w-full rounded-sm bg-surface px-3.5 text-base outline-none focus:ring-2 focus:ring-accent" />

                {k.type === 'number' && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
                    <span>At</span>
                    <input type="number" inputMode="numeric" value={k.current_value} onChange={(e) => setKr(i, { current_value: Number(e.target.value) || 0 })} className="h-[42px] w-[68px] rounded-sm bg-surface px-2.5 text-center text-base text-ink outline-none focus:ring-2 focus:ring-accent" />
                    <span>of</span>
                    <input type="number" inputMode="numeric" value={k.target_value} onChange={(e) => setKr(i, { target_value: Math.max(1, Number(e.target.value) || 1) })} className="h-[42px] w-[68px] rounded-sm bg-surface px-2.5 text-center text-base text-ink outline-none focus:ring-2 focus:ring-accent" />
                    <input value={k.unit} onChange={(e) => setKr(i, { unit: e.target.value })} placeholder="unit, e.g. projects" className="h-[42px] min-w-[120px] flex-1 rounded-sm bg-surface px-3 text-base text-ink outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                )}

                {k.type === 'habit' && (p.habits.length === 0 ? (
                  <p className="text-sm text-ink-2">Add a habit first — then it can feed this key result automatically.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {p.habits.map((h) => {
                        const on = h.id === k.habit_id;
                        return (
                          <button key={h.id} type="button" aria-pressed={on} onClick={() => setKr(i, { habit_id: h.id })}
                            className={`h-[38px] rounded-full px-3.5 text-sm font-medium transition-colors ${on ? 'bg-accent text-accent-contrast' : 'border border-line bg-surface text-ink'}`}>
                            {h.name}
                          </button>
                        );
                      })}
                    </div>
                    {habit && (
                      <div className="flex flex-wrap items-center gap-2.5 text-sm text-ink-2">
                        <span>Hit its target in</span>
                        <Stepper size="sm" value={Math.min(k.target_periods, total)} onChange={(target_periods) => setKr(i, { target_periods })} min={1} max={total} label={`${habit.period}s`} />
                        <span>of {total} {habit.period}s</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          <AddTile label="Add key result" onClick={() => set({ key_results: [...draft.key_results, emptyKeyResult()] })} className="h-12 rounded-md" />
        </div>

        {p.mode === 'edit' && p.onDelete && (
          <button type="button" onClick={p.onDelete} className="h-11 self-start text-sm text-ink-2 underline underline-offset-[3px] hover:text-ink">
            Remove this objective
          </button>
        )}
      </div>
    </Sheet>
  );
}
