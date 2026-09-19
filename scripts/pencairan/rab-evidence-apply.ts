/**
 * Marks, per funded campus, what the campus's own RAB file really contains (checked by hand on 20 September 2026 against the
 * files in D:\deb, see docs/pencairan-deb/09-bukti-rab.md): a RAB 100%, a RAB 70%, a separate RAB 30%. Nothing is merged.
 * The marks go to the disbursement properties (buktiRab100, buktiRab70, buktiRab30, buktiRabCatatan) and the three RAB items
 * follow the evidence: no sheet in the file means Belum ada; a sheet that exists but was never looked at means Periksa
 * (perlu_konfirmasi); decisions people made on sheets that do exist are kept, except the ones listed in `reset`, which were
 * made while the screen showed nothing for a sheet that is in the file.
 * Usage: npx tsx scripts/pencairan/rab-evidence-apply.ts            (dry run)
 *        npx tsx scripts/pencairan/rab-evidence-apply.ts --apply
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { ensureDisbursement, reviewDocument, updateDisbursement } from '../../src/lib/server/deb/pencairan';
import { writeAudit } from '../../src/lib/server/deb/audit';
import { KIND_LABEL, type Kind } from '../../src/lib/pencairan';

type Mark = 'ada' | 'tidak';
interface Evidence { r100: Mark; r70: Mark; r30: Mark; note: string; reset?: ('rab_penuh' | 'rab' | 'rab_tahap2')[] }
const EVIDENCE: Record<string, Evidence> = {
  IPB: { r100: 'tidak', r70: 'ada', r30: 'tidak', note: 'Berkas 4. RAB 70_.xlsx: lembar Rencana Anggaran Biaya adalah RAB 70% Rp53.235.400 (batas Rp50.126.545); lembar Laporan masih contoh templat; tidak ada RAB 100%.' },
  ITPB: { r100: 'ada', r70: 'tidak', r30: 'tidak', note: 'RAB DEB TAHUN KEDUA (1).xlsx: satu lembar RAB 100% Rp59.637.500 (Nilai SK Rp52.951.250); tidak ada lembar 70% maupun 30%.' },
  ITS: { r100: 'ada', r70: 'tidak', r30: 'tidak', note: 'Format RAB dan Penggunaan Dana: RAB 100% Rp75.000.000 sama dengan Nilai SK; lembar Laporan masih contoh templat; tidak ada RAB 70%.' },
  IVET: { r100: 'tidak', r70: 'ada', r30: 'tidak', note: 'RANCANGAN ANGGARAN BIAYA DEB TERMIN I 2026.docx: hanya RAB 70% Rp52.500.000 (sama dengan batas).' },
  PNK: { r100: 'ada', r70: 'tidak', r30: 'tidak', note: 'RAB DEB PNK.xlsx: RAB 100% Rp75.000.000 (Nilai SK Rp74.999.000); lembar Laporan masih contoh templat; tidak ada RAB 70%.' },
  'STAI SIAK': { r100: 'tidak', r70: 'ada', r30: 'tidak', note: 'RAB TERMIN 1 TAHUN -3.pdf: hanya RAB 70% Rp50.111.600 (sama dengan batas).' },
  UBT: { r100: 'ada', r70: 'tidak', r30: 'tidak', note: 'RAB dan Penggunaan Dana DEB SoBI Tahun 2 (2).xlsx: RAB 100% Rp76.875.000 (Nilai SK Rp75.000.000); lembar Laporan masih contoh templat; tidak ada RAB 70%.' },
  UIR: { r100: 'tidak', r70: 'ada', r30: 'tidak', note: 'FORMAT RAB DAN PENGGUNAAN DANA TERMIN 1.xlsx: hanya RAB 70% Rp43.600.000 (batas Rp36.302.000); lembar Laporan diisi angka yang sama; tidak ada RAB 100%.' },
  UNAIR: { r100: 'tidak', r70: 'ada', r30: 'tidak', note: 'RANCANGAN ANGGARAN BIAYA (RAB).pdf: hanya RAB 70% Rp52.495.000 (batas Rp52.496.500); tidak ada RAB 100%.' },
  UNDIP: { r100: 'ada', r70: 'ada', r30: 'tidak', note: 'Format RAB dan Penggunaan Dana: RAB 100% Rp75.000.000 sama dengan Nilai SK; kolom Pengajuan I di lembar Laporan Rp52.527.000 (batas Rp52.500.000); tidak ada lembar 30%.' },
  UNIROW: { r100: 'ada', r70: 'tidak', r30: 'tidak', note: 'Format RAB DEB UNIROW.xlsx: RAB 100% Rp71.500.000 sama dengan Nilai SK; tidak ada lembar 70%.' },
  UNMUL: { r100: 'ada', r70: 'ada', r30: 'ada', reset: ['rab_penuh', 'rab_tahap2'], note: 'RAB KEBERLANJUTAN NEW 2026, fiks.xlsx: lembar DEB 2026 adalah RAB 100% Rp71.237.320 (sama dengan Nilai SK), TERMIN I 70% Rp49.866.124 (sama dengan batas), TERMIN II 30% Rp21.371.196; 70% + 30% = 100%. Lembar 30% belum dimuat ke RAB terkelola.' },
  UNRI: { r100: 'ada', r70: 'ada', r30: 'tidak', note: 'RAB dan Penggunaan Dana Termin 1 UNRI 2026.xlsx: RAB 100% Rp75.000.000 sama dengan Nilai SK dengan kolom PENGAJUAN 1 Rp52.500.000 (sama dengan batas); lembar Rencana realisasi 70% terisi; tidak ada lembar 30%.' },
  UNS: { r100: 'ada', r70: 'ada', r30: 'tidak', note: 'RAB DEB UNS 2026 TERMIN 1.xlsx: lembar Rencana Anggaran Biaya adalah RAB 70% Rp50.176.175 (sama dengan batas); lembar C-1 adalah RAB 100% Rp89.157.500 (Nilai SK Rp71.680.250); lembar Copy of Rencana Anggaran Biaya masih contoh templat.' },
  UNSIKA: { r100: 'ada', r70: 'ada', r30: 'tidak', note: 'Rencana Anggaran dan Biaya (RAB) dan Rencana Realisasi.xlsx: RAB 100% Rp74.703.437 sama dengan Nilai SK; kolom Pengajuan I di lembar Laporan Rp64.789.606 (batas Rp52.292.405); tidak ada lembar 30%.' },
  UNTIRTA: { r100: 'ada', r70: 'ada', r30: 'tidak', reset: ['rab_penuh'], note: 'Rencana Anggaran Biaya Sobi Untirta.pdf adalah RAB 100% Rp69.554.700 (sama dengan Nilai SK); RAB DEB UNTIRTA 2026 70%.xlsx adalah RAB 70% Rp48.969.900 (batas Rp48.688.290); tidak ada lembar 30%.' },
  UNY: { r100: 'ada', r70: 'ada', r30: 'tidak', note: 'UNY_RAB_DEB 2026.xlsx: RAB 100% Rp75.000.000 (Nilai SK Rp74.800.000) dengan kolom PENGAJUAN 1 (70%) Rp52.500.000 (batas Rp52.360.000); tidak ada lembar 30%.' },
  USB: { r100: 'ada', r70: 'tidak', r30: 'tidak', note: 'RAB_DEB_Sobat_Bumi_Pertamina_USB.xlsx: RAB 100% Rp60.000.000 sama dengan Nilai SK; tidak ada lembar 70%.' },
  USK: { r100: 'tidak', r70: 'ada', r30: 'tidak', note: '04_RAB_Termin1_DEB_SobatBumiUSK_2026.xlsx: hanya lembar RAB TERMIN 1 Rp52.500.000 (sama dengan batas); tidak ada RAB 100%.' },
  USU: { r100: 'tidak', r70: 'tidak', r30: 'tidak', note: 'Hanya tautan (RAB DEB USU 2026.url); tidak ada berkas RAB yang bisa dibaca.' },
  UB: { r100: 'tidak', r70: 'tidak', r30: 'tidak', note: 'Folder kampus tidak berisi berkas RAB.' },
  PNC: { r100: 'tidak', r70: 'tidak', r30: 'tidak', note: 'Folder kampus tidak berisi berkas RAB.' },
  ITERA: { r100: 'tidak', r70: 'tidak', r30: 'tidak', note: 'Folder kampus tidak berisi berkas RAB.' }
};
const ITEMS: { kind: 'rab_penuh' | 'rab' | 'rab_tahap2'; mark: keyof Pick<Evidence, 'r100' | 'r70' | 'r30'> }[] = [{ kind: 'rab_penuh', mark: 'r100' }, { kind: 'rab', mark: 'r70' }, { kind: 'rab_tahap2', mark: 'r30' }];
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '');

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'DEB_SUPERADMIN_EMAIL');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const admin = await pb.collection('users').getFirstListItem(pb.filter('email = {:e}', { e: env.DEB_SUPERADMIN_EMAIL }), { fields: 'id' });
  const actor = { id: admin.id, name: 'Pemeriksaan bukti berkas', email: '' };
  const campuses = await pb.collection('campuses').getFullList({ filter: 'fundedWave = 1', fields: 'id,code,acronym,name', sort: 'code' });
  let changes = 0;
  for (const c of campuses) {
    const ev = EVIDENCE[c.code] || Object.entries(EVIDENCE).find(([k]) => norm(k) === norm(c.code))?.[1];
    if (!ev) { console.log(`${c.code}: tanpa catatan bukti, dilewati`); continue; }
    const { disbursement, documents } = await ensureDisbursement(pb, c.id);
    const props = (disbursement.properties || {}) as Record<string, unknown>;
    const wanted = { buktiRab100: ev.r100, buktiRab70: ev.r70, buktiRab30: ev.r30, buktiRabCatatan: ev.note };
    const propChanges = Object.entries(wanted).filter(([k, v]) => (props[k] || '') !== v);
    const plan: string[] = [];
    if (propChanges.length) plan.push(`bukti ${ev.r100}/${ev.r70}/${ev.r30}`);
    const statusPlan: { kind: Kind; from: string; to: 'belum_ada' | 'perlu_konfirmasi'; docId: string }[] = [];
    for (const item of ITEMS) {
      const doc = documents.find(d => d.kind === item.kind)!;
      const from = String(doc.status);
      const mark = ev[item.mark];
      if (mark === 'tidak' && from !== 'belum_ada') statusPlan.push({ kind: item.kind, from, to: 'belum_ada', docId: doc.id });
      else if (mark === 'ada' && (from === 'belum_ada' || ev.reset?.includes(item.kind)) && from !== 'perlu_konfirmasi') statusPlan.push({ kind: item.kind, from, to: 'perlu_konfirmasi', docId: doc.id });
    }
    for (const s of statusPlan) plan.push(`${KIND_LABEL[s.kind]}: ${s.from} -> ${s.to}`);
    console.log(`${c.code.padEnd(10)} ${plan.length ? plan.join(' | ') : 'tidak ada perubahan'}`);
    if (!apply || !plan.length) continue;
    changes += plan.length;
    if (propChanges.length) await updateDisbursement(pb, actor, c.id, { properties: wanted });
    for (const s of statusPlan) {
      if (s.to === 'perlu_konfirmasi') { await reviewDocument(pb, actor, c.id, s.kind, 'perlu_konfirmasi', ev.note); continue; }
      await pb.collection('documents').update(s.docId, { status: 'belum_ada' }, { requestKey: null });
      await writeAudit(pb, { actor, action: `menandai ${KIND_LABEL[s.kind]} Belum ada (berkas kampus tidak memuat lembar ini)`, context: `kampus:${c.id}/pencairan/t1`, collection: 'documents', record: s.docId, campus: c.id, before: { status: s.from }, after: { status: 'belum_ada' }, note: ev.note });
    }
  }
  console.log(apply ? `Applied ${changes} changes.` : 'Dry run. Add --apply to write.');
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
