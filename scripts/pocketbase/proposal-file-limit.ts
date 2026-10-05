/**
 * Raises the size limit of the proposal PDF field (proposal_versions.file) to 40 MB, matching db-schema/collections.json
 * and the upload workflow. Touches that one field only. Usage: npx tsx scripts/pocketbase/proposal-file-limit.ts
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';

const LIMIT = 41943040;
loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const collection = await pb.collections.getOne('proposal_versions');
const fields = (collection.fields as { name: string; maxSize?: number }[]).map(f => (f.name === 'file' ? { ...f, maxSize: LIMIT } : f));
const before = (collection.fields as { name: string; maxSize?: number }[]).find(f => f.name === 'file')?.maxSize;
if (before === LIMIT) { console.log('proposal_versions.file already allows 40 MB.'); process.exit(0); }
await pb.collections.update(collection.id, { fields });
console.log(`proposal_versions.file maxSize ${before} -> ${LIMIT}.`);
