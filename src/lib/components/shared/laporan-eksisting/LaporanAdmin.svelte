<script lang="ts">
  import { page } from '$app/state';
  import { dataService } from '$lib/data/service';
  import { laporanStatusLabel, type LaporanQueueItem, type LaporanWorkspace } from '$lib/laporan-eksisting';
  import Icon from '$lib/components/ui/Icon.svelte';
  import LaporanView from './LaporanView.svelte';
  /** Read only: campuses send the report, PF only looks at it. */
  type Filter = LaporanQueueItem['status'] | '';
  let queue = $state<LaporanQueueItem[] | null>(null);
  let status = $state<Filter>('submitted'), selected = $state(page.url.searchParams.get('campus') || '');
  let ws = $state<LaporanWorkspace | null>(null), error = $state('');
  const rows = $derived((queue || []).filter(q => !status || q.status === status).sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || '') || a.campusName.localeCompare(b.campusName)));
  const chosen = $derived((queue || []).find(q => q.campusId === selected && q.status !== 'kosong') || rows.find(q => q.status !== 'kosong'));
  const count = (s: Filter) => (queue || []).filter(q => q.status === s).length;
  const when = (iso: string) => iso ? new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  let initialized = false;
  $effect(() => {
    if (initialized) return; initialized = true;
    dataService.api.get<LaporanQueueItem[]>('/api/admin/laporan-eksisting').then(q => { queue = q; }).catch(e => { error = e instanceof Error ? e.message : 'Daftar laporan belum dapat dimuat.'; });
  });
  $effect(() => {
    const id = chosen?.campusId; let canceled = false;
    ws = null;
    if (id) void dataService.api.get<LaporanWorkspace>(`/api/laporan-eksisting/${id}`).then(next => { if (!canceled) ws = next; }).catch(e => { if (!canceled) error = e.message; });
    return () => { canceled = true; };
  });
</script>
<section class="w-full space-y-6">
  <header>
    <span class="mb-[9px] block text-xs font-bold tracking-[0.06em] text-[#3975b7]">PRA-COACHING</span>
    <h1 class="m-0 text-[29px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--navy)] max-[700px]:text-[23px]">Laporan Eksisting</h1>
    <p class="mt-2 text-sm leading-relaxed text-[#637796]">Deskripsi 4 pilar serta foto dan video kondisi DEB yang dikirim kampus sebelum coaching.</p>
  </header>
  <div class="grid gap-3 sm:grid-cols-3">
    {#each [['submitted', 'Terkirim', 'check'], ['draft', 'Draf', 'edit'], ['kosong', 'Belum mengisi', 'clock']] as [key, label, icon]}
      <button type="button" class="relative cursor-pointer rounded-xl border bg-white p-5 text-left transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-blue-500 {status === key ? 'border-blue-400' : 'border-slate-200'}" aria-pressed={status === key} onclick={() => { status = key as Filter; selected = ''; }}>
        <span class="absolute right-4 top-4 grid size-9 place-items-center rounded-xl bg-blue-50 text-[#3975b7]"><Icon name={icon} size={18} /></span><span class="block pr-10 text-sm text-slate-500">{label}</span><strong class="mt-2 block text-2xl text-[var(--navy)]">{queue ? count(key as Filter) : '…'}</strong>
        <span class="mt-1 block text-xs text-slate-500">kampus</span>
      </button>
    {/each}
  </div>
  {#if error}<p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>{/if}
  <div class="flex flex-wrap items-start gap-4">
    <section aria-label="Daftar kampus" class="flex min-w-0 flex-[1_1_260px] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <label class="grid gap-1 text-sm">Status<select class="rounded-lg border border-slate-300 bg-white p-2" bind:value={status} onchange={() => (selected = '')}><option value="submitted">Terkirim</option><option value="draft">Draf</option><option value="kosong">Belum mengisi</option><option value="">Semua kampus</option></select></label>
      {#if !queue}<p class="p-2 text-sm text-slate-600">Memuat…</p>
      {:else if !rows.length}<p class="p-2 text-sm text-slate-600">Tidak ada kampus dengan status ini.</p>
      {:else}
        <ul class="flex max-h-[640px] flex-col gap-2 overflow-y-auto">
          {#each rows as q (q.campusId)}
            <li>
              {#if q.status === 'kosong'}
                <div class="rounded-lg border border-slate-200 p-3"><strong class="block text-sm text-slate-900">{q.campusName}</strong><span class="text-xs text-slate-600">Belum mengisi</span></div>
              {:else}
                <button type="button" class="w-full cursor-pointer rounded-lg border p-3 text-left hover:border-blue-300 {chosen?.campusId === q.campusId ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}" aria-current={chosen?.campusId === q.campusId ? 'true' : undefined} onclick={() => (selected = q.campusId)}>
                  <strong class="block text-sm text-slate-900">{q.campusName}</strong><span class="text-xs text-slate-600">{laporanStatusLabel(q.status)}{q.submittedAt ? ` · terakhir dikirim ${when(q.submittedAt)}` : ''}</span>
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    </section>
    <div class="flex min-w-0 flex-[999_1_640px] flex-col gap-4">
      {#if ws}
        <div class="flex flex-wrap items-center justify-between gap-2"><h2 class="text-lg font-bold text-slate-900">{ws.campusName}</h2><span class="text-sm text-slate-600">{laporanStatusLabel(ws.laporan.status)}{ws.laporan.submittedAt ? ` · terakhir dikirim ${when(ws.laporan.submittedAt)}` : ''}</span></div>
        {#if ws.laporan.status === 'draft' && ws.laporan.submittedAt}<p class="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Kampus sedang memperbarui laporan. Isian di bawah adalah versi terbaru yang tersimpan.</p>{/if}
        <LaporanView {ws} />
      {:else if chosen}<div class="h-64 animate-pulse rounded-xl bg-slate-200/70" aria-busy="true" aria-label="Memuat laporan"></div>
      {:else if queue}<p class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Pilih kampus yang sudah mengisi untuk melihat laporannya.</p>{/if}
    </div>
  </div>
</section>
