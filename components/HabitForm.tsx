'use client';

import { useState } from 'react';
import { Sheet } from './Sheet';
import { FieldLabel, FormHeader, Segmented, Stepper, inputClass } from './Controls';
import { CloseIcon } from './icons';


import { emptyHabitDraft, type HabitDraft } from '@/lib/drafts';

// Re-exported so existing importers of this module keep working.
export { emptyHabitDraft };
export type { HabitDraft };

type HabitFormProps = {
  open: boolean;
  mode: 'create' | 'edit';
  draft: HabitDraft;
  onChange: (next: HabitDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
};

/** Add / edit habit — name, count per period, activity options. Controlled: parent owns the draft. */
export function HabitForm({ open, mode, draft, onChange, onSave, onCancel, onDelete }: HabitFormProps) {
  const [newAct, setNewAct] = useState('');
  const set = (patch: Partial<HabitDraft>) => onChange({ ...draft, ...patch });
  const addAct = () => {
    const name = newAct.trim();
    if (!name || draft.activities.some((a) => a.name.toLowerCase() === name.toLowerCase())) return;
    set({ activities: [...draft.activities, { name }] });
    setNewAct('');
  };
  const preview = `${draft.name.trim() || 'This habit'} · ${draft.target}× per ${draft.period}. Any activity below counts — no need to do it on particular days.`;

  return (
    <Sheet open={open} onClose={onCancel} label={mode === 'edit' ? 'Edit habit' : 'New habit'} maxWidth="max-w-[560px]">
      <FormHeader title={mode === 'edit' ? 'Edit habit' : 'New habit'} onCancel={onCancel} onSave={onSave} canSave={!!draft.name.trim()} />
      <div className="flex flex-col gap-7 px-5 pt-2 pb-[calc(28px+env(safe-area-inset-bottom))]">
        <label className="flex flex-col gap-2.5">
          <FieldLabel>Name</FieldLabel>
          <input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Physical activity" className={`${inputClass} h-[52px] text-[17px]`} />
        </label>

        <div className="flex flex-col gap-3">
          <FieldLabel>How often</FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            <Stepper value={draft.target} onChange={(target) => set({ target })} min={1} max={draft.period === 'week' ? 14 : 60} label="times" />
            <span className="text-[15px] text-ink-2">times per</span>
            <Segmented options={[{ value: 'week', label: 'week' }, { value: 'month', label: 'month' }]} value={draft.period} onChange={(period) => set({ period })} />
          </div>
          <p className="text-sm leading-normal text-pretty text-ink-2">{preview}</p>
        </div>

        <div className="flex flex-col gap-3">
          <FieldLabel hint="Anything that counts toward this habit — you’ll pick one when logging.">Ways to count it</FieldLabel>
          {draft.activities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {draft.activities.map((a, i) => (
                <span key={a.id ?? a.name} className="flex h-10 items-center gap-1 rounded-full bg-accent-soft pr-1 pl-4 text-[15px] font-medium text-accent-ink">
                  {a.name}
                  <button type="button" aria-label={`Remove ${a.name}`} onClick={() => set({ activities: draft.activities.filter((_, j) => j !== i) })} className="grid size-8 place-items-center rounded-full hover:bg-surface">
                    <CloseIcon />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newAct}
              onChange={(e) => setNewAct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAct())}
              placeholder="Add an activity, e.g. Padel"
              className={`${inputClass} h-12 min-w-0 flex-1`}
            />
            <button type="button" onClick={addAct} className="h-12 rounded-md border border-line bg-surface px-[18px] text-[15px] font-medium hover:border-accent">Add</button>
          </div>
        </div>

        {mode === 'edit' && onDelete && (
          <button type="button" onClick={onDelete} className="h-11 self-start text-sm text-ink-2 underline underline-offset-[3px] hover:text-ink">
            Remove this habit
          </button>
        )}
      </div>
    </Sheet>
  );
}
