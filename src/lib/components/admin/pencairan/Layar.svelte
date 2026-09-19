<script lang="ts">
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { dataService } from '$lib/data/service';
  import { KINDS, KIND_LABEL, KIND_SHORT, KIND_FILE, LOOK_AT, FIELDS, DECISION_LABEL, RAIL_WORD, ITEM_STATE_LABEL, formatSen, parseSen, type Kind, type ItemState } from '$lib/pencairan';
  import type { KartuData, Version, Check } from './kartu-types';
  import Icon from '$lib/components/ui/Icon.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import FileViewer from './FileViewer.svelte';
  import RabTable from './RabTable.svelte';
  import TandaTanganView from './TandaTanganView.svelte';
  import LampiranView from './LampiranView.svelte';
  import PembayaranView from './PembayaranView.svelte';
  import RiwayatSheet from './RiwayatSheet.svelte';

  /**
   * The campus screen: the items on the left, the document in the middle, one action bar at the bottom.
   * Nine items (SK first, then the eight columns of the review sheet) and three closing rows. Every decision is one click.
   * mode campus: the same screen read only, with an upload button where a file is needed.
   */
  type Row = Kind | 'ttd' | 'lampiran' | 'bayar';
  const CLOSING: { key: Row; label: string }[] = [{ key: 'ttd', label: 'Tanda tangan' }, { key: 'lampiran', label: 'Lampiran' }, { key: 'bayar', label: 'Pembayaran' }];
  let { campusId, mode = 'admin' }: { campusId: string; mode?: 'admin' | 'campus' } = $props();

  let data = $state<KartuData | null>(null);
  let error = $state('');
  let notice = $state('');
  let busy = $state(false);
  let refresh = $state(0);
  let selectedVersionId = $state('');
  let draft = $state<Record<string, string | boolean>>({});
  let saved = $state('');
  let noteInput = $state<HTMLTextAreaElement | null>(null);
  let noteBody = $state('');
  let noteInternal = $state(false);
  let threadEl = $state<HTMLDivElement | null>(null);
  let reviewNote = $state('');
  let bankNameSeen = $state('');
  /** True while the admin reopens the buttons on an item that already has a decision. */
  let editing = $state(false);
  let showLook = $state(false);
  let showRiwayat = $state(false);
  let rabTab = $state<'digital' | 'asli'>('digital');
  let docHeight = $state(560);
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let fileInput = $state<HTMLInputElement | null>(null);

  const admin = $derived(mode === 'admin');
  const base = $derived(admin ? `/admin/pencairan/${campusId}` : '/campus/pencairan');
  const canUpload = $derived(admin || data?.campus.fillMode === 'campus');
  const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const full = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const dot: Record<ItemState, string> = { sesuai: 'bg-green-600', tidak_perlu: 'bg-green-200', perlu_konfirmasi: 'bg-[#0066B2]', menunggu_review: 'bg-sky-400', perlu_revisi: 'bg-amber-500', belum_ada: 'bg-white ring-1 ring-slate-300' };
  const chipClass: Record<Check['level'], string> = { ok: 'bg-green-50 text-green-800', warn: 'bg-amber-50 text-amber-900', bad: 'bg-red-50 text-red-800', info: 'bg-blue-50 text-[#015a9a]' };

  const requested = $derived.by<Row>(() => { const k = page.url.searchParams.get('butir'); return k && ([...KINDS, 'ttd', 'lampiran', 'bayar'] as string[]).includes(k) ? (k as Row) : firstOpen(); });
  function firstOpen(): Row {
    if (!data) return 'sk';
    const k = KINDS.find(k => !['sesuai', 'tidak_perlu'].includes(data!.readiness.items[k]));
    return k || (admin && data.readiness.lengkap ? 'ttd' : 'sk');
  }
  const selected = $derived<Row>(requested);
  const isItem = $derived((KINDS as readonly string[]).includes(selected));
  const kind = $derived<Kind>(isItem ? (selected as Kind) : 'sk');
  const doc = $derived(data?.documents.find(d => d.kind === kind) || null);
  const state = $derived<ItemState>(data ? data.readiness.items[kind] : 'belum_ada');
  const version = $derived<Version | null>(doc ? doc.versions.find(v => v.id === selectedVersionId) || doc.versions.find(v => v.id === doc.currentVersionId) || doc.versions[doc.versions.length - 1] || null : null);
  const isCurrent = $derived(Boolean(version && doc && version.id === doc.currentVersionId));
  const fileUrl = $derived(version ? `/api/pencairan/${campusId}/documents/${kind}/versions/${version.id}` : '');
  const spec = $derived(FIELDS[kind]);
  const chips = $derived.by(() => {
    if (!data) return [] as Check[];
    const mine = data.checks.filter(c => c.kind === kind);
    const bad = mine.filter(c => c.level === 'bad').slice(0, 2);
    if (bad.length) return bad;
    return [...mine.filter(c => c.level === 'warn').slice(0, 1), ...mine.filter(c => c.level === 'ok').slice(0, 1), ...(mine.some(c => c.level === 'warn' || c.level === 'ok') ? [] : mine.filter(c => c.level === 'info').slice(0, 1))];
  });
  const thread = $derived(doc ? doc.versions.flatMap(v => v.reviews.map(r => ({ ...r, version: v.number }))).sort((a, b) => b.created.localeCompare(a.created)) : []);
  const campusThread = $derived(thread.filter(r => r.decision === 'perlu_revisi' && r.note));
  /** The conversation on this item, oldest first. Decisions keep their own note in the bar and their history in Riwayat. */
  const conversation = $derived(doc ? [...doc.notes].sort((a, b) => a.created.localeCompare(b.created)) : []);
  $effect(() => { void conversation.length; const el = threadEl; if (el) requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; }); });
  /** The review note is one editable text: it starts as the sheet's commentary and is saved again with every decision. */
  const latestNote = $derived(thread.find(r => r.note)?.note || '');
  $effect(() => { const n = latestNote; untrack(() => { reviewNote = n; }); });
  const closingDone = $derived.by(() => {
    if (!data) return { ttd: false, lampiran: false, bayar: false } as Record<string, boolean>;
    const letters = data.documents.filter(d => d.generated);
    return { ttd: letters.length > 0 && letters.every(d => d.originalReceived), lampiran: data.lampiranCount > 0, bayar: Boolean(data.disbursement.paidAt) };
  });
  const decided = $derived(state === 'sesuai' || state === 'tidak_perlu');
  /** The decision statement replaces the buttons once an item is decided, until the admin opens them again. */
  const showDecision = $derived(admin && (decided || state === 'perlu_revisi') && !editing);
  const decisionLabel = $derived(state === 'perlu_revisi' ? DECISION_LABEL[kind].bad : state === 'tidak_perlu' ? 'Tanpa surat kuasa' : DECISION_LABEL[kind].ok);
  /** A surat kuasa counted as not needed because the account holder signs the PKS has no decision to take back. */
  const computedOnly = $derived(state === 'tidak_perlu' && doc?.status !== 'tidak_perlu');
  const canDecide = $derived(admin && data !== null && (kind === 'sk' || kind === 'rab' || Boolean(version)));

  function say(message: string) { notice = message; if (noticeTimer) clearTimeout(noticeTimer); if (message) noticeTimer = setTimeout(() => (notice = ''), 4000); }
  function apply(next: KartuData, message = '') { data = next; error = ''; refresh++; if (message) say(message); }
  async function load() {
    try { apply(await dataService.api.get<KartuData>(`/api/pencairan/${campusId}`)); }
    catch (e) { error = e instanceof Error ? e.message : 'Layar belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });
  $effect(() => {
    void selected;
    untrack(() => { selectedVersionId = ''; bankNameSeen = ''; editing = false; showLook = false; rabTab = 'digital'; });
  });
  $effect(() => {
    const v = version;
    const next: Record<string, string | boolean> = {};
    for (const f of spec) {
      const value = v?.fields?.[f.key];
      if (f.type === 'money') next[f.key] = typeof value === 'number' ? formatSen(value, false) : '';
      else if (f.type === 'bool') next[f.key] = Boolean(value);
      else if (f.type === 'names') next[f.key] = Array.isArray(value) ? value.join(', ') : '';
      else next[f.key] = typeof value === 'string' ? value : '';
    }
    draft = next; saved = JSON.stringify(next);
  });
  $effect(() => {
    const fit = () => (docHeight = Math.max(360, Math.min(820, Math.round(window.innerHeight * (window.innerWidth < 1024 ? 0.52 : 0.62)))));
    fit();
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
      if (e.key === 'Escape') { if (showRiwayat || showLook) { showRiwayat = false; showLook = false; } else if (admin) void goto('/admin/pencairan/tahap-1'); }
      if (e.key === 'Enter' && !typing && admin && isItem && canDecide && !decided && !showDecision) void decide('ok');
    };
    window.addEventListener('resize', fit); window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('keydown', onKey); };
  });

  const open = (row: Row) => goto(`${base}?butir=${row}`, { replaceState: true, noScroll: true, keepFocus: true });
  async function run(action: () => Promise<KartuData>, message: string) {
    if (busy) return false;
    busy = true; error = '';
    try { apply(await action(), message); return true; }
    catch (e) { error = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; return false; }
    finally { busy = false; }
  }
  function collect() {
    const out: Record<string, unknown> = {};
    for (const f of spec) {
      const raw = draft[f.key];
      if (f.type === 'money') { const sen = parseSen(String(raw || '')); if (String(raw || '').trim() && sen === null) throw new Error(`${f.label}: tulis angka rupiah, misalnya 52.499.300.`); out[f.key] = sen; }
      else if (f.type === 'bool') out[f.key] = Boolean(raw);
      else if (f.type === 'names') out[f.key] = String(raw || '').split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
      else out[f.key] = String(raw || '').trim();
    }
    return out;
  }
  /** Values save when the checker leaves a field; nothing to click. */
  async function saveIfChanged() {
    if (!admin || !version || !isCurrent) return;
    const now = JSON.stringify(draft);
    if (now === saved) return;
    saved = now;
    await run(() => dataService.api.patch<KartuData>(`/api/pencairan/${campusId}/documents/${kind}/versions/${version.id}`, { fields: collect() }), 'Tersimpan.');
  }
  function nextAfter(current: Kind): Row {
    const rest = KINDS.slice(KINDS.indexOf(current) + 1).find(k => data && !['sesuai', 'tidak_perlu'].includes(data.readiness.items[k]));
    return rest || firstOpen();
  }
  async function decide(which: 'ok' | 'bad' | 'none') {
    if (!data || !admin) return;
    if (which !== 'none' && !canDecide) return;
    await saveIfChanged();
    const note = reviewNote.trim();
    if (which === 'bad' && !note) { error = kind === 'sk' ? 'Tulis nilai yang tercetak di SK di kolom catatan.' : 'Tulis catatan untuk kampus dulu.'; noteInput?.focus(); return; }
    const decision = which === 'ok' ? 'sesuai' : which === 'none' ? 'tidak_perlu' : 'perlu_revisi';
    const body: Record<string, unknown> = { decision, note };
    if (kind === 'rekening') body.bank = { result: which === 'ok' ? 'sesuai' : 'berbeda', nameSeen: bankNameSeen.trim() || (which === 'bad' ? note : '') };
    const url = kind === 'rab' ? `/api/pencairan/${campusId}/rab/keputusan` : `/api/pencairan/${campusId}/documents/${kind}/review`;
    const ok = await run(() => dataService.api.post<KartuData>(url, body), which === 'ok' ? `${KIND_SHORT[kind]}: ${DECISION_LABEL[kind].ok}.` : which === 'none' ? 'Ditandai tanpa surat kuasa.' : `${KIND_SHORT[kind]}: catatan revisi tersimpan.`);
    if (ok) { bankNameSeen = ''; editing = false; if (which !== 'bad') void open(nextAfter(kind)); }
  }
  /** Takes the decision back: the item returns to Periksa, the history keeps both entries. */
  async function undo() {
    if (!data || !admin || !isItem) return;
    const url = kind === 'rab' ? `/api/pencairan/${campusId}/rab/keputusan` : `/api/pencairan/${campusId}/documents/${kind}/review`;
    const body = kind === 'rab' ? { decision: 'batal' } : { decision: 'perlu_konfirmasi', note: '' };
    const ok = await run(() => dataService.api.post<KartuData>(url, body), `${KIND_SHORT[kind]}: keputusan dibatalkan, butir kembali ke Periksa.`);
    if (ok) editing = false;
  }
  /** The latest managed RAB version in the same workbook layout as the template, built in the browser. */
  async function exportRab() {
    if (!data || busy) return;
    busy = true; error = '';
    try {
      const overview = await dataService.api.get<{ campus: { code: string; name: string }; version: { number: number; lines: { level: number; code: string; title: string; unit: string; volume: number; amountSen: number; term1Sen: number }[] } | null }>(`/api/pencairan/${campusId}/rab`);
      if (!overview.version) throw new Error('Belum ada RAB terkelola untuk diekspor.');
      const { downloadRabWorkbook, linesToRows } = await import('$lib/rab-excel');
      await downloadRabWorkbook(`RAB_${overview.campus.code.replace(/\s+/g, '')}_Tahap1_v${overview.version.number}.xlsx`, { title: `RAB · ${overview.campus.name}`, tahap1: linesToRows(overview.version.lines) });
      say(`Versi ${overview.version.number} diekspor.`);
    } catch (e) { error = e instanceof Error ? e.message : 'Ekspor belum berhasil.'; }
    finally { busy = false; }
  }
  /** A filled template becomes the next managed RAB version; the table and the checks refresh at once. */
  /** One message on the conversation; staff may keep it internal. */
  async function sendNote() {
    const body = noteBody.trim();
    if (!body) return;
    const ok = await run(() => dataService.api.post<KartuData>(`/api/pencairan/${campusId}/documents/${kind}/catatan`, { body, internal: admin && noteInternal }), noteInternal && admin ? 'Catatan internal tersimpan.' : 'Catatan terkirim.');
    if (ok) { noteBody = ''; noteInternal = false; }
  }
  const grow = (e: Event) => { const t = e.currentTarget as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; };
  async function importRab(file: File | null) {
    if (!file || !admin) return;
    const body = new FormData();
    body.set('file', file);
    await run(async () => { await dataService.api.post(`/api/pencairan/${campusId}/rab/import`, body); return dataService.api.get<KartuData>(`/api/pencairan/${campusId}`); }, 'RAB diimpor sebagai versi baru.');
  }
  async function upload(file: File | null) {
    if (!file || !canUpload) return;
    const body = new FormData();
    body.set('file', file); body.set('note', '');
    const ok = await run(async () => { const next = await dataService.api.post<KartuData>(`/api/pencairan/${campusId}/documents/${kind}/versions`, body); selectedVersionId = ''; return next; }, admin ? `Versi baru tersimpan.` : 'Berkas terkirim.');
    if (ok && fileInput) fileInput.value = '';
  }
