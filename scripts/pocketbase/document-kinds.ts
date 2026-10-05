/**
 * Brings the select values of documents.kind in line with DOCUMENT_KINDS in deb-schema.ts (adds missing values, removes none).
 * Touches that one field only. Usage: npx tsx scripts/pocketbase/document-kinds.ts
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';
import { DOCUMENT_KINDS } from './deb-schema';

loadEnv();
const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
const pb = new PocketBase(new URL(env.PB_URL).origin);
await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
const collection = await pb.collections.getOne('documents');
const fields = collection.fields as { name: string; values?: string[] }[];
const kind = fields.find(f => f.name === 'kind');
if (!kind) throw new Error('documents.kind not found');
const missing = DOCUMENT_KINDS.filter(v => !(kind.values || []).includes(v));
if (!missing.length) { console.log('documents.kind already has every value.'); process.exit(0); }
await pb.collections.update(collection.id, { fields: fields.map(f => (f.name === 'kind' ? { ...f, values: [...(f.values || []), ...missing] } : f)) });
console.log(`documents.kind: added ${missing.join(', ')}.`);
