<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { untrack, onDestroy } from 'svelte';
  import { dataService } from '$lib/data/service';
  import type { KartuData } from './kartu-types';
  import type { Kind, Status } from '$lib/pencairan';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  /**
   * Closing row "Lampiran": the six sheet entries as chips on top (green ready, amber missing with the reason on hover), the saved files as
   * chips next to them, the real merged PDF in the middle, and one bar: preview and save. Save mints the code, stores the file and records its hash.
   */
  interface ItemVersion { id: string; number: number; originalName: string; mime: string; created: string; signed: boolean }
  interface Item { entry: number; kind: Kind; label: string; status: Status; version: ItemVersion | null; skipped: boolean; ready: boolean; state: string; blocker: string }
  interface Entry { entry: number; title: string; items: Item[] }
  interface Attachment { id: string; number: number; size: number; pages: number; sha256: string; verification: string; created: string; createdByName: string }
  interface View { entries: Entry[]; readiness: { lengkap: boolean; missing: string[] }; blockers: string[]; ready: boolean; reason: string; attachments: Attachment[] }

  let { campusId, data, onchange }: { campusId: string; data: KartuData; onchange: (next: KartuData, message?: string) => void } = $props();

  const base = $derived(`/api/pencairan/${campusId}`);
  let view = $state<View | null>(null);
  let error = $state('');
  let busy = $state<'' | 'preview' | 'simpan'>('');
  let previewUrl = $state('');
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  const ENTRY_SHORT = ['Permohonan', 'Invois', 'Kuitansi', 'RAB 70%', 'Rekening', 'Surat kuasa, PKS'];
  const day = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const chip = 'inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold';
  const chipOk = `${chip} border-transparent bg-green-50 text-green-800`;
  const chipWarn = `${chip} border-transparent bg-amber-50 text-amber-900`;
  const chipLink = `${chip} border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:bg-slate-50`;
  const btnGreen = 'inline-flex min-h-[36px] items-center justify-center gap-2 rounded-lg bg-green-700 px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_#15803d33] transition hover:bg-green-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100';

  /** Six chips, one per sheet entry. Entry 6 holds the surat kuasa and the PKS together. */
  const sources = $derived(view ? view.entries.map(e => ({
    entry: e.entry, label: ENTRY_SHORT[e.entry - 1], ready: e.items.every(i => i.ready),
    title: e.items.map(i => (i.ready ? `${i.label}: ${i.state}` : `${i.label}: ${i.blocker}`)).join('\n')
  })) : []);
  const notReady = $derived(sources.filter(s => !s.ready));
  const holdTitle = $derived(view ? view.blockers.join('\n') : '');
  /** One helper line under the disabled button: which entries still hold the file back. */
  const holdLine = $derived(!view || view.ready ? '' : notReady.length ? `Belum siap: ${notReady.map(s => s.label).join(', ')}.` : 'Semua butir harus Sesuai dulu.');
  const latest = $derived(view?.attachments[0] || null);

  function fail(e: unknown, fallback: string) { error = reportError(e instanceof Error ? e.message : fallback); }
  async function load() {
    try { view = await dataService.api.get<View>(`${base}/lampiran`); error = ''; }
    catch (e) { fail(e, 'Lampiran belum dapat dimuat.'); }
  }
  $effect(() => { void campusId; untrack(() => { void load(); }); });
  onDestroy(() => { if (previewUrl) URL.revokeObjectURL(previewUrl); if (copyTimer) clearTimeout(copyTimer); });

  /** The preview is a PDF stream, so it goes through fetch rather than the JSON helper. Same origin, the session cookie travels with it. */
  async function preview() {
    if (busy || !view?.ready) return;
    busy = 'preview'; error = '';
    try {
      const response = await fetch(`${base}/lampiran`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'preview' }), cache: 'no-store' });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Pratinjau belum dapat dibuat.');
      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(blob);
    } catch (e) { fail(e, 'Pratinjau belum dapat dibuat.'); }
    finally { busy = ''; }
  }
  async function save() {
    if (busy || !view?.ready) return;
    busy = 'simpan'; error = '';
    try {
      const next = await dataService.api.post<View>(`${base}/lampiran`, { mode: 'simpan' });
      view = next;
      if (previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl = ''; }
      onchange(await dataService.api.get<KartuData>(base), `Lampiran ${next.attachments[0]?.number || ''} tersimpan.`);
    } catch (e) { fail(e, 'Lampiran belum dapat disimpan.'); }
    finally { busy = ''; }
  }
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); copied = true; if (copyTimer) clearTimeout(copyTimer); copyTimer = setTimeout(() => (copied = false), 2000); }
    catch { error = reportError('Salin otomatis tidak tersedia. Pilih teksnya lalu salin.'); }
  }
