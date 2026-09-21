import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Loads KEY=VALUE lines from the repo .env, then .env.local on top of it (the same precedence as the dev server), into process.env
 * without overriding values already set in the shell. While a .env.local exists, every script targets the local instance it names.
 * Never prints values.
 */
export function loadEnv(root = process.cwd()) {
  const fromFile: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    let text = '';
    try { text = readFileSync(path.join(root, name), 'utf8'); } catch { continue; }
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      fromFile[key] = value;
    }
  }
  for (const [key, value] of Object.entries(fromFile)) if (process.env[key] === undefined) process.env[key] = value;
}

export function requireEnv(...keys: string[]) {
  const missing = keys.filter(k => !process.env[k]);
  if (missing.length) throw new Error('Missing environment values: ' + missing.join(', '));
  return Object.fromEntries(keys.map(k => [k, process.env[k] as string]));
}
