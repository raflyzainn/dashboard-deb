import { dataService } from '$lib/data/service';

/**
 * Live updates for admins. The browser subscribes to the audit collection of PocketBase with a short lived token minted by
 * the app server; every change the server records there arrives as an event, and the screens that show that campus reload
 * through the app server. Nothing is read from PocketBase directly except the feed itself.
 */
export interface Change { campus: string; context: string; action: string; actorName: string; actorId: string; collection: string; created: string }
export const live = $state({ connected: false, error: '', n: 0, last: null as Change | null, flash: '' });

type Listener = { handler: (change: Change | null) => void; campus?: string; delay: number; timer?: ReturnType<typeof setTimeout> };
const listeners = new Set<Listener>();
let started = false;
let selfId = '';
let pb: import('pocketbase').default | null = null;
let unsubscribe: (() => Promise<void>) | null = null;
let flashTimer: ReturnType<typeof setTimeout> | undefined;

const RENEW_MS = 90 * 60 * 1000;

/** Starts the feed once per browser session. Safe to call again. */
export function startRealtime(userId: string) {
  if (started || typeof window === 'undefined') return;
  started = true;
  if (import.meta.env.MODE === 'mockup') {
    live.connected = true;
    window.addEventListener('deb-dummy-change', () => notify(null));
    return;
  }
  selfId = userId;
  void connect();
  setInterval(() => void connect(true), RENEW_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') notify(null); });
}

async function connect(renew = false) {
  try {
    const grant = await dataService.api.get<{ url: string; token: string }>('/api/session/realtime');
    const { default: PocketBase } = await import('pocketbase');
    if (pb && renew) { await unsubscribe?.().catch(() => undefined); unsubscribe = null; pb.realtime.unsubscribe(); pb = null; }
    if (!pb) pb = new PocketBase(grant.url);
    pb.authStore.save(grant.token, null);
    pb.realtime.onDisconnect = () => { live.connected = false; };
    unsubscribe = await pb.collection('audit').subscribe('*', event => {
      if (event.action !== 'create') return;
      const r = event.record as Record<string, unknown>;
      const change: Change = { campus: String(r.campus || ''), context: String(r.context || ''), action: String(r.action || ''), actorName: String(r.actorName || ''), actorId: String(r.actor || ''), collection: String(r.collection || ''), created: String(r.created || '') };
      live.last = change;
      live.n++;
      // My own change is already on my screen; only other people's changes deserve a word.
      if (change.actorId !== selfId) {
        live.flash = `${change.actorName || 'Seseorang'} ${change.action}`;
        if (flashTimer) clearTimeout(flashTimer);
        flashTimer = setTimeout(() => { live.flash = ''; }, 8000);
        notify(change);
      }
    });
    live.connected = true;
    live.error = '';
  } catch (e) {
    live.connected = false;
    live.error = e instanceof Error ? e.message : 'Pembaruan langsung belum aktif.';
  }
}

function notify(change: Change | null) {
  for (const l of listeners) {
    if (change && l.campus && change.campus && change.campus !== l.campus) continue;
    if (l.timer) clearTimeout(l.timer);
    l.timer = setTimeout(() => { l.timer = undefined; l.handler(change); }, l.delay);
  }
}

/**
 * Runs the handler (debounced) after a change by someone else, or when the tab becomes visible again.
 * With `campus` set, only changes on that campus count. Returns the cleanup for $effect.
 */
export function onChange(handler: (change: Change | null) => void, options: { campus?: string; delay?: number } = {}) {
  const listener: Listener = { handler, campus: options.campus, delay: options.delay ?? 800 };
  listeners.add(listener);
  return () => { if (listener.timer) clearTimeout(listener.timer); listeners.delete(listener); };
}
