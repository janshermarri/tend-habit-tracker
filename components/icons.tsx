// Minimal line icons, 1em-ish, inherit currentColor.

export function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden>
      <path d="M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden>
      <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden>
      <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ChevronIcon({ dir = 'left', size = 14 }: { dir?: 'left' | 'right'; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden className={dir === 'right' ? 'rotate-180' : ''}>
      <path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function TodayIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" /></svg>;
}

export function WeekIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <path d="M5 17v-7M10 17V3M15 17v-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function CheckInsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      {[5, 10, 15].map((y) => (
        <g key={y}><circle cx="3.5" cy={y} r="1.6" fill="currentColor" /><path d={`M8 ${y}h9`} stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></g>
      ))}
    </svg>
  );
}

export function GoalsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
      <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="10" cy="10" r="3" fill="currentColor" />
    </svg>
  );
}

/**
 * The sprout mark from the logo package (svg/tend-mark-*.svg), inlined.
 * Uses currentColor so it follows the theme instead of shipping two files.
 */
export function TendMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M24 41V23" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M24 28C16 28 11 22.5 11 15C19 15 24 20 24 28Z" fill="currentColor" />
      <path d="M24 23C24 14.5 29.5 8 37.5 8C37.5 16.5 32 23 24 23Z" fill="currentColor" />
    </svg>
  );
}
