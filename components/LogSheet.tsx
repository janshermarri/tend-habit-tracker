'use client';

import { Sheet } from './Sheet';

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
  onSelectActivity: (id: string) => void;
  onNoteChange: (note: string) => void;
  onSave: () => void;
  /** edit mode only */
  onRemove?: () => void;
  /** create mode: open the habit detail page */
  onHabit?: () => void;
  onClose: () => void;
};

export function LogSheet(p: LogSheetProps) {
  const editing = p.mode === 'edit';
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
