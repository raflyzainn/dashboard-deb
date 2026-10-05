<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { formatSen, parseSen, formatPercent, percentOf } from '$lib/pencairan';
  import { arrange, totalsOf, rabChecks, parseVolume, formatVolume, productSen, MAX_LEVEL, LEVEL_LABEL, RAB_STATUS_LABEL, RAB_STATUS_TONE, RAB_SOURCE_LABEL, type RabOverview, type RabLine, type LineInput, type RabCheck, type Arranged } from '$lib/rab';
  import Badge from '$lib/components/ui/Badge.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Empty from '$lib/components/ui/Empty.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';

  /**
   * Item 2 of the check card: the RAB 70% (Tahap 1). The column "RAB 70%" holds the part of every line requested in Tahap 1;
   * its total is checked against Batas Tahap 1 and, once approved, becomes the nominal of Tahap 1. The full RAB is only a comparison.
   */
  /** One editable line. Money and volume are kept as typed text and converted when saving. */
  interface Row { key: string; parentKey: string; title: string; calculation: string; volume: string; unit: string; unitPrice: string; amount: string; term1: string; term2: string; catatan: string }
  interface Preview { rows: number; kind: string; totalSen: number; term1Sen: number; term2Sen?: number; problems: { row: number; text: string }[]; problemCount: number; fileName: string }

  let { campusId }: { campusId: string } = $props();
  let data = $state<RabOverview | null>(null);
  let rows = $state<Row[]>([]);
  let dirty = $state(false);
  let error = $state('');
  let notice = $state('');
  let busy = $state(false);
  let refresh = $state(0);
  let preview = $state<Preview | null>(null);
  let importFile = $state<File | null>(null);
  let fileInput = $state<HTMLInputElement | null>(null);
  let seq = 0;

  const time = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
  const version = $derived(data?.version || null);
  const editable = $derived(version?.status === 'draf');
  const rowMap = $derived(new Map(rows.map(r => [r.key, r])));
  const soft = (r: Row): LineInput => ({ key: r.key, parentKey: r.parentKey, title: r.title, calculation: r.calculation, volume: parseVolume(r.volume) ?? 0, unit: r.unit, unitPriceSen: parseSen(r.unitPrice) ?? 0, amountSen: parseSen(r.amount) ?? 0, term1Sen: parseSen(r.term1) ?? 0, term2Sen: parseSen(r.term2) ?? 0, flags: r.catatan ? { catatan: r.catatan } : {} });
  const live = $derived.by((): Arranged[] => { try { return arrange(rows.map(soft)); } catch { return []; } });
  const totals = $derived(totalsOf(live));
  const checks = $derived<RabCheck[]>(data ? (editable && dirty ? rabChecks(live, data.summary.amountSen, data.summary.limitSen) : data.checks) : []);
  /** Where the running RAB 70% total stands against Batas Tahap 1: the one check that blocks. */
  const standing = $derived<'kosong' | 'lebih' | 'sesuai'>(!data || !totals.term1Sen ? 'kosong' : totals.term1Sen > data.summary.limitSen ? 'lebih' : 'sesuai');
  const term2Sen = $derived(data ? data.summary.amountSen - totals.term1Sen : 0);
  const items = $derived(live.filter(n => n.level === MAX_LEVEL).length);

  const money = (sen: number) => (sen ? formatSen(sen, false) : '');
  function toRows(lines: RabLine[]): Row[] {
    return lines.map(l => ({ key: l.id, parentKey: l.parentId, title: l.title, calculation: l.calculation, volume: l.level === MAX_LEVEL && l.volume ? formatVolume(l.volume) : '', unit: l.unit, unitPrice: money(l.unitPriceSen), amount: money(l.amountSen), term1: money(l.term1Sen), term2: money(l.term2Sen), catatan: typeof l.flags?.catatan === 'string' ? l.flags.catatan : '' }));
  }
  function toInputs(): LineInput[] {
    const codeOf = new Map(live.map(n => [n.key, n.code]));
    return rows.map(r => {
      const code = codeOf.get(r.key) || r.key;
      const sen = (text: string, label: string) => { const value = parseSen(text); if (text.trim() && value === null) throw new Error(`${label} pada baris ${code} harus berupa jumlah rupiah, misalnya 1.250.000.`); return value ?? 0; };
      const volume = parseVolume(r.volume);
      if (r.volume.trim() && volume === null) throw new Error(`Volume pada baris ${code} harus berupa angka, misalnya 30 atau 0,5.`);
      return { key: r.key, parentKey: r.parentKey, title: r.title.trim(), calculation: r.calculation.trim(), volume: volume ?? 0, unit: r.unit.trim(), unitPriceSen: sen(r.unitPrice, 'Harga satuan'), amountSen: sen(r.amount, 'Jumlah'), term1Sen: sen(r.term1, 'RAB 70%'), term2Sen: sen(r.term2, 'RAB 30%'), flags: r.catatan ? { catatan: r.catatan } : {} };
    });
  }
  function fail(e: unknown, fallback: string) { error = reportError(e instanceof Error ? e.message : fallback); }
  function apply(next: RabOverview, message = '') {
    data = next; notice = message; error = ''; refresh++;
    rows = next.version ? toRows(next.version.lines) : [];
    dirty = false;
  }
  async function load(versionId = '') {
    try { apply(await dataService.api.get<RabOverview>(`/api/pencairan/${campusId}/rab${versionId ? '?version=' + versionId : ''}`)); }
    catch (e) { fail(e, 'Halaman RAB belum dapat dimuat.'); }
  }
  $effect(() => { untrack(() => { void load(); }); });
  async function run(action: () => Promise<RabOverview>, message: string) {
    if (busy) return;
    busy = true; error = ''; notice = '';
    try { apply(await action(), message); }
    catch (e) { fail(e, 'Perubahan belum tersimpan.'); }
    finally { busy = false; }
  }
  const leave = () => !dirty || confirm('Perubahan belum disimpan. Lanjutkan tanpa menyimpan?');
  function selectVersion(id: string) { if (!id || id === version?.id || !leave()) return; void load(id); }

  /* Editing */
  function set(key: string, field: keyof Row, value: string) {
    const row = rowMap.get(key);
    if (!row) return;
    if (field === 'volume' || field === 'unitPrice') {
      const before = productSen(parseVolume(row.volume) ?? 0, parseSen(row.unitPrice) ?? 0);
      const amount = parseSen(row.amount);
      row[field] = value;
      const after = productSen(parseVolume(row.volume) ?? 0, parseSen(row.unitPrice) ?? 0);
      if (!row.amount.trim() || amount === before) row.amount = after ? formatSen(after, false) : '';
    } else row[field] = value;
    dirty = true;
  }
  function range(key: string) {
    const start = live.findIndex(n => n.key === key);
    if (start < 0) return null;
    let end = start + 1;
    while (end < live.length && live[end].level > live[start].level) end++;
    return { start, end };
  }
  const blank = (parentKey: string): Row => ({ key: `n${Date.now().toString(36)}${++seq}`, parentKey, title: '', calculation: '', volume: '', unit: '', unitPrice: '', amount: '', term1: '', term2: '', catatan: '' });
  function addChild(parentKey: string) {
    const r = range(parentKey);
    if (!r) return;
    rows.splice(r.end, 0, blank(parentKey));
    dirty = true;
  }
  function addRoot() { rows.push(blank('')); dirty = true; }
  function remove(key: string) {
    const r = range(key);
    if (!r) return;
    const count = r.end - r.start - 1;
    if (count && !confirm(`Hapus baris ${live[r.start].code} beserta ${count} baris di bawahnya?`)) return;
    rows.splice(r.start, r.end - r.start);
    dirty = true;
  }
  function clearNote(key: string) { const row = rowMap.get(key); if (row) { row.catatan = ''; dirty = true; } }

  /* Actions */
  const save = () => run(async () => {
    if (!version) throw new Error('Belum ada versi.');
    return dataService.api.patch<RabOverview>(`/api/pencairan/${campusId}/rab/versions/${version.id}`, { lines: toInputs() });
  }, 'RAB tersimpan.');
  const submit = () => run(async () => {
    if (!version) throw new Error('Belum ada versi.');
    if (dirty) throw new Error('Simpan dulu perubahan sebelum mengajukan.');
    return dataService.api.post<RabOverview>(`/api/pencairan/${campusId}/rab/versions/${version.id}/submit`);
  }, 'RAB diajukan untuk persetujuan.');
  const approve = () => run(async () => {
    if (!version) throw new Error('Belum ada versi.');
    return dataService.api.post<RabOverview>(`/api/pencairan/${campusId}/rab/versions/${version.id}/approve`);
  }, 'RAB 70% disetujui. Totalnya menjadi nominal Tahap 1.');
  const revoke = () => run(async () => {
    if (!version) throw new Error('Belum ada versi.');
    return dataService.api.post<RabOverview>(`/api/pencairan/${campusId}/rab/versions/${version.id}/revoke`);
  }, 'Versi dikembalikan ke draf.');
  const newVersion = (from: string) => { if (!leave()) return; void run(() => dataService.api.post<RabOverview>(`/api/pencairan/${campusId}/rab/versions`, from ? { from } : {}), from ? 'Versi baru dibuat dari salinan.' : 'Versi kosong dibuat.'); };
  async function download(url: string, name: string) {
    if (busy) return;
    busy = true; error = '';
    try {
      const blob = await dataService.api.blob(url);
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = href; a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10000);
    } catch (e) { fail(e, 'Berkas belum dapat diunduh.'); }
    finally { busy = false; }
  }
  /** The shown version in the same workbook layout as the template, built in the browser. */
  async function exportVersion() {
    if (!version || !data || busy) return;
    busy = true; error = '';
    try {
      const { downloadRabWorkbook, linesToRows } = await import('$lib/rab-excel');
      await downloadRabWorkbook(`RAB_${data.campus.code.replace(/\s+/g, '')}_v${version.number}.xlsx`, { university: data.campus.name.toUpperCase(), penuh: linesToRows(version.lines, 'penuh'), tahap1: linesToRows(version.lines, 'tahap1'), tahap2: linesToRows(version.lines, 'tahap2') });
    } catch (e) { fail(e, 'Berkas belum dapat diunduh.'); }
    finally { busy = false; }
  }
  const template = () => download('/templat/RAB_DEB.xlsx', 'RAB_DEB.xlsx');
  async function chooseFile(file: File | null) {
    importFile = file; preview = null;
    if (!file) return;
    busy = true; error = ''; notice = '';
    try {
      const body = new FormData(); body.set('file', file); body.set('mode', 'preview');
      preview = (await dataService.api.post<{ preview: Preview }>(`/api/pencairan/${campusId}/rab/import`, body)).preview;
    } catch (e) { fail(e, 'Berkas belum dapat dibaca.'); importFile = null; if (fileInput) fileInput.value = ''; }
    finally { busy = false; }
  }
  const confirmImport = () => run(async () => {
    if (!importFile) throw new Error('Pilih berkas Excel dulu.');
    if (!leave()) throw new Error('Impor dibatalkan.');
    const body = new FormData(); body.set('file', importFile);
    const next = await dataService.api.post<RabOverview>(`/api/pencairan/${campusId}/rab/import`, body);
    importFile = null; preview = null; if (fileInput) fileInput.value = '';
    return next;
  }, 'RAB diimpor sebagai versi baru.');
  function cancelImport() { importFile = null; preview = null; if (fileInput) fileInput.value = ''; }

  const checkClass: Record<RabCheck['level'], string> = { ok: 'bg-green-50 text-green-800', warn: 'bg-amber-50 text-amber-900', bad: 'bg-red-50 text-red-800', info: 'bg-blue-50 text-[#015a9a]' };
  const pillClass: Record<typeof standing, string> = { kosong: 'bg-slate-100 text-slate-700', lebih: 'bg-red-100 text-red-800', sesuai: 'bg-green-100 text-green-800' };
  const pillText: Record<typeof standing, string> = { kosong: 'Belum diisi', lebih: 'Melebihi batas', sesuai: 'Tidak melebihi batas' };
  const rowClass = ['', 'bg-slate-100 font-bold text-slate-900', 'bg-slate-50 font-semibold text-slate-900', 'font-medium text-slate-800', 'text-slate-800'];
  const input = 'min-h-[34px] w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-[#0066B2] focus:outline-none focus:ring-2 focus:ring-blue-100';
  const numeric = input + ' text-right tabular-nums';
