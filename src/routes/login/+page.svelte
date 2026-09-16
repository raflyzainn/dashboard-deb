<script lang="ts">
  import AuthBackend from '$lib/components/AuthBackend.svelte';
  import { untrack } from 'svelte';
  import { page } from '$app/state';
  import { dev } from '$app/environment';
  const qa = $derived(dev && page.url.searchParams.get('qa') === '1');
  $effect(() => {
    if (qa)
      untrack(() => {
        void app.loadAccounts();
      });
  });
  import { goto } from '$app/navigation';
  import { app } from '$lib/state.svelte';
  import Icon from '$lib/components/Icon.svelte';
  let account = $state('');
  let search = $state('');
  let role = $state<'campus' | 'admin'>('campus');
  const visibleAccounts = $derived(
    app.accounts.filter(
      (a) =>
        a.role === role &&
        a.name.toLocaleLowerCase('id').includes(search.trim().toLocaleLowerCase('id'))
    )
  );
  const selected = $derived(app.accounts.find((a) => a.key === account));
  $effect(() => {
    if (!page.url.searchParams.get('token') && app.ready && app.session)
      goto(`/${app.session.role}/dashboard`, { replaceState: true });
  });
  $effect(() => {
    if (!app.accounts.some((a) => a.key === account)) account = app.accounts[0]?.key || '';
  });
  async function enter() {
    if (account && (await app.login(account)) && app.session)
      goto(`/${app.session.role}/dashboard`);
  }
