import { SectionTitle } from './Controls';

/**
 * The AI "Looking back" note: a few sentences about a finished week or month,
 * what was done only. `plain` drops the tint for the detail pages, where it
 * sits under a card and should read as a quiet aside.
 */
export function ReflectionCard({ title, text, plain }: { title: string; text: string; plain?: boolean }) {
  return (
    <div className={`flex flex-col gap-2 animate-rise ${plain ? 'px-1' : 'rounded-lg bg-accent-soft px-[18px] py-4'}`}>
      <SectionTitle>Looking back · {title}</SectionTitle>
      <p className={`font-serif leading-relaxed text-pretty ${plain ? 'text-[16px] text-ink-2' : 'text-[17px]'}`}>{text}</p>
    </div>
  );
}
