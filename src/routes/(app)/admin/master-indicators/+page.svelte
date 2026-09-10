<script lang="ts">
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { DefinitionInput, MasterData, MasterDefinition } from '$lib/types';
  import Modal from '$lib/components/Modal.svelte';
  import Empty from '$lib/components/Empty.svelte';
const auditOperations: Record<string,string> = {
  masterSaveDefinition:'Simpan indikator', masterActivateDefinition:'Aktivasi indikator',
  masterDeleteDefinition:'Hapus indikator', masterSaveCampus:'Simpan profil kampus', masterDeleteCampus:'Hapus kampus'
};
const auditFields: Record<string,string> = {
  code:'Kode', name:'Nama', category:'Kategori', unit:'Satuan', description:'Deskripsi',
  baseline:'Baseline bersama', target:'Target bersama', status:'Status', revision:'Revisi',
  initials:'Inisial', acronym:'Singkatan', region:'Wilayah', city:'Kota', source:'Sumber',
  province:'Provinsi', island:'Pulau', latitude:'Latitude', longitude:'Longitude',
  hasLocation:'Lokasi tersedia', locationApproximate:'Lokasi perkiraan'
};

  const display=(value:unknown)=>value===null||value===undefined?'—':typeof value==='boolean'?value?'Ya':'Tidak':String(value);
  let data = $state<MasterData>({ definitions: [], audit: [] });
  let loading = $state(true), error = $state(''), search = $state('');
  let editing = $state<DefinitionInput | null>(null);
  let confirmation = $state<{ record: MasterDefinition; action: 'activate' | 'delete' } | null>(null);
  let generation = 0;
  const pending = $derived(app.data?.submissions?.filter(s => s.status === 'pending').length || 0);
  const disabled = $derived(app.busy || app.loading || loading);
  const filtered = $derived(data.definitions.filter(d => `${d.code} ${d.name} ${d.category}`.toLowerCase().includes(search.toLowerCase())));
  async function refresh() {
    const version = ++generation; loading = true; error = '';
    try { const result = await dataService.masters(); if (version === generation) data = result; }
    catch (e) { if (version === generation) error = e instanceof Error ? e.message : 'Master belum dapat dimuat.'; }
    finally { if (version === generation) loading = false; }
  }
  $effect(() => { app.loadedAt; untrack(() => void refresh()); return () => { generation++; }; });
  function edit(record?: MasterDefinition) {
    app.error = ''; app.toast = '';
    editing = record ? { id:record.id, revision:record.revision, code:record.code, name:record.name, category:record.category, unit:record.unit, description:record.description, baseline:record.baseline, target:record.target } : { code:'', name:'', category:'', unit:'', description:'', baseline:0, target:1 };
  }
  async function save() {
    if (!editing) return;
    const input = { ...editing };
    if (await app.mutate(() => dataService.saveDefinition(input), 'Master indikator tersimpan.')) editing = null;
  }
  async function confirm() {
    if (!confirmation) return;
    const { record, action } = confirmation;
    if (await app.mutate(() => action === 'activate' ? dataService.activateDefinition(record.id, record.revision) : dataService.deleteDefinition(record.id, record.revision), action === 'activate' ? 'Indikator aktif untuk seluruh kampus.' : 'Draft indikator dihapus.')) confirmation = null;
  }
</script>
<svelte:head><title>Master indikator · Digitalisasi DEB</title></svelte:head>

