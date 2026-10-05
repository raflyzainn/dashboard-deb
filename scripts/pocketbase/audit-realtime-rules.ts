/**
 * Lets active admins list and view the audit collection with their own PocketBase token, which is what the browser needs to
 * subscribe to it as the live change feed (decision 46). Writes stay superuser only. Usage: npx tsx scripts/pocketbase/audit-realtime-rules.ts
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';
import { AUDIT_READ_RULE } from './deb-schema';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const collection = await pb.collections.getOne('audit');
if (collection.listRule === AUDIT_READ_RULE && collection.viewRule === AUDIT_READ_RULE) { console.log('audit rules already set.'); process.exit(0); }
await pb.collections.update(collection.id, { listRule: AUDIT_READ_RULE, viewRule: AUDIT_READ_RULE });
console.log('audit list and view rules set for active admins.');
