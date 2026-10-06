'use client';

import { ProgressBar } from './ProgressBar';
import { CheckIcon, MinusIcon, PlusIcon } from './icons';

export type PeriodCell = { state: 'hit' | 'miss' | 'current' | 'future'; title?: string };

type Base = { title: string };

export type MilestoneRowProps = Base & { type: 'milestone'; done: boolean; onToggle: () => void };
/** `source` set = the hub fills the value, so it shows read-only. */
export type NumberRowProps = Base & { type: 'number'; current: number; target: number; unit?: string | null; source?: string | null; onChange: (next: number) => void };
export type HabitRowProps = Base & {
  type: 'habit';
  habitName: string | null; // null if the linked habit was deleted
  habitTarget: number;
  period: 'week' | 'month';
  hits: number;
  targetPeriods: number;
  cells: PeriodCell[];
};

export type KeyResultRowProps = MilestoneRowProps | NumberRowProps | HabitRowProps;

/** One row per key result; picks the variant from `type`. */
export function KeyResultRow(props: KeyResultRowProps) {
  switch (props.type) {
    case 'milestone': return <MilestoneRow {...props} />;
    case 'number': return <NumberRow {...props} />;
    case 'habit': return <HabitLinkedRow {...props} />;
  }
}

export function MilestoneRow({ title, done, onToggle }: MilestoneRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      onClick={onToggle}
      className="flex w-full items-center gap-3.5 rounded-md bg-surface px-[18px] py-4 text-left shadow-sm transition-shadow hover:shadow-md"
    >
      <span className={`grid size-[26px] shrink-0 place-items-center rounded-[8px] transition-colors duration-200 ${done ? 'bg-accent text-accent-contrast' : 'border-[1.5px] border-ink-3'}`}>
        <span className={`transition-opacity ${done ? 'opacity-100' : 'opacity-0'}`}><CheckIcon /></span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[15px] font-medium">{title}</span>
        <span className="text-[13px] text-ink-2">{done ? 'Done' : 'Tap when it’s done'}</span>
      </span>
      <span className="shrink-0 text-xs text-ink-2">Milestone</span>
    </button>
  );
}

export function NumberRow({ title, current, target, unit, source, onChange }: NumberRowProps) {
  return (
    <div className="flex items-center gap-3.5 rounded-md bg-surface py-3.5 pr-3.5 pl-[18px] shadow-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-medium">{title}</span>
          <span className="text-[13px] text-ink-2">{current} of {target}{unit ? ` ${unit}` : ''}</span>
        </div>
        <ProgressBar value={current / target} size="sm" label={title} />
      </div>
      {source ? (
        <div className="flex shrink-0 flex-col items-end gap-0.5 pr-1">
          <span className="font-serif text-xl">{current}</span>
          <span className="text-xs text-ink-2">from hub</span>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5 rounded-full bg-surface-2 p-0.5">
          <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(0, current - 1))} className="grid size-10 place-items-center rounded-full hover:bg-surface"><MinusIcon /></button>
          <span className="min-w-7 text-center font-serif text-xl">{current}</span>
          <button type="button" aria-label="Increase" onClick={() => onChange(current + 1)} className="grid size-10 place-items-center rounded-full hover:bg-surface"><PlusIcon size={12} /></button>
        </div>
      )}
    </div>
  );
}

const cellClass: Record<PeriodCell['state'], string> = {
  hit: 'bg-accent',
  miss: 'bg-ring-track',
  current: 'bg-accent-soft border-[1.5px] border-accent',
  future: 'border border-line',
};

export function HabitLinkedRow({ title, habitName, habitTarget, period, hits, targetPeriods, cells }: HabitRowProps) {
  const pct = Math.round(Math.min(1, hits / targetPeriods) * 100);
  return (
    <div className="flex flex-col gap-3.5 rounded-md bg-surface px-[18px] py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-medium">{title}</span>
          <span className="text-[13px] text-pretty text-ink-2">
            {habitName ? `${hits} of ${targetPeriods} ${period}s at ${habitTarget}× per ${period}` : 'The linked habit was removed'}
          </span>
        </div>
        <span className="shrink-0 text-sm font-semibold">{pct}%</span>
      </div>
      <div className="flex flex-wrap gap-[5px]">
        {cells.map((c, i) => <span key={i} title={c.title} className={`size-3.5 rounded-[4px] ${cellClass[c.state]}`} />)}
      </div>
      <span className="flex items-center gap-2 text-xs text-ink-2">
        <span className="size-1.5 rounded-full bg-accent" />
        {habitName ? `Updates from your ${habitName} check-ins` : 'Edit to link another habit'}
      </span>
    </div>
  );
}
