/**
 * Server time zone. Weeks start Monday at local midnight (lib/progress.ts), and
 * Vercel reserves the TZ env var, so set it here before any request runs.
 */
export function register() {
  process.env.TZ = 'Asia/Karachi';
}
