'use client';

/**
 * Screen layouts. Presentational only — every value and handler comes in as props.
 * app/page.tsx derives the view models from data (mock now, Supabase later).
 */
import { HabitCard, type HabitCardProps } from './HabitCard';
import { ObjectiveCard, type ObjectiveCardProps } from './ObjectiveCard';
import { KeyResultRow, type KeyResultRowProps } from './KeyResultRow';
import { WeekHabitRow, type WeekDay } from './WeekHabitRow';
import { CheckInList, type CheckInGroup } from './CheckInList';
import { EmptyState } from './EmptyState';
import { ProgressBar } from './ProgressBar';
import { AddTile, Segmented, SectionTitle } from './Controls';
import { MonthCalendarCard, WeekTilesRow, type CalendarDay, type WeekTile } from './MonthHabitRows';
import { ChevronIcon } from './icons';

const grid = 'grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]';
const h1 = 'font-serif text-[38px] leading-[1.08] font-normal tracking-[-.015em]';

type HabitVM = HabitCardProps & { id: string };

/* ── Today ─────────────────────────────────────────────── */
export type TodayScreenProps = {
  dateLabel: string;       // "Wednesday, 23 September"
  greeting: string;        // "Good morning"
  /** "2 of 3 weekly habits done" + " · 4 days left in the week" */
  summary: { main: string; rest: string } | null;
  weekly: HabitVM[];
  monthly: HabitVM[];
  suggestions: string[];
  onAddHabit: (suggestedName?: string) => void;
  headerAction?: React.ReactNode; // theme toggle on mobile
};

export function TodayScreen(p: TodayScreenProps) {
  const empty = !p.weekly.length && !p.monthly.length;
  return (
    <section className="flex flex-col gap-8 animate-rise">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-sm text-ink-2">{p.dateLabel}</p>
          <h1 className={h1}>{p.greeting}</h1>
          {p.summary && !empty && (
            <p className="mt-1 text-base leading-normal text-pretty text-ink-2"><span className="font-medium text-ink">{p.summary.main}</span>{p.summary.rest}</p>
          )}
        </div>
        {p.headerAction}
      </header>

      {p.weekly.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>This week</SectionTitle>
          <div className={grid}>{p.weekly.map(({ id, ...h }) => <HabitCard key={id} {...h} />)}</div>
        </div>
      )}
      {p.monthly.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>This month</SectionTitle>
          <div className={grid}>{p.monthly.map(({ id, ...h }) => <HabitCard key={id} {...h} />)}</div>
        </div>
      )}

      {empty ? (
        <EmptyState
          title="No habits yet"
          body="Pick one thing you’d like to do a few times a week. Count it however suits you — there’s no streak to break."
          actionLabel="Add your first habit"
          onAction={() => p.onAddHabit()}
        >
          <div className="mt-[18px] flex flex-col items-center gap-2.5">
            <span className="text-[13px] text-ink-2">Or start with one of these</span>
            <div className="flex flex-wrap justify-center gap-2">
              {p.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => p.onAddHabit(s)} className="h-10 rounded-full border border-line bg-surface px-4 text-sm hover:border-accent">{s}</button>
              ))}
            </div>
          </div>
        </EmptyState>
      ) : (
        <div className={grid}><AddTile label="Add a habit" onClick={() => p.onAddHabit()} /></div>
      )}
    </section>
  );
}

/* ── Progress (Week / Month) ───────────────────────────── */
export type ProgressView = 'week' | 'month';
export type MonthData = {
  weekly: { id: string; name: string; target: number; tiles: WeekTile[]; onOpen?: () => void }[];
  monthly: { id: string; name: string; count: number; target: number; status: string; done: boolean; days: CalendarDay[]; onOpen?: () => void }[];
  groups: CheckInGroup[];
};
export type WeekScreenProps = {
  view: ProgressView;
  onViewChange: (v: ProgressView) => void;
  month: MonthData;
  rangeLabel: string;   // "21 – 27 September" | "September 2026"
  title: string;        // "This week" | "Last week" | "This month" | "July"
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  rows: { id: string; name: string; countLabel: string; days: WeekDay[]; onOpen?: () => void }[];
  groups: CheckInGroup[];
  onOpenLog: (logId: string) => void;
  /** "See all" → Check-ins page. `groups` / `month.groups` are a 3-item preview. */
  onSeeAll: () => void;
  onAddHabit: () => void;
};

