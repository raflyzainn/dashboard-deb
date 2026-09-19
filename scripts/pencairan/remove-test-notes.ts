/**
 * Removes conversation notes whose body carries a test marker.
 * Usage: npx tsx scripts/pencairan/remove-test-notes.ts "Uji catatan"
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from '../pocketbase/env';
loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const marker = process.argv[2] || 'Uji catatan';
const notes = await pb.collection('notes').getFullList({ filter: pb.filter('body ~ {:m}', { m: marker }) });
for (const n of notes) await pb.collection('notes').delete(n.id);
const alerts = await pb.collection('notifications').getFullList({ filter: pb.filter('body ~ {:m}', { m: marker }) }).catch(() => []);
for (const a of alerts) await pb.collection('notifications').delete(a.id);
console.log('removed notes', notes.length, 'notifications', alerts.length);
