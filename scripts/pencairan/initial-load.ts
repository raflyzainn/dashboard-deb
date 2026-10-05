/**
 * One time load of the review spreadsheet state and the campus files into the production system.
 * Reads D:\deb\Analisis (status matrix, reviewer notes, file inventory) and the campus folders, uploads every file to R2
 * as version 1, 2, ... of its slot, writes each reviewer note as the first review entry, and sets the slot status.
 *
 * Runs from the developer machine: npx tsx scripts/pencairan/initial-load.ts --apply   (dry run without --apply)
 * Idempotent per file: a file whose name already exists as a version of the same slot is skipped.
 * No personal data is printed; the console shows counts and file names only.
 */
import PocketBase from 'pocketbase';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { storage, ALLOWED_EXTENSIONS, extensionOf } from '../../src/lib/server/deb/r2';
import { addVersion, reviewDocument, ensureDisbursement, campusWithAward, context } from '../../src/lib/server/deb/pencairan';
import { writeAudit } from '../../src/lib/server/deb/audit';
import { KINDS, type Kind } from '../../src/lib/pencairan';

const TYPE_TO_KIND: Record<string, Kind> = { pks: 'pks', rab: 'rab', permohonan: 'permohonan', invoice: 'invois', kuitansi: 'kuitansi', rekening: 'rekening', surat_kuasa: 'surat_kuasa' };
const STATUS_MAP: Record<string, 'sesuai' | 'perlu_konfirmasi' | 'perlu_revisi' | 'belum_ada'> = { sesuai: 'sesuai', konfirmasi: 'perlu_konfirmasi', revisi: 'perlu_revisi', kosong: 'belum_ada' };
/** Folder names that do not match the SK spelling. */
const FOLDER_TO_CODE: Record<string, string> = { 'Politeknik Negeri Ciplacap': 'PNC', 'Universitas Sultan Syarif Ageng Tirtayasa': 'UNTIRTA', 'STAI Sulthan Syarif Hasyim SIAK': 'STAI SIAK', 'Universitas IVET': 'IVET', 'Institut Pertanian Bogor': 'IPB', 'Institut Teknologi Petroleum Balongan': 'ITPB' };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY');
  const source = process.env.DEB_SOURCE_DIR || 'D:\\deb';
  const folderRoot = path.join(source, 'Review Draft Dokumen Pencairan DEB 2025');
  const matrix = JSON.parse(readFileSync(path.join(source, 'Analisis', 'deb-matrix.json'), 'utf8')) as { no: number; nama: string; singkat: string; docs: Record<string, { status: string; catatan?: string; file?: boolean }> }[];
  const inventory = JSON.parse(readFileSync(path.join(source, 'Analisis', 'deb-inventory.json'), 'utf8')) as Record<string, { file: string; type: string; ext: string; kb: number }[]>;

  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const store = storage(env);
  const campuses = await pb.collection('campuses').getFullList({ filter: 'fundedWave = 1', fields: 'id,name,code' });
  const byCode = new Map(campuses.map(c => [c.code, c.id]));
  const byName = new Map(campuses.map(c => [norm(c.name), c.id]));
  const actor = { name: 'Muat awal (lembar review)' };

  let uploaded = 0, skipped = 0, notes = 0, others = 0;
  for (const row of matrix) {
    const campusId = byCode.get(row.singkat);
    if (!campusId) { console.warn('Campus not found for code ' + row.singkat); continue; }
    const folder = Object.keys(inventory).find(name => (FOLDER_TO_CODE[name] || '') === row.singkat) || Object.keys(inventory).find(name => byName.get(norm(name)) === campusId) || '';
    const files = folder ? inventory[folder] : [];
    console.log(`\n${row.no}. ${row.nama} (${row.singkat})${folder ? ' <- ' + folder : ' <- no folder'}: ${files.length} files`);
    if (!apply) { for (const f of files) console.log('   ', f.type.padEnd(12), f.file); continue; }
    await campusWithAward(pb, campusId);
    const { disbursement, documents } = await ensureDisbursement(pb, campusId);
    const existing = await pb.collection('document_versions').getFullList({ filter: documents.map(d => pb.filter('document = {:id}', { id: d.id })).join(' || '), fields: 'id,document,originalName' });
    for (const kind of KINDS) {
      const doc = documents.find(d => d.kind === kind)!;
      const typed = files.filter(f => TYPE_TO_KIND[f.type] === kind).sort((a, b) => a.file.localeCompare(b.file, 'id'));
      for (const f of typed) {
        if (existing.some(v => v.document === doc.id && v.originalName === f.file)) { skipped++; continue; }
        if (!ALLOWED_EXTENSIONS.includes(extensionOf(f.file))) { others++; console.log('    unsupported file type, left in the source folder:', kind, f.file); continue; }
        const full = path.join(folderRoot, folder, f.file);
        const bytes = new Uint8Array(readFileSync(full));
        await addVersion(pb, store, null, campusId, kind, { name: f.file, bytes }, { origin: 'initial_load', uploadedByName: 'Muat awal', keepStatus: true, note: 'Berkas kiriman kampus, dimuat dari folder review.' });
        uploaded++;
        console.log('    uploaded', kind, f.file, `(${f.kb} KB)`);
      }
      const cell = row.docs[kind === 'invois' ? 'invoice' : kind];
      const status = STATUS_MAP[cell?.status || 'kosong'] || 'belum_ada';
      const note = (cell?.catatan || '').trim();
      const fresh = await pb.collection('documents').getOne(doc.id);
      if (status !== 'belum_ada' && fresh.currentVersion) {
        const reviews = await pb.collection('reviews').getList(1, 1, { filter: pb.filter('version = {:v} && imported = true', { v: fresh.currentVersion }) });
        if (!reviews.totalItems) {
          await reviewDocument(pb, actor, campusId, kind, status, note || 'Dimuat dari lembar review.', { imported: true });
          notes++;
        }
      } else if (fresh.status !== status) {
        await pb.collection('documents').update(doc.id, { status });
      }
    }
    const rest = files.filter(f => !TYPE_TO_KIND[f.type]);
    others += rest.length;
    for (const f of rest) console.log('    not a slot document, left in the source folder:', f.type, f.file);
    const anyFile = files.some(f => TYPE_TO_KIND[f.type]);
    const stage = Object.values(row.docs).some(c => c.status !== 'kosong') ? 3 : anyFile ? 2 : 1;
    if (Number(disbursement.stage || 1) < stage) await pb.collection('disbursements').update(disbursement.id, { stage });
    await writeAudit(pb, { actor, action: 'memuat status awal dari lembar review', context: context(campusId), collection: 'disbursements', record: disbursement.id, campus: campusId, after: Object.fromEntries(KINDS.map(k => [k, STATUS_MAP[row.docs[k === 'invois' ? 'invoice' : k]?.status || 'kosong']])) });
  }
  console.log(`\n${apply ? 'Loaded' : 'Would load'}: uploaded ${uploaded}, skipped ${skipped}, review notes ${notes}, files outside the seven slots ${others}.`);
}

main().catch(error => { console.error('Initial load failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
