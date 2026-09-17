import { createSeed } from './fixtures/seed';
import type { Snapshot, MasterDefinition, MasterAudit, QuestionReply } from '../../types';

export interface DemoAccount {
  id: string;
  slot: 1 | 2;
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
export const DEMO_DATABASE = 'deb-standalone-demo-v6';
export function initialState(): DemoState {
  const seed = createSeed();
  const definitions = seed.data.definitions.map((d, i) => {
    return {
      ...d,
      code: `D${i + 1}`,
      baseline: 0,
      target: 0,
      revision: 1,
      status: 'active' as const,
      period: '',
      periodState: 'active' as const
    };
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
    accounts: seed.data.campuses.flatMap(createCampusAccounts)
  };
}
export function createCampusAccounts(campus: { id: string; name: string }): DemoAccount[] {
  return ([1, 2] as const).map((slot) => ({
    id: slot === 1 ? campus.id : `${campus.id}-pic2`,
    slot,
    campusId: campus.id,
    campus: campus.name,
    name: `PIC ${slot} Demo`,
    email: `${campus.id}.pic${slot}@example.test`,
    revision: 1,
    status: 'Aktif',
    active: true
  }));
}
// Upgrade existing browser data in place, preserving PIC 1 edits and all campus work.
export function upgradeAccounts(state: DemoState): boolean {
  let changed = false;
  for (const account of state.accounts) {
    if (!account.id) {
      account.id = account.campusId;
      account.slot = 1;
      changed = true;
    }
  }
  for (const campus of state.data.campuses) {
    for (const account of createCampusAccounts(campus)) {
      if (!state.accounts.some((a) => a.campusId === campus.id && a.slot === account.slot)) {
        state.accounts.push(account);
        changed = true;
      }
    }
  }
  return changed;
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
        const upgraded = upgradeAccounts(state);
        result = action(state);
        if (write || !request.result || upgraded) store.put(state, 'current');
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
