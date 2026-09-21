/**
 * Fills the scan of every Word version that was uploaded before the scanner existed.
 * For each document_versions record whose file name ends with .docx and whose scan is empty, the file is read from R2
 * and scanDocx's result is stored in `scan`. Versions that are not a Word package are counted and left untouched.
 *
 * Runs from the developer machine: npx tsx scripts/pencairan/rescan.ts --apply   (without --apply it only counts; --all rescans every Word file)
 * Idempotent: a version with a scan is skipped. The console shows counts and campus codes only.
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { storage } from '../../src/lib/server/deb/r2';
import { scanDocx } from '../../src/lib/server/deb/docscan';

const isEmpty = (scan: unknown) => scan === null || scan === undefined || scan === '' || (typeof scan === 'object' && !Object.keys(scan as object).length);

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  // --all rescans every Word file, for when the scanner's rules change.
  const all = process.argv.includes('--all');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);

  const collection = await pb.collections.getOne('document_versions');
  const fields = (collection.fields || []) as { name: string }[];
  if (!fields.some(f => f.name === 'scan')) {
    console.error('The scan field does not exist on document_versions. The schema has not been provisioned; nothing was changed.');
    process.exitCode = 2;
    return;
  }

  const store = storage(env);
  const rows = await pb.collection('document_versions').getFullList({ expand: 'document.disbursement.campus', sort: 'created' });
  const codeOf = (row: (typeof rows)[number]) => String(row.expand?.document?.expand?.disbursement?.expand?.campus?.code || '?');
  const word = rows.filter(r => /\.docx$/i.test(String(r.originalName || '')));
  const pending = all ? word : word.filter(r => isEmpty(r.scan));
  const perCampus = new Map<string, number>();
  for (const r of pending) perCampus.set(codeOf(r), (perCampus.get(codeOf(r)) || 0) + 1);
  console.log(`Versions ${rows.length}, Word files ${word.length}, without scan ${pending.length}.`);
  console.log('Pending per campus: ' + (perCampus.size ? Array.from(perCampus.entries()).map(([code, n]) => `${code} ${n}`).join(', ') : 'none'));
  if (!apply) { console.log('Dry run. Add --apply to store the scans.'); return; }

  let stored = 0, notWord = 0, failed = 0, withTermin2 = 0, withHighlight = 0;
  for (const row of pending) {
    try {
      const bytes = new Uint8Array(await (await store.get(String(row.r2Key))).arrayBuffer());
      const scan = await scanDocx(bytes);
      if (!scan) { notWord++; continue; }
      await pb.collection('document_versions').update(row.id, { scan });
      stored++;
      if (scan.termin2Hits.length) withTermin2++;
      if (scan.highlight) withHighlight++;
    } catch (error) {
      failed++;
      console.warn(`Failed for a version of ${codeOf(row)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  console.log(`Stored ${stored} scans: ${withTermin2} mention Termin 2, ${withHighlight} carry highlight. Not a Word package ${notWord}, failed ${failed}.`);
}

main().catch(error => { console.error('Rescan failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
