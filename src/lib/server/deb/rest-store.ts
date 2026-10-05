import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';
import { security } from './security';
import { PreviewError } from './preview-error';
import { validateRecord } from './business/validation';

export class StoreRecord {
  id: string;
  data: Record<string, any>;
  persisted: boolean;
  private previous: Record<string, any>;
  constructor(public name: string, data?: Record<string, any>) {
    this.id = data?.id || security.randomString(15);
    this.data = { ...data, id: this.id }; this.persisted = Boolean(data); this.previous = { ...this.data };
  }
  collection() { return { name: this.name }; }
  isNew() { return !this.persisted; }
  original() { return new StoreRecord(this.name, this.previous); }
  markSaved() { this.previous = { ...this.data }; }
  get(key: string): any { const v = this.data[key === 'tokenKey' ? 'sessionVersion' : key]; return v && typeof v === 'object' && !(v instanceof Blob) ? JSON.stringify(v) : v ?? ''; }
  getString(key: string) { return String(this.get(key)); }
  getBool(key: string) { return Boolean(this.data[key]); }
  getFloat(key: string) { return Number(this.data[key] || 0); }
  getInt(key: string) { return Math.trunc(this.getFloat(key)); }
  set(key: string, value: any) { this.data[key === 'tokenKey' ? 'sessionVersion' : key] = value; }
  email() { return this.getString('email'); }
  setEmail(value: string) { this.set('email', value); }
  setPassword(value: string) { this.set('password', value); this.set('passwordConfirm', value); }
}

// Only the static filters in the business modules are evaluated. No eval/SQL interpolation.
function predicate(source: string, params: Record<string, any>, resolve: (field: string) => any): boolean {
  if (!source) return true;
  const tokens = source.match(/\{:[a-zA-Z_][\w]*\}|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|&&|\|\||!=|>=|<=|[()=<>]|-?\d+(?:\.\d+)?|[a-zA-Z_][\w.]*/g) || [];
  let i = 0;
  function value(): any {
    const t = tokens[i++];
    if (!t) throw new Error('Invalid business filter');
    if (t.startsWith('{:')) return params[t.slice(2, -1)];
    if (t[0] === '"') return JSON.parse(t);
    if (t[0] === "'") return t.slice(1, -1);
    if (t === 'true' || t === 'false') return t === 'true';
    if (/^-?\d/.test(t)) return Number(t);
    return resolve(t);
  }
  function compare(): boolean {
    if (tokens[i] === '(') { i++; const result = or(); if (tokens[i++] !== ')') throw new Error('Invalid business filter'); return result; }
    const a = value(), op = tokens[i++], b = value();
    switch (op) { case '=': return a === b; case '!=': return a !== b; case '>': return a > b; case '<': return a < b; case '>=': return a >= b; case '<=': return a <= b; default: throw new Error('Invalid business filter'); }
  }
  function and(): boolean { let result = compare(); while (tokens[i] === '&&') { i++; const next = compare(); result = result && next; } return result; }
  function or(): boolean { let result = and(); while (tokens[i] === '||') { i++; const next = and(); result = result || next; } return result; }
  const result = or(); if (i !== tokens.length) throw new Error('Invalid business filter'); return result;
}

export class RestStore {
  records = new Map<string, StoreRecord[]>();
  writes: { method: 'create' | 'update' | 'delete'; name: string; id: string; data: Record<string, any> }[] = [];
  constructor(rows: Record<string, RecordModel[]>) { for (const [name, list] of Object.entries(rows)) this.records.set(name, list.map(r => new StoreRecord(name, r))); }
  findCollectionByNameOrId(name: string) { if (!this.records.has(name)) throw new Error('Collection not loaded: ' + name); return name; }
  findRecordById(name: string, id: string) { const r = this.records.get(name)?.find(r => r.id === id); if (!r) throw new PreviewError(404, 'Data tidak ditemukan.'); return r; }
  findRecordsByFilter(name: string, filter = '', sort = 'id', limit = 0, offset = 0, params = {}): StoreRecord[] {
    if (!this.records.has(name)) throw new Error('Collection not loaded: ' + name);
    const result = this.records.get(name)!.filter(record => predicate(filter, params, field => {
      if (field === 'definition.status') return this.findRecordById('indicator_definitions', record.getString('definition')).getString('status');
      return record.data[field] ?? '';
    }));
    result.sort((a, b) => {
      for (const field of sort.split(',')) { const reverse = field.startsWith('-'), key = field.replace(/^[-+]/, ''); const av = a.data[key] ?? '', bv = b.data[key] ?? ''; if (av !== bv) return (av < bv ? -1 : 1) * (reverse ? -1 : 1); }
      return 0;
    });
    return result.slice(offset, limit ? offset + limit : undefined);
  }
  save(record: StoreRecord) {
    validateRecord({ app: this, record });
    const method = record.persisted ? 'update' : 'create';
    if (!record.persisted) { this.records.get(record.name)!.push(record); record.persisted = true; }
    const data = { ...record.data };
    for (const key of ['collectionId', 'collectionName', 'expand', 'created', 'updated']) delete data[key];
    this.writes.push({ method, name: record.name, id: record.id, data });
    record.markSaved();
  }
  delete(record: StoreRecord) { this.records.set(record.name, this.records.get(record.name)!.filter(r => r.id !== record.id)); this.writes.push({ method: 'delete', name: record.name, id: record.id, data: {} }); }
  runInTransaction<T>(fn: (store: RestStore) => T): T { return fn(this); }
}

