<script lang="ts">
  import { browserDocumentPdf, downloadDocumentPdf } from '$lib/pengajuan/browser-document-pdf';
  import { reportError } from '$lib/feedback';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  /** Shows one stored file inside the page: PDF and images natively, Word and Excel drawn in the browser. Files never leave the app. */
  let { src, mime = '', name = '', height = 640, showDownload = true, pdf = false }: { src: string; mime?: string; name?: string; height?: number; showDownload?: boolean; pdf?: boolean } = $props();

  const ext = $derived((name.split('.').pop() || '').toLowerCase());
  const kind = $derived(pdf || mime.includes('pdf') || ext === 'pdf' ? 'pdf' : mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? 'image' : ['docx', 'doc'].includes(ext) ? 'docx' : ['xlsx', 'xls', 'csv'].includes(ext) ? 'xlsx' : 'other');
  let container = $state<HTMLDivElement | null>(null);
  let loading = $state(false);
  let error = $state('');
  let zoom = $state(1);
  let sheets = $state<{ name: string; html: string; limited: boolean }[]>([]);
  let sheet = $state(0);
  let renderGeneration = 0;
  let nativeSource = $state('');

  async function render() {
    if (!container) return;
    const host = container, source = src, type = kind, generation = ++renderGeneration;
    loading = true; error = ''; sheets = [];
    host.innerHTML = '';
    try {
      if (nativeSource) { URL.revokeObjectURL(nativeSource); nativeSource = ''; }
      const response = await fetch(source, { cache: 'no-store' });
      if (generation !== renderGeneration) return;
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.message || 'Berkas belum dapat dibuka.');
      }
      if (type === 'pdf' || type === 'image') {
        const original = await response.blob();
        const blob = pdf ? await browserDocumentPdf(original, import.meta.env.MODE === 'mockup') : original;
        if (generation !== renderGeneration) return;
        nativeSource = URL.createObjectURL(blob);
      } else if (type === 'docx') {
        const { renderAsync } = await import('docx-preview');
        if (generation !== renderGeneration) return;
        await renderAsync(await response.blob(), host, undefined, { className: 'docx', inWrapper: true, ignoreWidth: false, breakPages: true, useBase64URL: true });
        if (generation !== renderGeneration) return;
        // A Word page is about 816px wide; on a narrow screen start zoomed out so the whole page shows.
        const pageWidth = host.querySelector<HTMLElement>('.docx')?.offsetWidth || 816;
        const available = host.parentElement?.clientWidth || host.clientWidth;
        if (available && pageWidth > available) zoom = Math.max(0.4, Math.floor(((available - 16) / pageWidth) * 100) / 100);
      } else if (type === 'xlsx') {
        const XLSX = await import('xlsx');
        const { excelSheetPreview } = await import('$lib/excel-preview');
        const book = XLSX.read(await response.arrayBuffer(), { type: 'array', cellStyles: false, sheetRows: 500 });
        if (generation !== renderGeneration) return;
        sheets = book.SheetNames.map(sheetName => ({ name: sheetName, ...excelSheetPreview(book.Sheets[sheetName]) }));
        sheet = 0;
      }
    } catch (e) {
      if (generation === renderGeneration) error = reportError(e instanceof Error ? e.message : 'Berkas belum dapat dibuka.');
    } finally { if (generation === renderGeneration) loading = false; }
  }
  $effect(() => {
    const current = src + kind;
    if (kind !== 'other') untrack(() => { void render(); });
    return () => { void current; renderGeneration++; if (nativeSource) URL.revokeObjectURL(nativeSource); nativeSource = ''; };
  });
</script>

<div class="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100" style={`height:${height}px`}>
  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
    <span class="truncate font-semibold text-slate-800" title={name}>{name || 'Berkas'}</span>
    <span class="flex items-center gap-1">
      {#if kind === 'docx' || kind === 'xlsx' || kind === 'image'}
        <button type="button" class="rounded-md px-2 py-1 hover:bg-slate-100" onclick={() => (zoom = Math.max(0.5, zoom - 0.1))} aria-label="Perkecil">−</button>
        <span class="w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button type="button" class="rounded-md px-2 py-1 hover:bg-slate-100" onclick={() => (zoom = Math.min(2, zoom + 0.1))} aria-label="Perbesar">+</button>
      {/if}
      {#if showDownload}{#if pdf}<button type="button" class="ml-2 rounded-md px-2 py-1 font-semibold text-[#0066B2]" disabled={loading} onclick={() => downloadDocumentPdf(src, name).catch(e => reportError(e.message))}>Unduh PDF</button>{/if}<a class="ml-2 flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-[#0066B2] hover:bg-blue-50" href={src + (src.includes('?') ? '&' : '?') + 'download=1'} download={name}><Icon name="download" size={14} />Unduh berkas asli</a>{/if}
    </span>
  </div>
  <div class="relative min-h-0 flex-1 overflow-auto">
    {#if kind === 'pdf'}
      {#if nativeSource}<iframe title={name} src={nativeSource} class="h-full w-full border-0 bg-white"></iframe>{/if}
    {:else if kind === 'image'}
      {#if nativeSource}<div class="flex min-h-full items-start justify-center p-4"><img src={nativeSource} alt={name} style={`transform:scale(${zoom});transform-origin:top center`} class="max-w-full rounded shadow" /></div>{/if}
    {:else if kind === 'xlsx'}
      {#if sheets.length > 1}
        <div class="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-1">
          {#each sheets as s, i}<button type="button" class="rounded-md px-2 py-1 text-xs font-semibold {i === sheet ? 'bg-[#0066B2] text-white' : 'text-slate-600 hover:bg-slate-100'}" onclick={() => (sheet = i)}>{s.name}</button>{/each}
        </div>
      {/if}
      {#if sheets[sheet]}
        {#if sheets[sheet].limited}<p class="m-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Pratinjau dibatasi sampai 500 baris dan 50 kolom agar halaman tetap responsif. Unduh berkas asli untuk melihat seluruh isi; file asli tidak diubah.</p>{/if}
        <div class="sheet p-3" style={`zoom:${zoom}`}>{@html sheets[sheet].html}</div>
      {/if}
    {:else if kind === 'other'}
      <div class="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-600"><Icon name="file" size={28} />Pratinjau tidak tersedia untuk jenis berkas ini. Unduh berkas asli untuk membukanya.</div>
    {/if}
    <div bind:this={container} class="docx-host p-3" style={`zoom:${zoom}`} hidden={kind !== 'docx'}></div>
    {#if loading}<div class="absolute inset-0 flex items-center justify-center bg-white/70 text-sm text-slate-600">Menggambar berkas…</div>{/if}
    {#if error}<div class="absolute inset-x-0 top-0 m-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}<button type="button" class="ml-3 font-semibold underline" disabled={loading} onclick={()=>void render()}>Coba lagi</button></div>{/if}
  </div>
</div>

<style>
  .docx-host :global(.docx-wrapper) { background: transparent; padding: 0; }
  .docx-host :global(.docx) { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15); margin: 0 auto 16px; }
  .sheet :global(table) { border-collapse: collapse; background: white; font-size: 12px; }
  .sheet :global(td) { border: 1px solid #e2e8f0; padding: 2px 6px; white-space: nowrap; }
</style>
