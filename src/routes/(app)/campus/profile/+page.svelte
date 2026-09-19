<script lang="ts">
  import { app } from '$lib/state.svelte';
  import ProgramContacts from '$lib/components/shared/ProgramContacts.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';
  const campus = $derived(app.data?.campuses.find((c) => c.id === app.session?.campusId));
</script>
<svelte:head><title>Profil Program · Desa Energi Berdikari</title></svelte:head>
<div class="mx-auto max-w-[1200px] space-y-5">
  <header>
    <h1 class="m-0 text-2xl font-bold text-[#17365f]">Profil Program</h1>
    {#if campus}<p class="m-0 mt-2 flex items-center gap-2 text-sm font-semibold text-[#17365f]"><CampusLogo code={campus.code || campus.acronym} initials={campus.initials} size={32} />{campus.name}</p>{/if}
    <p class="m-0 mt-1 text-sm leading-[1.6] text-[#475569]">
      {app.readOnly
        ? 'Lihat data program dan kontak pendamping.'
        : 'Lihat data program. Pilih Ubah pada bagian yang ingin diperbarui.'}
    </p>
  </header>
  {#if campus}<ProgramContacts program={campus.program} campusId={campus.id} readOnly={app.readOnly || campus.fillMode !== 'campus'} /><RiwayatPerubahan context={`kampus:${campus.id}/profil`} />{/if}
</div>
