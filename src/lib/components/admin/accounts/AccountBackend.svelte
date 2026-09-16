<script lang="ts">
  import { dataService } from '$lib/data/service';
  import { untrack } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import { normalizeEmail, validEmail } from '$lib/account-validation';
  import type { DemoAccount as Account } from '$lib/data/demo/store';
  let cache = $state<Record<string, Account>>({}),
    ids = $state<string[]>([]);
  const cached = $derived(Object.values(cache));
  let drafts = $state<Record<string, string>>({}),
    names = $state<Record<string, string>>({});
  let editing = $state<string[]>([]);
  let search = $state(''),
    filter = $state('all'),
    currentPage = $state(1),
    total = $state(0);
  let stats = $state({ total: 0, campuses: 0, email: 0, waiting: 0, active: 0 });
  let busy = $state(false),
    notice = $state(''),
    error = $state('');
  let resetAccounts = $state<Account[] | null>(null);
  let generation = 0;
  let loading = $state(true),
    loadedQuery = $state(''),
    loadedFilter = $state('all');
  const resultsPending = $derived(loading || search !== loadedQuery || filter !== loadedFilter);
  const pageCount = $derived(Math.max(1, Math.ceil(total / 10))),
    pageNumber = $derived(Math.min(currentPage, pageCount));
  const visible = $derived(ids.map((id) => cache[id]).filter(Boolean)),
    paged = $derived(visible);
  const campusGroups = $derived(
    [...new Set(paged.map((a) => a.campusId))].map((id) => ({
      id,
      name: paged.find((a) => a.campusId === id)!.campus,
      accounts: paged.filter((a) => a.campusId === id)
    }))
  );
  const changed = $derived(
    cached.filter(
      (a) =>
        normalizeEmail(drafts[a.id] ?? a.email) !== a.email ||
        (names[a.id] ?? a.name).trim() !== a.name
    )
  );
  const hasErrors = $derived(cached.some((a) => !!emailError(a)));
  $effect(() => {
    search;
    filter;
    currentPage = 1;
  });
  $effect(() => {
    const query = search,
      state = filter,
      page = currentPage;
    untrack(() => {
      void load(query, state, page);
    });
  });
  async function api(path: string, body?: object, _key?: string): Promise<any> {
    return dataService.accountsAdmin(path, body);
  }
  function remember(rows: Account[]) {
    for (const value of rows) {
      const old = cache[value.id];
      const dirty =
        old &&
        (normalizeEmail(drafts[value.id] ?? old.email) !== old.email ||
          (names[value.id] ?? old.name).trim() !== old.name);
      // Keep the original revision for unsaved edits so the server can report conflicts.
      if (!dirty) {
        cache[value.id] = { ...value, active: value.status === 'Aktif' };
        drafts[value.id] = value.email;
        names[value.id] = value.name;
      }
    }
  }
  async function load(q = search, f = filter, p = currentPage) {
    const revision = ++generation;
    loading = true;
    error = '';
    try {
      const data = await api(
        '?' + new URLSearchParams({ q, status: f === 'all' ? '' : f, page: String(p) })
      );
      if (revision !== generation) return;
      remember(data.items);
      ids = data.items.map((a: Account) => a.id);
      total = data.total;
      stats = data.stats;
      currentPage = data.page;
      loadedQuery = q;
      loadedFilter = f;
    } catch (e) {
      if (revision === generation) error = e instanceof Error ? e.message : 'Data tidak tersedia.';
    } finally {
      if (revision === generation) loading = false;
    }
  }
  function emailError(a: Account) {
    const email = normalizeEmail(drafts[a.id] ?? a.email);
    return email && !validEmail(email)
      ? 'Format email belum valid.'
      : email &&
          cached.some((b) => b.id !== a.id && normalizeEmail(drafts[b.id] ?? b.email) === email)
        ? 'Email sudah digunakan akun PIC lain.'
        : '';
  }
  function isEditing(a: Account) {
    return (!a.name && !a.email) || editing.includes(a.id);
  }
  function cancelEdit(a: Account) {
    drafts[a.id] = a.email;
    names[a.id] = a.name;
    editing = editing.filter((id) => id !== a.id);
    error = '';
  }
  function save() {
    const active = changed.filter(
      (a) => a.status === 'Aktif' && normalizeEmail(drafts[a.id] ?? a.email) !== a.email
    );
    if (active.length) {
      resetAccounts = active;
      return;
    }
    void commitEmails();
  }
  async function commitEmails() {
    busy = true;
    error = '';
    try {
      await api('/save', {
        changes: changed.map((a) => ({
          id: a.id,
          revision: a.revision,
          name: names[a.id] ?? a.name,
          email: drafts[a.id] ?? a.email
        })),
        confirmReset: !!resetAccounts
      });
      cache = {};
      drafts = {};
      names = {};
      editing = [];
      resetAccounts = null;
      await load();
      notice = 'Data PIC dan email tersimpan.';
    } catch (e) {
      error = (e as Error).message;
      resetAccounts = null;
    } finally {
      busy = false;
    }
  }
