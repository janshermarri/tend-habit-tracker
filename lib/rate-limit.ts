import 'server-only';

/**
 * In-memory attempt limiter for PIN unlock.
 *
 * Deliberately not backed by a datastore: this is a single-user app, and Fluid
 * Compute reuses instances so the counter survives between requests. A cold
 * start resets it, which is an acceptable trade for zero infrastructure —
 * Deployment Protection, not this limiter, is the primary gate.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Entry = { count: number; first: number };
const attempts = new Map<string, Entry>();

export type LimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

export function checkLimit(key: string): LimitResult {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.first > WINDOW_MS) return { allowed: true };
  if (entry.count < MAX_ATTEMPTS) return { allowed: true };

  return { allowed: false, retryAfterSec: Math.ceil((entry.first + WINDOW_MS - now) / 1000) };
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now - entry.first > WINDOW_MS) attempts.set(key, { count: 1, first: now });
  else entry.count += 1;

  // Bound the map; only ever a handful of keys for a single-user app.
  if (attempts.size > 100) {
    for (const [k, v] of attempts) if (now - v.first > WINDOW_MS) attempts.delete(k);
  }
}

export function clear(key: string): void {
  attempts.delete(key);
}
