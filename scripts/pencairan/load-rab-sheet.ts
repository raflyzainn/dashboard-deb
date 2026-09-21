/**
 * Loads one RAB sheet of one campus, already extracted to JSON rows in the standard extraction columns by
 * D:\deb\Analisis\rab\extract-sheet.py, as a new managed RAB version of that sheet's share: penuh (RAB 100%), tahap1 (70%)
 * or tahap2 (30%). Nothing is merged with other versions; each sheet stays its own version.
 * Usage: npx tsx scripts/pencairan/load-rab-sheet.ts <CODE> <penuh|tahap1|tahap2> <rows.json> "<source note>" [--apply]
 */
import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { buildImportLegacy, createVersion, listVersions } from '../../src/lib/server/deb/rab';
import { formatSen } from '../../src/lib/pencairan';
import { MAX_LEVEL } from '../../src/lib/rab';

const [code, share, jsonPath, sourceNote] = process.argv.slice(2);
const apply = process.argv.includes('--apply');
if (!code || !['penuh', 'tahap1', 'tahap2'].includes(share) || !jsonPath) { console.error('Usage: load-rab-sheet.ts <CODE> <penuh|tahap1|tahap2> <rows.json> "<source note>" [--apply]'); process.exit(1); }

async function main() {
  loadEnv();
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'DEB_SUPERADMIN_EMAIL');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const admin = await pb.collection('users').getFirstListItem(pb.filter('email = {:e}', { e: env.DEB_SUPERADMIN_EMAIL }), { fields: 'id' });
  const campus = await pb.collection('campuses').getFirstListItem(pb.filter('code = {:c}', { c: code }), { fields: 'id,code,name' });
  const rows = JSON.parse(readFileSync(jsonPath, 'utf8')) as Record<string, unknown>[];
  // The legacy builder reads jenis_rab: "total" keeps the line amount and no Tahap 1 part; the share below decides where the amount belongs.
  const result = buildImportLegacy(rows.map(r => ({ ...r, jenis_rab: 'total', kode_kampus: code })), code);
  for (const line of result.lines) {
    const amount = line.amountSen;
    line.term1Sen = share === 'tahap1' ? amount : 0;
    line.term2Sen = share === 'tahap2' ? amount : 0;
  }
  const items = result.lines.filter(l => l.parentKey && !result.lines.some(x => x.parentKey === l.key)).length;
  const total = result.lines.filter(l => !l.parentKey).length ? result.totalSen : 0;
  console.log(`${campus.code}: ${share} sheet, ${result.rows} item rows, ${result.lines.length} lines (${items} items), total ${formatSen(result.totalSen)}, ${result.problems.length} problems`);
  for (const p of result.problems.slice(0, 8)) console.log('  problem', p.row, p.text);
  const existing = await listVersions(pb, campus.id);
  console.log(`  existing versions: ${existing.map(v => `v${v.number} ${v.status} ${formatSen(v.totalSen)}`).join(', ') || 'none'}`);
  if (!apply) { console.log('Dry run. Add --apply to create the version.'); return; }
  const created = await createVersion(pb, { id: admin.id, name: 'Pemeriksaan bukti berkas', email: '' }, campus.id, { lines: result.lines, source: 'extraction', sourceFile: sourceNote || jsonPath, note: `Dimuat dari berkas kampus, lembar ${share === 'penuh' ? 'RAB 100%' : share === 'tahap1' ? 'RAB 70%' : 'RAB 30%'} apa adanya (${sourceNote}).`, share: share as 'penuh' | 'tahap1' | 'tahap2' });
  console.log(`  created v${created.number}: total ${formatSen(created.totalSen)}, 70% ${formatSen(created.term1Sen)}, 30% ${formatSen(created.term2Sen)}, ${created.items} items; max level ${MAX_LEVEL}; unused total ${total}`);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
