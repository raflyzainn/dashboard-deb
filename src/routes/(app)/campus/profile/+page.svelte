<script lang="ts">
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';
  import Monitoring from '$lib/components/shared/monitoring/Monitoring.svelte';
  import { app } from '$lib/state.svelte';
  import ProgramContacts from '$lib/components/shared/ProgramContacts.svelte';
  import CampusLogo from '$lib/components/ui/CampusLogo.svelte';
  import RiwayatPerubahan from '$lib/components/ui/RiwayatPerubahan.svelte';
  import ReadinessSection from '$lib/components/shared/profile/ReadinessSection.svelte';
  const campus = $derived(app.navigation.campus);
  const tabs = [
    { id: 'profil', label: 'Profil Program', description: 'Lengkapi identitas program, lokasi kegiatan, dan kontak pengelola. Simpan perubahan pada bagian yang Anda perbarui.' },
    { id: 'kesiapan', label: 'Kesiapan Rencana Aksi', description: 'Gambarkan kondisi awal dan kebutuhan program. Informasi ini membantu admin PF meninjau kesiapan rencana aksi kampus.' },
    { id: 'monitoring', label: 'Monitoring Bulanan', description: 'Catat pendapatan dan produksi energi per bulan, lengkapi bukti, lalu kirim untuk diperiksa admin PF.' }
  ];
  let activeId = $state('profil');
  $effect(() => { activeId = page.url.hash.slice(1) || 'profil'; });
  const active = $derived(tabs.find(tab => tab.id === activeId) || tabs[0]);
  let monitoringOpened = $state(false);
  $effect(() => { if (active.id === 'monitoring') monitoringOpened = true; });
  function selectTab(id: string) { activeId = id; replaceState(`#${id}`, page.state); }
  function navigateTabs(event: KeyboardEvent, index: number) {
    const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault(); selectTab(tabs[next].id); document.getElementById(`tab-${tabs[next].id}`)?.focus();
  }
</script>
<svelte:head><title>Profil & Monitoring Program · Desa Energi Berdikari</title></svelte:head>
<div class="mx-auto max-w-[1200px] space-y-5">
  <header>
    <div class="mb-7 flex items-center gap-5 max-[700px]:gap-3">
      {#if campus}<CampusLogo code={campus.code || campus.acronym} initials={campus.initials} size={64} rounded="rounded-[14px]" />{/if}
      <div class="min-w-0">
        <span class="mb-[9px] block text-xs font-bold tracking-[0.06em] text-[#3975b7] max-[700px]:text-[10px]">KAMPUS MITRA{#if campus?.region} &middot; {campus.region.toUpperCase()}{/if}</span>
        <h1 class="m-0 text-[29px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--navy)] max-[700px]:text-[21px]">{campus?.name || 'Profil & Monitoring Program'}</h1>
        <p class="mb-0 mt-2 text-sm leading-[1.6] text-[#637796]">Profil, kesiapan rencana aksi, dan monitoring perkembangan program.</p>
      </div>
    </div>
    <div role="tablist" aria-label="Bagian profil dan monitoring" class="flex gap-[30px] overflow-x-auto border-b border-[var(--line)] max-[700px]:gap-6">
      {#each tabs as tab, index}
        <button id={`tab-${tab.id}`} type="button" role="tab" aria-selected={active.id === tab.id} aria-controls={`panel-${tab.id}`} tabindex={active.id === tab.id ? 0 : -1} onclick={() => selectTab(tab.id)} onkeydown={event => navigateTabs(event, index)} class="shrink-0 cursor-pointer whitespace-nowrap border-0 border-b-2 bg-transparent px-0 pb-[13px] pt-4 text-[13px] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#55a9f2] max-[700px]:text-xs {active.id === tab.id ? 'border-[#1681df] font-bold text-[#075fc7]' : 'border-transparent text-[#64748b] hover:text-[#075fc7]'}">{tab.label}</button>
      {/each}
    </div>
  </header>
  {#if campus}
    <div class="px-1"><h2 class="text-lg font-bold text-slate-900">{active.label}</h2><p class="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">{active.description}</p></div>
    <!-- Keep panels mounted so switching tabs preserves unsaved form values. -->
    <div id="panel-profil" role="tabpanel" aria-labelledby="tab-profil" hidden={active.id !== 'profil'} tabindex="0" class="space-y-5 focus-visible:outline-blue-500">
      <ProgramContacts program={campus.program} campusId={campus.id} readOnly={app.readOnly} alwaysEdit />
      <details class="rounded-xl border border-slate-200 bg-white p-4"><summary class="cursor-pointer text-sm font-semibold text-slate-600">Riwayat perubahan profil</summary><RiwayatPerubahan context={`kampus:${campus.id}/profil`} refresh={Date.parse(app.loadedAt) || 0} /></details>
    </div>
    <div id="panel-kesiapan" role="tabpanel" aria-labelledby="tab-kesiapan" hidden={active.id !== 'kesiapan'} tabindex="0" class="focus-visible:outline-blue-500">
      {#key campus.id}<ReadinessSection program={campus.program} campusId={campus.id} canEdit={!app.readOnly} alwaysEdit />{/key}
    </div>
    <div id="panel-monitoring" role="tabpanel" aria-labelledby="tab-monitoring" hidden={active.id !== 'monitoring'} tabindex="0" class="focus-visible:outline-blue-500">
      {#if monitoringOpened}{#key campus.id}<Monitoring campusId={campus.id} />{/key}{/if}
    </div>
  {:else}
    <p class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Data kampus belum tersedia. Muat ulang halaman atau hubungi admin untuk memeriksa hubungan akun dengan kampus.</p>
  {/if}
</div>
