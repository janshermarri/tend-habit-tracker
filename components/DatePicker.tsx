'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as P from '@/lib/progress';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Touch-primary detection, as an external store.
 *
 * `(pointer: coarse)` is a browser-owned value that can change (a tablet
 * gaining a mouse), so it is subscribed to rather than copied into state.
 * The server snapshot is `false`: SSR has no pointer, and the in-app calendar
 * is the safe default if hydration were to differ.
 */
const COARSE = '(pointer: coarse)';
function subscribeCoarse(cb: () => void): () => void {
  const mq = window.matchMedia(COARSE);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function getCoarse(): boolean {
  return window.matchMedia(COARSE).matches;
}

type CalendarProps = {
  /** YYYY-MM-DD currently selected */
  value: string;
  /** YYYY-MM-DD latest selectable day */
  max: string;
  onSelect: (date: string) => void;
  onClose: () => void;
};

/**
 * Month grid in the app's own styling, for pointer devices.
 *
 * Rendered as a centered overlay rather than a popover anchored to the button:
 * the log sheet is an `overflow-auto` container, which would clip an absolutely
 * positioned panel and widen the sheet with a scrollbar.
 */
function Calendar({ value, max, onSelect, onClose }: CalendarProps) {
  const selected = P.parseDay(value);
  const maxDay = P.parseDay(max);
  const [view, setView] = useState(() => P.startOfMonth(selected));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Close only the calendar; the log sheet listens for Escape too.
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  // Monday-first offset for the 1st of the month.
  const lead = (P.startOfMonth(view).getDay() + 6) % 7;
  const cells: (Date | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];

  const selectedKey = P.toDateKey(selected);
  const todayKey = P.toDateKey(maxDay);
  // Cannot page past the month containing `max`.
  const atMaxMonth = view.getFullYear() === maxDay.getFullYear() && view.getMonth() === maxDay.getMonth();

  const navBtn =
    'flex h-9 w-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div onClick={onClose} className="absolute inset-0 bg-overlay animate-fade-in" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a date"
        className="relative w-[300px] rounded-xl border border-line bg-surface p-4 shadow-lg animate-pop-in"
      >
        <div className="mb-3 flex items-center justify-between">
          <button type="button" aria-label="Previous month" className={navBtn}
            onClick={() => setView(P.addMonths(view, -1))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span className="font-serif text-[17px]">
            {view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </span>
          <button type="button" aria-label="Next month" disabled={atMaxMonth} className={navBtn}
            onClick={() => setView(P.addMonths(view, 1))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="flex h-8 items-center justify-center text-[12px] font-medium text-ink-3">{d}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (!d) return <span key={i} />;
            const key = P.toDateKey(d);
            const isSelected = key === selectedKey;
            const isToday = key === todayKey;
            const disabled = d.getTime() > maxDay.getTime();

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                aria-current={isToday ? 'date' : undefined}
                onClick={() => { onSelect(key); onClose(); }}
                className={`flex h-9 items-center justify-center rounded-full text-[14px] transition-colors duration-200 ${
                  isSelected
                    ? 'bg-accent font-medium text-accent-contrast'
                    : disabled
                      ? 'cursor-not-allowed text-ink-3 opacity-40'
                      : isToday
                        ? 'bg-accent-soft font-medium text-accent-ink hover:bg-surface-2'
                        : 'text-ink hover:bg-surface-2'
                }`}
              >
                {d.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type DateButtonProps = {
  value: string;
  max: string;
  onChange: (date: string) => void;
  /** true when `value` is not one of the quick-pick chips */
  active: boolean;
};

/**
 * "Another day" control.
 *
 * Touch devices get the real `<input type="date">`, stretched invisibly over
 * the chip so the tap lands on the input itself. `showPicker()` is not used:
 * it throws in an installed PWA on iOS, and a scripted `.click()` fallback does
 * not open the picker either. Letting the browser handle a direct tap is the
 * only approach that works in standalone mode.
 *
 * Pointer devices get the in-app calendar instead, because the native desktop
 * widget cannot be restyled and does not match the app.
 */
export function DateButton({ value, max, onChange, active }: DateButtonProps) {
  const [open, setOpen] = useState(false);
  const coarse = useSyncExternalStore(subscribeCoarse, getCoarse, () => false);

  const label = active ? P.formatDay(P.parseDay(value)) : 'Another day';
  const className = `relative h-11 rounded-full px-[18px] text-[15px] font-medium transition-colors duration-200 ${
    active ? 'bg-accent text-accent-contrast' : 'bg-surface-2 text-ink'
  }`;

  if (coarse) {
    return (
      <span className={`${className} inline-flex items-center`}>
        {label}
        <input
          type="date"
          value={value}
          max={max}
          aria-label="Choose another date"
          onChange={(e) => e.target.value && onChange(e.target.value)}
          // Covers the chip so the tap reaches the input; opacity-0 keeps the
          // native mm/dd/yyyy text hidden while leaving it interactive.
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </span>
    );
  }

  return (
    <>
      <button type="button" aria-haspopup="dialog" aria-expanded={open} className={className}
        onClick={() => setOpen((o) => !o)}>
        {label}
      </button>
      {open && (
        <Calendar value={value} max={max} onSelect={onChange} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
