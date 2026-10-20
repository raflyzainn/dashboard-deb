<script lang="ts">
  import { page } from '$app/state';
  import { dataService } from '$lib/data/service';
  import { laporanStatusLabel, type LaporanQueueItem, type LaporanStatus, type LaporanWorkspace } from '$lib/laporan-eksisting';
  import Icon from '$lib/components/ui/Icon.svelte';
  import LaporanView from './LaporanView.svelte';
  let queue = $state<LaporanQueueItem[] | null>(null);
  let status = $state<LaporanStatus | ''>('pending'), selected = $state(page.url.searchParams.get('campus') || '');
  let ws = $state<LaporanWorkspace | null>(null), note = $state(''), error = $state(''), notice = $state(''), busy = $state(false);
  const rows = $derived((queue || []).filter(q => !status || q.status === status).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '')));
  const chosen = $derived(rows.find(q => q.campusId === selected) || (queue || []).find(q => q.campusId === selected) || rows[0]);
  const count = (s: LaporanStatus) => (queue || []).filter(q => q.status === s).length;
  const when = (iso: string) => iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  async function load() {
    try { queue = await dataService.api.get<LaporanQueueItem[]>('/api/admin/laporan-eksisting'); }
    catch (e) { error = e instanceof Error ? e.message : 'Daftar laporan belum dapat dimuat.'; }
  }
  let initialized = false;
  $effect(() => { if (!initialized) { initialized = true; void load(); } });
  $effect(() => {
    const id = chosen?.campusId; let canceled = false;
    ws = null; note = '';
    if (id) void dataService.api.get<LaporanWorkspace>(`/api/laporan-eksisting/${id}`).then(next => { if (!canceled) ws = next; }).catch(e => { if (!canceled) error = e.message; });
    return () => { canceled = true; };
  });
  async function review(decision: 'approved' | 'revision') {
    if (!ws || busy) return;
    if (decision === 'revision' && !note.trim()) { error = 'Isi catatan revisi untuk kampus.'; return; }
    busy = true; error = ''; notice = '';
    try {
      await dataService.api.post('/api/admin/laporan-eksisting', { action: 'review', campus: ws.campusId, status: decision, note, expectedRevision: ws.laporan.revision });
      notice = decision === 'approved' ? 'Laporan dinyatakan Sesuai.' : 'Permintaan revisi dikirim ke kampus.';
      selected = ws.campusId; await load(); ws = await dataService.api.get<LaporanWorkspace>(`/api/laporan-eksisting/${ws.campusId}`); note = '';
    } catch (e) { error = e instanceof Error ? e.message : 'Keputusan belum tersimpan.'; }
    finally { busy = false; }
  }
</script>
<section class="w-full space-y-6">
  <header>
    <span class="mb-[9px] block text-xs font-bold tracking-[0.06em] text-[#3975b7]">PRA-COACHING</span>
    <h1 class="m-0 text-[29px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--navy)] max-[700px]:text-[23px]">Laporan Eksisting</h1>
    <p class="mt-2 text-sm leading-relaxed text-[#637796]">Periksa deskripsi 4 pilar serta foto dan video kondisi DEB yang dikirim kampus sebelum coaching.</p>
  </header>
  <div class="grid gap-3 sm:grid-cols-3">
    {#each [['pending', 'Menunggu pemeriksaan', 'clock'], ['approved', 'Sesuai', 'check'], ['revision', 'Perlu revisi', 'edit']] as [key, label, icon]}
      <button type="button" class="relative cursor-pointer rounded-xl border bg-white p-5 text-left transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-blue-500 {status === key ? 'border-blue-400' : 'border-slate-200'}" aria-pressed={status === key} onclick={() => { status = key as LaporanStatus; selected = ''; }}>
        <span class="absolute right-4 top-4 grid size-9 place-items-center rounded-xl bg-blue-50 text-[#3975b7]"><Icon name={icon} size={18} /></span><span class="block pr-10 text-sm text-slate-500">{label}</span><strong class="mt-2 block text-2xl text-[var(--navy)]">{count(key as LaporanStatus)}</strong>
        <span class="mt-1 block text-xs text-slate-500">laporan kampus</span>
      </button>
    {/each}
  </div>
  {#if error}<p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>{/if}
  {#if notice}<p class="rounded-xl bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>{/if}
  <div class="flex flex-wrap items-start gap-4">
    <section aria-label="Daftar laporan" class="flex min-w-0 flex-[1_1_260px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <label class="grid gap-1 text-sm">Status<select class="rounded-lg border border-slate-300 bg-white p-2" bind:value={status} onchange={() => (selected = '')}><option value="pending">Menunggu pemeriksaan</option><option value="approved">Sesuai</option><option value="revision">Perlu revisi</option><option value="draft">Draf</option><option value="">Semua status</option></select></label>
      {#if !queue}<p class="p-2 text-sm text-slate-600">Memuat…</p>
      {:else if !rows.length}<p class="p-2 text-sm text-slate-600">Belum ada laporan dengan status ini.</p>
      {:else}
        {#each rows as q (q.campusId)}
          <button type="button" class="cursor-pointer rounded-lg border p-3 text-left hover:border-blue-300 {chosen?.campusId === q.campusId ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}" onclick={() => (selected = q.campusId)}>
            <strong class="block text-sm text-slate-900">{q.campusName}</strong><span class="text-xs text-slate-600">{laporanStatusLabel(q.status)}{q.submittedAt ? ` · dikirim ${when(q.submittedAt)}` : ''}</span>
          </button>
        {/each}
      {/if}
    </section>
    <div class="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
      {#if ws}
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-lg font-bold text-slate-900">{ws.campusName}</h2><span class="text-sm text-slate-600">{laporanStatusLabel(ws.laporan.status)}{ws.laporan.reviewedAt ? ` · diperiksa ${when(ws.laporan.reviewedAt)}${ws.laporan.reviewerName ? ` oleh ${ws.laporan.reviewerName}` : ''}` : ''}</span></div>
        {#if ws.laporan.note}<p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">Catatan PF: {ws.laporan.note}</p>{/if}
        <LaporanView {ws} />
        {#if ws.laporan.status === 'pending'}
          <div class="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <label class="grid gap-1 text-sm font-medium">Catatan pemeriksaan (wajib untuk revisi)<textarea class="rounded-lg border border-slate-300 p-2 font-normal" rows="3" maxlength="2000" bind:value={note}></textarea></label>
            <div class="flex flex-wrap justify-end gap-2">
              <button type="button" class="min-h-11 cursor-pointer rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 hover:border-orange-400 disabled:opacity-60" disabled={busy} onclick={() => review('revision')}>Minta revisi</button>
              <button type="button" class="min-h-11 cursor-pointer rounded-lg bg-[#0066B2] px-5 text-sm font-semibold text-white hover:bg-[#015a9a] disabled:opacity-60" disabled={busy} onclick={() => review('approved')}>Nyatakan Sesuai</button>
            </div>
          </div>
        {/if}
      {:else if chosen}<div class="h-64 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" aria-label="Memuat laporan"></div>{/if}
    </div>
  </div>
</section>
