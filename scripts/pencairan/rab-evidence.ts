/**
 * Read only: what the system holds for the three RAB items of every funded campus, to compare with the source files in D:\deb.
 * Prints one line per campus (code, Nilai SK, latest managed version and its three totals and line counts, item statuses,
 * typed total) and writes the same as JSON to D:\deb\Analisis\rab\system-state.json. No names of people are printed.
 * Usage: npx tsx scripts/pencairan/rab-evidence.ts
 */
import PocketBase from 'pocketbase';
import { writeFileSync } from 'node:fs';
import { loadEnv, requireEnv } from '../pocketbase/env';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
pb.autoCancellation(false);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const rp = (sen: number) => Math.round(sen / 100).toLocaleString('id-ID');
const campuses = await pb.collection('campuses').getFullList({ filter: 'fundedWave = 1', fields: 'id,name,code', sort: 'code' });
const awards = await pb.collection('sk_awards').getFullList({ filter: 'wave = 1', fields: 'campus,amountSen' });
const disbursements = await pb.collection('disbursements').getFullList({ filter: 'term = 1', fields: 'id,campus,requestedSen,rabVersion' });
const documents = await pb.collection('documents').getFullList({ filter: 'kind = "rab" || kind = "rab_penuh" || kind = "rab_tahap2"', fields: 'id,disbursement,kind,status,currentVersion,decidedAt' });
const versions = await pb.collection('rab_versions').getFullList({ fields: 'id,campus,number,status,source,sourceFile,totalSen,term1Sen,term2Sen', sort: 'campus,number' });
const out: Record<string, unknown>[] = [];
for (const c of campuses) {
  const award = awards.find(a => a.campus === c.id);
  const d = disbursements.find(x => x.campus === c.id);
  const docs = documents.filter(x => d && x.disbursement === d.id);
  const status = (kind: string) => docs.find(x => x.kind === kind)?.status || '(tanpa slot)';
  const mine = versions.filter(v => v.campus === c.id);
  const latest = mine[mine.length - 1];
  let counts = { lines: 0, items: 0, amount: 0, term1: 0, term2: 0 };
  if (latest) {
    const lines = await pb.collection('rab_lines').getFullList({ filter: pb.filter('version = {:v}', { v: latest.id }), fields: 'level,amountSen,term1Sen,term2Sen' });
    const items = lines.filter(l => Number(l.level) === 4);
    counts = { lines: lines.length, items: items.length, amount: items.filter(l => Number(l.amountSen) > 0).length, term1: items.filter(l => Number(l.term1Sen) > 0).length, term2: items.filter(l => Number(l.term2Sen) > 0).length };
  }
  const rabDoc = docs.find(x => x.kind === 'rab');
  let typed = 0;
  if (rabDoc?.currentVersion) { const v = await pb.collection('document_versions').getOne(rabDoc.currentVersion, { fields: 'fields' }).catch(() => null); typed = Number((v?.fields as Record<string, unknown> | undefined)?.termin1Sen || 0); }
  const row = {
    code: c.code, sk: Number(award?.amountSen || 0), requested: Number(d?.requestedSen || 0), approvedVersion: d?.rabVersion || '',
    version: latest ? { number: latest.number, status: latest.status, source: latest.source, file: latest.sourceFile, total: Number(latest.totalSen), term1: Number(latest.term1Sen), term2: Number(latest.term2Sen || 0), versions: mine.length, ...counts } : null,
    items: { rab_penuh: status('rab_penuh'), rab: status('rab'), rab_tahap2: status('rab_tahap2') }, typedTerm1: typed
  };
  out.push(row);
  const v = row.version;
  console.log(`${c.code.padEnd(11)} SK ${rp(row.sk).padStart(12)} | ${v ? `v${v.number} ${v.status} ${v.source} 100%=${rp(v.total)} 70%=${rp(v.term1)} 30%=${rp(v.term2)} baris ${v.items} (100%>0:${v.amount}, 70%>0:${v.term1}, 30%>0:${v.term2})` : 'tanpa RAB terkelola'} | butir 100%=${row.items.rab_penuh} 70%=${row.items.rab} 30%=${row.items.rab_tahap2} | ketik 70%=${rp(typed)}`);
}
writeFileSync('D:/deb/Analisis/rab/system-state.json', JSON.stringify(out, null, 1));
console.log('written D:/deb/Analisis/rab/system-state.json');
