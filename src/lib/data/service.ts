import type { Bootstrap, DataService, PreviewAccount } from '../types';

export const READ_ONLY_MESSAGE = 'Hanya baca pada tahap P2. Penyimpanan menyusul P3.';
export class DataReadError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function createHttpService(fetcher: typeof fetch = (...args) => fetch(...args)) {
  let key = '';
  let generation = 0;
  const pending = new Set<AbortController>();
  function selectAccount(next: string) {
    generation++;
    pending.forEach(controller => controller.abort());
    pending.clear();
    key = next;
  }
  async function request<T>(url: string, parse: (response: Response) => Promise<T>): Promise<T> {
    const started = generation;
    const controller = new AbortController();
    pending.add(controller);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetcher(url, { headers: { 'X-DEB-Preview': '1', ...(key ? { 'X-DEB-Preview-Account': key } : {}) }, cache: 'no-store', signal: controller.signal });
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
  const readonly = async (): Promise<never> => { throw new Error(READ_ONLY_MESSAGE); };
  const service: DataService = {
    load: async () => (await bootstrap()).data,
    proposalFile: async (_actor, id) => request(`/api/proposals/${encodeURIComponent(id)}/file`, response => response.blob()),
    submitDeb: readonly, reviewDeb: readonly, updateIndicator: readonly, addFeedback: readonly, closeFeedback: readonly,
    uploadProposal: readonly, ask: readonly, answer: readonly, toggleLike: readonly, promoteFaq: readonly,
    saveFaq: readonly, moveFaq: readonly, deleteFaq: readonly, readNotifications: readonly, reset: readonly
  };
  return { ...service, selectAccount, bootstrap, async accounts(): Promise<PreviewAccount[]> {
    return request('/api/dev/accounts', async response => (await response.json()).accounts);
  } };
}
export const dataService = createHttpService();