</script>

{#if error && !data}
  <div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
{:else if !data}
  <p class="text-sm text-slate-500">Memuat RAB…</p>
{:else}
  <div class="grid min-w-0 gap-5">
    <a href="/admin/pencairan/{campusId}" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Kembali ke kartu</a>
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">RAB terkelola: 100%, 70% dan 30%</h1>
        <p class="mt-1 text-sm text-slate-600">{data.campus.name} · Kode {data.campus.code} · Dasar SK {data.summary.skNumber}</p>
      </div>
      {#if version}<Badge tone={RAB_STATUS_TONE[version.status]}>{RAB_STATUS_LABEL[version.status]}</Badge>{/if}
    </header>

    <section class="grid gap-x-6 gap-y-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-[#015a9a] sm:grid-cols-2 lg:grid-cols-4" aria-label="Angka Tahap 1">
      <span class="grid">Nilai SK <strong class="tabular-nums text-slate-900">{formatSen(data.summary.amountSen)}</strong></span>
      <span class="grid">Batas Tahap 1 <strong class="tabular-nums text-slate-900">{formatSen(data.summary.limitSen)} <span class="text-xs font-medium text-slate-500">70% dari Nilai SK</span></strong></span>
      <span class="grid">RAB 70% (Tahap 1)
        <strong class="flex flex-wrap items-center gap-x-2 gap-y-1 tabular-nums {standing === 'lebih' ? 'text-red-800' : 'text-slate-900'}">
          {formatSen(totals.term1Sen)}
          <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold {pillClass[standing]}">{pillText[standing]}</span>
        </strong>
      </span>
      <span class="grid">Sisa Tahap 2 <strong class="tabular-nums text-slate-900">{formatSen(term2Sen)} <span class="text-xs font-medium text-slate-500">{formatPercent(percentOf(term2Sen, data.summary.amountSen))} dari Nilai SK</span></strong></span>
      <span class="grid text-slate-600 sm:col-span-2">RAB 100% <span class="tabular-nums font-semibold text-slate-700">{formatSen(totals.totalSen)} <span class="text-xs font-medium text-slate-500">{totals.totalSen === data.summary.amountSen ? 'sama dengan Nilai SK' : 'berbeda dari Nilai SK'}</span></span></span>
      <span class="grid text-slate-600 sm:col-span-2">RAB 30% <span class="tabular-nums font-semibold text-slate-700">{formatSen(totals.term2Sen)} <span class="text-xs font-medium text-slate-500">{totals.term1Sen + totals.term2Sen === totals.totalSen ? '70% + 30% sama dengan RAB 100%' : '70% + 30% berbeda dari RAB 100%'}</span></span></span>
    </section>

    {#if !data.versions.length}
      <div class="rounded-xl border border-slate-200/70 bg-white">
        <Empty icon="file" title="Belum ada RAB 70%" description="Mulai dari versi kosong, atau unduh templat, isi di Excel, lalu impor." />
        <div class="flex flex-wrap justify-center gap-2 px-4 pb-6">
          <Button onclick={() => newVersion('')} loading={busy} icon="plus">Buat versi kosong</Button>
          <Button variant="secondary" icon="upload" onclick={() => fileInput?.click()} disabled={busy}>Impor dari Excel</Button>
          <Button variant="ghost" icon="download" onclick={template} disabled={busy}>Unduh templat</Button>
        </div>
      </div>
    {:else}
      <div class="flex flex-wrap items-center gap-2">
        <label class="flex items-center gap-2 text-sm text-slate-700">Versi
          <select class="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2 text-sm" value={version?.id} onchange={(e) => selectVersion(e.currentTarget.value)}>
            {#each data.versions as v}<option value={v.id}>Versi {v.number} · {RAB_STATUS_LABEL[v.status]}{v.active ? ' · berlaku' : ''}</option>{/each}
          </select>
        </label>
        {#if version}
          <span class="text-xs text-slate-500">{RAB_SOURCE_LABEL[version.source]}{version.sourceFile ? ` · ${version.sourceFile}` : ''} · dibuat {time.format(new Date(version.created))}</span>
        {/if}
        <div class="ml-auto flex flex-wrap gap-2">
          {#if editable}
            <Button size="sm" onclick={save} loading={busy} disabled={!dirty} icon="save">Simpan</Button>
            <Button size="sm" variant="secondary" onclick={submit} disabled={busy || dirty || !items}>Ajukan</Button>
          {:else if version?.status === 'menunggu'}
            <Button size="sm" onclick={approve} loading={busy} disabled={standing !== 'sesuai'} icon="check">Setujui RAB 70%: menjadi nominal Tahap 1</Button>
            <Button size="sm" variant="secondary" onclick={revoke} disabled={busy}>Kembalikan ke draf</Button>
          {:else if version?.status === 'disetujui'}
            <Button size="sm" variant="danger" onclick={revoke} disabled={busy}>Cabut persetujuan</Button>
          {/if}
          <Button size="sm" variant="secondary" onclick={() => newVersion(version?.id || '')} disabled={busy} icon="plus">Buat versi baru</Button>
          <Button size="sm" variant="ghost" onclick={() => newVersion('')} disabled={busy}>Versi kosong</Button>
          <Button size="sm" variant="secondary" icon="upload" onclick={() => fileInput?.click()} disabled={busy}>Impor dari Excel</Button>
          <Button size="sm" variant="ghost" icon="download" onclick={exportVersion} disabled={busy || !version}>Ekspor</Button>
          <Button size="sm" variant="ghost" onclick={template} disabled={busy}>Unduh templat</Button>
        </div>
      </div>
    {/if}
    <input bind:this={fileInput} type="file" class="hidden" accept=".xlsx,.xlsm,.xls" onchange={(e) => chooseFile((e.currentTarget as HTMLInputElement).files?.[0] || null)} />

    {#if preview}
      <section class="grid gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-slate-800" aria-label="Pratinjau impor">
        <p class="font-semibold text-slate-900">Pratinjau impor: {preview.fileName}</p>
        <p>{preview.rows} baris uraian terbaca ({preview.kind === 'tiga_lembar' ? 'tiga lembar' : preview.kind === 'total' ? 'RAB 100% saja' : 'RAB 70% saja'}). RAB 100% {formatSen(preview.totalSen)}, RAB 70% {formatSen(preview.term1Sen)}, RAB 30% {formatSen(preview.term2Sen || 0)}. Belum ada yang disimpan.</p>
        {#if preview.problemCount}
          <p class="font-semibold text-amber-900">{preview.problemCount} baris perlu diperiksa:</p>
          <ul class="max-h-40 list-disc overflow-y-auto pl-5 text-xs text-slate-700">{#each preview.problems as p}<li>{p.row ? `Baris ${p.row}: ` : ''}{p.text}</li>{/each}</ul>
        {/if}
        <div class="flex flex-wrap gap-2"><Button size="sm" onclick={confirmImport} loading={busy}>Simpan sebagai versi baru</Button><Button size="sm" variant="ghost" onclick={cancelImport} disabled={busy}>Batal</Button></div>
      </section>
    {/if}

    {#if version?.status === 'disetujui'}
      <div class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        Disetujui{version.approvedByName ? ` oleh ${version.approvedByName}` : ''}{version.approvedAt ? ` pada ${time.format(new Date(version.approvedAt))}` : ''}. Nominal Tahap 1 {formatSen(version.term1Sen)}.
        {#if !version.active} Versi ini bukan versi yang berlaku sekarang.{/if}
        Versi yang disetujui tidak bisa diubah; gunakan Buat versi baru untuk mengubahnya.
      </div>
    {/if}
    {#each checks as c}
      <div class="flex items-start gap-2 rounded-xl px-4 py-2.5 text-sm {checkClass[c.level]}"><span class="w-4 shrink-0 text-center font-bold">{c.level === 'ok' ? '✓' : c.level === 'bad' ? '!' : c.level === 'warn' ? '!' : 'i'}</span><span>{c.text}</span></div>
    {/each}
    {#if notice}<div class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{notice}</div>{/if}
    {#if error}<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>{/if}

    {#if version}
      <div class="relative min-w-0 overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-[0_10px_30px_#0b254508]">
        <table class="w-full min-w-[1180px] border-collapse text-sm">
          <thead class="bg-slate-50 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">
            <tr>
              <th class="px-2 py-2 w-20">Kode</th><th class="px-2 py-2">Uraian</th><th class="px-2 py-2 w-40">Perhitungan</th><th class="px-2 py-2 w-20 text-right">Volume</th><th class="px-2 py-2 w-20">Satuan</th>
              <th class="px-2 py-2 w-32 text-right">Harga satuan</th><th class="px-2 py-2 w-32 text-right">Jumlah</th><th class="px-2 py-2 w-32 text-right">RAB 70%</th><th class="px-2 py-2 w-32 text-right">RAB 30%</th>{#if editable}<th class="px-2 py-2 w-24" aria-label="Aksi"></th>{/if}
            </tr>
          </thead>
          <tbody>
            {#each live as node (node.key)}
              {@const row = rowMap.get(node.key)}
              {@const item = node.level === MAX_LEVEL}
              {@const mismatch = item && productSen(node.volume, node.unitPriceSen) !== node.amountSen}
              {@const over = item && node.term1Sen > node.amountSen}
              {@const split = item && (node.term2Sen || 0) > 0 && node.term1Sen + (node.term2Sen || 0) !== node.amountSen}
              {#if row}
                <tr class="border-t border-slate-100 align-top {rowClass[node.level]}">
                  <td class="px-2 py-1.5 whitespace-nowrap tabular-nums text-slate-600">{node.code}</td>
                  <td class="px-2 py-1.5" style="padding-left: {(node.level - 1) * 16 + 8}px">
                    {#if editable}
                      <input class={input} value={row.title} placeholder={node.level === 3 ? 'Sub kegiatan (boleh kosong)' : LEVEL_LABEL[node.level]} oninput={(e) => set(node.key, 'title', e.currentTarget.value)} aria-label={`${LEVEL_LABEL[node.level]} ${node.code}`} />
                    {:else}
                      <span class={node.title ? '' : 'text-slate-400'}>{node.title || (node.level === 3 ? 'Tanpa sub kegiatan' : 'Tanpa nama')}</span>
                    {/if}
                    {#if row.catatan}
                      <span class="mt-1 flex items-start gap-1 text-xs font-normal text-amber-900"><Icon name="alert" size={12} /><span>{row.catatan}</span>{#if editable}<button type="button" class="ml-1 font-semibold text-[#0066B2] hover:underline" onclick={() => clearNote(node.key)}>Hapus catatan</button>{/if}</span>
                    {/if}
                  </td>
                  {#if item}
                    <td class="px-2 py-1.5">{#if editable}<input class={input} value={row.calculation} placeholder="1 Pkt x 30 Org x 1 Hari" oninput={(e) => set(node.key, 'calculation', e.currentTarget.value)} aria-label={`Perhitungan ${node.code}`} />{:else}<span class="text-slate-600">{node.calculation}</span>{/if}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{#if editable}<input class={numeric} value={row.volume} inputmode="decimal" oninput={(e) => set(node.key, 'volume', e.currentTarget.value)} aria-label={`Volume ${node.code}`} />{:else}{node.volume ? formatVolume(node.volume) : ''}{/if}</td>
                    <td class="px-2 py-1.5">{#if editable}<input class={input} value={row.unit} oninput={(e) => set(node.key, 'unit', e.currentTarget.value)} aria-label={`Satuan ${node.code}`} />{:else}{node.unit}{/if}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{#if editable}<input class={numeric} value={row.unitPrice} inputmode="numeric" oninput={(e) => set(node.key, 'unitPrice', e.currentTarget.value)} aria-label={`Harga satuan ${node.code}`} />{:else}{money(node.unitPriceSen)}{/if}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{#if editable}<input class="{numeric} {mismatch ? 'border-amber-400 bg-amber-50' : ''}" value={row.amount} inputmode="numeric" title={mismatch ? 'Berbeda dari volume kali harga satuan' : ''} oninput={(e) => set(node.key, 'amount', e.currentTarget.value)} aria-label={`Jumlah ${node.code}`} />{:else}<span class={mismatch ? 'rounded bg-amber-50 px-1 text-amber-900' : ''} title={mismatch ? 'Berbeda dari volume kali harga satuan' : ''}>{money(node.amountSen)}</span>{/if}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{#if editable}<input class="{numeric} {over ? 'border-amber-400 bg-amber-50' : ''}" value={row.term1} inputmode="numeric" title={over ? 'Melebihi jumlah baris' : ''} oninput={(e) => set(node.key, 'term1', e.currentTarget.value)} aria-label={`RAB 70% ${node.code}`} />{:else}<span class={over ? 'rounded bg-amber-50 px-1 text-amber-900' : ''} title={over ? 'Melebihi jumlah baris' : ''}>{money(node.term1Sen)}</span>{/if}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{#if editable}<input class="{numeric} {split ? 'border-amber-400 bg-amber-50' : ''}" value={row.term2} inputmode="numeric" title={split ? '70% + 30% berbeda dari jumlah baris' : ''} oninput={(e) => set(node.key, 'term2', e.currentTarget.value)} aria-label={`RAB 30% ${node.code}`} />{:else}<span class={split ? 'rounded bg-amber-50 px-1 text-amber-900' : ''} title={split ? '70% + 30% berbeda dari jumlah baris' : ''}>{money(node.term2Sen || 0)}</span>{/if}</td>
                  {:else}
                    <td colspan="4" class="px-2 py-1.5"></td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{money(node.sumSen)}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{money(node.sumTerm1Sen)}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{money(node.sumTerm2Sen)}</td>
                  {/if}
                  {#if editable}
                    <td class="px-1 py-1 whitespace-nowrap text-right">
                      {#if !item}<Button size="sm" variant="ghost" icon="plus" label={`Tambah ${LEVEL_LABEL[node.level + 1]} di bawah ${node.code}`} onclick={() => addChild(node.key)} />{/if}
                      <Button size="sm" variant="ghost" icon="trash" label={`Hapus baris ${node.code}`} onclick={() => remove(node.key)} />
                    </td>
                  {/if}
                </tr>
              {/if}
            {/each}
            {#if !live.length}
              <tr><td colspan={editable ? 10 : 9} class="px-4 py-8 text-center text-sm text-slate-500">{editable ? 'Belum ada baris. Tekan Tambah kelompok untuk memulai, atau impor dari Excel.' : 'Versi ini tidak punya baris.'}</td></tr>
            {/if}
          </tbody>
          <tfoot class="border-t-2 border-slate-200 bg-slate-50 font-bold text-slate-900">
            <tr>
              <td class="px-2 py-2" colspan="6">Total · {items} uraian</td>
              <td class="px-2 py-2 text-right tabular-nums">{formatSen(totals.totalSen, false)}</td>
              <td class="px-2 py-2 text-right tabular-nums {standing === 'lebih' ? 'text-red-800' : ''}">{formatSen(totals.term1Sen, false)}</td>
              <td class="px-2 py-2 text-right tabular-nums">{formatSen(totals.term2Sen, false)}</td>
              {#if editable}<td></td>{/if}
            </tr>
          </tfoot>
        </table>
      </div>
      {#if editable}
        <div class="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" icon="plus" onclick={addRoot}>Tambah kelompok</Button>
          <Button size="sm" onclick={save} loading={busy} disabled={!dirty} icon="save">Simpan</Button>
          <span class="text-xs text-slate-500">Jumlah terisi otomatis dari volume kali harga satuan dan boleh diubah. Kolom RAB 70% adalah bagian baris untuk Tahap 1 dan RAB 30% bagian untuk Tahap 2; keduanya berjumlah sama dengan Jumlah. Uang dalam rupiah, sen dipisah koma.</span>
        </div>
      {/if}
    {/if}

    <RiwayatPerubahan context={`kampus:${campusId}/pencairan/t1`} title="Riwayat perubahan kampus ini" {refresh} />
  </div>
{/if}
