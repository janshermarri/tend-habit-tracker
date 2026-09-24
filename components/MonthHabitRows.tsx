import { CheckIcon } from './icons';

/** Used by the habit detail rhythm tiles. */
export type WeekTile = { count: number; label: string; title?: string; state: 'hit' | 'miss' | 'current' | 'future' };

export type CalendarDay = { count: number; isToday: boolean; isFuture: boolean; title?: string } | null; // null = outside the month
/** One Monday-first calendar row. `hit` marks a weekly habit's week that reached its target. */
export type CalendarWeek = { days: CalendarDay[]; hit?: boolean };

export type MonthCalendarCardProps = {
  name: string;
  /** "8 check-ins" · "Done for the month" — what happened, never what didn't */
  summary: string;
  done?: boolean;
  weeks: CalendarWeek[];
  onOpen?: () => void;
};

/**
 * Month view · one habit: a dot calendar of the month. Check-in days are
 * filled; quiet days stay faint so the eye lands on what was done. A week
 * that reached its target gets a soft band and a "Target met" label beside
 * it — nothing marks the weeks that didn't.
 */
export function MonthCalendarCard({ name, summary, done, weeks, onOpen }: MonthCalendarCardProps) {
  // Every card reserves the label column, so calendars are the same size whether or not a week earned it.
  const cols = 'grid-cols-[repeat(7,minmax(0,1fr))_88px]';
  return (
    <div onClick={onOpen} className="flex cursor-pointer flex-col gap-4 rounded-lg bg-surface p-[18px] shadow-sm transition-shadow animate-rise hover:shadow-md">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 text-base font-medium">{name}</span>
        <span className={`shrink-0 text-sm ${done ? 'text-accent-ink' : 'text-ink-2'}`}>{summary}</span>
      </div>
      <div className="flex flex-col gap-1">
        <div className={`grid ${cols} gap-1.5`}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <span key={i} className="text-center text-[11px] font-medium text-ink-2">{l}</span>)}
        </div>
        {weeks.map((w, wi) => {
          // The band spans only this month's days, so a week split across months stays tidy.
          const first = w.days.findIndex((d) => d !== null);
          const last = w.days.findLastIndex((d) => d !== null);
          return (
            <div key={wi} className={`grid ${cols} items-center gap-1.5`}>
              {w.hit && (
                <>
                  <span aria-hidden className="h-7 rounded-full bg-accent-soft" style={{ gridRow: 1, gridColumn: `${first + 1} / ${last + 2}` }} />
                  <span className="flex items-center gap-1 pl-1 text-xs font-medium whitespace-nowrap text-accent-ink" style={{ gridRow: 1, gridColumn: 8 }}>
                    <CheckIcon size={11} />Target met
                  </span>
                </>
              )}
              {w.days.map((d, i) =>
                d === null ? null : (
                  <span key={i} title={d.title} className="grid h-7 place-items-center" style={{ gridRow: 1, gridColumn: i + 1 }}>
                    {d.count ? (
                      <span className="grid size-5 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-contrast">{d.count > 1 ? d.count : ''}</span>
                    ) : (
                      <span className={`rounded-full ${d.isToday ? 'size-5 border-[1.5px] border-accent' : d.isFuture ? 'size-1 bg-line' : `size-1.5 ${w.hit ? 'bg-accent/30' : 'bg-ring-track'}`}`} />
                    )}
                  </span>
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
