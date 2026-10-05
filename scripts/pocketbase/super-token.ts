/**
 * Issues the long lived superuser token the app server uses (PB_SUPER_TOKEN), the same way PF Series does:
 * the server never signs in with a password at request time, it carries a pre issued token.
 * Signs in once with the superuser password from .env, impersonates that superuser for --days (default 400),
 * and writes PB_SUPER_TOKEN into .env (or .env.local when that file exists, so a local instance gets its own).
 * The token is never printed. Copy it from the env file into the hosting variables.
 * Usage: npx tsx scripts/pocketbase/super-token.ts [--days 400]
 */
import PocketBase from 'pocketbase';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadEnv, requireEnv } from './env';

async function main() {
  loadEnv();
  const daysArg = process.argv.indexOf('--days');
  const days = daysArg > -1 ? Number(process.argv[daysArg + 1]) : 400;
  if (!Number.isFinite(days) || days < 1 || days > 3650) throw new Error('--days must be between 1 and 3650.');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  const auth = await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const client = await pb.collection('_superusers').impersonate(auth.record.id, days * 86400);
  const token = client.authStore.token;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as { exp: number };
  const file = existsSync('.env.local') ? '.env.local' : '.env';
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const line = `PB_SUPER_TOKEN=${token}`;
  const next = /^PB_SUPER_TOKEN=.*$/m.test(text) ? text.replace(/^PB_SUPER_TOKEN=.*$/m, line) : text.replace(/\s*$/, '\n') + line + '\n';
  writeFileSync(file, next, 'utf8');
  console.log(`PB_SUPER_TOKEN written to ${file} for ${new URL(env.PB_URL).host}, valid until ${new Date(payload.exp * 1000).toISOString().slice(0, 10)}.`);
  console.log('Copy that value into the hosting variables (Pages: Settings, Variables) and deploy again. Run this script again before it expires.');
}
main().catch(error => { console.error('Super token failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
