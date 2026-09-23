'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';
export type Resolved = 'light' | 'dark';

const KEY = 'tend-theme';
const DARK = '(prefers-color-scheme: dark)';

function subscribeSystem(cb: () => void): () => void {
  const mq = window.matchMedia(DARK);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}
function getSystem(): Resolved {
  return window.matchMedia(DARK).matches ? 'dark' : 'light';
}

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    // Private mode or blocked storage: fall back to following the OS.
    return 'system';
  }
}

/**
 * Theme preference with three states.
 *
 * 'system' follows the OS and keeps following it, so the app changes with a
 * scheduled sunset switch. Choosing light or dark overrides that until the
 * user returns to system, and the choice survives reloads.
 *
 * The applied theme is written to <html data-theme> by the inline script in
 * app/layout.tsx before first paint; this hook keeps it in sync afterwards.
 */
export function useTheme() {
  const system = useSyncExternalStore(subscribeSystem, getSystem, () => 'light' as Resolved);
  // Lazy initialiser rather than an effect: this runs on the client's first
  // render, so the UI never paints a render with the wrong preference.
  // On the server it returns 'system'; the inline script in layout.tsx has
  // already applied the correct theme to <html> before paint either way.
  const [pref, setPref] = useState<ThemePref>(() =>
    typeof window === 'undefined' ? 'system' : readPref(),
  );

  const resolved: Resolved = pref === 'system' ? system : pref;

  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  const choose = useCallback((next: ThemePref) => {
    setPref(next);
    try {
      if (next === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      // Not persisting is acceptable; the session still reflects the choice.
    }
  }, []);

  /** Cycles system -> light -> dark -> system, so "follow the OS" stays reachable. */
  const cycle = useCallback(() => {
    setPref((p) => {
      const next: ThemePref = p === 'system' ? 'light' : p === 'light' ? 'dark' : 'system';
      try {
        if (next === 'system') localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const label =
    pref === 'system' ? `System theme (${system})` : pref === 'light' ? 'Light theme' : 'Dark theme';

  return { pref, resolved, system, choose, cycle, label };
}
