'use client';

import type React from 'react';
import { CheckInsIcon, GoalsIcon, TendMark, TodayIcon, WeekIcon } from './icons';

export type Tab = 'today' | 'week' | 'checkins' | 'goals';

const items: { key: Tab; label: string; Icon: () => React.JSX.Element }[] = [
  { key: 'today', label: 'Today', Icon: TodayIcon },
  { key: 'week', label: 'Progress', Icon: WeekIcon },
  { key: 'checkins', label: 'Check-ins', Icon: CheckInsIcon },
  { key: 'goals', label: 'Goals', Icon: GoalsIcon },
];

type BottomNavProps = { active: Tab; onChange: (tab: Tab) => void };

/** Mobile: fixed bottom bar. Hidden from `wide:` up — use <SideNav> there. */
export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg wide:hidden">
      <div className="flex w-full max-w-[480px]">
        {items.map(({ key, label, Icon }) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onChange(key)}
              className={`flex h-[68px] flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors ${on ? 'font-semibold text-accent-ink' : 'font-medium text-ink-2'}`}
            >
              <span className={`grid h-[30px] w-14 place-items-center rounded-full transition-colors duration-200 ${on ? 'bg-accent-soft' : ''}`}><Icon /></span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

type SideNavProps = BottomNavProps & { onToggleTheme?: () => void; themeLabel?: string; themeIcon?: React.ReactNode };

/** Desktop rail (shown from `wide:` up). */
export function SideNav({ active, onChange, onToggleTheme, themeLabel = 'Dark mode', themeIcon }: SideNavProps) {
  return (
    <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col gap-9 border-r border-line px-5 pt-9 pb-7 wide:flex">
      {/* Baseline, not centre: the sprout's stem sits on the word's baseline. The nudge
          makes up for the empty space under the stem in the icon's 48-unit box. */}
      <div className="flex items-baseline gap-2.5 px-3">
        <span className="translate-y-[2px] text-accent"><TendMark size={24} /></span>
        <span className="font-serif text-2xl">Tend</span>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ key, label, Icon }) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => onChange(key)}
              className={`flex h-11 items-center gap-3 rounded-md px-3 text-[15px] transition-colors ${on ? 'bg-surface font-semibold text-accent-ink shadow-sm' : 'font-medium text-ink-2 hover:text-ink'}`}
            >
              <Icon />{label}
            </button>
          );
        })}
      </nav>
      {onToggleTheme && (
        <button type="button" onClick={onToggleTheme} className="mt-auto flex h-11 items-center gap-3 rounded-md px-3 text-sm text-ink-2 hover:text-ink">
          {themeIcon ?? <span className="size-4 rounded-full border-[1.5px] border-current" style={{ background: 'linear-gradient(90deg, currentColor 50%, transparent 50%)' }} />}
          {themeLabel}
        </button>
      )}
    </aside>
  );
}
