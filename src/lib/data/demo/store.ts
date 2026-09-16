import { createSeed } from './fixtures/seed';
import type { Snapshot, MasterDefinition, MasterAudit, QuestionReply } from '../../types';

export interface DemoAccount {
  campusId: string;
  campus: string;
  name: string;
  email: string;
  revision: number;
  status: string;
  active: boolean;
}
export interface DemoState {
  data: Omit<Snapshot, 'definitions'> & { definitions: MasterDefinition[] };
  files: Record<string, Blob>;
  replies: QuestionReply[];
  audit: MasterAudit[];
  accounts: DemoAccount[];
}
export const DEMO_DATABASE = 'deb-standalone-demo-v1';
export function initialState(): DemoState {
  const seed = createSeed();
  const definitions = seed.data.definitions.map((d, i) => {
    const row = seed.data.indicators.find((r) => r.definitionId === d.id)!;
    return {
      ...d,
      code: `D${i + 1}`,
      baseline: row.baseline,
      target: row.target,
      revision: 1,
      status: 'active' as const,
      period: '',
      periodState: 'active' as const
    };
  });
  seed.data.indicators.forEach((row) => {
    const d = definitions.find((d) => d.id === row.definitionId)!;
    row.baseline = d.baseline;
    row.target = d.target;
  });
  seed.data.submissions?.forEach((s) => {
    s.period = '';
    s.indicators = seed.data.indicators
      .filter((i) => i.campusId === s.campusId)
      .map((i) => ({ ...definitions.find((d) => d.id === i.definitionId)!, ...i }));
  });
  return {
    data: { ...seed.data, definitions },
    files: Object.fromEntries(seed.files.map((f) => [f.id, f.blob])),
    replies: [],
    audit: [],
    accounts: seed.data.campuses.map((c, i) => ({
      campusId: c.id,
      campus: c.name,
      name: `PIC Demo ${i + 1}`,
      email: `kampus${i + 1}@example.test`,
      revision: 1,
      status: 'Aktif',
      active: true
    }))
  };
}
let database: Promise<IDBDatabase> | undefined;
function open() {
  return (database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DEMO_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('state');
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        database = undefined;
      };
      resolve(request.result);
    };
    request.onerror = () => {
      database = undefined;
      reject(
        new Error('Penyimpanan browser tidak tersedia. Izinkan penyimpanan situs untuk demo.')
      );
    };
  }));
}
// ponytail: one snapshot per transaction is enough for a single-browser demo; split stores if demo data grows substantially.
export async function transaction<T>(action: (state: DemoState) => T, write = false): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    const store = tx.objectStore('state');
    const request = store.get('current');
    let result: T;
    let failure: unknown;
    request.onsuccess = () => {
      try {
        const state: DemoState = request.result || initialState();
        result = action(state);
        if (write || !request.result) store.put(state, 'current');
      } catch (error) {
        failure = error;
        tx.abort();
      }
    };
    tx.oncomplete = () => resolve(result);
    tx.onabort = tx.onerror = () =>
      reject(failure || new Error('Data demo tidak tersimpan. Periksa ruang penyimpanan browser.'));
  });
}
export const resetDemo = () => transaction((s) => Object.assign(s, initialState()), true);
