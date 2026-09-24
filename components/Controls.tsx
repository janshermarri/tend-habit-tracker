'use client';

import { useState } from 'react';
import { MinusIcon, PlusIcon } from './icons';

/** Pill segmented control — used for period, timeframe and key-result type. */
export function Segmented<T extends string | number>({
  options, value, onChange, size = 'md',
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className="flex self-start rounded-full bg-surface-2 p-[3px]" role="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`rounded-full font-medium transition-colors duration-200 ${size === 'sm' ? 'h-[34px] px-[13px] text-[13px]' : 'h-[42px] px-[18px] text-[15px]'} ${
              on ? 'bg-surface text-ink shadow-sm' : 'text-ink-2'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** − value + stepper. The value is also typeable; it clamps to [min, max] as you type. */
export function Stepper({
  value, onChange, onStep, min = 0, max = 999, size = 'md', label,
}: {
  value: number; onChange: (v: number) => void;
  /** Overrides what − and + do, for values that don't move in steps of one. */
  onStep?: (dir: 1 | -1) => void;
  min?: number; max?: number; size?: 'sm' | 'md'; label: string;
}) {
  const btn = size === 'sm' ? 'size-9' : 'size-[42px]';
  const step = (dir: 1 | -1) => (onStep ? onStep(dir) : onChange(Math.min(max, Math.max(min, value + dir))));
  // Raw text while focused, so a half-typed value ("" or "1" on the way to "12") isn't clamped away.
  const [text, setText] = useState<string | null>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-surface-2 p-[3px]">
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => step(-1)} className={`${btn} grid place-items-center rounded-full hover:bg-surface`}><MinusIcon /></button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={text ?? String(value)}
        onFocus={(e) => { setText(String(value)); e.target.select(); }}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '');
          setText(raw);
          if (raw) onChange(clamp(Number(raw)));
        }}
        onBlur={() => setText(null)}
        className={`w-[3ch] min-w-[34px] bg-transparent text-center font-serif outline-none ${size === 'sm' ? 'text-[19px]' : 'text-2xl'}`}
      />
      <button type="button" aria-label={`More ${label}`} onClick={() => step(1)} className={`${btn} grid place-items-center rounded-full hover:bg-surface`}><PlusIcon size={12} /></button>
    </div>
  );
}

export const inputClass =
  'w-full rounded-md bg-surface-2 px-4 text-base outline-none transition-shadow focus:ring-2 focus:ring-accent';

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="text-[13px] font-medium text-ink-2">{children}</span>
      {hint && <span className="text-[13px] text-ink-2">{hint}</span>}
    </span>
  );
}

/** Sticky "Cancel · Title · Save" header for form sheets. */
export function FormHeader({ title, onCancel, onSave, canSave }: { title: string; onCancel: () => void; onSave: () => void; canSave: boolean }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-surface px-2 py-2.5">
      <button type="button" onClick={onCancel} className="h-11 px-3.5 text-[15px] text-ink-2 hover:text-ink">Cancel</button>
      <span className="text-base font-semibold">{title}</span>
      <button type="button" onClick={onSave} disabled={!canSave} className={`h-11 px-3.5 text-[15px] font-semibold ${canSave ? 'text-accent-ink' : 'text-ink-3'}`}>Save</button>
    </div>
  );
}

/** Dashed "+ Add …" tile. */
export function AddTile({ label, onClick, className = 'min-h-[76px]' }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2.5 rounded-lg border-[1.5px] border-dashed border-line text-[15px] text-ink-2 transition-colors hover:border-accent hover:text-accent-ink ${className}`}
    >
      <PlusIcon size={12} />{label}
    </button>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold tracking-[.08em] text-ink-2 uppercase">{children}</h2>;
}
