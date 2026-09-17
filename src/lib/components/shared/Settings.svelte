<script lang="ts">
  import { app } from '$lib/state.svelte';
  import ChangePassword from '$lib/components/auth/ChangePassword.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let changingPassword = $state(false);
  const prefix = $derived(`/${app.session?.role}`);
  const campus = $derived(app.data?.campuses.find((item) => item.id === app.session?.campusId));
  const profileHref = $derived(
    app.session?.role === 'admin' ? '/admin/campuses?tab=accounts' : '/campus/profile'
  );
</script>

{#if changingPassword}<ChangePassword onclose={() => (changingPassword = false)} />{/if}

<div class="mx-auto max-w-[980px] space-y-6">
  <header>
    <h1 class="m-0 text-2xl font-bold text-[#17365f]">Pengaturan</h1>
    <p class="mt-2 text-sm text-[#617a9a]">Akun, notifikasi, bantuan, dan informasi aplikasi.</p>
  </header>

  <section
    class="flex flex-col gap-4 rounded-xl border border-[#dce7f7] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
  >
    <div class="flex min-w-0 items-center gap-4">
      <span
        class="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#0877cf] text-sm font-bold text-white shadow-md"
        >{app.session?.role === 'admin' ? 'PF' : campus?.initials}</span
      >
      <div class="min-w-0">
        <strong class="block truncate text-base text-[#17365f]">{app.session?.name}</strong>
        <span class="mt-1 block text-xs text-[#617a9a]"
          >{app.session?.role === 'admin' ? 'Administrator Program DEB' : campus?.name}</span
        >
      </div>
    </div>
    <a
      class="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#d3e2f4] px-4 text-xs font-semibold text-[#245489] hover:bg-blue-50"
      href={profileHref}>{app.session?.role === 'admin' ? 'Kelola akun' : 'Lihat profil'}</a
    >
  </section>

  <div>
    <p class="mb-2 ml-1 text-[10px] font-bold tracking-[1.2px] text-[#8297b6]">AKUN</p>
    <section class="overflow-hidden rounded-xl border border-[#dce7f7] bg-white shadow-sm">
      <a
        class="flex items-center gap-3 border-b border-[#edf2f8] px-4 py-4 hover:bg-blue-50"
        href={profileHref}
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          ><Icon name="campus" size={18} /></span
        >
        <span class="min-w-0 grow"
          ><strong class="block text-sm text-[#17365f]">Profil</strong><small
            class="mt-1 block text-xs text-[#71829b]"
            >{app.session?.role === 'admin'
              ? 'Kelola akun kampus mitra'
              : 'Data kampus dan program'}</small
          ></span
        ><Icon name="chevron" size={16} />
      </a>
      <a
        class="flex items-center gap-3 border-b border-[#edf2f8] px-4 py-4 hover:bg-blue-50"
        href={`${prefix}/notifications`}
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"
          ><Icon name="notifications" size={18} /></span
        >
        <span class="min-w-0 grow"
          ><strong class="block text-sm text-[#17365f]">Notifikasi</strong><small
            class="mt-1 block text-xs text-[#71829b]"
            >{app.navigation.unreadCount} belum dibaca</small
          ></span
        ><Icon name="chevron" size={16} />
      </a>
      <button
        class="flex w-full items-center gap-3 border-0 bg-white px-4 py-4 text-left hover:bg-blue-50"
        type="button"
        onclick={() => (changingPassword = true)}
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600"
          ><Icon name="settings" size={18} /></span
        >
        <span class="min-w-0 grow"
          ><strong class="block text-sm text-[#17365f]">Ganti password</strong><small
            class="mt-1 block text-xs text-[#71829b]">Perbarui password akun Anda</small
          ></span
        ><Icon name="chevron" size={16} />
      </button>
    </section>
  </div>

  <div>
    <p class="mb-2 ml-1 text-[10px] font-bold tracking-[1.2px] text-[#8297b6]">BANTUAN</p>
    <section class="overflow-hidden rounded-xl border border-[#dce7f7] bg-white shadow-sm">
      <a
        class="flex items-center gap-3 border-b border-[#edf2f8] px-4 py-4 hover:bg-blue-50"
        href={app.session?.role === 'admin' ? '/admin/faq' : '/campus/guide'}
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600"
          ><Icon name="faq" size={18} /></span
        >
        <span class="min-w-0 grow"
          ><strong class="block text-sm text-[#17365f]">Panduan aplikasi</strong><small
            class="mt-1 block text-xs text-[#71829b]">Petunjuk penggunaan dan pertanyaan umum</small
          ></span
        ><Icon name="chevron" size={16} />
      </a>
      <a class="flex items-center gap-3 px-4 py-4 hover:bg-blue-50" href={`${prefix}/questions`}>
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600"
          ><Icon name="questions" size={18} /></span
        >
        <span class="min-w-0 grow"
          ><strong class="block text-sm text-[#17365f]">Forum Tanya Jawab</strong><small
            class="mt-1 block text-xs text-[#71829b]">Diskusi dengan Tim DEB dan kampus mitra</small
          ></span
        ><Icon name="chevron" size={16} />
      </a>
    </section>
  </div>

  <div>
    <p class="mb-2 ml-1 text-[10px] font-bold tracking-[1.2px] text-[#8297b6]">TENTANG</p>
    <section
      class="flex items-center gap-4 rounded-xl border border-[#dce7f7] bg-white p-4 shadow-sm"
    >
      <img
        class="h-auto w-[130px] shrink-0"
        src="/logo-pf.png"
        alt="Pertamina Foundation"
        width="160"
        height="43"
      />
      <div>
        <strong class="block text-sm text-[#17365f]">Digitalisasi DEB</strong><small
          class="mt-1 block text-xs text-[#71829b]"
          >Portal monitoring dan evaluasi kampus mitra.</small
        >
      </div>
    </section>
  </div>
</div>
