export type CheckInItem = { id: string; activity: string; habit: string; note: string | null; time: string };
export type CheckInGroup = { label: string; items: CheckInItem[] };

/** Check-ins grouped by day (newest first). Tapping one opens the LogSheet in edit mode. */
export function CheckInList({ groups, onOpen, emptyText }: { groups: CheckInGroup[]; onOpen: (id: string) => void; emptyText: string }) {
  if (!groups.length) {
    return <p className="rounded-lg border-[1.5px] border-dashed border-line px-5 py-7 text-center text-[15px] text-ink-2">{emptyText}</p>;
  }
  return (
    <div className="rounded-lg bg-surface px-[18px] py-1 shadow-sm">
      {groups.map((g, gi) => (
        <div key={g.label} className={`flex flex-col gap-0.5 pt-3.5 pb-2.5 ${gi ? 'border-t border-line' : ''}`}>
          <span className="pb-1 text-[13px] font-medium text-ink-2">{g.label}</span>
          {g.items.map((it) => (
            <button key={it.id} type="button" onClick={() => onOpen(it.id)} className="flex w-full items-start gap-3 rounded-[8px] py-2 text-left hover:opacity-75">
              <span className="mt-[7px] size-2 shrink-0 rounded-full bg-accent" />
              <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                <span className="text-[15px]"><span className="font-medium">{it.activity}</span><span className="text-ink-2"> · {it.habit}</span></span>
                {it.note && <span className="font-serif text-[15px] text-pretty text-ink-2 italic">“{it.note}”</span>}
              </span>
              <span className="shrink-0 pt-0.5 text-[13px] text-ink-2">{it.time}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
