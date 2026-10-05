/**
 * Loads the one SK scan for all funded campuses into R2 and points every sk_awards row at it, with the page of Lampiran I
 * and the campus's line number there, so the SK row of each campus opens on the right page.
 * Usage: npx tsx scripts/pencairan/load-sk.ts --apply   (without --apply it only reports)
 * Source file: D:\deb (never copied into the repo). Secrets come from .env and are never printed.
 */
import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { storage } from '../../src/lib/server/deb/r2';

const SOURCE = 'D:/deb/SK-150_Penetapan Penerima Bantuan Pendanaan Gelombang Pertama Program Desa Energi Berdikari (DEB) Sobat Bumi Tahun Keberlanjutan 2025-2026.pdf';
const MATRIX = 'D:/deb/Analisis/deb-matrix.json';

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  // Lampiran I of this SK runs over pages 4 to 8 of the scan: rows 1 to 4, 5 to 9, 10 to 14, 15 to 18, 19 to 23.
  const pageOf = (no: number) => (no <= 4 ? 4 : no <= 9 ? 5 : no <= 14 ? 6 : no <= 18 ? 7 : 8);
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const store = storage(env);
  const awards = await pb.collection('sk_awards').getFullList({ filter: 'wave = 1', expand: 'campus' });
  const matrix = JSON.parse(readFileSync(MATRIX, 'utf8')) as { no: number; nama: string }[];
  const key = `sk/${awards[0].skNumber.replace(/[^A-Za-z0-9.-]+/g, '_')}.pdf`;
  const bytes = readFileSync(SOURCE);
  console.log(`SK ${awards[0].skNumber}: ${awards.length} awards, file ${bytes.length} bytes, key ${key}.`);
  if (!apply) { console.log('Dry run. Add --apply to upload and update.'); return; }
  if (!(await store.exists(key))) await store.put(key, bytes, 'application/pdf');
  let updated = 0, unmatched: string[] = [];
  for (const award of awards) {
    const name = String((award.expand as { campus?: { name?: string } } | undefined)?.campus?.name || '');
    const row = matrix.find(m => m.nama.trim().toLowerCase() === name.trim().toLowerCase());
    if (!row) unmatched.push(name);
    await pb.collection('sk_awards').update(award.id, { fileKey: key, lampiranPage: row ? pageOf(row.no) : 4, lampiranNo: row?.no || 0 });
    updated++;
  }
  console.log(`Updated ${updated} awards. Unmatched names: ${unmatched.length ? unmatched.join(', ') : 'none'}.`);
}
main().catch(error => { console.error('Load SK failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
