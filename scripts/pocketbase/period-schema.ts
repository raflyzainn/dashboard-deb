// Additive schema-only upgrade. Blank periods identify the existing active period.
import type PocketBase from 'pocketbase';
import schema from '../../db-schema/collections.json' with { type: 'json' };
import { pathToFileURL } from 'node:url';
import { LOCAL, readJson, adminClient, assertLocal, type LocalInstance } from './runtime';
import path from 'node:path';

export async function applyPeriodSchema(pb: PocketBase) {
  const fields: Record<string, string[]> = {
    indicator_definitions: ['period', 'periodState'], campus_indicators: ['unfilled'], deb_submissions: ['period']
  };
  const changed = [];
  for (const [name, names] of Object.entries(fields)) {
    const current = await pb.collections.getOne(name);
    const target = schema.find(c => c.name === name)!;
    for (const field of target.fields.filter(f => names.includes(f.name))) {
      if (!current.fields.some(f => f.name === field.name)) current.fields.push(field as any);
    }
    for (const indexName of ['idx_indicator_definitions_code', 'idx_deb_submissions_version']) {
      const index = target.indexes.find(i => i.includes(indexName + ' '));
      if (index) current.indexes = [...current.indexes.filter(i => !i.includes(indexName + ' ')), index];
    }
    if (name === 'indicator_definitions') {
      for (const rule of ['listRule','viewRule'] as const) if (current[rule] !== null && !current[rule]?.includes('periodState')) {
        current[rule] = `(${current[rule] || 'true'}) && (@request.auth.role != "campus" || periodState != "draft")`;
      }
    }
    changed.push(current);
  }
  await pb.collections.import(changed, false);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const instance = await readJson<LocalInstance>(path.join(LOCAL, 'instance.json'));
  assertLocal(instance);
  await applyPeriodSchema(await adminClient(instance));
  console.log('Local period schema upgraded; existing records preserved.');
}
