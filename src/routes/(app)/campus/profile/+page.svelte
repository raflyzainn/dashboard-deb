<script lang="ts">
  import { app } from '$lib/state.svelte';
  import ProgramContacts from '$lib/components/shared/ProgramContacts.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';
  import ReadinessSection from '$lib/components/shared/profile/ReadinessSection.svelte';
  const campus = $derived(app.navigation.campus);
</script>
<svelte:head><title>Profil Program · Desa Energi Berdikari</title></svelte:head>
<div class="mx-auto max-w-[1200px] space-y-5">
  <header>
    <h1 class="m-0 text-2xl font-bold text-[#17365f]">Profil Program</h1>
    {#if campus}<p class="m-0 mt-2 flex items-center gap-2 text-sm font-semibold text-[#17365f]"><CampusLogo code={campus.code || campus.acronym} initials={campus.initials} size={32} />{campus.name}</p>{/if}
    <p class="m-0 mt-1 text-sm leading-[1.6] text-[#475569]">
      {app.readOnly
        ? 'Lihat data program dan kontak pendamping.'
        : 'Lengkapi data program kampus Anda. Isi langsung, lalu pilih Simpan perubahan pada setiap bagian. Data tersimpan juga tampil pada Ringkasan admin PF.'}
    </p>
  </header>
  {#if campus}
    <ProgramContacts program={campus.program} campusId={campus.id} readOnly={app.readOnly} alwaysEdit />
    {#key campus.id}<ReadinessSection program={campus.program} campusId={campus.id} canEdit={!app.readOnly} alwaysEdit />{/key}
    <RiwayatPerubahan context={`kampus:${campus.id}/profil`} refresh={Date.parse(app.loadedAt) || 0} />
  {:else}
    <p class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Data kampus belum tersedia. Muat ulang halaman atau hubungi admin untuk memeriksa hubungan akun dengan kampus.</p>
  {/if}
</div>
