'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { unlock } from '@/lib/actions';
import type { UnlockState } from '@/lib/unlock-state';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-md bg-accent text-base font-medium text-on-accent transition-opacity disabled:opacity-50"
    >
      {pending ? 'Checking…' : 'Unlock'}
    </button>
  );
}

export function PinForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<UnlockState, FormData>(unlock, { error: null });

  return (
    <form action={formAction} className="flex w-full max-w-[320px] flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input
        name="pin"
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus
        aria-label="6-digit PIN"
        aria-invalid={!!state.error}
        placeholder="······"
        className="h-14 w-full rounded-md bg-surface-2 text-center text-2xl tracking-[0.5em] outline-none transition-shadow focus:ring-2 focus:ring-accent"
      />
      <Submit />
      <p aria-live="polite" className="min-h-5 text-center text-sm text-ink-2">
        {state.error}
      </p>
    </form>
  );
}
