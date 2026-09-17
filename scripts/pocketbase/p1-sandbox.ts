// Disposable REST-provisioned QA database. Never mutate development business data.
import { seedLocal } from './seed';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { LOCAL, ROOT, provisionInstance, privateJson, migrate, start, adminClient } from './runtime';
async function main() {
  const directory = path.join(LOCAL, 'tests', 'p1-' + Date.now());
  const instance = await provisionInstance(directory, 'test');
  await migrate(instance);
  process.env.DEB_PUBLIC_URL = 'http://127.0.0.1:5177';
  const pbProcess = await start(instance);
  await seedLocal(instance);
  const pb = await adminClient(instance);
  await pb.settings.update({ smtp: { enabled: true, host: '127.0.0.1', port: 1025, username: '', password: '', tls: false }, meta: { senderName: 'DEB P1 test', senderAddress: 'test@deb.local.test' } });
  await privateJson(path.join(LOCAL, 'p1-test-instance.json'), instance);
  const vite = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5177', '--strictPort'], { cwd: ROOT, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PB_URL: instance.url, DEB_LOCAL_INSTANCE_DIR: directory, DEB_LOCAL_PREVIEW_ENABLED: 'true', DEB_PUBLIC_URL: 'http://127.0.0.1:5177' } });
  vite.stdout.on('data', () => {}); vite.stderr.on('data', () => {});
  const stop = () => { vite.kill(); pbProcess.kill(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  console.log('P1 isolated REST database: frontend 5177, PocketBase 8097, inbox 8025.');
}
main().catch(e => { console.error(e instanceof Error ? e.message : 'Sandbox unavailable'); process.exitCode = 1; });
