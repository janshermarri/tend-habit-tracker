import { ProgressRing } from './ProgressRing';

export type WeekTile = { count: number; label: string; title?: string; state: 'hit' | 'miss' | 'current' | 'future' };

const tileClass: Record<WeekTile['state'], string> = {
  hit: 'bg-accent text-accent-contrast',
  current: 'bg-accent-soft border-[1.5px] border-accent text-ink',
  miss: 'bg-surface-2 text-ink-2',
  future: 'border border-dashed border-line text-ink-2',
};

/** Month view · weekly habit: one tile per week of the month, filled when that week hit its target. */
export function WeekTilesRow({ name, target, tiles, onOpen }: { name: string; target: number; tiles: WeekTile[]; onOpen?: () => void }) {
  const hits = tiles.filter((t) => t.state === 'hit').length;
  return (
    <div onClick={onOpen} className="flex cursor-pointer flex-col gap-4 rounded-lg bg-surface p-[18px] shadow-sm transition-shadow animate-rise hover:shadow-md">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-[3px]">
          <span className="text-base font-medium">{name}</span>
          <span className="text-[13px] text-ink-2">{target}× per week</span>
        </div>
        <span className={`text-right text-sm ${hits ? 'text-accent-ink' : 'text-ink-2'}`}>{hits} of {tiles.length} weeks on target</span>
      </div>
      <div className="flex gap-1.5">
        {tiles.map((t, i) => (
          <div key={i} title={t.title} className={`flex min-w-0 flex-1 flex-col items-center gap-[5px] rounded-sm px-0.5 pt-3 pb-2.5 transition-colors duration-300 ease-calm ${tileClass[t.state]}`}>
            <span className="font-serif text-[21px] leading-none">{t.state === 'future' ? '–' : t.count}</span>
            <span className="text-[11px] font-medium whitespace-nowrap">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type CalendarDay = { count: number; isToday: boolean; isFuture: boolean; title?: string } | null; // null = leading blank

/** Month view · monthly habit: ring for count vs target + a Monday-first dot calendar. */
export function MonthCalendarCard({ name, count, target, status, done, days, onOpen }: { name: string; count: number; target: number; status: string; done?: boolean; days: CalendarDay[]; onOpen?: () => void }) {
  return (
    <div onClick={onOpen} className="flex cursor-pointer flex-col gap-[18px] rounded-lg bg-surface p-[18px] shadow-sm transition-shadow animate-rise hover:shadow-md">
      <div className="flex items-center gap-4">
        <ProgressRing value={count / target} size={60} stroke={5} label={`${count} of ${target}`}>
          <span className="flex items-baseline font-serif"><span className="text-[22px] leading-none">{count}</span><span className="text-[13px] text-ink-3">/{target}</span></span>
        </ProgressRing>
        <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
          <span className="text-base font-medium">{name}</span>
          <span className={`text-sm leading-snug text-pretty ${done ? 'text-accent-ink' : 'text-ink-2'}`}>{status}</span>
        </div>
      </div>
      <div className="flex max-w-[340px] flex-col gap-2">
        <div className="grid grid-cols-7 gap-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => <span key={i} className="text-center text-[11px] font-medium text-ink-2">{l}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) =>
            d === null ? <span key={i} /> : (
              <span key={i} title={d.title} className={`grid aspect-square place-items-center rounded-full text-[11px] font-semibold text-accent-contrast ${
                d.count ? 'bg-accent' : d.isToday ? 'border-[1.5px] border-accent' : d.isFuture ? 'border border-dashed border-line' : 'bg-surface-2'
              }`}>{d.count > 1 ? d.count : ''}</span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
