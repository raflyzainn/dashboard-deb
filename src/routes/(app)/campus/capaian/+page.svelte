<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import { onChange } from '$lib/realtime.svelte';
  import { formatSen } from '$lib/pencairan';
  import { currentMonth, type MonitoringWorkspace } from '$lib/monitoring';
  import { capaian, monthName, niceMax, rabRealisasi, type CapaianMonth, type LpjInput } from '$lib/capaian';
  import Icon from '$lib/components/ui/Icon.svelte';

  type Metric = 'income' | 'power' | 'biogas';
  let ws = $state<MonitoringWorkspace | null>(null), lpj = $state<LpjInput | null>(null);
  let period = $state(''), metric = $state<Metric>('income'), error = $state(''), lpjError = $state(''), loading = $state(true);
  let generation = 0;

  async function load(campusId: string, initial = false) {
    const current = ++generation;
    try {
      let next = await dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${campusId}?period=${encodeURIComponent(period)}`);
      if (initial && !next.periods.some(p => p.id === period && p.state === 'active')) {
        period = next.periods.find(p => p.state === 'active')?.id ?? next.periods[0]?.id ?? '';
        next = await dataService.api.get<MonitoringWorkspace>(`/api/monitoring/${campusId}?period=${encodeURIComponent(period)}`);
      }
      const money = await dataService.api.get<LpjInput>(`/api/pencairan/${campusId}/lpj`).then(value => { lpjError = ''; return value; }, e => { lpjError = e instanceof Error ? e.message : 'Data dana belum tersedia.'; return null; });
      if (current !== generation) return;
      ws = next; lpj = money; error = '';
    } catch (e) {
      if (current === generation) error = e instanceof Error ? e.message : 'Capaian belum dapat dimuat.';
    } finally { if (current === generation) loading = false; }
  }
  $effect(() => { const id = app.session?.campusId; if (id) void load(id, true); else loading = false; });
  $effect(() => { const id = app.session?.campusId; if (id) return onChange(() => void load(id), { campus: id }); });
  function changePeriod(value: string) { period = value; const id = app.session?.campusId; if (id) { loading = true; void load(id); } }

  const now = currentMonth();
  const model = $derived(ws ? capaian(ws, now) : null);
  const factor = $derived(ws?.formula.biogasFactor ?? 6);
  /** Something was sent to PF; drafts alone keep the "not sent yet" card instead of zero totals. */
  const submitted = $derived(Boolean(model && (model.counted.length || model.window.some(m => m.status === 'revisi'))));
  const num = (value: number, digits = 0) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
  /** Rupiah from sen, shortened to "Rp23,9 jt" from one million up. */
  const rupiah = (sen: number) => sen >= 100_000_000 ? `Rp${num(sen / 100_000_000, 1)} jt` : formatSen(sen);
  const value = (m: CapaianMonth, key: Metric) => key === 'income' ? (m.incomeSen ?? 0) / 100 : key === 'power' ? (m.electricityKwh ?? 0) : (m.biogasM3 ?? 0);
  const first = $derived(model?.counted[0]?.month ?? '');

  const METRICS: { id: Metric; label: string; title: string }[] = [
    { id: 'income', label: 'Pendapatan', title: 'Bagaimana pendapatan program tiap bulan?' },
    { id: 'power', label: 'Listrik EBT', title: 'Berapa listrik EBT yang dihasilkan tiap bulan?' },
    { id: 'biogas', label: 'Biogas', title: 'Berapa biogas yang dihasilkan tiap bulan?' }
  ];
  const short = (v: number) => metric === 'income' ? (v >= 1_000_000 ? `${num(v / 1_000_000, 1)} jt` : num(v / 1000, 0) + ' rb') : num(v);
  const axis = (v: number) => metric === 'income' ? (v >= 1_000_000 ? `${num(v / 1_000_000, v % 1_000_000 ? 1 : 0)} jt` : `${num(v / 1000)} rb`) : metric === 'power' ? `${num(v)} kWh` : `${num(v)} m³`;
  const top = $derived(model ? niceMax(Math.max(0, ...model.window.filter(m => m.counted).map(m => value(m, metric)))) : 1);
  /** Why a month has no bar: shown under the axis instead of an empty column. */
  function gap(m: CapaianMonth) {
    if (m.status === 'revisi') return { text: 'Revisi', tone: 'text-amber-700' };
    if (m.status === 'draf') return { text: 'Draf', tone: 'text-slate-600' };
    if (m.month === now) return { text: 'Bulan ini', tone: 'text-slate-500' };
    if (first && m.month > first) return { text: 'Kosong', tone: 'text-slate-500' };
    return { text: '', tone: '' };
  }
  const insight = $derived.by(() => {
    if (!model) return '';
    const months = model.counted;
    if (!months.length) return '';
    const last = months[months.length - 1], prev = months[months.length - 2];
    const v = value(last, metric), name = monthName(last.month);
    const shown = metric === 'income' ? formatSen(last.incomeSen ?? 0) : metric === 'power' ? `${num(v)} kWh` : `${num(v)} m³`;
    let change = '';
    if (prev && value(prev, metric) > 0) {
      const pct = (v - value(prev, metric)) / value(prev, metric) * 100;
      change = pct === 0 ? ', sama dengan bulan sebelumnya' : `, ${pct > 0 ? 'naik' : 'turun'} ${num(Math.abs(pct), 1)}% dari ${monthName(prev.month)}`;
    }
    const extra = metric === 'biogas' ? `, setara sekitar ${num(v * factor)} kWh listrik` : '';
    const few = months.length < 3 ? ' Tren lebih jelas setelah 3 bulan terlapor.' : '';
    return `${METRICS.find(m => m.id === metric)!.label} ${name} ${shown}${change}${extra}.${few}`;
  });
  const calendarLook: Record<string, { label: string; cls: string }> = {
    sesuai: { label: 'Sesuai', cls: 'bg-green-100 text-green-900' },
    menunggu: { label: 'Menunggu PF', cls: 'bg-blue-100 text-blue-900' },
    revisi: { label: 'Perlu revisi', cls: 'bg-orange-100 text-orange-900' },
    draf: { label: 'Belum dikirim', cls: 'bg-slate-100 text-slate-700' }
  };
  /** Opens Monitoring Bulanan on the given month; the breadcrumb keeps Capaian Program as the way back. */
  const monitoringHref = (month = '') => `/campus/profile?from=capaian${month ? `&bulan=${month}` : ''}#monitoring`;
  /** Months the campus can still act on open that month in Monitoring Bulanan. */
  const actionable = (m: CapaianMonth, label: string) => m.status === 'revisi' || m.status === 'draf' || label === 'Bulan ini' || label === 'Belum diisi';
  function calendar(m: CapaianMonth) {
    if (calendarLook[m.status]) return calendarLook[m.status];
    if (m.month === now) return { label: 'Bulan ini', cls: 'border border-dashed border-slate-300 bg-white text-slate-600' };
    if (first && m.month > first) return { label: 'Belum diisi', cls: 'bg-slate-100 text-slate-700' };
    return { label: 'Belum mulai', cls: 'border border-dashed border-slate-200 bg-white text-slate-500' };
  }
  const alertText = $derived.by(() => {
    if (!model) return '';
    const parts = [];
    if (model.revision.length) parts.push(`${model.revision.map(m => monthName(m.month)).join(', ')} perlu revisi`);
    if (model.missing.length) parts.push(`${model.missing.map(m => monthName(m.month)).join(', ')} belum diisi`);
    return parts.length ? `${parts.join('. ')}. Bulan tersebut belum dihitung di dashboard.` : '';
  });

  const powerPct = $derived(model && model.totals.equivalentKwh > 0 ? model.totals.electricityKwh / model.totals.equivalentKwh * 100 : 0);
  /** Cumulative income across the 12 month window; months without a counted kiriman keep the line flat. */
  const line = $derived.by(() => {
    if (!model) return { points: '', area: '', end: [10, 150], total: 0 };
    const counted = model.window.filter(m => m.counted);
    const total = counted.reduce((sum, m) => sum + (m.incomeSen ?? 0), 0);
    const start = model.window.findIndex(m => m.counted);
    if (start < 0 || total <= 0) return { points: '', area: '', end: [10, 150], total: 0 };
    let run = 0;
    const pts = model.window.slice(start).map((m, i) => { run += m.counted ? m.incomeSen ?? 0 : 0; return [10 + (start + i) * (380 / 11), Math.round(150 - run / total * 128)]; });
    const text = pts.map(p => `${p[0].toFixed(1)},${p[1]}`).join(' ');
    const end = pts[pts.length - 1];
    return { points: text, area: `${text} ${end[0].toFixed(1)},150 ${pts[0][0].toFixed(1)},150`, end, total };
  });

  const categories = $derived(lpj ? rabRealisasi(lpj) : []);
  const widest = $derived(Math.max(1, ...categories.map(c => Math.max(c.planSen, c.realSen))));
  const spentPct = $derived(lpj && lpj.receivedSen > 0 ? lpj.reportedSen / lpj.receivedSen : 0);
  const gaugePath = $derived.by(() => {
    const angle = Math.PI * (1 - Math.min(1, spentPct));
    return `M20 110 A90 90 0 0 1 ${(110 + 90 * Math.cos(angle)).toFixed(1)} ${(110 - 90 * Math.sin(angle)).toFixed(1)}`;
  });
  const fileUrl = (id: string) => `/api/monitoring/${app.session?.campusId}/files/${id}`;
  const photos = $derived(ws ? ([['solar', 'Panel PLTS'], ['reactor', 'Reaktor biogas']] as const).map(([key, label]) => ({ key, label, id: ws!.program.evidence[key]?.fileId || '', reason: ws!.program.evidence[key]?.reason || '' })) : []);
  const card = 'rounded-2xl border border-slate-200 bg-white p-4 sm:p-5';
</script>

<svelte:head><title>Capaian Program · Desa Energi Berdikari</title></svelte:head>

{#snippet empty(title: string, text: string, href: string, action: string)}
  <div class="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center">
    <strong class="text-[15px] text-slate-700">{title}</strong>
    <p class="max-w-sm text-sm text-slate-600">{text}</p>
    {#if href}<a {href} class="text-sm font-semibold text-[#0066B2] hover:underline">{action}</a>{/if}
  </div>
{/snippet}

<div class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-5 [&>*]:min-w-0">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div class="min-w-0">
      <p class="text-xs font-bold uppercase tracking-widest text-[#0066B2]">Capaian Program DEB</p>
      <h1 class="mt-1 text-2xl font-bold text-slate-900">{ws?.campusName || app.navigation.campus?.name || 'Capaian Program'}</h1>
      <p class="mt-1 text-sm text-slate-600">Dari Monitoring bulanan dan LPJ Tahap 1. Bulan yang perlu revisi tidak dihitung.</p>
    </div>
    <div class="flex flex-wrap items-end gap-2">
      {#if ws && ws.periods.length > 1}
        <label class="grid gap-1 text-xs font-semibold text-slate-600">Periode
          <select class="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900" value={period} onchange={e => changePeriod((e.currentTarget as HTMLSelectElement).value)}>
            {#each ws.periods as p}<option value={p.id}>{p.name}</option>{/each}
          </select>
        </label>
      {/if}
      <a href={monitoringHref()} class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#0066B2] px-4 text-sm font-semibold text-white hover:bg-[#015a9a]"><Icon name="plus" size={16} />Isi data bulan ini</a>
    </div>
  </header>

  {#if loading && !ws}
    <div class="grid gap-4" aria-busy="true" aria-label="Memuat capaian">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{#each [1, 2, 3, 4] as _}<div class="h-32 animate-pulse rounded-2xl bg-white/70"></div>{/each}</div>
      <div class="h-80 animate-pulse rounded-2xl bg-white/70"></div>
    </div>
  {:else if error}
    <div class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
      <p>{error}</p>
      <button type="button" class="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold" onclick={() => { const id = app.session?.campusId; if (id) { loading = true; void load(id, true); } }}>Coba lagi</button>
    </div>
  {:else if model && ws}
    {#if !submitted}
      <section class="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-400 bg-white px-6 py-12 text-center">
        <span class="grid size-14 place-items-center rounded-2xl bg-blue-50 text-[#0066B2]"><Icon name="chart" size={26} /></span>
        {#if model.hasData}
          <h2 class="text-lg font-bold text-slate-900">Data Monitoring masih draf</h2>
          <p class="max-w-lg text-sm text-slate-600">Kirim bulan yang sudah lengkap di Monitoring. Grafik dan angka capaian muncul setelah data dikirim ke PF.</p>
          <a href={monitoringHref()} class="inline-flex min-h-11 items-center rounded-lg bg-[#0066B2] px-5 text-sm font-semibold text-white hover:bg-[#015a9a]">Buka Monitoring</a>
        {:else}
          <h2 class="text-lg font-bold text-slate-900">Dashboard terisi setelah data bulan pertama dikirim</h2>
          <p class="max-w-lg text-sm text-slate-600">Isi pendapatan, listrik, dan biogas di Monitoring. Grafik dan angka capaian muncul otomatis.</p>
          <a href={monitoringHref()} class="inline-flex min-h-11 items-center rounded-lg bg-[#0066B2] px-5 text-sm font-semibold text-white hover:bg-[#015a9a]">Isi data Monitoring</a>
        {/if}
      </section>
    {:else}
      {#if alertText}
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950" role="status">
          <span class="flex items-center gap-2"><Icon name="alert" size={18} />{alertText}</span>
          <a href={monitoringHref(model.revision[0]?.month || model.missing[0]?.month)} class="font-semibold text-orange-900 hover:underline">{model.revision.length ? `Perbaiki ${monthName(model.revision[0].month)}` : 'Buka Monitoring'}</a>
        </div>
      {/if}

      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {#each [
          { label: 'Pendapatan', value: rupiah(model.totals.incomeSen), unit: '', hint: `Dari ${model.counted.length} bulan terlapor${model.pending ? ` · ${model.pending} menunggu PF` : ''}${model.totals.annualIncomeSen !== null ? ` · perkiraan setahun ${rupiah(model.totals.annualIncomeSen)}` : ''}`, icon: 'payments', tint: 'bg-blue-50 text-[#0066B2]', missing: '' },
          { label: 'Listrik EBT', value: num(model.totals.electricityKwh), unit: 'kWh', hint: model.annualElectricityKwh !== null ? `Perkiraan setahun ${num(model.annualElectricityKwh)} kWh` : '', icon: 'leaf', tint: 'bg-amber-50 text-amber-800', missing: '' },
          { label: 'Biogas', value: num(model.totals.biogasM3, model.totals.biogasM3 % 1 ? 1 : 0), unit: 'm³', hint: `Setara sekitar ${num(model.totals.gasEquivalentKwh)} kWh listrik (estimasi)`, icon: 'leaf', tint: 'bg-green-50 text-green-800', missing: '' },
          { label: 'Penerima manfaat', value: num(model.beneficiaries ?? 0), unit: 'orang', hint: 'Penerima unik di periode ini', icon: 'users', tint: 'bg-violet-50 text-violet-800', missing: model.beneficiaries === null ? 'Isi jumlah penerima manfaat' : '' }
        ] as kpi}
          <div class="{card} flex flex-col gap-2">
            <div class="flex items-center justify-between gap-2"><span class="text-xs font-bold uppercase tracking-wide text-slate-600">{kpi.label}</span><span class="grid size-9 place-items-center rounded-xl {kpi.tint}"><Icon name={kpi.icon} size={18} /></span></div>
            {#if kpi.missing}
              <span class="text-xl font-bold text-slate-500">Belum diisi</span>
              <a href={monitoringHref()} class="text-sm font-semibold text-[#0066B2] hover:underline">{kpi.missing}</a>
            {:else}
              <p class="flex flex-wrap items-baseline gap-1.5"><span class="text-[28px] font-bold tabular-nums text-slate-900">{kpi.value}</span>{#if kpi.unit}<span class="text-sm font-semibold text-slate-600">{kpi.unit}</span>{/if}</p>
              {#if kpi.hint}<p class="text-[13px] text-slate-600">{kpi.hint}</p>{/if}
            {/if}
          </div>
        {/each}
      </div>

      <div class="flex flex-wrap items-stretch gap-4">
        <section class="{card} flex min-w-0 flex-[999_1_560px] flex-col gap-4" aria-labelledby="tren">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div><h2 id="tren" class="text-[17px] font-bold text-slate-900">{METRICS.find(m => m.id === metric)!.title}</h2><p class="text-[13px] text-slate-600">12 bulan terakhir, dari kiriman Monitoring</p></div>
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Pilih data grafik">
              {#each METRICS as m}<button type="button" class="min-h-10 rounded-full border px-3.5 text-[13px] font-semibold {metric === m.id ? 'border-[#0066B2] bg-[#0066B2] text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}" aria-pressed={metric === m.id} onclick={() => (metric = m.id)}>{m.label}</button>{/each}
            </div>
          </div>
          <div class="flex gap-2">
            <div class="flex min-w-14 flex-col justify-between pb-7 text-right text-xs text-slate-500" aria-hidden="true"><span>{axis(top)}</span><span>{axis(top / 2)}</span><span>0</span></div>
            <div class="min-w-0 flex-1 overflow-x-auto">
              <ol class="grid min-w-[520px] grid-cols-12 gap-2" aria-label="Grafik batang per bulan">
                {#each model.window as m (m.month)}
                  {@const v = value(m, metric)}
                  <li class="flex flex-col gap-2" aria-label={m.counted ? `${monthName(m.month)}: ${short(v)}, ${m.status === 'sesuai' ? 'sesuai' : 'menunggu pemeriksaan PF'}` : `${monthName(m.month)}: ${gap(m).text || 'belum ada data'}`}>
                    <div class="flex h-[200px] flex-col justify-end border-b border-slate-300 bg-[repeating-linear-gradient(to_top,transparent_0,transparent_99px,#f1f5f9_99px,#f1f5f9_100px)]">
                      {#if m.counted}
                        <span class="pb-0.5 text-center text-[11px] font-semibold text-slate-700">{short(v)}</span>
                        <div class="rounded-t-md {m.status === 'sesuai' ? 'bg-[#0066B2]' : 'border border-b-0 border-[#0066B2] bg-[repeating-linear-gradient(45deg,#9cc8ee_0,#9cc8ee_3px,#dbeafe_3px,#dbeafe_6px)]'}" style:height="{top ? Math.max(v > 0 ? 2 : 0, v / top * 100) : 0}%"></div>
                      {:else if gap(m).text}
                        <span class="pb-1.5 text-center text-[11px] font-semibold {gap(m).tone}">{gap(m).text}</span>
                      {/if}
                    </div>
                    <span class="text-center text-xs text-slate-600">{m.label}</span>
                  </li>
                {/each}
              </ol>
            </div>
          </div>
          <div class="flex flex-wrap gap-4 text-[13px] text-slate-700">
            <span class="inline-flex items-center gap-1.5"><span class="size-3.5 rounded bg-[#0066B2]"></span>Sesuai, sudah diperiksa PF</span>
            <span class="inline-flex items-center gap-1.5"><span class="size-3.5 rounded border border-[#0066B2] bg-[repeating-linear-gradient(45deg,#9cc8ee_0,#9cc8ee_3px,#dbeafe_3px,#dbeafe_6px)]"></span>Menunggu pemeriksaan PF</span>
            <span><strong class="text-amber-700">Revisi</strong> dan <strong class="text-slate-500">Draf</strong> tidak dihitung</span>
          </div>
          {#if insight}<p class="rounded-lg bg-slate-50 px-3.5 py-3 text-sm text-slate-700">{insight}</p>{/if}
        </section>

        <section class="{card} flex min-w-0 flex-[1_1_300px] flex-col gap-3.5" aria-labelledby="kiriman">
          <div><h2 id="kiriman" class="text-[17px] font-bold text-slate-900">Kiriman Monitoring</h2><p class="text-[13px] text-slate-600">Status tiap bulan, 12 bulan terakhir</p></div>
          <ul class="grid grid-cols-3 gap-2">
            {#each model.window as m (m.month)}
              {@const look = calendar(m)}
              <li>
                {#if actionable(m, look.label)}
                  <a href={monitoringHref(m.month)} aria-label={`${monthName(m.month)}: ${look.label}. Buka di Monitoring Bulanan`} class="flex h-full flex-col gap-0.5 rounded-lg p-2.5 hover:ring-2 hover:ring-[#0066B2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 {look.cls}"><span class="text-[13px] font-bold">{m.label}</span><span class="text-[11px] font-semibold">{look.label}</span>{#if m.status === 'revisi'}<span class="mt-0.5 flex items-center gap-0.5 text-[11px] font-bold underline">Perbaiki<Icon name="arrow" size={12} /></span>{/if}</a>
                {:else}
                  <div class="flex h-full flex-col gap-0.5 rounded-lg p-2.5 {look.cls}"><span class="text-[13px] font-bold">{m.label}</span><span class="text-[11px] font-semibold">{look.label}</span></div>
                {/if}
              </li>
            {/each}
          </ul>
          <div class="grid gap-1.5 pt-1">
            <div class="flex justify-between text-[13px] text-slate-700"><span>Bulan terlapor</span><strong>{model.counted.length} bulan</strong></div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-green-700" style:width="{Math.min(100, model.window.filter(m => m.counted).length / 12 * 100)}%"></div></div>
          </div>
        </section>
      </div>
    {/if}

    <div class="flex items-center gap-2.5 pt-2"><span class="h-6 w-1 rounded-full bg-[#0066B2]"></span><h2 class="text-[19px] font-bold text-slate-900">Grafik capaian lainnya</h2><span class="text-[13px] text-slate-600">Dari Monitoring, RAB, dan LPJ</span></div>
    <div class="grid gap-4 md:grid-cols-2">
      <section class="{card} flex flex-col gap-3.5" aria-labelledby="g-energi">
        <div><h3 id="g-energi" class="font-bold text-slate-900">Dari mana energi program berasal?</h3><p class="text-[13px] text-slate-600">Listrik EBT dibanding biogas setara listrik</p></div>
        {#if model.totals.equivalentKwh > 0}
          <div class="flex flex-wrap items-center gap-6">
            <div class="grid size-[170px] place-items-center rounded-full" style:background="conic-gradient(#0066B2 0 {powerPct}%, #15803d {powerPct}% 100%)" role="img" aria-label={`Listrik EBT ${num(powerPct)} persen, biogas ${num(100 - powerPct)} persen`}>
              <div class="flex size-[108px] flex-col items-center justify-center rounded-full bg-white"><strong class="text-lg text-slate-900">{num(model.totals.equivalentKwh)}</strong><span class="text-xs text-slate-600">kWh setara</span></div>
            </div>
            <div class="grid min-w-40 flex-1 gap-3 text-sm">
              <p class="flex justify-between gap-2"><span class="inline-flex items-center gap-2"><span class="size-3 rounded-sm bg-[#0066B2]"></span>Listrik EBT</span><strong>{num(powerPct)}%</strong></p>
              <p class="flex justify-between gap-2"><span class="inline-flex items-center gap-2"><span class="size-3 rounded-sm bg-green-700"></span>Biogas (estimasi)</span><strong>{num(100 - powerPct)}%</strong></p>
              <p class="text-xs text-slate-500">Biogas dihitung {num(factor)} kWh per m³, faktor estimasi yang ditetapkan PF.</p>
            </div>
          </div>
        {:else}
          {@render empty('Belum ada data energi', 'Isi listrik EBT dan volume biogas bulanan. Isi 0 bila program tidak memakai salah satunya.', monitoringHref(), 'Isi data energi')}
        {/if}
      </section>

      <section class="{card} flex flex-col gap-3.5" aria-labelledby="g-kumulatif">
        <div><h3 id="g-kumulatif" class="font-bold text-slate-900">Berapa total pendapatan sejauh ini?</h3><p class="text-[13px] text-slate-600">Pendapatan kumulatif, 12 bulan terakhir</p></div>
        {#if line.total > 0}
          <svg viewBox="0 0 400 180" class="h-auto w-full" role="img" aria-label={`Pendapatan kumulatif ${rupiah(line.total)}`}>
            <defs><linearGradient id="capaian-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0066B2" stop-opacity="0.25"></stop><stop offset="1" stop-color="#0066B2" stop-opacity="0"></stop></linearGradient></defs>
            <line x1="0" y1="150" x2="400" y2="150" stroke="#cbd5e1"></line><line x1="0" y1="100" x2="400" y2="100" stroke="#f1f5f9"></line><line x1="0" y1="50" x2="400" y2="50" stroke="#f1f5f9"></line>
            <polygon points={line.area} fill="url(#capaian-area)"></polygon>
            <polyline points={line.points} fill="none" stroke="#0066B2" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"></polyline>
            <circle cx={line.end[0]} cy={line.end[1]} r="5" fill="#0066B2"></circle>
            <text x={line.end[0] - 6} y={line.end[1] - 9} text-anchor="end" font-size="12" font-weight="700" fill="#0f172a">{rupiah(line.total)}</text>
            <text x="10" y="170" font-size="11" fill="#475569">{model.window[0].label}</text>
            <text x="200" y="170" font-size="11" fill="#475569" text-anchor="middle">{model.window[6].label}</text>
            <text x="390" y="170" font-size="11" fill="#475569" text-anchor="end">{model.window[11].label}</text>
          </svg>
          <p class="text-[13px] text-slate-700">Garis datar berarti bulan itu tidak dihitung: belum diisi, draf, atau perlu revisi.</p>
        {:else}
          {@render empty('Belum ada pendapatan terlapor', 'Garis muncul setelah pendapatan bulan pertama dikirim.', monitoringHref(), 'Isi pendapatan')}
        {/if}
      </section>

      <section class="{card} flex flex-col gap-3.5" aria-labelledby="g-dana">
        <div><h3 id="g-dana" class="font-bold text-slate-900">Berapa dana Tahap 1 yang sudah dibelanjakan?</h3><p class="text-[13px] text-slate-600">Transaksi LPJ dibanding dana Tahap 1 yang cair</p></div>
        {#if !lpj}
          {@render empty('Data dana belum tersedia', lpjError === 'Kampus ini tidak termasuk penerima gelombang pertama.' ? 'Belum ada penetapan pencairan untuk kampus Anda.' : 'Data pencairan belum dapat dimuat. Coba buka lagi nanti.', '', '')}
        {:else if !lpj.paid}
          {@render empty('Dana Tahap 1 belum cair', 'Gauge terisi setelah dana Tahap 1 dibayar dan belanja dicatat di LPJ.', '/campus/pencairan', 'Lihat pencairan')}
        {:else if lpj.reportedSen <= 0}
          {@render empty('Belum ada transaksi LPJ', 'Gauge terisi setelah belanja pertama dicatat di LPJ.', '/campus/pelaporan#lpj', 'Catat transaksi LPJ')}
        {:else}
          <div class="flex flex-col items-center gap-1">
            <svg viewBox="0 0 220 124" class="h-auto w-full max-w-[260px]" role="img" aria-label={`Dana terealisasi ${num(spentPct * 100)} persen`}>
              <path d="M20 110 A90 90 0 0 1 200 110" fill="none" stroke="#e2e8f0" stroke-width="18" stroke-linecap="round"></path>
              <path d={gaugePath} fill="none" stroke="#0066B2" stroke-width="18" stroke-linecap="round"></path>
              <text x="110" y="96" text-anchor="middle" font-size="26" font-weight="700" fill="#0f172a">{num(spentPct * 100)}%</text>
              <text x="110" y="116" text-anchor="middle" font-size="12" fill="#475569">terealisasi</text>
            </svg>
            <div class="grid w-full grid-cols-2 gap-2.5">
              <p class="grid gap-0.5 rounded-lg bg-slate-50 p-2.5"><span class="text-xs text-slate-600">Sudah dibelanjakan</span><strong class="text-[15px] text-slate-900">{formatSen(lpj.reportedSen)}</strong></p>
              <p class="grid gap-0.5 rounded-lg bg-slate-50 p-2.5"><span class="text-xs text-slate-600">Dana Tahap 1</span><strong class="text-[15px] text-slate-900">{formatSen(lpj.receivedSen)}</strong></p>
            </div>
          </div>
        {/if}
      </section>

      <section class="{card} flex flex-col gap-3.5" aria-labelledby="g-rab">
        <div><h3 id="g-rab" class="font-bold text-slate-900">Apakah belanja sesuai rencana RAB?</h3><p class="text-[13px] text-slate-600">Rencana RAB 70% dan realisasi LPJ per kelompok</p></div>
        {#if !lpj}
          {@render empty('Data RAB belum tersedia', 'Data pencairan belum dapat dimuat.', '', '')}
        {:else if !lpj.hasApprovedRab || !categories.length}
          {@render empty('RAB belum disetujui', 'Rencana per kelompok tampil setelah RAB disetujui PF.', '/campus/pencairan', 'Lihat pencairan')}
        {:else}
          {#if lpj.reportedSen <= 0}<p class="rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600">Belum ada transaksi LPJ. Rencana RAB tetap tampil; batang realisasi terisi setelah belanja dicatat.</p>{/if}
          <ul class="grid gap-3.5">
            {#each categories as c (c.code + c.title)}
              <li class="grid gap-1.5">
                <p class="flex flex-wrap justify-between gap-2 text-[13px]"><span class="font-semibold text-slate-900">{c.title}</span><span class="text-slate-600">{c.planSen ? `${formatSen(c.realSen)} dari ${formatSen(c.planSen)}` : formatSen(c.realSen)}</span></p>
                <div class="h-2 rounded-full bg-blue-100" aria-hidden="true"><div class="h-full rounded-full bg-blue-300" style:width="{c.planSen / widest * 100}%"></div></div>
                <div class="h-2 rounded-full bg-slate-100" aria-hidden="true"><div class="h-full rounded-full bg-[#0066B2]" style:width="{c.realSen / widest * 100}%"></div></div>
              </li>
            {/each}
          </ul>
          <div class="flex flex-wrap gap-4 text-[13px] text-slate-700"><span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-full bg-blue-300"></span>Rencana RAB 70%</span><span class="inline-flex items-center gap-1.5"><span class="h-2 w-3.5 rounded-full bg-[#0066B2]"></span>Realisasi LPJ</span></div>
        {/if}
      </section>
    </div>

    {#if submitted}
      <div class="grid gap-4 md:grid-cols-2">
        <section class="{card} flex flex-col gap-3.5" aria-labelledby="kapasitas">
          <h2 id="kapasitas" class="text-[17px] font-bold text-slate-900">Kapasitas terpasang</h2>
          <div class="grid grid-cols-3 gap-2.5">
            {#each [['PLTS', ws.program.solarKwp, 'kWp'], ['EBT lainnya', ws.program.otherKw, 'kW'], ['Digester', ws.program.digesterM3, 'm³']] as [label, amount, unit]}
              <p class="grid gap-1 rounded-lg bg-slate-50 p-3"><span class="text-xs text-slate-600">{label}</span>{#if amount === null}<span class="text-sm font-semibold text-slate-500">Belum diisi</span>{:else}<strong class="text-lg text-slate-900">{num(Number(amount), 1)} {unit}</strong>{/if}</p>
            {/each}
          </div>
        </section>
        <section class="{card} flex flex-col gap-3.5" aria-labelledby="perkapita">
          <h2 id="perkapita" class="text-[17px] font-bold text-slate-900">Per penerima manfaat</h2>
          {#if model.beneficiaries}
            <div class="grid grid-cols-2 gap-2.5">
              <p class="grid gap-1 rounded-lg bg-slate-50 p-3"><span class="text-xs text-slate-600">Pendapatan setahun</span><strong class="text-lg text-slate-900">{model.totals.perCapitaSen !== null ? formatSen(Math.round(model.totals.perCapitaSen / 100) * 100) : 'Belum ada'}</strong></p>
              <p class="grid gap-1 rounded-lg bg-slate-50 p-3"><span class="text-xs text-slate-600">Energi setahun</span><strong class="text-lg text-slate-900">{model.annualEquivalentKwh !== null ? `${num(model.annualEquivalentKwh / model.beneficiaries, 1)} kWh` : 'Belum ada'}</strong></p>
            </div>
            <p class="text-xs text-slate-500">Perkiraan setahun = rata rata bulan terlapor × 12, dibagi {num(model.beneficiaries)} penerima manfaat.</p>
          {:else}
            {@render empty('Belum bisa dihitung', 'Isi jumlah penerima manfaat di Monitoring untuk melihat nilai per orang.', monitoringHref(), 'Isi penerima manfaat')}
          {/if}
        </section>
      </div>

      <section class="{card} flex flex-col gap-4" aria-labelledby="dampak">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="dampak" class="text-[17px] font-bold text-slate-900">Cerita dan bukti dampak</h2><p class="text-[13px] text-slate-600">Local Hero dan foto bukti dari Monitoring</p></div>
          <div class="grid min-w-56 gap-1.5">
            <div class="flex justify-between text-[13px] text-slate-700"><span>Kelengkapan bukti</span><strong>{model.evidenceReady} dari {model.evidenceTotal}</strong></div>
            <div class="h-2 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-[#0066B2]" style:width="{model.evidenceReady / model.evidenceTotal * 100}%"></div></div>
          </div>
        </div>
        <ul class="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {#each ws.heroes.filter(h => h.name) as hero (hero.id)}
            <li class="overflow-hidden rounded-xl border border-slate-200">
              {#if hero.photo}<img src={fileUrl(hero.photo)} alt={`Foto ${hero.name}`} class="h-40 w-full object-cover" loading="lazy" />{:else}<div class="grid h-40 place-items-center bg-violet-50 text-violet-800"><Icon name="user" size={32} /></div>{/if}
              <div class="grid gap-1.5 p-3.5"><span class="text-[11px] font-bold uppercase tracking-wide text-violet-800">Local Hero</span><strong class="text-[15px] text-slate-900">{hero.name}</strong>{#if hero.story}<p class="line-clamp-4 text-[13px] text-slate-600">{hero.story}</p>{/if}</div>
            </li>
          {/each}
          {#each photos as photo (photo.key)}
            {#if photo.id}
              <li class="overflow-hidden rounded-xl border border-slate-200">
                <img src={fileUrl(photo.id)} alt={photo.label} class="h-40 w-full object-cover" loading="lazy" />
                <div class="grid gap-1.5 p-3.5"><span class="text-[11px] font-bold uppercase tracking-wide text-[#0066B2]">Bukti energi</span><strong class="text-[15px] text-slate-900">{photo.label}</strong></div>
              </li>
            {/if}
          {/each}
          {#if !ws.heroes.some(h => h.name)}
            <li><a href={monitoringHref()} class="flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-400 p-5 text-center text-slate-700 hover:border-[#0066B2]"><Icon name="plus" size={26} /><strong class="text-[15px]">Tambahkan cerita Local Hero</strong><span class="text-[13px] text-slate-600">Cerita dan foto Local Hero tampil di sini.</span></a></li>
          {/if}
          {#each photos.filter(p => !p.id) as photo (photo.key)}
            <li><a href={monitoringHref()} class="flex min-h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-400 p-5 text-center text-slate-700 hover:border-[#0066B2]"><Icon name="plus" size={26} /><strong class="text-[15px]">Tambahkan foto {photo.label.toLowerCase()}</strong><span class="text-[13px] text-slate-600">{photo.reason ? `Belum tersedia: ${photo.reason}` : 'Atau tulis alasan bila belum tersedia.'}</span></a></li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</div>
