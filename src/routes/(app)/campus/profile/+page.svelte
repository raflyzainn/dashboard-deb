<script lang="ts">
  import { app } from '$lib/state.svelte';
  import ProgramContacts from '$lib/components/shared/ProgramContacts.svelte';
  const campus = $derived(app.data?.campuses.find((c) => c.id === app.session?.campusId));
</script>
<svelte:head><title>Profil Program &middot; Digitalisasi DEB</title></svelte:head>
<div class="mx-auto max-w-[1200px] space-y-5">
  <header>
    <h1 class="m-0 text-2xl font-bold text-[#17365f]">Profil Program</h1>
    <p class="mt-2 text-sm text-[#617a9a]">
      {campus?.name} &middot; Kelola informasi program dan kontak pendamping.
    </p>
  </header>
  {#if campus}<section class="rounded-xl border border-[#dce7f7] bg-white p-5 shadow-sm sm:p-6">
      <ProgramContacts
        program={campus.program}
        campusId={campus.id}
        readOnly={app.readOnly}
        floating
      />
    </section>{/if}
</div>