<div class="page-heading"><div><span class="eyebrow">PENGATURAN BERSAMA</span><h1>Master indikator</h1><p>Satu katalog, baseline, dan target untuk seluruh kampus.</p></div><button class="button" disabled={disabled} onclick={() => edit()}>Tambah indikator</button></div>
<section class="panel master-intro"><strong>Aktual dan catatan tetap milik masing-masing kampus.</strong><p>Siapkan indikator sebagai draft, lalu aktifkan untuk seluruh kampus. Baseline dan target di sini masih data simulasi.</p>{#if pending}<p class="pending-note">{pending} pengajuan pending. Aktivasi dan perubahan indikator aktif dikunci sampai review selesai. <a class="text-link" href="/admin/verifikasi">Buka Review Kampus →</a></p>{/if}</section>
{#if error}<div class="master-error" role="alert">{error} <button class="button secondary small" onclick={refresh}>Coba lagi</button></div>{/if}
<section class="panel master-panel"><div class="panel-heading"><div><h2>Katalog bersama</h2><p>{data.definitions.filter(d => d.status === 'active').length} aktif · {data.definitions.filter(d => d.status === 'draft').length} draft</p></div><label class="search-label">Cari indikator<input type="search" bind:value={search} placeholder="Kode, nama, atau kategori"/></label></div>
  {#if loading}<p class="master-padding" role="status">Memuat master…</p>{:else if !filtered.length}<Empty title="Tidak ada indikator" description="Tambahkan draft atau ubah kata pencarian."/>{:else}<div class="master-table-wrap"><table class="master-table"><thead><tr><th>Indikator</th><th>Baseline</th><th>Target</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{#each filtered as d (d.id)}<tr><td><strong>{d.name}</strong><small>{d.code} · {d.category} · {d.unit}</small></td><td>{d.baseline}</td><td>{d.target}</td><td><span class:active={d.status === 'active'} class="master-status">{d.status === 'active' ? 'Aktif' : 'Draft'}</span></td><td><div class="master-actions"><button class="button secondary small" disabled={disabled || (d.status === 'active' && pending > 0)} onclick={() => edit(d)}>Edit</button>{#if d.status === 'draft'}<button class="button small" disabled={disabled || pending > 0} onclick={() => {app.error=''; confirmation={record:d,action:'activate'};}}>Aktifkan</button>{/if}<button class="button secondary small danger-text" disabled={disabled} onclick={() => {app.error=''; confirmation={record:d,action:'delete'};}}>Hapus</button></div></td></tr>{/each}</tbody></table></div>{/if}
</section>
<section class="panel master-panel"><div class="panel-heading"><div><h2>Riwayat perubahan master</h2><p>50 perubahan terbaru oleh Admin.</p></div></div>
{#if !data.audit.length}<Empty title="Belum ada perubahan master" description="Perubahan oleh Admin akan tercatat di sini."/>{:else}
      <div class="audit-list">{#each data.audit as item (item.id)}<details>
        <summary><strong>{String(item.after?.name||item.before?.name||item.entityId)}</strong><span>{auditOperations[item.operation]||'Perubahan master'} · {new Date(item.created).toLocaleString('id-ID')}</span></summary>
        <p>Pelaku: {item.actor===app.session?.id?'Anda':'Admin lain'}</p>
        <div class="master-table-wrap"><table class="master-table"><thead><tr><th>Field</th><th>Sebelum</th><th>Sesudah</th></tr></thead><tbody>{#each Object.keys(auditFields).filter(key=>item.before?.[key]!==item.after?.[key]) as key}<tr><td>{auditFields[key]}</td><td>{display(item.before?.[key])}</td><td>{display(item.after?.[key])}</td></tr>{/each}</tbody></table></div>
      </details>{/each}</div>
{/if}</section>

{#if editing}<Modal title={editing.id ? 'Edit indikator bersama' : 'Tambah draft indikator'} onclose={() => { if (!app.busy) editing = null; }}><form class="master-form" onsubmit={e => {e.preventDefault(); void save();}}><label>Kode indikator<input required maxlength="100" bind:value={editing.code}/></label><label>Nama indikator<input required maxlength="200" bind:value={editing.name}/></label><div class="master-form-grid"><label>Kategori<input required maxlength="200" bind:value={editing.category}/></label><label>Satuan<input required maxlength="200" bind:value={editing.unit}/></label><label>Baseline bersama<input type="number" min="0" step="any" required bind:value={editing.baseline}/></label><label>Target bersama<input type="number" min="0.000000001" step="any" required bind:value={editing.target}/></label></div><label>Deskripsi<textarea maxlength="5000" rows="3" bind:value={editing.description}></textarea></label><p>Baseline dan target ini berlaku sama untuk seluruh kampus.</p><div class="master-actions"><button type="button" class="button secondary" disabled={app.busy} onclick={() => editing=null}>Batal</button><button class="button" disabled={disabled}>Simpan indikator</button></div></form></Modal>{/if}
{#if confirmation}<Modal title={confirmation.action === 'activate' ? 'Aktifkan untuk seluruh kampus?' : 'Hapus indikator?'} onclose={() => {if (!app.busy) confirmation=null;}}><p><strong>{confirmation.record.name}</strong></p><p>{confirmation.action === 'activate' ? `Indikator ini menjadi kewajiban seluruh ${app.data?.campuses.length || 0} kampus. Nilai aktual dimulai dari nol; baseline dan target mengikuti master.` : 'Hanya indikator tanpa isian atau riwayat terkait yang dapat dihapus. Riwayat audit tetap disimpan.'}</p><div class="master-actions"><button class="button secondary" disabled={app.busy} onclick={() => confirmation=null}>Batal</button><button class="button" disabled={disabled} onclick={confirm}>{confirmation.action === 'activate' ? 'Aktifkan indikator' : 'Hapus indikator'}</button></div></Modal>{/if}