</script>

<div class="flex h-full min-h-0 flex-1 flex-col">
  <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-auto bg-[#e5e9f0] p-4">
    <div class="flex flex-wrap items-center gap-1.5">
      {#each sources as s (s.entry)}
        <span class={s.ready ? chipOk : chipWarn} title={s.title}>{s.ready ? '✓' : '!'} {s.label}</span>
      {/each}
      {#if view?.attachments.length}
        <span class="mx-1 hidden h-5 w-px bg-slate-300 sm:block" aria-hidden="true"></span>
        {#each view.attachments as a (a.id)}
          <a class={chipLink} href={`${base}/lampiran/${a.number}`} target="_blank" rel="noopener noreferrer" title={`${a.pages} halaman · ${a.createdByName || 'Sistem'}`}><Icon name="file" size={14} />Lampiran {a.number} · {day.format(new Date(a.created))}{#if a.verification} · <span class="font-mono">{a.verification}</span>{/if}</a>
        {/each}
      {/if}
    </div>
    {#if latest?.sha256}
      <div class="flex min-w-0 flex-wrap items-center gap-2 text-xs text-slate-700">
        <span class="font-semibold">Lampiran {latest.number}</span>
        {#if latest.verification}<a class="font-mono font-semibold text-[#0066B2] hover:underline" href={`/verifikasi/${latest.verification}`} target="_blank" rel="noopener noreferrer">{latest.verification}</a>{/if}
        <span class="text-slate-500">SHA-256</span>
        <code class="min-w-0 break-all rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-800">{latest.sha256}</code>
        <button type="button" class={chipLink} onclick={() => copy(latest.sha256)}>{copied ? 'Tersalin' : 'Salin'}</button>
      </div>
    {/if}
    {#if previewUrl}
      <iframe title="Pratinjau lampiran" src={previewUrl} class="min-h-[320px] w-full flex-1 rounded-lg border border-slate-200 bg-white"></iframe>
    {:else}
      <div class="flex min-h-[200px] flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-600">{busy === 'preview' ? 'Menyusun pratinjau…' : view?.ready ? 'Klik Lihat pratinjau.' : 'Pratinjau tersedia setelah semua sumber siap.'}</div>
    {/if}
  </div>

  <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
    {#if view && view.blockers.length}<span class={chipWarn} title={holdTitle}>! {view.blockers.length} syarat belum terpenuhi</span>{/if}
    {#if holdLine}<span class="text-xs font-medium text-amber-900">{holdLine}</span>{/if}
    {#if error}<span class="text-xs font-medium text-red-700" role="alert">{error}</span>{/if}
    <span class="ml-auto flex items-center gap-2">
      <Button size="sm" variant="secondary" icon="eye" onclick={preview} loading={busy === 'preview'} disabled={!view?.ready || busy === 'simpan'}>Lihat pratinjau</Button>
      <button type="button" class={btnGreen} title={holdTitle || 'Simpan satu PDF dengan kode dan hash'} disabled={!view?.ready || Boolean(busy)} onclick={save}>
        {#if busy === 'simpan'}<span class="size-4 rounded-full border-2 border-current border-t-transparent [animation:spin_0.8s_linear_infinite]" aria-hidden="true"></span>{:else}<Icon name="save" size={15} />{/if}Simpan lampiran
      </button>
    </span>
  </div>
</div>
