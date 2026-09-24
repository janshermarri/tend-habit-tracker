'use client';

import { PlusIcon } from './icons';

export type HabitCardProps = {
  name: string;
  count: number;
  target: number;
  /** e.g. "4 days left" — see statusNote() in lib/progress; the dots carry the count */
  status: string;
  done?: boolean;
  /** The goal this habit feeds, if any — a quiet reminder of why it matters */
  goal?: string;
  /** One-tap log with the last-used activity */
  onLog?: () => void;
  /** Open the LogSheet for this habit */
  onOpen?: () => void;
};

/**
 * One dot per check-in, with the target as the minimum number of dots.
 * Empty dots are room still open, not a gap; check-ins past the target
 * simply add more filled dots.
 */
export function CheckInDots({ count, target, size = 'md' }: { count: number; target: number; size?: 'md' | 'lg' }) {
  const total = Math.max(count, target);
  // Big monthly targets would make a long row; shrink and let it wrap instead.
  const dense = total > 7;
  const dot = size === 'lg' ? (dense ? 'size-3.5' : 'size-[18px]') : dense ? 'size-2' : 'size-2.5';
  const gap = size === 'lg' ? (dense ? 'gap-1.5' : 'gap-2') : dense ? 'gap-1' : 'gap-1.5';
  return (
    <span role="img" aria-label={`${count} of ${target}`} className={`flex flex-wrap items-center ${gap}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`${dot} rounded-full transition-colors duration-300 ease-calm ${i < count ? 'bg-accent' : 'border-[1.5px] border-accent/45'}`}
        />
      ))}
    </span>
  );
}

export function HabitCard({ name, count, target, status, done, goal, onLog, onOpen }: HabitCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.()}
      className="flex cursor-pointer items-center gap-4 rounded-lg bg-surface py-4 pr-4 pl-[18px] shadow-sm transition duration-200 ease-calm animate-rise hover:shadow-md active:scale-[.99]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-base font-medium">{name}</span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <CheckInDots count={count} target={target} />
          <span className={`text-sm leading-snug text-pretty ${done ? 'text-accent-ink' : 'text-ink-2'}`}>{status}</span>
        </div>
        {goal && <span className="truncate text-[13px] leading-snug text-ink-2">For {goal}</span>}
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
