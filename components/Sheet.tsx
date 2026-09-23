'use client';

import { useEffect, useState, type ReactNode } from 'react';

type SheetProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  /** Tailwind max-width class */
  maxWidth?: string;
};

/** Bottom sheet on mobile, centered dialog from `wide:` (880px) up. Owns enter/exit animation + Escape. */
export function Sheet({ open, onClose, label, children, maxWidth = 'max-w-[520px]' }: SheetProps) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Derive the open/closing transition during render rather than in an effect:
  // opening mounts immediately, closing keeps the sheet mounted for the exit animation.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) setClosing(true);
  }

  // The exit timer is the only external system here.
  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => { setMounted(false); setClosing(false); }, 210);
    return () => clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-60 flex flex-col items-center justify-end wide:justify-center wide:p-6">
      <div onClick={onClose} className={`absolute inset-0 bg-overlay ${closing ? 'animate-fade-out' : 'animate-fade-in'}`} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`relative flex max-h-[94vh] w-full ${maxWidth} flex-col overflow-auto rounded-t-xl bg-surface shadow-lg wide:max-h-[calc(100vh-48px)] wide:rounded-xl ${
          closing ? 'animate-sheet-down wide:animate-pop-out' : 'animate-sheet-up wide:animate-pop-in'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
