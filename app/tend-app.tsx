'use client';

/**
 * App shell + state container.
 *
 * Server data arrives as props from app/page.tsx. Every mutation goes through a
 * Server Action in lib/actions.ts and is mirrored into `useOptimistic` state so
 * the UI moves on tap; the action calls revalidatePath('/'), which re-renders
 * this component with fresh rows and retires the optimistic entry.
 */
import { useMemo, useOptimistic, useRef, useState, useTransition } from 'react';
import * as A from '@/lib/actions';
import type { Dashboard } from '@/lib/queries';
import * as P from '@/lib/progress';
import type { Habit, KeyResult, Log, Objective, Period, Timeframe } from '@/lib/types';
import { BottomNav, SideNav, type Tab } from '@/components/BottomNav';
import { LogSheet } from '@/components/LogSheet';
import { HabitForm } from '@/components/HabitForm';
import { ObjectiveForm } from '@/components/ObjectiveForm';
import { emptyHabitDraft, emptyKeyResult, emptyObjectiveDraft, type HabitDraft, type ObjectiveDraft } from '@/lib/drafts';
import { Toast } from '@/components/Toast';
import { HabitDetailScreen } from '@/components/HabitDetailScreen';
import { CheckInsScreen, GoalDetailScreen, GoalsScreen, TodayScreen, WeekScreen, type CheckInFilter } from '@/components/screens';
import type { KeyResultRowProps, PeriodCell } from '@/components/KeyResultRow';

const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const SUGGESTIONS = ['Physical activity', 'Meditation', 'Reading', 'Call family'];

type LogSheetState = { mode: 'create' | 'edit'; habitId: string; logId?: string; activityId: string | null; note: string; date: string } | null;

type OptimisticOp =
  | { kind: 'add'; log: Log }
  | { kind: 'update'; id: string; activity_id: string | null; note: string | null; logged_at?: string }
  | { kind: 'remove'; id: string };

