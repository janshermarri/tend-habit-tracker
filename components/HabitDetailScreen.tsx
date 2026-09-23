'use client';

import { ProgressRing } from './ProgressRing';
import { ProgressBar } from './ProgressBar';
import { CheckInList, type CheckInGroup } from './CheckInList';
import { SectionTitle } from './Controls';
import { ChevronIcon } from './icons';
import type { WeekTile } from './MonthHabitRows';

export type HabitDetailScreenProps = {
  name: string;
  targetLabel: string;      // "3× per week"
  periodLabel: string;      // "This week"
  count: number;
  target: number;
  status: string;           // statusLine()
  done: boolean;
  /** Rhythm: full history since the habit started, grouped by month (weekly) or year (monthly), newest group first */
  rhythmAll: { label: string; summary: string; tiles: (WeekTile & { label: string })[] }[];
  rhythmAllSummary: string; // "On target 31 of 52 weeks since May 2026"
  mix: { name: string; count: number }[]; // check-ins by activity, desc
  goals: { id: string; title: string; progress: number; note: string; onOpen: () => void }[];
  recent: CheckInGroup[];   // 3 most recent
  onBack: () => void;
  onEdit: () => void;
  onLog: () => void;
  onSeeAll: () => void;
  onOpenLog: (logId: string) => void;
};

const tileClass: Record<WeekTile['state'], string> = {
  hit: 'bg-accent text-accent-contrast',
  current: 'bg-accent-soft border-[1.5px] border-accent text-ink',
  miss: 'bg-surface-2 text-ink-2',
  future: 'border border-dashed border-line text-ink-2',
};

export function HabitDetailScreen(p: HabitDetailScreenProps) {
  const max = Math.max(1, ...p.mix.map((m) => m.count));
  const Tile = (t: WeekTile & { label: string }, i: number) => (
    <div key={i} title={t.title} className={`flex flex-col items-start gap-1.5 rounded-sm px-3 pt-3 pb-2.5 ${tileClass[t.state]}`}>
      <span className="flex items-baseline font-serif leading-none"><span className="text-[22px]">{t.count}</span><span className="text-sm opacity-70">/{p.target}</span></span>
      <span className="text-xs font-medium whitespace-nowrap">{t.label}</span>
    </div>
  );
  return (
    <section className="flex max-w-[760px] flex-col gap-5 animate-rise wide:gap-7">
      <div className="-mt-2 flex items-center justify-between gap-3">
        <button type="button" onClick={p.onBack} className="flex h-11 items-center gap-2.5 rounded-full pr-3.5 pl-2 text-[15px] text-ink-2 hover:text-ink"><ChevronIcon />Progress</button>
        <button type="button" onClick={p.onEdit} className="h-10 rounded-full border border-line bg-surface px-[18px] text-sm font-medium hover:border-accent">Edit</button>
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-sm text-ink-2">{p.targetLabel}</p>
        <h1 className="font-serif text-[38px] leading-[1.08] font-normal tracking-[-.015em]">{p.name}</h1>
      </header>

      <div className="flex flex-wrap items-center gap-[22px] rounded-lg bg-surface p-[22px] shadow-sm">
        <ProgressRing value={p.count / p.target} size={96} stroke={7} label={`${p.count} of ${p.target}`}>
          <span className="flex items-baseline font-serif"><span className="text-[34px] leading-none">{p.count}</span><span className="text-[17px] text-ink-3">/{p.target}</span></span>
        </ProgressRing>
        <div className="flex min-w-[180px] flex-1 flex-col gap-1">
          <span className="text-[13px] font-medium text-ink-2">{p.periodLabel}</span>
          <span className={`text-[17px] leading-snug text-pretty ${p.done ? 'text-accent-ink' : 'text-ink'}`}>{p.status}</span>
        </div>
        <button type="button" onClick={p.onLog} className="h-12 rounded-full bg-accent px-[22px] text-[15px] font-medium text-accent-contrast hover:bg-accent-ink">Log check-in</button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <SectionTitle>Rhythm</SectionTitle>
          <span className="text-sm text-ink-2">{p.rhythmAllSummary}</span>
        </div>
        <div className="flex flex-col gap-5 rounded-lg bg-surface p-[18px] shadow-sm">
          {p.rhythmAll.map((g) => (
            <div key={g.label} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3 text-[13px]"><span className="font-medium">{g.label}</span><span className="text-ink-2">{g.summary}</span></div>
              <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fill,minmax(108px,1fr))]">{g.tiles.map(Tile)}</div>
            </div>
          ))}
        </div>
      </div>

      {p.mix.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>What counted</SectionTitle>
          <div className="flex flex-col gap-3.5 rounded-lg bg-surface p-[18px] shadow-sm">
            {p.mix.map((m) => (
              <div key={m.name} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_32px] items-center gap-3.5">
                <span className="truncate text-[15px] font-medium">{m.name}</span>
                <ProgressBar value={m.count / max} label={m.name} />
                <span className="text-right text-sm text-ink-2">{m.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.goals.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>Linked goals</SectionTitle>
          <div className="flex flex-col gap-2.5">
            {p.goals.map((g) => (
              <button key={g.id} type="button" onClick={g.onOpen} className="flex flex-col gap-3 rounded-md bg-surface px-[18px] py-4 text-left shadow-sm transition-shadow hover:shadow-md">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-[19px] leading-tight">{g.title}</span>
                  <span className="shrink-0 text-sm font-semibold">{Math.round(g.progress * 100)}%</span>
                </span>
                <ProgressBar value={g.progress} size="sm" label={g.title} />
                <span className="text-[13px] text-ink-2">{g.note}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>Recent check-ins</SectionTitle>
          <button type="button" onClick={p.onSeeAll} className="flex h-9 items-center gap-2 px-1 text-sm font-medium text-accent-ink hover:text-ink">See all <ChevronIcon dir="right" size={12} /></button>
        </div>
        <CheckInList groups={p.recent} onOpen={p.onOpenLog} emptyText="No check-ins yet — the first one will show up here." />
      </div>
    </section>
  );
}
