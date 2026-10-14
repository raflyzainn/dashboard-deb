<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { KINDS, KIND_SHORT, ITEM_STATE_LABEL, CAMPUS_STATES, CAMPUS_STATE_LABEL, type ItemState, type CampusState } from '$lib/pencairan';
  import type { DirectoryRow } from './kartu-types';

  /**
   * The progress of Pencairan Tahap 1 as two Apache ECharts graphics: a ring of campuses by state, and one stacked bar per item
   * counting campuses in each item state. Both follow the rows the dashboard currently shows, so the filters shape the charts too.
   * ECharts is loaded in the browser only, on first use.
   */
  let { rows }: { rows: DirectoryRow[] } = $props();

  const ITEM_STATES: ItemState[] = ['sesuai', 'tidak_perlu', 'perlu_konfirmasi', 'menunggu_review', 'perlu_revisi', 'belum_ada'];
  const ITEM_COLOR: Record<ItemState, string> = { sesuai: '#16a34a', tidak_perlu: '#bbf7d0', perlu_konfirmasi: '#0066B2', menunggu_review: '#38bdf8', perlu_revisi: '#f59e0b', belum_ada: '#e2e8f0' };
  const CAMPUS_COLOR: Record<CampusState, string> = { belum_ada: '#cbd5e1', menunggu_kampus: '#f59e0b', menunggu_admin: '#0066B2', lengkap: '#16a34a', siap_dibayar: '#15803d', dibayar: '#0b4169' };
  const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  let ringEl = $state<HTMLDivElement | null>(null);
  let barEl = $state<HTMLDivElement | null>(null);
  let ready = $state(false);
  let failed = $state('');
  type Echarts = typeof import('echarts/core');
  let echarts: Echarts | null = null;
  let ring: ReturnType<Echarts['init']> | null = null;
  let bars: ReturnType<Echarts['init']> | null = null;

  /** Counts that feed both charts. */
  const summary = $derived.by(() => {
    const byCampusState = Object.fromEntries(CAMPUS_STATES.map(s => [s, 0])) as Record<CampusState, number>;
    const byItem = KINDS.map(k => Object.fromEntries(ITEM_STATES.map(s => [s, 0])) as Record<ItemState, number>);
    let done = 0;
    for (const r of rows) {
      byCampusState[r.assessment.state]++;
      done += r.assessment.done;
      KINDS.forEach((k, i) => { byItem[i][r.assessment.items[k]]++; });
    }
    const slots = rows.length * KINDS.length;
    return { byCampusState, byItem, done, slots, percent: slots ? Math.round((done / slots) * 100) : 0 };
  });

  $effect(() => {
    if (!ringEl || !barEl) return;
    let alive = true;
    let observer: ResizeObserver | null = null;
    (async () => {
      try {
        const [core, charts, components, renderers] = await Promise.all([import('echarts/core'), import('echarts/charts'), import('echarts/components'), import('echarts/renderers')]);
        core.use([charts.PieChart, charts.BarChart, components.GridComponent, components.TooltipComponent, components.LegendComponent, components.GraphicComponent, components.AriaComponent, renderers.CanvasRenderer]);
        if (!alive || !ringEl || !barEl) return;
        echarts = core;
        ring = core.init(ringEl, undefined, { renderer: 'canvas' });
        bars = core.init(barEl, undefined, { renderer: 'canvas' });
        observer = new ResizeObserver(() => { ring?.resize(); bars?.resize(); });
        observer.observe(ringEl); observer.observe(barEl);
        ready = true;
      } catch (e) { if (alive) failed = reportError('Grafik belum dapat dimuat. Data tetap dapat dilihat pada tabel. Coba muat ulang halaman.'); }
    })();
    return () => { alive = false; observer?.disconnect(); ring?.dispose(); bars?.dispose(); ring = null; bars = null; ready = false; };
  });

  $effect(() => {
    const s = summary;
    if (!ready || !ring || !bars) return;
    const textStyle = { fontFamily: FONT, color: '#334155', fontSize: 12 };
    ring.setOption({
      aria: { enabled: true },
      textStyle,
      tooltip: { trigger: 'item', formatter: (p: { name: string; value: number }) => `${p.name}: ${p.value} kampus` },
      legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#475569' } },
      series: [{
        type: 'pie', radius: ['54%', '74%'], center: ['50%', '38%'], avoidLabelOverlap: true, padAngle: 2, itemStyle: { borderRadius: 4 },
        label: { show: false }, emphasis: { scale: false },
        data: CAMPUS_STATES.map(state => ({ name: CAMPUS_STATE_LABEL[state], value: s.byCampusState[state], itemStyle: { color: CAMPUS_COLOR[state] } }))
      }],
      graphic: [
        { type: 'text', left: 'center', top: '30%', style: { text: `${s.percent}%`, fontSize: 26, fontWeight: 700, fill: '#0f172a', fontFamily: FONT } },
        { type: 'text', left: 'center', top: '44%', style: { text: `${s.done} dari ${s.slots} butir`, fontSize: 12, fill: '#475569', fontFamily: FONT } }
      ]
    }, true);
    bars.setOption({
      aria: { enabled: true },
      textStyle,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (items: { seriesName: string; value: number; axisValueLabel: string }[]) => `<b>${items[0]?.axisValueLabel}</b><br/>` + items.filter(i => i.value).map(i => `${i.seriesName}: ${i.value}`).join('<br/>') },
      legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 12, color: '#475569' } },
      grid: { left: 8, right: 16, top: 40, bottom: 8, containLabel: true },
      xAxis: { type: 'value', max: rows.length || 1, minInterval: 1, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#e2e8f0' } } },
      yAxis: { type: 'category', inverse: true, data: KINDS.map(k => KIND_SHORT[k]), axisLabel: { color: '#0f172a', fontWeight: 600 }, axisTick: { show: false }, axisLine: { show: false } },
      series: ITEM_STATES.map(state => ({
        name: ITEM_STATE_LABEL[state], type: 'bar', stack: 'butir', barMaxWidth: 18, itemStyle: { color: ITEM_COLOR[state], borderColor: state === 'belum_ada' || state === 'tidak_perlu' ? '#cbd5e1' : undefined, borderWidth: state === 'belum_ada' || state === 'tidak_perlu' ? 0.5 : 0 },
        emphasis: { focus: 'series' }, data: s.byItem.map(counts => counts[state])
      }))
    }, true);
  });
</script>

<section class="grid gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_#0b254508] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]" aria-label="Grafik kemajuan Tahap 1">
  <div class="min-w-0">
    <h2 class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Keadaan kampus</h2>
    <p class="text-[13px] text-slate-600">{rows.length} kampus yang ditampilkan.</p>
    <div bind:this={ringEl} class="h-[300px] w-full" role="img" aria-label={`Butir selesai ${summary.percent} persen, ${summary.done} dari ${summary.slots}`}></div>
  </div>
  <div class="min-w-0">
    <h2 class="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Butir per keadaan</h2>
    <p class="text-[13px] text-slate-600">Berapa kampus berada di tiap keadaan untuk setiap butir.</p>
    <div bind:this={barEl} class="h-[340px] w-full" role="img" aria-label="Jumlah kampus per keadaan untuk setiap butir"></div>
  </div>
  {#if failed}<p class="text-[13px] text-red-800 md:col-span-2" role="alert">{failed}</p>{/if}
</section>
