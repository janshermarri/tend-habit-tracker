import 'server-only';
import { createHmac, timingSafeEqual, randomBytes, scryptSync } from 'node:crypto';

/**
 * PIN session, stored as a signed cookie.
 *
 * The cookie value is `expiry.signature`, where the signature is an HMAC over
 * the expiry using APP_SECRET. That makes it verifiable in `proxy.ts` without
 * any shared state or datastore — proxy may run on a CDN edge, so it cannot
 * rely on module globals (see Next.js proxy docs).
 *
 * The PIN itself is never stored or compared here in plaintext form; see
 * `verifyPin`, which is only ever called from a Server Action.
 */
export const SESSION_COOKIE = 'tend_session';
const SESSION_DAYS = 14;
export const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function secret(): string {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) {
    throw new Error('APP_SECRET must be set to at least 32 characters. Generate one with: openssl rand -hex 32');
  }
  return s;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex');
}

/** Constant-time string compare that tolerates length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) {
    // Still burn a comparison so timing does not leak the length.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** Cookie value for a session expiring SESSION_DAYS from now. */
export function issueSession(): string {
  const expiry = String(Date.now() + SESSION_MAX_AGE * 1000);
  return `${expiry}.${sign(expiry)}`;
}

/**
 * True if the cookie is well-formed, correctly signed, and unexpired.
 * Safe to call from proxy.ts — pure crypto, no I/O.
 */
export function isSessionValid(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.lastIndexOf('.');
  if (dot < 1) return false;

  const expiry = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!safeEqual(signature, sign(expiry))) return false;

  const ms = Number(expiry);
  return Number.isFinite(ms) && ms > Date.now();
}

/**
 * Verify a submitted PIN against APP_PIN_HASH (scrypt, `salt:hash` hex).
 * Falls back to comparing APP_PIN directly if no hash is configured, so the
 * app is usable in local dev without a hashing step.
 */
export function verifyPin(submitted: string): boolean {
  if (!/^\d{6}$/.test(submitted)) return false;

  const stored = process.env.APP_PIN_HASH;
  if (stored) {
    const [salt, expected] = stored.split(':');
    if (!salt || !expected) throw new Error('APP_PIN_HASH must be "salt:hash". Regenerate it with: npm run pin');
    const actual = scryptSync(submitted, salt, 32).toString('hex');
    return safeEqual(actual, expected);
  }

  const plain = process.env.APP_PIN;
  if (!plain) throw new Error('Set APP_PIN_HASH (preferred) or APP_PIN. Generate a hash with: npm run pin');
  return safeEqual(submitted, plain);
}

/** Hash a PIN for storage in APP_PIN_HASH. Used by scripts/make-pin.mjs. */
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}
