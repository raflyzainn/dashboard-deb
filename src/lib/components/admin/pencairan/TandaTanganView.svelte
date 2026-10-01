<script lang="ts">
  import ErrorSnackbar from '$lib/components/ui/ErrorSnackbar.svelte';
  import { reportError } from '$lib/feedback';
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { MERGE_KINDS, PROPERTY_FIELDS, PREVIEW_MARK, type MergeKind, type Missing } from '$lib/merge';
  import type { KartuData, Doc, Version } from './kartu-types';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import FileViewer from './FileViewer.svelte';

  /**
   * Closing row "Tanda tangan": one table for the four letters the system issues. Per row: the final document (preview, save with its
   * verification code and download), the signed scan as the next version of the same slot, the side by side comparison, and the paper original.
   * "Data surat" (letter numbers, dates, signatory, PKS template) lives in a dialog opened from a chip. Every save hands the fresh workspace up.
   */
  interface Line { key: string; level: 'ok' | 'warn' | 'info'; text: string; clause?: boolean }
  interface Pasal { name: string; section: string; changed: number; added: number }
  interface TemplateVersion { id: string; version: number; originalName: string; reason: string; active: boolean; uploadedByName: string; created: string; differences: { changed: number; added: number; pasal: Pasal[]; missingTags: string[] } }
  interface IssuedVersion { id: string; number: number; code: string }
  interface Info {
    readiness: Line[]; clauseRequired: boolean; data: Record<string, string>; missing: Record<MergeKind, Missing[]>;
    templates: { mode: string; active: TemplateVersion | null; versions: TemplateVersion[] };
    documents: { kind: MergeKind; versions: IssuedVersion[] }[]; settingsYear: string; settingsReady: boolean;
  }
  /** blocked: one short line for the screen; blockedFull: every missing label, for the tooltip. */
  interface Row { kind: MergeKind; label: string; hint: string; doc: Doc; final: Version | null; code: string; signed: Version | null; blocked: string; blockedFull: string }

  let { campusId, data, onchange }: { campusId: string; data: KartuData; onchange: (next: KartuData, message?: string) => void } = $props();

  const base = $derived(`/api/pencairan/${campusId}`);
  let info = $state<Info | null>(null);
  let error = $state('');
  let busy = $state('');
  let modal = $state<{ type: 'preview' | 'compare' | 'data'; kind: MergeKind } | null>(null);
  let dataTab = $state<'surat' | 'templat'>('surat');
  let dialog = $state<HTMLDialogElement | null>(null);
  let previewHost = $state<HTMLDivElement | null>(null);
  let previewScroller = $state<HTMLDivElement | null>(null);
  let previewLoading = $state(false);
  let previewError = $state('');
  let zoom = $state(1);
  let renderSeq = 0;
  let propsDraft = $state<Record<string, string>>({});
  let uploadOpen = $state(false);
  let templateFile = $state<File | null>(null);
  let templateReason = $state('');
  let showDiff = $state(false);

  const ROW_LABEL: Record<MergeKind, string> = { pks: 'PKS', permohonan: 'Permohonan', invois: 'Invois', kuitansi: 'Kuitansi' };
  const day = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
  const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const when = (value: string) => (value ? day.format(new Date(value)) : '');
  const chip = 'inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition';
  const chipBtn = `${chip} cursor-pointer border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white`;
  const chipMain = `${chip} cursor-pointer border-[#0066B2] bg-[#0066B2] text-white hover:bg-[#015a9a] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#0066B2]`;
  const chipOk = `${chip} border-transparent bg-green-50 text-green-800`;
  const chipInfo = `${chip} border-transparent bg-blue-50 text-[#015a9a]`;
  const lineClass: Record<Line['level'], string> = { ok: 'bg-green-50 text-green-800', warn: 'bg-amber-50 text-amber-900', info: 'bg-blue-50 text-[#015a9a]' };
  const lineMark: Record<Line['level'], string> = { ok: '✓', warn: '!', info: 'i' };
  const input = 'min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal text-slate-900 outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100';

  const stored = $derived((data.disbursement.properties || {}) as Record<string, string>);
  const propsDirty = $derived(PROPERTY_FIELDS.some(f => (propsDraft[f.key] || '').trim() !== String(stored[f.key] || '')));
  const activeTemplate = $derived(info?.templates.active || null);
  const pasalBerbeda = $derived(activeTemplate ? activeTemplate.differences.pasal.filter(p => p.changed || p.added) : []);
  const codes = $derived(new Map<string, string>(info ? info.documents.flatMap(d => d.versions.map(v => [v.id, v.code] as [string, string])) : []));

  const rows = $derived.by<Row[]>(() => MERGE_KINDS.map(kind => {
    const doc = data.documents.find(d => d.kind === kind)!;
    const final = [...doc.versions].reverse().find(v => v.origin === 'generated' && (!(data as any).journey || import.meta.env.MODE==='mockup' || v.generation?.final)) || null;
    const signed = [...doc.versions].reverse().find(v => v.signed && (!final || v.number > final.number)) || null;
    const missing = (info?.missing[kind] || []).map(m => m.label.toLowerCase());
    const clauseBlocks = kind === 'pks' && Boolean(info?.clauseRequired) && !data.disbursement.clauseChecked;
    const clause = clauseBlocks ? 'Centang pasal Bantuan Dana di Data surat.' : '';
    const blocked = missing.length ? shortList(missing) : clause;
    const blockedFull = missing.length ? `Belum diisi: ${missing.join(', ')}.` : clause;
    const hint = kind === 'pks' ? (activeTemplate ? `templat kampus v${activeTemplate.version}` : 'templat standar') : '';
    return { kind, label: ROW_LABEL[kind], hint, doc, final, code: final ? codes.get(final.id) || '' : '', signed, blocked, blockedFull };
  }));
  /** "Belum diisi: a, b, c dan 4 lainnya." Three names at most, so the bar stays one line. */
  const shortList = (labels: string[]) => `Belum diisi: ${labels.slice(0, 3).join(', ')}${labels.length > 3 ? ` dan ${labels.length - 3} lainnya` : ''}.`;
  const current = $derived(modal ? rows.find(r => r.kind === modal.kind) || null : null);
  const received = $derived(rows.filter(r => r.doc.originalReceived).length);
  /** One line for the bar: what still blocks a final document, named once across the four letters. */
  const missingLine = $derived.by(() => {
    if (!info) return '';
    const labels = Array.from(new Set(MERGE_KINDS.flatMap(k => (info!.missing[k] || []).map(m => m.label.toLowerCase()))));
    if (labels.length) return shortList(labels);
    if (info.clauseRequired && !data.disbursement.clauseChecked) return 'Centang pasal Bantuan Dana di Data surat.';
    return '';
  });

  function fail(e: unknown, fallback: string) { error = reportError(e instanceof Error ? e.message : fallback); }
  async function loadInfo() {
    try { info = await dataService.api.get<Info>(`${base}/buat`); }
    catch (e) { fail(e, 'Data dokumen belum dapat dimuat.'); }
  }
  $effect(() => { void campusId; untrack(() => { void loadInfo(); }); });
  const fresh = () => dataService.api.get<KartuData>(base);
  /** Runs one save: the action returns the fresh workspace and the notice; info is reloaded because codes and missing fields may have changed. */
  async function run(key: string, action: () => Promise<[KartuData, string]>, fallback: string) {
    if (busy) return false;
    busy = key; error = '';
    try {
      const [next, message] = await action();
      await loadInfo();
      onchange(next, message);
      return true;
    } catch (e) { fail(e, fallback); return false; }
    finally { busy = ''; }
  }

  function download(url: string) {
    const a = document.createElement('a');
    a.href = url; a.download = '';
    document.body.append(a); a.click(); a.remove();
  }
  const saveFinal = (row: Row) => run(`final:${row.kind}`, async () => {
    const result = await dataService.api.post<{ version: { id: string; number: number }; code: string }>(`${base}/buat/${row.kind}`,{expectedRevision:(data as any).serverRevision});
    download(`${base}/documents/${row.kind}/versions/${result.version.id}?download=1`);
    return [await fresh(), `${row.label} final tersimpan, kode ${result.code}.`];
  }, 'Dokumen final belum tersimpan.');
  function pickScan(row: Row, event: Event) {
    const el = event.currentTarget as HTMLInputElement;
    const file = el.files?.[0] || null;
    el.value = '';
    if (file) void uploadScan(row, file);
  }
  const uploadScan = (row: Row, file: File) => run(`scan:${row.kind}`, async () => {
    const body = new FormData();
    if((data as any).serverRevision!==undefined)body.set('expectedRevision',String((data as any).serverRevision));
    body.set('file', file); body.set('signed', '1'); body.set('note', 'Pindaian bertanda tangan');
    const next = await dataService.api.post<KartuData>(`${base}/documents/${row.kind}/versions`, body);
    return [next, `Pindaian ${row.label} tersimpan. Bandingkan dengan dokumen final.`];
  }, 'Pindaian belum tersimpan.');
  const setFlag = (row: Row, flag: 'signedReceived' | 'originalReceived', value: boolean) => run(`${flag}:${row.kind}`, async () => {
    const next = await dataService.api.patch<KartuData>(`${base}/documents/${row.kind}`, { [flag]: value, expectedRevision:(data as any).serverRevision });
    const message = flag === 'signedReceived' ? (value ? `Pindaian ${row.label} sesuai dengan dokumen final.` : `Tanda sesuai ${row.label} dihapus.`) : (value ? `Asli ${row.label} diterima.` : `Catatan asli ${row.label} dibatalkan.`);
    return [next, message];
  }, 'Perubahan belum tersimpan.');

  // ----- Data surat: properties, clause, PKS template -----
  const saveProps = () => run('props', async () => {
    const properties = Object.fromEntries(PROPERTY_FIELDS.filter(f => (propsDraft[f.key] || '').trim() !== String(stored[f.key] || '')).map(f => [f.key, (propsDraft[f.key] || '').trim()]));
    const next = await dataService.api.patch<KartuData>(base, { properties });
    close();
    return [next, 'Data surat tersimpan.'];
  }, 'Data surat belum tersimpan.');
  const setClause = (value: boolean) => run('clause', async () => [await dataService.api.patch<KartuData>(base, { clauseChecked: value }), value ? 'Pasal Bantuan Dana ditandai sudah diperiksa.' : 'Tanda pemeriksaan pasal dihapus.'], 'Perubahan belum tersimpan.');
  const uploadTemplate = () => run('template', async () => {
    if (!templateFile) throw new Error('Pilih berkas templat Word.');
    const body = new FormData();
    if((data as any).serverRevision!==undefined)body.set('expectedRevision',String((data as any).serverRevision));
    body.set('file', templateFile); body.set('reason', templateReason);
    await dataService.api.post(`${base}/pks-templat`, body);
    templateFile = null; templateReason = ''; uploadOpen = false; showDiff = true;
    return [await fresh(), 'Templat kampus tersimpan dan dipakai untuk PKS.'];
  }, 'Templat belum tersimpan.');
  const useStandard = () => run('template', async () => { await dataService.api.patch(`${base}/pks-templat`, { mode: 'standard' }); return [await fresh(), 'PKS memakai templat standar.']; }, 'Templat belum tersimpan.');
  const useVersion = (id: string, version: number) => run('template', async () => { await dataService.api.patch(`${base}/pks-templat`, { activate: id }); return [await fresh(), `Templat kampus versi ${version} dipakai.`]; }, 'Templat belum tersimpan.');

  // ----- dialogs: preview, compare, data surat -----
  function open(type: 'preview' | 'compare' | 'data', kind: MergeKind = 'pks', tab: 'surat' | 'templat' = 'surat') {
    if (type === 'data') { propsDraft = Object.fromEntries(PROPERTY_FIELDS.map(f => [f.key, String(stored[f.key] || '')])); dataTab = tab; uploadOpen = false; }
    modal = { type, kind }; previewError = ''; zoom = 1;
  }
  function close() { modal = null; renderSeq++; }
  $effect(() => { const el = dialog; if (el && modal && !el.open) el.showModal(); });
  $effect(() => {
    const el = previewHost; const m = modal;
    if (!el || m?.type !== 'preview') return;
    untrack(() => { void renderPreview(el, m.kind); });
  });
  async function renderPreview(el: HTMLDivElement, kind: MergeKind) {
    const seq = ++renderSeq;
    previewLoading = true; previewError = '';
    try {
      const blob = await dataService.api.blob(`${base}/buat/${kind}`);
      const { renderAsync } = await import('docx-preview');
      if (seq !== renderSeq) return;
      el.innerHTML = '';
      await renderAsync(blob, el, undefined, { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true, useBase64URL: true });
      if (seq !== renderSeq) return;
      decorate(el);
      const page = el.querySelector('.docx') as HTMLElement | null;
      const width = previewScroller?.clientWidth || 0;
      zoom = page && width ? Math.min(1, Math.max(0.35, (width - 16) / page.offsetWidth)) : 1;
    } catch (e) {
      if (seq === renderSeq) previewError = reportError(e instanceof Error ? e.message : 'Pratinjau belum dapat dibuat.');
    } finally { if (seq === renderSeq) previewLoading = false; }
  }
  /** Turns the marks around merged values into coloured spans: soft blue for merged values, red for what is still missing. */
  function decorate(el: HTMLElement) {
    const pattern = new RegExp(`${PREVIEW_MARK.fillStart}([^${PREVIEW_MARK.fillEnd}]*)${PREVIEW_MARK.fillEnd}|${PREVIEW_MARK.missStart}([^${PREVIEW_MARK.missEnd}]*)${PREVIEW_MARK.missEnd}`, 'g');
    const marks = Object.values(PREVIEW_MARK);
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) { const node = walker.currentNode as Text; if (marks.some(mark => node.data.includes(mark))) nodes.push(node); }
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      let last = 0;
      for (const m of node.data.matchAll(pattern)) {
        if (m.index! > last) fragment.append(node.data.slice(last, m.index));
        const span = document.createElement('span');
        span.className = m[1] !== undefined ? 'merge-fill' : 'merge-miss';
        span.textContent = m[1] !== undefined ? m[1] : m[2];
        fragment.append(span);
        last = m.index! + m[0].length;
      }
      if (last < node.data.length) fragment.append(node.data.slice(last));
      node.replaceWith(fragment);
    }
  }
