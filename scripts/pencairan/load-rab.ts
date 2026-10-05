/**
 * One time load of the extracted RAB workbook (D:\deb\Ekstraksi RAB\RAB terstandar DEB 2025-2026.xlsx, sheet RAB) into
 * version 1 of the managed RAB of each funded campus: source extraction, status draf, so the admin can fix the noted issues in the app.
 * A campus with a termin_1 row set gets that set as its Tahap 1 RAB (every line allocated to Termin 1); only campuses without one get the total RAB.
 * Options: --only CODE,CODE limits the campuses; --force adds a new version even when one exists (the earlier versions stay).
 *
 * Runs from the developer machine: npx tsx scripts/pencairan/load-rab.ts --apply   (dry run without --apply)
 * Idempotent: a campus that already has a RAB version is skipped. The console shows counts only.
 */
import PocketBase from 'pocketbase';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { buildImportLegacy as buildImport, createVersion, CODE_ALIASES } from '../../src/lib/server/deb/rab';
import { formatSen } from '../../src/lib/pencairan';

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const onlyArg = process.argv.indexOf('--only');
  const only = onlyArg > -1 ? String(process.argv[onlyArg + 1] || '').split(',').map(s => s.trim().toUpperCase()).filter(Boolean) : [];
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
  const source = process.env.DEB_RAB_FILE || path.join(process.env.DEB_SOURCE_DIR || 'D:\\deb', 'Ekstraksi RAB', 'RAB terstandar DEB 2025-2026.xlsx');
  const book = XLSX.read(readFileSync(source), { type: 'buffer', cellDates: false });
  const sheet = book.Sheets['RAB'];
  if (!sheet) throw new Error('Sheet RAB not found in ' + source);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  const funded = rows.filter(r => String(r.didanai || '').trim().toLowerCase() === 'ya');
  const codes = Array.from(new Set(funded.map(r => String(r.kode_kampus || '').trim().toUpperCase()).filter(Boolean)));

  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const campuses = await pb.collection('campuses').getFullList({ filter: 'fundedWave = 1', fields: 'id,name,code' });
  const actor = { name: 'Muat awal (ekstraksi RAB)' };

  let created = 0, skipped = 0, missing = 0, lines = 0, items = 0;
  console.log(`${rows.length} rows in the sheet, ${funded.length} of funded campuses, ${codes.length} campus codes, ${campuses.length} funded campuses in the system.`);
  for (const code of codes) {
    const systemCode = CODE_ALIASES[code] || code;
    const campus = campuses.find(c => String(c.code).toUpperCase() === systemCode);
    if (!campus) { missing++; console.warn(`  ${code}: no funded campus with code ${systemCode}`); continue; }
    if (only.length && !only.includes(String(code).toUpperCase())) { skipped++; continue; }
    const existing = await pb.collection('rab_versions').getList(1, 1, { filter: pb.filter('campus = {:c}', { c: campus.id }), fields: 'id' });
    if (existing.totalItems && !force) { skipped++; console.log(`  ${code}: already has ${existing.totalItems} version(s), skipped`); continue; }
    const result = buildImport(funded.filter(r => String(r.kode_kampus || '').trim().toUpperCase() === code), campus.code);
    console.log(`  ${code}: ${result.kind}, ${result.rows} item rows, ${result.lines.length} lines, total ${formatSen(result.totalSen)}, termin 1 ${formatSen(result.term1Sen)}, ${result.problems.length} problems`);
    if (!apply) continue;
    const version = await createVersion(pb, actor, campus.id, {
      lines: result.lines, source: 'extraction', sourceFile: path.basename(source),
      note: `Dimuat dari ekstraksi RAB (${result.kind === 'total' ? 'RAB total' : 'RAB Termin 1 saja'}). ${result.problems.length} catatan dari berkas asal.`
    });
    created++; lines += version.count; items += version.items;
  }
  console.log(`\n${apply ? 'Loaded' : 'Would load'}: ${created} versions created, ${items} item rows, ${lines} lines in total, ${skipped} campuses skipped, ${missing} codes without campus.`);
}

main().catch(error => { console.error('RAB load failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
