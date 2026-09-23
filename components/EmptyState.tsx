import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** Small quiet illustration — a ring, a dot row, a pair of bars */
  art?: ReactNode;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Extra content under the button, e.g. suggestion chips */
  children?: ReactNode;
};

export function EmptyState({ art, title, body, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="mx-auto mt-2 flex max-w-[440px] flex-col items-center gap-[18px] px-2 py-12 text-center animate-rise">
      {art ?? <DefaultArt />}
      <h2 className="mt-1.5 font-serif text-[28px] leading-tight font-normal">{title}</h2>
      <p className="text-base leading-relaxed text-pretty text-ink-2">{body}</p>
      {actionLabel && (
        <button type="button" onClick={onAction} className="mt-1.5 h-12 rounded-full bg-accent px-6 text-[15px] font-medium text-accent-contrast transition-colors hover:bg-accent-ink">
          {actionLabel}
        </button>
      )}
      {children}
    </div>
  );
}

function DefaultArt() {
  return (
    <div className="grid size-[88px] place-items-center rounded-full" style={{ background: 'conic-gradient(var(--accent) 0 22%, var(--ring-track) 0)' }}>
      <div className="size-[74px] rounded-full bg-bg" />
    </div>
  );
}

/* Copy used in the prototype:
   No habits — "No habits yet" / "Pick one thing you’d like to do a few times a week. Count it however suits you — there’s no streak to break." / "Add your first habit"
   No goals  — "No goals yet" / "Objectives are the bigger things. Give one a timeframe — one, three or six months — and a few key results to see it moving." / "Set an objective"
   Week      — "Your week lives here" / "Once you add a habit, every check-in lands on its day — an easy way to see how the week is shaping up." / "Add a habit"
*/
