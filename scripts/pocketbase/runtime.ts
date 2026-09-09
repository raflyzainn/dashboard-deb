import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, readdir, chmod, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import net from 'node:net';
import PocketBase from 'pocketbase';

export const VERSION = '0.40.3';
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const LOCAL = path.join(ROOT, '.local', 'pocketbase');
export const MIGRATIONS = path.join(ROOT, 'db-schema', 'pb_migrations');
export const HOOKS = path.join(ROOT, 'db-schema', 'pb_hooks');
export const BINARY = path.join(LOCAL, 'bin', VERSION, process.platform === 'win32' ? 'pocketbase.exe' : 'pocketbase');
export type LocalInstance = { project: 'dashboard-deb'; instanceId: string; kind: 'development' | 'test'; url: string; directory: string };
export type Credential = { email: string; password: string };
export type Credentials = { superuser: Credential; users: Record<string, Credential> };
export const password = () => randomBytes(24).toString('base64url');

export async function privateJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  // Restrict an empty file before writing secrets; replace atomically so interruption
  // cannot truncate the previous credentials/instance marker.
  await writeFile(temporary, '', { flag: 'wx', mode: 0o600 });
  if (process.platform === 'win32') {
    const identity = spawnSync('whoami', [], { encoding: 'utf8', windowsHide: true });
    if (identity.status !== 0) throw new Error('Cannot resolve Windows identity for private file ACL');
    const acl = spawnSync('icacls', [temporary, '/inheritance:r', '/grant:r', `${identity.stdout.trim()}:(F)`], { encoding: 'utf8', windowsHide: true });
    if (acl.status !== 0) throw new Error('Cannot restrict private file ACL');
  } else await chmod(temporary, 0o600);
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n');
  await rename(temporary, file);
}

export async function readJson<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, 'utf8')); }
export const credentialsPath = (instance: LocalInstance) => path.join(instance.directory, 'credentials.json');

export function assertLocal(instance: LocalInstance, input = instance.url) {
  const url = new URL(input);
  const port = instance.kind === 'development' ? '8096' : '8097';
  if (instance.project !== 'dashboard-deb' || !instance.instanceId || !['development', 'test'].includes(instance.kind) ||
      url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== port || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash || url.origin !== new URL(instance.url).origin) {
    throw new Error('Refusing nonlocal or mismatched DEB instance');
  }
  return url.origin;
}

export async function assertInstance(instance: LocalInstance, input = instance.url) {
  const url = assertLocal(instance, input);
  const response = await fetch(url + '/api/deb/local-instance', { redirect: 'error', signal: AbortSignal.timeout(5000) });
  const info = await response.json();
  if (!response.ok || info.project !== instance.project || info.instanceId !== instance.instanceId || info.version !== VERSION) {
    throw new Error('Refusing wrong or unmarked PocketBase instance');
  }
  return url;
}

export function client(url: string) {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  pb.beforeSend = (url, options) => ({ url, options: { ...options, redirect: 'error' } });
  return pb;
}

export async function adminClient(instance: LocalInstance) {
  const url = await assertInstance(instance, process.env.PB_URL || instance.url);
  const credentials = await readJson<Credentials>(credentialsPath(instance));
  const pb = client(url);
  await pb.collection('_superusers').authWithPassword(credentials.superuser.email, credentials.superuser.password);
  return pb;
}

export async function installBinary() {
  if (existsSync(BINARY)) {
    const result = spawnSync(BINARY, ['--version'], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0 || !result.stdout.includes(VERSION)) throw new Error('Installed PocketBase version mismatch');
    return;
  }
  const platform = { win32: 'windows', linux: 'linux', darwin: 'darwin' }[process.platform as string];
  const architecture = { x64: 'amd64', arm64: 'arm64' }[process.arch as string];
  if (!platform || !architecture) throw new Error('Unsupported PocketBase platform');
  const asset = `pocketbase_${VERSION}_${platform}_${architecture}.zip`;
  const base = `https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/`;
  const [archive, sums] = await Promise.all([fetch(base + asset), fetch(base + 'checksums.txt')]);
  if (!archive.ok || !sums.ok) throw new Error('PocketBase download failed');
  const bytes = Buffer.from(await archive.arrayBuffer());
  const expected = (await sums.text()).split('\n').find(line => line.trim().endsWith(asset))?.split(/\s+/)[0];
  if (!expected || createHash('sha256').update(bytes).digest('hex') !== expected) throw new Error('PocketBase checksum mismatch');
  await mkdir(path.dirname(BINARY), { recursive: true });
  const zip = path.join(path.dirname(BINARY), asset);
  await writeFile(zip, bytes);
  const result = process.platform === 'win32'
    ? spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `$ErrorActionPreference = 'Stop'; Expand-Archive -LiteralPath '${zip.replaceAll("'", "''")}' -DestinationPath '${path.dirname(BINARY).replaceAll("'", "''")}' -Force`], { encoding: 'utf8', windowsHide: true })
    : spawnSync('unzip', ['-o', zip, '-d', path.dirname(BINARY)], { encoding: 'utf8' });
  if (result.status !== 0 || !existsSync(BINARY)) throw new Error('PocketBase extraction failed: ' + (result.error?.message || result.stderr));
  if (process.platform !== 'win32') await chmod(BINARY, 0o700);
  console.log(`PocketBase ${VERSION} downloaded and SHA-256 verified.`);
}

