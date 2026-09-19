<script lang="ts">
  import { dataService } from '$lib/data/service';
  import { formatSen } from '$lib/pencairan';
  import { formatVolume, MAX_LEVEL, RAB_STATUS_TONE, SHARE_LABEL, shareSen, type RabOverview, type RabStatus, type RabShare } from '$lib/rab';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  /**
   * One page of the RAB item: RAB 100% (every line of the latest managed version), RAB 70% or RAB 30% (the lines that carry
   * a part there; parents hold rolled up sums). Read only, the way the decision route sees it. Editing happens behind "Ubah baris".
   * Sits inside the document area of the item panel; the table scrolls sideways inside its own box.
   * `refresh` reloads the table when the parent has changed the version (a decision, an import).
   */
  let { campusId, share = 'tahap1', compact = false, refresh = 0 }: { campusId: string; share?: RabShare; compact?: boolean; refresh?: number } = $props();
  let data = $state<RabOverview | null>(null);
  let error = $state('');

  const STATUS_SHORT: Record<RabStatus, string> = { draf: 'Draf', menunggu: 'Menunggu', disetujui: 'Disetujui' };
  const version = $derived(data?.version || null);
  const all = $derived(version?.lines || []);
  const lines = $derived(share === 'penuh' ? all : all.filter(l => shareSen(l, share) > 0));
  const allItems = $derived(all.filter(l => l.level === MAX_LEVEL).length);
  const items = $derived(lines.filter(l => l.level === MAX_LEVEL).length);
  const total = $derived(lines.filter(l => l.level === 1).reduce((sum, l) => sum + shareSen(l, share), 0));
  /** What this page is measured against: RAB 100% the SK, RAB 70% the limit, RAB 30% what the SK leaves after Tahap 1. */
  const target = $derived(!data ? 0 : share === 'penuh' ? data.summary.amountSen : share === 'tahap1' ? data.summary.limitSen : data.summary.amountSen - (data.version?.term1Sen || 0));
  const standing = $derived<'kosong' | 'lebih' | 'sesuai' | 'beda'>(!data || !total ? 'kosong' : share === 'tahap1' ? (total > target ? 'lebih' : 'sesuai') : total === target ? 'sesuai' : 'beda');
  const pillText = $derived(!data ? '' : share === 'penuh' ? `${SHARE_LABEL.penuh} ${formatSen(total)} · Nilai SK ${formatSen(target)}` : share === 'tahap1' ? `${SHARE_LABEL.tahap1} ${formatSen(total)} dari batas ${formatSen(target)}` : `${SHARE_LABEL.tahap2} ${formatSen(total)} · sisa Nilai SK ${formatSen(target)}`);
  const editorUrl = $derived(`/admin/pencairan/${campusId}/rab`);
  const empty: Record<RabShare, string> = {
    penuh: 'Belum ada baris RAB. Impor Excel tiga lembar dari templat.',
    tahap1: 'Lembar RAB 70% masih kosong. Impor Excel dengan lembar RAB 70%, atau ketik total dari berkas di bawah.',
    tahap2: 'Lembar RAB 30% masih kosong. Impor Excel dengan lembar RAB 30%.'
  };

  async function load() {
    error = '';
    try { data = await dataService.api.get<RabOverview>(`/api/pencairan/${campusId}/rab`); }
    catch (e) { error = e instanceof Error ? e.message : 'RAB belum dapat dimuat.'; }
  }
  $effect(() => { void campusId; void refresh; void load(); });

  const money = (sen: number) => (sen ? formatSen(sen, false) : '');
  const pillClass: Record<typeof standing, string> = { kosong: 'bg-amber-100 text-amber-900', lebih: 'bg-red-100 text-red-800', sesuai: 'bg-green-100 text-green-800', beda: 'bg-amber-100 text-amber-900' };
  const rowClass = ['', 'bg-slate-100 font-bold text-slate-900', 'bg-slate-50 font-semibold text-slate-900', 'font-medium text-slate-800', 'text-slate-800'];
  const cell = $derived(compact ? 'px-2 py-1' : 'px-2 py-1.5');
  const link = 'inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-[#0066B2] hover:underline';
</script>

{#if error}
  <p class="text-sm text-red-800" role="alert">{error}</p>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat RAB…</p>
{:else if !version}
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
    <span>Belum ada RAB terkelola. Impor Excel tiga lembar dari templat, atau buka halaman RAB.</span>
    <a href={editorUrl} class={link}><Icon name="external" size={13} />Buka halaman RAB</a>
  </div>
{:else}
  <div class="grid min-w-0 gap-2" data-rab-table>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <span class="font-semibold text-slate-900">{SHARE_LABEL[share]} · versi {version.number}</span>
      <Badge tone={RAB_STATUS_TONE[version.status]}>{STATUS_SHORT[version.status]}</Badge>
      <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums {pillClass[standing]}">{pillText}</span>
      <span class="text-xs text-slate-500">{items} dari {allItems} baris RAB</span>
      <a href={editorUrl} class="{link} ml-auto"><Icon name="edit" size={13} />Ubah baris</a>
    </div>
    <div class="min-w-0 overflow-x-auto rounded-lg border border-slate-200/70 bg-white">
      <table class="w-full min-w-[720px] border-collapse {compact ? 'text-[13px]' : 'text-sm'}">
        <thead class="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
          <tr>
            <th class="{cell} w-20">Kode</th><th class="{cell} min-w-[260px]">Uraian</th><th class="{cell} w-20 text-right">Volume</th><th class="{cell} w-20">Satuan</th>
            <th class="{cell} w-32 text-right">Harga satuan</th><th class="{cell} w-36 text-right">{SHARE_LABEL[share]}</th>
          </tr>
        </thead>
        <tbody>
          {#each lines as line (line.id)}
            {@const item = line.level === MAX_LEVEL}
            {@const note = typeof line.flags?.catatan === 'string' ? line.flags.catatan : ''}
            <tr class="border-t border-slate-100 align-top {rowClass[line.level] || ''}">
              <td class="{cell} whitespace-nowrap tabular-nums text-slate-600">{line.code}</td>
              <td class={cell} style="padding-left: {(line.level - 1) * 14 + 8}px">
                <span class={line.title ? '' : 'text-slate-400'}>{line.title || (line.level === 3 ? 'Tanpa sub kegiatan' : 'Tanpa nama')}</span>
                {#if item && line.calculation}<span class="block text-xs font-normal text-slate-500">{line.calculation}</span>{/if}
                {#if note}<span class="mt-0.5 flex items-start gap-1 text-xs font-normal text-amber-900"><Icon name="alert" size={12} /><span>{note}</span></span>{/if}
              </td>
              {#if item}
                <td class="{cell} text-right tabular-nums">{line.volume ? formatVolume(line.volume) : ''}</td>
                <td class={cell}>{line.unit}</td>
                <td class="{cell} text-right tabular-nums">{money(line.unitPriceSen)}</td>
              {:else}
                <td colspan="3" class={cell}></td>
              {/if}
              <td class="{cell} text-right tabular-nums">{money(shareSen(line, share))}</td>
            </tr>
          {/each}
          {#if !lines.length}
            <tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">{empty[share]}</td></tr>
          {/if}
        </tbody>
        <tfoot class="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
          <tr>
            <td class={cell} colspan="5">Total {SHARE_LABEL[share]} · {items} uraian</td>
            <td class="{cell} text-right tabular-nums {standing === 'lebih' ? 'text-red-800' : ''}">{formatSen(total, false)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
{/if}