</script>

{#if error && !data}
  <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat…</p>
{:else}
  <div class="grid gap-2 [&>*]:min-w-0">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      {#if admin}<a href="/admin/pencairan/tahap-1" class="inline-flex items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Tahap 1</a>{/if}
      <CampusLogo code={data.campus.code} initials={data.campus.initials} size={36} /><h1 class="text-xl font-bold text-slate-900">{data.campus.name}</h1>
      <span class="text-xs text-slate-500">Tahun {data.summary.programYear === 'kedua' ? 'Kedua' : 'Ketiga'}</span>
      {#if admin && data.readiness.revisi > 0}<a href={`/admin/pencairan/${campusId}/revisi`} class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 hover:bg-amber-200">Ringkasan revisi · {data.readiness.revisi}</a>{/if}
      {#if notice}<span class="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-800" role="status">{notice}</span>{/if}
      {#if error}<span class="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-800" role="alert">{error}</span>{/if}
    </div>

    <div class="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_10px_30px_#0b254508] lg:grid-cols-[224px_minmax(0,1fr)]">
      <aside class="flex gap-1 overflow-x-auto border-b border-slate-200/70 bg-slate-50/80 p-2 lg:grid lg:content-start lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:border-r lg:p-2.5" aria-label="Butir">
        <span class="hidden px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:block">Butir</span>
        {#each KINDS as k}
          {@const s = data.readiness.items[k]}
          <button type="button" class="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition {selected === k ? 'bg-white font-bold text-slate-900 shadow-[0_4px_12px_#0b254514]' : 'text-slate-700 hover:bg-white/70'}" onclick={() => open(k)} aria-current={selected === k ? 'true' : undefined} title={ITEM_STATE_LABEL[s]}>
            <i class="size-2.5 shrink-0 rounded-full {dot[s]}"></i><span class="whitespace-nowrap">{KIND_SHORT[k]}</span><span class="ml-auto pl-2 text-[11px] font-medium text-slate-400">{admin ? RAIL_WORD[s] : s === 'perlu_revisi' ? 'Perbaiki' : s === 'belum_ada' ? 'Kirim' : s === 'sesuai' ? 'Sesuai' : s === 'tidak_perlu' ? 'Tidak perlu' : 'Diperiksa'}</span>
          </button>
        {/each}
        {#if admin}
          <span class="hidden lg:block lg:my-1.5 lg:border-t lg:border-slate-200/70"></span>
          <span class="hidden px-2.5 pb-1 text-[10.5px] font-bold uppercase tracking-[0.06em] text-slate-400 lg:block">Sebelum dibayar</span>
          {#each CLOSING as c}
            {@const on = data.readiness.lengkap || closingDone[c.key]}
            <button type="button" class="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13px] transition {selected === c.key ? 'bg-white font-bold text-slate-900 shadow-[0_4px_12px_#0b254514]' : on ? 'text-slate-700 hover:bg-white/70' : 'text-slate-400'}" onclick={() => open(c.key)} title={on ? '' : 'Terbuka setelah sembilan butir selesai'}>
              <i class="size-2.5 shrink-0 rounded-full {closingDone[c.key] ? 'bg-green-600' : 'bg-white ring-1 ring-slate-300'}"></i><span class="whitespace-nowrap">{c.label}</span>
            </button>
          {/each}
        {/if}
      </aside>

      <div class="grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] [&>*]:min-w-0">
        <div class="flex flex-wrap items-center gap-2 border-b border-slate-200/70 px-3 py-2 text-xs text-slate-500">
          <b class="text-[15px] text-slate-900">{isItem ? KIND_LABEL[kind] : CLOSING.find(c => c.key === selected)?.label}</b>
          {#if isItem && kind === 'sk'}
            <span class="rounded-full bg-[#0066B2] px-2.5 py-0.5 text-[11.5px] font-semibold text-white">{data.summary.skNumber}{data.summary.skDate ? ` · ${time.format(new Date(data.summary.skDate))} ${new Date(data.summary.skDate).getFullYear()}` : ''}</span>
            {#if data.summary.skFile}<a class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300" href="/api/pencairan/sk" target="_blank" rel="noopener">Buka SK lengkap</a>{/if}
          {:else if isItem && kind === 'rab'}
            <button type="button" class="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold {rabTab === 'digital' ? 'bg-[#0066B2] text-white' : 'border border-slate-200 bg-white text-slate-600'}" onclick={() => (rabTab = 'digital')}>RAB terkelola</button>
            <button type="button" class="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold {rabTab === 'asli' ? 'bg-[#0066B2] text-white' : 'border border-slate-200 bg-white text-slate-600'}" onclick={() => (rabTab = 'asli')}>Berkas asli{doc?.versions.length ? '' : ' (belum ada)'}</button>
            {#if admin}
              <label class="cursor-pointer rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0066B2] hover:border-[#0066B2]" title="Excel lima kolom: No, Uraian, Satuan, Volume, Jumlah. Menjadi versi RAB berikutnya.">Impor Excel<input type="file" class="sr-only" accept=".xlsx,.xlsm,.xls" onchange={(e) => importRab((e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
              <button type="button" class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300 disabled:opacity-50" disabled={busy} onclick={exportRab}>Ekspor Excel</button>
              <a class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300" href="/templat/RAB_DEB_Tahap_1.xlsx" download>Templat</a>
            {/if}
          {:else if isItem && doc}
            {#each doc.versions as v}
              <button type="button" class="rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold {version?.id === v.id ? 'bg-[#0066B2] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'}" onclick={() => (selectedVersionId = v.id)}>Versi {v.number} · {time.format(new Date(v.created))}{v.signed ? ' · ttd' : v.origin === 'generated' ? ' · sistem' : ''}</button>
            {/each}
          {/if}
          {#if isItem && kind !== 'sk' && canUpload && (kind !== 'rab' || rabTab === 'asli')}
            <label class="cursor-pointer rounded-full border border-dashed border-slate-300 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-[#0066B2] hover:border-[#0066B2]">+ versi baru<input type="file" class="sr-only" bind:this={fileInput} accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls" onchange={(e) => upload((e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
          {/if}
          <span class="ml-auto hidden xl:inline">Nilai SK <b class="tabular-nums text-slate-800">{formatSen(data.summary.amountSen)}</b> · Batas <b class="tabular-nums text-slate-800">{formatSen(data.summary.limitSen)}</b> · Diajukan <b class="tabular-nums text-slate-800">{data.summary.requestedSen ? formatSen(data.summary.requestedSen) : 'belum'}</b></span>
          <span class="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#015a9a] {'xl:ml-0 ml-auto'}">{data.readiness.done} dari {data.readiness.total}</span>
          {#if admin && isItem}<button type="button" class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11.5px] font-bold text-slate-500 hover:border-slate-300" onclick={() => (showLook = !showLook)} aria-label="Yang dilihat" title="Yang dilihat">?</button>{/if}
          {#if admin}<button type="button" class="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-slate-600 hover:border-slate-300" onclick={() => (showRiwayat = true)}>Riwayat</button>{/if}
        </div>

        {#if !isItem}
          <div class="relative grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)] overflow-hidden" style={`height:${docHeight + 56}px`}>
            {#if selected === 'ttd'}<TandaTanganView {campusId} {data} onchange={apply} />
            {:else if selected === 'lampiran'}<LampiranView {campusId} {data} onchange={apply} />
            {:else}<PembayaranView {campusId} {data} onchange={apply} />{/if}
          </div>
        {:else}
          <div class="relative min-h-0 min-w-0 overflow-hidden bg-[#e5e9f0]" style={`height:${docHeight}px`}>
            {#if showLook}
              <div class="absolute right-3 top-3 z-10 w-[min(360px,90%)] rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-[0_12px_32px_#0b254522]">
                <b class="text-[11px] font-bold uppercase tracking-[0.06em] text-[#3975b7]">Yang dilihat</b>
                <ul class="mt-1.5 grid gap-1 pl-4 text-[13px] text-slate-700 [list-style:disc]">{#each LOOK_AT[kind] as item}<li>{item}</li>{/each}</ul>
              </div>
            {/if}
            {#if kind === 'sk'}
              {#if data.summary.skFile}
                <iframe title="SK" src={`/api/pencairan/sk#page=${data.summary.skLampiranPage || 1}`} class="h-full w-full border-0 bg-white"></iframe>
              {:else}
                <div class="flex h-full items-center justify-center text-sm text-slate-600">Berkas SK belum dimuat.</div>
              {/if}
            {:else if kind === 'rab' && rabTab === 'digital'}
              <div class="h-full overflow-auto p-3"><RabTable {campusId} compact {refresh} /></div>
            {:else if version}
              <FileViewer src={fileUrl} mime={version.mime} name={version.originalName} height={docHeight} />
            {:else}
              <div class="flex h-full flex-col items-center justify-center gap-2 text-sm text-slate-600"><Icon name="upload" size={26} /><span>Belum ada berkas.</span>{#if canUpload}<span class="text-xs text-slate-500">Pilih "+ versi baru" di atas.</span>{/if}</div>
            {/if}
          </div>

          <div class="grid gap-2.5 border-t border-slate-200/70 bg-white px-3 py-3">
            {#if kind === 'sk'}
              <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Nilai SK<span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium normal-case tracking-normal tabular-nums text-slate-900">{formatSen(data.summary.amountSen)}</span></label>
                <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Batas Tahap 1 (70%)<span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium normal-case tracking-normal tabular-nums text-slate-900">{formatSen(data.summary.limitSen)}</span></label>
                <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Lampiran I<span class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[13px] font-medium normal-case tracking-normal {data.summary.skLampiranNo ? 'text-slate-900' : 'text-slate-500'}">{data.summary.skLampiranNo ? `No ${data.summary.skLampiranNo} · halaman ${data.summary.skLampiranPage}` : 'belum ditandai'}</span></label>
              </div>
            {:else if admin && spec.length && version}
              <div class="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
                {#each spec as f}
                  <label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400 {f.type === 'names' || ['terbilang', 'penandatangan', 'pemberiKuasa', 'rekeningTujuan'].includes(f.key) ? 'sm:col-span-2' : ''}">{f.label}
                    {#if f.type === 'bool'}
                      <span class="flex min-h-[36px] items-center gap-1.5 text-[13px] font-medium normal-case tracking-normal text-slate-800"><input type="checkbox" bind:checked={draft[f.key] as boolean} disabled={!isCurrent} onchange={saveIfChanged} />Ya</span>
                    {:else if f.type === 'date'}
                      <input type="date" class="min-h-[36px] w-full rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900" bind:value={draft[f.key] as string} disabled={!isCurrent} onblur={saveIfChanged} />
                    {:else if f.type === 'money'}
                      <input class="min-h-[36px] w-full rounded-lg border border-slate-300 px-2 text-right text-[13px] font-medium normal-case tracking-normal tabular-nums text-slate-900" bind:value={draft[f.key] as string} placeholder="0" inputmode="numeric" disabled={!isCurrent} onblur={saveIfChanged} />
                    {:else}
                      <input class="min-h-[36px] w-full rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900" bind:value={draft[f.key] as string} placeholder={f.type === 'names' ? 'Nama, pisahkan dengan koma' : ''} disabled={!isCurrent} onblur={saveIfChanged} />
                    {/if}
                  </label>
                {/each}
              </div>
            {:else if !admin && spec.length && version}
              <div class="flex flex-wrap gap-x-4 gap-y-1">
                {#each spec as f}{@const v = version.fields?.[f.key]}{#if v !== null && v !== undefined && v !== ''}<span class="text-[12.5px] text-slate-600"><b class="font-semibold text-slate-500">{f.label}:</b> {f.type === 'money' ? formatSen(v as number) : Array.isArray(v) ? v.join(', ') : String(v)}</span>{/if}{/each}
              </div>
            {/if}
            {#if admin && chips.length}
              <div class="flex flex-wrap gap-1.5">
                {#each chips as c}<span class="rounded-lg px-2.5 py-1 text-[12px] font-semibold {chipClass[c.level]}" title={c.text}>{c.level === 'ok' ? '✓ ' : c.level === 'info' ? '' : '! '}{c.text.replace(/\.$/, '')}</span>{/each}
              </div>
            {/if}

            <div class="flex flex-wrap items-end gap-2">
              {#if !admin}
                {#if canUpload && (state === 'perlu_revisi' || state === 'belum_ada')}
                  {#if campusThread[0]}<p class="w-full text-[13px] text-slate-800"><b class="font-semibold text-slate-500">Catatan pemeriksa:</b> {campusThread[0].note}</p>{/if}
                  <label class="ml-auto cursor-pointer rounded-lg bg-[#0066B2] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_18px_#0066b233] hover:bg-[#015a9a]">{state === 'perlu_revisi' ? 'Unggah berkas perbaikan' : 'Unggah berkas'}<input type="file" class="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc,.xlsx,.xls" onchange={(e) => upload((e.currentTarget as HTMLInputElement).files?.[0] || null)} /></label>
                {:else}
                  {#if campusThread[0]}<p class="w-full text-[13px] text-slate-800"><b class="font-semibold text-slate-500">Catatan pemeriksa:</b> {campusThread[0].note}</p>{/if}
                  <span class="text-[13px] text-slate-600">{state === 'sesuai' ? 'Sudah sesuai.' : state === 'tidak_perlu' ? 'Tidak diperlukan.' : state === 'perlu_revisi' ? 'Admin program mengunggah berkas perbaikan.' : 'Menunggu pemeriksaan.'}</span>
                {/if}
              {:else if showDecision}
                <div class="flex w-full flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3.5 py-2.5 {state === 'perlu_revisi' ? 'border-amber-300 bg-amber-50' : 'border-green-200 bg-green-50'}" role="status">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[17px] font-bold text-white {state === 'perlu_revisi' ? 'bg-amber-500' : 'bg-green-700'}" aria-hidden="true">{state === 'perlu_revisi' ? '!' : '✓'}</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-[15px] font-bold {state === 'perlu_revisi' ? 'text-amber-900' : 'text-green-900'}">{decisionLabel}</p>
                    <p class="text-[12.5px] text-slate-600">{computedOnly ? 'Pemilik rekening adalah penandatangan PKS, surat kuasa tidak diperlukan.' : `${doc?.decidedByName || (thread[0]?.imported ? 'Lembar review' : 'Sistem')}${doc?.decidedAt ? ` · ${full.format(new Date(doc.decidedAt))}` : ''}`}</p>
                    {#if latestNote && !computedOnly && latestNote.trim().toLowerCase() !== decisionLabel.toLowerCase()}<p class="mt-1 whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">{latestNote}</p>{/if}
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40" disabled={busy} onclick={() => (editing = true)}>{computedOnly ? 'Periksa juga' : 'Ubah keputusan'}</button>
                    {#if !computedOnly}<button type="button" class="min-h-[38px] rounded-lg border border-red-200 bg-white px-3.5 text-[13px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40" disabled={busy} title="Butir kembali ke Periksa; riwayat tetap tersimpan" onclick={() => void undo()}>Batalkan keputusan</button>{/if}
                  </div>
                </div>
              {:else}
                {#if kind === 'rekening'}<label class="grid min-w-0 gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400">Nama di bank<input class="min-h-[38px] w-[170px] max-w-full rounded-lg border border-slate-300 px-2 text-[13px] font-medium normal-case tracking-normal text-slate-900" bind:value={bankNameSeen} placeholder="Bila berbeda" /></label>{/if}
                <label class="grid basis-full gap-0.5 text-[10.5px] font-bold uppercase tracking-[0.05em] text-slate-400 sm:min-w-[220px] sm:flex-1 sm:basis-auto">
                  <span>Catatan keputusan{#if doc?.decidedByName}<span class="ml-2 font-medium normal-case tracking-normal text-slate-400">{state === 'perlu_revisi' ? DECISION_LABEL[kind].bad : decided ? DECISION_LABEL[kind].ok : ITEM_STATE_LABEL[state]} · {doc.decidedByName}{doc.decidedAt ? ` · ${time.format(new Date(doc.decidedAt))}` : ''}</span>{/if}</span>
                  <textarea bind:this={noteInput} rows="2" class="min-h-[46px] w-full rounded-lg border px-3 py-2 text-[14px] font-medium leading-relaxed normal-case tracking-normal text-slate-900 {state === 'perlu_revisi' ? 'border-amber-300 bg-amber-50/40' : 'border-slate-300'}" bind:value={reviewNote} oninput={grow} placeholder={kind === 'sk' ? 'Bila berbeda: nilai yang tercetak di SK' : 'Catatan keputusan: alasan revisi atau keterangan lolos, dikirim ke kampus'}></textarea>
                </label>
                {#if DECISION_LABEL[kind].none}<button type="button" class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-3.5 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40" disabled={busy} onclick={() => decide('none')}>{DECISION_LABEL[kind].none}</button>{/if}
                <button type="button" class="min-h-[38px] rounded-lg border px-3.5 text-[13px] font-semibold transition disabled:opacity-40 {state === 'perlu_revisi' ? 'border-amber-400 bg-amber-100 text-amber-900' : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'}" disabled={busy || !canDecide} title={canDecide ? '' : 'Unggah berkas dulu'} onclick={() => decide('bad')}>{DECISION_LABEL[kind].bad}</button>
                <button type="button" class="min-h-[38px] rounded-lg px-4 text-[13px] font-bold text-white shadow-[0_8px_18px_#15803d33] transition active:scale-[0.98] disabled:opacity-40 {decided ? 'bg-green-800 ring-2 ring-green-300' : 'bg-green-700 hover:bg-green-800'}" disabled={busy || !canDecide} title={canDecide ? 'Enter' : 'Unggah berkas dulu'} onclick={() => decide('ok')}>{decided ? '✓ ' : ''}{DECISION_LABEL[kind].ok}</button>
                {#if editing}<button type="button" class="min-h-[38px] px-2 text-[13px] font-semibold text-slate-500 hover:underline" onclick={() => (editing = false)}>Tutup</button>{/if}
              {/if}
            </div>
          </div>
          <div class="border-t border-slate-200/70 bg-white px-3 py-2.5">
            <div class="flex flex-wrap items-baseline justify-between gap-2"><h3 class="text-[11px] font-bold uppercase tracking-[0.06em] text-[#3975b7]">Catatan</h3><span class="text-[11.5px] text-slate-500">{admin ? 'Percakapan dengan kampus. Catatan internal hanya terlihat tim Pertamina Foundation.' : 'Percakapan dengan Pertamina Foundation.'}</span></div>
            <div class="mt-1.5 grid max-h-56 gap-1.5 overflow-y-auto" bind:this={threadEl} aria-live="polite">
              {#each conversation as m (m.id)}
                <div class="rounded-lg px-3 py-2 {m.internal ? 'bg-amber-50 ring-1 ring-amber-200' : m.authorRole === 'campus' ? 'bg-blue-50' : 'bg-slate-50'}">
                  <span class="text-[12px] font-semibold text-slate-500">{m.authorName}{m.authorRole === 'campus' ? ' (kampus)' : ''} · {full.format(new Date(m.created))}{m.internal ? ' · internal' : ''}</span>
                  <p class="whitespace-pre-wrap text-[14px] leading-relaxed text-slate-800">{m.body}</p>
                </div>
              {/each}
              {#if !conversation.length}<p class="text-[13px] text-slate-500">Belum ada catatan pada butir ini.</p>{/if}
            </div>
            <form class="mt-2 flex flex-wrap items-end gap-2" onsubmit={(e) => { e.preventDefault(); void sendNote(); }}>
              <textarea rows="2" class="min-h-[46px] min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-[14px] leading-relaxed text-slate-900" bind:value={noteBody} oninput={grow} placeholder={admin ? 'Tulis catatan untuk kampus atau untuk tim' : 'Tulis catatan untuk Pertamina Foundation'} onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void sendNote(); } }}></textarea>
              {#if admin}<label class="flex min-h-[38px] items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-semibold {noteInternal ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 text-slate-600'}"><input type="checkbox" bind:checked={noteInternal} />Catatan internal</label>{/if}
              <button type="submit" class="min-h-[38px] rounded-lg bg-[#0066B2] px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_#0066b233] hover:bg-[#015a9a] disabled:opacity-40" disabled={busy || !noteBody.trim()}>Kirim</button>
            </form>
          </div>

        {/if}
      </div>
    </div>
    {#if isItem}<p class="text-[11.5px] text-slate-400">{KIND_FILE[kind]}{admin ? ' · Enter untuk tombol hijau, Esc kembali ke Tahap 1' : ''}</p>{/if}
  </div>
  {#if showRiwayat}<RiwayatSheet context={`kampus:${campusId}/pencairan/t1`} title="Riwayat perubahan kampus ini" onclose={() => (showRiwayat = false)} />{/if}
{/if}
