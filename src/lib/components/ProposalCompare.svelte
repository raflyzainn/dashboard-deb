<script lang="ts">
  import type { DemoSession, ProposalVersion } from '$lib/types';
  import { dataService } from '$lib/data/service';
  import { compareText, splitRows, type ProposalDiff, type ExtractedProposal } from '$lib/data/proposal-diff';
  import { date } from '$lib/domain';
  import Icon from './Icon.svelte';

  let { versions, actor, onview }: { versions: ProposalVersion[]; actor: DemoSession; onview: (version: ProposalVersion) => void } = $props();
  let beforeId = $state('');
  let afterId = $state('');
  let mode = $state<'split' | 'unified'>('split');
  let onlyChanges = $state(false);
  let retry = $state(0);
  let busy = $state(false);
  let error = $state('');
  let result = $state<{ diff: ProposalDiff; before: ExtractedProposal; after: ExtractedProposal } | null>(null);
  const before = $derived(versions.find(v => v.id === beforeId));
  const after = $derived(versions.find(v => v.id === afterId));
  const rows = $derived(result?.diff.rows.filter(row => !onlyChanges || row.kind !== 'same') || []);
  const paired = $derived(splitRows(result?.diff.rows || []).filter(row => !onlyChanges || row.changed));

  $effect(() => {
    if (!versions.some(v => v.id === beforeId)) beforeId = versions[1]?.id || '';
    if (!versions.some(v => v.id === afterId)) afterId = versions[0]?.id || '';
  });

  $effect(() => {
    const base = before, target = after, session = actor;
    void retry;
    const controller = new AbortController();
    result = null; error = ''; busy = false;
    if (base && target && base.id !== target.id) {
      busy = true;
      void (async () => {
        try {
          const { extractPdfText } = await import('$lib/data/pdf-text');
          controller.signal.throwIfAborted();
          const original = await extractPdfText(await dataService.proposalFile(base.id), controller.signal);
          const revised = await extractPdfText(await dataService.proposalFile(target.id), controller.signal);
          if (!original.lines.length || !revised.lines.length) throw new Error('Teks tidak ditemukan pada salah satu PDF. Dokumen mungkin hasil scan. Bandingkan melalui PDF asli; pembacaan teks dari gambar (OCR) belum tersedia.');
          const diff = await compareText(original.lines, revised.lines);
          if (!controller.signal.aborted) result = { diff, before: original, after: revised };
        } catch (e) {
          if (!controller.signal.aborted) error = e instanceof Error ? e.message : 'Perbandingan gagal. Silakan coba kembali.';
        } finally { if (!controller.signal.aborted) busy = false; }
      })();
    }
    return () => controller.abort();
  });
</script>

