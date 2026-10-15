<script lang="ts">
  import { page } from '$app/state';
  import { dataService } from '$lib/data/service';
  import { statusLabel, latestApproved, type MonitoringVersion, type MonitoringWorkspace } from '$lib/monitoring';
  import type { Period } from '$lib/periods';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Snapshot from './Snapshot.svelte';
  import FormulaPanel from './FormulaPanel.svelte';
  let data = $state<{ versions: MonitoringVersion[]; campuses: { id: string; name: string }[]; periods: Period[] } | null>(null);
  let campus = $state(page.url.searchParams.get('campus') || ''), period = $state(''), month = $state(''), status = $state('pending');
  let selected = $state(''), note = $state(''), error = $state(''), notice = $state(''), busy = $state(false);
  let workspace = $state<MonitoringWorkspace | null>(null);
  const rows = $derived(data?.versions.filter(v => (!campus || v.campus === campus) && v.period === period && (!month || v.month === month) && (!status || v.status === status)).sort((a,b) => b.month.localeCompare(a.month) || b.version - a.version) || []);
  const chosen = $derived(rows.find(v => v.id === selected) || rows[0]);
  const active = $derived(data?.periods.some(p => p.id === period && p.state === 'active'));
  const approved = $derived(latestApproved(workspace?.versions || []));
  async function load() {
    try { data = await dataService.api.get('/api/admin/monitoring'); if (!data?.periods.some(p => p.id === period)) period = data?.periods.find(p => p.state === 'active')?.id || ''; }
    catch(e) { error = e instanceof Error ? e.message : 'Antrean belum dapat dimuat.'; }
  }
  let initialized = false;
  $effect(() => { if (!initialized) { initialized = true; void load(); } });
  $effect(() => { chosen?.id; note = ''; });
  $effect(() => {
    const id = campus || chosen?.campus, p = period; let canceled = false;
    workspace = null;
    if (id) void dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${id}?period=${encodeURIComponent(p)}`).then(ws => { if (!canceled) { workspace = ws; } }).catch(e => { if (!canceled) error = e.message; });
    return () => { canceled = true; };
  });
  async function act(body: Record<string, unknown>, message: string) {
    if (busy) return; busy = true; error = ''; notice = '';
    try { await dataService.api.post('/api/admin/monitoring', body); await load(); if (workspace) { workspace = await dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${workspace.campusId}?period=${encodeURIComponent(period)}`); } notice = message; }
    catch(e) { error = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; }
    finally { busy = false; }
  }
