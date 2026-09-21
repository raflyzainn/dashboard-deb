<script lang="ts">
  import { app } from '$lib/state.svelte';
  import { pollVisible } from '$lib/polling';
  import { campusGreeting } from '$lib/campus-greeting';
  import Icon from '$lib/components/ui/Icon.svelte';

  let greeting = $state(campusGreeting(new Date()));
  $effect(() => pollVisible(async () => { greeting = campusGreeting(new Date()); }, 60000, true));
</script>

<svelte:head><title>Beranda · Desa Energi Berdikari</title></svelte:head>

<div class="mx-auto grid w-full max-w-4xl gap-6 py-4 sm:py-10">
  <section class="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/70 p-6 sm:p-10">
    <img src="/logo-pf.png" alt="Pertamina Foundation" class="mb-8 h-10 w-auto" />
    <p class="text-xs font-bold uppercase tracking-widest text-[#3975b7]">Desa Energi Berdikari</p>
    <h1 class="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{greeting}, {app.session?.name}.</h1>
    <p class="mt-5 max-w-2xl text-base leading-7 text-slate-600">Selamat datang di aplikasi Desa Energi Berdikari. Aplikasi ini mendukung monitoring, evaluasi, dan pencairan dana program DEB bersama Pertamina Foundation.</p>
  </section>

  <section aria-labelledby="pencairan-title" class="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
    <div class="flex items-start gap-4">
      <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-[#0066B2]"><Icon name="payments" size={23} /></span>
      <div><h2 id="pencairan-title" class="text-lg font-bold text-slate-900">Saat ini: proses pencairan dana</h2><p class="mt-2 text-sm leading-6 text-slate-600">Pantau status pencairan, lihat catatan pemeriksa, dan lengkapi dokumen awal atau revisi kampus Anda melalui halaman Pencairan Dana.</p></div>
    </div>
    <a href="/campus/pencairan" class="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0066B2] px-5 py-3 text-sm font-semibold text-white hover:bg-[#015a9a]">Buka Pencairan Dana <Icon name="arrow" size={16} /></a>
    <p class="mt-4 text-xs leading-relaxed text-slate-500">Untuk kembali ke Beranda atau keluar, buka dropdown akun di kanan atas.</p>
  </section>
</div>
