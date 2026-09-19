/**
 * Provisions the production PocketBase for Dashboard DEB: the existing 22 collections (from db-schema/collections.json),
 * the Pencairan collections, the extra user and campus fields, batch and rate limit settings, the 40 campuses,
 * the 23 SK awards, program settings and the super admin account.
 *
 * Idempotent: it merges into what exists and never deletes collections, fields or records.
 * Usage: npx tsx scripts/pocketbase/provision-deb.ts --apply   (without --apply it only reports)
 * Secrets are read from .env and never printed.
 */
import PocketBase from 'pocketbase';
import type { CollectionModel } from 'pocketbase';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadEnv, requireEnv } from './env';
import { debCollections, CAMPUS_EXTRA, USER_EXTRA, USER_ROLES } from './deb-schema';
import { CAMPUSES, CAMPUS_REGIONS } from '../../src/lib/data/demo/fixtures/campuses';
import { CAMPUS_LOCATIONS } from '../../src/lib/data/demo/fixtures/locations';

const SK_NUMBER = 'Kpts-150/06A0000/2026-S1A';
const SK_DATE = '2026-06-02 00:00:00.000Z';
/** SK codes whose acronym differs in the demo roster. */
const CODE_TO_ACRONYM: Record<string, string> = { IVET: 'UNISVET', 'STAI SIAK': 'STAI SUSHA' };

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD', 'DEB_PUBLIC_URL', 'DEB_SUPERADMIN_EMAIL', 'DEB_SUPERADMIN_PASSWORD');
  const url = new URL(env.PB_URL);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Use HTTPS for a remote PocketBase.');
  const pb = new PocketBase(url.origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const existing = await pb.collections.getFullList();
  console.log(`Connected. ${existing.length} collections exist.`);

  // 1. Base schema from the existing application, merged so operator changes are kept.
  const schema = JSON.parse(readFileSync(path.join(process.cwd(), 'db-schema', 'collections.json'), 'utf8')) as CollectionModel[];
  const definitions = structuredClone(schema);
  const ids = new Map(definitions.filter(c => c.id).map(c => [c.id, existing.find(e => e.name === c.name)?.id || c.id]));
  const campusesId = ids.get(definitions.find(c => c.name === 'campuses')!.id)!;
  for (const definition of definitions) {
    const prior = existing.find(c => c.name === definition.name);
    if (prior) definition.id = prior.id;
    // The existing rules know only the admin role; a super admin must pass the same rules.
    for (const rule of ['listRule', 'viewRule', 'createRule', 'updateRule', 'deleteRule'] as const) {
      const value = (definition as unknown as Record<string, string | null>)[rule];
      if (typeof value === 'string' && value.includes('@request.auth.role = "admin"')) (definition as unknown as Record<string, string | null>)[rule] = value.replaceAll('@request.auth.role = "admin"', '(@request.auth.role = "admin" || @request.auth.role = "super_admin")');
    }
    if (definition.name === 'users') {
      const role = definition.fields.find(f => f.name === 'role') as { values?: string[] } | undefined;
      if (role) role.values = USER_ROLES;
      definition.fields.push(...USER_EXTRA.filter(f => !definition.fields.some(d => d.name === f.name)) as never[]);
      // Keep the Microsoft provider configuration that was set by hand in the PocketBase dashboard.
      if (prior && (prior as unknown as { oauth2?: unknown }).oauth2) (definition as unknown as { oauth2: unknown }).oauth2 = (prior as unknown as { oauth2: unknown }).oauth2;
      (definition as unknown as { authRule: string }).authRule = 'active = true && verified = true && simulated = false';
      // Several accounts per campus (mentor, koordinator) are allowed; the old one account per campus index is dropped.
      definition.indexes = (definition.indexes || []).filter(i => !i.includes('idx_users_campus'));
    }
    if (definition.name === 'campuses') definition.fields.push(...CAMPUS_EXTRA.filter(f => !definition.fields.some(d => d.name === f.name)) as never[]);
    definition.fields = definition.fields.map(field => {
      const saved = prior?.fields.find(f => f.name === field.name);
      return { ...field, ...(saved ? { id: saved.id } : {}), ...(field.type === 'relation' ? { collectionId: ids.get(String((field as { collectionId?: string }).collectionId)) || (field as { collectionId?: string }).collectionId } : {}) };
    }) as never;
    if (prior) definition.fields.push(...prior.fields.filter(f => !definition.fields.some(d => d.name === f.name)) as never[]);
  }
  // 2. Pencairan collections.
  for (const definition of debCollections(campusesId) as unknown as CollectionModel[]) {
    const prior = existing.find(c => c.name === definition.name);
    if (prior) {
      definition.id = prior.id;
      definition.fields = definition.fields.map(field => ({ ...field, ...(prior.fields.find(f => f.name === field.name) ? { id: prior.fields.find(f => f.name === field.name)!.id } : {}) })) as never;
      definition.fields.push(...prior.fields.filter(f => !definition.fields.some(d => d.name === f.name)) as never[]);
    }
    definitions.push(definition);
  }
  console.log(`Schema prepared: ${definitions.length} collections (${definitions.filter(d => !existing.some(e => e.name === d.name)).length} new).`);
  if (!apply) { console.log('Dry run. Add --apply to write.'); return; }

  await pb.collections.import(definitions, false);
  await pb.settings.update({ meta: { appURL: env.DEB_PUBLIC_URL }, batch: { enabled: true, maxRequests: 2000, timeout: 30, maxBodySize: 16777216 } });
  const current = await pb.settings.getAll();
  if (!current.rateLimits?.enabled) await pb.settings.update({ rateLimits: { enabled: true, rules: [{ label: '*:auth', audience: '', duration: 60, maxRequests: 60 }, { label: '/api/', audience: '', duration: 10, maxRequests: 600 }] } });
  console.log('Collections and settings written.');

  // 3. The 40 campuses (names and regions from the roster, approximate city coordinates) and the SK codes of the 23.
  const source = process.env.DEB_SOURCE_DIR || 'D:\\deb';
  const matrix = JSON.parse(readFileSync(path.join(source, 'Analisis', 'deb-matrix.json'), 'utf8')) as { no: number; nama: string; singkat: string; tahun: string; nilai: number }[];
  const byAcronym = new Map<string, string>();
  const campusRecords = await pb.collection('campuses').getFullList({ fields: 'id,name,code' });
  let campusCount = 0;
  for (const [index, campus] of CAMPUSES.entries()) {
    const point = CAMPUS_LOCATIONS[index];
    const sk = matrix.find(row => (CODE_TO_ACRONYM[row.singkat] || row.singkat) === campus.acronym);
    const data = {
      // The SK spelling is canonical for the funded campuses; the roster name stays for the others.
      name: sk ? sk.nama : campus.name, initials: campus.initials, acronym: campus.acronym, region: campus.region, city: campus.city || '',
      province: point?.province || '', island: point?.island || '', latitude: point?.latitude ?? null, longitude: point?.longitude ?? null,
      hasLocation: Boolean(point), locationApproximate: true, source: 'admin', revision: 1, simulated: false,
      code: sk ? sk.singkat : campus.acronym, fundedWave: sk ? 1 : null, fillMode: sk ? 'admin' : 'campus',
      programYear: sk ? (sk.tahun.toLowerCase().startsWith('ked') ? 'kedua' : 'ketiga') : null
    };
    const prior = campusRecords.find(r => (r.code && r.code === data.code) || r.name === campus.name || r.name === data.name);
    const record = prior ? await pb.collection('campuses').update(prior.id, data) : await pb.collection('campuses').create(data);
    byAcronym.set(campus.acronym, record.id);
    campusCount++;
  }
  console.log(`Campuses upserted: ${campusCount}.`);

  // 4. SK awards for the 23 funded campuses. Amounts are stored in sen.
  const awards = await pb.collection('sk_awards').getFullList({ fields: 'id,campus,skNumber' });
  let awardCount = 0;
  for (const row of matrix) {
    const campusId = byAcronym.get(CODE_TO_ACRONYM[row.singkat] || row.singkat);
    if (!campusId) { console.warn('No campus for SK code ' + row.singkat); continue; }
    const data = { campus: campusId, skNumber: SK_NUMBER, skDate: SK_DATE, wave: 1, amountSen: row.nilai * 100, programYear: row.tahun.toLowerCase().startsWith('ked') ? 'kedua' : 'ketiga', locked: true, note: 'Lampiran I nomor ' + row.no };
    const prior = awards.find(a => a.campus === campusId && a.skNumber === SK_NUMBER);
    if (prior) await pb.collection('sk_awards').update(prior.id, data); else await pb.collection('sk_awards').create(data);
    awardCount++;
  }
  console.log(`SK awards upserted: ${awardCount}.`);

  // 5. Program settings, one per program year, filled by admins in the app.
  for (const programYear of ['kedua', 'ketiga']) {
    const found = await pb.collection('program_settings').getList(1, 1, { filter: pb.filter('programYear = {:y}', { y: programYear }) });
    if (!found.totalItems) await pb.collection('program_settings').create({ programYear, programLabel: programYear === 'kedua' ? 'Tahun Kedua' : 'Tahun Ketiga' });
  }

  // 6. Super admin account with a password, so the app can be used before the first Microsoft sign in.
  const email = env.DEB_SUPERADMIN_EMAIL.trim().toLowerCase();
  const found = await pb.collection('users').getList(1, 1, { filter: pb.filter('email = {:email}', { email }) });
  if (found.totalItems) {
    const patch: Record<string, unknown> = { role: 'super_admin', active: true, verified: true };
    if (process.argv.includes('--reset-superadmin-password')) { patch.password = env.DEB_SUPERADMIN_PASSWORD; patch.passwordConfirm = env.DEB_SUPERADMIN_PASSWORD; }
    await pb.collection('users').update(found.items[0].id, patch);
    console.log('Super admin account updated.');
  } else {
    await pb.collection('users').create({ email, name: 'Sysadmin', password: env.DEB_SUPERADMIN_PASSWORD, passwordConfirm: env.DEB_SUPERADMIN_PASSWORD, role: 'super_admin', active: true, verified: true, emailVisibility: false, simulated: false, sessionVersion: randomBytes(25).toString('hex') });
    console.log('Super admin account created.');
  }
  console.log('Done.');
}

main().catch(error => { console.error('Provisioning failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
