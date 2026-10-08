'use client';

import { CheckInDots } from './HabitCard';
import { ProgressBar } from './ProgressBar';
import { CheckInList, type CheckInGroup } from './CheckInList';
import { SectionTitle } from './Controls';
import { ChevronIcon } from './icons';
import { MonthCalendar, type CalendarWeek } from './MonthHabitRows';
import { ReflectionCard } from './ReflectionCard';

export type HabitDetailScreenProps = {
  name: string;
  targetLabel: string;      // "3× per week"
  periodLabel: string;      // "This week"
  count: number;
  target: number;
  status: string;           // statusLine()
  done: boolean;
  /** Rhythm: one month's dot calendar, stepped with the arrows */
  rhythm: { label: string; summary: string; done: boolean; weeks: CalendarWeek[]; canPrev: boolean; canNext: boolean; onPrev: () => void; onNext: () => void;
    /** This habit's note for the month shown, once it has ended. */
    reflection: string | null };
  rhythmAllSummary: string; // "On target 31 of 52 weeks since May 2026"
  mix: { name: string; count: number }[]; // check-ins by activity, desc
  goals: { id: string; title: string; progress: number; note: string; onOpen: () => void }[];
  recent: CheckInGroup[];   // 3 most recent
  onBack: () => void;
  /** Where Back returns to, e.g. "Today" */
  backLabel?: string;
  onEdit: () => void;
  onLog: () => void;
  onSeeAll: () => void;
  onOpenLog: (logId: string) => void;
};

export function HabitDetailScreen(p: HabitDetailScreenProps) {
  const max = Math.max(1, ...p.mix.map((m) => m.count));
  const navBtn = 'grid size-9 place-items-center rounded-full text-ink-2 transition-opacity hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-35';
  return (
    <section className="flex max-w-[760px] flex-col gap-5 animate-rise wide:gap-7">
      <div className="-mt-2 flex items-center justify-between gap-3">
        <button type="button" onClick={p.onBack} className="flex h-11 items-center gap-2.5 rounded-full pr-3.5 pl-2 text-[15px] text-ink-2 hover:text-ink"><ChevronIcon />{p.backLabel ?? 'Progress'}</button>
        <button type="button" onClick={p.onEdit} className="h-10 rounded-full border border-line bg-surface px-[18px] text-sm font-medium hover:border-accent">Edit</button>
      </div>

      <header className="flex flex-col gap-2">
        <p className="text-sm text-ink-2">{p.targetLabel}</p>
        <h1 className="font-serif text-[38px] leading-[1.08] font-normal tracking-[-.015em]">{p.name}</h1>
      </header>

      <div className="flex flex-wrap items-center gap-[22px] rounded-lg bg-surface p-[22px] shadow-sm">
        <div className="flex min-w-[180px] flex-1 flex-col gap-2.5">
          <span className="text-[13px] font-medium text-ink-2">{p.periodLabel}</span>
          <CheckInDots count={p.count} target={p.target} size="lg" />
          <span className={`text-[17px] leading-snug text-pretty ${p.done ? 'text-accent-ink' : 'text-ink'}`}>{p.status}</span>
        </div>
        <button type="button" onClick={p.onLog} className="h-12 rounded-full bg-accent px-[22px] text-[15px] font-medium text-accent-contrast hover:bg-accent-ink">Log check-in</button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <SectionTitle>Rhythm</SectionTitle>
          <span className="text-sm text-ink-2">{p.rhythmAllSummary}</span>
        </div>
        <div className="flex flex-col gap-4 rounded-lg bg-surface p-[18px] shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous month" onClick={p.rhythm.onPrev} disabled={!p.rhythm.canPrev} className={navBtn}><ChevronIcon size={12} /></button>
              <span className="min-w-[124px] text-center text-[15px] font-medium">{p.rhythm.label}</span>
              <button type="button" aria-label="Next month" onClick={p.rhythm.onNext} disabled={!p.rhythm.canNext} className={navBtn}><ChevronIcon dir="right" size={12} /></button>
            </div>
            <span className={`shrink-0 text-sm ${p.rhythm.done ? 'text-accent-ink' : 'text-ink-2'}`}>{p.rhythm.summary}</span>
          </div>
          <MonthCalendar weeks={p.rhythm.weeks} />
        </div>
        {p.rhythm.reflection && <ReflectionCard plain title={p.rhythm.label} text={p.rhythm.reflection} />}
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
