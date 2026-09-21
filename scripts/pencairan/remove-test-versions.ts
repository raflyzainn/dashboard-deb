/**
 * Removes document versions whose note carries a test marker and restores the previous current version of each document.
 * Usage: npx tsx scripts/pencairan/remove-test-versions.ts "Uji lampiran agen B"
 */
import PocketBase from 'pocketbase';
import { AwsClient } from 'aws4fetch';
import { loadEnv, requireEnv } from '../pocketbase/env';
loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const r2 = new AwsClient({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, service: 's3', region: 'auto' });
const base = env.R2_ENDPOINT.replace(/\/+$/, '') + '/' + env.R2_BUCKET + '/';
const versions = await pb.collection('document_versions').getFullList({ filter: pb.filter('note ~ {:m}', { m: process.argv[2] || 'Uji lampiran agen B' }) });
console.log('test versions found', versions.length);
for (const v of versions) {
  const doc = await pb.collection('documents').getOne(v.document);
  await pb.collection('document_versions').delete(v.id);
  const del = await r2.fetch(base + v.r2Key.split('/').map(encodeURIComponent).join('/'), { method: 'DELETE' });
  const remaining = await pb.collection('document_versions').getList(1, 1, { filter: `document = "${doc.id}"`, sort: '-number' });
  await pb.collection('documents').update(doc.id, { currentVersion: remaining.items[0]?.id || '', signedReceived: false, signedReceivedAt: '', signedReceivedByName: '' });
  console.log('removed', doc.kind, 'v' + v.number, 'r2', del.status, 'current now v' + (remaining.items[0]?.number || 0));
}