</script>
<svelte:head><title>Akun kampus · DEB</title></svelte:head>
<div
  class="flex items-center justify-between gap-y-[20px] gap-x-[20px] mb-[27px] [&_p]:text-[12px] [&_p]:text-[#637796] [&_p]:mt-[8px] max-[900.01px]:[&_h1]:text-[24px] max-[700.01px]:items-start max-[700.01px]:gap-y-[15px] max-[700.01px]:gap-x-[15px] max-[700.01px]:mb-[22px] max-[700.01px]:flex-wrap max-[700.01px]:[&_h1]:text-[23px] max-[700.01px]:[&_p]:text-[12px] max-[700.01px]:[&_p]:leading-[1.9] max-[700.01px]:[&_p]:max-w-[340px] max-[700.01px]:[&_.period]:hidden page-heading"
>
  <div>
    <span
      class="block text-[10px] tracking-[1.9px] font-[750] text-[#3975b7] mb-[9px] max-[700.01px]:text-[8px] eyebrow"
      >ADMINISTRASI AKSES</span
    >
    <h1
      class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
    >
      Akun kampus
    </h1>
    <p class="leading-[1.8] m-[0px]">
      Simulasi pengelolaan nama dan email PIC. Perubahan hanya tersimpan di browser ini.
    </p>
  </div>
</div>
<p
  class="mt-[0px] [&&]:mb-[22px] [&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#607b9d] [&&]:[background-image:initial] [&&]:[background-color:rgb(241,_247,_255)] [&&]:px-[17px] [&&]:py-[13px] mx-[0px] [&&]:border-[1px] [&&]:border-dashed [&&]:border-[color:rgb(189,_212,_240)] [&&]:rounded-[9px] mock-note"
>
  Mode demo: email tidak dikirim dan akun nyata tidak dibuat. Gunakan pilihan role pada halaman
  masuk untuk mencoba alur kampus dan admin. <button
    class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.4] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
    onclick={() => load()}>Muat ulang status</button
  >
</p>
<div
  class="[&&]:grid [&&]:grid-cols-[repeat(4,_1fr)] [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:mb-[24px] max-[750.01px]:[&&]:grid-cols-[repeat(2,_1fr)] max-[750.01px]:[&&]:gap-y-[10px] max-[750.01px]:[&&]:gap-x-[10px] access-stats"
