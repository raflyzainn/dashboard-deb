/**
 * Removes one account by email, with its notifications. Audit rows stay (append only) but carry no personal data beyond the email.
 * Usage: npx tsx scripts/pencairan/remove-user.ts someone@example.org
 * Refuses the super admin named in .env. Secrets come from .env and are never printed.
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from '../pocketbase/env';

async function main() {
  loadEnv();
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email.includes('@')) throw new Error('Give the email of the account to remove.');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'DEB_SUPERADMIN_EMAIL');
  if (email === env.DEB_SUPERADMIN_EMAIL.toLowerCase()) throw new Error('The super admin account is never removed by this script.');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const found = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:e}', { e: email }), fields: 'id,role' });
  const user = found.items[0];
  if (!user) { console.log(`No account with that email on ${new URL(env.PB_URL).host}.`); return; }
  const notifications = await pb.collection('notifications').getFullList({ filter: pb.filter('recipientUser = {:u}', { u: user.id }), fields: 'id' });
  for (const n of notifications) await pb.collection('notifications').delete(n.id);
  await pb.collection('users').delete(user.id);
  console.log(`Removed account (${user.role}) and ${notifications.length} notifications on ${new URL(env.PB_URL).host}.`);
}
main().catch(error => { console.error('Remove user failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
