'use client';

import { useState } from 'react';
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
  // A habit KR with no pick yet falls back to the first habit — the same fallback the save applies.
  const habitFor = (k: KeyResultDraft) =>
    k.type === 'habit' ? p.habits.find((h) => h.id === k.habit_id) ?? p.habits[0] : undefined;
  // A habit KR needs no title of its own; it borrows the habit's name.
  const canSave = !!draft.title.trim() && draft.key_results.some((k) => k.title.trim() || habitFor(k));

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
            const habit = habitFor(k);
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

                <input value={k.title} onChange={(e) => setKr(i, { title: e.target.value })} placeholder={habit ? habit.name : PLACEHOLDER[k.type]} className="h-[46px] w-full rounded-sm bg-surface px-3.5 text-base outline-none focus:ring-2 focus:ring-accent" />

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
                        const on = h.id === habit?.id;
                        return (
                          <button key={h.id} type="button" aria-pressed={on} onClick={() => setKr(i, { habit_id: h.id })}
                            className={`h-[38px] rounded-full px-3.5 text-sm font-medium transition-colors ${on ? 'bg-accent text-accent-contrast' : 'border border-line bg-surface text-ink'}`}>
                            {h.name}
                          </button>
                        );
                      })}
                    </div>
                    {habit && (
                      <HabitTarget period={habit.period} total={total} value={Math.min(k.target_periods, total)} onChange={(target_periods) => setKr(i, { target_periods })} />
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

/**
 * "Hit its target in N of M weeks", set as a count or as a share of the timeframe.
 * Only the count is stored; the percentage is converted on the way in.
 */
function HabitTarget({ period, total, value, onChange }: { period: Period; total: number; value: number; onChange: (v: number) => void }) {
  const [unit, setUnit] = useState<'count' | 'pct'>('count');
  const pct = total ? Math.round((value / total) * 100) : 0;
  const fromPct = (n: number) => Math.min(total, Math.max(1, Math.round((n / 100) * total)));
  return (
    <div className="flex flex-col gap-2.5 text-sm text-ink-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <span>Hit its target in</span>
        {unit === 'count' ? (
          <Stepper size="sm" value={value} onChange={onChange} min={1} max={total} label={`${period}s`} />
        ) : (
          <Stepper size="sm" value={pct} onChange={(n) => onChange(fromPct(n))}
            onStep={(dir) => onChange(Math.min(total, Math.max(1, value + dir)))} min={1} max={100} label="percent" />
        )}
        <span>{unit === 'count' ? `of ${total} ${period}s` : `% of ${period}s · ${value} of ${total}`}</span>
      </div>
      <Segmented size="sm" options={[{ value: 'count', label: `${period[0].toUpperCase()}${period.slice(1)}s` }, { value: 'pct', label: '%' }]} value={unit} onChange={setUnit} />
    </div>
  );
}
