import { readFile } from 'node:fs/promises';
import path from 'node:path';

/** Imported only by the explicitly enabled loopback development configuration. */
export async function localServerConfig(directory: string, url: string) {
  const root = path.resolve('.local/pocketbase');
  const resolved = path.resolve(directory || root);
  if (resolved !== root && !resolved.startsWith(path.join(root, 'tests') + path.sep)) throw new Error('Invalid local directory');
  const marker = JSON.parse(await readFile(path.join(resolved, 'instance.json'), 'utf8'));
  if (marker.project !== 'dashboard-deb' || marker.directory !== resolved || marker.url !== url || !/^http:\/\/127\.0\.0\.1:809[67]$/.test(url)) throw new Error('Invalid local instance');
  const credentials = JSON.parse(await readFile(path.join(resolved, 'credentials.json'), 'utf8'));
  const secret = JSON.parse(await readFile(path.join(resolved, 'p1-secret.json'), 'utf8'));
  return { PB_SUPERUSER_EMAIL: credentials.superuser.email, PB_SUPERUSER_PASSWORD: credentials.superuser.password, DEB_INVITATION_KEY: secret.key };
}