</script>

{#snippet cellFinal(row: Row)}
  <div class="flex flex-wrap items-center gap-1.5">
    <button type="button" class={chipBtn} onclick={() => open('preview', row.kind)}><Icon name="eye" size={14} />Pratinjau</button>
    {#if row.final}
      <a class={chipBtn} href={`${base}/documents/${row.kind}/versions/${row.final.id}?download=1`}><Icon name="download" size={14} />Unduh</a>
      <button type="button" class={chipBtn} title={row.blockedFull || 'Buat dokumen final baru dari data terkini'} disabled={Boolean(row.blocked) || Boolean(busy)} onclick={() => saveFinal(row)}>{busy === `final:${row.kind}` ? 'Membuat…' : 'Buat ulang'}</button>
    {:else}
      <button type="button" class={chipMain} title={row.blockedFull || 'Simpan dokumen final dan unduh'} disabled={Boolean(row.blocked) || Boolean(busy)} onclick={() => saveFinal(row)}><Icon name="download" size={14} />{busy === `final:${row.kind}` ? 'Membuat…' : 'Unduh'}</button>
    {/if}
  </div>
  {#if row.final}<span class="mt-1 block font-mono text-[11px] text-slate-500">v{row.final.number}{row.code ? ` · ${row.code}` : ''}</span>{/if}
{/snippet}

{#snippet cellScan(row: Row)}
  <div class="flex flex-wrap items-center gap-1.5">
    {#if row.signed}
      <a class={chipBtn} href={`${base}/documents/${row.kind}/versions/${row.signed.id}`} target="_blank" rel="noopener noreferrer" title={row.signed.originalName}>v{row.signed.number} · {when(row.signed.created)}</a>
      <button type="button" class={row.doc.signedReceived ? chipOk : chipBtn} onclick={() => open('compare', row.kind)}>{#if row.doc.signedReceived}✓ {/if}Bandingkan</button>
    {/if}
    <label class="{chipBtn} focus-within:outline focus-within:outline-2 focus-within:outline-[#55a9f2] {row.final && !busy ? '' : 'cursor-not-allowed opacity-50 hover:bg-white'}" title={row.final ? 'Pilih berkas PDF atau gambar' : 'Unduh dokumen final dulu.'}>
      <Icon name="upload" size={14} />{busy === `scan:${row.kind}` ? 'Mengunggah…' : row.signed ? 'Unggah ulang' : 'Unggah pindaian'}
      <input type="file" class="sr-only" accept=".pdf,.png,.jpg,.jpeg,.webp" disabled={!row.final || Boolean(busy)} onchange={(e) => pickScan(row, e)} />
    </label>
  </div>
{/snippet}

{#snippet cellAsli(row: Row)}
  <label class="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm text-slate-800">
    <input type="checkbox" class="size-4 accent-[#0066B2]" checked={row.doc.originalReceived} disabled={Boolean(busy)} onchange={(e) => setFlag(row, 'originalReceived', (e.currentTarget as HTMLInputElement).checked)} />
    {#if row.doc.originalReceived}<span class="font-semibold text-green-800" title={`${row.doc.originalReceivedByName}, ${time.format(new Date(row.doc.originalReceivedAt))}`}>{when(row.doc.originalReceivedAt)}</span>{:else}<span class="text-slate-500">Belum</span>{/if}
  </label>
{/snippet}

<div class="flex h-full min-h-0 flex-1 flex-col">
  <div class="min-h-0 flex-1 overflow-auto bg-[#e5e9f0] p-4">
    <div class="mb-3 flex flex-wrap items-center gap-1.5">
      {#if (data as any).journey}<a class={chipBtn} href={`/admin/pencairan/${campusId}?butir=pks`}>Data PKS</a><span class={chipInfo}>Templat PF standar</span>{:else}
      <button type="button" class={chipBtn} onclick={() => open('data', 'pks', 'surat')}><Icon name="edit" size={14} />Data surat</button>
      <button type="button" class={chipBtn} onclick={() => open('data', 'pks', 'templat')}>Templat PKS: {activeTemplate ? 'kampus' : 'standar'}</button>{/if}
      {#if info && !info.settingsReady}<a class={chipBtn} href="/admin/pencairan/pengaturan" title="Penandatangan Pertamina Foundation dan masa perjanjian belum diisi">Isi Pengaturan program</a>{/if}
    </div>

    <div class="hidden overflow-hidden rounded-lg bg-white shadow-[0_2px_10px_#0b254514] md:block">
      <table class="w-full border-collapse text-sm">
        <thead class="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
          <tr><th class="px-3 py-2.5">Dokumen</th><th class="px-3 py-2.5">Dokumen final</th><th class="px-3 py-2.5">Pindaian bertanda tangan</th><th class="px-3 py-2.5">Asli</th></tr>
        </thead>
        <tbody>
          {#each rows as row (row.kind)}
            <tr class="border-t border-slate-100 align-middle">
              <td class="px-3 py-2.5"><span class="block font-semibold text-slate-900">{row.label}</span>{#if row.hint}<span class="block text-[11px] text-slate-500">{row.hint}</span>{/if}</td>
              <td class="px-3 py-2.5">{@render cellFinal(row)}</td>
              <td class="px-3 py-2.5">{@render cellScan(row)}</td>
              <td class="px-3 py-2.5">{@render cellAsli(row)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <div class="grid gap-2.5 md:hidden">
      {#each rows as row (row.kind)}
        <article class="grid gap-2.5 rounded-lg bg-white p-3 shadow-[0_2px_10px_#0b254514]">
          <div class="flex items-baseline justify-between gap-2"><span class="font-semibold text-slate-900">{row.label}</span>{#if row.hint}<span class="text-[11px] text-slate-500">{row.hint}</span>{/if}</div>
          <div><span class="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Dokumen final</span><div class="mt-1">{@render cellFinal(row)}</div></div>
          <div><span class="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Pindaian bertanda tangan</span><div class="mt-1">{@render cellScan(row)}</div></div>
          <div><span class="block text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Asli</span><div class="mt-1">{@render cellAsli(row)}</div></div>
        </article>
      {/each}
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-2.5">
    <span class={received === 4 ? chipOk : chipInfo}>{received} dari 4 asli diterima</span>
    {#if missingLine}<span class="text-xs font-medium text-amber-900">{missingLine}</span>{/if}
    {#if error}<span class="text-xs font-medium text-red-700" role="alert">{error}</span>{/if}
    <span class="ml-auto flex items-center gap-2">
      {#if received === 4}<span class={chipOk}>✓ Siap dilampirkan</span>{/if}
    </span>
  </div>
</div>

{#if modal && current}
  <dialog bind:this={dialog} class="m-auto max-h-[94dvh] rounded-2xl border border-[#d6e5f6] bg-white p-0 text-slate-800 shadow-[0_25px_100px_#0a2c6440] [&::backdrop]:bg-[#0a245a66] [&::backdrop]:backdrop-blur-[3px] {modal.type === 'data' ? 'w-[min(820px,calc(100%-24px))]' : 'w-[min(1360px,calc(100%-24px))]'}" oncancel={(e) => { e.preventDefault(); close(); }} onkeydown={(e) => { if (e.key === 'Escape') e.stopPropagation(); }}>
    <div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-3">
      <h2 class="truncate text-base font-bold text-slate-900">{modal.type === 'preview' ? `Pratinjau ${current.label}` : modal.type === 'compare' ? `Bandingkan ${current.label}` : 'Data surat'}</h2>
      <div class="flex items-center gap-2">
        {#if modal.type === 'preview'}
          <button type="button" class="rounded-md px-2 py-1 text-sm hover:bg-slate-100" onclick={() => (zoom = Math.max(0.35, zoom - 0.1))} aria-label="Perkecil">−</button>
          <span class="w-10 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <button type="button" class="rounded-md px-2 py-1 text-sm hover:bg-slate-100" onclick={() => (zoom = Math.min(1.5, zoom + 0.1))} aria-label="Perbesar">+</button>
        {/if}
        <button type="button" class="flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Tutup" onclick={close}><Icon name="close" size={18} /></button>
      </div>
    </div>

    {#if modal.type === 'preview'}
      <div bind:this={previewScroller} class="relative h-[min(78dvh,900px)] overflow-auto bg-slate-100">
        <div bind:this={previewHost} class="docx-host p-2" style={`zoom:${zoom}`}></div>
        {#if previewLoading}<div class="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-600">Menggambar dokumen…</div>{/if}
        {#if previewError}<div class="absolute inset-x-0 top-0 m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{previewError}</div>{/if}
      </div>
      <div class="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
        <span class="text-xs text-slate-500">Biru: nilai terisi. Merah: belum diisi.</span>
        <span class="ml-auto flex items-center gap-2">
          {#if current.blocked}<span class="text-xs font-medium text-amber-900" title={current.blockedFull}>{current.blocked}</span>{/if}
          <Button size="sm" icon="download" onclick={() => { const row = current; close(); if (row) void saveFinal(row); }} disabled={Boolean(current.blocked) || Boolean(busy)}>{current.final ? 'Buat ulang dan unduh' : 'Unduh dokumen final'}</Button>
        </span>
      </div>

    {:else if modal.type === 'compare' && current.final && current.signed}
      <div class="grid gap-3 p-4 lg:grid-cols-2">
        <div><p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Dokumen final · v{current.final.number}</p><FileViewer src={`${base}/documents/${current.kind}/versions/${current.final.id}`} mime={current.final.mime} name={current.final.originalName} height={520} /></div>
        <div><p class="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">Pindaian bertanda tangan · v{current.signed.number}</p><FileViewer src={`${base}/documents/${current.kind}/versions/${current.signed.id}`} mime={current.signed.mime} name={current.signed.originalName} height={520} /></div>
      </div>
      <div class="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-3 text-sm">
        <label class="inline-flex cursor-pointer items-center gap-2 font-semibold text-slate-800">
          <input type="checkbox" class="size-4 accent-[#0066B2]" checked={current.doc.signedReceived} disabled={Boolean(busy)} onchange={(e) => setFlag(current!, 'signedReceived', (e.currentTarget as HTMLInputElement).checked)} />Sesuai dengan dokumen final
        </label>
        {#if current.doc.signedReceived}<span class="text-xs text-slate-500">{current.doc.signedReceivedByName}, {time.format(new Date(current.doc.signedReceivedAt))}</span>{/if}
      </div>

    {:else if modal.type === 'compare'}
      <p class="px-5 py-6 text-center text-sm text-slate-600">Unduh dokumen final dulu.</p>

    {:else if modal.type === 'data'}
      <div class="grid gap-4 p-5">
        <div class="flex flex-wrap items-center gap-1.5">
          <button type="button" class={dataTab === 'surat' ? chipMain : chipBtn} onclick={() => (dataTab = 'surat')}>Nomor dan tanggal</button>
          <button type="button" class={dataTab === 'templat' ? chipMain : chipBtn} onclick={() => (dataTab = 'templat')}>Templat PKS: {activeTemplate ? `kampus v${activeTemplate.version}` : 'standar'}</button>
        </div>

        {#if dataTab === 'surat'}
          {#if info}
            <div class="grid gap-1.5 sm:grid-cols-2">
              {#each info.readiness as line (line.key)}
                <div class="flex items-center gap-2 rounded-lg px-3 py-2 text-xs {lineClass[line.level]}">
                  <span class="w-3 shrink-0 text-center font-bold">{lineMark[line.level]}</span>
                  <span class="flex-1">{line.text}</span>
                  {#if line.clause}<label class="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold"><input type="checkbox" class="size-4 accent-[#0066B2]" checked={data.disbursement.clauseChecked} disabled={Boolean(busy)} onchange={(e) => setClause((e.currentTarget as HTMLInputElement).checked)} />Sudah diperiksa</label>{/if}
                </div>
              {/each}
            </div>
          {/if}
          <form class="grid gap-3" onsubmit={(e) => { e.preventDefault(); void saveProps(); }}>
            <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {#each PROPERTY_FIELDS as f (f.key)}
                <label class="grid gap-1 text-xs font-semibold text-slate-600">{f.label}
                  {#if f.type === 'date'}<input type="date" class={input} aria-required="true" bind:value={propsDraft[f.key]} />{:else}<input class={input} aria-required="true" bind:value={propsDraft[f.key]} />{/if}
                </label>
              {/each}
              <div class="grid gap-1 text-xs font-semibold text-slate-600">Terbilang Termin 1<span class="text-sm font-normal text-slate-700">{info?.data.termin1Terbilang || 'Ditetapkan saat RAB disetujui'}</span></div>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <a class="text-xs font-semibold text-[#0066B2] hover:underline" href="/admin/pencairan/pengaturan">Pengaturan program</a>
              <span class="ml-auto flex items-center gap-2">
                <Button size="sm" variant="ghost" onclick={close}>Batal</Button>
                <Button type="submit" size="sm" icon="save" disabled={!propsDirty || Boolean(busy)} loading={busy === 'props'}>Simpan</Button>
              </span>
            </div>
          </form>

        {:else if info}
          {#if activeTemplate}
            <div class="grid gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-[#015a9a]">
              <span>Versi {activeTemplate.version} · {activeTemplate.originalName} · {activeTemplate.uploadedByName}, {time.format(new Date(activeTemplate.created))}{activeTemplate.reason ? ` · ${activeTemplate.reason}` : ''}</span>
              <span>{pasalBerbeda.length ? `${pasalBerbeda.length} pasal berbeda dari templat standar` : 'Tidak ada pasal yang berbeda dari templat standar'}{#if pasalBerbeda.length}<button type="button" class="ml-1 font-semibold underline" onclick={() => (showDiff = !showDiff)}>{showDiff ? 'tutup' : 'lihat'}</button>{/if}</span>
              {#if activeTemplate.differences.missingTags.length}<span class="text-amber-900">Tidak tercetak: {activeTemplate.differences.missingTags.join(', ')}.</span>{/if}
            </div>
            {#if showDiff && pasalBerbeda.length}
              <ul class="grid gap-1 text-xs text-slate-700">
                {#each pasalBerbeda as p (p.section + p.name)}<li class="rounded-lg border border-slate-200 px-3 py-1.5"><span class="font-semibold">{p.name}</span> <span class="text-slate-500">({p.section})</span>: {[p.changed && `${p.changed} paragraf berubah`, p.added && `${p.added} paragraf baru`].filter(Boolean).join(', ')}</li>{/each}
              </ul>
            {/if}
          {/if}
          <div class="flex flex-wrap gap-2">
            {#if activeTemplate}<Button size="sm" variant="secondary" onclick={useStandard} disabled={Boolean(busy)}>Pakai templat standar</Button>{/if}
            <Button size="sm" variant="secondary" icon="upload" onclick={() => (uploadOpen = !uploadOpen)} disabled={Boolean(busy)}>Unggah templat kampus</Button>
            <Button size="sm" variant="ghost" icon="download" href="/templat/pks-standar.docx">Unduh templat standar</Button>
          </div>
          {#if uploadOpen}
            <form class="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3" onsubmit={(e) => { e.preventDefault(); void uploadTemplate(); }}>
              <input type="file" class="text-sm" accept=".docx" onchange={(e) => (templateFile = (e.currentTarget as HTMLInputElement).files?.[0] || null)} />
              <label class="grid gap-1 text-xs font-semibold text-slate-600">Alasan
                <input class={input} bind:value={templateReason} placeholder="Pasal yang diminta kampus" />
              </label>
              <div class="flex gap-2"><Button type="submit" size="sm" loading={busy === 'template'} disabled={!templateFile || !templateReason.trim()}>Unggah</Button><Button size="sm" variant="ghost" onclick={() => (uploadOpen = false)}>Batal</Button></div>
            </form>
          {/if}
          {#if info.templates.versions.some(v => !v.active)}
            <ul class="grid gap-1 text-xs">
              {#each info.templates.versions.filter(v => !v.active) as v (v.id)}
                <li class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-1.5"><span>Versi {v.version} · {v.originalName} · {time.format(new Date(v.created))}</span><button type="button" class={chipBtn} onclick={() => useVersion(v.id, v.version)} disabled={Boolean(busy)}>Pakai versi ini</button></li>
              {/each}
            </ul>
          {/if}
        {/if}
        {#if error}<p class="text-xs font-medium text-red-700" role="alert">{error}</p>{/if}
      </div>
    {/if}
  <ErrorSnackbar /></dialog>
{/if}

<style>
  .docx-host :global(.docx-wrapper) { background: transparent; padding: 0; }
  .docx-host :global(.docx) { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); margin: 0 auto 16px; }
  .docx-host :global(.merge-fill) { background: #dbeafe; color: #0b4169; border-radius: 2px; padding: 0 2px; }
  .docx-host :global(.merge-miss) { background: #fee2e2; color: #991b1b; font-weight: 600; border-radius: 2px; padding: 0 2px; }
</style>
