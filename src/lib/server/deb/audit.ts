import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

/** One audit row per change: who, what, on which page, with the value before and after. Rows are never updated or deleted. */
export interface AuditActor { id?: string; name?: string; email?: string }
export interface AuditInput {
  actor: AuditActor | RecordModel | null;
  /** Short Indonesian verb phrase shown in the "Riwayat perubahan" block, e.g. "mengubah peran". */
  action: string;
  /** Page context key, e.g. "pengguna" or "kampus:<id>/profil". The block at the bottom of a page filters on it. */
  context: string;
  collection?: string;
  record?: string;
  campus?: string;
  before?: unknown;
  after?: unknown;
  note?: string;
}
export interface AuditEntry { id: string; actorName: string; action: string; before: unknown; after: unknown; note: string; created: string }

export function auditData(input: AuditInput) {
  const actor = (input.actor || {}) as Record<string, unknown>;
  return {
    actor: typeof actor.id === 'string' ? actor.id : '',
    actorName: String(actor.name || actor.email || 'Sistem'),
    actorEmail: String(actor.email || ''),
    action: input.action,
    context: input.context,
    collection: input.collection || '',
    record: input.record || '',
    campus: input.campus || '',
    before: input.before ?? null,
    after: input.after ?? null,
    note: input.note || ''
  };
}

export function writeAudit(pb: PocketBase, input: AuditInput) {
  return pb.collection('audit').create(auditData(input), { requestKey: null });
}

export async function readAudit(pb: PocketBase, context: string, page = 1, limit = 20): Promise<{ items: AuditEntry[]; total: number }> {
  const result = await pb.collection('audit').getList(page, limit, {
    filter: context === 'pengguna' ? 'context = "pengguna" || context ~ "pengguna:"' : pb.filter('context = {:context}', { context }),
    sort: '-created',
    fields: 'id,actorName,action,before,after,note,created',
    requestKey: null
  });
  return {
    items: result.items.map(r => ({ id: r.id, actorName: r.actorName, action: r.action, before: r.before, after: r.after, note: r.note, created: r.created })),
    total: result.totalItems
  };
}

/** Keeps only the listed keys so audit rows never carry passwords or tokens. */
export function pick<T extends Record<string, unknown>>(source: T | null | undefined, keys: string[]): Record<string, unknown> | null {
  if (!source) return null;
  const out: Record<string, unknown> = {};
  for (const key of keys) if (key in source) out[key] = source[key];
  return out;
}
