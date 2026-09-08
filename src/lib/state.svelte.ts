import type { DemoSession, Role, Snapshot } from './types';
import { dataService } from './data/service';
import { DEMO_CAMPUS } from './data/seed';

const SESSION_KEY = 'deb-demo-session';
class AppState {
  session = $state<DemoSession | null>(null);
  data = $state<Snapshot | null>(null);
  ready = $state(false);
  loading = $state(false);
  busy = $state(false);
  error = $state('');
  toast = $state('');
  dialogs = $state(0);
  private revision = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  async init() {
    if (this.ready) return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const session: DemoSession = JSON.parse(raw);
        if (session.role === 'admin' || (session.role === 'campus' && session.campusId === DEMO_CAMPUS)) this.session = session;
        else sessionStorage.removeItem(SESSION_KEY);
      }
    } catch { this.error = 'Sesi demo tidak dapat dibaca. Izinkan penyimpanan browser, lalu coba masuk kembali.'; }
    this.ready = true;
    if (this.session) await this.reload();
  }
  async login(role: Role) {
    this.error = '';
    const actor: DemoSession = role === 'campus' ? { role, name: 'Universitas Contoh', campusId: DEMO_CAMPUS } : { role, name: 'Admin PF' };
    this.loading = true;
    try {
      const data = await dataService.load(actor);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(actor));
      this.session = actor; this.data = data; this.revision++;
      return true;
    } catch (e) { this.error = this.message(e); return false; }
    finally { this.loading = false; }
  }
  logout() {
    try { sessionStorage.removeItem(SESSION_KEY); }
    catch (e) { this.error = this.message(e); return false; }
    this.revision++; this.session = null; this.data = null; this.error = ''; this.toast = '';
    return true;
  }
  async reload() {
    if (!this.session) return;
    const revision = this.revision;
    this.loading = true; this.error = '';
    try { const data = await dataService.load(this.session); if (revision === this.revision) this.data = data; }
    catch (e) { this.error = this.message(e); }
    finally { this.loading = false; }
  }
  async mutate(action: () => Promise<unknown>, success: string): Promise<boolean> {
    if (this.busy) return false;
    this.busy = true; this.error = ''; this.toast = '';
    try {
      await action();
      if (this.session) this.data = await dataService.load(this.session);
      this.toast = success;
      clearTimeout(this.timer); this.timer = setTimeout(() => { this.toast = ''; }, 4500);
      return true;
    } catch (e) { this.error = this.message(e); return false; }
    finally { this.busy = false; }
  }
  async reset() {
    const done = await this.mutate(() => dataService.reset(), 'Data demo dikembalikan ke kondisi awal.');
    if (done) return this.logout();
    return false;
  }
  private message(e: unknown) { return e instanceof Error ? e.message : 'Penyimpanan gagal. Periksa ruang penyimpanan dan izin browser, lalu coba lagi.'; }
}
export const app = new AppState();
