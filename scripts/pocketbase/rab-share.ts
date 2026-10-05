/**
 * Adds rab_versions.share (which sheet a version came from: penuh, tahap1, tahap2, gabungan) and fills it for existing
 * versions from their load note and totals. Matches deb-schema.ts. Usage: npx tsx scripts/pocketbase/rab-share.ts
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const collection = await pb.collections.getOne('rab_versions');
const fields = collection.fields as { name: string }[];
if (!fields.some(f => f.name === 'share')) {
  const at = fields.findIndex(f => f.name === 'source');
  const field = { name: 'share', type: 'select', required: false, maxSelect: 1, values: ['penuh', 'tahap1', 'tahap2', 'gabungan'] };
  await pb.collections.update(collection.id, { fields: [...fields.slice(0, at + 1), field, ...fields.slice(at + 1)] });
  console.log('rab_versions.share added.');
} else console.log('rab_versions.share exists.');
const versions = await pb.collection('rab_versions').getFullList({ fields: 'id,share,note,totalSen,term1Sen,term2Sen' });
let filled = 0;
for (const v of versions) {
  if (v.share) continue;
  const t = Number(v.totalSen || 0), t1 = Number(v.term1Sen || 0), t2 = Number(v.term2Sen || 0);
  const share = /Termin 1 saja/i.test(String(v.note)) || (t > 0 && t === t1 && !t2) ? 'tahap1' : t2 > 0 ? 'gabungan' : t1 > 0 ? 'gabungan' : 'penuh';
  await pb.collection('rab_versions').update(v.id, { share });
  filled++;
}
console.log(`share filled on ${filled} of ${versions.length} versions.`);
