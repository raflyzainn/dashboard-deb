/**
 * Loads the staged proposal PDFs (D:\deb\Analisis\proposals\manifest.json, made by stage-proposals.py) into proposal_versions.
 * One record per campus and version, uploaded by the super admin account, idempotent through legacyId "arsip-2026:<code>:v<n>".
 * Usage: npx tsx scripts/proposals/load-proposals.ts            (dry run: matches and sizes only)
 *        npx tsx scripts/proposals/load-proposals.ts --apply    (creates the records)
 * Source files stay in D:\deb. Secrets come from .env and are never printed.
 */
import PocketBase from 'pocketbase';
import { readFileSync } from 'node:fs';
import { loadEnv, requireEnv } from '../pocketbase/env';

const DIR = 'D:/deb/Analisis/proposals/';
interface Entry { code: string; version: number; sources: string[]; parts: number; docx: unknown[]; file?: string; size?: number; sha256?: string; pages?: number }

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '');

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'DEB_SUPERADMIN_EMAIL');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const uploader = await pb.collection('users').getFirstListItem(pb.filter('email = {:e}', { e: env.DEB_SUPERADMIN_EMAIL }), { fields: 'id' });
  const campuses = await pb.collection('campuses').getFullList({ fields: 'id,name,code,acronym,initials' });
  const byKey = new Map<string, { id: string; code: string; name: string }>();
  for (const c of campuses) for (const k of [c.code, c.acronym, c.initials, c.name]) if (k) byKey.set(norm(String(k)), { id: c.id, code: c.code || c.acronym, name: c.name });
  const existing = new Set((await pb.collection('proposal_versions').getFullList({ fields: 'legacyId', filter: 'legacyId != ""' })).map(r => r.legacyId as string));
  const manifest = JSON.parse(readFileSync(DIR + 'manifest.json', 'utf8')) as Entry[];
  let created = 0, skipped = 0, pending = 0;
  const unmatched = new Set<string>();
  for (const e of manifest.sort((a, b) => a.code.localeCompare(b.code) || a.version - b.version)) {
    const campus = byKey.get(norm(e.code));
    if (!campus) { unmatched.add(e.code); continue; }
    if (!e.file) { pending++; console.log(`${campus.code} v${e.version}: no PDF yet (DOCX awaiting conversion)`); continue; }
    const legacyId = `arsip-2026:${campus.code}:v${e.version}`;
    if (existing.has(legacyId)) { skipped++; continue; }
    created++;
    console.log(`${campus.code} v${e.version}: ${Math.round((e.size || 0) / 1024)} KB, ${e.pages} pages, from ${e.sources.length} source file(s)${e.parts > 1 ? ` (${e.parts} PDF digabung)` : ''}`);
    if (!apply) continue;
    const bytes = readFileSync(DIR + e.file);
    const filename = `DEB_${campus.code.replace(/\s+/g, '')}_v${e.version}.pdf`;
    const form = new FormData();
    form.set('campus', campus.id); form.set('version', String(e.version)); form.set('filename', filename); form.set('size', String(bytes.length));
    form.set('changes', `Dimuat dari arsip Proposal DEB Sobat Bumi Tahun 2025-2026: ${e.sources.join(', ')}${e.parts > 1 ? ` (${e.parts} berkas PDF digabung menjadi satu)` : ''}.`);
    form.set('uploadedBy', uploader.id); form.set('legacyId', legacyId); form.set('simulated', 'false');
    form.set('file', new File([bytes], filename, { type: 'application/pdf' }));
    await pb.collection('proposal_versions').create(form);
  }
  console.log(`${apply ? 'Created' : 'Would create'} ${created}, already loaded ${skipped}, awaiting DOCX ${pending}, unmatched codes: ${[...unmatched].join(', ') || 'none'}.`);
  if (!apply) console.log('Dry run. Add --apply to write.');
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
