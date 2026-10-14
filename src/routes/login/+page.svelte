<script lang="ts">
  import { reportError } from '$lib/feedback';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import { untrack } from 'svelte';
  import { app } from '$lib/state.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let email = $state('');
  let password = $state('');
  let showPassword = $state(false);
  let busy = $state(false);
  let previewAccount = $state('');
  let error = $state(page.url.searchParams.get('error') || '');
  const localAccounts = $derived(app.accounts.filter((account) => account.role === 'campus' || account.role === 'admin'));
  const accountGroups = $derived([
    { label: 'Sudah ada data pencairan', accounts: localAccounts.filter(a => a.role === 'campus' && a.disbursementStarted === true) },
    { label: 'Pengajuan masih kosong', accounts: localAccounts.filter(a => a.role === 'campus' && a.disbursementStarted === false) },
    { label: 'Akun kampus', accounts: localAccounts.filter(a => a.role === 'campus' && a.disbursementStarted === undefined) },
    { label: 'Admin', accounts: localAccounts.filter(a => a.role === 'admin') }
  ].filter(group => group.accounts.length));
  const showLocalAccounts = dev;

  $effect(() => {
    untrack(() => {
      void app.init();
      if (showLocalAccounts) void app.loadAccounts();
    });
  });
  $effect(() => {
    if (app.ready && app.session) goto(app.home(), { replaceState: true });
  });

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    error = '';
    if (!email.trim() || !password) { error = reportError('Isi email dan kata sandi.'); return; }
    busy = true;
    try {
      await app.loginWithPassword(email.trim(), password);
      if (app.session) goto(app.home());
      else error = reportError(app.error || 'Email atau kata sandi tidak sesuai.');
    } catch (e) {
      error = reportError(e instanceof Error ? e.message : 'Email atau kata sandi tidak sesuai.');
    } finally { busy = false; }
  }

  async function impersonate() {
    if (!previewAccount || busy) return;
    busy = true;
    error = '';
    if (await app.login(previewAccount)) await goto(app.home());
    else error = reportError(app.error || 'Akun lokal tidak dapat dibuka.');
    busy = false;
  }
</script>

<svelte:head><title>Masuk · Desa Energi Berdikari</title></svelte:head>

<main class="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
  <section class="relative hidden flex-col justify-between overflow-hidden bg-[#0066B2] p-10 text-white lg:flex">
    <div class="absolute -right-24 -top-24 size-96 rounded-full bg-white/10"></div>
    <div class="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5"></div>
    <img src="/logo-pf-white.png" alt="Pertamina Foundation" class="relative h-12 w-auto self-start" />
    <div class="relative max-w-md">
      <p class="text-xs font-bold uppercase tracking-[0.12em] text-blue-100">Desa Energi Berdikari</p>
      <h1 class="mt-3 text-3xl font-bold leading-tight">Dashboard DEB</h1>
      <p class="mt-3 text-[15px] leading-7 text-blue-50">Ruang kerja bersama Pertamina Foundation dan kampus mitra untuk pencairan, indikator, dan pendampingan program.</p>
    </div>
    <p class="relative text-xs text-blue-100">Pertamina Foundation</p>
  </section>

  <section class="flex min-w-0 items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40 px-4 py-10">
    <div class="min-w-0 w-full max-w-md">
      <img src="/logo-pf.png" alt="Pertamina Foundation" class="mb-8 h-10 w-auto lg:hidden" />
      <h2 class="text-2xl font-bold text-slate-900">Masuk</h2>
      <p class="mt-1 text-sm text-slate-600">Gunakan akun Microsoft Pertamina Foundation, atau email dan kata sandi yang diberikan admin.</p>

      {#if error}
        <div class="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          <Icon name="alert" size={16} /><span>{error}</span>
        </div>
      {/if}

      <a
        href="/api/auth/oauth/microsoft/start"
        class="mt-6 flex min-h-[46px] w-full items-center justify-center gap-3 rounded-xl bg-[#0066B2] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_#0066b233] transition hover:bg-[#015a9a] active:scale-[0.98]"
        data-sveltekit-reload
      >
        <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
        Masuk dengan Microsoft
      </a>

      <div class="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
        <span class="h-px flex-1 bg-slate-200"></span>atau<span class="h-px flex-1 bg-slate-200"></span>
      </div>

      <form class="grid gap-4" onsubmit={submit} novalidate>
        <label class="grid gap-1.5 text-sm font-medium text-slate-700">
          <span class="field-caption">Email</span>
          <input class="min-h-[44px] rounded-xl border border-slate-300 px-3 text-[15px] text-slate-900 outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100" type="email" name="email" autocomplete="username" bind:value={email} required />
        </label>
        <label class="grid gap-1.5 text-sm font-medium text-slate-700">
          <span class="field-caption">Kata sandi</span>
          <span class="relative flex">
            <input class="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 pr-11 text-[15px] text-slate-900 outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100" type={showPassword ? 'text' : 'password'} name="password" autocomplete="current-password" bind:value={password} required />
            <button type="button" class="absolute right-1 top-1 flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onclick={() => (showPassword = !showPassword)} aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}><Icon name="eye" size={16} /></button>
          </span>
        </label>
        <Button type="submit" full loading={busy}>Masuk</Button>
      </form>

      {#if showLocalAccounts && localAccounts.length}
        <div class="mt-6 grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <label class="grid min-w-0 grid-cols-1 gap-1.5 text-sm font-medium text-slate-700">
            Pilih akun
            <select class="min-h-[44px] min-w-0 w-full max-w-full truncate rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-900 outline-none focus:border-[#0066B2] focus:ring-2 focus:ring-blue-100" bind:value={previewAccount}>
              <option value="">Pilih akun kampus atau admin</option>
              {#each accountGroups as group}
                <optgroup label={group.label}>
                  {#each group.accounts as account}<option value={account.key}>{account.name}</option>{/each}
                </optgroup>
              {/each}
            </select>
          </label>
          <Button type="button" full loading={busy} disabled={!previewAccount} onclick={impersonate}>Masuk ke ruang kerja</Button>
        </div>
      {/if}
      <p class="mt-6 text-xs leading-5 text-slate-500">Akun baru dibuat otomatis saat pertama kali masuk dengan Microsoft. Admin program memberi peran sebelum akun dapat bekerja.</p>
    </div>
  </section>
</main>
