import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Loads KEY=VALUE lines from the repo .env into process.env without overriding values already set. Never prints them. */
export function loadEnv(root = process.cwd()) {
  let text = '';
  try { text = readFileSync(path.join(root, '.env'), 'utf8'); } catch { return; }
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function requireEnv(...keys: string[]) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) throw new Error('Missing environment values: ' + missing.join(', '));
  return Object.fromEntries(keys.map(k => [k, process.env[k] as string]));
}
