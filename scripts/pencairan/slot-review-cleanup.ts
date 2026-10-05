/**
 * Shows the recent audit rows and review rows of one campus item (default IPB rab_penuh), and with --clean removes the
 * review rows whose note carries the test marker and restores the item status given after --restore. Read only otherwise.
 * Usage: npx tsx scripts/pencairan/slot-review-cleanup.ts [CODE] [kind] [--clean] [--restore <status>]
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from '../pocketbase/env';

const code = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'IPB';
const kind = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'rab_penuh';
const clean = process.argv.includes('--clean');
const restore = process.argv.includes('--restore') ? process.argv[process.argv.indexOf('--restore') + 1] : '';
const MARKER = 'Uji catatan keputusan';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const campus = await pb.collection('campuses').getFirstListItem(pb.filter('code = {:c}', { c: code }), { fields: 'id,code' });
const disb = await pb.collection('disbursements').getFirstListItem(pb.filter('campus = {:c} && term = 1', { c: campus.id }), { fields: 'id' });
const doc = await pb.collection('documents').getFirstListItem(pb.filter('disbursement = {:d} && kind = {:k}', { d: disb.id, k: kind }), { fields: 'id,status' });
console.log(`${code} ${kind}: status now ${doc.status}`);
const audit = await pb.collection('audit').getList(1, 8, { filter: pb.filter('record = {:r}', { r: doc.id }), sort: '-created', fields: 'action,actorName,before,after,created,note' });
for (const a of audit.items) console.log(`  audit ${a.created} | ${a.action} | ${JSON.stringify(a.before)} -> ${JSON.stringify(a.after)} | note: ${String(a.note || '').slice(0, 50)}`);
const reviews = await pb.collection('reviews').getFullList({ filter: pb.filter('document = {:d}', { d: doc.id }), sort: '-created', fields: 'id,decision,note,created' });
for (const r of reviews) console.log(`  review ${r.created} | ${r.decision} | ${String(r.note || '').slice(0, 60)}`);
if (clean) {
  const mine = reviews.filter(r => String(r.note || '').includes(MARKER));
  const after = mine.length ? reviews.filter(r => r.created > mine[mine.length - 1].created && !String(r.note || '').includes(MARKER) && r.decision === 'perlu_konfirmasi') : [];
  for (const r of [...mine, ...after]) { await pb.collection('reviews').delete(r.id); console.log('  removed review', r.decision, String(r.note || '').slice(0, 30)); }
}
if (restore) { await pb.collection('documents').update(doc.id, { status: restore }); console.log(`  status restored to ${restore}`); }
