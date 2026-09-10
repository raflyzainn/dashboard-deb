// Disposable copy of a verified backup. Never seed, reset, or mutate the development business data.
import { cp, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { LOCAL, ROOT, provisionInstance, privateJson, credentialsPath, migrate, start, adminClient } from './runtime';
async function main() {
  const backup = (await readdir(path.join(LOCAL, 'maintenance'))).filter(n => !n.includes('rollback')).sort().reverse()[0];
  if (!backup) throw new Error('Verified backup required.');
  const directory = path.join(LOCAL, 'tests', 'p1-' + Date.now());
  const instance = await provisionInstance(directory, 'test');
  await cp(path.join(LOCAL, 'maintenance', backup, 'pb_data'), path.join(directory, 'pb_data'), { recursive: true, errorOnExist: true, force: false });
  await cp(path.join(LOCAL, 'credentials.json'), credentialsPath(instance));
  await cp(path.join(LOCAL, 'initialized.json'), path.join(directory, 'initialized.json'));
  await migrate(instance);
  process.env.DEB_PUBLIC_URL = 'http://127.0.0.1:5177';
  const pbProcess = await start(instance);
  const pb = await adminClient(instance);
  await pb.settings.update({ smtp: { enabled: true, host: '127.0.0.1', port: 1025, username: '', password: '', tls: false }, meta: { senderName: 'DEB P1 test', senderAddress: 'test@deb.local.test' } });
  await privateJson(path.join(LOCAL, 'p1-test-instance.json'), instance);
  const vite = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5177', '--strictPort'], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PB_URL: instance.url, DEB_LOCAL_INSTANCE_DIR: directory, DEB_LOCAL_PREVIEW_ENABLED: 'true' } });
  vite.stdout.on('data', () => {}); vite.stderr.on('data', () => {});
  const stop = () => { vite.kill(); pbProcess.kill(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  console.log('P1 isolated copy: frontend 5177, PocketBase 8097, inbox 8025.');
}
main().catch(e => { console.error(e instanceof Error ? e.message : 'Sandbox unavailable'); process.exitCode = 1; });
