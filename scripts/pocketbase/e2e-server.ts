import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { LOCAL, ROOT, installBinary, provisionInstance, migrate, start, privateJson } from './runtime';
import { seedLocal } from './seed';

let pb: ChildProcess | undefined;
let vite: ChildProcess | undefined;
const stop = () => { vite?.kill(); pb?.kill(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);
async function main() {
  await installBinary();
  const directory = path.join(LOCAL, 'tests');
  await mkdir(directory, { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(directory, 'p2-e2e-')), 'test');
  await migrate(instance);
  pb = await start(instance);
  await seedLocal(instance);
  await privateJson(path.join(LOCAL, 'e2e-instance.json'), instance);
  vite = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5179', '--strictPort'], {
    cwd: ROOT, windowsHide: true, stdio: 'inherit', env: { ...process.env, PB_URL: instance.url, DEB_LOCAL_PREVIEW_ENABLED: 'true', DEB_LOCAL_INSTANCE_DIR: instance.directory }
  });
  vite.on('error', () => { console.error('QA frontend could not start'); stop(); process.exitCode = 1; });
  vite.on('exit', code => { pb?.kill(); process.exitCode = code || 0; });
}
main().catch(() => { console.error('Isolated PocketBase E2E setup failed. Check local fixture ports/configuration.'); stop(); process.exitCode = 1; });
