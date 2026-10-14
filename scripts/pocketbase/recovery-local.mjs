// Local recovery drill only. Pause QA writes while capturing DB and object files.
import { DatabaseSync, backup } from 'node:sqlite';
import { createHash, randomUUID } from 'node:crypto';
import { cp, mkdir, readdir, readFile, writeFile, realpath } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import path from 'node:path';

const root = await realpath(process.cwd());
const vars = Object.fromEntries((await readFile('.env.local', 'utf8')).split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]] : [];
}));
const source = await realpath(vars.DEB_LOCAL_INSTANCE_DIR || '.');
const allowed = await realpath(path.join(root, '.local/pocketbase/tests'));
if (!source.startsWith(allowed + path.sep) || vars.PB_URL !== 'http://127.0.0.1:8097') throw Error('Only marked QA 8097 is allowed.');
const marker = JSON.parse(await readFile(path.join(source, 'instance.json'), 'utf8'));
if (marker.project !== 'dashboard-deb' || marker.url !== vars.PB_URL || path.resolve(marker.directory) !== source) throw Error('QA marker mismatch.');
if (!process.argv.includes('--qa-writes-paused')) throw Error('Pause QA writes, then pass --qa-writes-paused.');
const folder = path.join(allowed, 'recovery-' + new Date().toISOString().replaceAll(':', '-') + '-' + randomUUID().slice(0, 8));
const snapshot = path.join(folder, 'backup'), restored = path.join(folder, 'restored');
await mkdir(path.join(snapshot, 'pb_data'), { recursive: true });
const digest = value => createHash('sha256').update(value).digest('hex');
function tables(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    if (db.prepare('PRAGMA integrity_check').all().some(row => Object.values(row)[0] !== 'ok')) throw Error('Database integrity failed.');
    return Object.fromEntries(db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(({ name }) => {
      const statement = db.prepare('SELECT * FROM "' + name.replaceAll('"', '""') + '"');
      statement.setReadBigInts(true);
      // ponytail: local QA tables fit in memory; stream row digests before using this on larger databases.
      const rows = statement.all().map(row => JSON.stringify(row, (_, value) => typeof value === 'bigint' ? value.toString() : value)).sort();
      return [name, { count: rows.length, sha256: digest(JSON.stringify(rows)) }];
    }));
  } finally { db.close(); }
}
async function files(directory) {
  const result = {};
  for (const entry of await readdir(directory, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
    if (entry.isSymbolicLink()) throw Error('Symlink not allowed in recovery inputs.');
    if (entry.isDirectory()) for (const [name, hash] of Object.entries(await files(path.join(directory, entry.name)))) result[entry.name + '/' + name] = hash;
    else if (entry.isFile()) result[entry.name] = digest(await readFile(path.join(directory, entry.name)));
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const dbNames = (await readdir(path.join(source, 'pb_data'))).filter(name => name.endsWith('.db')).sort();
const databases = {}, objects = {};
async function captureDatabase(name) {
  const db = new DatabaseSync(path.join(source, 'pb_data', name), { readOnly: true });
  try { await backup(db, path.join(snapshot, 'pb_data', name)); } finally { db.close(); }
  databases[name] = tables(path.join(snapshot, 'pb_data', name));
}
await captureDatabase('data.db');
for (const directory of ['objects', 'pb_data/storage']) {
  objects[directory] = await files(path.join(source, directory));
  await cp(path.join(source, directory), path.join(snapshot, directory), { recursive: true, errorOnExist: true, force: false }).catch(error => { if (error.code !== 'ENOENT') throw error; });
  if (!equal(objects[directory], await files(path.join(snapshot, directory))) || !equal(objects[directory], await files(path.join(source, directory)))) throw Error('Object files changed during backup. Pause QA writes and retry.');
}
// Verify the business DB stayed stable across copying external objects; auxiliary logs may continue.
if (!equal(databases['data.db'], tables(path.join(source, 'pb_data/data.db')))) throw Error('Data changed during backup. Pause QA writes and retry.');
console.log('QA database and objects snapshot verified; QA writes may resume.');
for (const name of dbNames.filter(name => name !== 'data.db')) await captureDatabase(name);
await cp(snapshot, restored, { recursive: true, errorOnExist: true, force: false });
for (const name of dbNames) {
  if (digest(await readFile(path.join(snapshot, 'pb_data', name))) !== digest(await readFile(path.join(restored, 'pb_data', name)))) throw Error('Restored database file differs.');
  if (!equal(databases[name], tables(path.join(restored, 'pb_data', name)))) throw Error('Restored tables differ.');
}
for (const directory of Object.keys(objects)) if (!equal(objects[directory], await files(path.join(restored, directory)))) throw Error('Restored objects differ.');
await new Promise((resolve, reject) => {
  const server = net.createServer(); server.once('error', reject); server.listen(8098, '127.0.0.1', () => server.close(resolve));
});
const binary = path.join(root, '.local/pocketbase/bin/0.40.3', process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
const child = spawn(binary, ['serve', '--http=127.0.0.1:8098', '--dir=' + path.join(restored, 'pb_data'), '--automigrate=false'], { windowsHide: true, stdio: 'ignore' });
const stopped = once(child, 'exit');
let healthy = false;
try {
  for (let i = 0; i < 40 && child.exitCode === null; i++) {
    try { const response = await fetch('http://127.0.0.1:8098/api/health', { redirect: 'error', signal: AbortSignal.timeout(500) }); healthy = response.ok && (await response.json()).code === 200; } catch {}
    if (healthy) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!healthy) throw Error('Restored PocketBase health failed.');
} finally { if (child.exitCode === null) child.kill(); await stopped; }
const manifest = { createdAt: new Date().toISOString(), source: 'marked QA 8097', databases, objects, restoredIntegrity: true, restoredHealth: 200, restoredProcessStopped: true };
await writeFile(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ folder, databases: dbNames, tables: Object.values(databases).reduce((sum, value) => sum + Object.keys(value).length, 0), objects: Object.values(objects).reduce((sum, value) => sum + Object.keys(value).length, 0), restoredHealth: 200, restoredProcessStopped: true }));
