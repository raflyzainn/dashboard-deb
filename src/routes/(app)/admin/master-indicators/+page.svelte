<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { periodsFrom } from '$lib/periods';
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { DefinitionInput, MasterData, MasterDefinition } from '$lib/types';
  import Modal from '$lib/components/Modal.svelte';
  import Empty from '$lib/components/Empty.svelte';
  import MasterAudit from '$lib/components/MasterAudit.svelte';
  let data = $state<MasterData>({ definitions: [] });
  let loading = $state(true),
    error = $state(''),
    search = $state('');
  let editing = $state<DefinitionInput | null>(null);
  let confirmation = $state<{ record: MasterDefinition; action: 'activate' | 'delete' } | null>(
    null
  );
  let generation = 0;
  let selectedPeriod = $state<string | undefined>(undefined);
  let creatingPeriod = $state(false);
  let periodName = $state('');
  let openingPeriod = $state(false);
  const periods = $derived(periodsFrom(data.definitions));
  const chosen = $derived(
    periods.find((p) => p.id === selectedPeriod) || periods.find((p) => p.state === 'active')
  );
  const archived = $derived(chosen?.state === 'archived');
  const pending = $derived(app.navigation.pendingCount);
  const reviewBlocked = $derived(chosen?.state !== 'draft' && pending > 0);
  const disabled = $derived(app.busy || app.loading || loading);
  const filtered = $derived(
    data.definitions.filter(
      (d) =>
        (d.period || '') === (chosen?.id || '') &&
        `${d.code} ${d.name} ${d.category}`.toLowerCase().includes(search.toLowerCase())
    )
  );
  async function refresh() {
    const version = ++generation;
    loading = true;
    error = '';
    try {
      const result = await dataService.masters();
      if (version === generation) data = result;
    } catch (e) {
      if (version === generation)
        error = e instanceof Error ? e.message : 'Master belum dapat dimuat.';
    } finally {
      if (version === generation) loading = false;
    }
  }
  $effect(() => {
    app.loadedAt;
    untrack(() => void refresh());
    return () => {
      generation++;
    };
  });
  function edit(record?: MasterDefinition) {
    app.error = '';
    app.toast = '';
    editing = record
      ? {
          id: record.id,
          revision: record.revision,
          period: record.period || '',
          code: record.code,
          name: record.name,
          category: record.category,
          unit: record.unit,
          description: record.description,
          baseline: record.baseline,
          target: record.target
        }
      : {
          period: chosen?.id || '',
          code: '',
          name: '',
          category: '',
          unit: '',
          description: '',
          baseline: 0,
          target: 1
        };
  }
  async function save() {
    if (!editing) return;
    const input = { ...editing };
    if (await app.mutate(() => dataService.saveDefinition(input), 'Master indikator tersimpan.'))
      editing = null;
  }
  async function confirm() {
    if (!confirmation) return;
    const { record, action } = confirmation;
    if (
      await app.mutate(
        () =>
          action === 'activate'
            ? dataService.activateDefinition(record.id, record.revision)
            : dataService.deleteDefinition(record.id, record.revision),
        action === 'activate' ? 'Indikator aktif untuk seluruh kampus.' : 'Draft indikator dihapus.'
      )
    )
      confirmation = null;
  }
</script>
<svelte:head><title>Master indikator · Digitalisasi DEB</title></svelte:head>

<div class="page-heading">
  <div>
    <span class="eyebrow">PENGATURAN BERSAMA</span>
    <h1>Master indikator</h1>
    <p>Kelola periode penilaian, indikator, baseline, dan target untuk kampus mitra.</p>
  </div>
  <button class="button" disabled={disabled || archived} onclick={() => edit()}
    >Tambah indikator</button
  >