>
  <article
    class="[&&]:grid [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:p-[22px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(220,_231,_247)] [&&]:rounded-[11px] max-[750.01px]:[&&]:p-[16px]"
  >
    <span class="[&&]:text-[12px] [&&]:text-[#6a809d]">Kampus mitra</span><strong
      class="font-[650] [&&]:text-[29px]">{stats.campuses}</strong
    >
  </article>
  <article
    class="[&&]:grid [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:p-[22px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(220,_231,_247)] [&&]:rounded-[11px] max-[750.01px]:[&&]:p-[16px]"
  >
    <span class="[&&]:text-[12px] [&&]:text-[#6a809d]">Email tersimpan</span><strong
      class="font-[650] [&&]:text-[29px]">{stats.email}</strong
    >
  </article>
  <article
    class="[&&]:grid [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:p-[22px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(220,_231,_247)] [&&]:rounded-[11px] max-[750.01px]:[&&]:p-[16px]"
  >
    <span class="[&&]:text-[12px] [&&]:text-[#6a809d]">Total akun PIC</span><strong
      class="font-[650] [&&]:text-[29px]">{stats.total}</strong
    >
  </article>
  <article
    class="[&&]:grid [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:p-[22px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(220,_231,_247)] [&&]:rounded-[11px] max-[750.01px]:[&&]:p-[16px]"
  >
    <span class="[&&]:text-[12px] [&&]:text-[#6a809d]">Akun aktif</span><strong
      class="font-[650] [&&]:text-[29px]">{stats.active}</strong
    >
  </article>
</div>
<section
  class="[background-image:initial] [background-color:white] min-w-[0] [&&]:overflow-x-hidden [&&]:overflow-y-hidden [box-shadow:0_10px_30px_#1a4d8f08] border-[1px] border-solid border-[color:rgb(220,_231,_247)] rounded-[11px] [&:hover]:border-[color:rgb(210,_226,_245)] panel account-panel"
  aria-label="Daftar email kampus"
