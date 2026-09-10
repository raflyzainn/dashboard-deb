import type { Bootstrap, DataService, PreviewAccount } from '../types';

export const READ_ONLY_MESSAGE = 'Penyimpanan tidak tersedia pada sesi ini.';
export class DataReadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function createHttpService(fetcher: typeof fetch = (...args) => fetch(...args)) {
  let key = '';
  let generation = 0;
  const pending = new Set<AbortController>();
  const retries = new Map<string, string>();
  function selectAccount(next: string) {
    generation++;
    pending.forEach(controller => controller.abort());
    pending.clear(); retries.clear();
    key = next;
  }
  async function request<T>(url: string, parse: (response: Response) => Promise<T>, options: RequestInit = {}): Promise<T> {
    const started = generation;
    const controller = new AbortController();
    pending.add(controller);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetcher(url, { ...options, headers: { ...options.headers, 'X-DEB-Preview': '1', ...(key ? { 'X-DEB-Preview-Account': key } : {}) }, cache: 'no-store', signal: controller.signal });
      if (started !== generation) throw new DataReadError(409, 'Pilihan akun sudah berubah.');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new DataReadError(response.status, body.message || 'Pembacaan PocketBase gagal.');
      }
      const result = await parse(response);
      if (started !== generation) throw new DataReadError(409, 'Pilihan akun sudah berubah.');
      return result;
    } catch (error) {
      if (error instanceof DataReadError) throw error;
      throw new DataReadError(503, 'PocketBase tidak dapat dimuat. Periksa koneksi dan coba muat ulang.');
    } finally { clearTimeout(timer); pending.delete(controller); }
  }
  async function bootstrap(): Promise<Bootstrap> {
    return request('/api/bootstrap', response => response.json());
  }
  async function write(url: string, method: string, body: object | FormData = {}): Promise<{ ok: true; id?: string }> {
    const started = generation;
    const serialized = body instanceof FormData ? null : JSON.stringify(body);
    let fingerprint = method + ':' + url + ':' + serialized;
    if (body instanceof FormData) {
      const file = body.get('file') as File;
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      fingerprint += ':' + file.name + ':' + Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('') + ':' + body.get('changes');
    }
    if (generation !== started) throw new DataReadError(409, 'Pilihan akun sudah berubah.');
    const operationKey = retries.get(fingerprint) || crypto.randomUUID();
    retries.set(fingerprint, operationKey);
    try {
      const result = await request(url, response => response.json(), { method, body: serialized ?? body as FormData,
        headers: { 'Idempotency-Key': operationKey, ...(serialized === null ? {} : { 'Content-Type': 'application/json' }) } });
      if (generation === started) retries.delete(fingerprint);
      return result;
    } catch (error) {
      if (generation === started && error instanceof DataReadError && error.status < 500) retries.delete(fingerprint);
      throw error;
    }
  }
  const done = async (value: Promise<unknown>): Promise<void> => { await value; };
  const idPath = (id: string) => encodeURIComponent(id);
  const service: DataService = {
    load: async () => (await bootstrap()).data,
    proposalFile: async (id) => request(`/api/proposals/${encodeURIComponent(id)}/file`, response => response.blob()),
    submitDeb: () => done(write('/api/submissions', 'POST')),
    reviewDeb: (id, decision, note) => done(write('/api/submissions/' + idPath(id) + '/review', 'POST', { decision, note })),
    updateIndicator: (id, current, note) => done(write('/api/indicators/' + idPath(id), 'PATCH', { current, note })),
    addFeedback: (id, text, requiresRevision) => done(write('/api/indicators/' + idPath(id) + '/feedback', 'POST', { text, requiresRevision })),
    closeFeedback: id => done(write('/api/feedback/' + idPath(id) + '/close', 'POST')),
    uploadProposal: (file, changes) => { const body = new FormData(); body.set('file', file); body.set('changes', changes); return done(write('/api/proposals', 'POST', body)); },
    ask: async (title, body, categoryIds) => (await write('/api/questions', 'POST', { title, body, categoryIds })).id!,
    answer: (id, body) => done(write('/api/questions/' + idPath(id) + '/answer', 'PUT', { body })),
    setLike: (id, liked) => done(write('/api/questions/' + idPath(id) + '/like', liked ? 'PUT' : 'DELETE')),
    promoteFaq: id => done(write('/api/questions/' + idPath(id) + '/faq', 'POST')),
    saveFaq: entry => done(write('/api/faq' + (entry.id ? '/' + idPath(entry.id) : ''), entry.id ? 'PATCH' : 'POST', { question: entry.question, answer: entry.answer })),
    moveFaq: (id, direction) => done(write('/api/faq/' + idPath(id) + '/move', 'POST', { direction })),
    deleteFaq: id => done(write('/api/faq/' + idPath(id), 'DELETE')),
    readNotifications: ids => done(write('/api/notifications/read', 'POST', { ids }))
  };
  return { ...service, selectAccount, bootstrap, async accounts(): Promise<PreviewAccount[]> {
    return request('/api/dev/accounts', async response => (await response.json()).accounts);
  } };
}
export const dataService = createHttpService();
