/** Read only: raw rab_versions rows and Tahap 1 nominal per funded campus, to check stored totals against the lines. Usage: npx tsx scripts/pencairan/rab-versions-raw.ts */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from '../pocketbase/env';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const campuses = new Map((await pb.collection('campuses').getFullList({ filter: 'fundedWave = 1', fields: 'id,code' })).map(c => [c.id, c.code as string]));
const disb = await pb.collection('disbursements').getFullList({ filter: 'term = 1', fields: 'campus,requestedSen,rabVersion,stage' });
const versions = await pb.collection('rab_versions').getFullList({ fields: 'id,campus,number,status,source,sourceFile,note,totalSen,term1Sen,term2Sen,created,updated', sort: 'campus,number' });
for (const v of versions) {
  const code = campuses.get(v.campus) || v.campus;
  const lines = await pb.collection('rab_lines').getFullList({ filter: pb.filter('version = {:v} && level = 1', { v: v.id }), fields: 'amountSen,term1Sen,term2Sen' });
  const sum = (k: string) => lines.reduce((n, l) => n + Number(l[k] || 0), 0);
  const d = disb.find(x => x.campus === v.campus);
  console.log(`${code.padEnd(9)} v${v.number} ${String(v.status).padEnd(9)} ${String(v.source).padEnd(10)} stored total=${v.totalSen} t1=${v.term1Sen} t2=${v.term2Sen ?? ''} | from lines total=${sum('amountSen')} t1=${sum('term1Sen')} t2=${sum('term2Sen')} | approved=${d?.rabVersion === v.id} requested=${d?.requestedSen} | file=${String(v.sourceFile).slice(0, 40)} | note=${String(v.note).slice(0, 60)} | updated=${v.updated}`);
}
