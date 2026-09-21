import { createSeed, demoNotifications, NOTIFICATION_SEED_VERSION, SHARED_DEMO_TARGETS } from './fixtures/seed';
import { PROGRAM_PROFILES } from './fixtures/programs';
import { completeDemoProgram } from './fixtures/complete-program';
import { seedPayments } from './payments';
import type { Snapshot, MasterDefinition, MasterAudit, QuestionReply } from '../../types';
import {
  DEMO_ACTIVATION_EMAIL,
  type DemoActivation
} from './activation';

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
  sourceProfileVersion?: number;
  data: Omit<Snapshot, 'definitions'> & { definitions: MasterDefinition[] };
  files: Record<string, Blob>;
  replies: QuestionReply[];
  audit: MasterAudit[];
  accounts: DemoAccount[];
  activation: DemoActivation;
}
export const DEMO_DATABASE = 'deb-standalone-demo-v6';
export function initialState(): DemoState {
  const seed = createSeed();
  const definitions = seed.data.definitions.map((d, i) => {
    return {
      ...d,
      code: `D${i + 1}`,
      baseline: 0,
      target: SHARED_DEMO_TARGETS[d.id] || 0,
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
  const state: DemoState = {
    sourceProfileVersion: 4,
    data: { ...seed.data, definitions },
    files: Object.fromEntries(seed.files.map((f) => [f.id, f.blob])),
    replies: [],
    audit: [],
    accounts: seed.data.campuses.flatMap(createCampusAccounts),
    activation: { email: DEMO_ACTIVATION_EMAIL, password: null }
  };
  seedPayments(state);
  return state;
}
export function createCampusAccounts(campus: { id: string; name: string }): DemoAccount[] {
  return ([1, 2] as const).map((slot) => ({
    id: slot === 1 ? campus.id : `${campus.id}-pic2`,
    slot,
    campusId: campus.id,
    campus: campus.name,
    name: slot === 1 ? 'Mentor Demo' : 'SoBI Demo',
    email: `${campus.id}.pic${slot}@example.test`,
    revision: 1,
    status: 'Aktif',
    active: true
  }));
}
// Upgrade existing browser data in place, preserving PIC 1 edits and all campus work.
export function upgradeAccounts(state: DemoState): boolean {
  let changed = seedPayments(state);
  if (state.sourceProfileVersion !== 4) {
    const seed = createSeed().data;
    for (const campus of state.data.campuses) {
      const source = seed.campuses.find((c) => c.id === campus.id)?.program;
      if (!source) continue;
      const program = (campus.program ??= {});
      const oldExamples = completeDemoProgram(PROGRAM_PROFILES[campus.acronym || ''] || {}, campus.acronym || '', true);
      for (const [key, value] of Object.entries(source)) {
        if (key === 'simulatedFields') continue;
        const previous = (program as Record<string, unknown>)[key];
        if (previous == null || ['', '-'].includes(String(previous).trim()) || String(previous).startsWith('#') || (program.simulatedFields?.includes(key) && previous === (oldExamples as Record<string, unknown>)[key])) {
          (program as Record<string, unknown>)[key] = value;
        }
      }
      delete program.simulatedFields;
    }
    for (const row of state.data.indicators) {
      const source = seed.indicators.find((i) => i.id === row.id);
      if (!source) continue;
      if (row.updatedAt === '2026-09-08T02:00:00.000Z') Object.assign(row, { current: source.current, baseline: source.baseline, unfilled: source.unfilled, note: source.note });
      Object.assign(row, { target: source.target, targetSimulated: true });
    }
    for (const definition of state.data.definitions) {
      if (SHARED_DEMO_TARGETS[definition.id] !== undefined) definition.target = SHARED_DEMO_TARGETS[definition.id];
    }
    const old = new Map(state.data.notifications.map((n) => [n.id, n]));
    state.data.notifications = state.data.notifications.filter((n) => !n.id.startsWith('demo-notice-') && !n.id.startsWith('demo-source-'));
    state.data.notifications.push(...demoNotifications().map((n) => ({ ...n, readAt: old.get(n.id)?.readAt || null })));
    state.data.notificationSeedVersion = NOTIFICATION_SEED_VERSION;
    state.sourceProfileVersion = 4;
    changed = true;
  }
  if (!state.activation) {
    state.activation = { email: DEMO_ACTIVATION_EMAIL, password: null };
    changed = true;
  }
  for (const account of state.accounts) {
    if (!account.id) {
      account.id = account.campusId;
      account.slot = 1;
      changed = true;
    }
    if (/^PIC [12] Demo$/.test(account.name)) {
      account.name = account.slot === 1 ? 'Mentor Demo' : 'SoBI Demo';
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
