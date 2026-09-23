/**
 * Hash a 6-digit PIN for APP_PIN_HASH.
 *   npm run pin -- 123456
 */
import { randomBytes, scryptSync } from 'node:crypto';

const pin = process.argv[2];

if (!/^\d{6}$/.test(pin ?? '')) {
  console.error('Usage: npm run pin -- <6 digits>');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(pin, salt, 32).toString('hex');

console.log('\nAdd this line to .env (replacing any existing APP_PIN_HASH):\n');
console.log(`APP_PIN_HASH=${salt}:${hash}\n`);
