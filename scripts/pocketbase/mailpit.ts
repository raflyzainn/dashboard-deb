import { mkdir, writeFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { LOCAL, loadInstance, adminClient } from './runtime';
const version = 'v1.31.1';
const folder = path.join(LOCAL, 'mailpit', version);
const binary = path.join(folder, 'mailpit.exe');
async function main() {
  if (process.platform !== 'win32') throw new Error('This local helper targets Windows; configure Mailpit manually on other systems.');
  await mkdir(folder, { recursive: true });
  try { await access(binary); } catch {
    const release = await fetch(`https://api.github.com/repos/axllent/mailpit/releases/tags/${version}`).then(r => r.json());
    const asset = release.assets.find((a: { name: string }) => a.name === 'mailpit-windows-amd64.zip');
    if (!asset?.digest?.startsWith('sha256:')) throw new Error('Verified Mailpit asset digest unavailable.');
    const data = Buffer.from(await fetch(asset.browser_download_url).then(r => r.arrayBuffer()));
    if ('sha256:' + createHash('sha256').update(data).digest('hex') !== asset.digest) throw new Error('Mailpit digest mismatch.');
    const archive = path.join(folder, 'mailpit.zip'); await writeFile(archive, data);
    const quote = (v: string) => "'" + v.replaceAll("'", "''") + "'";
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(folder)} -Force`], { windowsHide: true });
    if (result.status) throw new Error('Mailpit extraction failed.');
  }
  const action = process.argv[2] || 'serve';
  if (action === 'configure') {
    const pb = await adminClient(await loadInstance());
    await pb.settings.update({ smtp: { enabled: true, host: '127.0.0.1', port: 1025, username: '', password: '', tls: false, authMethod: '' }, meta: { senderName: 'DEB lokal', senderAddress: 'noreply@deb.local.test' } });
    console.log('Local SMTP configured for Mailpit only. Inbox: http://127.0.0.1:8025'); return;
  }
  const child = spawn(binary, ['--listen', '127.0.0.1:8025', '--smtp', '127.0.0.1:1025', '--database', path.join(folder, 'inbox.db')], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  child.on('error', () => { console.error('Mailpit failed to start.'); process.exitCode = 1; });
  child.stderr.on('data', () => { /* SMTP logs may contain recipient metadata; use inbox UI. */ });
  child.on('exit', code => { process.exitCode = code || 0; });
  process.on('SIGINT', () => child.kill()); process.on('SIGTERM', () => child.kill());
  console.log('Mailpit: http://127.0.0.1:8025 (SMTP 127.0.0.1:1025).');
}
main().catch(() => { console.error('Mailpit setup failed; check availability of ports/network and the local PocketBase instance.'); process.exitCode = 1; });