export async function provisionInstance(directory = LOCAL, kind: LocalInstance['kind'] = 'development') {
  const marker = path.join(directory, 'instance.json');
  if (existsSync(marker)) {
    const existing = await readJson<LocalInstance>(marker);
    assertLocal(existing);
    if (existing.directory !== directory || existing.kind !== kind) throw new Error('Instance directory mismatch');
    return existing;
  }
  if (existsSync(path.join(directory, 'pb_data'))) throw new Error('Refusing to mark an existing unowned database');
  const instance: LocalInstance = { project: 'dashboard-deb', instanceId: randomUUID(), kind, directory, url: `http://127.0.0.1:${kind === 'development' ? 8096 : 8097}` };
  await privateJson(credentialsPath(instance), { superuser: { email: 'superuser@deb.local.test', password: password() }, users: {} });
  await privateJson(marker, instance);
  return instance;
}

export async function loadInstance() {
  const instance = await readJson<LocalInstance>(path.join(LOCAL, 'instance.json'));
  if (instance.directory !== LOCAL || instance.kind !== 'development') throw new Error('Invalid development marker');
  assertLocal(instance);
  return instance;
}

export async function portAvailable(instance: LocalInstance) {
  assertLocal(instance);
  await new Promise<void>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => reject(new Error(`Port ${new URL(instance.url).port} is occupied; stop the verified DEB process first.`)));
    server.listen(Number(new URL(instance.url).port), '127.0.0.1', () => server.close(error => error ? reject(error) : resolve()));
  });
}

export function args(instance: LocalInstance) {
  return [`--dir=${path.join(instance.directory, 'pb_data')}`, `--migrationsDir=${MIGRATIONS}`, `--hooksDir=${HOOKS}`, '--automigrate=false'];
}

export async function migrate(instance: LocalInstance) {
  await portAvailable(instance);
  const result = spawnSync(BINARY, ['migrate', 'up', ...args(instance)], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(result.error?.message || String(result.stdout) + String(result.stderr));
  console.log(result.stdout.trim());
  const credentials = await readJson<Credentials>(credentialsPath(instance));
  // Create only on first setup. Never reset an existing superuser password on rerun.
  const initialized = path.join(instance.directory, 'initialized.json');
  if (!existsSync(initialized)) {
    const result = spawnSync(BINARY, ['superuser', 'create', credentials.superuser.email, credentials.superuser.password, ...args(instance)], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error('Local superuser provisioning failed (credentials redacted).');
    await privateJson(initialized, { initialized: true });
  }
}

export async function start(instance: LocalInstance): Promise<ChildProcess> {
  await portAvailable(instance);
  const child = spawn(BINARY, ['serve', `--http=127.0.0.1:${new URL(instance.url).port}`, ...args(instance)], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, DEB_LOCAL_INSTANCE_ID: instance.instanceId }
  });
  let logs = '';
  child.stdout?.on('data', chunk => { logs = (logs + chunk).slice(-16000); });
  child.stderr?.on('data', chunk => { logs = (logs + chunk).slice(-16000); });
  let spawnError: Error | undefined;
  child.once('error', error => { spawnError = error; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError || child.exitCode !== null) throw new Error('PocketBase startup failed: ' + (spawnError?.message || logs));
    try { await assertInstance(instance); return child; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  child.kill();
  throw new Error('PocketBase startup timed out: ' + logs);
}

export async function preview() {
  const files = (await readdir(MIGRATIONS)).filter(name => name.endsWith('.js')).sort();
  console.log('Read-only migration inventory (not a pending-diff):\n' + files.join('\n'));
  console.log('Apply with npm run pb:migrate while the local DEB server is stopped. Test fresh apply with npm run test:pb.');
}