export const BUSINESS_COLLECTIONS = ['users', 'campuses', 'indicator_definitions', 'campus_indicators', 'deb_submissions', 'indicator_feedback', 'proposal_versions', 'questions', 'question_answers', 'question_replies', 'question_likes', 'faq_entries', 'activities', 'notifications', 'workflow_operations', 'master_audit', 'campus_contacts', 'account_invitations', 'account_audit', 'auth_limits', 'email_challenges'];

type SnapshotQuery = { filter?: string; sort?: string; fields?: string; limit?: number };
// null initializes a collection for inserts without downloading its history.
export type SnapshotReads = Record<string, SnapshotQuery | SnapshotQuery[] | null>;

/** Unique revision inserts fence every collection read or written by this snapshot.
 * ponytail: overlapping collections still serialize, even for different records; use finer scopes only with coordinated cross-scope reads.
 * Every application write must use this function. Direct superuser edits require maintenance.
 * PocketBase applies the fence and all writes in one native REST batch transaction.
 */
export async function atomic<T>(pb: PocketBase, action: (store: RestStore) => T, reads: string[] | SnapshotReads): Promise<T> {
  const queries: SnapshotReads = Array.isArray(reads) ? Object.fromEntries(reads.map(name => [name, {}])) : reads;
  for (let attempt = 0; attempt < 8; attempt++) {
    // Capture every possible write scope BEFORE reading business data, including insert-only collections.
    const versions = new Map(await Promise.all(Object.keys(queries).map(async scope => {
      const latest = await pb.collection('app_revisions').getList(1, 1, {
        filter: pb.filter('scope = {:scope}', { scope }), sort: '-sequence', fields: 'sequence', skipTotal: true
      });
      return [scope, Number(latest.items[0]?.sequence || 0)] as const;
    })));
    const rows = Object.fromEntries(await Promise.all(Object.entries(queries).map(async ([name, query]) => {
      const lists = await Promise.all((query === null ? [] : Array.isArray(query) ? query : [query]).map(async ({ limit, ...options }) =>
        limit ? (await pb.collection(name).getList(1, limit, { sort: 'id', ...options, skipTotal: true })).items : pb.collection(name).getFullList({ sort: 'id', ...options })));
      return [name, [...new Map(lists.flat().map(record => [record.id, record])).values()]];
    })));
    const store = new RestStore(rows), result = action(store);
    if (!store.writes.length) return result;
    // Master changes must remain atomic; never split them into partially committed batches.
    const scopes = [...new Set([...Object.keys(queries).filter(name => queries[name] !== null), ...store.writes.map(write => write.name)])].sort();
    if (store.writes.length + scopes.length > 2000) throw new PreviewError(413, 'Operasi melebihi kapasitas transaksi. Kurangi jumlah perubahan atau hubungi administrator.');
    const batch = pb.createBatch();
    for (const scope of scopes) batch.collection('app_revisions').create({ scope, sequence: versions.get(scope)! + 1 });
    for (const write of store.writes) {
      const collection = batch.collection(write.name);
      if (write.method === 'delete') collection.delete(write.id);
      else if (write.method === 'create') collection.create(write.data);
      else collection.update(write.id, write.data);
    }
    try { await batch.send({ requestKey: null }); return result; }
    catch (error) {
      // Retry only a known rolled-back batch. Unknown transport outcomes retain the caller's idempotency key.
      const e = error as { status?: number; response?: any };
      if (e.status === 400 && scopes.some((_, index) => e.response?.data?.requests?.[String(index)]?.response?.data?.sequence?.code === 'validation_not_unique')) continue;
      if (e.status === 400) throw new PreviewError(409, 'Data berubah atau tidak valid. Muat ulang sebelum mencoba lagi.');
      throw new PreviewError(503, 'Penyimpanan belum dapat dipastikan. Coba ulang operasi yang sama.');
    }
  }
  throw new PreviewError(409, 'Data sedang diperbarui. Coba lagi.');
}
