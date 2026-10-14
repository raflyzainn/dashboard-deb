import { reportError } from '../feedback';
import type { DataService, PreviewAccount, ProgramProfile } from '../types';
import type { DocumentKind, KpiEvidence, PaymentAction } from '../payments';
import type { PageRequest, PageResponse, SessionResponse, NavigationData } from '../page-data';

export const READ_ONLY_MESSAGE = 'Penyimpanan tidak tersedia pada sesi ini.';
export class DataReadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function createHttpService(fetcher: typeof fetch = (...args) => fetch(...args)) {
  const revisions=new Map<string,number>();
  let key = '';
  let generation = 0;
  const pending = new Set<AbortController>();
  const retries = new Map<string, string>();
  function selectAccount(next: string) {
    generation++;
    pending.forEach(controller => controller.abort());
    pending.clear(); retries.clear(); revisions.clear();
    key = next;
  }
  async function request<T>(url: string, parse: (response: Response) => Promise<T>, options: RequestInit = {}): Promise<T> {
    const started = generation;
    const controller = new AbortController();
    pending.add(controller);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetcher(url, { ...options, headers: { ...options.headers, ...(key || url === '/api/dev/accounts' ? { 'X-DEB-Preview': '1' } : {}), ...(key ? { 'X-DEB-Preview-Account': key } : {}) }, cache: 'no-store', signal: controller.signal });
      if (started !== generation) throw new DataReadError(409, 'Pilihan akun sudah berubah.');
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const fallback = response.status === 401 ? 'Sesi berakhir. Silakan masuk kembali.' : response.status === 403 ? 'Akun Anda tidak memiliki izin untuk tindakan ini.' : response.status === 409 ? 'Data sudah berubah. Muat ulang data sebelum mencoba kembali.' : response.status >= 500 ? 'Server belum dapat memproses permintaan. Coba lagi beberapa saat lagi.' : 'Permintaan belum berhasil. Periksa isian dan coba lagi.';
        throw new DataReadError(response.status, typeof body?.message === 'string' && body.message && body.message !== 'Something went wrong while processing your request.' ? body.message : fallback);
      }
      const result = await parse(response);
      if (started !== generation) throw new DataReadError(409, 'Pilihan akun sudah berubah.');
      const campus=url.match(/^\/api\/pencairan\/([^/?]+)/)?.[1];
      if(campus&&Number.isInteger((result as any)?.serverRevision))revisions.set(campus,Math.max(revisions.get(campus)||0,(result as any).serverRevision));
      if (options.method && options.method !== 'GET') reportError('');
      return result;
    } catch (error) {
      const failure = started !== generation ? new DataReadError(409, 'Pilihan akun sudah berubah.') : error instanceof DataReadError ? error : new DataReadError(503, controller.signal.aborted ? 'Permintaan terlalu lama. Periksa koneksi, lalu coba lagi.' : error instanceof SyntaxError ? 'Respons server tidak dapat dibaca. Coba muat ulang data atau ulangi tindakan Anda.' : 'Tidak dapat terhubung ke server. Periksa koneksi, lalu coba lagi.');
      // Account changes cancel obsolete requests; an anonymous session probe is expected.
      if (started === generation && !(url === '/api/session' && failure.status === 401)) reportError(failure.message);
      throw failure;
    } finally { clearTimeout(timer); pending.delete(controller); }
  }
  const session = (): Promise<SessionResponse> => request('/api/session', response => response.json());
  const navigation = (): Promise<NavigationData> => request('/api/navigation', response => response.json());
  async function page(input: PageRequest): Promise<PageResponse> {
    if (input.view === 'masters' || input.view === 'guide' || input.view === 'static') return { data: {}, loadedAt: new Date().toISOString() };
    const params = new URLSearchParams();
    if (input.period !== undefined) params.set('period', input.period);
    if (input.campus) params.set('campus', input.campus);
    if (input.question) params.set('question', input.question);
    if (input.tab) params.set('tab', input.tab);
    return request('/api/views/' + input.view + (params.size ? '?' + params : ''), response => response.json());
  }
  async function write(url: string, method: string, body: object | FormData = {}): Promise<{ ok: true; id?: string; more?: boolean }> {
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
    createPeriod: name => done(write('/api/admin/periods', 'POST', { name })),
    openPeriod: period => done(write('/api/admin/periods/open', 'POST', { period })),
    masters: () => request('/api/admin/masters', response => response.json()),
    masterAudit: (query = '', page = 1) => request('/api/admin/master-audit?' + new URLSearchParams({ q: query, page: String(page) }), response => response.json()),
    saveCampus: input => done(write('/api/admin/campuses' + (input.id ? '/' + idPath(input.id) : ''), input.id ? 'PATCH' : 'POST', input)),
    deleteCampus: (id, revision) => done(write('/api/admin/campuses/' + idPath(id), 'DELETE', { revision })),
    saveDefinition: input => done(write('/api/admin/definitions' + (input.id ? '/' + idPath(input.id) : ''), input.id ? 'PATCH' : 'POST', input)),
    activateDefinition: (id, revision) => done(write('/api/admin/definitions/' + idPath(id) + '/activate', 'POST', { revision })),
    deleteDefinition: (id, revision) => done(write('/api/admin/definitions/' + idPath(id), 'DELETE', { revision })),
    reviewProposal: (id, note, revision) => done(write(`/api/proposals/${encodeURIComponent(id)}/review`, 'POST', { note, revision })),
    proposalFile: async (id) => request(`/api/proposals/${encodeURIComponent(id)}/file`, response => response.blob()),
    submitDeb: () => done(write('/api/submissions', 'POST')),
    reviewDeb: (id, decision, note) => done(write('/api/submissions/' + idPath(id) + '/review', 'POST', { decision, note })),
    updateIndicator: (id, current, note) => done(write('/api/indicators/' + idPath(id), 'PATCH', { current, note })),
    addFeedback: (id, text, requiresRevision) => done(write('/api/indicators/' + idPath(id) + '/feedback', 'POST', { text, requiresRevision })),
    closeFeedback: id => done(write('/api/feedback/' + idPath(id) + '/close', 'POST')),
    uploadProposal: (file, changes) => { const body = new FormData(); body.set('file', file); body.set('changes', changes); return done(write('/api/proposals', 'POST', body)); },
    ask: async (title, body, categoryIds) => (await write('/api/questions', 'POST', { title, body, categoryIds })).id!,
    replies: (id, cursor = {}) => request('/api/questions/' + idPath(id) + '/replies?' + new URLSearchParams(Object.entries(cursor).map(([key, value]) => [key, String(value)])), response => response.json()),
    reply: (id, body, replyTo) => done(write('/api/questions/' + idPath(id) + '/replies', 'POST', { body, replyTo })),
    answer: (id, body) => done(write('/api/questions/' + idPath(id) + '/answer', 'PUT', { body })),
    setLike: (id, liked) => done(write('/api/questions/' + idPath(id) + '/like', liked ? 'PUT' : 'DELETE')),
    promoteFaq: id => done(write('/api/questions/' + idPath(id) + '/faq', 'POST')),
    saveFaq: entry => done(write('/api/faq' + (entry.id ? '/' + idPath(entry.id) : ''), entry.id ? 'PATCH' : 'POST', { question: entry.question, answer: entry.answer })),
    moveFaq: (id, direction) => done(write('/api/faq/' + idPath(id) + '/move', 'POST', { direction })),
    deleteFaq: id => done(write('/api/faq/' + idPath(id), 'DELETE')),
    readNotifications: async ids => {
      const started = generation;
      let more: boolean | undefined;
      do {
        if (started !== generation) throw new DataReadError(409, 'Pilihan akun sudah berubah.');
        more = (await write('/api/notifications/read', 'POST', { ids })).more;
      } while (ids === undefined && more);
    }
  };
  // Plain JSON helpers for the modules built on the real backend (users, pencairan, audit).
  const send = <T,>(url: string, method: string, body?: object | FormData): Promise<T> => {
    const revision=revisions.get(url.match(/^\/api\/pencairan\/([^/?]+)/)?.[1]||'');
    if(revision!==undefined){if(body instanceof FormData){if(!body.has('expectedRevision'))body.set('expectedRevision',String(revision));}else body={expectedRevision:revision,...body};}
    return request<T>(url, response => response.json(), {
    method, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    headers: body instanceof FormData || body === undefined ? {} : { 'Content-Type': 'application/json' }
  });};
  const api = {
    get: <T,>(url: string) => request<T>(url, response => response.json()),
    post: <T,>(url: string, body?: object | FormData) => send<T>(url, 'POST', body),
    patch: <T,>(url: string, body?: object) => send<T>(url, 'PATCH', body),
    del: <T,>(url: string, body?: object) => send<T>(url, 'DELETE', body),
    blob: (url: string) => request(url, response => response.blob())
  };
  const unavailable = () => Promise.reject(new DataReadError(404, 'Fitur ini belum tersedia pada sistem produksi.'));
  const legacy = {
    updateReadiness: (_id: string, _values: Partial<ProgramProfile>): Promise<void> => unavailable(),
    updateIndicatorTarget: (_id: string, _target: number): Promise<void> => unavailable(),
    commentProposal: (_id: string, _comment: string): Promise<void> => unavailable(),
    createPayment: (_id: string, _amount: number): Promise<void> => unavailable(),
    paymentAction: (_id: string, _revision: number, _kind: PaymentAction, _note: string): Promise<void> => unavailable(),
    uploadPaymentDocument: (_id: string, _revision: number, _kind: DocumentKind, _file: File): Promise<void> => unavailable(),
    reviewPaymentDocument: (_id: string, _revision: number, _kind: DocumentKind, _approved: boolean, _note: string): Promise<void> => unavailable(),
    addPaymentFeedback: (_id: string, _revision: number, _feedback: string): Promise<void> => unavailable(),
    savePaymentKpi: (_id: string, _revision: number, _amount: number, _kpis: KpiEvidence[]): Promise<void> => unavailable(),
    exportPayment: (_id: string, _revision: number): Promise<{ blob: Blob; filename: string }> => unavailable(),
    paymentFile: (_id: string, _fileId: string): Promise<Blob> => unavailable(),
    accountsAdmin: (path: string, body?: { changes?: { id: string; name: string; email: string; revision: number }[] }) => body ? api.post(path, body) : api.get(path),
    updateProgram: (campusId: string, values: Record<string, unknown>) => done(write('/api/campuses/' + idPath(campusId) + '/program', 'PATCH', values)) };
  return { ...service, ...legacy, api, selectAccount, session, navigation, page, async accounts(): Promise<PreviewAccount[]> {
    return request('/api/dev/accounts', async response => (await response.json()).accounts);
  } };
}
export const dataService = createHttpService();