export function WeekScreen(p: WeekScreenProps) {
  const navBtn = 'grid size-11 place-items-center rounded-full bg-surface shadow-sm transition-opacity';
  return (
    <section className="flex flex-col gap-7 animate-rise">
      <Segmented<ProgressView> options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} value={p.view} onChange={p.onViewChange} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink-2">{p.rangeLabel}</p>
          <h1 className={h1}>{p.title}</h1>
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label={`Previous ${p.view}`} onClick={p.onPrev} className={navBtn}><ChevronIcon /></button>
          <button type="button" aria-label={`Next ${p.view}`} onClick={p.onNext} disabled={!p.canGoNext} className={`${navBtn} disabled:pointer-events-none disabled:opacity-35`}><ChevronIcon dir="right" /></button>
        </div>
      </header>

      {p.rows.length === 0 ? (
        <EmptyState
          art={<div className="grid grid-cols-7 gap-2">{[0, 1, 0, 1, 0, 0, 1].map((on, i) => <span key={i} className={`size-3.5 rounded-full ${on ? 'bg-accent' : 'bg-ring-track'}`} />)}</div>}
          title="Your week lives here"
          body="Once you add a habit, every check-in lands on its day — an easy way to see how the week is shaping up."
          actionLabel="Add a habit"
          onAction={p.onAddHabit}
        />
      ) : p.view === 'month' ? (
        <>
          {p.month.weekly.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionTitle>Weekly habits</SectionTitle>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))]">
                {p.month.weekly.map(({ id, ...r }) => <WeekTilesRow key={id} {...r} />)}
              </div>
            </div>
          )}
          {p.month.monthly.length > 0 && (
            <div className="flex flex-col gap-3">
              <SectionTitle>Monthly habits</SectionTitle>
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))]">
                {p.month.monthly.map(({ id, ...h }) => <MonthCalendarCard key={id} {...h} />)}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <RecentHeader onSeeAll={p.onSeeAll} />
            <CheckInList groups={p.month.groups} onOpen={p.onOpenLog} emptyText="A quiet month so far — check-ins will show up here." />
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,420px),1fr))]">
            {p.rows.map(({ id, ...r }) => <WeekHabitRow key={id} {...r} />)}
          </div>
          <div className="flex flex-col gap-3">
            <RecentHeader onSeeAll={p.onSeeAll} />
            <CheckInList groups={p.groups} onOpen={p.onOpenLog} emptyText="A quiet week so far — check-ins will show up here." />
          </div>
        </>
      )}
    </section>
  );
}

/* ── Check-ins (full history) ───────────────────────────── */
function RecentHeader({ onSeeAll }: { onSeeAll: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <SectionTitle>Recent check-ins</SectionTitle>
      <button type="button" onClick={onSeeAll} className="flex h-9 items-center gap-2 px-1 text-sm font-medium text-accent-ink hover:text-ink">See all <ChevronIcon dir="right" size={12} /></button>
    </div>
  );
}

export type CheckInFilter = 'all' | 'notes' | string; // string = habit id
export type CheckInsScreenProps = {
  backLabel?: string;  // optional back link (unused when Check-ins is a tab)
  onBack?: () => void;
  sub: string;        // "124 check-ins so far"
  filter: CheckInFilter;
  filters: { value: CheckInFilter; label: string }[]; // All · each habit · With notes
  onFilter: (f: CheckInFilter) => void;
  months: { label: string; days: CheckInGroup[] }[];
  remaining: number;  // > 0 shows "Show earlier"
  onMore: () => void;
  onOpenLog: (logId: string) => void;
};

