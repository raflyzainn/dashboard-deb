<script lang="ts">
  import { untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import { dataService } from '$lib/data/service';
  import { app } from '$lib/state.svelte';
  import { EVIDENCE, emptyProgram, currentMonth, statusLabel, latestApproved, type MonitoringWorkspace, type MonthInput, type Hero, type CompleteMonth } from '$lib/monitoring';
  import Button from '$lib/components/ui/Button.svelte';
  import FormulaPanel from './FormulaPanel.svelte';
  import EvidenceInput from './EvidenceInput.svelte';
  import Snapshot from './Snapshot.svelte';
  let { campusId }: { campusId: string } = $props();
  let data = $state<MonitoringWorkspace | null>(null), period = $state(''), month = $state(currentMonth());
  let program = $state(emptyProgram()), heroes = $state<Hero[]>([]), incomeRp = $state<number | null | undefined>(), electricity = $state<number | null | undefined>(), biogas = $state<number | null | undefined>(), note = $state('');
  let busy = $state(false), uploads = $state(0), error = $state(''), notice = $state(''), baseline = $state(''), operationId = '', operationPayload = '';
  const monthRow = $derived(data?.months.find(m => m.month === month));
  const pending = $derived(monthRow?.status === 'pending');
  const active = $derived(data?.periods.some(p => p.id === period && p.state === 'active') ?? false);
  const disabled = $derived(busy || uploads > 0 || pending || !active || app.readOnly);
  const input = $derived<MonthInput>({ month, incomeSen: incomeRp == null ? null : Math.round(incomeRp * 100), electricityKwh: electricity ?? null, biogasM3: biogas ?? null, note });
  const serialized = $derived(JSON.stringify({ program, heroes, input }));
  const dirty = $derived(Boolean(data && baseline && serialized !== baseline));
  const completeRows = $derived.by(() => {
    const all = (data?.months.filter(m => m.month !== month).map(m => m.payload) || []).concat(input);
    return all.filter(r => r.incomeSen !== null && r.electricityKwh !== null && r.biogasM3 !== null) as CompleteMonth[];
  });
  const approved = $derived(latestApproved(data?.versions || []));
  function apply(next: MonitoringWorkspace) {
    data = next; program = JSON.parse(JSON.stringify(next.program)); heroes = JSON.parse(JSON.stringify(next.heroes));
    const saved = next.months.find(m => m.month === month)?.payload;
    incomeRp = saved?.incomeSen == null ? undefined : saved.incomeSen / 100; electricity = saved?.electricityKwh ?? undefined; biogas = saved?.biogasM3 ?? undefined; note = saved?.note || '';
    baseline = JSON.stringify({ program, heroes, input: { month, incomeSen: incomeRp == null ? null : Math.round(incomeRp * 100), electricityKwh: electricity ?? null, biogasM3: biogas ?? null, note } });
  }
  async function load(initial = false) {
    busy = true; error = '';
    try {
      let next = await dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${campusId}?period=${encodeURIComponent(period)}`);
      if (initial && !next.periods.some(p => p.id === period && p.state === 'active')) { period = next.periods.find(p => p.state === 'active')?.id ?? next.periods[0]?.id ?? ''; next = await dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${campusId}?period=${encodeURIComponent(period)}`); }
      apply(next);
    } catch (e) { error = e instanceof Error ? e.message : 'Monitoring belum dapat dimuat.'; }
    finally { busy = false; }
  }
  let loadedCampus = '';
  $effect(() => { if (campusId !== loadedCampus) { loadedCampus = campusId; void load(true); } });
  $effect(() => {
    const savedHeroes = app.navigation.campus?.program?.localHero;
    untrack(() => {
      if (data && !busy && savedHeroes !== undefined) {
        if (dirty) notice = 'Jika Local Hero di Profil Program berubah, simpan atau salin draf ini lalu muat ulang data sebelum melanjutkan.';
        else void load();
      }
    });
  });
  const confirmLeave = () => !dirty || window.confirm('Perubahan monitoring belum disimpan. Tinggalkan perubahan ini?');
  beforeNavigate(n => { if (dirty && !confirmLeave()) n.cancel(); });
  function beforeUnload(e: BeforeUnloadEvent) { if (dirty) { e.preventDefault(); e.returnValue = ''; } }
  async function choosePeriod(e: Event) { const target = e.currentTarget as HTMLSelectElement; if (!confirmLeave()) { target.value = period; return; } period = target.value; data = null; baseline = ''; await load(); }
  function chooseMonth(e: Event) { const target = e.currentTarget as HTMLInputElement; if (!confirmLeave()) { target.value = month; return; } month = target.value; if (data) apply(data); }
  async function refreshFiles() { const next = await dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${campusId}?period=${encodeURIComponent(period)}`); if (data) data.files = next.files; }
  async function act(action: 'save' | 'submit') {
    if (!data || disabled) return;
    if (action === 'submit' && dirty) { error = 'Simpan perubahan sebelum mengirim.'; return; }
    busy = true; error = ''; notice = '';
    const body = { action, period, month: action === 'save' ? input : month, program, heroes, expectedMonthRevision: monthRow?.revision || 0, expectedProgramRevision: data.programRevision, expectedCampusRevision: data.campusRevision, expectedFormulaRevision: data.formula.revision };
    const signature = JSON.stringify(body); if (signature !== operationPayload) { operationId = crypto.randomUUID(); operationPayload = signature; }
    try { apply(await dataService.api.post<MonitoringWorkspace>(`/api/monitoring/${campusId}`, { ...body, operationId })); operationId = ''; operationPayload = ''; await app.refreshNavigation(); notice = action === 'save' ? 'Draf tersimpan. Kirim bulan ini jika sudah lengkap.' : 'Kiriman terkunci dan menunggu pemeriksaan admin PF.'; }
    catch (e) { error = e instanceof Error ? e.message : 'Perubahan belum tersimpan.'; }
    finally { busy = false; }
  }
</script>
<svelte:window onbeforeunload={beforeUnload} />
<section id="monitoring-data" class="min-w-0 space-y-4">
  {#if error}<div class="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}<p class="mt-2">Input belum dibuang. Salin perubahan penting sebelum memuat ulang.</p></div>{/if}
  {#if notice}<p class="rounded-xl bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</p>{/if}
  <div class="flex flex-wrap items-end gap-3">
    {#if data}<label class="grid gap-1 text-sm font-medium">Periode monitoring<select class="rounded-lg border border-slate-300 bg-white p-2" value={period} onchange={choosePeriod} disabled={busy || uploads > 0}>{#each data.periods as p}<option value={p.id}>{p.name}{p.state === 'archived' ? ' (arsip)' : p.state === 'draft' ? ' (belum aktif)' : ''}</option>{/each}</select></label>{/if}
    <label class="grid gap-1 text-sm font-medium">Bulan monitoring<input class="rounded-lg border border-slate-300 bg-white p-2" type="month" min="2000-01" max={currentMonth()} value={month} onchange={chooseMonth} disabled={busy || uploads > 0} /></label>
    <Button variant="secondary" size="sm" disabled={busy || uploads > 0} onclick={() => { if (confirmLeave()) void load(); }}>Muat ulang data</Button>
    <span class="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{statusLabel(monthRow?.status || 'draft')}</span>
  </div>
  {#if data}
    {#if !active}<p class="rounded-xl bg-amber-50 p-3 text-sm">Periode ini tidak aktif; data hanya dapat dibaca.</p>{/if}
    {#if pending}<p class="rounded-xl bg-blue-50 p-3 text-sm">Bulan ini sedang diperiksa. Isian terkunci; pilih bulan lain untuk mengisi monitoring berikutnya.</p>{/if}
    <fieldset disabled={disabled} class="min-w-0 space-y-4 disabled:opacity-80">
      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <h3 class="text-base font-bold">Produksi dan pendapatan bulan {month}</h3><p class="mt-1 text-sm text-slate-600">Isi 0 jika tidak ada pendapatan/produksi. Kolom kosong belum dianggap dilaporkan.</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <label class="grid gap-1 text-sm">Pendapatan bulan ini (Rp)<input class="rounded-lg border border-slate-300 p-2" type="number" min="0" max="100000000000" step="0.01" bind:value={incomeRp} /></label>
          <label class="grid gap-1 text-sm">Listrik EBT non-biogas (kWh)<input class="rounded-lg border border-slate-300 p-2" type="number" min="0" step="any" bind:value={electricity} /></label>
          <label class="grid gap-1 text-sm">Produksi biogas (m³)<input class="rounded-lg border border-slate-300 p-2" type="number" min="0" step="any" bind:value={biogas} /></label>
        </div>
        <label class="mt-3 grid gap-1 text-sm">Catatan bulan ini<textarea class="rounded-lg border border-slate-300 p-2" rows="2" maxlength="5000" bind:value={note}></textarea></label>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <h3 class="text-base font-bold">Penerima manfaat dan kapasitas instalasi</h3><p class="mt-1 text-sm text-slate-600">Data berlaku untuk periode ini. Hitung setiap penerima manfaat sekali; jangan menjumlahkan orang yang sama tiap bulan.</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {#each [['beneficiaries', 'Penerima manfaat unik (orang)'], ['solarKwp', 'Kapasitas PLTS (kWp)'], ['otherKw', 'Kapasitas listrik EBT lainnya (kW)'], ['digesterM3', 'Kapasitas digester (m³)']] as [key, label]}
            <label class="grid gap-1 text-sm">{label}<input class="min-w-0 rounded-lg border border-slate-300 p-2" type="number" min="0" step={key === 'beneficiaries' ? '1' : 'any'} value={program[key as 'beneficiaries'] ?? ''} oninput={e => program[key as 'beneficiaries'] = e.currentTarget.value === '' ? null : Number(e.currentTarget.value)} /></label>
          {/each}
        </div>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <h3 class="text-base font-bold">Bukti energi dan kesiapan program</h3><p class="mt-1 text-sm text-slate-600">Bukti yang sama dapat digunakan kembali. Jika belum tersedia atau tidak berlaku, isi alasannya dan lengkapi saat tersedia.</p>
        <div class="mt-3 grid gap-4 sm:grid-cols-2">
          {#each EVIDENCE as [key, label, hint]}<div class="min-w-0 rounded-lg border border-slate-100 p-3">
            <p class="mb-2 text-xs text-slate-600">{hint}</p>
            <EvidenceInput {campusId} {period} kind={key} {label} bind:value={program.evidence[key].fileId} files={data.files} {disabled} onUploaded={refreshFiles} onBusy={value => uploads += value ? 1 : -1} />
            {#if !program.evidence[key].fileId}<label class="mt-2 grid gap-1 text-sm">Alasan belum tersedia / tidak berlaku<textarea class="rounded-lg border border-slate-300 p-2" rows="2" maxlength="2000" bind:value={program.evidence[key].reason}></textarea></label>{/if}
          </div>{/each}
        </div>
      </section>
      <section class="rounded-xl border border-slate-200 bg-white p-4">
        <h3 class="text-base font-bold">Local Hero</h3><p class="mt-1 text-sm text-slate-600">Lengkapi cerita dan foto masing-masing orang. Nama dan WhatsApp tersambung dengan Profil Program.</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">{#each heroes as hero, index (hero.id)}<div class="min-w-0 space-y-2 rounded-lg border border-slate-200 p-3">
          <label class="grid gap-1 text-sm">Nama Local Hero<input class="rounded-lg border border-slate-300 p-2" maxlength="120" bind:value={hero.name} /></label>
          <label class="grid gap-1 text-sm">WhatsApp (contoh +6281234567890)<input class="rounded-lg border border-slate-300 p-2" type="tel" bind:value={hero.phone} /></label>
          <label class="grid gap-1 text-sm">Cerita dan kontribusi<textarea class="rounded-lg border border-slate-300 p-2" rows="3" maxlength="5000" bind:value={hero.story}></textarea></label>
          <EvidenceInput {campusId} {period} kind="hero" label={`Foto ${hero.name || 'Local Hero'}`} bind:value={hero.photo} files={data.files} {disabled} onUploaded={refreshFiles} onBusy={value => uploads += value ? 1 : -1} />
          <button type="button" class="text-sm font-semibold text-red-700" onclick={() => heroes.splice(index, 1)}>Hapus Local Hero dari draf</button>
        </div>{/each}</div>
        <Button variant="secondary" size="sm" onclick={() => heroes.push({ id: crypto.randomUUID(), name: '', phone: '', story: '', photo: '' })}>Tambah Local Hero</Button>
      </section>
    </fieldset>
    <FormulaPanel rows={completeRows} beneficiaries={program.beneficiaries || 0} formula={data.formula} title="Pratinjau periode, termasuk draf" />
    <div class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <Button disabled={disabled} onclick={() => act('save')}>{busy ? 'Menyimpan…' : monthRow?.status === 'approved' ? 'Simpan koreksi sebagai draf baru' : 'Simpan draf monitoring'}</Button>
      <Button variant="secondary" disabled={disabled || dirty || monthRow?.status !== 'draft'} onclick={() => act('submit')}>Kirim bulan ini ke PF</Button>
      <p class="text-xs text-slate-600" role="status">{dirty ? 'Ada perubahan belum disimpan.' : 'Semua perubahan yang ditampilkan sudah tersimpan atau belum diisi.'}</p>
    </div>
    {#if approved.length}
      <FormulaPanel rows={approved.map(v => v.snapshot.month)} beneficiaries={approved[approved.length - 1].snapshot.program.beneficiaries || 0} formula={approved[approved.length - 1].snapshot.formula} title="Ringkasan dari bulan yang sudah Sesuai" gasEquivalentKwh={approved.reduce((sum,v) => sum + v.snapshot.result.gasEquivalentKwh, 0)} />
      <p class="text-xs text-slate-600">Penerima manfaat mengikuti snapshot bulan pelaporan terakhir yang Sesuai. Detail energi dengan faktor historis dapat dilihat pada setiap versi di bawah.</p>
    {/if}
    <section class="space-y-3"><h3 class="text-base font-bold">Riwayat kiriman bulan {month}</h3>
      {#each data.versions.filter(v => v.month === month).sort((a, b) => b.version - a.version) as version}
        <details class="rounded-xl border border-slate-200 bg-white p-4"><summary class="cursor-pointer text-sm font-semibold">Versi {version.version} · {statusLabel(version.status)}{version.note ? ` · ${version.note}` : ''}</summary><div class="mt-3"><Snapshot {version} /></div></details>
      {:else}<p class="text-sm text-slate-600">Belum ada kiriman untuk bulan ini.</p>{/each}
    </section>
  {:else if busy}<p role="status">Memuat monitoring…</p>{/if}
</section>
