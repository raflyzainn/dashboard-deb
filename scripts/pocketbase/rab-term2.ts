/**
 * Adds the RAB 30% amount (term2Sen) to rab_versions and rab_lines, matching scripts/pocketbase/deb-schema.ts.
 * Touches those two fields only; existing rows read as 0. Usage: npx tsx scripts/pocketbase/rab-term2.ts
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
for (const name of ['rab_versions', 'rab_lines']) {
  const collection = await pb.collections.getOne(name);
  const fields = collection.fields as { name: string; type: string }[];
  if (fields.some(f => f.name === 'term2Sen')) { console.log(`${name}.term2Sen already exists.`); continue; }
  const after = fields.findIndex(f => f.name === 'term1Sen');
  const field = { name: 'term2Sen', type: 'number', required: false, onlyInt: true, min: null, max: null };
  const next = [...fields.slice(0, after + 1), field, ...fields.slice(after + 1)];
  await pb.collections.update(collection.id, { fields: next });
  console.log(`${name}.term2Sen added.`);
}
