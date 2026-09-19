<script lang="ts">
  import { dataService } from '$lib/data/service';
  import { formatSen } from '$lib/pencairan';
  import { formatVolume, MAX_LEVEL, RAB_STATUS_TONE, type RabOverview, type RabStatus } from '$lib/rab';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  /**
   * The RAB Tahap 1 as the document of the RAB item: the lines of the latest managed version that carry a Tahap 1 allocation,
   * read only, the way the decision route sees it. The full RAB stays in the editor behind "Ubah baris".
   * Sits inside the document area of the item panel; the table scrolls sideways inside its own box.
   * `refresh` reloads the table when the parent has changed the version (a decision, an import).
   */
  let { campusId, compact = false, refresh = 0 }: { campusId: string; compact?: boolean; refresh?: number } = $props();
  let data = $state<RabOverview | null>(null);
  let error = $state('');

  const STATUS_SHORT: Record<RabStatus, string> = { draf: 'Draf', menunggu: 'Menunggu', disetujui: 'Disetujui' };
  const version = $derived(data?.version || null);
  /** Parents store the rolled up Tahap 1 sum, so one filter keeps every allocated item and every group that holds one. */
  const lines = $derived((version?.lines || []).filter(l => l.term1Sen > 0));
  const allItems = $derived((version?.lines || []).filter(l => l.level === MAX_LEVEL).length);
  const items = $derived(lines.filter(l => l.level === MAX_LEVEL).length);
  const term1Sen = $derived(lines.filter(l => l.level === 1).reduce((sum, l) => sum + l.term1Sen, 0));
  const standing = $derived<'kosong' | 'lebih' | 'sesuai'>(!data || !term1Sen ? 'kosong' : term1Sen > data.summary.limitSen ? 'lebih' : 'sesuai');
  const editorUrl = $derived(`/admin/pencairan/${campusId}/rab`);

  async function load() {
    error = '';
    try { data = await dataService.api.get<RabOverview>(`/api/pencairan/${campusId}/rab`); }
    catch (e) { error = e instanceof Error ? e.message : 'RAB belum dapat dimuat.'; }
  }
  $effect(() => { void campusId; void refresh; void load(); });

  const money = (sen: number) => (sen ? formatSen(sen, false) : '');
  const pillClass: Record<typeof standing, string> = { kosong: 'bg-amber-100 text-amber-900', lebih: 'bg-red-100 text-red-800', sesuai: 'bg-green-100 text-green-800' };
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
    <span>Belum ada RAB terkelola. Impor dari Excel di halaman RAB.</span>
    <a href={editorUrl} class={link}><Icon name="external" size={13} />Buka halaman RAB</a>
  </div>
{:else}
  <div class="grid min-w-0 gap-2" data-rab-table>
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
      <span class="font-semibold text-slate-900">RAB Tahap 1 · versi {version.number}</span>
      <Badge tone={RAB_STATUS_TONE[version.status]}>{STATUS_SHORT[version.status]}</Badge>
      <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums {pillClass[standing]}">RAB 70% {formatSen(term1Sen)} dari batas {formatSen(data.summary.limitSen)}</span>
      <span class="text-xs text-slate-500">{items} dari {allItems} baris RAB</span>
      <a href={editorUrl} class="{link} ml-auto"><Icon name="edit" size={13} />Ubah baris</a>
    </div>
    <div class="min-w-0 overflow-x-auto rounded-lg border border-slate-200/70 bg-white">
      <table class="w-full min-w-[720px] border-collapse {compact ? 'text-[13px]' : 'text-sm'}">
        <thead class="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
          <tr>
            <th class="{cell} w-20">Kode</th><th class="{cell} min-w-[260px]">Uraian</th><th class="{cell} w-20 text-right">Volume</th><th class="{cell} w-20">Satuan</th>
            <th class="{cell} w-32 text-right">Harga satuan</th><th class="{cell} w-36 text-right">RAB Tahap 1</th>
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
              <td class="{cell} text-right tabular-nums">{money(line.term1Sen)}</td>
            </tr>
          {/each}
          {#if !lines.length}
            <tr><td colspan="6" class="px-4 py-6 text-center text-sm text-slate-500">Kolom RAB Tahap 1 masih kosong. Impor Excel dengan kolom RAB Tahap 1, atau ketik total dari berkas di bawah.</td></tr>
          {/if}
        </tbody>
        <tfoot class="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
          <tr>
            <td class={cell} colspan="5">Total Tahap 1 · {items} uraian</td>
            <td class="{cell} text-right tabular-nums {standing === 'lebih' ? 'text-red-800' : ''}">{formatSen(term1Sen, false)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
{/if}