export function CheckInsScreen(p: CheckInsScreenProps) {
  return (
    <section className="flex max-w-[680px] flex-col gap-7 animate-rise">
      {p.onBack && (
        <div className="-mt-2">
          <button type="button" onClick={p.onBack} className="flex h-11 items-center gap-2.5 rounded-full pr-3.5 pl-2 text-[15px] text-ink-2 hover:text-ink"><ChevronIcon />{p.backLabel}</button>
        </div>
      )}
      <header className="flex flex-col gap-2">
        <p className="text-sm text-ink-2">{p.sub}</p>
        <h1 className={h1}>Check-ins</h1>
      </header>
      <div role="radiogroup" aria-label="Filter" className="flex flex-wrap gap-2">
        {p.filters.map((f) => {
          const on = f.value === p.filter;
          return (
            <button key={f.value} type="button" role="radio" aria-checked={on} onClick={() => p.onFilter(f.value)}
              className={`h-10 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors ${on ? 'border-accent bg-accent text-accent-contrast' : 'border-line bg-surface text-ink'}`}>
              {f.label}
            </button>
          );
        })}
      </div>
      {p.months.length === 0 ? (
        <p className="rounded-lg border-[1.5px] border-dashed border-line px-5 py-7 text-center text-[15px] text-ink-2">
          {p.filter === 'notes' ? 'No notes yet. Add one when a session feels worth remembering.' : 'Nothing logged here yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-7">
          {p.months.map((m) => (
            <div key={m.label} className="flex flex-col gap-3">
              <SectionTitle>{m.label}</SectionTitle>
              <CheckInList groups={m.days} onOpen={p.onOpenLog} emptyText="" />
            </div>
          ))}
          {p.remaining > 0 && (
            <button type="button" onClick={p.onMore} className="h-11 self-center rounded-full border border-line bg-surface px-[22px] text-sm font-medium hover:border-accent">
              Show earlier · {p.remaining} more
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* ── Goals ─────────────────────────────────────────────── */
export type GoalsScreenProps = {
  sub: string; // "3 objectives in motion"
  objectives: (ObjectiveCardProps & { id: string })[];
  onAddObjective: () => void;
};

export function GoalsScreen(p: GoalsScreenProps) {
  return (
    <section className="flex flex-col gap-8 animate-rise">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-ink-2">{p.sub}</p>
        <h1 className={h1}>Goals</h1>
      </header>
      {p.objectives.length === 0 ? (
        <EmptyState
          art={
            <div className="flex w-[220px] flex-col gap-2.5">
              <div className="h-2 overflow-hidden rounded-full bg-ring-track"><div className="h-full w-[62%] rounded-full bg-accent" /></div>
              <div className="mx-auto h-2 w-[78%] overflow-hidden rounded-full bg-ring-track"><div className="h-full w-[34%] rounded-full bg-accent opacity-60" /></div>
            </div>
          }
          title="No goals yet"
          body="Objectives are the bigger things. Give one a timeframe — one, three or six months — and a few key results to see it moving."
          actionLabel="Set an objective"
          onAction={p.onAddObjective}
        />
      ) : (
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))]">
          {p.objectives.map(({ id, ...o }) => <ObjectiveCard key={id} {...o} />)}
          <AddTile label="New objective" onClick={p.onAddObjective} className="min-h-[120px]" />
        </div>
      )}
    </section>
  );
}

/* ── Goal detail ───────────────────────────────────────── */
export type GoalDetailScreenProps = {
  title: string;
  timeframeLabel: string;  // "3 months"
  rangeLabel: string;      // "14 Jul – 14 Oct"
  timeLeftLabel: string;   // "3 weeks left"
  positionLabel: string;   // "Week 10 of 13"
  progress: number;        // 0..1
  keyResults: (KeyResultRowProps & { id: string })[];
  linkedHabits: HabitVM[];
  onBack: () => void;
  onEdit: () => void;
};

export function GoalDetailScreen(p: GoalDetailScreenProps) {
  return (
    <section className="flex max-w-[760px] flex-col gap-7 animate-rise">
      <div className="-mt-2 flex items-center justify-between gap-3">
        <button type="button" onClick={p.onBack} className="flex h-11 items-center gap-2.5 rounded-full pr-3.5 pl-2 text-[15px] text-ink-2 hover:text-ink"><ChevronIcon />Goals</button>
        <button type="button" onClick={p.onEdit} className="h-10 rounded-full border border-line bg-surface px-[18px] text-sm font-medium hover:border-accent">Edit</button>
      </div>

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-full bg-surface-2 px-2.5 py-[5px] text-xs font-medium text-ink-2">{p.timeframeLabel}</span>
          <span className="text-[13px] text-ink-2">{p.rangeLabel}</span>
        </div>
        <h1 className="font-serif text-4xl leading-[1.12] font-normal tracking-[-.015em] text-pretty">{p.title}</h1>
      </header>

      <div className="flex flex-col gap-4 rounded-lg bg-surface p-[22px] shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <span className="font-serif text-[52px] leading-[.9] tracking-[-.02em]">{Math.round(p.progress * 100)}%</span>
          <div className="flex flex-col items-end gap-[3px] text-sm text-ink-2">
            <span className="font-medium text-ink">{p.timeLeftLabel}</span>
            <span>{p.positionLabel}</span>
          </div>
        </div>
        <ProgressBar value={p.progress} size="lg" label="Objective progress" />
        <p className="text-[13px] text-ink-2">Average of {p.keyResults.length} key result{p.keyResults.length === 1 ? '' : 's'}</p>
      </div>

      <div className="flex flex-col gap-3">
        <SectionTitle>Key results</SectionTitle>
        <div className="flex flex-col gap-2.5">{p.keyResults.map(({ id, ...k }) => <KeyResultRow key={id} {...k} />)}</div>
      </div>

      {p.linkedHabits.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionTitle>Linked habits</SectionTitle>
          <div className={grid}>{p.linkedHabits.map(({ id, ...h }) => <HabitCard key={id} {...h} />)}</div>
        </div>
      )}
    </section>
  );
}