>
  <div
    class="[&&]:flex [&&]:gap-y-[18px] [&&]:gap-x-[18px] [&&]:items-center [&&]:justify-between [&&]:p-[24px] max-[750.01px]:[&&]:items-start max-[750.01px]:[&&]:flex-wrap max-[750.01px]:[&&]:p-[18px] roster-heading"
  >
    <div>
      <h2 class="font-[650] text-[color:var(--navy)] [&&]:text-[16px] tracking-[-0.45px] m-[0px]">
        Daftar akun kampus
      </h2>
      <p class="[&&]:mt-[7px] mb-[0px] leading-[1.8] [&&]:text-[12px] [&&]:text-[#7185a0] mx-[0px]">
        Dua PIC dengan nama dan email masing-masing untuk setiap kampus mitra.
      </p>
    </div>
    <button
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
      disabled={busy || !changed.length || hasErrors}
      onclick={save}>Simpan perubahan{changed.length ? ` (${changed.length})` : ''}</button
    >
  </div>
  <div
    class="[&&]:flex [&&]:gap-y-[12px] [&&]:gap-x-[12px] [&&]:pt-[0px] [&&]:pb-[18px] [&&]:px-[24px] max-[750.01px]:[&&]:pt-[0px] max-[750.01px]:[&&]:pb-[18px] max-[750.01px]:[&&]:flex-col max-[750.01px]:[&&]:px-[18px] filters"
  >
    <div
      class="flex items-center [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#7b94b4] [&&&]:grow [&&&]:shrink [&&&]:[flex-basis:0%] min-w-[200px] px-[12px] py-[0px] border-[1px] border-solid border-[color:rgb(211,_226,_243)] rounded-[7px] [&_input]:[background-image:initial] [&_input]:[background-color:transparent] [&_input]:min-w-[0] [&_input]:w-[100%] [&_input]:text-[11px] [&_input]:p-[10px] [&_input]:border-[0px] [&_input]:border-none [&_input]:border-[color:currentcolor] [&:focus-within]:[outline-color:#7fc1ff] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&_input:focus]:[outline-color:initial] [&_input:focus]:[outline-style:none] [&_input:focus]:[outline-width:initial] search-field"
    >
      <Icon name="search" size={18} /><input
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
        aria-label="Cari kampus, PIC, atau email"
        placeholder="Cari kampus, PIC, atau email…"
        bind:value={search}
      />
    </div>
    <select
      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[290px] min-h-[37px] [&&]:min-w-[180px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)]"
      aria-label="Filter status akun"
      bind:value={filter}
      ><option value="all">Semua status</option
      >{#each ['Email belum diisi', 'Aktif'] as value}<option>{value}</option>{/each}</select
    >
  </div>
  <p
    class="[&&]:leading-[1.6] [&&]:pt-[0px] [&&]:pb-[18px] [&&]:text-[12px] [&&]:text-[#6b819c] [&&]:px-[24px] [&&]:m-[0px] max-[750.01px]:[&&]:px-[18px] filter-summary"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    {#if error}Jumlah hasil belum dapat diperbarui.{:else if resultsPending}Memuat hasil filter…{:else}Menampilkan
      <strong class="[&&]:font-[650] [&&]:text-[#335580]">{total}</strong> dari
      <strong class="[&&]:font-[650] [&&]:text-[#335580]">{stats.campuses}</strong>
      kampus{#if filter !== 'all'}
        · {filter}{/if}{/if}
  </p>
  {#if changed.length}<p
      class="[&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#607b9d] [&&]:mx-[24px] [&&]:my-[12px] max-[750.01px]:[&&]:mx-[18px] hint"
    >
      Simpan nama dan email contoh untuk simulasi pengelolaan PIC. Tidak ada email yang dikirim.
    </p>{/if}
  {#if hasErrors}<p
      class="[&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#a33b31] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_240,_238)] [&&]:p-[12px] [&&]:mx-[24px] [&&]:my-[12px] [&&]:rounded-[7px] max-[750.01px]:[&&]:mx-[18px] error"
      role="alert"
    >
      Periksa format atau email duplikat pada baris yang ditandai.
    </p>{/if}
  {#if error}<p
      class="[&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#a33b31] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_240,_238)] [&&]:p-[12px] [&&]:mx-[24px] [&&]:my-[12px] [&&]:rounded-[7px] max-[750.01px]:[&&]:mx-[18px] error"
      role="alert"
    >
      {error}
    </p>{/if}
  {#if notice}<p
      class="[&&]:leading-[1.8] [&&]:text-[11px] [&&]:text-[#247555] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_248,_241)] [&&]:p-[12px] [&&]:mx-[24px] [&&]:my-[12px] [&&]:rounded-[7px] max-[750.01px]:[&&]:mx-[18px] success-note"
      role="status"
    >
      {notice}
    </p>{/if}
  <div
    class="[&&]:grid [&&]:grid-cols-[minmax(220px,_1.1fr)_minmax(200px,_1fr)_minmax(185px,_0.8fr)] [&&]:gap-y-[22px] [&&]:gap-x-[22px] [&&]:items-center [&&]:[background-image:initial] [&&]:[background-color:rgb(249,_251,_255)] [&&]:text-[11px] [&&]:text-[#6e84a2] [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(225,_235,_246)] [&&]:px-[24px] [&&]:py-[19px] max-[1100.01px]:[&&]:grid-cols-[minmax(180px,_1fr)_minmax(170px,_1fr)_minmax(160px,_0.8fr)] max-[1100.01px]:[&&]:gap-y-[14px] max-[1100.01px]:[&&]:gap-x-[14px] max-[750.01px]:[&&]:block max-[750.01px]:[&&]:px-[18px] max-[750.01px]:[&&]:py-[15px] roster-head"
  >
    <span class="[&:last-child]:text-right max-[750.01px]:[&&]:hidden">Kampus mitra</span><span
      class="[&:last-child]:text-right max-[750.01px]:[&&]:hidden">Email kampus</span
    ><span class="[&:last-child]:text-right max-[750.01px]:[&&]:hidden">Status & tindakan</span>
  </div>
  <div class="roster">
    {#each campusGroups as group (group.id)}
      <section aria-label={`PIC ${group.name}`}>
        <h3
          class="border-b border-[#dce7f7] bg-[#f3f8ff] px-[24px] py-[14px] text-[13px] font-semibold text-[#17365f]"
        >
          {group.name}
        </h3>
        {#each group.accounts as account (account.id)}
          {@const issue = emailError(account)}
          <article
            class="[&&]:grid [&&]:grid-cols-[minmax(220px,_1.1fr)_minmax(200px,_1fr)_minmax(185px,_0.8fr)] [&&]:gap-y-[22px] [&&]:gap-x-[22px] [&&]:items-center [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(229,_237,_247)] [&&]:px-[24px] [&&]:py-[19px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(250,_252,_255)] max-[1100.01px]:[&&]:grid-cols-[minmax(180px,_1fr)_minmax(170px,_1fr)_minmax(160px,_0.8fr)] max-[1100.01px]:[&&]:gap-y-[14px] max-[1100.01px]:[&&]:gap-x-[14px] max-[750.01px]:[&&]:flex max-[750.01px]:[&&]:gap-y-[12px] max-[750.01px]:[&&]:gap-x-[12px] max-[750.01px]:[&&]:items-stretch max-[750.01px]:[&&]:flex-col max-[750.01px]:[&&]:px-[18px] max-[750.01px]:[&&]:py-[20px] min-[751px]:[&&]:gap-y-[8px] min-[751px]:[&&]:grid-rows-[auto_auto] min-[751px]:[&:not(.editing)]:gap-y-[4px] account-row"
            class:editing={isEditing(account)}
            aria-label={`${account.campus} PIC ${account.slot}`}
          >
            <div
              class="[&&]:items-center [&&]:flex [&&]:gap-y-[13px] [&&]:gap-x-[13px] min-[751px]:[&&&]:[align-items:start] min-[751px]:[&&&]:grid min-[751px]:[&&&]:gap-y-[inherit] min-[751px]:[&&&]:[grid-column-start:1] min-[751px]:[&&&]:[grid-column-end:auto] min-[751px]:[&&&]:[grid-row-start:1] min-[751px]:[&&&]:[grid-row-end:span_2] min-[751px]:[&&&]:grid-cols-[38px_minmax(0,_1fr)] min-[751px]:[&&&]:grid-rows-[subgrid] [@media(min-width:_751px)_and_(max-width:_1100px)]:[&&&]:grid-cols-[minmax(0,_1fr)] campus-cell"
            >
              <span
                class="[&&]:w-[38px] [&&]:h-[38px] [&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:text-[#2c76c9] [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_245,_255)] [&&]:shrink-0 [&&&]:mt-[5px] [&&]:rounded-[10px] max-[1100.01px]:[&&]:hidden min-[751px]:[.account-row:not(.editing)_.campus-cell>&]:mt-[0] min-[751px]:[.account-row:not(.editing)_.campus-cell>&]:[align-self:center] min-[751px]:[&&&&]:[grid-column-start:1] min-[751px]:[&&&&]:[grid-column-end:auto] min-[751px]:[&&&&]:[grid-row-start:1] min-[751px]:[&&&&]:[grid-row-end:span_2] avatar"
                ><Icon name="campus" /></span
              >
              <div
                class="[&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:min-w-[0] min-[751px]:[&&&]:[grid-column-start:2] min-[751px]:[&&&]:[grid-column-end:auto] min-[751px]:[&&&]:[grid-row-start:1] min-[751px]:[&&&]:[grid-row-end:span_2] min-[751px]:[&&&]:grid min-[751px]:[&&&]:grid-rows-[subgrid] [@media(min-width:_751px)_and_(max-width:_1100px)]:[&&&]:[grid-column-start:1] [@media(min-width:_751px)_and_(max-width:_1100px)]:[&&&]:[grid-column-end:auto] campus-details"
              >
                <strong
                  class="font-[650] [&&]:text-[12px] [&&]:leading-[1.7] max-[750.01px]:[&&]:text-[13px] min-[751px]:[.account-row:not(.editing)_.campus-details>&]:[align-self:end]"
                  >PIC {account.slot}</strong
                >
                <div class="pic-field">
                  {#if isEditing(account)}<label
                      class="[&&]:block [&&]:text-[10px] [&&]:text-[#607b9d] [&&]:mt-[0px] [&&]:mb-[7px] [&&]:mx-[0px]"
                      for={`pic-${account.id}`}>Nama PIC</label
                    ><input
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:w-[100%] [&&]:min-w-[0] [&&]:min-h-[44px] [&&]:h-[44px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
                      id={`pic-${account.id}`}
                      aria-label={`Nama PIC ${account.slot} ${account.campus}`}
                      placeholder="Nama penanggung jawab"
                      bind:value={names[account.id]}
                      oninput={() => (notice = '')}
                    />{:else}<p
                      class="[&&]:mt-[7px] mb-[0px] [&&]:leading-[1.7] [&&]:text-[12px] [&&]:text-[#6b819c] [&&]:wrap-anywhere mx-[0px] min-[751px]:[.account-row:not(.editing)_&]:leading-[1.7] min-[751px]:[.account-row:not(.editing)_&]:m-[0px] saved-pic"
                    >
                      {account.name || 'Nama PIC belum diisi'}
                    </p>{/if}
                </div>
              </div>
            </div>
            <div
              class="[&&]:min-w-[0] max-[750.01px]:[&&]:ml-[0] min-[751px]:[&&&]:[grid-column-start:2] min-[751px]:[&&&]:[grid-column-end:auto] min-[751px]:[&&&]:[grid-row-start:2] min-[751px]:[&&&]:[grid-row-end:auto] min-[751px]:[&&&]:[align-self:start] email-cell"
            >
              {#if isEditing(account)}<label
                  class="[&&]:block [&&]:text-[10px] [&&]:text-[#607b9d] [&&]:mt-[0px] [&&]:mb-[7px] [&&]:mx-[0px]"
                  for={`email-${account.id}`}>Email kampus</label
                ><input
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [&&]:text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:w-[100%] [&&]:min-w-[0] [&&]:min-h-[44px] [&&]:h-[44px] px-[12px] py-[11px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc] [&[aria-invalid='true']]:border-[color:rgb(206,_103,_92)]"
                  id={`email-${account.id}`}
                  type="email"
                  aria-label={`Email PIC ${account.slot} ${account.campus}`}
                  aria-invalid={!!issue}
                  aria-describedby={issue ? `email-error-${account.id}` : undefined}
                  placeholder="pic@example.com"
                  bind:value={drafts[account.id]}
                  oninput={() => {
                    notice = '';
                    error = '';
                  }}
                />{#if issue}<small
                    id={`email-error-${account.id}`}
                    class="[&&]:text-[10px] [&&&]:text-[#a33b31] leading-[1.7] [&&]:block [&&]:mt-[7px] [&&]:wrap-anywhere field-error"
                    >{issue}</small
                  >{/if}{#if normalizeEmail(drafts[account.id] ?? account.email) !== account.email || (names[account.id] ?? account.name).trim() !== account.name}<small
                    class="[&&]:text-[10px] [&&]:text-[#7e91aa] leading-[1.7] [&&]:block [&&]:mt-[7px] [&&]:wrap-anywhere"
                    >Belum disimpan</small
                  >{/if}{:else}{#if account.email}<a
                    class="[-webkit-tap-highlight-color:transparent] [&&]:text-[#2368b5] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] [&&]:text-[12px] [&&]:leading-[1.8] [&&]:wrap-anywhere [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:[text-decoration-line:underline] [&:hover]:[text-decoration-thickness:initial] [&:hover]:[text-decoration-style:initial] [&:hover]:[text-decoration-color:initial] min-[751px]:[.account-row:not(.editing)_&]:leading-[1.7] min-[751px]:[.account-row:not(.editing)_&]:block saved-email"
                    href={`mailto:${account.email}`}>{account.email}</a
                  >{:else}<p
                    class="[&&]:mt-[7px] mb-[0px] [&&]:leading-[1.7] [&&]:text-[12px] [&&]:text-[#6b819c] [&&]:wrap-anywhere mx-[0px] min-[751px]:[.account-row:not(.editing)_&]:leading-[1.7] min-[751px]:[.account-row:not(.editing)_&]:m-[0px] saved-pic"
                  >
                    Email belum diisi
                  </p>{/if}{/if}
            </div>
            <div
              class="[&&]:text-right [&&]:min-w-[0] max-[750.01px]:[&&]:ml-[0] min-[751px]:[&&&]:[grid-column-start:3] min-[751px]:[&&&]:[grid-column-end:auto] min-[751px]:[&&&]:[grid-row-start:1] min-[751px]:[&&&]:[grid-row-end:span_2] row-actions"
            >
              <span
                class="[&&&]:inline-flex items-center gap-y-[5px] gap-x-[5px] text-[10px] leading-[1.6] font-[600] [background-image:initial] [background-color:rgb(241,_243,_238)] text-[#8a9580] [white-space-collapse:collapse] [text-wrap-mode:nowrap] px-[7px] py-[4px] rounded-[5px] [&.green]:[background-image:initial] [&.green]:[background-color:rgb(231,_246,_236)] [&.green]:text-[#187347] [&.amber]:[background-image:initial] [&.amber]:[background-color:rgb(255,_244,_214)] [&.amber]:text-[#956000] max-[700.01px]:text-[9px] [&.missing]:[background-image:initial] [&.missing]:[background-color:rgb(255,_240,_238)] [&.missing]:text-[#b42318] badge"
                class:green={account.active}
                class:amber={!!account.email &&
                  !account.active &&
                  account.status !== 'Gagal dikirim'}
                class:missing={!account.email || account.status === 'Gagal dikirim'}
                >{account.status}</span
              >
              <div
                class="[&&]:justify-end [&&]:flex [&&]:gap-y-[15px] [&&]:gap-x-[15px] [&&]:flex-wrap [&&]:mt-[9px] max-[750.01px]:[&&]:justify-end"
              >
                {#if account.name || account.email}{#if isEditing(account)}<button
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#2368b5] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:w-[40px] [&&]:h-[40px] [&&]:shrink-0 [&&]:[background-image:initial] [&&]:[background-color:rgb(243,_248,_255)] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(196,_216,_240)] [&&]:rounded-[8px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:rgb(145,_191,_255)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(227,_239,_255)] edit-button"
                      aria-label={`Batal ubah PIC ${account.slot} ${account.campus}`}
                      title="Batal ubah PIC"
                      onclick={() => cancelEdit(account)}><Icon name="close" size={17} /></button
                    >{:else}<button
                      class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&]:cursor-pointer [&&]:text-[#2368b5] [&&]:inline-flex [&&]:items-center [&&]:justify-center [&&]:w-[40px] [&&]:h-[40px] [&&]:shrink-0 [&&]:[background-image:initial] [&&]:[background-color:rgb(243,_248,_255)] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(196,_216,_240)] [&&]:rounded-[8px] [&:disabled]:cursor-pointer [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:rgb(145,_191,_255)] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[3px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(227,_239,_255)] edit-button"
                      aria-label={`Ubah PIC ${account.slot} ${account.campus}`}
                      title="Ubah nama dan email PIC"
                      onclick={() => (editing = [...editing, account.id])}
                      ><Icon name="edit" size={17} /></button
                    >{/if}{/if}
              </div>
            </div>
          </article>
        {/each}
      </section>
    {:else}<p
        class="leading-[1.8] [&&]:text-center [&&]:text-[12px] [&&]:text-[#6b829e] [&&]:p-[40px] m-[0px] empty-result"
      >
        Tidak ada akun PIC yang cocok dengan pencarian atau filter.
      </p>{/each}
  </div>
  <nav
    class="[border-top-width:1px] [border-top-style:solid] [border-top-color:var(--line)] [&&]:flex [&&]:items-center [&&]:justify-between [&&]:gap-y-[16px] [&&]:gap-x-[16px] [&&]:text-[#607b9d] [&&]:text-[11px] [&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(229,_237,_247)] [&&]:px-[24px] [&&]:py-[18px] [&>div]:flex [&>div]:items-center [&>div]:gap-y-[12px] [&>div]:gap-x-[12px] max-[700.01px]:[&&]:flex-col max-[700.01px]:[&&]:p-[18px] max-[700.01px]:[&>div]:w-[100%] max-[700.01px]:[&>div]:justify-between max-[750.01px]:[&&]:flex-col max-[750.01px]:[&&]:p-[18px] pagination"
    aria-label="Halaman daftar akun"
  >
    <span
      >{total ? (pageNumber - 1) * 10 + 1 : 0}&ndash;{Math.min(pageNumber * 10, total)} dari {total} kampus</span
    >
    <div
      class="[&&]:flex [&&]:items-center [&&]:gap-y-[12px] [&&]:gap-x-[12px] max-[750.01px]:[&&]:gap-y-[8px] max-[750.01px]:[&&]:gap-x-[8px]"
    >
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&&]:px-[12px] [&&&]:py-[9px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&&]:text-[11px] max-[700.01px]:[&&&]:px-[12px] max-[700.01px]:[&&&]:py-[9px] button secondary"
        disabled={busy || pageNumber === 1}
        onclick={() => (currentPage = pageNumber - 1)}>Sebelumnya</button
      ><span>Halaman {pageNumber} dari {pageCount}</span><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] [&&&]:text-[11px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] [&&&]:px-[12px] [&&&]:py-[9px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:[&&&]:text-[11px] max-[700.01px]:[&&&]:px-[12px] max-[700.01px]:[&&&]:py-[9px] button secondary"
        disabled={busy || pageNumber === pageCount}
        onclick={() => (currentPage = pageNumber + 1)}>Berikutnya</button
      >
    </div>
  </nav>
</section>
{#if resetAccounts}<Modal title="Ubah email akun aktif?" onclose={() => (resetAccounts = null)}
    ><p class="leading-[1.8] m-[0px]">
      Perubahan ini hanya mengganti email contoh di browser ini. Tidak ada tautan aktivasi atau
      email yang dikirim.
    </p>
    <ul
      class="[&&]:[list-style-position:initial] [&&]:[list-style-image:initial] [&&]:[list-style-type:none] [&&]:max-h-[320px] [&&]:overflow-x-auto [&&]:overflow-y-auto [&&]:p-[0px] [&&]:mx-[0px] [&&]:my-[20px] recipient-list"
    >
      {#each resetAccounts as a}<li
          class="[&&]:[border-bottom-width:1px] [&&]:[border-bottom-style:solid] [&&]:[border-bottom-color:rgb(224,_234,_246)] [&&]:grid [&&]:gap-y-[7px] [&&]:gap-x-[7px] [&&]:text-[12px] [&&]:wrap-anywhere [&&]:px-[0px] [&&]:py-[12px]"
        >
          <strong class="font-[650]">{a.campus}</strong><span class="[&&]:text-[#6b819c]"
            >{a.email} → {normalizeEmail(drafts[a.id]) || 'Email dikosongkan'}</span
          >
        </li>{/each}
    </ul>
    <div class="flex justify-end gap-y-[10px] gap-x-[10px] mt-[26px] dialog-actions">
      <button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#075fc7] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [&&]:[background-image:initial] [&&]:[background-color:rgb(255,_255,_255)] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&]:[box-shadow:none] px-[18px] py-[11px] border-[1px] border-solid [&&]:border-[color:rgb(185,_214,_244)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:initial] [&:hover:not(:disabled)]:[background-color:rgb(237,_246,_255)] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] [&:hover:not(:disabled)]:border-[color:rgb(104,_172,_233)] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button secondary"
        onclick={() => (resetAccounts = null)}>Batal</button
      ><button
        class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
        disabled={busy}
        onclick={commitEmails}>Simpan email demo</button
      >
    </div></Modal
  >{/if}