export default function TendApp({ data }: { data: Dashboard }) {
  const { habits, activities, objectives, keyResults } = data;

  // Logs are the only rows that change often enough to need optimistic echo.
  const [logs, applyOptimistic] = useOptimistic(data.logs, (state: Log[], op: OptimisticOp) => {
    if (op.kind === 'add') return [...state, op.log];
    if (op.kind === 'remove') return state.filter((l) => l.id !== op.id);
    return state.map((l) => (l.id === op.id
      ? { ...l, activity_id: op.activity_id, note: op.note, logged_at: op.logged_at ?? l.logged_at }
      : l));
  });

  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Optimistic state only survives inside a transition, so each action runs in one.
  const run = (op: OptimisticOp | null, fn: () => Promise<unknown>) => {
    startTransition(async () => {
      if (op) applyOptimistic(op);
      try {
        await fn();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      }
    });
  };

  const [tab, setTab] = useState<Tab>('today');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [monthOffset, setMonthOffset] = useState(0);
  const [habitId, setHabitId] = useState<string | null>(null);
  const [history, setHistory] = useState<{ filter: CheckInFilter; limit: number }>({ filter: 'all', limit: 40 });
  const openHistory = (filter: CheckInFilter) => { setHistory({ filter, limit: 40 }); setTab('checkins'); setGoalId(null); };
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [sheet, setSheet] = useState<LogSheetState>(null);
  const [toast, setToast] = useState<{ text: string; logId: string } | null>(null);
  const [habitForm, setHabitForm] = useState<{ id?: string; draft: HabitDraft } | null>(null);
  const [objForm, setObjForm] = useState<{ id?: string; draft: ObjectiveDraft } | null>(null);

  const now = new Date();
  const ctx = { habits, logs };
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  /* ── mutations ── */
  // Undo needs the real row id, which only exists after the insert resolves.
  const pendingUndo = useRef<Promise<string> | null>(null);

  /** Mirrors resolveLoggedAt in lib/actions.ts so optimistic rows land in the right period. */
  const loggedAtFor = (date?: string | null): string => {
    if (!date) return new Date().toISOString();
    const day = P.parseDay(date);
    if (P.toDateKey(day) === P.toDateKey(now)) return new Date().toISOString();
    const midday = new Date(day);
    midday.setHours(12, 0, 0, 0);
    return midday.toISOString();
  };

  const optimisticLog = (habitId: string, activityId: string | null, note: string | null, date?: string | null): Log => ({
    id: uid('pending'), habit_id: habitId, activity_id: activityId, note, logged_at: loggedAtFor(date),
  });

  const quickLog = (h: Habit) => {
    const aId = P.lastActivityId(h.id, logs, activities);
    const draft = optimisticLog(h.id, aId, null);
    const label = activities.find((a) => a.id === aId)?.name ?? h.name;

    run({ kind: 'add', log: draft }, async () => {
      const promise = A.addLog(h.id, aId, null);
      pendingUndo.current = promise;
      const realId = await promise;
      setToast({ text: `${label} logged`, logId: realId });
      window.setTimeout(() => setToast((t) => (t?.logId === realId ? null : t)), 4000);
    });
  };

  const undoLog = async (logId: string) => {
    setToast(null);
    run({ kind: 'remove', id: logId }, () => A.deleteLog(logId));
  };

  const saveSheet = () => {
    if (!sheet) return;
    const note = sheet.note.trim() || null;
    const { date } = sheet;
    if (sheet.mode === 'create') {
      run({ kind: 'add', log: optimisticLog(sheet.habitId, sheet.activityId, note, date) },
        () => A.addLog(sheet.habitId, sheet.activityId, note, date));
    } else if (sheet.logId) {
      run({ kind: 'update', id: sheet.logId, activity_id: sheet.activityId, note, logged_at: loggedAtFor(date) },
        () => A.updateLog(sheet.logId!, sheet.activityId, note, date));
    }
    setSheet(null);
  };

  const saveHabit = () => {
    if (!habitForm) return;
    const { id, draft } = habitForm;
    run(null, () => A.saveHabit(id ?? null, draft));
    setHabitForm(null);
  };
  const deleteHabit = (id: string) => {
    run(null, () => A.deleteHabit(id));
    setHabitForm(null);
    setHabitId(null);
  };

  const saveObjective = () => {
    if (!objForm) return;
    const { id, draft } = objForm;
    // Habit-linked KRs need a habit; fall back to the first one as the form does.
    const normalised = {
      ...draft,
      key_results: draft.key_results.map((k) => (k.type === 'habit' && !k.habit_id
        ? { ...k, habit_id: habits[0]?.id ?? null }
        : k)),
    };
    run(null, () => A.saveObjective(id ?? null, normalised));
    setObjForm(null);
  };
  const deleteObjective = (id: string) => {
    run(null, () => A.deleteObjective(id));
    setObjForm(null);
    setGoalId(null);
  };
  const updateKr = (id: string, patch: { done?: boolean; current_value?: number }) =>
    run(null, () => A.updateKeyResult(id, patch));

  /* ── openers ── */
  const openHabitForm = (h?: Habit, suggested?: string) =>
    setHabitForm(h
      ? { id: h.id, draft: { name: h.name, target: h.target, period: h.period, activities: activities.filter((a) => a.habit_id === h.id).map(({ id, name }) => ({ id, name })) } }
      : { draft: { ...emptyHabitDraft, name: suggested ?? '' } });
  const openObjForm = (o?: Objective) =>
    setObjForm(o
      ? { id: o.id, draft: { title: o.title, timeframe_months: o.timeframe_months, key_results: keyResults.filter((k) => k.objective_id === o.id).sort((a, b) => a.sort_order - b.sort_order).map((k) => ({ ...emptyKeyResult(k.type), ...k, unit: k.type === 'number' ? k.unit ?? '' : '' })) } }
      : { draft: emptyObjectiveDraft() });

  /* ── view models ── */
  const habitVM = (h: Habit) => {
    const st = P.habitStats(h, logs, now);
    return {
      id: h.id, name: h.name, count: st.count, target: st.target, done: st.done, status: P.statusLine(st),
      onLog: () => quickLog(h),
      onOpen: () => setSheet({ mode: 'create', habitId: h.id, activityId: P.lastActivityId(h.id, logs, activities), note: '', date: P.toDateKey(now) }),
    };
  };
  const sorted = [...habits].sort((a, b) => a.sort_order - b.sort_order);
  const weekly = sorted.filter((h) => h.period === 'week').map(habitVM);
  const monthly = sorted.filter((h) => h.period === 'month').map(habitVM);
  const weekLeft = P.daysLeft(P.periodRange('week', now), now);
  const hour = now.getHours();

  const weekVM = useMemo(() => {
    const ref = P.addDays(now, weekOffset * 7);
    const range = P.periodRange('week', ref);
    const today = P.startOfDay(now).getTime();
    const rows = sorted.map((h) => {
      const inWeek = P.logsFor(logs, h.id, range);
      const days = LETTERS.map((letter, i) => {
        const d = P.addDays(range.start, i);
        const t = d.getTime();
        return { letter, count: inWeek.filter((l: Log) => P.startOfDay(l.logged_at).getTime() === t).length, isToday: t === today, isFuture: t > today };
      });
      const countLabel = h.period === 'week'
        ? `${inWeek.length} of ${h.target}`
        : `${inWeek.length} this week · ${P.logsFor(logs, h.id, P.periodRange('month', ref)).length} of ${h.target} this month`;
      return { id: h.id, name: h.name, countLabel, days, onOpen: () => setHabitId(h.id) };
    });
    return { rangeLabel: P.formatRange(range.start, P.addDays(range.end, -1)), title: weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${-weekOffset} weeks ago`, rows, groups: previewGroups(groupByDay(range)) };
  }, [weekOffset, logs, habits, activities]); // eslint-disable-line react-hooks/exhaustive-deps

  function groupByDay(range: { start: Date; end: Date } | null, filter: CheckInFilter = 'all') {
    const inRange = logs.filter((l) => { const t = new Date(l.logged_at); return !range || (t >= range.start && t < range.end); })
      .filter((l) => filter === 'all' || (filter === 'notes' ? !!l.note : l.habit_id === filter))
      .sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at));
    const byDay = new Map<string, Log[]>();
    inRange.forEach((l) => { const k = P.toDateKey(l.logged_at); byDay.set(k, [...(byDay.get(k) ?? []), l]); });
    return [...byDay.entries()].map(([k, ls]) => ({
      key: k,
      label: P.parseDay(k).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' }),
      items: ls.map((l) => ({
        id: l.id,
        activity: activities.find((a) => a.id === l.activity_id)?.name ?? 'Check-in',
        habit: habits.find((h) => h.id === l.habit_id)?.name ?? '',
        note: l.note,
        time: new Date(l.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      })),
    }));
  }

  /** First 3 check-ins, keeping their day groups. */
  function previewGroups(groups: ReturnType<typeof groupByDay>, n = 3) {
    const out: typeof groups = [];
    for (const g of groups) { if (n <= 0) break; out.push({ ...g, items: g.items.slice(0, n) }); n -= g.items.length; }
    return out;
  }

  /* Check-ins page: filtered, grouped by month → day, paged 40 at a time. */
  const historyVM = (() => {
    if (!history) return null;
    const days = groupByDay(null, history.filter);
    let left = history.limit;
    const months: { label: string; days: typeof days }[] = [];
    for (const d of days) {
      if (left <= 0) break;
      const g = { ...d, items: d.items.slice(0, left) };
      left -= g.items.length;
      const label = P.parseDay(d.key).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
      const m = months.find((x) => x.label === label);
      if (m) m.days.push(g); else months.push({ label, days: [g] });
    }
    const total = days.reduce((n, d) => n + d.items.length, 0);
    return { months, total, remaining: Math.max(0, total - history.limit) };
  })();

  /* Habit detail: current period, last 12 weeks / 6 months, activity mix, linked goals, recent check-ins. */
  const habitDetail = (() => {
    const h = habits.find((x) => x.id === habitId);
    if (!h) return null;
    const st = P.habitStats(h, logs, now);
    const mine = logs.filter((l) => l.habit_id === h.id);
    const first = new Date(Math.min(+new Date(h.created_at), ...mine.map((l) => +new Date(l.logged_at))));
    const cur = P.periodRange(h.period, now);
    const all = P.periodsBetween(h.period, first, cur.end);
    const groups = new Map<string, { label: string; summary: string; tiles: { count: number; state: 'hit' | 'miss' | 'current'; label: string; title: string }[] }>();
    let allHits = 0;
    all.forEach((p) => {
      const count = P.logsFor(logs, h.id, p).length;
      const state = count >= h.target ? 'hit' as const : +p.start === +cur.start ? 'current' as const : 'miss' as const;
      if (state === 'hit') allHits++;
      const label = h.period === 'week' ? p.start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : String(p.start.getFullYear());
      const g = groups.get(label) ?? { label, summary: '', tiles: [] };
      const pe = P.addDays(p.end, -1), mo = (d: Date) => d.toLocaleDateString('en-GB', { month: 'short' }).slice(0, 3);
      const name = h.period === 'week'
        ? (p.start.getMonth() === pe.getMonth() ? `${p.start.getDate()}–${pe.getDate()} ${mo(pe)}` : `${p.start.getDate()} ${mo(p.start)}–${pe.getDate()} ${mo(pe)}`)
        : p.start.toLocaleDateString('en-GB', { month: 'long' });
      const isCur = +p.start === +cur.start;
      g.tiles.push({ count, state, label: isCur ? (h.period === 'week' ? 'This week' : 'This month') : name, title: `${name} · ${count} of ${h.target} check-ins` });
      groups.set(label, g);
    });
    const rhythmAll = [...groups.values()].reverse().map((g) => ({ ...g, summary: `${g.tiles.filter((t) => t.state === 'hit').length} of ${g.tiles.length} ${h.period}s on target` }));
    const rhythmAllSummary = `On target ${allHits} of ${all.length} ${h.period}s since ${first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
    const byAct = new Map<string, number>();
    mine.forEach((l) => { const n = activities.find((a) => a.id === l.activity_id)?.name ?? 'Check-in'; byAct.set(n, (byAct.get(n) ?? 0) + 1); });
    const goalKrs = keyResults.filter((k) => k.type === 'habit' && k.habit_id === h.id);
    return {
      name: h.name, targetLabel: `${h.target}× per ${h.period}`, periodLabel: h.period === 'week' ? 'This week' : 'This month',
      count: st.count, target: st.target, status: P.statusLine(st), done: st.done,
      rhythmAll, rhythmAllSummary,
      mix: [...byAct.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })),
      goals: goalKrs.flatMap((kr) => {
        const o = objectives.find((x) => x.id === kr.objective_id);
        if (!o) return [];
        return [{ id: o.id, title: o.title, progress: P.objectiveProgress(o, keyResults.filter((k) => k.objective_id === o.id), ctx, now), note: `Key result: ${kr.title} · ${P.timeLeft(P.parseDay(o.end_date), now)}`, onOpen: () => { setTab('goals'); setGoalId(o.id); setHabitId(null); } }];
      }),
      recent: previewGroups(groupByDay(null, h.id)),
      onBack: () => setHabitId(null),
      onEdit: () => openHabitForm(h),
      onLog: () => setSheet({ mode: 'create', habitId: h.id, activityId: P.lastActivityId(h.id, logs, activities), note: '', date: P.toDateKey(now) }),
      onSeeAll: () => openHistory(h.id),
    };
  })();

  /* Month view: weekly habits → one tile per overlapping week; monthly habits → dot calendar. */
  const monthVM = (() => {
    const range = P.periodRange('month', new Date(now.getFullYear(), now.getMonth() + monthOffset, 1));
    const y = range.start.getFullYear(), m = range.start.getMonth(), nDays = new Date(y, m + 1, 0).getDate();
    const curWk = P.startOfWeek(now).getTime(), today = P.startOfDay(now).getTime();
    const weeks = P.periodsBetween('week', range.start, range.end);
    const weekly = sorted.filter((h) => h.period === 'week').map((h) => ({
      id: h.id, name: h.name, target: h.target, onOpen: () => setHabitId(h.id),
      tiles: weeks.map((w) => {
        const count = P.logsFor(logs, h.id, w).length, t = w.start.getTime(), we = P.addDays(w.start, 6);
        const state = t > curWk ? 'future' as const : count >= h.target ? 'hit' as const : t === curWk ? 'current' as const : 'miss' as const;
        return { count, state, label: `${w.start.getDate()}–${we.getDate()}`, title: `${P.formatDay(w.start)} – ${P.formatDay(we)}` };
      }),
    }));
    const lead = (range.start.getDay() + 6) % 7;
    const monthly = sorted.filter((h) => h.period === 'month').map((h) => {
      const ml = P.logsFor(logs, h.id, range), count = ml.length;
      const days = [
        ...Array.from({ length: lead }, () => null),
        ...Array.from({ length: nDays }, (_, i) => {
          const d = new Date(y, m, i + 1), k = P.toDateKey(d);
          return { count: ml.filter((l: Log) => P.toDateKey(l.logged_at) === k).length, isToday: d.getTime() === today, isFuture: d.getTime() > today, title: P.formatDay(d) };
        }),
      ];
      const status = monthOffset === 0 ? P.statusLine(P.habitStats(h, logs, now)) : count >= h.target ? `${count} of ${h.target} — done that month` : `${count} of ${h.target}`;
      return { id: h.id, name: h.name, count, target: h.target, status, done: count >= h.target, days, onOpen: () => setHabitId(h.id) };
    });
    return {
      title: monthOffset === 0 ? 'This month' : monthOffset === -1 ? 'Last month' : range.start.toLocaleDateString('en-GB', { month: 'long' }),
      rangeLabel: range.start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
      data: { weekly, monthly, groups: previewGroups(groupByDay(range)) },
    };
  })();

  const krRow = (kr: KeyResult, o: Objective): KeyResultRowProps & { id: string } => {
    if (kr.type === 'milestone') return { id: kr.id, type: 'milestone', title: kr.title, done: kr.done, onToggle: () => updateKr(kr.id, { done: !kr.done }) };
    if (kr.type === 'number') return { id: kr.id, type: 'number', title: kr.title, current: kr.current_value, target: kr.target_value, unit: kr.unit, onChange: (v) => updateKr(kr.id, { current_value: v }) };
    const pr = P.keyResultProgress(kr, o, ctx, now);
    const h = pr.habit ?? null;
    return {
      id: kr.id, type: 'habit', title: kr.title, habitName: h?.name ?? null, habitTarget: h?.target ?? 0, period: h?.period ?? 'week',
      hits: pr.hits ?? 0, targetPeriods: kr.target_periods,
      cells: (pr.cells ?? []).map((c): PeriodCell => ({ state: c.state as PeriodCell['state'], title: `${P.formatDay(c.start)} · ${c.count}` })),
    };
  };

  const goal = objectives.find((o) => o.id === goalId);
  const tfLabel = (m: number) => `${m} month${m === 1 ? '' : 's'}`;

  const themeBtn = (
    <button type="button" onClick={toggleTheme} aria-label="Toggle dark mode" className="grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-sm wide:hidden">
      <span className="size-4 rounded-full border-[1.5px] border-current" style={{ background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)' }} />
    </button>
  );
  const sheetHabit = habits.find((h) => h.id === sheet?.habitId);
  const sheetLog = logs.find((l) => l.id === sheet?.logId);
  const editingHabit = habits.find((h) => h.id === habitForm?.id);

  return (
    <div className="flex min-h-screen bg-bg text-ink">
      <SideNav active={tab} onChange={(t) => { setTab(t); setGoalId(null); setHabitId(null); setHistory({ filter: 'all', limit: 40 }); }} onToggleTheme={toggleTheme} themeLabel={theme === 'light' ? 'Dark mode' : 'Light mode'} />

      <main className="flex min-w-0 flex-1 justify-center px-[clamp(20px,5vw,56px)] pt-[clamp(28px,5vw,56px)] pb-[132px]">
        <div className="w-full max-w-[1040px]">
          {tab === 'today' && (
            <TodayScreen
              dateLabel={now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              greeting={hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'}
              summary={weekly.length ? { main: `${weekly.filter((h) => h.done).length} of ${weekly.length} weekly habits done`, rest: ` · ${weekLeft} day${weekLeft === 1 ? '' : 's'} left in the week` } : null}
              weekly={weekly} monthly={monthly} suggestions={SUGGESTIONS}
              onAddHabit={(name) => openHabitForm(undefined, name)}
              headerAction={themeBtn}
            />
          )}
          {tab === 'checkins' && historyVM && (
            <CheckInsScreen
              sub={history.filter === 'all' ? `${historyVM.total} check-ins so far` : history.filter === 'notes' ? `${historyVM.total} with a note` : `${historyVM.total} ${habits.find((h) => h.id === history.filter)?.name.toLowerCase() ?? ''} check-ins`}
              filter={history.filter}
              filters={[{ value: 'all', label: 'All' }, ...sorted.map((h) => ({ value: h.id, label: h.name })), { value: 'notes', label: 'With notes' }]}
              onFilter={(filter) => setHistory({ filter, limit: 40 })}
              months={historyVM.months}
              remaining={historyVM.remaining}
              onMore={() => setHistory((h) => ({ ...h, limit: h.limit + 40 }))}
              onOpenLog={(id) => { const l = logs.find((x) => x.id === id); if (l) setSheet({ mode: 'edit', habitId: l.habit_id, logId: l.id, activityId: l.activity_id, note: l.note ?? '', date: P.toDateKey(l.logged_at) }); }}
            />
          )}
          {tab === 'week' && habitDetail && (
            <HabitDetailScreen
              {...habitDetail}
              onOpenLog={(id) => { const l = logs.find((x) => x.id === id); if (l) setSheet({ mode: 'edit', habitId: l.habit_id, logId: l.id, activityId: l.activity_id, note: l.note ?? '', date: P.toDateKey(l.logged_at) }); }}
            />
          )}
          {tab === 'week' && !habitDetail && (
            <WeekScreen
              {...weekVM}
              onSeeAll={() => openHistory('all')}
              view={view}
              onViewChange={setView}
              month={monthVM.data}
              {...(view === 'month' ? { title: monthVM.title, rangeLabel: monthVM.rangeLabel } : {})}
              canGoNext={(view === 'month' ? monthOffset : weekOffset) < 0}
              onPrev={() => (view === 'month' ? setMonthOffset((x) => x - 1) : setWeekOffset((w) => w - 1))}
              onNext={() => (view === 'month' ? setMonthOffset((x) => Math.min(0, x + 1)) : setWeekOffset((w) => Math.min(0, w + 1)))}
              onOpenLog={(id) => { const l = logs.find((x) => x.id === id); if (l) setSheet({ mode: 'edit', habitId: l.habit_id, logId: l.id, activityId: l.activity_id, note: l.note ?? '', date: P.toDateKey(l.logged_at) }); }}
              onAddHabit={() => openHabitForm()}
            />
          )}
          {tab === 'goals' && !goal && (
            <GoalsScreen
              sub={objectives.length ? `${objectives.length} objective${objectives.length === 1 ? '' : 's'} in motion` : 'Bigger things, a few months at a time'}
              objectives={objectives.map((o) => {
                const krs = keyResults.filter((k) => k.objective_id === o.id);
                return {
                  id: o.id, title: o.title, timeframeLabel: tfLabel(o.timeframe_months), timeLeftLabel: P.timeLeft(P.parseDay(o.end_date), now),
                  progress: P.objectiveProgress(o, krs, ctx, now), keyResultCount: krs.length, onOpen: () => setGoalId(o.id),
                };
              })}
              onAddObjective={() => openObjForm()}
            />
          )}
          {tab === 'goals' && goal && (() => {
            const krs = keyResults.filter((k) => k.objective_id === goal.id).sort((a, b) => a.sort_order - b.sort_order);
            const start = P.parseDay(goal.start_date), end = P.parseDay(goal.end_date);
            const weeks = P.periodsBetween('week', start, end).length;
            const wk = Math.min(weeks, Math.floor((P.startOfDay(now).getTime() - P.startOfWeek(start).getTime()) / (7 * P.DAY_MS)) + 1);
            const linkedIds = [...new Set(krs.flatMap((k) => (k.type === 'habit' ? [k.habit_id] : [])))];
            return (
              <GoalDetailScreen
                title={goal.title} timeframeLabel={tfLabel(goal.timeframe_months)}
                rangeLabel={`${P.formatDay(start)} – ${P.formatDay(end)}`}
                timeLeftLabel={P.timeLeft(end, now)} positionLabel={`Week ${wk} of ${weeks}`}
                progress={P.objectiveProgress(goal, krs, ctx, now)}
                keyResults={krs.map((k) => krRow(k, goal))}
                linkedHabits={habits.filter((h) => linkedIds.includes(h.id)).map(habitVM)}
                onBack={() => setGoalId(null)} onEdit={() => openObjForm(goal)}
              />
            );
          })()}
        </div>
      </main>

      <BottomNav active={tab} onChange={(t) => { setTab(t); setGoalId(null); setHabitId(null); setHistory({ filter: 'all', limit: 40 }); }} />

      {error && !toast && (
        <Toast text={error} onUndo={() => setError(null)} />
      )}

      {toast && (
        <Toast
          text={toast.text}
          onUndo={() => undoLog(toast.logId)}
          onNote={() => { const l = logs.find((x) => x.id === toast.logId); if (l) setSheet({ mode: 'edit', habitId: l.habit_id, logId: l.id, activityId: l.activity_id, note: '', date: P.toDateKey(l.logged_at) }); setToast(null); }}
        />
      )}

      <LogSheet
        open={!!sheet}
        mode={sheet?.mode}
        habitName={sheetHabit?.name ?? ''}
        subtitle={sheet?.mode === 'edit' && sheetLog
          ? `Logged ${new Date(sheetLog.logged_at).toLocaleDateString('en-GB', { weekday: 'long' })} at ${new Date(sheetLog.logged_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
          : sheetHabit ? P.statusLine(P.habitStats(sheetHabit, logs, now)) : ''}
        activities={activities.filter((a) => a.habit_id === sheet?.habitId)}
        selectedActivityId={sheet?.activityId ?? null}
        note={sheet?.note ?? ''}
        onSelectActivity={(id) => setSheet((s) => s && { ...s, activityId: id })}
        onNoteChange={(note) => setSheet((s) => s && { ...s, note })}
        date={sheet?.date ?? P.toDateKey(now)}
        maxDate={P.toDateKey(now)}
        onDateChange={(date) => setSheet((s) => s && { ...s, date })}
        onSave={saveSheet}
        onRemove={() => {
          if (sheet?.logId) run({ kind: 'remove', id: sheet.logId }, () => A.deleteLog(sheet.logId!));
          setSheet(null);
        }}
        onHabit={() => { if (sheet) { setTab('week'); setHabitId(sheet.habitId); setSheet(null); } }}
        onClose={() => setSheet(null)}
      />

      <HabitForm
        open={!!habitForm}
        mode={habitForm?.id ? 'edit' : 'create'}
        draft={habitForm?.draft ?? emptyHabitDraft}
        onChange={(draft) => setHabitForm((f) => f && { ...f, draft })}
        onSave={saveHabit}
        onCancel={() => setHabitForm(null)}
        onDelete={editingHabit ? () => deleteHabit(editingHabit.id) : undefined}
      />

      <ObjectiveForm
        open={!!objForm}
        mode={objForm?.id ? 'edit' : 'create'}
        draft={objForm?.draft ?? emptyObjectiveDraft()}
        endsLabel={`Ends ${P.addMonths(P.startOfDay(now), objForm?.draft.timeframe_months ?? 3).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}`}
        habits={habits.map(({ id, name, period }) => ({ id, name, period }))}
        periodsInTimeframe={(period: Period, months: Timeframe) => P.periodsBetween(period, P.startOfDay(now), P.addMonths(P.startOfDay(now), months)).length}
        onChange={(draft) => setObjForm((f) => f && { ...f, draft })}
        onSave={saveObjective}
        onCancel={() => setObjForm(null)}
        onDelete={objForm?.id ? () => deleteObjective(objForm.id!) : undefined}
      />
    </div>
  );
}