<section class="panel comparison" aria-label="Perbandingan proposal">
  <div class="panel-heading"><div><span class="eyebrow">REVIEW PERUBAHAN</span><h2>Bandingkan versi proposal</h2><p>Pilih dua versi untuk melihat perubahan isi dokumen.</p></div><Icon name="proposal" size={22}/></div>
  {#if versions.length < 2}
    <p class="compare-empty">Perbandingan tersedia setelah ada minimal dua versi proposal.</p>
  {:else}
    <div class="compare-selectors">
      <label>Versi dasar<select aria-label="Versi dasar" bind:value={beforeId}>{#each versions as version}<option value={version.id}>Versi {version.version} · {version.filename}</option>{/each}</select></label>
      <button class="button secondary swap" aria-label="Tukar versi perbandingan" onclick={() => { [beforeId, afterId] = [afterId, beforeId]; }}>⇄</button>
      <label>Versi pembanding<select aria-label="Versi pembanding" bind:value={afterId}>{#each versions as version}<option value={version.id}>Versi {version.version} · {version.filename}</option>{/each}</select></label>
    </div>
    {#if before && after}
      <div class="compare-files">
        <div><strong>Dasar: versi {before.version}</strong><span>{before.filename} · {date(before.createdAt)}</span><button class="text-link" onclick={() => onview(before)}>Buka PDF dasar</button></div>
        <div><strong>Pembanding: versi {after.version}</strong><span>{after.filename} · {date(after.createdAt)}</span><button class="text-link" onclick={() => onview(after)}>Buka PDF pembanding</button></div>
      </div>
    {/if}
    <p class="compare-note">Perbandingan membaca teks PDF. Gambar, tata letak, dan format tidak dibandingkan; urutan teks tabel atau kolom dapat berbeda dari tampilan PDF.</p>
    {#if beforeId === afterId}
      <p class="compare-empty" role="status">Pilih dua versi yang berbeda untuk dibandingkan.</p>
    {:else if busy}
      <p class="compare-empty" role="status"><span class="spinner"></span> Membaca dan membandingkan isi PDF…</p>
    {:else if error}
      <div class="compare-error" role="alert"><p>{error}</p><button class="button secondary small" onclick={() => retry++}>Coba lagi</button></div>
    {:else if result}
      {#if result.before.emptyPages.length || result.after.emptyPages.length}
        <p class="compare-warning" role="status">Sebagian halaman tidak memiliki teks terbaca. Dasar: {result.before.emptyPages.join(', ') || 'tidak ada'}; pembanding: {result.after.emptyPages.join(', ') || 'tidak ada'}. Halaman kosong atau gambar tidak tercakup dalam hasil ini.</p>
      {/if}
      <div class="compare-toolbar">
        <div class="diff-counts" aria-live="polite"><span class="count-added">+{result.diff.added} baris ditambahkan</span><span class="count-removed">−{result.diff.removed} baris dihapus</span></div>
        <div class="compare-options"><div class="view-switch" aria-label="Tampilan perbedaan"><button class:active={mode === 'split'} aria-pressed={mode === 'split'} onclick={() => mode = 'split'}>Berdampingan</button><button class:active={mode === 'unified'} aria-pressed={mode === 'unified'} onclick={() => mode = 'unified'}>Gabungan</button></div><label class="checkbox-label"><input type="checkbox" bind:checked={onlyChanges}/>Hanya perubahan</label></div>
      </div>
      {#if !result.diff.added && !result.diff.removed}<p class="compare-identical" role="status">Tidak ada perbedaan pada teks yang terbaca. Gambar dan format PDF mungkin tetap berbeda.</p>{/if}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users need to scroll long comparisons.) -->
      <div class="diff-scroll" tabindex="0" role="region" aria-label="Hasil perbedaan teks PDF">
        {#if mode === 'split'}
          <table class="diff-table split"><colgroup><col class="number-column"/><col/><col class="number-column"/><col/></colgroup><thead><tr><th colspan="2">Dasar · versi {before?.version}</th><th colspan="2">Pembanding · versi {after?.version}</th></tr></thead><tbody>{#each paired as row}<tr><td class="line-number" class:deleted={row.changed && !!row.before}>{row.before?.number || ''}</td><td class:deleted={row.changed && !!row.before} class:absent={!row.before}><span class="diff-sign">{row.changed && row.before ? '−' : ' '}</span>{#if row.before}<span class="line-text">{row.before.text}</span><small class="page-ref">Hlm. {row.before.page}</small>{/if}</td><td class="line-number" class:inserted={row.changed && !!row.after}>{row.after?.number || ''}</td><td class:inserted={row.changed && !!row.after} class:absent={!row.after}><span class="diff-sign">{row.changed && row.after ? '+' : ' '}</span>{#if row.after}<span class="line-text">{row.after.text}</span><small class="page-ref">Hlm. {row.after.page}</small>{/if}</td></tr>{/each}</tbody></table>
        {:else}
          <table class="diff-table unified"><thead><tr><th>Dasar</th><th>Baru</th><th>Isi teks</th></tr></thead><tbody>{#each rows as row}<tr class:deleted={row.kind === 'removed'} class:inserted={row.kind === 'added'}><td class="line-number">{row.before?.number || ''}</td><td class="line-number">{row.after?.number || ''}</td><td><span class="diff-sign">{row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}</span><span class="line-text">{row.after?.text ?? row.before?.text}</span><small class="page-ref">Hlm. {row.after?.page ?? row.before?.page}</small></td></tr>{/each}</tbody></table>
        {/if}
      </div>
      <p class="compare-note">Nomor baris mengikuti teks hasil pembacaan. Perubahan dihitung dari versi dasar ke versi pembanding.</p>
    {/if}
  {/if}
</section>

<style>
  .comparison{margin-top:24px;overflow:hidden;min-width:0}.compare-selectors{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:14px;padding:0 24px 20px;align-items:end}.compare-selectors label{display:flex;flex-direction:column;align-items:stretch;gap:8px;font-size:12px;font-weight:600;min-width:0;margin:0}.compare-selectors select{width:100%;max-width:none;min-width:0;text-overflow:ellipsis;min-height:44px}.swap{font-size:22px;padding:6px 15px;min-height:43px}.compare-files{display:grid;grid-template-columns:1fr 1fr;border-block:1px solid #dce5df;background:#f8faf9}.compare-files>div{padding:16px 24px;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px}.compare-files>div+div{border-left:1px solid #dce5df}.compare-files strong{font-size:12px}.compare-files span{font-size:11px;color:#65736b;overflow-wrap:anywhere}.compare-files button{font-size:11px}.compare-note{font-size:11px;color:#65736b;line-height:1.8;margin:14px 24px}.compare-empty{padding:20px 24px;color:#65736b;font-size:13px;display:flex;align-items:center;gap:12px}.compare-error,.compare-warning{margin:16px 24px;padding:15px;border:1px solid #eacb87;background:#fff8e7;border-radius:8px;font-size:12px;line-height:1.8}.compare-error p{margin-bottom:12px}.compare-toolbar{padding:16px 24px;border-top:1px solid #dce5df;display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap;align-items:center}.diff-counts{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;font-weight:700}.count-added{color:#116329}.count-removed{color:#a8202a}.compare-options{display:flex;align-items:center;gap:16px;flex-wrap:wrap}.view-switch{display:flex;border:1px solid #d0d9d4;border-radius:7px;overflow:hidden}.view-switch button{padding:8px 11px;background:white;font-size:11px;color:#53635a}.view-switch button.active{background:#e7eee9;color:#173e2c;font-weight:700}.compare-options label{display:flex;align-items:center;gap:8px;font-size:11px;margin:0;white-space:nowrap}.compare-options input{width:16px;height:16px;flex-shrink:0;accent-color:#20643d}.compare-identical{padding:14px 24px;background:#edf8f0;color:#116329;font-size:12px}.diff-scroll{overflow:auto;max-height:650px;outline-offset:-3px}.diff-table{width:100%;border-collapse:collapse;table-layout:fixed;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12px}.diff-table th{position:sticky;top:0;background:#f1f5f3;padding:12px;text-align:left;z-index:1;color:#46584d}.diff-table td{padding:7px 10px;border-bottom:1px solid #e4ebe6;vertical-align:top;line-height:1.8;white-space:normal;overflow-wrap:anywhere;color:#24352b}.diff-table .number-column{width:42px}.diff-table .line-number{color:#6e7e74;text-align:right;font-size:10px;padding-inline:5px;width:40px}.split td:nth-child(2),.split td:nth-child(4){text-align:left}.split td:nth-child(3){border-left:1px solid #dce5df}.unified th:nth-child(1),.unified th:nth-child(2){width:44px}.diff-table .deleted,.diff-table tr.deleted td{background:#ffebe9;color:#82071e}.diff-table .inserted,.diff-table tr.inserted td{background:#dafbe1;color:#116329}.diff-table .absent{background:repeating-linear-gradient(135deg,#f7f9f8,#f7f9f8 5px,#eef2ef 5px,#eef2ef 6px)}.diff-sign{display:inline-block;width:15px;font-weight:700;user-select:none}.page-ref{display:block;font-size:9px;color:#637168;margin-left:15px}.line-text{white-space:pre-wrap}
  @media(max-width:700px){.compare-selectors{grid-template-columns:minmax(0,1fr);padding:0 16px 16px;gap:10px}.swap{justify-self:center;min-width:44px}.compare-files>div{padding:12px}.compare-note{margin:12px 16px}.compare-toolbar{padding:14px 16px}.compare-error,.compare-warning{margin:14px 16px}.diff-table.split{min-width:650px}.diff-table.unified{font-size:11px}.compare-options{gap:10px}.comparison :global(.panel-heading){padding-inline:16px}}
</style>