</script>
<svelte:head><title>Preview lokal · Digitalisasi DEB</title></svelte:head>
{#if !qa}<AuthBackend />{:else}
  <main
    id="main-content"
    class="grid grid-cols-[1.05fr_1fr] min-h-[100dvh] max-[900.01px]:grid-cols-[0.9fr_1fr] max-[700.01px]:block login-page"
  >
    <section
      class="relative overflow-x-hidden overflow-y-hidden [background-image:linear-gradient(145deg,_rgb(23,_104,_239)_0%,_rgb(25,_68,_208)_58%,_rgb(37,_44,_159)_100%)] [background-color:initial] flex flex-col min-h-[800px] px-[55px] py-[45px] [&_.brand]:text-[#fff] [&_.brand]:m-[0px] [&_.brand-mark]:[background-image:initial] [&_.brand-mark]:[background-color:rgba(255,_255,_255,_0.094)] [&_.brand-mark]:text-[#fff] [&_.brand-mark]:border-[1px] [&_.brand-mark]:border-solid [&_.brand-mark]:border-[color:rgba(255,_255,_255,_0.17)] [&_.brand-sub]:text-[#bcd9ff] max-[1200.01px]:p-[40px] max-[900.01px]:min-h-[760px] max-[900.01px]:p-[30px] max-[700.01px]:pt-[26px] max-[700.01px]:pb-[33px] max-[700.01px]:min-h-[330px] max-[700.01px]:px-[27px] max-[700.01px]:[&_.brand]:text-[26px] max-[700.01px]:[&_.brand-mark]:w-[36px] max-[700.01px]:[&_.brand-mark]:h-[38px] [&:before]:absolute [&:before]:[content:''] [&:before]:w-[420px] [&:before]:h-[420px] [&:before]:left-[-190px] [&:before]:top-[70px] [&:before]:[box-shadow:0_0_0_70px_#ffffff08,_0_0_0_145px_#ffffff05] [&:before]:border-[1px] [&:before]:border-solid [&:before]:border-[color:rgba(255,_255,_255,_0.075)] [&:before]:rounded-[50%] min-[701px]:[&&]:pt-[32px] min-[701px]:[&&]:pb-[28px] min-[701px]:[&&]:min-h-[100dvh] login-story"
    >
      <a
        class="[-webkit-tap-highlight-color:transparent] text-[color:var(--dark)] [text-decoration-line:none] [text-decoration-thickness:initial] [text-decoration-style:initial] [text-decoration-color:initial] flex items-center gap-y-[10px] gap-x-[10px] mt-[0px] mb-[30px] text-[30px] tracking-[-1.3px] font-[800] leading-[1] mx-[10px] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] max-[900.01px]:text-[27px] brand"
        href="/login"
        ><span
          class="flex items-center justify-center w-[42px] h-[45px] [background-image:initial] [background-color:var(--dark)] text-[#cce8b3] [border-top-left-radius:13px] [border-top-right-radius:13px] [border-bottom-right-radius:13px] [border-bottom-left-radius:4px] brand-mark"
          ><Icon name="leaf" size={29} /></span
        ><span
          >DEB<span
            class="block text-[7px] tracking-[1.5px] font-[650] mt-[8px] text-[#788975] max-[900.01px]:text-[6px] brand-sub"
            >RUANG TUMBUH BERSAMA</span
          ></span
        ></a
      >
      <div
        class="relative z-[2] mt-[95px] max-w-[450px] [&_h1]:text-[#fff] [&_h1]:text-[49px] [&_h1]:leading-[1.2] [&_h1]:tracking-[-2px] [&_h1]:font-[550] [&_h1]:mt-[24px] [&_h1_em]:[font-style:normal] [&_h1_em]:text-[#9fd5ff] [&>p]:text-[13px] [&>p]:leading-[2] [&>p]:text-[#d1e5ff] [&>p]:mt-[25px] [&>p]:max-w-[360px] max-[1200.01px]:[&_h1]:text-[42px] max-[900.01px]:mt-[90px] max-[900.01px]:[&_h1]:text-[35px] max-[900.01px]:[&>p]:text-[12px] max-[700.01px]:mt-[37px] max-[700.01px]:max-w-[340px] max-[700.01px]:[&_.eyebrow]:text-[7px] max-[700.01px]:[&_.eyebrow]:mb-[10px] max-[700.01px]:[&_h1]:text-[34px] max-[700.01px]:[&_h1]:tracking-[-1.2px] max-[700.01px]:[&_h1]:mt-[10px] max-[700.01px]:[&>p]:text-[11px] max-[700.01px]:[&>p]:mt-[16px] max-[700.01px]:[&>p]:max-w-[270px] min-[701px]:[&&]:mt-[clamp(32px,_7vh,_75px)] login-copy"
      >
        <span
          class="block text-[10px] tracking-[1.9px] font-[750] [&&]:text-[#c9e5ff] mb-[9px] max-[700.01px]:text-[8px] eyebrow light"
          >DIGITALISASI DEB PUTIH</span
        >
        <h1
          class="font-[650] text-[color:var(--navy)] text-[29px] tracking-[-1.15px] leading-[1.3] m-[0px]"
        >
          Dari kolaborasi,<br />tumbuh <em>perubahan.</em>
        </h1>
        <p class="leading-[1.8] m-[0px]">
          Satu ruang untuk merawat gagasan, memantau langkah, dan mewujudkan dampak bersama kampus
          mitra.
        </p>
        <div
          class="flex gap-y-[36px] gap-x-[36px] mt-[40px] [&>div]:flex [&>div]:flex-col [&_strong]:text-[29px] [&_strong]:tracking-[-1px] [&_strong]:text-[#fff] [&_strong]:font-[500] [&_span]:text-[10px] [&_span]:text-[#c0d9ff] [&_span]:mt-[6px] max-[900.01px]:gap-y-[23px] max-[900.01px]:gap-x-[23px] max-[700.01px]:hidden min-[701px]:[&&]:mt-[28px] login-metrics"
        >
          <div>
            <strong class="font-[650]"
              >{app.accounts.filter((a) => a.role === 'campus').length || '—'}</strong
            ><span>Kampus mitra</span>
          </div>
          <div><strong class="font-[650]">PB</strong><span>Sumber data tunggal</span></div>
          <div><strong class="font-[650]">1</strong><span>Tujuan bersama</span></div>
        </div>
      </div>
      <div
        class="absolute top-[auto] right-[0px] bottom-[0px] left-[0px] h-[330px] [pointer-events:none] overflow-x-hidden overflow-y-hidden [&>svg]:absolute [&>svg]:bottom-[-5px] [&>svg]:right-[-20px] [&>svg]:w-[320px] [&>svg]:opacity-[0.6] max-[700.01px]:left-[45%] max-[700.01px]:h-[240px] max-[700.01px]:opacity-[0.45] max-[700.01px]:[&>svg]:right-[-90px] max-[700.01px]:[&>svg]:w-[290px] [&>svg_path:first-child]:[fill:#8fc8ff] [&>svg_path:last-child]:[stroke:#fff] landscape"
        aria-hidden="true"
      >
        <span
          class="absolute w-[120px] h-[120px] right-[70px] top-[15px] [box-shadow:0_0_0_35px_#ffffff0a,_0_0_0_70px_#ffffff08] border-[1px] border-solid border-[color:rgba(255,_255,_255,_0.157)] rounded-[50%] sun"
        ></span>
        <div
          class="absolute w-[800px] h-[480px] [&&]:[background-image:initial] [&&]:[background-color:rgb(23,_98,_223)] [&&]:left-[110px] [&&]:top-[120px] [transform:rotate(-20deg)] rounded-[50%] hill back"
        ></div>
        <div
          class="absolute w-[800px] h-[480px] [&&]:[background-image:initial] [&&]:[background-color:rgb(22,_68,_187)] left-[-250px] [&&]:top-[230px] [transform:rotate(-20deg)] rounded-[50%] hill front"
        ></div>
        <svg class="shrink-0" viewBox="0 0 460 220"
          ><path
            d="M220 220V70m0 94c-75 0-95-60-95-90 60 0 95 25 95 90Zm0-43c75 0 100-65 100-110-72 0-100 42-100 110Z"
            fill="#c6e4a7"
          /><path
            d="m220 163-65-62m65 23 73-81"
            fill="none"
            stroke="#326747"
            stroke-width="3"
          /></svg
        >
      </div>
      <div
        class="relative z-[2] flex flex-col gap-y-[8px] gap-x-[8px] mt-[auto] pt-[200px] text-[#c0d9ff] text-[9px] tracking-[1.4px] [&>span]:text-[10px] [&>span]:text-[#9fc5f5] [&>span]:tracking-[0] max-[900.01px]:pt-[150px] max-[700.01px]:hidden min-[701px]:[&&]:pt-[24px] login-footer"
      >
        PERTAMINA FOUNDATION <span>Untuk masa depan yang berkelanjutan.</span>
      </div>
    </section>

    <section
      class="flex items-center justify-center [background-image:linear-gradient(135deg,_rgb(248,_251,_255),_rgb(234,_243,_255))] [background-color:initial] [&&]:px-[40px] [&&]:py-[24px] max-[1200.01px]:[&&]:px-[40px] max-[1200.01px]:[&&]:py-[24px] max-[900.01px]:[&&]:px-[40px] max-[900.01px]:[&&]:py-[24px] max-[700.01px]:[background-image:initial] max-[700.01px]:[background-color:rgb(247,_250,_255)] max-[700.01px]:[&&]:p-[24px] login-panel"
    >
      <div
        class="w-[100%] max-w-[420px] [&>.demo-label]:mb-[33px] [&>.demo-label]:text-[10px] [&_h2]:text-[34px] [&_h2]:tracking-[-1.2px] [&_h2]:font-[650] [&_h2]:text-[#0d2854] max-[900.01px]:[&_h2]:text-[30px] max-[700.01px]:max-w-[440px] max-[700.01px]:[&>.demo-label]:mb-[21px] max-[700.01px]:[&>.demo-label]:text-[9px] max-[700.01px]:[&_h2]:text-[28px] login-form"
      >
        <span
          class="inline-flex items-center gap-y-[7px] gap-x-[7px] text-[9px] text-[#4274ad] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [&&&]:mb-[12px] [&>span]:w-[5px] [&>span]:h-[5px] [&>span]:[background-image:initial] [&>span]:[background-color:rgb(21,_130,_232)] [&>span]:rounded-[100%] demo-label"
          ><span></span>PocketBase lokal - Akun QA</span
        >
        <h2 class="font-[650] text-[color:var(--navy)] [&&]:text-[30px] tracking-[-0.45px] m-[0px]">
          Selamat datang.
        </h2>
        <p
          class="[&&]:mt-[8px] [&&]:mb-[16px] [&&]:leading-[1.6] text-[13px] text-[#60789b] [&&]:max-w-[none] [&&]:mx-[0px] max-[700.01px]:[&&]:mt-[8px] max-[700.01px]:[&&]:mb-[16px] max-[700.01px]:text-[12px] max-[700.01px]:[&&]:mx-[0px] login-intro"
        >
          Pilih akun QA untuk menggunakan ruang kerja DEB lokal. Ini preview lokal, bukan
          autentikasi production.
        </p>
        <form
          class="[&_label]:flex [&_label]:flex-col [&_label]:gap-y-[9px] [&_label]:gap-x-[9px] [&_label]:text-[12px] [&_label]:font-[600] [&_label]:mb-[18px] [&_input]:w-[100%] [&_textarea]:w-[100%] [&&]:grid [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:mx-[0px] [&&]:my-[16px]"
          onsubmit={(event) => {
            event.preventDefault();
            enter();
          }}
        >
          <div
            class="[&&]:flex [&&]:[background-image:initial] [&&]:[background-color:rgb(237,_244,_255)] [&&]:gap-y-[4px] [&&]:gap-x-[4px] [&&]:p-[4px] [&&]:rounded-[12px] account-tabs"
            role="group"
            aria-label="Jenis akun"
          >
            {#each ['campus', 'admin'] as kind}<button
                class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [&&]:font-[650] [font-stretch:inherit] [font-size:inherit] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer [&&]:text-[#526887] [&&]:grow [&&]:shrink [&&]:[flex-basis:0%] [&&]:[background-image:initial] [&&]:[background-color:transparent] [&&]:px-[8px] [&&]:py-[11px] [&&]:border-[0px] [&&]:border-none [&&]:border-[color:currentcolor] [&&]:rounded-[9px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&.active]:text-[#075bc7] [&.active]:[background-image:initial] [&.active]:[background-color:white] [&.active]:[box-shadow:0_2px_6px_#194b8a14]"
                type="button"
                class:active={role === kind}
                aria-pressed={role === kind}
                disabled={app.loading}
                onclick={() => {
                  role = kind as 'campus' | 'admin';
                  search = '';
                  account = app.accounts.find((a) => a.role === role)?.key || '';
                }}
                >{kind === 'campus' ? 'Kampus mitra' : 'Administrator'}<span
                  class="[&&]:ml-[7px] [&&]:text-[11px] [&&]:opacity-[0.7]"
                  >{app.accounts.filter((a) => a.role === kind).length}</span
                ></button
              >{/each}
          </div>
          <label class="[&&]:font-[650] [&&]:text-[#12386b] [&&]:mb-[0]" for="account-search"
            >{role === 'campus' ? 'Cari kampus' : 'Cari administrator'}</label
          >
          <input
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [&&&&&&&&&&&]:[background-image:initial] [&&&&&&&&&&&]:[background-color:white] [&&&&&&&&&&&]:text-[#12386b] max-w-[100%] [&&&&&&&&&&&]:w-[100%] [&&&&&&&&&&&]:px-[15px] [&&&&&&&&&&&]:py-[13px] [&&&&&&&&&&&]:border-[1px] [&&&&&&&&&&&]:border-solid [&&&&&&&&&&&]:border-[color:rgb(189,_210,_235)] [&&&&&&&&&&&]:rounded-[10px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(189,_210,_235)] [&::placeholder]:text-[#12386b]"
            id="account-search"
            type="search"
            bind:value={search}
            placeholder={role === 'campus' ? 'Ketik nama kampus…' : 'Ketik nama administrator…'}
            disabled={app.accountsLoading || app.loading}
          />
          <div
            class="[&&]:max-h-[clamp(110px,_calc(100dvh_-_560px),_220px)] [&&]:overflow-y-auto [&&]:grid [&&]:gap-y-[8px] [&&]:gap-x-[8px] [&&]:[overscroll-behavior-x:contain] [&&]:[overscroll-behavior-y:contain] [&&]:[align-content:start] [&&]:p-[3px] max-[700.01px]:[&&]:max-h-[180px] account-list"
            role="group"
            aria-label="Akun preview"
            aria-busy={app.accountsLoading}
          >
            {#each visibleAccounts as a}
              <label
                class="[&&]:font-[650] [&&]:text-[#12386b] [&&]:flex [&&]:items-center [&&]:gap-y-[11px] [&&]:gap-x-[11px] [&&]:cursor-pointer [&&]:[background-image:initial] [&&]:[background-color:white] [&&]:flex-row [&&]:text-left [&&]:p-[10px] [&&]:m-[0px] [&&]:border-[1px] [&&]:border-solid [&&]:border-[color:rgb(224,_233,_245)] [&&]:rounded-[12px] [&:hover]:[background-image:initial] [&:hover]:[background-color:rgb(245,_249,_255)] [&.selected]:[background-image:initial] [&.selected]:[background-color:rgb(237,_245,_255)] [&.selected]:border-[color:rgb(22,_115,_222)] [&:focus-within]:[outline-color:rgb(22,_115,_222)] [&:focus-within]:[outline-style:solid] [&:focus-within]:[outline-width:2px] [&:focus-within]:outline-offset-[1px] account-card"
                class:selected={account === a.key}
              >
                <input
                  class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] [font-weight:inherit] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] [background-image:initial] [background-color:rgb(255,_255,_255)] text-[#17365f] max-w-[100%] [&&]:[accent-color:#0969d7] [&&]:shrink-0 [&&]:w-[16px] [&&]:h-[16px] [&&]:p-[0px] [&&]:m-[0px] border-[1px] border-solid border-[color:rgb(212,_225,_241)] rounded-[7px] [&:focus]:[outline-color:#7fc1ff] [&:focus]:[outline-style:solid] [&:focus]:[outline-width:2px] [&:focus]:outline-offset-[1px] [&:focus]:border-[color:rgb(39,_144,_232)] [&::placeholder]:text-[#8ea1bc]"
                  type="radio"
                  name="preview-account"
                  value={a.key}
                  bind:group={account}
                  disabled={app.accountsLoading || app.loading}
                />
                <span
                  class="[&&]:grid [&&]:items-center [&&]:[justify-items:center] [&&]:w-[38px] [&&]:h-[38px] [&&]:shrink-0 [&&]:[background-image:initial] [&&]:[background-color:rgb(223,_238,_255)] [&&]:text-[#1262bd] [&&]:text-[12px] [&&]:rounded-[10px] account-avatar"
                  aria-hidden="true"
                  >{a.name
                    .split(' ')
                    .slice(0, 2)
                    .map((word) => word[0])
                    .join('')}</span
                >
                <span
                  class="[&&]:grid [&&]:gap-y-[5px] [&&]:gap-x-[5px] [&&]:min-w-[0] account-detail"
                  ><strong class="font-[650] [&&]:text-[13px] [&&]:leading-[1.5]">{a.name}</strong
                  ><small class="[&&]:text-[11px] [&&]:text-[#73839b] leading-[1.7] [&&]:font-[400]"
                    >{a.role === 'campus'
                      ? 'Ruang kerja kampus'
                      : 'Pemantauan seluruh kampus'}</small
                  ></span
                >
              </label>
            {:else}{#if !app.accountsLoading}<p
                  class="[&&]:leading-[1.6] [&&]:text-[12px] [&&]:text-[#61738f] [&&]:m-[0px] no-results"
                >
                  {search
                    ? 'Tidak ditemukan. Coba nama kampus atau kata kunci lain.'
                    : 'Belum ada akun yang tersedia.'}
                </p>{/if}{/each}
          </div>
          <p
            class="[&&]:leading-[1.6] [&&]:text-[12px] [&&]:text-[#61738f] [&&]:[background-image:initial] [&&]:[background-color:rgb(246,_249,_253)] [&&]:px-[12px] [&&]:py-[9px] [&&]:m-[0px] [&&]:rounded-[8px] selection-summary"
            role="status"
          >
            {selected ? `Pilihan: ${selected.name}` : 'Pilih akun untuk melanjutkan.'}
          </p>
          <button
            class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[white] inline-flex items-center [&&]:justify-center gap-y-[9px] gap-x-[9px] min-h-[42px] [background-image:linear-gradient(135deg,_rgb(8,_119,_216),_rgb(21,_89,_214))] [background-color:initial] [transition-behavior:normal,_normal] [transition-duration:0.15s,_0.15s] [transition-timing-function:ease,_ease] [transition-delay:0s,_0s] [transition-property:background,_box-shadow] [white-space-collapse:collapse] [text-wrap-mode:nowrap] [box-shadow:0_8px_18px_#075fc71a] px-[18px] py-[11px] border-[1px] border-solid border-[color:rgb(8,_107,_201)] rounded-[8px] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover:not(:disabled)]:[background-image:linear-gradient(135deg,_rgb(5,_104,_196),_rgb(18,_75,_197))] [&:hover:not(:disabled)]:[background-color:initial] [&:hover:not(:disabled)]:[box-shadow:0_10px_24px_#075fc72c] max-[700.01px]:text-[11px] max-[700.01px]:px-[15px] max-[700.01px]:py-[10px] button"
            disabled={!account || app.accountsLoading || app.loading}
            >{app.loading ? 'Memuat PocketBase…' : 'Buka ruang kerja'}<Icon name="arrow" /></button
          >
        </form>
        {#if app.accountsLoading}<p class="[&&]:leading-[1.6] m-[0px]" role="status">
            Memuat akun dari PocketBase…
          </p>{:else if !app.accounts.length}<p class="[&&]:leading-[1.6] m-[0px]">
            Daftar akun belum tersedia. Pastikan PocketBase aktif dan akun seed sudah
            diprovisioning.
          </p>{/if}
        {#if app.error}<p
            role="alert"
            class="[&&]:leading-[1.6] text-[#ba5145] m-[0px] danger-text"
          >
            {app.error}
          </p>{/if}
        <button
          class="[font-style:inherit] [font-variant-ligatures:inherit] [font-variant-caps:inherit] [font-variant-numeric:inherit] [font-variant-east-asian:inherit] [font-variant-alternates:inherit] [font-variant-position:inherit] [font-variant-emoji:inherit] font-[650] [font-stretch:inherit] text-[12px] leading-[inherit] [font-family:inherit] [font-optical-sizing:inherit] [font-size-adjust:inherit] [font-kerning:inherit] [font-feature-settings:inherit] [font-variation-settings:inherit] [font-language-override:inherit] [-webkit-tap-highlight-color:transparent] cursor-pointer text-[#0668ce] inline-flex items-center gap-y-[7px] gap-x-[7px] [background-image:none] [background-color:initial] [white-space-collapse:collapse] [text-wrap-mode:nowrap] p-[0px] border-[0px] border-none border-[color:currentcolor] [&:disabled]:cursor-not-allowed [&:disabled]:opacity-[0.5] [&:focus-visible]:[outline-color:#55a9f2] [&:focus-visible]:[outline-style:solid] [&:focus-visible]:[outline-width:3px] [&:focus-visible]:outline-offset-[4px] [&:hover]:text-[#0a3eaa] text-link"
          disabled={app.accountsLoading || app.loading}
          onclick={() => app.loadAccounts()}>Muat ulang daftar akun</button
        >
        <div
          class="flex gap-y-[10px] gap-x-[10px] [&&]:mt-[12px] text-[#6784a8] [&_p]:text-[10px] [&_p]:leading-[1.9] [&>svg]:mt-[3px] max-[700.01px]:[&_p]:text-[10px] login-hint"
        >
          <Icon name="faq" size={18} />
          <p class="[&&]:leading-[1.5] m-[0px]">
            Data bisnis hanya berasal dari PocketBase. Password akun tetap di server lokal.
            Perubahan disimpan di PocketBase lokal.
          </p>
        </div>
      </div>
    </section>
  </main>
{/if}
