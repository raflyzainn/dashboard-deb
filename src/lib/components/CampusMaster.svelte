<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { dataService } from '$lib/data/service';
  import type { Campus, CampusInput } from '$lib/types';
  import Modal from './Modal.svelte';
  let { campus }: { campus?: Campus } = $props();
  let form = $state<CampusInput | null>(null), deleting = $state(false);
  const disabled = $derived(app.busy || app.loading);
  function edit() {
    const location = app.data?.locations?.find(l => l.campusId === campus?.id);
    app.error=''; app.toast='';
    form = { ...(campus ? { id:campus.id, revision:campus.revision } : {}), name:campus?.name || '', initials:campus?.initials || '', acronym:campus?.acronym || '', region:campus?.region || '', city:campus?.city || '', province:location?.province || '', island:location?.island || '', latitude:location?.latitude ?? null, longitude:location?.longitude ?? null, approximate:location?.approximate ?? true };
  }
  async function save() {
    if (!form) return;
    const input = { ...form, latitude:form.latitude ?? null, longitude:form.longitude ?? null };
    if (await app.mutate(() => dataService.saveCampus(input), 'Master kampus tersimpan.')) form = null;
  }
  async function remove() {
    if (campus && await app.mutate(() => dataService.deleteCampus(campus.id, campus.revision!), 'Kampus dihapus.')) deleting=false;
  }
</script>
<div class="master-actions"><button class="button secondary small" disabled={disabled} onclick={edit}>{campus ? 'Edit profil dan lokasi' : 'Tambah kampus'}</button>{#if campus}<button class="button secondary small danger-text" disabled={disabled} onclick={() => {app.error='';deleting=true;}}>Hapus kampus</button>{/if}</div>
{#if form}<Modal wide title={campus ? 'Edit master kampus' : 'Tambah kampus'} onclose={() => {if(!app.busy)form=null;}}><form class="master-form" onsubmit={e=>{e.preventDefault();void save();}}><label>Nama kampus<input required maxlength="200" bind:value={form.name}/></label><div class="master-form-grid"><label>Inisial<input required maxlength="12" bind:value={form.initials}/></label><label>Singkatan<input maxlength="100" bind:value={form.acronym}/></label><label>Wilayah<input required maxlength="200" bind:value={form.region}/></label><label>Kota<input maxlength="200" bind:value={form.city}/></label><label>Provinsi<input maxlength="200" bind:value={form.province}/></label><label>Pulau<input maxlength="200" bind:value={form.island}/></label><label>Latitude<input type="number" min="-11.5" max="6.5" step="any" bind:value={form.latitude}/></label><label>Longitude<input type="number" min="94.5" max="141.5" step="any" bind:value={form.longitude}/></label></div><label class="master-checkbox"><input type="checkbox" bind:checked={form.approximate}/>Lokasi perkiraan</label><p>Kosongkan kedua koordinat bila lokasi belum diketahui. Kampus baru otomatis menggunakan seluruh indikator aktif; akun login disiapkan terpisah pada P1.</p><div class="master-actions"><button type="button" class="button secondary" disabled={app.busy} onclick={()=>form=null}>Batal</button><button class="button" disabled={disabled}>Simpan kampus</button></div></form></Modal>{/if}
{#if deleting}<Modal title="Hapus kampus?" onclose={()=>{if(!app.busy)deleting=false;}}><p>Kampus yang memiliki akun, indikator, atau riwayat tidak dapat dihapus. Tidak ada data terkait yang dihapus otomatis.</p><div class="master-actions"><button class="button secondary" disabled={app.busy} onclick={()=>deleting=false}>Batal</button><button class="button" disabled={disabled} onclick={remove}>Hapus kampus</button></div></Modal>{/if}
