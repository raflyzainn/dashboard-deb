<script lang="ts">
  import { untrack } from 'svelte';
  import { dataService } from '$lib/data/service';
  import { dateWords } from '$lib/merge';
  import EditableSection from '$lib/components/ui/EditableSection.svelte';
  import ReadField from '$lib/components/ui/ReadField.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';

  /** Program settings per program year, typed once and used by every campus of that year in the generated documents. */
  interface Row { id: string; programYear: string; pfSignatoryName: string; pfSignatoryTitle: string; agreementStart: string; agreementEnd: string; reportDeadline: string }
  type Key = Exclude<keyof Row, 'id' | 'programYear'>;
  const FIELDS: { key: Key; label: string; type: 'text' | 'date' }[] = [
    { key: 'pfSignatoryName', label: 'Penandatangan Pertamina Foundation', type: 'text' },
    { key: 'pfSignatoryTitle', label: 'Jabatan penandatangan', type: 'text' },
    { key: 'agreementStart', label: 'Masa perjanjian mulai', type: 'date' },
    { key: 'agreementEnd', label: 'Masa perjanjian selesai', type: 'date' },
    { key: 'reportDeadline', label: 'Batas waktu laporan', type: 'date' }
  ];
  const YEAR_LABEL: Record<string, string> = { kedua: 'Tahun Kedua', ketiga: 'Tahun Ketiga' };

  let rows = $state<Row[]>([]);
  let error = $state('');
  let notice = $state('');
  let refresh = $state(0);
  let editing = $state<Record<string, boolean>>({});
  let draft = $state<Record<string, Record<Key, string>>>({});
  let saving = $state('');

  async function load() {
    try {
      rows = (await dataService.api.get<{ rows: Row[] }>('/api/pengaturan-program')).rows; error = '';
      for (const row of rows) { if (editing[row.programYear] === undefined) editing[row.programYear] = false; if (!draft[row.programYear]) draft[row.programYear] = values(row); }
    }
    catch (e) { error = e instanceof Error ? e.message : 'Pengaturan belum dapat dimuat.'; }
  }
  $effect(() => { untrack(() => { void load(); }); });

  const values = (row: Row) => Object.fromEntries(FIELDS.map(f => [f.key, row[f.key] || ''])) as Record<Key, string>;
  const dirty = (row: Row) => FIELDS.some(f => (draft[row.programYear]?.[f.key] || '').trim() !== (row[f.key] || ''));
  function start(row: Row) { draft[row.programYear] = values(row); }
  async function save(row: Row) {
    saving = row.programYear; error = '';
    try {
      const changed = Object.fromEntries(FIELDS.filter(f => (draft[row.programYear]?.[f.key] || '').trim() !== (row[f.key] || '')).map(f => [f.key, (draft[row.programYear]?.[f.key] || '').trim()]));
      rows = (await dataService.api.patch<{ rows: Row[] }>('/api/pengaturan-program', { programYear: row.programYear, ...changed })).rows;
      notice = `Pengaturan ${YEAR_LABEL[row.programYear]} tersimpan.`; refresh++;
      return true;
    } catch (e) { error = e instanceof Error ? e.message : 'Pengaturan belum tersimpan.'; return false; }
    finally { saving = ''; }
  }
</script>

<div class="grid gap-5">
  <a href="/admin/pencairan" class="inline-flex w-fit items-center gap-1 text-sm font-semibold text-[#0066B2] hover:underline"><Icon name="back" size={14} />Kembali ke direktori</a>
  <header>
    <h1 class="text-2xl font-bold text-slate-900">Pengaturan program</h1>
    <p class="mt-1 text-sm text-slate-600">Penandatangan Pertamina Foundation, masa perjanjian, dan batas waktu laporan dipakai oleh semua kampus pada tahun program yang sama.</p>
  </header>
  {#if notice}<div class="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{notice}</div>{/if}
  {#if error}<div class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>{/if}
  {#if !rows.length && !error}<p class="text-sm text-slate-500">Memuat pengaturan…</p>{/if}
  <div class="grid gap-4 xl:grid-cols-2">
    {#each rows as row (row.programYear)}
      <EditableSection title={YEAR_LABEL[row.programYear] || row.programYear} description="Dicetak pada PKS setiap kampus tahun ini." icon="settings" bind:editing={editing[row.programYear]} saving={saving === row.programYear} dirty={dirty(row)} onEdit={() => start(row)} onSave={() => save(row)}>
        {#snippet view()}
          <dl class="grid gap-3 sm:grid-cols-2">
            {#each FIELDS as f (f.key)}<ReadField label={f.label} value={f.type === 'date' ? dateWords(row[f.key]) : row[f.key]} />{/each}
          </dl>
        {/snippet}
        {#snippet edit()}
          <div class="grid gap-3 sm:grid-cols-2">
            {#each FIELDS as f (f.key)}
              <label class="grid gap-1 text-xs font-semibold text-slate-600">{f.label}
                {#if f.type === 'date'}
                  <input type="date" class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal text-slate-900" bind:value={draft[row.programYear][f.key]} />
                {:else}
                  <input class="min-h-[38px] rounded-lg border border-slate-300 px-2.5 text-sm font-normal text-slate-900" bind:value={draft[row.programYear][f.key]} maxlength="120" />
                {/if}
              </label>
            {/each}
          </div>
        {/snippet}
      </EditableSection>
    {/each}
  </div>
  <RiwayatPerubahan context="pengaturan-program" title="Riwayat perubahan pengaturan" {refresh} />
</div>