</script>
<section class="w-full space-y-6">
  <header>
    <span class="mb-[9px] block text-xs font-bold tracking-[0.06em] text-[#3975b7]">PERKEMBANGAN PROGRAM KAMPUS</span>
    <h1 class="m-0 text-[29px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--navy)] max-[700px]:text-[23px]">Monitoring Kampus</h1>
    <p class="mt-2 text-sm leading-relaxed text-[#637796]">Pantau hasil program dan periksa laporan bulanan kampus. Pilih kampus untuk melihat data serta bukti yang sudah disimpan.</p>
  </header>
  <div class="grid gap-3 sm:grid-cols-3">
    {#each [['pending', 'Menunggu pemeriksaan', 'clock'], ['approved', 'Sesuai', 'check'], ['revision', 'Perlu revisi', 'edit']] as [key, label, icon]}
      <button type="button" class="relative rounded-xl border bg-white p-5 text-left transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-blue-500 {status === key ? 'border-blue-400' : 'border-slate-200'}" onclick={() => status = key} aria-pressed={status === key}>
        <span class="absolute right-4 top-4 grid size-9 place-items-center rounded-xl bg-blue-50 text-[#3975b7]"><Icon name={icon} size={18} /></span><span class="block pr-10 text-sm text-slate-500">{label}</span><strong class="mt-2 block text-2xl text-[var(--navy)]">{data?.versions.filter(v => v.status === key && v.period === period && (!campus || v.campus === campus) && (!month || v.month === month)).length || 0}</strong>
        <span class="mt-1 block text-xs text-slate-500">kiriman bulanan</span>
      </button>
    {/each}
  </div>
  {#if error}<p class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>{/if}
  {#if notice}<p class="rounded-xl bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>{/if}
  <section class="rounded-xl border border-slate-200 bg-white p-5" aria-label="Filter monitoring">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 class="text-sm font-bold text-slate-900">Tampilkan laporan</h2><p class="mt-1 text-xs text-slate-500">Pilih kampus, periode, atau status yang ingin diperiksa.</p></div><Button variant="secondary" size="sm" disabled={busy} onclick={load}>Perbarui data</Button></div>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <label class="grid gap-1 text-sm">Kampus<select class="min-w-0 rounded-lg border border-slate-300 bg-white p-2" bind:value={campus}><option value="">Semua kampus</option>{#each data?.campuses || [] as c}<option value={c.id}>{c.name}</option>{/each}</select></label>
    <label class="grid gap-1 text-sm">Periode<select class="min-w-0 rounded-lg border border-slate-300 bg-white p-2" bind:value={period}>{#each data?.periods || [] as p}<option value={p.id}>{p.name} · {p.state === 'active' ? 'Aktif' : p.state === 'archived' ? 'Arsip' : 'Draf'}</option>{/each}</select></label>
    <label class="grid gap-1 text-sm">Bulan laporan<input class="rounded-lg border border-slate-300 p-2" type="month" bind:value={month} /><span class="text-xs font-normal text-slate-500">Kosongkan untuk semua bulan.</span></label>
    <label class="grid gap-1 text-sm">Status<select class="rounded-lg border border-slate-300 bg-white p-2" bind:value={status}><option value="pending">Menunggu pemeriksaan</option><option value="approved">Sesuai</option><option value="revision">Perlu revisi</option><option value="">Semua status</option></select></label>
  </div>
  </section>
  {#if rows.length}
  <div class="grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
    <div class="space-y-2">{#each rows as row}<button class="w-full rounded-xl border p-3 text-left text-sm {chosen?.id === row.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}" onclick={() => selected = row.id}><strong class="block">{data?.campuses.find(c => c.id === row.campus)?.name}</strong><span>{row.month} · versi {row.version} · {statusLabel(row.status)}</span></button>{/each}</div>
    {#if chosen}<section class="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4">
      <h2 class="text-base font-bold">{data?.campuses.find(c => c.id === chosen.campus)?.name}</h2><Snapshot version={chosen} showFormula={false} />
      {#if chosen.status === 'pending' && active}
        <label class="grid gap-1 text-sm">Catatan pemeriksaan (wajib untuk revisi)<textarea class="rounded-lg border border-slate-300 p-2" rows="3" maxlength="2000" bind:value={note} disabled={busy}></textarea></label>
        <div class="flex flex-wrap gap-2"><Button disabled={busy} onclick={() => act({ action: 'review', campus: chosen!.campus, period, id: chosen!.id, status: 'approved', note }, 'Monitoring ditandai Sesuai.')}>Nyatakan Sesuai</Button><Button variant="secondary" disabled={busy || !note.trim()} onclick={() => act({ action: 'review', campus: chosen!.campus, period, id: chosen!.id, status: 'revision', note }, 'Permintaan revisi dikirim ke kampus.')}>Minta revisi</Button></div>
      {/if}
    </section>{/if}
  </div>
  {:else}
    <section class="flex min-h-60 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-10 text-center">
      <span class="mb-4 grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#3975b7]"><Icon name="file" size={24} /></span>
      <h2 class="text-base font-bold text-slate-900">Belum ada laporan sesuai filter</h2>
      <p class="mt-2 max-w-md text-sm leading-relaxed text-slate-500">Laporan muncul setelah kampus mengirim monitoring bulanan. {campus ? 'Data yang baru disimpan sebagai draf dapat dilihat di bawah.' : 'Pilih kampus pada filter untuk melihat data yang sudah disimpan, termasuk draf.'}</p>
    </section>
  {/if}
  {#if campus && workspace}
    <section class="space-y-3 rounded-xl border border-slate-200 bg-white p-5" aria-label="Data bulanan tersimpan">
      <div><h2 class="text-base font-bold text-slate-900">Data bulanan tersimpan &middot; {workspace.campusName}</h2><p class="mt-1 text-sm text-slate-500">Termasuk draf yang belum dikirim. Keputusan pemeriksaan hanya diberikan pada kiriman di antrean.</p></div>
      {#if workspace.months.length}<div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="border-b border-slate-200 text-slate-500"><tr><th class="p-3">Bulan</th><th class="p-3">Status</th><th class="p-3">Pendapatan</th><th class="p-3">Listrik non-biogas</th><th class="p-3">Biogas</th></tr></thead><tbody>
        {#each workspace.months.filter(row => !month || row.month === month).sort((a,b) => b.month.localeCompare(a.month)) as row}<tr class="border-b border-slate-100"><td class="p-3">{row.month}</td><td class="p-3">{statusLabel(row.status)}</td><td class="p-3">{row.payload.incomeSen === null ? 'Belum diisi' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(row.payload.incomeSen / 100)}</td><td class="p-3">{row.payload.electricityKwh === null ? 'Belum diisi' : `${row.payload.electricityKwh} kWh`}</td><td class="p-3">{row.payload.biogasM3 === null ? 'Belum diisi' : `${row.payload.biogasM3} m\u00b3`}</td></tr>{:else}<tr><td colspan="5" class="p-3 text-slate-500">Belum ada data untuk bulan yang dipilih.</td></tr>{/each}
      </tbody></table></div>{:else}<p class="text-sm text-slate-500">Kampus ini belum menyimpan data monitoring pada periode ini.</p>{/if}
    </section>
  {/if}
  {#if campus && approved.length && workspace}
    <FormulaPanel showFormula={false} rows={approved.map(v => v.snapshot.month)} beneficiaries={approved[approved.length - 1].snapshot.program.beneficiaries || 0} formula={approved[approved.length - 1].snapshot.formula} title="Ringkasan periode dari kiriman Sesuai" gasEquivalentKwh={approved.reduce((sum,v) => sum + v.snapshot.result.gasEquivalentKwh, 0)} />
  {/if}

</section>
