/**
 * Lets a review belong to a document slot without a file version (SK, RAB 100%, RAB 30%): reviews.version becomes optional
 * and reviews.document is added. Matches deb-schema.ts. Usage: npx tsx scripts/pocketbase/reviews-document.ts
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';
import { IDS } from './deb-schema';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const collection = await pb.collections.getOne('reviews');
const fields = collection.fields as { name: string; required?: boolean }[];
let changed = false;
const version = fields.find(f => f.name === 'version');
if (version?.required) { version.required = false; changed = true; }
if (!fields.some(f => f.name === 'document')) {
  const at = fields.findIndex(f => f.name === 'version');
  fields.splice(at + 1, 0, { name: 'document', type: 'relation', collectionId: IDS.documents, cascadeDelete: false, maxSelect: 1, required: false } as never);
  changed = true;
}
if (changed) { await pb.collections.update(collection.id, { fields }); console.log('reviews: version optional, document relation added.'); }
else console.log('reviews already up to date.');