</div>
<section class="panel period-management" aria-label="Pengaturan periode">
  <div class="period-heading">
    <span class="period-symbol"><Icon name="clock" size={22} /></span>
    <div>
      <h2>Periode penilaian</h2>
      <p>Siapkan periode berikutnya tanpa mengubah riwayat kampus.</p>
    </div>
    <span class="period-badge" class:draft={chosen?.state === 'draft'} class:archived
      >{chosen?.state === 'draft' ? 'Persiapan' : archived ? 'Arsip' : 'Sedang berjalan'}</span
    >
  </div>
  <div class="period-controls">
    <label
      >Pilih periode<select
        aria-label="Kelola periode"
        value={chosen?.id ?? ''}
        onchange={(event) => (selectedPeriod = event.currentTarget.value)}
        {disabled}
      >
        {#each periods as period}<option value={period.id}
            >{period.name} · {period.state === 'active'
              ? 'Aktif'
              : period.state === 'draft'
                ? 'Draft'
                : 'Arsip'}</option
          >{/each}
      </select></label
    >
    <div class="master-actions">
      <button
        class="button secondary"
        disabled={disabled || periods.some((p) => p.state === 'draft')}
        onclick={() => {
          periodName = '';
          creatingPeriod = true;
        }}>Periode baru</button
      >
      {#if chosen?.state === 'draft'}<button
          class="button"
          disabled={disabled || pending > 0}
          onclick={() => (openingPeriod = true)}>Buka periode</button
        >{/if}
    </div>
  </div>
  <p class="period-help">
    {archived
      ? 'Arsip hanya dapat dibaca. Indikator dan hasil periode ini tetap dipertahankan.'
      : chosen?.state === 'draft'
        ? 'Sesuaikan indikator, baseline, dan target sebelum membuka periode untuk kampus.'
        : 'Periode aktif digunakan untuk pengisian dan verifikasi kampus.'}
  </p>
</section>
<section class="panel master-intro">
  <strong>Aktual dan catatan tetap milik masing-masing kampus.</strong>
  <p>
    Siapkan indikator sebagai draft, lalu aktifkan untuk seluruh kampus. Baseline dan target di sini
    masih data simulasi.
  </p>
  {#if pending}<p class="pending-note">
      {pending} pengajuan pending. Aktivasi dan perubahan indikator aktif dikunci sampai review selesai.
      <a class="text-link" href="/admin/verifikasi">Buka Review Kampus →</a>
    </p>{/if}
</section>
{#if error}<div class="master-error" role="alert">
    {error} <button class="button secondary small" onclick={refresh}>Coba lagi</button>
  </div>{/if}
<section class="panel master-panel">
  <div class="panel-heading">
    <div>
      <h2>Katalog bersama</h2>
      <p>
        {data.definitions.filter(
          (d) => (d.period || '') === (chosen?.id || '') && d.status === 'active'
        ).length} aktif · {data.definitions.filter(
          (d) => (d.period || '') === (chosen?.id || '') && d.status === 'draft'
        ).length} draft
      </p>
    </div>
    <label class="search-label"
      >Cari indikator<input
        type="search"
        bind:value={search}
        placeholder="Kode, nama, atau kategori"
      /></label
    >
  </div>
  {#if loading}<p class="master-padding" role="status">
      Memuat master…
    </p>{:else if !filtered.length}<Empty
      title="Tidak ada indikator"
      description="Tambahkan draft atau ubah kata pencarian."
    />{:else}<div class="master-table-wrap">
      <table class="master-table">
        <thead
          ><tr><th>Indikator</th><th>Baseline</th><th>Target</th><th>Status</th><th>Aksi</th></tr
          ></thead
        ><tbody
          >{#each filtered as d (d.id)}<tr
              ><td><strong>{d.name}</strong><small>{d.code} · {d.category} · {d.unit}</small></td
              ><td>{d.baseline}</td><td>{d.target}</td><td
                ><span class:active={d.status === 'active'} class="master-status"
                  >{d.status === 'active' ? 'Aktif' : 'Draft'}</span
                ></td
              ><td
                ><div class="master-actions">
                  <button
                    class="button secondary small"
                    disabled={disabled || archived || (d.status === 'active' && reviewBlocked)}
                    onclick={() => edit(d)}>Edit</button
                  >{#if d.status === 'draft'}<button
                      class="button small"
                      disabled={disabled || archived || reviewBlocked}
                      onclick={() => {
                        app.error = '';
                        confirmation = { record: d, action: 'activate' };
                      }}>Aktifkan</button
                    >{/if}<button
                    class="button secondary small danger-text"
                    disabled={disabled || archived}
                    onclick={() => {
                      app.error = '';
                      confirmation = { record: d, action: 'delete' };
                    }}>Hapus</button
                  >
                </div></td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>{/if}
</section>
<MasterAudit />
{#if creatingPeriod}<Modal
    title="Buat draft periode baru"
    onclose={() => {
      if (!app.busy) creatingPeriod = false;
    }}
  >
    <form
      onsubmit={async (event) => {
        event.preventDefault();
        if (
          await app.mutate(
            () => dataService.createPeriod(periodName.trim()),
            'Draft periode dibuat. Sesuaikan indikator sebelum membuka.'
          )
        ) {
          selectedPeriod = periodName.trim();
          creatingPeriod = false;
        }
      }}
    >
      <label
        >Nama periode<input
          required
          maxlength="80"
          bind:value={periodName}
          placeholder="Contoh: Semester I 2027"
        /></label
      >
      <p>
        Indikator aktif, baseline, dan target disalin dari periode aktif. Nilai capaian kampus tidak
        disalin.
      </p>
      <div class="dialog-actions">
        <button
          type="button"
          class="button secondary"
          disabled={app.busy}
          onclick={() => (creatingPeriod = false)}>Batal</button
        ><button class="button" disabled={app.busy}>Buat draft periode</button>
      </div>
    </form>
  </Modal>{/if}
{#if openingPeriod && chosen}<Modal
    title="Buka periode baru?"
    onclose={() => {
      if (!app.busy) openingPeriod = false;
    }}
  >
    <p>
      Periode <strong>{chosen.name}</strong> akan dibuka. Periode aktif sebelumnya menjadi arsip baca
      saja. Kampus mulai mengisi capaian dan catatan baru.
    </p>
    <div class="dialog-actions">
      <button class="button secondary" disabled={app.busy} onclick={() => (openingPeriod = false)}
        >Batal</button
      ><button
        class="button"
        disabled={app.busy || pending > 0}
        onclick={async () => {
          if (
            await app.mutate(
              () => dataService.openPeriod(chosen!.id),
              'Periode baru dibuka. Data sebelumnya tersimpan sebagai arsip.'
            )
          )
            openingPeriod = false;
        }}>Ya, buka periode</button
      >
    </div>
  </Modal>{/if}

{#if editing}<Modal
    title={editing.id ? 'Edit indikator bersama' : 'Tambah draft indikator'}
    onclose={() => {
      if (!app.busy) editing = null;
    }}
    ><form
      class="master-form"
      onsubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <label>Kode indikator<input required maxlength="100" bind:value={editing.code} /></label
      ><label>Nama indikator<input required maxlength="200" bind:value={editing.name} /></label>
      <div class="master-form-grid">
        <label>Kategori<input required maxlength="200" bind:value={editing.category} /></label
        ><label>Satuan<input required maxlength="200" bind:value={editing.unit} /></label><label
          >Baseline bersama<input
            type="number"
            min="0"
            step="any"
            required
            bind:value={editing.baseline}
          /></label
        ><label
          >Target bersama<input
            type="number"
            min="0.000000001"
            step="any"
            required
            bind:value={editing.target}
          /></label
        >
      </div>
      <label
        >Deskripsi<textarea maxlength="5000" rows="3" bind:value={editing.description}
        ></textarea></label
      >
      <p>Baseline dan target ini berlaku sama untuk seluruh kampus.</p>
      <div class="master-actions">
        <button
          type="button"
          class="button secondary"
          disabled={app.busy}
          onclick={() => (editing = null)}>Batal</button
        ><button class="button" {disabled}>Simpan indikator</button>
      </div>
    </form></Modal
  >{/if}
{#if confirmation}<Modal
    title={confirmation.action === 'activate'
      ? 'Aktifkan untuk seluruh kampus?'
      : 'Hapus indikator?'}
    onclose={() => {
      if (!app.busy) confirmation = null;
    }}
    ><p><strong>{confirmation.record.name}</strong></p>
    <p>
      {confirmation.action === 'activate'
        ? `Indikator ini menjadi kewajiban seluruh ${app.data?.campuses.length || 0} kampus. Kampus perlu mengisi nilai aktual; baseline dan target mengikuti master.`
        : 'Hanya indikator tanpa isian atau riwayat terkait yang dapat dihapus. Riwayat audit tetap disimpan.'}
    </p>
    <div class="master-actions">
      <button class="button secondary" disabled={app.busy} onclick={() => (confirmation = null)}
        >Batal</button
      ><button class="button" {disabled} onclick={confirm}
        >{confirmation.action === 'activate' ? 'Aktifkan indikator' : 'Hapus indikator'}</button
      >
    </div></Modal
  >{/if}

<style>
  .period-management {
    padding: 22px 24px;
    margin-bottom: 20px;
    background: linear-gradient(120deg, #ffffff, #f3faff);
  }
  .period-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 22px;
  }
  .period-symbol {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #e6f3ff;
    color: #087dba;
    flex-shrink: 0;
  }
  .period-heading h2 {
    font-size: 16px;
    margin: 0 0 4px;
  }
  .period-heading p {
    color: #71869f;
    font-size: 12px;
    line-height: 1.6;
    margin: 0;
  }
  .period-badge {
    margin-left: auto;
    padding: 6px 10px;
    font-size: 10px;
    font-weight: 650;
    border-radius: 20px;
    background: #e5f7ee;
    color: #287154;
    white-space: nowrap;
  }
  .period-badge.draft {
    background: #fff2d6;
    color: #966313;
  }
  .period-badge.archived {
    background: #edf1f7;
    color: #687b95;
  }
  .period-controls {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
  }
  .period-controls label {
    display: grid;
    gap: 8px;
    flex: 1;
    max-width: 400px;
    font-size: 11px;
    font-weight: 600;
    color: #59718c;
  }
  .period-controls select {
    margin: 0;
    width: 100%;
    background: white;
  }
  .period-help {
    margin: 18px 0 0;
    padding-top: 14px;
    border-top: 1px solid #dfeaf5;
    font-size: 12px;
    line-height: 1.7;
    color: #6e849e;
  }
  @media (max-width: 700px) {
    .period-management {
      padding: 16px;
    }
    .period-heading {
      flex-wrap: wrap;
      gap: 10px;
    }
    .period-heading > div {
      flex: 1;
      min-width: 160px;
    }
    .period-badge {
      margin-left: 0;
    }
    .period-controls {
      align-items: stretch;
      flex-direction: column;
      gap: 14px;
    }
    .period-controls label {
      max-width: none;
    }
    .period-controls .master-actions {
      flex-wrap: wrap;
    }
  }
</style>
