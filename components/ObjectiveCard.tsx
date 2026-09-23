'use client';

import { ProgressBar } from './ProgressBar';

export type ObjectiveCardProps = {
  title: string;
  /** "3 months" */
  timeframeLabel: string;
  /** "5 weeks left" — see timeLeft() in lib/progress */
  timeLeftLabel: string;
  /** 0..1, average of key results */
  progress: number;
  keyResultCount: number;
  onOpen?: () => void;
};

export function ObjectiveCard({ title, timeframeLabel, timeLeftLabel, progress, keyResultCount, onOpen }: ObjectiveCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-[18px] rounded-lg bg-surface p-5 text-left shadow-sm transition duration-200 ease-calm animate-rise hover:shadow-md active:scale-[.99]"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-surface-2 px-2.5 py-[5px] text-xs font-medium text-ink-2">{timeframeLabel}</span>
        <span className="text-[13px] text-ink-2">{timeLeftLabel}</span>
      </div>
      <h3 className="font-serif text-[23px] leading-tight font-normal text-pretty">{title}</h3>
      <div className="mt-auto flex flex-col gap-2.5">
        <ProgressBar value={progress} label={`${title} progress`} />
        <div className="flex justify-between text-[13px] text-ink-2">
          <span><span className="font-semibold text-ink">{Math.round(progress * 100)}%</span> overall</span>
          <span>{keyResultCount} key result{keyResultCount === 1 ? '' : 's'}</span>
        </div>
      </div>
    </button>
  );
}
