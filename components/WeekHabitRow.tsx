import { CheckIcon } from './icons';

export type WeekDay = { letter: string; count: number; isToday: boolean; isFuture: boolean };

type WeekHabitRowProps = {
  name: string;
  /** "2 of 3" or "3 this week · 3 of 4 this month" for monthly habits */
  countLabel: string;
  days: WeekDay[]; // Mon..Sun
  /** The habit reached its target for its period — the count gets a check. */
  done?: boolean;
  /** A weekly habit met its target this week — the dots sit on a soft band, like the month view. */
  hit?: boolean;
  /** open the habit detail page */
  onOpen?: () => void;
};

/** One habit's week: seven day-dots, filled on days with a check-in. */
export function WeekHabitRow({ name, countLabel, days, done, hit, onOpen }: WeekHabitRowProps) {
  return (
    <div onClick={onOpen} className="flex cursor-pointer flex-col gap-4 rounded-lg bg-surface p-[18px] shadow-sm transition-shadow animate-rise hover:shadow-md">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-base font-medium">{name}</span>
        <span className={`flex items-center gap-1.5 text-right text-sm ${done ? 'font-medium text-accent-ink' : 'text-ink-2'}`}>
          {done && <CheckIcon size={12} />}
          {countLabel}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1.5 px-1">
          {days.map((d, i) => (
            <span key={i} className={`text-center text-xs font-medium ${d.isToday ? 'text-accent-ink' : 'text-ink-2'}`}>{d.letter}</span>
          ))}
        </div>
        <div className={`grid grid-cols-7 gap-1.5 rounded-full p-1 transition-colors duration-500 ease-calm ${hit ? 'bg-accent-soft' : ''}`}>
          {days.map((d, i) => (
            <div key={i} className="flex justify-center">
              <div
                aria-label={`${d.count} check-in${d.count === 1 ? '' : 's'}`}
                className={`grid aspect-square w-full max-w-9 place-items-center rounded-full text-[13px] font-semibold text-accent-contrast transition-colors duration-300 ease-calm ${
                  d.count > 0 ? 'bg-accent'
                    : d.isToday ? 'border-[1.5px] border-accent'
                    : d.isFuture ? 'border border-dashed border-line'
                    : hit ? 'bg-accent/15'
                    : 'bg-ring-track'
                }`}
              >
                {d.count > 1 ? d.count : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
