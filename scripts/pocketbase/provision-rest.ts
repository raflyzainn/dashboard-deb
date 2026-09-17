import PocketBase from 'pocketbase';
import { configureRestSchema } from './rest-schema';

async function main() {
  const { PB_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD, DEB_PUBLIC_URL } = process.env;
  if (!PB_URL || !PB_SUPERUSER_EMAIL || !PB_SUPERUSER_PASSWORD || !DEB_PUBLIC_URL) throw new Error('Set PB_URL, PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD and DEB_PUBLIC_URL in the process environment.');
  const url = new URL(PB_URL);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) throw new Error('Use HTTPS for remote PocketBase.');
  if (!process.argv.includes('--apply')) { console.log('Dry run: imports REST schema, enables batch, sets Application URL and native email template, blocks QA in production and rotates user token secrets. Run with --apply during maintenance after backup.'); return; }
  const pb = new PocketBase(url.origin); pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(PB_SUPERUSER_EMAIL, PB_SUPERUSER_PASSWORD);
  await configureRestSchema(pb);
  console.log('REST schema and batch settings ready. No server files or hooks required.');
}
main().catch(() => { console.error('Provisioning failed. Check the target, superuser access, and PocketBase version; secrets are not printed.'); process.exitCode = 1; });
