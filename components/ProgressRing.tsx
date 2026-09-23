import type { ReactNode } from 'react';

type ProgressRingProps = {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  children?: ReactNode;
  className?: string;
};

export function ProgressRing({ value, size = 60, stroke = 5, label, children, className = '' }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--accent)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)} opacity={v > 0 ? 1 : 0}
          className="transition-[stroke-dashoffset,opacity] duration-700 ease-calm"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
