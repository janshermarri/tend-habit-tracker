import 'server-only';
import { db } from './supabase/server';

/**
 * Durable PIN attempt limiter, backed by Postgres.
 *
 * The previous in-memory version reset whenever a serverless instance
 * recycled, which handed out a fresh allowance on every cold start. Counting
 * lives in `register_pin_attempt` (see supabase/rate-limit.sql) so that the
 * read and the increment happen in one atomic statement — two concurrent
 * unlock requests cannot both observe the same pre-increment count.
 */
const WINDOW_SEC = 15 * 60;
const MAX_ATTEMPTS = 5;

export type LimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/**
 * Record an attempt and report whether it is allowed.
 *
 * Call this once per unlock attempt, before verifying the PIN: it counts every
 * attempt, and `clear` wipes the record when the PIN turns out to be correct.
 *
 * Fails open. If the database is unreachable the user is locked out of their
 * own tracker by an outage, which is a worse outcome than a brief unlimited
 * window on a low-value target — and the PIN still has to be correct.
 */
export async function registerAttempt(key: string): Promise<LimitResult> {
  try {
    const { data, error } = await db().rpc('register_pin_attempt', {
      p_key: key,
      p_max: MAX_ATTEMPTS,
      p_window_sec: WINDOW_SEC,
    });
    if (error) throw new Error(error.message);

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { allowed: true };

    return row.allowed
      ? { allowed: true }
      : { allowed: false, retryAfterSec: row.retry_after_sec ?? WINDOW_SEC };
  } catch (e) {
    console.error('[rate-limit] register failed, allowing attempt:', e);
    return { allowed: true };
  }
}

/** Reset the counter after a successful unlock. */
export async function clear(key: string): Promise<void> {
  try {
    const { error } = await db().rpc('clear_pin_attempts', { p_key: key });
    if (error) throw new Error(error.message);
  } catch (e) {
    // A stale counter expires on its own once the window passes.
    console.error('[rate-limit] clear failed:', e);
  }
}
