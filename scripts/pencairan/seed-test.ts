/**
 * Test data for a LOCAL PocketBase only: one made up university with an SK award, a campus account and an admin account.
 * Refuses to run unless PB_URL points at 127.0.0.1 or localhost, so the production database never receives test rows.
 * Usage: npx tsx scripts/pencairan/seed-test.ts   (after provision-deb.ts --apply against the local instance)
 * Passwords are generated and printed once; nothing is written to the repo.
 */
import PocketBase from 'pocketbase';
import { randomBytes } from 'node:crypto';
import { loadEnv, requireEnv } from '../pocketbase/env';

const CAMPUS = { name: 'Universitas Uji Coba', acronym: 'UJI', code: 'UJI', region: 'Uji', city: 'Kota Uji', initials: 'UJ', fundedWave: 1, fillMode: 'campus', programYear: 'kedua' };
const AWARD = { skNumber: 'UJI/2026', amountSen: 75_000_000 * 100, wave: 1, programYear: 'kedua', programTitle: 'Program uji coba aplikasi' };
const ACCOUNTS = [{ email: 'kampus.uji@deb.test', name: 'Kampus Uji Coba', role: 'campus' }, { email: 'admin.uji@deb.test', name: 'Admin Uji Coba', role: 'admin' }];
const password = () => randomBytes(9).toString('base64url') + '-Uji1';

async function main() {
  loadEnv();
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
  const url = new URL(env.PB_URL);
  if (!['127.0.0.1', 'localhost', '::1'].includes(url.hostname)) throw new Error(`PB_URL points at ${url.host}. Test data goes to a local PocketBase only; set PB_URL in .env.local to http://127.0.0.1:8096.`);
  const pb = new PocketBase(url.origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const existing = await pb.collection('campuses').getList(1, 1, { filter: pb.filter('code = {:c}', { c: CAMPUS.code }) });
  const campus = existing.items[0] || await pb.collection('campuses').create({ ...CAMPUS, program: {}, simulated: false });
  const awards = await pb.collection('sk_awards').getList(1, 1, { filter: pb.filter('campus = {:c}', { c: campus.id }) });
  if (!awards.items[0]) await pb.collection('sk_awards').create({ ...AWARD, campus: campus.id });
  console.log(`${CAMPUS.name} (${CAMPUS.code}) ready on ${url.host} with SK ${AWARD.skNumber}.`);
  for (const account of ACCOUNTS) {
    const found = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:e}', { e: account.email }), fields: 'id' });
    const pass = password();
    const data = { name: account.name, role: account.role, campus: account.role === 'campus' ? campus.id : '', active: true, verified: true, emailVisibility: false, simulated: false, password: pass, passwordConfirm: pass };
    if (found.items[0]) await pb.collection('users').update(found.items[0].id, data); else await pb.collection('users').create({ email: account.email, ...data });
    console.log(`  ${account.role.padEnd(6)} ${account.email}  password: ${pass}`);
  }
  console.log('Sign in at the local dev server with these accounts. Run again to reset the passwords.');
}
main().catch(error => { console.error('Seed test failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
