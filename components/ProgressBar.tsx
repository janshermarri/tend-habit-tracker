type ProgressBarProps = { value: number; size?: 'sm' | 'md' | 'lg'; label?: string };

const heights = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

export function ProgressBar({ value, size = 'md', label }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`${heights[size]} overflow-hidden rounded-full bg-ring-track`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-calm" style={{ width: `${pct}%` }} />
    </div>
  );
}
