'use client';

import { useRef } from 'react';
import { Sheet } from './Sheet';
import * as P from '@/lib/progress';

export type LogSheetActivity = { id: string; name: string };

export type LogSheetProps = {
  open: boolean;
  mode?: 'create' | 'edit';
  habitName: string;
  /** create: status line · edit: "Logged Tuesday at 19:00" */
  subtitle: string;
  activities: LogSheetActivity[];
  selectedActivityId: string | null;
  note: string;
  /** YYYY-MM-DD the check-in is dated */
  date: string;
  /** today as YYYY-MM-DD; the latest date that can be picked */
  maxDate: string;
  onSelectActivity: (id: string) => void;
  onNoteChange: (note: string) => void;
  onDateChange: (date: string) => void;
  onSave: () => void;
  /** edit mode only */
  onRemove?: () => void;
  /** create mode: open the habit detail page */
  onHabit?: () => void;
  onClose: () => void;
};

/** Today, yesterday and the day before — the dates people actually backfill. */
function quickDays(today: Date): { value: string; label: string }[] {
  return [0, 1, 2].map((back) => {
    const d = P.addDays(today, -back);
    const label = back === 0 ? 'Today' : back === 1 ? 'Yesterday' : d.toLocaleDateString('en-GB', { weekday: 'long' });
    return { value: P.toDateKey(d), label };
  });
}

export function LogSheet(p: LogSheetProps) {
  const editing = p.mode === 'edit';
  const dateRef = useRef<HTMLInputElement>(null);
  const days = quickDays(P.parseDay(p.maxDate));
  // True when the chosen date is older than the three quick chips.
  const isOther = !days.some((d) => d.value === p.date);
  return (
    <Sheet open={p.open} onClose={p.onClose} label={`Log ${p.habitName}`}>
      <div className="flex flex-col gap-[22px] px-5 pt-2.5 pb-[calc(22px+env(safe-area-inset-bottom))]">
        <div className="flex justify-center"><span className="h-1 w-9 rounded-full bg-line" /></div>

        <header className="flex flex-col gap-1">
          <h2 className="font-serif text-[27px] leading-tight font-normal">{editing ? `Edit ${p.habitName.toLowerCase()}` : p.habitName}</h2>
          <p className="text-sm text-ink-2">{p.subtitle}</p>
        </header>

        {p.activities.length > 0 && (
          <fieldset className="flex flex-col gap-2.5">
            <legend className="mb-2.5 text-[13px] font-medium text-ink-2">What did you do?</legend>
            <div className="flex flex-wrap gap-2">
              {p.activities.map((a) => {
                const on = a.id === p.selectedActivityId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => p.onSelectActivity(a.id)}
                    className={`h-11 rounded-full px-[18px] text-[15px] font-medium transition-colors duration-200 ${
                      on ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-ink'
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2.5 text-[13px] font-medium text-ink-2">When?</legend>
          <div className="flex flex-wrap items-center gap-2">
            {days.map((d) => {
              const on = d.value === p.date;
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => p.onDateChange(d.value)}
                  className={`h-11 rounded-full px-[18px] text-[15px] font-medium transition-colors duration-200 ${
                    on ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-ink'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}

            {/*
              Older dates. The native input is hidden rather than styled --
              browsers do not allow restyling the picker, and its mm/dd/yyyy
              text does not match the app.

              A hidden input alone is not enough: on desktop only the (now
              invisible) calendar icon opens the picker, so the button calls
              showPicker() explicitly. Mobile opens it on any tap, and older
              browsers without showPicker fall back to focus + click.
            */}
            <button
              type="button"
              onClick={() => {
                const el = dateRef.current;
                if (!el) return;
                try {
                  el.showPicker();
                } catch {
                  el.focus();
                  el.click();
                }
              }}
              className={`relative h-11 rounded-full px-[18px] text-[15px] font-medium transition-colors duration-200 ${
                isOther ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-ink'
              }`}
            >
              {isOther ? P.formatDay(P.parseDay(p.date)) : 'Another day'}
              <input
                ref={dateRef}
                type="date"
                value={p.date}
                max={p.maxDate}
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => e.target.value && p.onDateChange(e.target.value)}
                className="pointer-events-none absolute bottom-0 left-1/2 h-0 w-0 opacity-0"
              />
            </button>
          </div>
        </fieldset>

        <label className="flex flex-col gap-2.5">
          <span className="text-[13px] font-medium text-ink-2">Note <span className="font-normal text-ink-3">· optional</span></span>
          <textarea
            rows={3}
            value={p.note}
            onChange={(e) => p.onNoteChange(e.target.value)}
            placeholder="How did it go?"
            className="w-full resize-none rounded-md bg-surface-2 px-4 py-3.5 text-base leading-relaxed outline-none transition-shadow focus:ring-2 focus:ring-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={p.onSave} className="h-[52px] rounded-full bg-accent text-base font-medium text-accent-contrast transition hover:bg-accent-ink active:scale-[.99]">
            {editing ? 'Save changes' : 'Save check-in'}
          </button>
          {editing && p.onRemove && (
            <button type="button" onClick={p.onRemove} className="h-11 rounded-full text-[15px] text-ink-2 hover:text-ink">
              Remove check-in
            </button>
          )}
          {!editing && p.onHabit && (
            <button type="button" onClick={p.onHabit} className="h-11 rounded-full text-[15px] text-ink-2 hover:text-ink">
              Habit details
            </button>
          )}
        </div>
      </div>
    </Sheet>
  );
}
