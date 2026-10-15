// Additive monitoring migration; never accepts a remote URL.
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
const backup = path.join(directory, 'monitoring-schema-' + Date.now()); await mkdir(backup);
for (const name of ['monitoring_programs', 'monitoring_months', 'monitoring_versions', 'monitoring_files', 'monitoring_settings']) {
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
console.log('Only local monitoring schema was changed.');
