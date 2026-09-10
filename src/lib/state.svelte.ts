import type { AppSession, PreviewAccount, Snapshot } from './types';
import { dataService, DataReadError, READ_ONLY_MESSAGE } from './data/service';

const SESSION_KEY = 'deb-pocketbase-preview-account';
class AppState {
  session = $state<AppSession | null>(null);
  data = $state<Snapshot | null>(null);
  accounts = $state<PreviewAccount[]>([]);
  ready = $state(false);
  loading = $state(false);
  accountsLoading = $state(false);
  busy = $state(false);
  readOnly = true;
  error = $state('');
  toast = $state('');
  loadedAt = $state('');
  stale = $state(false);
  dialogs = $state(0);
  private revision = 0;
  private initializing = false;

  async init() {
    if (this.ready || this.initializing) return;
    this.initializing = true;
    let key = '';
    try { key = sessionStorage.getItem(SESSION_KEY) || ''; } catch { /* Selection persistence is optional. */ }
    if (key) await this.login(key);
    if (!this.session) await this.loadAccounts();
    this.ready = true;
    this.initializing = false;
  }
  async loadAccounts() {
    const revision = this.revision;
    this.accountsLoading = true; this.error = '';
    try { const accounts = await dataService.accounts(); if (revision === this.revision) this.accounts = accounts; }
    catch (error) { if (revision === this.revision) { this.accounts = []; this.error = this.message(error); } }
    finally { this.accountsLoading = false; }
  }
  async login(key: string) {
    const revision = ++this.revision;
    dataService.selectAccount(key);
    this.session = null; this.data = null; this.loadedAt = ''; this.stale = false; this.dialogs = 0;
    this.loading = true; this.error = '';
    try {
      const result = await dataService.bootstrap();
      if (revision !== this.revision) return false;
      this.session = result.session; this.data = result.data; this.loadedAt = result.loadedAt;
      try { sessionStorage.setItem(SESSION_KEY, key); } catch { /* Select an account again after refresh. */ }
      return true;
    } catch (error) {
      if (revision === this.revision) { this.error = this.message(error); try { sessionStorage.removeItem(SESSION_KEY); } catch { /* optional */ } }
      return false;
    } finally { if (revision === this.revision) this.loading = false; }
  }
  logout() {
    this.revision++; dataService.selectAccount('');
    this.session = null; this.data = null; this.error = ''; this.toast = ''; this.loadedAt = ''; this.stale = false; this.loading = false; this.dialogs = 0;
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* selection only */ }
    void this.loadAccounts();
    return true;
  }
  async reload() {
    if (!this.session || this.loading) return;
    const revision = this.revision;
    this.loading = true; this.error = '';
    try {
      const result = await dataService.bootstrap();
      if (revision === this.revision) { this.session = result.session; this.data = result.data; this.loadedAt = result.loadedAt; this.stale = false; }
    } catch (error) {
      if (revision !== this.revision) return;
      if (error instanceof DataReadError && [401, 403].includes(error.status)) this.logout();
      else this.stale = true;
      this.error = this.message(error);
    } finally { if (revision === this.revision) this.loading = false; }
  }
  async mutate(_action: () => Promise<unknown>, _success: string): Promise<boolean> {
    this.error = READ_ONLY_MESSAGE;
    return false;
  }
  private message(error: unknown) { return error instanceof Error ? error.message : 'Pembacaan PocketBase gagal. Coba muat ulang.'; }
}
export const app = new AppState();
