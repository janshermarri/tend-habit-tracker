'use client';

import { ProgressRing } from './ProgressRing';
import { PlusIcon } from './icons';

export type HabitCardProps = {
  name: string;
  count: number;
  target: number;
  /** e.g. "2 of 3 done · 3 days left" — see statusLine() in lib/progress */
  status: string;
  done?: boolean;
  /** One-tap log with the last-used activity */
  onLog?: () => void;
  /** Open the LogSheet for this habit */
  onOpen?: () => void;
};

export function HabitCard({ name, count, target, status, done, onLog, onOpen }: HabitCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
      className="flex cursor-pointer items-center gap-4 rounded-lg bg-surface py-4 pr-4 pl-[18px] shadow-sm transition duration-200 ease-calm animate-rise hover:shadow-md active:scale-[.99]"
    >
      <ProgressRing value={count / target} size={60} stroke={5} label={`${count} of ${target}`}>
        <span className="flex items-baseline font-serif">
          <span className="text-[22px] leading-none">{count}</span>
          <span className="text-[13px] text-ink-3">/{target}</span>
        </span>
      </ProgressRing>

      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span className="text-base font-medium">{name}</span>
        <span className={`text-sm leading-snug text-pretty ${done ? 'text-accent-ink' : 'text-ink-2'}`}>{status}</span>
      </div>

      <button
        type="button"
        aria-label={`Log ${name}`}
        onClick={(e) => { e.stopPropagation(); onLog?.(); }}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink transition duration-150 ease-calm hover:bg-accent hover:text-accent-contrast active:scale-90"
      >
        <PlusIcon />
      </button>
    </div>
  );
}
