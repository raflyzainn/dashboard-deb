// Additive reporting migration and dedicated QA fixtures; never accepts a remote URL.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import PocketBase from 'pocketbase';
import { debCollections } from './deb-schema.ts';

const vars = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).filter(l => /^[A-Z_]+=/.test(l)).map(l => { const n = l.indexOf('='); return [l.slice(0,n), l.slice(n+1).replace(/^['"]|['"]$/g,'')]; }));
const directory = path.resolve(vars.DEB_LOCAL_INSTANCE_DIR || ''), base = path.resolve('.local/pocketbase/tests');
if (!directory.startsWith(base + path.sep) || vars.PB_URL !== 'http://127.0.0.1:8097') throw Error('Only marked local PocketBase 8097 is allowed.');
const marker = JSON.parse(await readFile(path.join(directory, 'instance.json'), 'utf8'));
if (marker.project !== 'dashboard-deb' || marker.url !== vars.PB_URL || path.resolve(marker.directory) !== directory) throw Error('Local marker mismatch.');
const credentials = JSON.parse(await readFile(path.join(directory, 'credentials.json'), 'utf8'));
const pb = new PocketBase(vars.PB_URL); pb.autoCancellation(false);
pb.beforeSend = (url, options) => ({ url, options: { ...options, redirect: 'error' } });
await pb.collection('_superusers').authWithPassword(credentials.superuser.email, credentials.superuser.password);
const campusSchema = await pb.collections.getOne('campuses'), desired = debCollections(campusSchema.id);
const backup = path.join(directory, 'reporting-schema-' + Date.now()); await mkdir(backup);
for (const name of ['report_versions', 'lpj_entries']) {
  const next = desired.find(c => c.name === name);
  let current;
  try { current = await pb.collections.getOne(name); } catch (e) { if (e.status !== 404) throw e; }
  await writeFile(path.join(backup, name + '.json'), JSON.stringify(current || null, null, 2));
  if (!current) await pb.collections.create(next);
  else {
    const extra = next.fields.filter(f => !current.fields.some(old => old.name === f.name));
    const indexes = [...current.indexes, ...next.indexes.filter(index => !current.indexes.includes(index))];
    if (extra.length || indexes.length !== current.indexes.length) await pb.collections.update(current.id, { fields: [...current.fields, ...extra], indexes });
  }
  console.log('Local schema ready: ' + name);
}
if (process.argv.includes('--seed')) {
  const id = value => createHash('sha256').update('reporting-qa-20261014:' + value).digest('hex').slice(0,15);
  async function create(name, key, data) { try { return await pb.collection(name).getOne(id(key)); } catch (e) { if (e.status !== 404) throw e; return pb.collection(name).create({ id: id(key), ...data }); } }
  for (const [key, paid] of [['report-paid', true], ['report-unpaid', false]]) {
    const campus = await create('campuses', key, { name: paid ? 'Kampus QA Pelaporan Dibayar' : 'Kampus QA Pelaporan Belum Dibayar', initials: 'QA', code: key, source: 'admin', simulated: true, legacyId: key, city: 'Jakarta', fundedWave: 1, fillMode: 'admin', programYear: 'kedua', program: {} });
    await create('sk_awards', key + '-award', { campus: campus.id, skNumber: 'QA-PELAPORAN/' + key, skDate: '2026-10-14 00:00:00.000Z', wave: 1, amountSen: 100000000, programYear: 'kedua' });
    await create('disbursements', key + '-payment', { campus: campus.id, term: 1, stage: 1, revision: 1, submissionStatus: 'selesai', paidAt: paid ? '2026-10-14 00:00:00.000Z' : '', paidSen: paid ? 70000000 : 0, requestedSen: 70000000, properties: {}, applicationData: {} });
    const legacy = paid ? 'campus-951' : 'campus-952';
    credentials.users[legacy] ||= { email: legacy + '@qa-local.example.test', password: randomBytes(24).toString('base64url') };
    const cred = credentials.users[legacy];
    await create('users', key + '-user', { ...cred, passwordConfirm: cred.password, name: campus.name, role: 'campus', campus: campus.id, active: true, verified: true, simulated: true, legacyId: legacy });
    await writeFile(path.join(directory, 'credentials.json'), JSON.stringify(credentials, null, 2));
    console.log('QA fixture: ' + campus.name + ' ' + campus.id);
  }
}
console.log('Only local schema and reporting QA fixtures were changed.');
